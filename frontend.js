const BACKEND_URL = 'http://127.0.0.1:5000/chat';

const chatEl = document.getElementById('chat');
const voiceSelect = document.getElementById('voiceSelect'); // Corrected from toneSelect
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const crazySlider = document.getElementById('crazySlider');
const crazyValue = document.getElementById('crazyValue');
const clearBtn = document.getElementById('clearBtn');
const sampleBtn = document.getElementById('sampleBtn');
const speakRing = document.getElementById('speakRing');
const ringCtx = speakRing.getContext('2d');
let ringAnimationId = null;

crazyValue.textContent = crazySlider.value + '%';
crazySlider.addEventListener('input', () => {
  crazyValue.textContent = crazySlider.value + '%';
});

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

// Backend call - MODIFIED to send crazy_factor and rely on backend for persona
async function sendToBackend(text, crazy_factor){ // crazy is now crazy_factor
  try {
    const res = await fetch(BACKEND_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        prompt: text, // Send just the user's message
        crazy_factor: crazy_factor // Send the crazy factor
      })
    });
    const data = await res.json();
    if(data && data.response) return { text: data.response };
    if(data && data.error) return { text: `Server error: ${data.error}` };
    return { text: "I couldn't generate a reply." };
  } catch(e) {
    console.error("Error connecting to backend or parsing response:", e);
    return { text: "Error: could not get reply from backend." };
  }
}

async function sendMessage(){
  const text = textInput.value.trim();
  if(!text) return;
  addMessage(text, 'you');
  textInput.value = '';
  const crazy = parseInt(crazySlider.value,10); // Get crazy factor here
  addMessage("Thinking...", 'them');
  try {
    // Pass the crazy factor to the backend
    const res = await sendToBackend(text, crazy);
    addMessage(res.text, 'them');
    speakText(res.text, voiceSelect.value); // Pass voiceSelect.value for preset
  } catch(e){
    console.error("Error in sendMessage:", e);
    addMessage("Error: failed to send message.", 'them');
  }
}

sendBtn.addEventListener('click', sendMessage);
textInput.addEventListener('keydown', e => { if(e.key==='Enter') sendMessage(); });

clearBtn.addEventListener('click', () => { chatEl.innerHTML=''; addMessage("Conversation cleared. Say hi!","them"); });

sampleBtn.addEventListener('click', () => {
  addMessage("You: Tell me a secret.", "you");
  setTimeout(()=>{ addMessage("I like holding hands with you when we walk.", "them"); speakText("I like holding hands with you when we walk.", voiceSelect.value); },500);
});


function speakText(text, voicePreset){
  if(!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();

  switch(voicePreset){
    case 'playful': utter.pitch=1.45; utter.rate=1.05; break;
    case 'flirty': utter.pitch=1.35; utter.rate=0.98; break;
    case 'calm': utter.pitch=0.92; utter.rate=0.88; break;
    case 'sweet': utter.pitch=1.2; utter.rate=0.98; break;
    default: utter.pitch=1.05; utter.rate=1.0;
  }

  let chosenVoice = voices.find(v => v.name.includes("Google US English Female"))
                     || voices.find(v => v.name.includes("Google UK English Female"));

  if (!chosenVoice) {
    chosenVoice = voices.find(v => /female|woman/i.test(v.name));
  }
  utter.voice = chosenVoice || voices[0]; 

  animateRing();
  utter.onend = stopRing;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function populateVoices() {
  const voices = speechSynthesis.getVoices();
  voiceSelect.innerHTML = ""; 

  ['Default', 'Sweet', 'Playful', 'Flirty', 'Calm'].forEach(tone => {
      const opt = document.createElement("option");
      opt.value = tone.toLowerCase();
      opt.textContent = tone;
      voiceSelect.appendChild(opt);
  });

}

speechSynthesis.onvoiceschanged = populateVoices;
populateVoices();


addMessage("Hi — I'm your playfully snarky AI companion. Type or press send!", "them");