export async function logSupabaseFailure(label, response) {
  let error;
  try { error = await response.json(); } catch {}
  const code = typeof error?.code === 'string' && /^[A-Z0-9]{5,8}$/.test(error.code) ? error.code : 'unknown';
  let diagnostic = '';
  if (code === 'PGRST204' && typeof error.message === 'string') {
    const match = error.message.match(/Could not find the '([a-z0-9_]+)' column of '([a-z0-9_]+)' in the schema cache/i);
    if (match) diagnostic = `Missing column ${match[2]}.${match[1]}`;
  } else if (code === '42703' && typeof error.message === 'string') {
    const match = error.message.match(/column (?:(?:([a-z0-9_]+)\.)?([a-z0-9_]+)) does not exist/i);
    if (match) diagnostic = `Missing column ${match[1] ? `${match[1]}.` : ''}${match[2]}`;
  }
  console.error(label, response.status, code, ...(diagnostic ? [diagnostic] : []));
}
