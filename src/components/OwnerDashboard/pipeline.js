// These helpers are local rules/templates, not an extra AI call.
export function followupState(lead, now = Date.now()) {
  if (lead.status === 'completed') return 'completed';
  if (!lead.next_followup_at) return 'unscheduled';
  return Date.parse(lead.next_followup_at) <= now ? 'due' : 'upcoming';
}

export function localDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function replyDraft(lead, kind = 'first') {
  const name = String(lead.name || 'there').trim().replace(/[\r\n]+/g, ' ');
  const services = Array.isArray(lead.brief?.recommendedServices)
    ? lead.brief.recommendedServices.map(service => service.name).filter(Boolean).join(', ') : '';
  if (kind === 'followup') return `Hi ${name},\n\nI’m following up on your project enquiry with VNS Solutions. Are you still looking for help${services ? ` with ${services.toLowerCase()}` : ''}?\n\nIf so, please share a convenient time for a short discussion. We can confirm your requirements and agree the next step.\n\nBest,\nVNS Solutions`;
  return `Hi ${name},\n\nThank you for sharing your project requirements with VNS Solutions.${services ? ` Your brief mentions ${services.toLowerCase()}.` : ''}\n\nCould you share a convenient time for a short discovery call? We’ll confirm your requirements before proposing a scope, timeline and price.\n\nBest,\nVNS Solutions`;
}
