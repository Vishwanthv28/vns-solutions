import { answerError } from '../../../server/consultant-validation.js';

export const CONSULTANT_LANGUAGES = Object.freeze([
  { code: 'en-IN', label: 'English' },
  { code: 'te-IN', label: 'తెలుగు' },
  { code: 'hi-IN', label: 'हिन्दी' },
]);

const english = {
  subtitle: 'Plan your project',
  intro: 'Hi. I’ll help organise your project idea into a clear starting brief.',
  questions: {},
  options: {},
  controls: {
    language: 'Language',
    back: 'Back',
    review: 'Review answers',
    continue: 'Continue',
    skip: 'Skip',
    question: (step, total) => `Question ${step} of ${total}`,
    complete: 'Questionnaire complete',
    generate: 'Generate AI brief',
    regenerate: 'Regenerate brief',
    retry: 'Retry AI brief',
    generating: 'Generating…',
    startAgain: 'Start again',
    talk: 'Talk to AI',
    type: 'Click or type',
    edit: 'Edit',
  },
  voice: {
    title: 'Voice conversation',
    guidance: 'Use your voice to answer each question. Your answers also fill the project questionnaire.',
    greeting: "Hello! I'm VNS AI, and I'll guide you through planning your project. Let's get started.",
    unsupported: 'Live voice is not supported in this browser. Try Chrome or Edge.',
    start: 'Start',
    mute: 'Mute',
    unmute: 'Unmute',
    end: 'End',
    showConversation: 'Show conversation',
    listening: 'Listening for your answer…',
    processing: 'Preparing the next question…',
    speaking: 'Speaking…',
    ended: 'Conversation ended. Your answers are saved.',
    notUnderstood: 'I didn’t quite catch that. Please say it another way or describe the closest option.',
    timelineClarification: 'Did you mean one to two months, or twelve months?',
    timelineUnsupported: 'Thanks for clarifying. The listed choices cover up to six months. You can choose as soon as practical, one to two months, three to six months, or that you are only exploring. Which fits best?',
    acknowledgement: 'Thanks, I’ve got that.',
    retry: 'Retry transcription',
    retrySpeech: 'Retry speech',
    recordAgain: 'Record again',
    sendAnswer: 'Send answer',
    complete: 'Thank you. Your questionnaire is complete.',
    user: 'You',
    assistant: 'VNS AI',
  },
};

const hindi = {
  subtitle: 'अपने प्रोजेक्ट की योजना बनाएं',
  intro: 'नमस्ते। मैं आपके प्रोजेक्ट के विचार को एक स्पष्ट शुरुआती रूपरेखा में बदलने में मदद करूँगा।',
  questions: {
    businessType: { label: 'सबसे पहले, आप किस तरह का व्यवसाय या प्रोजेक्ट शुरू करने की योजना बना रहे हैं?', help: 'एक छोटा जवाब काफी है—जैसे क्लिनिक, रेस्टोरेंट, कंसल्टेंसी या ऑनलाइन स्टोर।', placeholder: 'अपने व्यवसाय के बारे में बताएं' },
    websiteStatus: { label: 'आपकी मौजूदा वेबसाइट की स्थिति क्या है?' },
    mainGoal: { label: 'आप कौन-सा सबसे महत्वपूर्ण परिणाम चाहते हैं?' },
    customers: { label: 'आप किन ग्राहकों तक पहुँचना चाहते हैं?', help: 'उनके बारे में अपने शब्दों में बताएं। निजी ग्राहक जानकारी न लिखें।', placeholder: 'उदाहरण: स्थानीय क्लिनिक खोजने वाले परिवार' },
    capabilities: { label: 'आपके प्रोजेक्ट के लिए कौन-सी सुविधाएँ उपयोगी हो सकती हैं?', help: 'एक या अधिक चुनें। इससे अंतिम काम तय नहीं होता।' },
    timeline: { label: 'आप कब शुरू करना चाहेंगे?' },
    notes: { label: 'क्या प्रोजेक्ट को कोई और परिणाम हासिल करना चाहिए?', help: 'वैकल्पिक। पासवर्ड, भुगतान विवरण या गोपनीय जानकारी न लिखें।', placeholder: 'उपयोगी संदर्भ जोड़ें' },
  },
  options: {
    'I do not have a website': 'मेरी वेबसाइट नहीं है',
    'I have one, but it needs improvement': 'मेरी वेबसाइट है, लेकिन इसमें सुधार चाहिए',
    'My website works well': 'मेरी वेबसाइट अच्छी तरह काम करती है',
    'I am not sure yet': 'अभी तय नहीं है',
    'More enquiries': 'अधिक पूछताछ',
    'More bookings': 'अधिक बुकिंग',
    'More orders or sales': 'अधिक ऑर्डर या बिक्री',
    'Better customer support': 'बेहतर ग्राहक सहायता',
    'Less repetitive work': 'दोहराए जाने वाले काम कम करना',
    'New business website': 'नई व्यावसायिक वेबसाइट',
    'Website redesign': 'वेबसाइट का नया डिज़ाइन',
    'Enquiry or booking flow': 'पूछताछ या बुकिंग प्रक्रिया',
    'FAQ assistant': 'अक्सर पूछे जाने वाले सवालों का सहायक',
    'Email or WhatsApp follow-up': 'ईमेल या WhatsApp फ़ॉलो-अप',
    'Business workflow automation': 'व्यावसायिक कार्यों का स्वचालन',
    'As soon as practical': 'जितनी जल्दी व्यावहारिक हो',
    'Within 1–2 months': '1–2 महीनों में',
    'Within 3–6 months': '3–6 महीनों में',
    'I am only exploring': 'मैं अभी केवल विकल्प देख रहा/रही हूँ',
  },
  controls: {
    language: 'भाषा',
    back: 'वापस',
    review: 'जवाबों की समीक्षा करें',
    continue: 'आगे बढ़ें',
    skip: 'छोड़ें',
    question: (step, total) => `सवाल ${step} / ${total}`,
    complete: 'सवाल पूरे हुए',
    generate: 'AI रूपरेखा बनाएं',
    regenerate: 'रूपरेखा फिर बनाएं',
    retry: 'AI रूपरेखा दोबारा प्रयास करें',
    generating: 'बनाई जा रही है…',
    startAgain: 'फिर से शुरू करें',
    talk: 'Talk to AI',
    type: 'Click or type',
    edit: 'बदलें',
  },
  voice: {
    title: 'आवाज़ में बातचीत',
    guidance: 'हर सवाल का जवाब बोलकर दें। आपके जवाब प्रोजेक्ट प्रश्नावली में भी जुड़ेंगे।',
    greeting: 'नमस्ते! मैं VNS AI हूँ। मैं आपके प्रोजेक्ट की योजना बनाने में मदद करूँगा। चलिए शुरू करते हैं।',
    unsupported: 'इस ब्राउज़र में लाइव आवाज़ उपलब्ध नहीं है। Chrome या Edge आज़माएं।',
    start: 'शुरू करें',
    mute: 'म्यूट करें',
    unmute: 'अनम्यूट करें',
    end: 'समाप्त करें',
    showConversation: 'बातचीत दिखाएं',
    listening: 'आपका जवाब सुन रहे हैं…',
    processing: 'अगला सवाल तैयार हो रहा है…',
    speaking: 'बात कर रहे हैं…',
    ended: 'बातचीत समाप्त हुई। आपके जवाब सहेजे गए हैं।',
    notUnderstood: 'मैं ठीक से समझ नहीं पाया। कृपया दूसरे शब्दों में बताएं या सबसे करीब का विकल्प बताएं।',
    timelineClarification: 'क्या आपका मतलब एक से दो महीने था, या बारह महीने?',
    timelineUnsupported: 'बताने के लिए धन्यवाद। दिए गए विकल्प छह महीने तक हैं: जितनी जल्दी हो सके, एक से दो महीने, तीन से छह महीने, या अभी केवल विकल्प देखना। इनमें से कौन-सा सही है?',
    acknowledgement: 'धन्यवाद, मैंने आपका जवाब समझ लिया।',
    retry: 'ट्रांसक्रिप्शन फिर से प्रयास करें',
    retrySpeech: 'बोलना फिर से प्रयास करें',
    recordAgain: 'फिर से रिकॉर्ड करें',
    sendAnswer: 'जवाब भेजें',
    complete: 'धन्यवाद। आपकी प्रश्नावली पूरी हो गई है।',
    user: 'आप',
    assistant: 'VNS AI',
  },
};

const telugu = {
  subtitle: 'మీ ప్రాజెక్ట్‌ను ప్లాన్ చేయండి',
  intro: 'నమస్కారం. మీ ప్రాజెక్ట్ ఆలోచనను స్పష్టమైన ప్రారంభ ప్రణాళికగా రూపొందించడంలో సహాయపడతాను.',
  questions: {
    businessType: { label: 'ముందుగా, మీరు ఎలాంటి వ్యాపారం లేదా ప్రాజెక్ట్ ప్రారంభించాలని అనుకుంటున్నారు?', help: 'క్లినిక్, రెస్టారెంట్, కన్సల్టెన్సీ లేదా ఆన్‌లైన్ స్టోర్ వంటి చిన్న సమాధానం సరిపోతుంది.', placeholder: 'మీ వ్యాపారం గురించి చెప్పండి' },
    websiteStatus: { label: 'మీ ప్రస్తుత వెబ్‌సైట్ పరిస్థితి ఏమిటి?' },
    mainGoal: { label: 'మీరు కోరుకునే అత్యంత ముఖ్యమైన ఫలితం ఏమిటి?' },
    customers: { label: 'మీరు చేరుకోవాలనుకునే కస్టమర్లు ఎవరు?', help: 'మీ మాటల్లో వివరించండి. కస్టమర్ల వ్యక్తిగత సమాచారాన్ని నమోదు చేయవద్దు.', placeholder: 'ఉదాహరణ: స్థానిక క్లినిక్ కోసం చూస్తున్న కుటుంబాలు' },
    capabilities: { label: 'మీ ప్రాజెక్ట్‌కు ఏ ఫీచర్లు ఉపయోగపడవచ్చు?', help: 'ఒకటి లేదా అంతకంటే ఎక్కువ ఎంచుకోండి. ఇది తుది పనిని నిర్ణయించదు.' },
    timeline: { label: 'మీరు ఎప్పుడు ప్రారంభించాలనుకుంటున్నారు?' },
    notes: { label: 'ప్రాజెక్ట్ సాధించాల్సిన ఇంకేమైనా ఉందా?', help: 'ఐచ్ఛికం. పాస్‌వర్డ్‌లు, చెల్లింపు వివరాలు లేదా గోప్యమైన సమాచారాన్ని ఇవ్వవద్దు.', placeholder: 'ఉపయోగకరమైన వివరాలు జోడించండి' },
  },
  options: {
    'I do not have a website': 'నా దగ్గర వెబ్‌సైట్ లేదు',
    'I have one, but it needs improvement': 'వెబ్‌సైట్ ఉంది, కానీ మెరుగుపరచాలి',
    'My website works well': 'నా వెబ్‌సైట్ బాగా పనిచేస్తోంది',
    'I am not sure yet': 'ఇంకా నిర్ణయించలేదు',
    'More enquiries': 'మరిన్ని విచారణలు',
    'More bookings': 'మరిన్ని బుకింగ్‌లు',
    'More orders or sales': 'మరిన్ని ఆర్డర్లు లేదా అమ్మకాలు',
    'Better customer support': 'మెరుగైన కస్టమర్ సపోర్ట్',
    'Less repetitive work': 'పునరావృత పనులు తగ్గించడం',
    'New business website': 'కొత్త వ్యాపార వెబ్‌సైట్',
    'Website redesign': 'వెబ్‌సైట్ పునఃరూపకల్పన',
    'Enquiry or booking flow': 'విచారణ లేదా బుకింగ్ విధానం',
    'FAQ assistant': 'తరచుగా అడిగే ప్రశ్నల సహాయకుడు',
    'Email or WhatsApp follow-up': 'ఈమెయిల్ లేదా WhatsApp ఫాలో-అప్',
    'Business workflow automation': 'వ్యాపార పనుల ఆటోమేషన్',
    'As soon as practical': 'వీలైనంత త్వరగా',
    'Within 1–2 months': '1–2 నెలల్లో',
    'Within 3–6 months': '3–6 నెలల్లో',
    'I am only exploring': 'ప్రస్తుతం పరిశీలిస్తున్నాను',
  },
  controls: {
    language: 'భాష',
    back: 'వెనుకకు',
    review: 'సమాధానాలను సమీక్షించండి',
    continue: 'కొనసాగించండి',
    skip: 'దాటవేయండి',
    question: (step, total) => `ప్రశ్న ${step} / ${total}`,
    complete: 'ప్రశ్నావళి పూర్తయింది',
    generate: 'AI ప్రాజెక్ట్ ప్రణాళిక రూపొందించండి',
    regenerate: 'ప్రణాళికను మళ్లీ రూపొందించండి',
    retry: 'AI ప్రణాళికను మళ్లీ ప్రయత్నించండి',
    generating: 'రూపొందిస్తోంది…',
    startAgain: 'మళ్లీ ప్రారంభించండి',
    talk: 'Talk to AI',
    type: 'Click or type',
    edit: 'సవరించండి',
  },
  voice: {
    title: 'వాయిస్ సంభాషణ',
    guidance: 'ప్రతి ప్రశ్నకు మాట్లాడి సమాధానం ఇవ్వండి. మీ సమాధానాలు ప్రాజెక్ట్ ప్రశ్నావళిలోనూ నింపబడతాయి.',
    greeting: 'నమస్కారం! నేను VNS AIని. మీ ప్రాజెక్ట్ ప్రణాళికలో సహాయపడతాను. ప్రారంభిద్దాం.',
    unsupported: 'ఈ బ్రౌజర్‌లో లైవ్ వాయిస్‌కు మద్దతు లేదు. Chrome లేదా Edge ప్రయత్నించండి.',
    start: 'ప్రారంభించండి',
    mute: 'మ్యూట్',
    unmute: 'అన్‌మ్యూట్',
    end: 'ముగించండి',
    showConversation: 'సంభాషణను చూపించండి',
    listening: 'మీ సమాధానం వింటున్నాం…',
    processing: 'తదుపరి ప్రశ్నను సిద్ధం చేస్తున్నాం…',
    speaking: 'మాట్లాడుతున్నాం…',
    ended: 'సంభాషణ ముగిసింది. మీ సమాధానాలు భద్రంగా ఉన్నాయి.',
    notUnderstood: 'నాకు స్పష్టంగా అర్థం కాలేదు. దయచేసి మరోలా చెప్పండి లేదా దగ్గరగా ఉన్న ఎంపికను వివరించండి.',
    timelineClarification: 'మీ ఉద్దేశం ఒకటి నుండి రెండు నెలలా, లేక పన్నెండు నెలలా?',
    timelineUnsupported: 'వివరించినందుకు ధన్యవాదాలు. ఇక్కడ ఆరు నెలల వరకు ఎంపికలున్నాయి: వీలైనంత త్వరగా, ఒకటి నుండి రెండు నెలల్లో, మూడు నుండి ఆరు నెలల్లో, లేదా ఇంకా పరిశీలిస్తున్నాను. వీటిలో ఏది సరిపోతుంది?',
    acknowledgement: 'ధన్యవాదాలు, మీ సమాధానం అర్థమైంది.',
    retry: 'ట్రాన్స్‌క్రిప్షన్‌ను మళ్లీ ప్రయత్నించండి',
    retrySpeech: 'మాట్లాడటాన్ని మళ్లీ ప్రయత్నించండి',
    recordAgain: 'మళ్లీ రికార్డ్ చేయండి',
    sendAnswer: 'సమాధానాన్ని పంపండి',
    complete: 'ధన్యవాదాలు. మీ ప్రశ్నావళి పూర్తయింది.',
    user: 'మీరు',
    assistant: 'VNS AI',
  },
};

const translations = { 'en-IN': english, 'hi-IN': hindi, 'te-IN': telugu };

export function consultantCopy(language) {
  return translations[language] || english;
}

export function localizedQuestion(question, language) {
  return {
    ...question,
    ...consultantCopy(language).questions[question.id],
    options: question.options?.map(option => localizedOption(option, language)),
  };
}

export function localizedOption(option, language) {
  return consultantCopy(language).options[option] || option;
}

export function canonicalOption(label, options, language) {
  const normalized = label.toLocaleLowerCase().replace(/[.,!?।]/g, ' ').replace(/\s+/g, ' ').trim();
  const matches = options.filter(option => {
    const translated = localizedOption(option, language).toLocaleLowerCase()
      .replace(/[.,!?।]/g, ' ').replace(/\s+/g, ' ').trim();
    const canonical = option.toLocaleLowerCase();
    return normalized === translated ||
      normalized.includes(translated) ||
      normalized === canonical ||
      normalized.includes(canonical);
  });
  return matches.length === 1 ? matches[0] : null;
}

export function localizedValidation(question, value, language) {
  const error = question ? answerError(question, value) : '';
  if (!error || language === 'en-IN') return error;
  if (question.type === 'single') {
    return language === 'hi-IN'
      ? 'सूची में से एक विकल्प चुनें।'
      : 'జాబితాలోని ఒక ఎంపికను ఎంచుకోండి.';
  }
  if (question.type === 'multiple') {
    return language === 'hi-IN'
      ? 'कम से कम एक मान्य सुविधा चुनें।'
      : 'కనీసం ఒక సరైన ఫీచర్‌ను ఎంచుకోండి.';
  }
  const max = question.id === 'notes' ? 2000 : question.id === 'customers' ? 500 : 120;
  return language === 'hi-IN'
    ? `2 से ${max} अक्षरों के बीच जवाब दें।`
    : `2 నుండి ${max} అక్షరాల మధ్య సమాధానం ఇవ్వండి.`;
}
