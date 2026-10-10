import { validateAnswers, validateBrief } from './consultant-validation.js';
export function validateLead(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Please complete your contact details.');
  const value = (key, max) => {
    const v = input[key];
    if (typeof v !== 'string' || v.length > max || /[\r\n\x00]/.test(v)) throw new Error('Please check your contact details.');
    return v.trim();
  };
  const name = value('name', 80), email = value('email', 160), phone = value('phone', 40);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (phone && (!/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7))) throw new Error('Enter a valid name, email, and optional phone number.');
  if (input.consent !== true) throw new Error('Please agree that VNS may contact you about this project.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId || '')) throw new Error('Please reopen the contact form and try again.');
  const checked = validateAnswers(input.answers);
  if (Object.keys(checked.errors).length) throw new Error('Please review your questionnaire answers.');
  let brief;
  try { brief = validateBrief(input.brief); } catch { throw new Error('Please generate a valid project brief first.'); }
  return { id: input.submissionId.toLowerCase(), name, email, phone, consent: true, answers: checked.answers, brief };
}
