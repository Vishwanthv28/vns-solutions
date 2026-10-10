import { consultantQuestions } from '../src/components/AIConsultant/consultantQuestions.js';

export const VNS_SERVICES = ['Conversion websites', 'AI customer support', 'Business automation'];
export function answerError(question, value) {
  if (question.type === 'multiple') {
    return Array.isArray(value) && value.length > 0 && value.length <= question.options.length && new Set(value).size === value.length && value.every(v => question.options.includes(v)) ? '' : 'Choose at least one valid capability.';
  }
  if (question.type === 'single') return question.options.includes(value) ? '' : 'Choose one of the listed options.';
  if (value == null && question.optional) return '';
  if (typeof value !== 'string') return 'Enter a text answer.';
  const text = value.trim();
  if (question.optional && !text) return '';
  const max = question.id === 'notes' ? 2000 : question.id === 'customers' ? 500 : 120;
  return text.length >= 2 && text.length <= max ? '' : `Enter between 2 and ${max} characters.`;
}
export function validateAnswers(input) {
  const errors = {};
  const answers = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { answers: 'Answers must be an object.' }, answers };
  for (const q of consultantQuestions) {
    const value = input[q.id];
    const error = answerError(q, value);
    if (error) errors[q.id] = error;
    else answers[q.id] = typeof value === 'string' ? value.trim() : value ?? '';
  }
  return { errors, answers };
}
export function validateBrief(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid brief');
  const text = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 1500;
  const list = v => Array.isArray(v) && v.length >= 1 && v.length <= 8 && v.every(text);
  if (!text(input.businessType) || !text(input.summary) || !list(input.goals) || !list(input.suggestedFeatures) || !list(input.nextSteps) || !Array.isArray(input.recommendedServices) || input.recommendedServices.length < 1 || input.recommendedServices.length > 3 || !input.recommendedServices.every(s => s && VNS_SERVICES.includes(s.name) && text(s.reason)) || new Set(input.recommendedServices.map(s => s.name)).size !== input.recommendedServices.length) throw new Error('Invalid brief');
  return { businessType: input.businessType, summary: input.summary, goals: input.goals, recommendedServices: input.recommendedServices.map(({ name, reason }) => ({ name, reason })), suggestedFeatures: input.suggestedFeatures, nextSteps: input.nextSteps };
}
