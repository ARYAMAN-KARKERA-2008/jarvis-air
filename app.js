const $ = id => document.getElementById(id);
const API = 'https://jarvis-ai-backend-18h4.onrender.com';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null, audio = null, history = [], busy = false;
function status(s){$('status').textContent=s;}
function show(who,s){$('log').textContent=who+': '+s;}
async function request(path,body){
 const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),60000);
 try {const res=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
 if(!res.ok){let msg='HTTP '+res.status;try{const j=await res.json();msg=j.error||msg;}catch{}throw Error(msg);}return res;
 }finally{clearTimeout(timer);}
}
async function speak(text){
 status('GENERATING AI VOICE...');
 const response=await request('/speak',{text});
 const blob=await response.blob();
 if(audio){audio.pause();URL.revokeObjectURL(audio.src);}
 const url=URL.createObjectURL(blob);
 audio=new Audio(url);
 audio.onended=()=>{status('SYSTEM READY');URL.revokeObjectURL(url);};
 audio.onerror=()=>{status('AUDIO PLAYBACK ERROR');URL.revokeObjectURL(url);};
 await audio.play();status('JARVIS SPEAKING');
}
async function handle(message){
 if(busy)return;
 message=message.trim();if(!message)return;
 busy=true;$('send').disabled=true;$('talk').disabled=true;
 show('YOU',message);status('JARVIS THINKING...');
 try{
  const res=await request('/chat',{message,history});const data=await res.json();
  if(!data.reply)throw Error('No AI reply received');
  history.push({role:'user',content:message},{role:'assistant',content:data.reply});history=history.slice(-8);
  show('JARVIS',data.reply);
  try{await speak(data.reply);}catch(e){status('VOICE FAILED: '+e.message);}
 }catch(e){status('AI ERROR: '+e.message);show('ERROR',e.message+' — Check backend logs, CORS, billing, and API key.');}
 finally{busy=false;$('send').disabled=false;$('talk').disabled=false;}
}
$('send').onclick=()=>{const v=$('typed').value;$('typed').value='';handle(v);};
$('typed').addEventListener('keydown',e=>{if(e.key==='Enter')$('send').click();});
$('testSpeaker').onclick=async()=>{try{await speak('Hello. I am Jarvis. My AI voice is online.');}catch(e){status('VOICE FAILED: '+e.message);show('ERROR',e.message);}};
$('talk').onclick=()=>{
 if(!SR){status('SPEECH RECOGNITION UNSUPPORTED');return;}
 if(recognition)return;
 recognition=new SR();recognition.lang='en-IN';recognition.continuous=false;recognition.interimResults=false;
 recognition.onstart=()=>status('LISTENING...');
 recognition.onresult=e=>handle(e.results[0][0].transcript);
 recognition.onerror=e=>status('MIC ERROR: '+e.error);
 recognition.onend=()=>{recognition=null;if(!busy)status('SYSTEM READY');};
 try{recognition.start();}catch(e){recognition=null;status('MIC ERROR: '+e.message);}
};
$('stop').onclick=()=>{recognition?.stop();if(audio){audio.pause();}status('STOPPED');};
