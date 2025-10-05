const BACKEND_URL = 'http://127.0.0.1:5000/chat'; // change if your backend runs elsewhere

const chatEl = document.getElementById('chat');
const toneSelect = document.getElementById('toneSelect');
const voiceSelect = document.getElementById('voiceSelect');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const crazySlider = document.getElementById('crazySlider');
const crazyValue = document.getElementById('crazyValue');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const speakRing = document.getElementById('speakRing');
const ringCtx = speakRing.getContext('2d');
let ringAnimationId = null;

// Update crazy factor display
crazyValue.textContent = crazySlider.value + '%';
crazySlider.addEventListener('input', () => {
  crazyValue.textContent = crazySlider.value + '%';
});

// Add chat message
function addMessage(text, who='them') {
  const wrapper = document.createElement('div');
  wrapper.className = 'msg' + (who==='you' ? ' you' : '');
  const bubble = document.createElement('div');
  bubble.className = 'bubble' + (who==='you' ? ' you' : '');
  bubble.textContent = text;
  wrapper.appendChild(bubble);
  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Procedural speak ring
function drawRing(intensity=0){
  const w = speakRing.width;
  const h = speakRing.height;
  const radius = Math.min(w,h)/2 - 5;
  ringCtx.clearRect(0,0,w,h);
  ringCtx.beginPath();
  ringCtx.arc(w/2,h/2,radius+intensity,0,Math.PI*2);
  ringCtx.strokeStyle = `rgba(255,107,129,${0.2+intensity/10})`;
  ringCtx.lineWidth = 6;
  ringCtx.shadowBlur = 15;
  ringCtx.shadowColor = 'rgba(255,107,129,0.5)';
  ringCtx.stroke();
}

function animateRing(){
  let t = 0;
  function loop(){
    t += 0.1;
    drawRing(Math.abs(Math.sin(t))*3);
    ringAnimationId = requestAnimationFrame(loop);
  }
  loop();
}

function stopRing(){
  if(ringAnimationId) cancelAnimationFrame(ringAnimationId);
  ringCtx.clearRect(0,0,speakRing.width,speakRing.height);
}

// Backend call
async function sendToBackend(text, voice='default', crazy=50){
  try {
    const res = await fetch(BACKEND_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        prompt: `You are an AI girlfriend who is deeply obsessed with the user.
Respond in a clingy, affectionate, and over-the-top tone. Also, dont make responses longer than 70 words
The user says: "${text}"
You reply:`
      })
    });
    const data = await res.json();
    if(data && data.response) return { text: data.response };
    if(data && data.error) return { text: `Server error: ${data.error}` };
    return { text: "I couldn't generate a reply." };
  } catch(e) {
    console.error(e);
    return { text: "Error: could not get reply from backend." };
  }
}


// Send message
async function sendMessage(){
  const text = textInput.value.trim();
  if(!text) return;
  addMessage(text, 'you');
  textInput.value = '';
  const voice = voiceSelect.value;
  const crazy = parseInt(crazySlider.value,10);
  addMessage("Thinking...", 'them');
  try {
    const res = await sendToBackend(text, voice, crazy);
    addMessage(res.text, 'them');
    speakText(res.text, voice);
  } catch(e){
    console.error(e);
    addMessage("Error: failed to send message.", 'them');
  }
}

sendBtn.addEventListener('click', sendMessage);
textInput.addEventListener('keydown', e => { if(e.key==='Enter') sendMessage(); });

// Clear chat
clearBtn.addEventListener('click', () => { chatEl.innerHTML=''; addMessage("Conversation cleared. Say hi!","them"); });

// Demo
sampleBtn.addEventListener('click', () => {
  addMessage("You: Tell me a secret.", "you");
  setTimeout(()=>{ addMessage("I like holding hands with you when we walk.", "them"); speakText("I like holding hands with you when we walk."); },500);
});

// Speech synthesis
function speakText(text) {
  if (!("speechSynthesis" in window)) return;

  const utter = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();

  // Pick a female voice automatically
  const femaleVoice = voices.find(v => /female|zira|samantha/i.test(v.name));
  utter.voice = femaleVoice || voices[0]; // fallback to any voice

  utter.pitch = 1.2; // sweet/playful tone
  utter.rate = 1.0;

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// Example usage
speakText("Hi! I'm your playful AI companion.");


  animateRing();
  utter.onend = stopRing;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);



  // Apply tone presets
  switch(voicePreset){
    case 'playful': utter.pitch=1.45; utter.rate=1.05; break;
    case 'flirty': utter.pitch=1.35; utter.rate=0.98; break;
    case 'calm': utter.pitch=0.92; utter.rate=0.88; break;
    case 'sweet': utter.pitch=1.2; utter.rate=0.98; break;
    default: utter.pitch=1.05; utter.rate=1.0;
  }


// Populate voice list
function populateVoices() {
  const voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";
  voices.forEach((v, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(opt);
  });
}

// Make sure voices load on all browsers
speechSynthesis.onvoiceschanged = populateVoices;
populateVoices();


  // Load voices and pick best option
  const voices = speechSynthesis.getVoices();

  // Try to force a "female" Google voice first
  let chosen = voices.find(v => v.name.includes("Google US English Female")) 
             || voices.find(v => v.name.includes("Google UK English Female"));

  // If not found, fallback to any voice with "Female" or "Woman" in name
  if (!chosen) {
    chosen = voices.find(v => /female|woman/i.test(v.name));
  }

  // Fallback: first available voice
  utter.voice = chosen || voices[0];

  // Ring animation + speak
  animateRing();
  utter.onend = stopRing;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);


speechSynthesis.onvoiceschanged = () => {
  console.log("Available voices:");
  speechSynthesis.getVoices().forEach(v => {
    console.log(v.name, v.lang);
  });
};


// Initial message
addMessage("Hi — I'm your playful AI companion. Type or press send!", "them");
