export const consultantQuestions = [
  {
    id: "businessType",
    label: "First, what kind of business or project are you planning?",
    help: "A short answer is enough—for example: clinic, restaurant, consultancy or online store.",
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
    options: ["More enquiries", "More bookings", "More orders or sales", "Better customer support", "Less repetitive work"],
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
    options: ["New business website", "Website redesign", "Enquiry or booking flow", "FAQ assistant", "Email or WhatsApp follow-up", "Business workflow automation"],
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
  if (answers.mainGoal === "Better customer support" || capabilities.includes("FAQ assistant")) {
    recommendations.add("AI customer support");
  }
  if (answers.mainGoal === "Less repetitive work" || capabilities.some(item => ["Email or WhatsApp follow-up", "Business workflow automation"].includes(item))) {
    recommendations.add("Business automation");
  }
  if (!recommendations.size) recommendations.add("Conversion websites");

  return [...recommendations];
}
