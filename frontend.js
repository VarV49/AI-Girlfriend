const chatEl = document.getElementById('chat');
const textInput = document.getElementById('textInput');
const sendBtn = document.getElementById('sendBtn');
const crazySlider = document.getElementById('crazySlider');
const crazyValue = document.getElementById('crazyValue');
const voiceSelect = document.getElementById('voiceSelect');
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
    t += 0.05;
    drawRing(Math.abs(Math.sin(t))*10);
    ringAnimationId = requestAnimationFrame(loop);
  }
  loop();
}

function stopRing(){
  if(ringAnimationId) cancelAnimationFrame(ringAnimationId);
  ringCtx.clearRect(0,0,speakRing.width,speakRing.height);
}

// Gemini API call
async function sendToBackend(text, voice='default', crazy=50){
  try {
    const prompt = `User: ${text}\nAI (crazy factor ${crazy}):`;
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer AIzaSyBmpxLZOW7UD6LxcPvf4Lkb_mzqAXhaz0A' // secure on server
      },
      body: JSON.stringify({
        prompt:{ text: prompt },
        temperature: crazy/100,
        candidateCount:1
      })
    });
    const data = await res.json();
    return { text: data.candidates?.[0]?.content?.[0]?.text || "I couldn't generate a reply." };
  } catch(e) {
    console.error(e);
    return { text: "Error: could not get reply from Gemini." };
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
function speakText(text, voicePreset){
  if(!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  switch(voicePreset){
    case 'playful': utter.pitch=1.45; utter.rate=1.05; break;
    case 'flirty': utter.pitch=1.35; utter.rate=0.98; break;
    case 'calm': utter.pitch=0.92; utter.rate=0.88; break;
    case 'sweet': utter.pitch=1.2; utter.rate=0.98; break;
    default: utter.pitch=1.05; utter.rate=1.0;
  }
  const voices = speechSynthesis.getVoices();
  utter.voice = voices.find(v => /female|woman/i.test(v.name)) || voices[0];
  animateRing();
  utter.onend = stopRing;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// Initial message
addMessage("Hi — I'm your playful AI companion. Type or press send!", "them");
