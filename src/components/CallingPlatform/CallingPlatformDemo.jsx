import { useEffect, useRef, useState } from "react";
import {
  createDemoWorkspace,
  clearDemoConversation,
  EMPTY_REQUIREMENTS,
  buildConversationClosingSummary,
  isConversationFinishRequest,
  loadDemoSessionState,
  mergeConversationRequirements,
  MAX_IMPORT_BYTES,
  MAX_CONTACTS,
  parseContactCsv,
  saveDemoSessionState,
} from "./demoPlatform.js";
import { playBrowserSpeech } from "./browserSpeech.js";
import "./CallingPlatformDemo.css";

const sections = ["Overview", "Contacts", "Agent", "Campaigns", "Results", "Usage"];

function mergeContacts(existing, incoming) {
  const keys = new Set(existing.flatMap(contact => [
    contact.email && `email:${contact.email.toLowerCase()}`,
    contact.phone && `phone:${contact.phone.replace(/\D/g, "")}`,
  ].filter(Boolean)));
  const added = [];
  let duplicates = 0;
  let limitReached = 0;
  for (const contact of incoming) {
    const contactKeys = [
      contact.email && `email:${contact.email.toLowerCase()}`,
      contact.phone && `phone:${contact.phone.replace(/\D/g, "")}`,
    ].filter(Boolean);
    if (contactKeys.some(key => keys.has(key))) {
      duplicates += 1;
      continue;
    }
    contactKeys.forEach(key => keys.add(key));
    if (existing.length + added.length >= MAX_CONTACTS) {
      limitReached += 1;
      continue;
    }
    added.push(contact);
  }
  return { contacts: [...existing, ...added], added: added.length, duplicates, limitReached };
}

function getCampaignMetrics(campaign) {
  const outcomes = campaign.results.reduce((counts, result) => {
    counts[result.outcome] = (counts[result.outcome] || 0) + 1;
    return counts;
  }, {});
  const callbacks = outcomes["Callback requested"] || 0;
  const followUps = campaign.results.filter(result => result.structuredFields.humanReview).length;
  return { outcomes, callbacks, followUps };
}

function CampaignList({ campaigns, onViewResults, onAddContacts }) {
  if (!campaigns.length) {
    return <div className="platform-empty">
      <strong>No campaigns yet</strong>
      <p>Import sample contacts to run a campaign simulation. Nothing will be called.</p>
      <button type="button" className="platform-text-button" onClick={onAddContacts}>Go to contacts</button>
    </div>;
  }

  return <div className="platform-campaign-list">
    {campaigns.slice().reverse().map(campaign => {
      const { outcomes, callbacks, followUps } = getCampaignMetrics(campaign);
      const isActive = ["queued", "running"].includes(campaign.status);
      const isComplete = campaign.status === "simulated complete";
      const nextAction = callbacks
        ? `Review ${callbacks} simulated callback request${callbacks === 1 ? "" : "s"} in results.`
        : followUps
          ? `Review ${followUps} simulated follow-up suggestion${followUps === 1 ? "" : "s"} in results.`
          : isComplete
            ? "No follow-up was suggested in this sample."
            : campaign.status === "stopped"
              ? "Review completed sample results before running another simulation."
              : campaign.status === "failed"
                ? "This simulation stopped unexpectedly. Review the available results."
                : "Results will appear here as the simulation runs.";

      return <article className="platform-campaign-item" key={campaign.id}>
        <div className="platform-campaign-title">
          <div>
            <h3>{campaign.name}</h3>
            <p>{isActive ? "In progress" : isComplete ? "Simulation complete" : campaign.status === "stopped" ? "Stopped" : "Needs attention"}</p>
          </div>
          <span className="platform-campaign-count">{campaign.completed} of {campaign.total} contacts</span>
        </div>
        <progress max={campaign.total || 1} value={campaign.completed} aria-label={`${campaign.name}: ${campaign.completed} of ${campaign.total} contacts processed`} />
        <div className="platform-campaign-metrics" aria-label="Simulated campaign outcomes">
          <span><strong>{outcomes.Interested || 0}</strong> interested</span>
          <span><strong>{callbacks}</strong> callback requests</span>
          <span><strong>{outcomes["Not interested"] || 0}</strong> not interested</span>
        </div>
        <p className="platform-campaign-next"><strong>Next step</strong> {nextAction}</p>
        <button type="button" className="platform-quiet-button" onClick={onViewResults} disabled={!campaign.results.length}>Review results</button>
      </article>;
    })}
  </div>;
}

function PlatformHeader({ workspace, workspaces, onSelectWorkspace, onAddWorkspace }) {
  return <header className="platform-header">
    <a className="platform-brand" href="/" aria-label="Return to VNS Solutions">VNS<span>.</span></a>
    <div className="platform-workspace-select">
      <label htmlFor="platform-workspace">Workspace</label>
      <select id="platform-workspace" value={workspace.id} onChange={event => onSelectWorkspace(event.target.value)}>
        {workspaces.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select>
      <button type="button" className="platform-quiet-button" onClick={onAddWorkspace}>New workspace</button>
    </div>
    <span className="platform-demo-label">Demo</span>
  </header>;
}

function CampaignResults({ campaigns, onSelect }) {
  const results = campaigns.flatMap(campaign => campaign.results.map(result => ({ ...result, campaignName: campaign.name })));
  if (!results.length) return <div className="platform-empty"><strong>No results yet</strong><p>Run a clearly labelled simulation to see structured conversation data.</p></div>;
  return <div className="platform-results-list">
    {results.slice().reverse().map(result => <button className="platform-result-row" type="button" key={result.id} onClick={() => onSelect(result)}>
      <span className="platform-result-avatar" aria-hidden="true">{result.contactName.slice(0, 1).toUpperCase()}</span>
      <span className="platform-result-person"><strong>{result.contactName}</strong><small>{result.campaignName}</small></span>
      <span className="platform-result-outcome">{result.outcome}</span>
      <span className="platform-result-next">{result.nextAction}</span>
    </button>)}
  </div>;
}

function ResultDetail({ result, onClose }) {
  if (!result) return null;
  return <div className="platform-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="platform-result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <button className="platform-modal-close" type="button" onClick={onClose} aria-label="Close result">×</button>
      <p className="platform-eyebrow">SIMULATED RESULT · NO CALL PLACED</p>
      <h2 id="result-title">{result.contactName}</h2>
      <p>{result.summary}</p>
      <dl className="platform-structured-fields">{Object.entries(result.structuredFields).map(([key, value]) => <div key={key}><dt>{key.replace(/[A-Z]/g, letter => ` ${letter}`).replace(/^./, letter => letter.toUpperCase())}</dt><dd>{String(value)}</dd></div>)}</dl>
      <h3>Example conversation</h3>
      <div className="platform-transcript">{result.transcript.map((turn, index) => <p key={index}><b>{turn.speaker}</b><br />{turn.text}</p>)}</div>
      <p className="platform-disclaimer">Synthetic demo output. No person was contacted and no follow-up action was created.</p>
    </section>
  </div>;
}

export default function CallingPlatformDemo() {
  const [initialSession] = useState(loadDemoSessionState);
  const [workspaces, setWorkspaces] = useState(initialSession.workspaces);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialSession.selectedWorkspaceId);
  const [section, setSection] = useState(initialSession.section);
  const [persistenceError, setPersistenceError] = useState(initialSession.message);
  const [csvText, setCsvText] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [error, setError] = useState("");
  const [retryMessage, setRetryMessage] = useState("");
  const [selectedResult, setSelectedResult] = useState(null);
  const [voiceListening, setVoiceListening] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [speechError, setSpeechError] = useState("");
  const workerRef = useRef(null);
  const recognitionRef = useRef(null);
  const conversationControllerRef = useRef(null);
  const conversationWorkspaceIdRef = useRef(null);
  const recognitionWorkspaceIdRef = useRef(null);
  const speechControllerRef = useRef(null);
  const persistenceEnabledRef = useRef(initialSession.persistenceEnabled);
  const fileRef = useRef(null);
  const workspaceId = selectedWorkspaceId || workspaces[0]?.id;
  const workspace = workspaces.find(item => item.id === workspaceId) || workspaces[0];
  const activeCampaign = workspace?.campaigns.find(campaign => ["queued", "running"].includes(campaign.status));
  const voiceSupported = typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    document.body.classList.add("platform-demo-mode");
    const oldTitle = document.title;
    document.title = "Calling platform demo | VNS Solutions";
    let robots = document.querySelector('meta[name="robots"]');
    const hadRobots = Boolean(robots);
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    const oldRobots = robots.content;
    robots.content = "noindex,nofollow";
    const worker = new Worker(new URL("./campaign.worker.js", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = event => {
      const { campaignId, type, result, completed, total } = event.data;
      setWorkspaces(current => current.map(item => ({
        ...item,
        campaigns: item.campaigns.map(campaign => {
          if (campaign.id !== campaignId) return campaign;
          if (type === "result") {
            return { ...campaign, completed, results: [...campaign.results, result] };
          }
          if (type === "started") return { ...campaign, status: "running", total };
          if (type === "complete") return { ...campaign, status: "simulated complete" };
          if (type === "cancelled") return { ...campaign, status: "stopped" };
          return campaign;
        }),
      })));
    };
    worker.onerror = event => {
      event.preventDefault();
      setWorkspaces(current => current.map(item => ({
        ...item,
        campaigns: item.campaigns.map(campaign => campaign.status === "running"
          ? { ...campaign, status: "failed" }
          : campaign),
      })));
      setError("The simulation stopped unexpectedly. Any results already created are still available.");
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      recognitionRef.current?.abort();
      conversationControllerRef.current?.abort();
      speechControllerRef.current?.abort();
      window.speechSynthesis?.cancel();
      document.body.classList.remove("platform-demo-mode");
      document.title = oldTitle;
      if (hadRobots) robots.content = oldRobots;
      else robots.remove();
    };
  }, []);

  useEffect(() => {
    if (!persistenceEnabledRef.current) return;
    try {
      saveDemoSessionState({ workspaces, selectedWorkspaceId, section });
      setPersistenceError("");
    } catch {
      persistenceEnabledRef.current = false;
      setPersistenceError("This browser could not save the demo for this tab. Your current changes will be lost when you leave.");
    }
  }, [workspaces, selectedWorkspaceId, section]);

  function updateWorkspace(update) {
    setWorkspaces(current => current.map(item => item.id === workspace.id ? update(item) : item));
  }

  function navigateToSection(nextSection) {
    setSection(nextSection);
    setError("");
    setRetryMessage("");
    if (nextSection !== "Contacts") setImportNotice("");
  }

  function handleImport(text) {
    setError("");
    setImportNotice("");
    try {
      const parsed = parseContactCsv(text);
      const merged = mergeContacts(workspace.contacts, parsed.contacts);
      if (merged.added) {
        updateWorkspace(item => ({ ...item, contacts: merged.contacts }));
      }
      const notice = [merged.added
        ? `Added ${merged.added} ${merged.added === 1 ? "contact" : "contacts"} to this workspace.`
        : "No new contacts were added."];
      if (merged.duplicates) notice.push(`Skipped ${merged.duplicates} duplicate ${merged.duplicates === 1 ? "contact" : "contacts"}.`);
      if (merged.limitReached) notice.push(`Skipped ${merged.limitReached} ${merged.limitReached === 1 ? "contact" : "contacts"} at the ${MAX_CONTACTS}-contact limit.`);
      if (parsed.skipped.length) {
        const examples = parsed.skipped.slice(0, 3).map(item => `row ${item.row}: ${item.reason}`).join(" ");
        notice.push(`Skipped ${parsed.skipped.length} invalid ${parsed.skipped.length === 1 ? "row" : "rows"}. ${examples}`);
      }
      setImportNotice(notice.join(" "));
      setCsvText("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (failure) {
      setError(failure.message || "CSV import failed.");
    }
  }

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setError("CSV must be 1 MB or smaller.");
      event.target.value = "";
      return;
    }
    file.text().then(handleImport).catch(() => setError("Could not read the selected CSV file."));
  }

  function startCampaign() {
    setError("");
    if (!workspace.contacts.length) {
      setError("Import at least one contact before starting a simulation.");
      return;
    }
    if (workspace.contacts.length > MAX_CONTACTS) {
      setError(`A demo campaign can include up to ${MAX_CONTACTS} contacts.`);
      return;
    }
    if (!workspace.agent.name.trim() || !workspace.agent.goal.trim()) {
      setError("Set an agent name and goal before starting.");
      return;
    }
    const id = `campaign-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const campaign = {
      id,
      name: `${workspace.agent.name} · ${new Date().toLocaleTimeString()}`,
      status: "running",
      createdAt: new Date().toISOString(),
      total: workspace.contacts.length,
      completed: 0,
      results: [],
    };
    updateWorkspace(item => ({ ...item, campaigns: [...item.campaigns, campaign] }));
    workerRef.current.postMessage({
      type: "run",
      campaignId: id,
      contacts: workspace.contacts,
      agent: workspace.agent,
    });
  }

  function stopCampaign() {
    if (activeCampaign) workerRef.current?.postMessage({ type: "cancel", campaignId: activeCampaign.id });
  }

  function updateAgent(field, value) {
    updateWorkspace(item => ({
      ...item,
      agent: {
        ...item.agent,
        [field]: field === "questions"
          ? value.split("\n").map(question => question.trim()).filter(Boolean).slice(0, 8)
          : value,
      },
    }));
  }

  function addWorkspace() {
    const next = createDemoWorkspace(`Demo workspace ${workspaces.length + 1}`);
    setWorkspaces(current => [...current, next]);
    setSelectedWorkspaceId(next.id);
    setSection("Overview");
    setError("");
  }

  function selectWorkspace(nextWorkspaceId) {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      recognitionWorkspaceIdRef.current = null;
      setVoiceListening(false);
    }
    setSelectedWorkspaceId(nextWorkspaceId);
  }

  function stopSpeech() {
    speechControllerRef.current?.abort();
    speechControllerRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeechStatus("");
  }

  async function speak(text) {
    stopSpeech();
    setSpeechError("");
    const controller = new AbortController();
    speechControllerRef.current = controller;
    setSpeechStatus("loading");

    try {
      await playBrowserSpeech(text, {
        synthesis: window.speechSynthesis,
        Utterance: window.SpeechSynthesisUtterance,
        signal: controller.signal,
        onState: setSpeechStatus,
      });
    } catch (failure) {
      if (!controller.signal.aborted) {
        setSpeechError(failure instanceof Error
          ? failure.message
          : "Browser speech playback failed. Check your browser's text-to-speech and audio settings, then try again.");
      }
    } finally {
      if (speechControllerRef.current === controller) {
        speechControllerRef.current = null;
        setSpeechStatus("");
      }
    }
  }

  async function submitConversation(rawMessage, source = "text", retry = false) {
    const message = rawMessage.trim();
    if (!message || conversationControllerRef.current) return;
    const finishRequested = isConversationFinishRequest(message);
    const targetWorkspaceId = workspace.id;
    const currentTurns = workspace.conversation || [];
    const lastTurn = currentTurns.at(-1);
    const retryingExistingTurn = retry && lastTurn?.role === "user" && lastTurn.text === message;
    const historyTurns = retryingExistingTurn ? currentTurns.slice(0, -1) : currentTurns;
    const userTurn = {
      id: `turn-${Date.now()}-user`,
      role: "user",
      text: message,
      source,
      at: new Date().toISOString(),
    };
    const controller = new AbortController();
    conversationControllerRef.current = controller;
    conversationWorkspaceIdRef.current = targetWorkspaceId;
    setConversationLoading(true);
    setError("");
    setRetryMessage("");
    updateWorkspace(item => ({
      ...item,
      conversation: retryingExistingTurn ? item.conversation : [...item.conversation, userTurn],
      conversationRequests: item.conversationRequests + 1,
    }));

    try {
      const response = await fetch("/api/consultant-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          agent: workspace.agent,
          history: historyTurns.slice(-8).map(({ role, text }) => ({ role, text })),
          requirements: workspace.requirements || { ...EMPTY_REQUIREMENTS },
          message,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok !== true) {
        throw new Error(data?.message || "The AI conversation could not continue. Retry your message.");
      }
      if (!controller.signal.aborted) {
        const capturedRequirements = mergeConversationRequirements(
          workspace.requirements,
          data.requirements,
          data.readyForHumanFollowUp,
        );
        setRetryMessage("");
        const assistantTurn = {
          id: `turn-${Date.now()}-assistant`,
          role: "assistant",
          text: finishRequested
            ? buildConversationClosingSummary(capturedRequirements)
            : data.reply,
          at: new Date().toISOString(),
        };
        setWorkspaces(current => current.map(item => item.id === targetWorkspaceId
          ? {
            ...item,
            conversation: [...item.conversation, assistantTurn],
            requirements: capturedRequirements,
          }
          : item));
        speak(assistantTurn.text);
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure.message || "The AI conversation could not continue. Retry your message.");
        setRetryMessage(message);
      }
    } finally {
      if (conversationControllerRef.current === controller) {
        conversationControllerRef.current = null;
        conversationWorkspaceIdRef.current = null;
      }
      setConversationLoading(false);
    }
  }

  function startVoiceInput() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Browser speech recognition is unavailable. Try the speech playback preview instead.");
      return;
    }
    setError("");
    setRetryMessage("");
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognitionWorkspaceIdRef.current = workspace.id;
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setVoiceListening(true);
    recognition.onresult = event => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) {
        setError("No speech was recognized. Try again or use the keyboard.");
        return;
      }
      void submitConversation(transcript, "voice");
    };
    recognition.onerror = event => setError(`Browser voice input failed (${event.error || "unknown error"}). You can continue without voice.`);
    recognition.onend = () => {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        recognitionWorkspaceIdRef.current = null;
      }
      setVoiceListening(false);
    };
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      recognitionWorkspaceIdRef.current = null;
      setVoiceListening(false);
      setError("Browser voice input could not start. Check microphone permission or type your message instead.");
    }
  }

  function clearConversation() {
    stopSpeech();
    if (conversationWorkspaceIdRef.current === workspace.id) {
      conversationControllerRef.current?.abort();
      conversationControllerRef.current = null;
      conversationWorkspaceIdRef.current = null;
    }
    if (recognitionWorkspaceIdRef.current === workspace.id && recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
      recognitionWorkspaceIdRef.current = null;
      setVoiceListening(false);
    }
    setWorkspaces(current => clearDemoConversation(current, workspace.id));
    setError("");
    setRetryMessage("");
  }

  if (!workspace) return null;
  const runningCampaigns = workspaces.flatMap(item => item.campaigns)
    .filter(campaign => ["queued", "running"].includes(campaign.status)).length;
  const simulatedResultCount = workspace.campaigns.reduce((sum, campaign) => sum + campaign.results.length, 0);

  return <main className="platform-demo">
    <PlatformHeader
      workspace={workspace}
      workspaces={workspaces}
      onSelectWorkspace={selectWorkspace}
      onAddWorkspace={addWorkspace}
    />
    <div className="platform-warning" role="note">
      <strong>Demo only</strong>
      <span>Campaigns are simulations; no calls or paid actions run. Browser conversations use AI. Use sample data only—this temporary session is saved in this tab and clears when it closes.</span>
    </div>
    <div className="platform-layout">
      <aside className="platform-sidebar" aria-label="Platform navigation">
        <p className="platform-sidebar-name">{workspace.name}</p>
        <nav aria-label="Workspace sections">{sections.map(item => <button key={item} type="button" className={section === item ? "active" : ""} aria-current={section === item ? "page" : undefined} onClick={() => navigateToSection(item)}>{item}</button>)}</nav>
      </aside>

      <section className="platform-content">
        <div className="platform-page-heading">
          <div><p className="platform-eyebrow">VNS WORKSPACE</p><h1>{section}</h1></div>
        </div>
        {error && <div className="platform-alert" role="alert"><span>{error}</span>{retryMessage && section === "Agent" && <button type="button" className="platform-alert-retry" onClick={() => void submitConversation(retryMessage, "text", true)}>Retry message</button>}</div>}
        {persistenceError && <p className="platform-alert" role="alert">{persistenceError}</p>}
        {importNotice && <p className="platform-notice" role="status">{importNotice}</p>}

        {section === "Overview" && <div className="platform-overview">
          <div className="platform-stat-grid">
            <div><span>Contacts</span><strong>{workspace.contacts.length}</strong></div>
            <div><span>Simulated results</span><strong>{simulatedResultCount}</strong></div>
            <div><span>AI chat requests</span><strong>{workspace.conversationRequests}</strong></div>
          </div>
          <div className="platform-overview-intro">
            <div>
              <h2>Explore the calling workflow</h2>
              <p>Set up an agent, add sample contacts and review what a campaign might capture. Campaign activity is simulated; the browser conversation is a separate AI experience.</p>
            </div>
            <div className="platform-overview-actions">
              <button type="button" className="platform-primary-button" onClick={() => navigateToSection(workspace.contacts.length ? "Campaigns" : "Contacts")}>{workspace.contacts.length ? "Set up a campaign" : "Add sample contacts"}</button>
              <button type="button" className="platform-text-button" onClick={() => navigateToSection("Agent")}>Try the AI conversation</button>
            </div>
          </div>
          <section className="platform-campaign-section">
            <div className="platform-section-heading">
              <div><h2>Campaign activity</h2><p>Progress and outcomes from this workspace’s simulations.</p></div>
              {activeCampaign && <button className="platform-danger-button" type="button" onClick={stopCampaign}>Stop simulation</button>}
            </div>
            <CampaignList campaigns={workspace.campaigns} onViewResults={() => navigateToSection("Results")} onAddContacts={() => navigateToSection("Contacts")} />
          </section>
        </div>}

        {section === "Contacts" && <div className="platform-two-column">
          <section className="platform-card"><p className="platform-eyebrow">CONTACTS</p><h2>Use sample contacts</h2><p>Use CSV columns named <code>name</code>, <code>email</code> and <code>phone</code>. A name and email or phone number are required. Up to {MAX_CONTACTS} contacts per workspace.</p>
            <label htmlFor="platform-csv-file">Upload a CSV file</label><input ref={fileRef} id="platform-csv-file" type="file" accept=".csv,text/csv" onChange={handleFile} />
            <label htmlFor="platform-csv-text">Or paste CSV</label><textarea id="platform-csv-text" rows="7" value={csvText} onChange={event => setCsvText(event.target.value)} placeholder={"name,email,phone\nDemo Contact,demo@example.test,+911234567890"} />
            <div className="platform-contact-actions">
              <button type="button" className="platform-text-button" onClick={() => setCsvText("name,email,phone\nDemo Contact,demo@example.test,+911234567890\nAnother Demo,another@example.test,")}>Use example CSV</button>
              <button type="button" className="platform-primary-button" disabled={!csvText.trim()} onClick={() => handleImport(csvText)}>Import contacts</button>
            </div>
            <p className="platform-small-note">Only use synthetic data. Contacts stay in this browser session and are not uploaded to VNS or Supabase.</p>
          </section>
          <section className="platform-card"><div className="platform-section-heading"><div><h2>Imported contacts</h2><p>{workspace.contacts.length} of {MAX_CONTACTS} contacts in this session.</p></div></div>
            {!workspace.contacts.length ? <div className="platform-empty"><strong>Your contact list is empty</strong><p>Paste the example CSV to get started. No real contacts are needed.</p></div> : <div className="platform-contact-table"><div className="platform-contact-head"><span>Name</span><span>Email / phone</span></div>{workspace.contacts.map(contact => <div className="platform-contact-row" key={contact.id}><strong>{contact.name}</strong><span>{contact.email || contact.phone}</span></div>)}</div>}
          </section>
        </div>}

        {section === "Agent" && <div className="platform-two-column platform-agent-layout">
          <section className="platform-card platform-agent-form"><p className="platform-eyebrow">AGENT SETTINGS</p><h2>Set the conversation brief</h2>
            <label htmlFor="agent-name">Agent name</label><input id="agent-name" maxLength="80" value={workspace.agent.name} onChange={event => updateAgent("name", event.target.value)} />
            <label htmlFor="agent-greeting">Opening line</label><textarea id="agent-greeting" rows="3" maxLength="500" value={workspace.agent.greeting} onChange={event => updateAgent("greeting", event.target.value)} />
            <label htmlFor="agent-goal">Conversation goal</label><input id="agent-goal" maxLength="240" value={workspace.agent.goal} onChange={event => updateAgent("goal", event.target.value)} />
            <label htmlFor="agent-questions">Questions (one per line, up to 8)</label><textarea id="agent-questions" rows="5" maxLength="1600" value={workspace.agent.questions.join("\n")} onChange={event => updateAgent("questions", event.target.value)} />
          </section>
          <section className="platform-card platform-voice-card"><p className="platform-eyebrow">AI CONVERSATION</p><h2>Try this agent</h2><p>This is an actual browser-to-AI conversation, not a simulated campaign. Your agent settings are sent to VNS’s server-side AI endpoint. The conversation stays in this tab’s session storage.</p>
            <blockquote>{workspace.agent.greeting}</blockquote>
            <div className="platform-voice-actions">
              <button type="button" className="platform-secondary-button" onClick={() => void speak(workspace.agent.greeting)} disabled={Boolean(speechStatus)}>{speechStatus === "loading" ? "Loading voice…" : speechStatus === "speaking" ? "Speaking…" : "Play greeting"}</button>
              <button type="button" className="platform-secondary-button" aria-pressed={voiceListening} onClick={() => voiceListening ? recognitionRef.current?.stop() : startVoiceInput()} disabled={!voiceSupported || conversationLoading}>{voiceListening ? "Stop listening" : "Speak a message"}</button>
            </div>
            {speechStatus === "loading" && <p className="platform-small-note" role="status">Loading a browser voice…</p>}
            {speechError && <p className="platform-alert platform-speech-alert" role="alert">{speechError}</p>}
            {!voiceSupported && <p className="platform-small-note">Voice input is unavailable in this browser. You can still type a message.</p>}
            <p className="platform-small-note">Microphone input is optional. Browser speech recognition may process audio through browser services. AI responses may use the configured model quota. No call is placed.</p>
            <div className="platform-conversation-heading"><h3>Your conversation</h3><button type="button" className="platform-text-button" onClick={clearConversation} disabled={!workspace.conversation.length && !workspace.conversationRequests}>Clear conversation</button></div>
            <div className="platform-conversation-log" aria-live="polite">
              {!workspace.conversation.length && <p className="platform-conversation-empty">Start by speaking or typing below. The agent will follow the goal and questions you set.</p>}
              {workspace.conversation.map(turn => <article className={`platform-chat-turn ${turn.role}`} key={turn.id}><strong>{turn.role === "user" ? `You · ${turn.source === "voice" ? "voice" : "typed"}` : workspace.agent.name}</strong><p>{turn.text}</p></article>)}
              {conversationLoading && <p className="platform-small-note" role="status">Waiting for the agent…</p>}
            </div>
            <form className="platform-chat-form" onSubmit={event => {
              event.preventDefault();
              const form = event.currentTarget;
              const message = new FormData(form).get("message");
              if (typeof message === "string" && message.trim()) {
                void submitConversation(message);
                form.reset();
              }
            }}>
              <label htmlFor="agent-chat-message">Or type a message</label>
              <textarea id="agent-chat-message" name="message" rows="2" maxLength="1200" required placeholder="Example: I run a small dental clinic and need more appointment enquiries." disabled={Boolean(conversationControllerRef.current)} />
              <button type="submit" className="platform-primary-button" disabled={conversationLoading}>{conversationLoading ? "Sending…" : "Send message"}</button>
            </form>
            <section className="platform-captured-requirements">
              <h3>Requirements from this conversation</h3>
              {Object.entries(workspace.requirements || EMPTY_REQUIREMENTS).map(([key, value]) => <div key={key}><strong>{key.replace(/[A-Z]/g, letter => ` ${letter}`).replace(/^./, letter => letter.toUpperCase())}</strong><span>{value || "Not captured yet"}</span></div>)}
            </section>
            <p className="platform-small-note">This actual AI conversation is distinct from synthetic campaign results. It contacts no one, places no call, and triggers no integration. Data is saved only in this tab’s session storage, not in secure client-isolated storage.</p>
          </section>
        </div>}

        {section === "Campaigns" && <div className="platform-two-column">
          <section className="platform-card"><p className="platform-eyebrow">CAMPAIGNS</p><h2>Run a sample campaign</h2><p>This creates one synthetic result for each imported contact. No one is contacted and no action is taken.</p>
            <div className="platform-campaign-summary"><span>Selected workspace<strong>{workspace.name}</strong></span><span>Configured agent<strong>{workspace.agent.name}</strong></span><span>Contacts selected<strong>{workspace.contacts.length}</strong></span></div>
            <button className="platform-primary-button" type="button" onClick={startCampaign} disabled={!workspace.contacts.length || runningCampaigns > 0}>{runningCampaigns ? "A simulation is running…" : "Run simulation"}</button>
            {activeCampaign && <button className="platform-danger-button" type="button" onClick={stopCampaign}>Stop simulation</button>}
            {!workspace.contacts.length && <p className="platform-small-note">Add sample contacts before starting.</p>}
            <p className="platform-simulation-label">SIMULATION ONLY · NO CALLS OR FOLLOW-UP ACTIONS</p>
          </section>
          <section className="platform-card platform-actions-note"><p className="platform-eyebrow">ACTIONS</p><h2>Nothing is sent or created</h2><p>Follow-up tasks, email and CRM integrations are not connected in this demo. Campaign suggestions are examples only.</p></section>
        </div>}
        {section === "Campaigns" && <section className="platform-campaign-section">
          <div className="platform-section-heading"><div><h2>Campaign history</h2><p>Each row shows sample outcomes and suggested next steps.</p></div></div>
          <CampaignList campaigns={workspace.campaigns} onViewResults={() => navigateToSection("Results")} onAddContacts={() => navigateToSection("Contacts")} />
        </section>}

        {section === "Results" && <section className="platform-card"><div className="platform-section-heading"><div><p className="platform-eyebrow">SIMULATED CAMPAIGNS</p><h2>Sample results · {simulatedResultCount}</h2><p>These are generated examples, not real conversations. Actual AI chat is available under Agent.</p></div><button type="button" className="platform-text-button" onClick={() => navigateToSection("Campaigns")}>Campaign history</button></div>
          <CampaignResults campaigns={workspace.campaigns} onSelect={setSelectedResult} />
        </section>}

        {section === "Usage" && <section className="platform-card"><p className="platform-eyebrow">USAGE · THIS SESSION</p><h2>AI chat and campaign simulations are separate</h2><div className="platform-usage-grid"><div><span>SIMULATED CAMPAIGN RESULTS</span><strong>{simulatedResultCount}</strong></div><div><span>AI CHAT REQUESTS</span><strong>{workspace.conversationRequests}</strong></div><div><span>TELEPHONE MINUTES</span><strong>0</strong></div><div><span>ACTIONS TAKEN</span><strong>0</strong></div></div><p className="platform-small-note">AI chat uses the configured Gemini model and may use its quota. Campaigns are synthetic. Session counters and transcripts clear when you close this tab.</p></section>}
      </section>
    </div>
    <ResultDetail result={selectedResult} onClose={() => setSelectedResult(null)} />
  </main>;
}
