const $ = id => document.getElementById(id);
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let activeUtterance = null;
let preferredVoice = null;
function show(who, message) { $('log').textContent = `${who}: ${message}`; }
function status(message) { $('status').textContent = message; }
function chooseVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices();
  preferredVoice = voices.find(v => v.lang.toLowerCase() === 'en-in') ||
    voices.find(v => v.lang.toLowerCase().startsWith('en-')) ||
    voices.find(v => v.lang.toLowerCase().startsWith('en')) || voices[0] || null;
}
if ('speechSynthesis' in window) {
  chooseVoice();
  speechSynthesis.addEventListener?.('voiceschanged', chooseVoice);
}
function say(message) {
  show('JARVIS', message);
  if (!('speechSynthesis' in window)) {
    status('VOICE NOT SUPPORTED IN THIS BROWSER');
    return;
  }
  try {
    const synth = window.speechSynthesis;
    chooseVoice();
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    activeUtterance = utterance; // Keep reference while speaking on mobile browsers.
    utterance.lang = preferredVoice?.lang || 'en-US';
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => status('JARVIS SPEAKING');
    utterance.onend = () => { status('SYSTEM READY'); if (activeUtterance === utterance) activeUtterance = null; };
    utterance.onerror = e => {
      status('VOICE ERROR: ' + (e.error || 'unknown'));
      if (activeUtterance === utterance) activeUtterance = null;
    };
    synth.resume();
    synth.speak(utterance);
    status('VOICE REQUESTED');
  } catch (e) { status('VOICE ERROR: ' + e.message); }
}
function handle(input) {
  const cmd = input.toLowerCase().replace(/^\s*(hey\s+)?jarvis[,\s]*/, '').trim();
  show('YOU', input);
  if (!cmd) return say('Please give me a command.');
  if (/\b(hello|hi|hey)\b/.test(cmd)) return say('Hello. All systems ready.');
  if (/\btime\b/.test(cmd)) return say('The time is ' + new Date().toLocaleTimeString('en-IN', {hour:'numeric', minute:'2-digit'}));
  if (/\bdate\b/.test(cmd)) return say('Today is ' + new Date().toLocaleDateString('en-IN', {dateStyle:'full'}));
  if (cmd.includes('open youtube')) { say('Opening YouTube.'); window.open('https://www.youtube.com', '_blank'); return; }
  if (cmd.includes('open google')) { say('Opening Google.'); window.open('https://www.google.com', '_blank'); return; }
  if (cmd.startsWith('search for ') || cmd.startsWith('search ')) {
    const q = cmd.replace(/^search (for )?/, '');
    say('Searching for ' + q);
    window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
    return;
  }
  if (cmd.includes('your name')) return say('I am Jarvis Air, your mobile voice assistant.');
  if (cmd.includes('what can you do')) return say('I can tell you the time and date, search the web, and open Google or YouTube. More features can be added.');
  say('That command is not available yet.');
}
$('talk').onclick = () => {
  if (!SR) { say('Speech recognition is not supported in this browser. You can type a command instead.'); return; }
  if (recognition) return;
  try {
    recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => status('LISTENING');
    recognition.onresult = e => handle(e.results[0][0].transcript);
    recognition.onerror = e => status('MIC ERROR: ' + e.error);
    recognition.onend = () => { recognition = null; if (!$('status').textContent.startsWith('VOICE')) status('SYSTEM READY'); };
    recognition.start();
  } catch (e) { recognition = null; status('MIC ERROR: ' + e.message); }
};
$('stop').onclick = () => {
  if (recognition) recognition.stop();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  activeUtterance = null;
  status('STOPPED');
};
$('send').onclick = () => { const v = $('typed').value.trim(); if (v) handle(v); };
$('typed').addEventListener('keydown', e => { if (e.key === 'Enter') $('send').click(); });
$('testSpeaker').onclick = () => say('Speaker test successful. Jarvis voice systems are online.');
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
