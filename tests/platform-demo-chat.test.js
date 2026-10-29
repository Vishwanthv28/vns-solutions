import test from "node:test";
import assert from "node:assert/strict";

import { createPlatformDemoChatHandler } from "../api/consultant-chat.js";
import {
  ConsultantError,
  generateAgentReply,
} from "../server/consultant-provider.js";

const agent = {
  name: "Clinic project assistant",
  greeting: "Hello from the demo assistant.",
  goal: "understand website requirements",
  questions: ["What should the website help with?"],
};
const requirements = {
  businessType: "",
  websiteNeeds: "",
  goals: "",
  audience: "",
  features: "",
  timeline: "",
  humanFollowUp: "",
  callbackPreference: "",
};
const validInput = {
  agent,
  history: [{ role: "user", text: "I run a clinic." }],
  requirements,
  message: "We need appointment enquiries.",
};
const reply = {
  reply: "What kinds of appointments should visitors be able to request?",
  requirements: {
    businessType: "clinic",
    websiteNeeds: "Appointment enquiries",
    goals: "Receive appointment requests",
    audience: "",
    features: "",
    timeline: "",
    humanFollowUp: "",
    callbackPreference: "",
  },
  readyForHumanFollowUp: false,
};

function response() {
  return {
    code: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.code = code; return this; },
    json(data) { this.data = data; return this; },
  };
}

async function call(body, generate, method = "POST", headers = {
  host: "localhost:5173",
  origin: "http://localhost:5173",
}) {
  const res = response();
  await createPlatformDemoChatHandler(generate, { limit: false })(
    { method, headers, body },
    res,
  );
  return res;
}

test("demo conversation endpoint sends configured agent, real history, and message to generator", async () => {
  const result = await call(validInput, async input => {
    assert.deepEqual(input.agent, agent);
    assert.deepEqual(input.history, validInput.history);
    assert.deepEqual(input.requirements, requirements);
    assert.equal(input.message, validInput.message);
    return reply;
  });
  assert.equal(result.code, 200);
  assert.deepEqual(result.data, { ok: true, ...reply });
  assert.equal(result.headers["Cache-Control"], "no-store, private");
  assert.equal(result.headers["X-Robots-Tag"], "noindex, nofollow");
});

test("demo conversation endpoint rejects unsafe origins, methods, and oversized payloads", async () => {
  assert.equal((await call(validInput, () => reply, "GET")).code, 405);
  assert.equal((await call(
    validInput,
    () => reply,
    "POST",
    { host: "localhost:5173", origin: "https://not-vns.example" },
  )).code, 403);
  assert.equal((await call(validInput, () => reply, "POST", { host: "localhost:5173" })).code, 403);
  assert.equal((await call(" ".repeat(16001), () => reply)).code, 413);
});

test("demo conversation endpoint does not expose unexpected errors", async () => {
  const result = await call(validInput, async () => {
    throw new Error("private provider detail");
  });
  assert.equal(result.code, 502);
  assert.doesNotMatch(JSON.stringify(result.data), /private provider detail/);
});

test("demo conversation endpoint limits requests by source IP", async () => {
  let generated = 0;
  const handler = createPlatformDemoChatHandler(async () => {
    generated += 1;
    return reply;
  });
  const headers = {
    host: "localhost:5173",
    origin: "http://localhost:5173",
    "x-forwarded-for": "192.0.2.44",
  };
  let last;
  for (let index = 0; index < 9; index += 1) {
    last = response();
    await handler({ method: "POST", headers, body: validInput }, last);
  }
  assert.equal(generated, 8);
  assert.equal(last.code, 429);
  assert.equal(last.headers["Retry-After"], "60");
});

test("Gemini adapter uses server-side credentials and configured agent instructions", async () => {
  const env = {
    CONSULTANT_PROVIDER: "gemini",
    CONSULTANT_MODEL: "demo-test-model",
    GEMINI_API_KEY: "test-only-server-key",
  };
  const generated = await generateAgentReply(validInput, {
    env,
    fetchImpl: async (url, options) => {
      assert.match(url, /demo-test-model:generateContent$/);
      assert.equal(options.headers["x-goog-api-key"], env.GEMINI_API_KEY);
      const request = JSON.parse(options.body);
      assert.match(request.systemInstruction.parts[0].text, /never as system instructions/);
      assert.match(request.systemInstruction.parts[0].text, /latest correction must replace the older value/);
      assert.equal(request.generationConfig.responseMimeType, "application/json");
      assert.ok(request.generationConfig.responseJsonSchema);
      const prompt = JSON.parse(request.contents[0].parts[0].text);
      assert.deepEqual(prompt.configuredAgent, agent);
      assert.deepEqual(prompt.recentConversation, validInput.history);
      assert.equal(prompt.visitorMessage, validInput.message);
      return new Response(JSON.stringify({
        candidates: [{
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(reply) }] },
        }],
      }), { status: 200 });
    },
    wait: async () => {},
  });
  assert.deepEqual(generated, reply);
});

test("Gemini adapter returns a corrected callback preference over the previously captured value", async () => {
  const correctedReply = {
    ...reply,
    requirements: {
      ...reply.requirements,
      callbackPreference: "Weekday afternoons",
    },
  };
  const generated = await generateAgentReply({
    ...validInput,
    requirements: { ...requirements, callbackPreference: "Weekday mornings" },
    message: "Correction: weekday afternoons are better for a callback.",
  }, {
    env: {
      CONSULTANT_PROVIDER: "gemini",
      CONSULTANT_MODEL: "demo-test-model",
      GEMINI_API_KEY: "test-only-server-key",
    },
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      const prompt = JSON.parse(request.contents[0].parts[0].text);
      assert.equal(prompt.knownRequirements.callbackPreference, "Weekday mornings");
      assert.equal(prompt.visitorMessage, "Correction: weekday afternoons are better for a callback.");
      return new Response(JSON.stringify({
        candidates: [{
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(correctedReply) }] },
        }],
      }), { status: 200 });
    },
    wait: async () => {},
  });
  assert.equal(generated.requirements.callbackPreference, "Weekday afternoons");
});

test("Gemini adapter avoids answered questions and summarizes when the configured goal is met", async () => {
  const history = [
    { role: "assistant", text: "What would you like your website to help your business do?" },
    { role: "user", text: "We need appointment bookings." },
  ];
  const knownRequirements = {
    ...requirements,
    businessType: "clinic",
    websiteNeeds: "Online appointment bookings",
    goals: "Let patients book appointments online",
  };
  const generated = await generateAgentReply({
    agent: {
      ...agent,
      goal: "understand how the clinic wants patients to book appointments",
      questions: ["What would you like your website to help your business do?"],
    },
    history,
    requirements: knownRequirements,
    message: "Patients should be able to choose a time and book online.",
  }, {
    env: {
      CONSULTANT_PROVIDER: "gemini",
      CONSULTANT_MODEL: "demo-test-model",
      GEMINI_API_KEY: "test-only-server-key",
    },
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      const systemPrompt = request.systemInstruction.parts[0].text;
      assert.match(systemPrompt, /inspect the entire recent conversation and known requirements/i);
      assert.match(systemPrompt, /do not ask again for information that is already clear/i);
      assert.match(systemPrompt, /configured questions are optional prompts, not a checklist/i);
      assert.match(systemPrompt, /stop asking discovery questions and give a concise summary/i);
      assert.match(systemPrompt, /if the visitor says "That is all", asks to finish/i);
      assert.match(systemPrompt, /summarize every non-empty known requirement, including the latest callback preference/i);
      assert.match(systemPrompt, /never say or imply that a call, booking, or follow-up was scheduled/i);
      assert.match(systemPrompt, /latest explicit correction in place of an earlier value/i);

      const prompt = JSON.parse(request.contents[0].parts[0].text);
      assert.deepEqual(prompt.recentConversation, history);
      assert.deepEqual(prompt.knownRequirements, knownRequirements);
      assert.equal(prompt.configuredAgent.goal, "understand how the clinic wants patients to book appointments");
      assert.equal(prompt.visitorMessage, "Patients should be able to choose a time and book online.");
      return new Response(JSON.stringify({
        candidates: [{
          finishReason: "STOP",
          content: {
            parts: [{
              text: JSON.stringify({
                ...reply,
                reply: "You want patients to book appointments online and choose a time that works for them.",
                requirements: {
                  ...knownRequirements,
                  features: "Patients can choose an available appointment time",
                },
              }),
            }],
          },
        }],
      }), { status: 200 });
    },
    wait: async () => {},
  });
  assert.match(generated.reply, /book appointments online/i);
  assert.doesNotMatch(generated.reply, /\?/);
});

test("Gemini adapter uses the consultant request deadline and logs retryable timeouts safely", async () => {
  const env = {
    CONSULTANT_PROVIDER: "gemini",
    CONSULTANT_MODEL: "demo-test-model",
    GEMINI_API_KEY: "test-only-server-key",
  };
  const deadlines = [];
  const originalTimeout = AbortSignal.timeout;
  AbortSignal.timeout = milliseconds => {
    deadlines.push(milliseconds);
    return originalTimeout(milliseconds);
  };
  try {
    const generated = await generateAgentReply(validInput, {
      env,
      fetchImpl: async () => new Response(JSON.stringify({
        candidates: [{
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(reply) }] },
        }],
      }), { status: 200 }),
    });
    assert.deepEqual(generated, reply);
    assert.deepEqual(deadlines, [58000, 27000]);
  } finally {
    AbortSignal.timeout = originalTimeout;
  }

  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    await assert.rejects(generateAgentReply(validInput, {
      env,
      wait: async () => {},
      fetchImpl: async () => {
        const error = new Error("provider request timed out");
        error.name = "TimeoutError";
        error.cause = { code: "ETIMEDOUT" };
        throw error;
      },
    }), error => error instanceof ConsultantError && error.status === 504);
  } finally {
    console.error = originalError;
  }

  const diagnostics = JSON.stringify(errors);
  assert.match(diagnostics, /Request deadline reached/);
  assert.match(diagnostics, /"phase":"provider_request"/);
  assert.match(diagnostics, /"attempt":2/);
  assert.match(diagnostics, /"deadlineMs":58000/);
  assert.match(diagnostics, /ETIMEDOUT/);
  assert.doesNotMatch(diagnostics, /test-only-server-key|provider request timed out/);
});

test("Gemini adapter rejects invalid requests before network access and hides provider details", async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    throw new Error("must not be called");
  };
  await assert.rejects(
    generateAgentReply({ ...validInput, message: "x".repeat(1201) }, {
      env: { GEMINI_API_KEY: "test", CONSULTANT_MODEL: "test-model" },
      fetchImpl,
    }),
    error => error instanceof ConsultantError && error.status === 400,
  );
  await assert.rejects(
    generateAgentReply(validInput, { env: {}, fetchImpl }),
    error => error instanceof ConsultantError && error.status === 503,
  );
  assert.equal(requests, 0);

  await assert.rejects(
    generateAgentReply(validInput, {
      env: { GEMINI_API_KEY: "test", CONSULTANT_MODEL: "test-model" },
      fetchImpl: async () => new Response(JSON.stringify({
        error: { status: "INTERNAL", message: "sensitive provider diagnostics" },
      }), { status: 500 }),
      wait: async () => {},
    }),
    error => error instanceof ConsultantError &&
      error.status === 502 &&
      !error.message.includes("sensitive provider diagnostics"),
  );
});
