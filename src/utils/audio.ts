// Web Audio API chime for token announcements (counter bells)
export function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // First bell tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Second chime tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.25); // A5
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 1.2);
  } catch (e) {
    // AudioContext might be blocked before first user gesture
  }
}

// Helper to format token number for natural speech synthesis
function formatTokenForSpeech(tokenNumber: string): string {
  // If format is KQ-116, space it out: K Q, 1 1 6
  return tokenNumber.replace(/^([A-Za-z]+)-?(\d+)$/, (_match, prefix, num) => {
    return `${prefix.split('').join(' ')}, ${num.split('').join(' ')}`;
  });
}

// Text-to-speech announcement supporting token number, counter number, optional farmer name, and bilingual speech (Hindi / English)
export function announceToken(
  tokenNumber: string, 
  counterNumber: number, 
  farmerName?: string,
  lang: 'both' | 'hi' | 'en' = 'both'
) {
  try {
    playChime();
    if (!('speechSynthesis' in window)) return;

    setTimeout(() => {
      window.speechSynthesis.cancel(); // Cancel any lingering utterance

      const spokenToken = formatTokenForSpeech(tokenNumber);
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => v.lang.startsWith('hi')) || voices.find(v => v.lang.includes('IN'));
      const englishVoice = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en'));

      // 1. Hindi Utterance
      const speakHindi = () => {
        const text = farmerName
          ? `टोकन नंबर ${spokenToken}, किसान ${farmerName}, कृपया काउंटर नंबर ${counterNumber} पर पधारें।`
          : `टोकन नंबर ${spokenToken}, कृपया काउंटर नंबर ${counterNumber} पर पधारें।`;
        
        const hindiUtterance = new SpeechSynthesisUtterance(text);
        hindiUtterance.lang = 'hi-IN';
        if (hindiVoice) hindiUtterance.voice = hindiVoice;
        hindiUtterance.rate = 0.9;
        hindiUtterance.pitch = 1.0;

        if (lang === 'both') {
          hindiUtterance.onend = () => speakEnglish();
        }
        window.speechSynthesis.speak(hindiUtterance);
      };

      // 2. English Utterance
      const speakEnglish = () => {
        const text = farmerName
          ? `Token number ${spokenToken}, ${farmerName}, please proceed to Counter ${counterNumber}.`
          : `Token number ${spokenToken}, please proceed to Counter ${counterNumber}.`;
        
        const enUtterance = new SpeechSynthesisUtterance(text);
        enUtterance.lang = 'en-IN';
        if (englishVoice) enUtterance.voice = englishVoice;
        enUtterance.rate = 0.95;
        enUtterance.pitch = 1.0;
        window.speechSynthesis.speak(enUtterance);
      };

      if (lang === 'hi' || lang === 'both') {
        speakHindi();
      } else {
        speakEnglish();
      }
    }, 450);
  } catch (e) {
    // Graceful fallback
  }
}
