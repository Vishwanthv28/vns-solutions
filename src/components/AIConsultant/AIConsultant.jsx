import { useEffect, useRef, useState } from "react";
import { consultantQuestions } from "./consultantQuestions";
import "./AIConsultant.css";
import LeadSubmission, { emptyLeadDraft } from "./LeadSubmission.jsx";
import { answerError, validateAnswers, validateBrief } from "../../../server/consultant-validation.js";

function AnswerControl({ question, value, onChange, onSelect, onSubmit }) {
  if (question.type === "single") {
    return <div className="ai-option-list">{question.options.map(option => <button className={value === option ? "selected" : ""} type="button" key={option} onClick={() => onSelect(option)}>{option}<span aria-hidden="true">{value === option ? "✓" : "→"}</span></button>)}</div>;
  }

  if (question.type === "multiple") {
    const selected = Array.isArray(value) ? value : [];
    return <div className="ai-option-list ai-option-multiple">{question.options.map(option => {
      const active = selected.includes(option);
      return <button className={active ? "selected" : ""} type="button" key={option} aria-pressed={active} onClick={() => onChange(active ? selected.filter(item => item !== option) : [...selected, option])}>{option}<span aria-hidden="true">{active ? "✓" : "+"}</span></button>;
    })}</div>;
  }

  const Element = question.multiline ? "textarea" : "input";
  return <div className="ai-text-answer-wrap"><Element className="ai-text-answer" value={value || ""} onChange={event => onChange(event.target.value)} onKeyDown={event => {
      if (!question.multiline && event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }
    }} rows={question.multiline ? 4 : undefined} placeholder={question.placeholder} aria-label={question.label} minLength={question.optional ? undefined : 2} maxLength={question.id === "notes" ? 2000 : question.id === "customers" ? 500 : 120} autoFocus />
    {!question.multiline && <small>Press Enter to continue</small>}
  </div>;
}

function ProjectSummary({ answers, brief, loading, error, onEdit, leadDraft, setLeadDraft }) {
  return <div className="ai-summary" aria-live="polite" aria-busy={loading}>
    <p className="ai-kicker">{brief ? "AI project brief" : "Review your answers"}</p>
    <h3>{brief ? "Your starting brief is ready." : "Ready to plan your project?"}</h3>
    <p>Review your answers, then generate a brief. Suggested features are a starting point for discussion.</p>
    <dl>{consultantQuestions.map((q, index) => <div key={q.id}><dt>{q.id === "businessType" ? "Business" : q.id === "mainGoal" ? "Main goal" : q.id === "websiteStatus" ? "Website" : q.id}</dt><dd>{Array.isArray(answers[q.id]) ? answers[q.id].join(", ") : answers[q.id] || "Skipped"}</dd><button className="ai-edit" type="button" disabled={loading} onClick={() => onEdit(index)}>Edit<span className="sr-only"> {q.label}</span></button></div>)}</dl>
    {loading && <p role="status">Generating your AI project brief…</p>}
    {error && <p className="ai-error" role="alert">{error}</p>}
    {brief && <div className="ai-generated-brief"><h4>{brief.businessType}</h4><p>{brief.summary}</p>
      <h4>Project goals</h4><ul>{brief.goals.map((item, i) => <li key={i}>{item}</li>)}</ul>
      <h4>Recommended VNS services</h4>{brief.recommendedServices.map(service => <div key={service.name}><b>{service.name}</b><p>{service.reason}</p></div>)}
      <h4>Suggested features</h4><ul>{brief.suggestedFeatures.map((item, i) => <li key={i}>{item}</li>)}</ul>
      <h4>Next steps</h4><ol>{brief.nextSteps.map((item, i) => <li key={i}>{item}</li>)}</ol>
    </div>}
    {brief && <LeadSubmission answers={answers} brief={brief} draft={leadDraft} setDraft={setLeadDraft} />}
    <p className="ai-data-note">Your answers are sent to our AI provider when you generate a brief. Contact details are collected only when you choose to submit your project to VNS.</p>
  </div>;
}

export default function AIConsultant({ open, onClose }) {
  const [leadDraft, setLeadDraft] = useState(emptyLeadDraft);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [typing, setTyping] = useState(false);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(null);
  const requestId = useRef(0);
  const panelRef = useRef(null);
  const previousFocus = useRef(null);
  const typingTimer = useRef(null);
  const advancing = useRef(false);
  const question = consultantQuestions[step];
  const finished = step === consultantQuestions.length;
  const currentValue = question ? answers[question.id] : undefined;
  const validationMessage = question ? answerError(question, currentValue) : "";
  const canContinue = Boolean(question && !validationMessage);

  useEffect(() => {
    if (!open) { requestId.current += 1; requestRef.current?.abort(); requestRef.current = null; setLoading(false); }
    return () => { requestId.current += 1; requestRef.current?.abort(); };
  }, [open]);

  function editAnswer(index) {
    if (loading || leadDraft.status === "sending") return;
    setLeadDraft(emptyLeadDraft);
    setBrief(null); setError(""); setStep(index);
  }

  async function generateProjectBrief() {
    if (requestRef.current || leadDraft.status === "sending") return;
    setLeadDraft(emptyLeadDraft);
    const checked = validateAnswers(answers);
    if (Object.keys(checked.errors).length) {
      const index = consultantQuestions.findIndex(q => checked.errors[q.id]);
      setStep(Math.max(0, index)); return;
    }
    const controller = new AbortController();
    const id = ++requestId.current;
    requestRef.current = controller;
    setLoading(true); setError(""); setBrief(null);
    const timer = window.setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch("/api/consultant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: checked.answers }), signal: controller.signal });
      const data = await response.json().catch(() => { throw new Error("The consultant API is unavailable. Start the project with npm run dev."); });
      if (!response.ok) throw new Error(data.message || "Unable to generate the brief. Please retry.");
      const generated = validateBrief(data.brief);
      if (id === requestId.current) setBrief(generated);
    } catch (failure) {
      if (id === requestId.current) setError(failure.name === "AbortError" ? "The request took too long. Your answers are preserved; please retry." : failure.message || "Connection failed. Your answers are preserved; please retry.");
    } finally {
      window.clearTimeout(timer);
      if (id === requestId.current) { requestRef.current = null; setLoading(false); }
    }
  }

  useEffect(() => {
    if (!open) {
      window.clearTimeout(typingTimer.current);
      advancing.current = false;
      setTyping(false);
      return undefined;
    }
    previousFocus.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    window.setTimeout(() => panel?.querySelector("button")?.focus(), 0);

    function handleKeydown(event) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(typingTimer.current);
      document.removeEventListener("keydown", handleKeydown);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  function advanceFlow() {
    if (advancing.current || loading) return;
    advancing.current = true;
    setTyping(true);
    typingTimer.current = window.setTimeout(() => {
      setStep(current => current + 1);
      setTyping(false);
      advancing.current = false;
    }, 280);
  }

  function continueFlow() {
    if (!canContinue || typing || loading) return;
    if (question.type === "text") setAnswers(current => ({ ...current, [question.id]: String(current[question.id] || "").trim() }));
    advanceFlow();
  }

  function selectSingleAnswer(value) {
    if (advancing.current || loading) return;
    setBrief(null); setError("");
    setAnswers(current => ({ ...current, [question.id]: value }));
    advanceFlow();
  }

  function restart() {
    if (leadDraft.status === "sending") return;
    setLeadDraft(emptyLeadDraft);
    requestId.current += 1; requestRef.current?.abort(); requestRef.current = null;
    window.clearTimeout(typingTimer.current);
    setBrief(null); setLoading(false); setError("");
    setAnswers({});
    setStep(0);
    setTyping(false);
    advancing.current = false;
  }

  if (!open) return null;

  return <div className="ai-consultant-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ai-consultant-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ai-consultant-title">
      <header className="ai-consultant-header">
        <div><span className="ai-status-dot" aria-hidden="true" /><div><p>VNS AI Project Consultant</p><small>Plan your project</small></div></div>
        <button className="ai-close" type="button" onClick={onClose} aria-label="Close AI Project Consultant">×</button>
      </header>

      <div className="ai-progress" aria-label={finished ? "Questionnaire complete" : `Question ${step + 1} of ${consultantQuestions.length}`}><span style={{ width: `${finished ? 100 : ((step + 1) / consultantQuestions.length) * 100}%` }} /></div>

      <div className="ai-consultant-body">
        <div className="ai-conversation">
          <div className="ai-message ai-message-intro"><span>VNS</span><p id="ai-consultant-title">Hi. I’ll help organise your project idea into a clear starting brief.</p></div>
          {consultantQuestions.slice(0, step).map(item => <div className="ai-history" key={item.id}><p>{item.label}</p><div>{Array.isArray(answers[item.id]) ? answers[item.id].join(" · ") : answers[item.id] || "Skipped"}</div></div>)}
          {!finished && <div className="ai-message"><span>VNS</span><div><p>{question.label}</p>{question.help && <small>{question.help}</small>}</div></div>}
          {typing && <div className="ai-typing" role="status" aria-label="Preparing next question"><i /><i /><i /></div>}
          {finished && <ProjectSummary answers={answers} brief={brief} loading={loading} error={error} onEdit={editAnswer} leadDraft={leadDraft} setLeadDraft={setLeadDraft} />}
        </div>

        {!typing && !finished && <div className="ai-answer-area">
          <AnswerControl question={question} value={currentValue} onChange={value => { setBrief(null); setError(""); setAnswers(current => ({ ...current, [question.id]: value })); }} onSelect={selectSingleAnswer} onSubmit={continueFlow} />
          {validationMessage && currentValue != null && <p className="ai-validation" role="status">{validationMessage}</p>}
        </div>}
      </div>

      <footer className="ai-consultant-footer">
        <button className="ai-back" type="button" onClick={() => editAnswer(Math.max(0, step - 1))} disabled={step === 0 || typing || loading || leadDraft.status === "sending"}>{finished ? "Review answers" : "Back"}</button>
        {!finished ? <div><span>Question {step + 1} of {consultantQuestions.length}</span>{question.type === "single" ? <small className="ai-auto-advance-note">Select one to continue</small> : <button className="button ai-continue" type="button" onClick={continueFlow} disabled={!canContinue || typing}>{question.optional && !currentValue ? "Skip" : "Continue"} <b>→</b></button>}</div> : <div><button className="ai-restart" type="button" disabled={loading || leadDraft.status === "sending"} onClick={restart}>Start again</button><button className="button ai-continue" type="button" disabled={loading || leadDraft.status === "sending"} onClick={generateProjectBrief}>{loading ? "Generating…" : error ? "Retry AI brief" : brief ? "Regenerate brief" : "Generate AI brief"} <b>→</b></button></div>}
      </footer>
    </section>
  </div>;
}
