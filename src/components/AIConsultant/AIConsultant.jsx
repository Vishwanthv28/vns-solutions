import { useEffect, useMemo, useRef, useState } from "react";
import { consultantQuestions, recommendVNSServices } from "./consultantQuestions";
import "./AIConsultant.css";

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
    }} rows={question.multiline ? 4 : undefined} placeholder={question.placeholder} autoFocus />
    {!question.multiline && <small>Press Enter to continue</small>}
  </div>;
}

function ProjectSummary({ answers }) {
  const services = useMemo(() => recommendVNSServices(answers), [answers]);
  return <div className="ai-summary" aria-live="polite">
    <p className="ai-kicker">Project requirement preview</p>
    <h3>Your starting brief is ready.</h3>
    <p>This is a rule-based Layer 1 preview—not an AI-generated recommendation yet.</p>
    <dl>
      <div><dt>Business</dt><dd>{answers.businessType}</dd></div>
      <div><dt>Website</dt><dd>{answers.websiteStatus}</dd></div>
      <div><dt>Main goal</dt><dd>{answers.mainGoal}</dd></div>
      <div><dt>Customers</dt><dd>{answers.customers}</dd></div>
      <div><dt>Capabilities</dt><dd>{answers.capabilities?.join(", ")}</dd></div>
      <div><dt>Timeline</dt><dd>{answers.timeline}</dd></div>
      {answers.notes && <div><dt>Additional context</dt><dd>{answers.notes}</dd></div>}
    </dl>
    <div className="ai-recommendations"><span>Relevant VNS services to discuss</span>{services.map(service => <b key={service}>{service}</b>)}</div>
    <div className="ai-lead-preview"><span aria-hidden="true">07</span><div><b>Contact details come in Layer 7</b><p>This UI demonstration does not request, send or save personal information.</p></div></div>
  </div>;
}

export default function AIConsultant({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [typing, setTyping] = useState(false);
  const panelRef = useRef(null);
  const previousFocus = useRef(null);
  const typingTimer = useRef(null);
  const advancing = useRef(false);
  const question = consultantQuestions[step];
  const finished = step === consultantQuestions.length;
  const currentValue = question ? answers[question.id] : undefined;
  const canContinue = question?.optional || (Array.isArray(currentValue) ? currentValue.length > 0 : Boolean(String(currentValue || "").trim()));

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
    if (advancing.current) return;
    advancing.current = true;
    setTyping(true);
    typingTimer.current = window.setTimeout(() => {
      setStep(current => current + 1);
      setTyping(false);
      advancing.current = false;
    }, 280);
  }

  function continueFlow() {
    if (!canContinue || typing) return;
    advanceFlow();
  }

  function selectSingleAnswer(value) {
    setAnswers(current => ({ ...current, [question.id]: value }));
    advanceFlow();
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setTyping(false);
    advancing.current = false;
  }

  if (!open) return null;

  return <div className="ai-consultant-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ai-consultant-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="ai-consultant-title">
      <header className="ai-consultant-header">
        <div><span className="ai-status-dot" aria-hidden="true" /><div><p>VNS AI Project Consultant</p><small>Layer 1 · Guided UI demonstration</small></div></div>
        <button className="ai-close" type="button" onClick={onClose} aria-label="Close AI Project Consultant">×</button>
      </header>

      <div className="ai-progress" aria-label={finished ? "Questionnaire complete" : `Question ${step + 1} of ${consultantQuestions.length}`}><span style={{ width: `${finished ? 100 : ((step + 1) / consultantQuestions.length) * 100}%` }} /></div>

      <div className="ai-consultant-body">
        <div className="ai-conversation">
          <div className="ai-message ai-message-intro"><span>VNS</span><p id="ai-consultant-title">Hi. I’ll help organise your project idea into a clear starting brief.</p></div>
          {consultantQuestions.slice(0, step).map(item => <div className="ai-history" key={item.id}><p>{item.label}</p><div>{Array.isArray(answers[item.id]) ? answers[item.id].join(" · ") : answers[item.id] || "Skipped"}</div></div>)}
          {!finished && <div className="ai-message"><span>VNS</span><div><p>{question.label}</p>{question.help && <small>{question.help}</small>}</div></div>}
          {typing && <div className="ai-typing" role="status" aria-label="Preparing next question"><i /><i /><i /></div>}
          {finished && <ProjectSummary answers={answers} />}
        </div>

        {!typing && !finished && <div className="ai-answer-area">
          <AnswerControl question={question} value={currentValue} onChange={value => setAnswers(current => ({ ...current, [question.id]: value }))} onSelect={selectSingleAnswer} onSubmit={continueFlow} />
        </div>}
      </div>

      <footer className="ai-consultant-footer">
        <button className="ai-back" type="button" onClick={() => setStep(current => Math.max(0, current - 1))} disabled={step === 0 || typing}>{finished ? "Review answers" : "Back"}</button>
        {!finished ? <div><span>Question {step + 1} of {consultantQuestions.length}</span>{question.type === "single" ? <small className="ai-auto-advance-note">Select one to continue</small> : <button className="button ai-continue" type="button" onClick={continueFlow} disabled={!canContinue || typing}>{question.optional && !currentValue ? "Skip" : "Continue"} <b>→</b></button>}</div> : <div><button className="ai-restart" type="button" onClick={restart}>Start again</button><button className="button ai-continue" type="button" onClick={onClose}>Finish preview <b>✓</b></button></div>}
      </footer>
    </section>
  </div>;
}
