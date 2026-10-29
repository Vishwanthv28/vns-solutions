import test from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_SESSION_STORAGE_KEY,
  clearDemoConversation,
  createDemoWorkspace,
  EMPTY_REQUIREMENTS,
  buildConversationClosingSummary,
  isConversationFinishRequest,
  loadDemoSessionState,
  mergeConversationRequirements,
  parseContactCsv,
  saveDemoSessionState,
  simulateConversation,
} from "../src/components/CallingPlatform/demoPlatform.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
  };
}

test("finish requests close with every captured requirement and the latest callback preference", () => {
  assert.equal(isConversationFinishRequest("That is all."), true);
  assert.equal(isConversationFinishRequest("Please finish the conversation."), true);
  assert.equal(isConversationFinishRequest("We should finish the website by December."), false);

  const summary = buildConversationClosingSummary({
    ...EMPTY_REQUIREMENTS,
    businessType: "Dental clinic",
    websiteNeeds: "Online appointment bookings",
    goals: "Increase appointment enquiries",
    audience: "Local patients",
    features: "Choose an appointment time",
    timeline: "Next quarter",
    humanFollowUp: "Visitor requested a human follow-up",
    callbackPreference: "Weekday afternoons",
  });

  assert.match(summary, /Dental clinic/);
  assert.match(summary, /Online appointment bookings/);
  assert.match(summary, /Increase appointment enquiries/);
  assert.match(summary, /Local patients/);
  assert.match(summary, /Choose an appointment time/);
  assert.match(summary, /Next quarter/);
  assert.match(summary, /Weekday afternoons/);
  assert.match(summary, /preference only; not scheduled/i);
  assert.match(summary, /You requested a human follow-up \(not scheduled\)/i);
  assert.match(summary, /No call, booking, or follow-up has been scheduled/i);
  assert.doesNotMatch(summary, /\?/);
});

test("CSV import supports quoted fields, CRLF, and valid contacts", () => {
  const parsed = parseContactCsv('name,email,phone\r\n"Demo, Contact",demo@example.test,+911234567890\r\nAnother,,9876543210\r\n');
  assert.equal(parsed.contacts.length, 2);
  assert.equal(parsed.contacts[0].name, "Demo, Contact");
  assert.equal(parsed.contacts[1].phone, "9876543210");
  assert.deepEqual(parsed.skipped, []);
});

test("CSV import rejects malformed input and skips invalid or duplicate rows", () => {
  assert.throws(() => parseContactCsv('name,email\n"unclosed,demo@example.test'), /closing quotation mark/);
  const parsed = parseContactCsv("name,email,phone\nValid,valid@example.test,\nMissing,,\nDuplicate,valid@example.test,\nBad,bad-email,\n");
  assert.equal(parsed.contacts.length, 1);
  assert.equal(parsed.skipped.length, 3);
});

test("simulated results are clearly marked and never report real actions", () => {
  const contact = { id: "c1", name: "Demo", email: "demo@example.test", phone: "" };
  const result = simulateConversation(contact, {
    name: "Demo agent",
    greeting: "Hello",
    goal: "test a demo",
  }, 0);
  const secondCampaignResult = simulateConversation(contact, {
    name: "Demo agent",
    greeting: "Hello",
    goal: "test a demo",
  }, 0, "another-campaign");
  assert.equal(result.status, "simulated");
  assert.notEqual(result.id, secondCampaignResult.id);
  assert.equal(result.structuredFields.followUpPermission, "Not collected in simulation");
  assert.match(result.transcript.at(-1).text, /no call was placed/i);
});

test("demo workspaces have independent contact, agent, and campaign collections", () => {
  const first = createDemoWorkspace();
  const second = createDemoWorkspace();
  first.contacts.push({ id: "private-demo-contact" });
  first.agent.name = "Workspace one agent";
  assert.notEqual(first.id, second.id);
  assert.deepEqual(second.contacts, []);
  assert.notEqual(second.agent.name, first.agent.name);
});

test("demo session storage restores isolated workspaces, agent settings, conversation, and requirements", () => {
  const first = createDemoWorkspace("Demo workspace 1");
  first.agent.name = "First workspace assistant";
  first.conversation = [{ id: "turn-1", role: "user", source: "text", text: "Build a booking site", at: "2025-01-01T10:00:00.000Z" }];
  first.requirements = { ...EMPTY_REQUIREMENTS, goals: "Book appointments", callbackPreference: "Weekday mornings" };
  first.conversationRequests = 1;
  const second = createDemoWorkspace("Demo workspace 2");
  second.agent.name = "Second workspace assistant";
  second.requirements.businessType = "Clinic";
  const storage = memoryStorage();

  saveDemoSessionState({
    workspaces: [first, second],
    selectedWorkspaceId: second.id,
    section: "Agent",
  }, storage);
  const restored = loadDemoSessionState(storage);

  assert.equal(restored.persistenceEnabled, true);
  assert.equal(restored.selectedWorkspaceId, second.id);
  assert.equal(restored.section, "Agent");
  assert.equal(restored.workspaces[0].agent.name, "First workspace assistant");
  assert.equal(restored.workspaces[0].conversation[0].text, "Build a booking site");
  assert.equal(restored.workspaces[0].requirements.goals, "Book appointments");
  assert.equal(restored.workspaces[0].requirements.callbackPreference, "Weekday mornings");
  assert.equal(restored.workspaces[1].agent.name, "Second workspace assistant");
  assert.equal(restored.workspaces[1].requirements.businessType, "Clinic");
  assert.equal(restored.workspaces[1].conversation.length, 0);
  assert.ok(storage.getItem(DEMO_SESSION_STORAGE_KEY));
});

test("demo session storage adds callback preference to older data and rejects malformed saved state", () => {
  const workspace = createDemoWorkspace();
  const olderRequirements = { ...EMPTY_REQUIREMENTS };
  delete olderRequirements.callbackPreference;
  const legacyState = {
    version: 1,
    workspaces: [{ ...workspace, requirements: olderRequirements }],
    selectedWorkspaceId: workspace.id,
    section: "Overview",
  };
  const restored = loadDemoSessionState(memoryStorage({
    [DEMO_SESSION_STORAGE_KEY]: JSON.stringify(legacyState),
  }));
  assert.equal(restored.persistenceEnabled, true);
  assert.equal(restored.workspaces[0].requirements.callbackPreference, "");

  const malformed = loadDemoSessionState(memoryStorage({
    [DEMO_SESSION_STORAGE_KEY]: "{not-json",
  }));
  assert.equal(malformed.persistenceEnabled, false);
  assert.match(malformed.message, /could not be restored/i);
});

test("new explicit requirement values replace earlier captured values", () => {
  const previous = {
    ...EMPTY_REQUIREMENTS,
    callbackPreference: "Weekday mornings",
    goals: "Book appointments",
  };
  const corrected = mergeConversationRequirements(previous, {
    ...EMPTY_REQUIREMENTS,
    callbackPreference: "Weekday afternoons",
    goals: "Book consultations",
  });
  assert.equal(corrected.callbackPreference, "Weekday afternoons");
  assert.equal(corrected.goals, "Book consultations");
  assert.equal(corrected.businessType, "");
});

test("clearing a conversation resets only the selected workspace", () => {
  const first = createDemoWorkspace("Demo workspace 1");
  first.conversation = [{ id: "turn-1", role: "user", source: "text", text: "First transcript", at: "2025-01-01T10:00:00.000Z" }];
  first.requirements.callbackPreference = "Weekday mornings";
  first.conversationRequests = 1;
  const second = createDemoWorkspace("Demo workspace 2");
  second.conversation = [{ id: "turn-2", role: "user", source: "text", text: "Second transcript", at: "2025-01-01T10:00:00.000Z" }];
  second.requirements.businessType = "Clinic";

  const cleared = clearDemoConversation([first, second], first.id);

  assert.deepEqual(cleared[0].conversation, []);
  assert.equal(cleared[0].requirements.callbackPreference, "");
  assert.equal(cleared[0].conversationRequests, 0);
  assert.equal(cleared[1], second);
  assert.equal(cleared[1].conversation[0].text, "Second transcript");
  assert.equal(cleared[1].requirements.businessType, "Clinic");
});
