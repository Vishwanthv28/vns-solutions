export const SARVAM_INITIAL_LANGUAGES = Object.freeze({
  'en-IN': 'English',
  'te-IN': 'Telugu',
  'hi-IN': 'Hindi',
});

export function sarvamInitialLanguage(languageCode) {
  return typeof languageCode === 'string' && Object.hasOwn(SARVAM_INITIAL_LANGUAGES, languageCode)
    ? SARVAM_INITIAL_LANGUAGES[languageCode]
    : null;
}
