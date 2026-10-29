export const MAX_IMPORT_BYTES = 1_000_000;
export const MAX_CONTACTS = 500;
export const DEMO_SESSION_STORAGE_KEY = "vns-platform-demo-session-v1";
export const EMPTY_REQUIREMENTS = Object.freeze({
  businessType: "",
  websiteNeeds: "",
  goals: "",
  audience: "",
  features: "",
  timeline: "",
  humanFollowUp: "",
  callbackPreference: "",
});

export const createDemoAgent = () => ({
  name: "VNS Demo Assistant",
  greeting: "Hello, I'm the VNS project assistant. What are you looking to build?",
  goal: "understand what kind of website or automation the business needs",
  questions: [
    "What would you like your website to help your business do?",
    "If a person follows up, what time would suit you?",
  ],
});

export function mergeConversationRequirements(existing, incoming, readyForHumanFollowUp = false) {
  const merged = { ...EMPTY_REQUIREMENTS };
  for (const key of Object.keys(EMPTY_REQUIREMENTS)) {
    merged[key] = typeof existing?.[key] === "string" ? existing[key] : "";
    if (typeof incoming?.[key] === "string" && incoming[key].trim()) {
      merged[key] = incoming[key].trim();
    }
  }
  if (readyForHumanFollowUp && !merged.humanFollowUp) {
    merged.humanFollowUp = "Visitor requested a human follow-up";
  }
  return merged;
}

export function isConversationFinishRequest(message) {
  if (typeof message !== "string") return false;
  const text = message.toLowerCase().replace(/[’]/g, "'");
  return /\b(?:that(?:'s| is) all|that's it|nothing else|no more questions|i(?:'m| am) done|i'm finished)\b/.test(text) ||
    /\b(?:please|can you|could you|let's|lets|we can|i want to|i'd like to)\s+(?:finish|wrap up|end|conclude|complete)(?:\s+(?:the|this|our)\s+(?:conversation|discussion|chat))?\b/.test(text) ||
    /\b(?:finish|wrap up|end|conclude|complete)\s+(?:the|this|our)\s+(?:conversation|discussion|chat)\b/.test(text);
}

export function buildConversationClosingSummary(requirements) {
  const labels = {
    businessType: "Business type",
    websiteNeeds: "Website or automation needs",
    goals: "Goals",
    audience: "Audience",
    features: "Features",
    timeline: "Timeline",
  };
  const details = Object.entries(labels)
    .filter(([key]) => typeof requirements?.[key] === "string" && requirements[key].trim())
    .map(([key, label]) => `${label}: ${requirements[key].trim()}`);

  if (typeof requirements?.humanFollowUp === "string" && requirements.humanFollowUp.trim()) {
    const request = requirements.humanFollowUp.trim();
    details.push(`Human follow-up: ${request === "Visitor requested a human follow-up" ? "You requested a human follow-up" : request} (not scheduled).`);
  }
  if (typeof requirements?.callbackPreference === "string" && requirements.callbackPreference.trim()) {
    details.push(`Callback preference: ${requirements.callbackPreference.trim()} (preference only; not scheduled).`);
  }

  const summary = details.length
    ? `Here's a summary of what you've shared:\n${details.map(detail => `- ${detail}`).join("\n")}`
    : "I don't have any project requirements captured yet.";
  return `${summary}\nNo call, booking, or follow-up has been scheduled.`;
}

export function clearDemoConversation(workspaces, workspaceId) {
  return workspaces.map(workspace => workspace.id === workspaceId
    ? {
      ...workspace,
      conversation: [],
      requirements: { ...EMPTY_REQUIREMENTS },
      conversationRequests: 0,
    }
    : workspace);
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else if (character === '"') {
      throw new Error("Check the quotation marks in your CSV.");
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("Check that every quoted CSV field has a closing quotation mark.");
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function phoneDigits(phone) {
  return phone.replace(/\D/g, "");
}

export function parseContactCsv(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Choose a CSV file or paste its rows.");
  }
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new Error("CSV must be 1 MB or smaller.");
  }

  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("Add a header row and at least one contact.");
  const headers = rows[0].map(value => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const nameIndex = headers.indexOf("name");
  const emailIndex = headers.indexOf("email");
  const phoneIndex = headers.indexOf("phone");
  if (nameIndex < 0 || (emailIndex < 0 && phoneIndex < 0)) {
    throw new Error("Include a name column and an email or phone column.");
  }
  if (rows.length - 1 > MAX_CONTACTS) {
    throw new Error(`Import up to ${MAX_CONTACTS} contacts at a time.`);
  }

  const contacts = [];
  const skipped = [];
  const seen = new Set();
  for (const [offset, values] of rows.slice(1).entries()) {
    const rowNumber = offset + 2;
    const name = (values[nameIndex] || "").trim();
    const email = (values[emailIndex] || "").trim().toLowerCase();
    const phone = (values[phoneIndex] || "").trim();
    const key = email ? `email:${email}` : `phone:${phoneDigits(phone)}`;

    if (!name || name.length > 100) {
      skipped.push({ row: rowNumber, reason: "Name is missing or too long." });
    } else if (!email && !phone) {
      skipped.push({ row: rowNumber, reason: "Email or phone is required." });
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ row: rowNumber, reason: "Email is invalid." });
    } else if (phone && (phoneDigits(phone).length < 7 || phoneDigits(phone).length > 15)) {
      skipped.push({ row: rowNumber, reason: "Phone number is invalid." });
    } else if (seen.has(key)) {
      skipped.push({ row: rowNumber, reason: "Duplicate contact in this CSV." });
    } else {
      seen.add(key);
      contacts.push({
        id: `contact-${rowNumber}-${contacts.length + 1}`,
        name,
        email,
        phone,
      });
    }
  }

  return { contacts, skipped };
}

export function simulateConversation(contact, agent, index, campaignId = "simulation") {
  const scenarios = [
    {
      outcome: "Interested",
      detail: "The simulated contact expressed interest in discussing the project.",
      nextAction: "Human review requested",
    },
    {
      outcome: "Callback requested",
      detail: "The simulated contact asked for a later conversation.",
      nextAction: "Review callback request",
    },
    {
      outcome: "Not interested",
      detail: "The simulated contact declined further discussion.",
      nextAction: "No follow-up",
    },
  ];
  const scenario = scenarios[index % scenarios.length];
  return {
    id: `${campaignId}-${contact.id}-result`,
    contactId: contact.id,
    contactName: contact.name,
    contactEmail: contact.email,
    contactPhone: contact.phone,
    status: "simulated",
    outcome: scenario.outcome,
    summary: scenario.detail,
    nextAction: scenario.nextAction,
    durationSeconds: 24 + ((index * 13) % 39),
    structuredFields: {
      interest: scenario.outcome,
      campaignGoal: agent.goal,
      followUpPermission: "Not collected in simulation",
      humanReview: scenario.nextAction !== "No follow-up",
    },
    transcript: [
      { speaker: "Agent (simulated)", text: agent.greeting },
      ...(agent.questions || []).slice(0, 8).flatMap(question => [
        { speaker: "Agent (simulated)", text: question },
        { speaker: "Contact (simulated)", text: scenario.detail },
      ]),
      {
        speaker: "Agent (simulated)",
        text: `This is only a demo. No call was placed and no action was taken for ${contact.name}.`,
      },
    ],
  };
}

export function createDemoWorkspace(name = "Demo workspace") {
  return {
    id: `workspace-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
    name,
    agent: createDemoAgent(),
    contacts: [],
    campaigns: [],
    conversation: [],
    requirements: { ...EMPTY_REQUIREMENTS },
    conversationRequests: 0,
  };
}

const isRecord = value => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isText = (value, max = 500) => typeof value === "string" && value.length <= max;

function isStoredAgent(agent) {
  return isRecord(agent) &&
    isText(agent.name, 80) && agent.name.trim() &&
    isText(agent.greeting, 500) && agent.greeting.trim() &&
    isText(agent.goal, 240) && agent.goal.trim() &&
    Array.isArray(agent.questions) && agent.questions.length <= 8 &&
    agent.questions.every(question => isText(question, 300) && question.trim());
}

function isStoredContact(contact) {
  return isRecord(contact) &&
    isText(contact.id, 100) &&
    isText(contact.name, 100) && contact.name.trim() &&
    isText(contact.email, 254) &&
    isText(contact.phone, 32);
}

function isStoredTurn(turn) {
  return isRecord(turn) &&
    isText(turn.id, 120) &&
    ["user", "assistant"].includes(turn.role) &&
    isText(turn.text, 1200) &&
    (turn.role !== "user" || ["text", "voice"].includes(turn.source)) &&
    isText(turn.at, 40);
}

function isStoredResult(result) {
  return isRecord(result) &&
    isText(result.id, 300) &&
    isText(result.contactId, 120) &&
    isText(result.contactName, 100) &&
    result.status === "simulated" &&
    isText(result.outcome, 80) &&
    isText(result.summary, 1000) &&
    isText(result.nextAction, 200) &&
    Number.isFinite(result.durationSeconds) &&
    isRecord(result.structuredFields) &&
    Array.isArray(result.transcript) &&
    result.transcript.every(turn => isRecord(turn) &&
      isText(turn.speaker, 80) && isText(turn.text, 1200));
}

function isStoredCampaign(campaign) {
  return isRecord(campaign) &&
    isText(campaign.id, 120) &&
    isText(campaign.name, 120) &&
    ["queued", "running", "simulated complete", "stopped", "failed"].includes(campaign.status) &&
    isText(campaign.createdAt, 40) &&
    Number.isInteger(campaign.total) && campaign.total >= 0 && campaign.total <= MAX_CONTACTS &&
    Number.isInteger(campaign.completed) && campaign.completed >= 0 && campaign.completed <= campaign.total &&
    Array.isArray(campaign.results) && campaign.results.length <= campaign.total &&
    campaign.results.every(isStoredResult);
}

function restoreWorkspace(workspace) {
  if (!isRecord(workspace) ||
      !isText(workspace.id, 120) || !workspace.id ||
      !isText(workspace.name, 100) || !workspace.name.trim() ||
      !isStoredAgent(workspace.agent) ||
      !Array.isArray(workspace.contacts) || workspace.contacts.length > MAX_CONTACTS ||
      !workspace.contacts.every(isStoredContact) ||
      !Array.isArray(workspace.campaigns) || workspace.campaigns.length > 100 ||
      !workspace.campaigns.every(isStoredCampaign) ||
      !Array.isArray(workspace.conversation) || workspace.conversation.length > 500 ||
      !workspace.conversation.every(isStoredTurn) ||
      !Number.isInteger(workspace.conversationRequests) || workspace.conversationRequests < 0 ||
      !isRecord(workspace.requirements)) {
    return null;
  }

  const requirements = { ...EMPTY_REQUIREMENTS };
  for (const key of Object.keys(EMPTY_REQUIREMENTS)) {
    const value = workspace.requirements[key];
    if (value !== undefined && !isText(value)) return null;
    if (typeof value === "string") requirements[key] = value;
  }
  const campaigns = workspace.campaigns.map(campaign =>
    ["queued", "running"].includes(campaign.status)
      ? { ...campaign, status: "stopped" }
      : campaign);
  return { ...workspace, campaigns, requirements };
}

export function loadDemoSessionState(storage) {
  try {
    const session = storage || globalThis.sessionStorage;
    if (!session) throw new Error("Session storage is unavailable.");
    const saved = session.getItem(DEMO_SESSION_STORAGE_KEY);
    if (!saved) {
      const workspace = createDemoWorkspace();
      return {
        workspaces: [workspace],
        selectedWorkspaceId: workspace.id,
        section: "Overview",
        persistenceEnabled: true,
        message: "",
      };
    }

    const state = JSON.parse(saved);
    const workspaces = Array.isArray(state?.workspaces)
      ? state.workspaces.map(restoreWorkspace)
      : null;
    const sections = ["Overview", "Contacts", "Agent", "Campaigns", "Results", "Usage"];
    if (state?.version !== 1 || !workspaces?.length || workspaces.some(item => !item)) {
      throw new Error("Saved demo data has an unsupported format.");
    }
    return {
      workspaces,
      selectedWorkspaceId: workspaces.some(item => item.id === state.selectedWorkspaceId)
        ? state.selectedWorkspaceId
        : workspaces[0].id,
      section: sections.includes(state.section) ? state.section : "Overview",
      persistenceEnabled: true,
      message: "",
    };
  } catch {
    return {
      workspaces: [createDemoWorkspace()],
      selectedWorkspaceId: null,
      section: "Overview",
      persistenceEnabled: false,
      message: "Saved demo data could not be restored. This browser session may not support session storage.",
    };
  }
}

export function saveDemoSessionState(state, storage) {
  const session = storage || globalThis.sessionStorage;
  if (!session) throw new Error("Session storage is unavailable.");
  session.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify({
    version: 1,
    workspaces: state.workspaces,
    selectedWorkspaceId: state.selectedWorkspaceId,
    section: state.section,
  }));
}
