export const consultantQuestions = [
  {
    id: "businessType",
    label: "First, what kind of business or project are you planning?",
    help: "A short answer is enough—for example: clinic, restaurant, consultancy or real-estate project.",
    type: "text",
    placeholder: "Tell us about your business",
  },
  {
    id: "websiteStatus",
    label: "What is your current website situation?",
    type: "single",
    options: ["I do not have a website", "I have one, but it needs improvement", "My website works well", "I am not sure yet"],
  },
  {
    id: "mainGoal",
    label: "What is the most important result you want?",
    type: "single",
    options: ["More enquiries", "More bookings", "More orders or sales", "Faster lead response", "Less repetitive work"],
  },
  {
    id: "customers",
    label: "Who are the customers you most want to reach?",
    help: "Describe them in your own words. Do not enter private customer information.",
    type: "text",
    placeholder: "For example: families looking for a local clinic",
  },
  {
    id: "capabilities",
    label: "Which capabilities may help your project?",
    help: "Choose one or more. This does not create a final scope.",
    type: "multiple",
    options: ["New business website", "Website redesign", "Enquiry or booking flow", "AI voice agent", "WhatsApp follow-up", "Business workflow automation"],
  },
  {
    id: "timeline",
    label: "When would you like to start?",
    type: "single",
    options: ["As soon as practical", "Within 1–2 months", "Within 3–6 months", "I am only exploring"],
  },
  {
    id: "notes",
    label: "Is there anything else the project should achieve?",
    help: "Optional. Avoid passwords, payment details or confidential information.",
    type: "text",
    optional: true,
    multiline: true,
    placeholder: "Add any useful context",
  },
];

export function recommendVNSServices(answers) {
  const recommendations = new Set();
  const capabilities = answers.capabilities || [];

  if (answers.websiteStatus !== "My website works well" || capabilities.some(item => ["New business website", "Website redesign", "Enquiry or booking flow"].includes(item))) {
    recommendations.add("Conversion websites");
  }
  if (answers.mainGoal === "Faster lead response" || capabilities.some(item => ["AI voice agent", "WhatsApp follow-up"].includes(item))) {
    recommendations.add("AI voice & WhatsApp agents");
  }
  if (answers.mainGoal === "Less repetitive work" || capabilities.includes("Business workflow automation")) {
    recommendations.add("Business automation");
  }
  if (!recommendations.size) recommendations.add("Conversion websites");

  return [...recommendations];
}
