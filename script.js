

const apiKey = "c06be25864ea8bf9e85fe01e7bb31d81"; 
const currentUrl = "https://api.openweathermap.org/data/2.5/weather";
const forecastUrl = "https://api.openweathermap.org/data/2.5/forecast";
const oneCallUrl = "https://api.openweathermap.org/data/2.5/onecall";
const airPollutionUrl = "https://api.openweathermap.org/data/2.5/air_pollution";

/* ---------------- DOM ---------------- */
const body = document.body;
const searchInput = document.querySelector(".search-input");
const searchBtn = document.getElementById("searchBtn");
const voiceBtn = document.getElementById("voiceBtn");
const voiceStatus = document.getElementById("voiceStatus");
const toggleMode = document.getElementById("toggleMode");
const langSelect = document.getElementById("lang");
const offlineBanner = document.getElementById("offlineBanner");

const weatherCard = document.getElementById("weatherCard");
const weatherIcon = document.getElementById("weatherIcon");
const tempEl = document.getElementById("tempEl");
const cityEl = document.getElementById("cityEl");
const humidityEl = document.getElementById("humidityEl");
const windEl = document.getElementById("windEl");
const feelsEl = document.getElementById("feelsEl");
const sunriseEl = document.getElementById("sunriseEl");
const sunsetEl = document.getElementById("sunsetEl");
const pressureEl = document.getElementById("pressureEl");
const visibilityEl = document.getElementById("visibilityEl");
const unitToggle = document.getElementById("unitToggle");
const saveDashboard = document.getElementById("saveDashboard");
const historyDiv = document.getElementById("history");
const hourlyCanvas = document.getElementById("hourlyChart");
const dailyForecast = document.getElementById("dailyForecast");
const aqiBlock = document.getElementById("aqiBlock");
const aqiIndex = document.getElementById("aqiIndex");
const aqiStatus = document.getElementById("aqiStatus");
const aqiComponents = document.getElementById("aqiComponents");
const alertsBlock = document.getElementById("alertsBlock");

const dashboardList = document.getElementById("dashboardList");
const assistantInput = document.getElementById("assistantInput");
const assistantBtn = document.getElementById("assistantBtn");
const assistantResponse = document.getElementById("assistantResponse");
const speakSummary = document.getElementById("speakSummary");

/* ---------------- state ---------------- */
let currentTempC = null;
let currentWindKmh = null;
let isCelsius = true;
let searchHistory = JSON.parse(localStorage.getItem("weatherHistory")) || [];
let dashboardCities = JSON.parse(localStorage.getItem("dashboardCities")) || [];
let hourlyChart = null;
let manualTheme = false;
let currentIsDaytime = true;

/* multilingual config (short) */
const LANG_CONFIG = {
  en: { ow: "en", sr: "en-US", tts: "en-US" },
  bn: { ow: "bn", sr: "bn-BD", tts: "bn-BD" },
  hi: { ow: "hi", sr: "hi-IN", tts: "hi-IN" }
};
const ASSISTANT_TEMPLATES = {
  temp: { en: "Current temperature is {temp}.", bn: "বর্তমান তাপমাত্রা {temp}.", hi: "वर्तमान तापमान {temp}." },
  feels: { en: "Feels like {feels}.", bn: "অনুভূত হচ্ছে {feels}.", hi: "अनुभव हो रहा है {feels}." },
  humidity: { en: "Humidity is {humidity}.", bn: "আর্দ্রতা {humidity}.", hi: "नमी {humidity}." },
  wind: { en: "Wind speed is {wind}.", bn: "বাতাসের গতি {wind}.", hi: "हवा की गति {wind}." },
  rain: { en: "Condition: {desc}. You might need an umbrella.", bn: "অবস্থা: {desc}. হয়তো ছাতা লাগতে পারে।", hi: "स्थिति: {desc}. आपको छाता चाहिए हो सकता है।" },
  sunrise: { en: "Sunrise at {time}.", bn: "সূর্যোদয় {time}.", hi: "सूर्योदय {time}." },
  sunset: { en: "Sunset at {time}.", bn: "সূর্যাস্ত {time}.", hi: "सूर्यास्त {time}." },
  unknown: { en: "Sorry, I couldn't understand. Try asking about temperature, rain, humidity, or wind.", bn: "দুঃখিত, বুঝতে পারিনি। তাপমাত্রা, বৃষ্টি, আর্দ্রতা বা বাতাস সম্পর্কে জিজ্ঞেস করো।", hi: "क्षमा करें, समझ नहीं पाया। तापमान, बारिश, नमी या हवा के बारे में पूछें।" }
};
function tmpl(s, vars){ return s.replace(/\{(\w+)\}/g,(m,k)=> vars[k]!==undefined?vars[k]:'--'); }
function getLang(){ return localStorage.getItem('preferredLang') || (langSelect.value || 'en'); }
function setLang(l){ if(!(l in LANG_CONFIG)) l='en'; localStorage.setItem('preferredLang', l); langSelect.value = l; applyUiLang(l); configureSpeech(l); configureTTS(l); }
function applyUiLang(l){
  const mp = { en:{search:"Enter city name", assistant:"Ask me about the weather..."}, bn:{search:"শহরের নাম লিখো", assistant:"আবহাওয়ার বিষয়ে জিজ্ঞেস করো..."}, hi:{search:"शहर का नाम दर्ज करें", assistant:"मौसम के बारे में पूछें..."} };
  const t = mp[l] || mp.en;
  searchInput.placeholder = t.search;
  assistantInput.placeholder = t.assistant;
}

/* THEME */
body.classList.add('light');
toggleMode.addEventListener('click', ()=>{
  manualTheme = true;
  if(body.classList.contains('light')){ body.classList.replace('light','dark'); toggleMode.textContent = '☀️ Light'; }
  else { body.classList.replace('dark','light'); toggleMode.textContent = '🌙 Dark'; }
});

/* UTILS */
function fmtTime(unix, tz){ const d = new Date((unix + (tz||0))*1000); const hh=String(d.getUTCHours()).padStart(2,'0'), mm=String(d.getUTCMinutes()).padStart(2,'0'); return `${hh}:${mm}`; }
function mapToIcon(main){
  const m=(main||'').toLowerCase();
  if(m.includes('cloud')) return 'https://api.iconify.design/wi-cloud.svg?color=%23007bff';
  if(m.includes('rain')) return 'https://api.iconify.design/wi-rain.svg?color=%23007bff';
  if(m.includes('drizzle')) return 'https://api.iconify.design/wi-sprinkle.svg?color=%23007bff';
  if(m.includes('snow')) return 'https://api.iconify.design/wi-snow.svg?color=%23007bff';
  if(m.includes('mist')||m.includes('fog')) return 'https://api.iconify.design/wi-fog.svg?color=%23007bff';
  if(m.includes('clear')) return 'https://api.iconify.design/wi-day-sunny.svg?color=%23ffd000';
  return 'https://api.iconify.design/wi-cloud.svg?color=%23007bff';
}

/* HISTORY & DASHBOARD */
function renderHistory(){ historyDiv.innerHTML = ''; searchHistory.slice().reverse().forEach(city=>{ const btn=document.createElement('button'); btn.textContent=city; btn.addEventListener('click', ()=> fetchAllForCity(city)); historyDiv.appendChild(btn); }); }
function saveHistoryFn(city){ if(!city) return; if(!searchHistory.includes(city)){ searchHistory.push(city); localStorage.setItem('weatherHistory', JSON.stringify(searchHistory)); renderHistory(); } }
function renderDashboard(){ dashboardList.innerHTML=''; if(!dashboardCities.length){ dashboardList.innerHTML='<div style="opacity:.6">No saved cities</div>'; return; } dashboardCities.forEach(async entry=>{ const card=document.createElement('div'); card.className='dashboard-card'; card.innerHTML=`<div style="font-weight:700">${entry.name}</div><div class="small-muted">loading...</div><div style="height:6px"></div>`; dashboardList.appendChild(card); try{ const res = await fetch(`${currentUrl}?lat=${entry.lat}&lon=${entry.lon}&units=metric&appid=${apiKey}`); if(res.ok){ const d = await res.json(); const t = isCelsius?Math.round(d.main.temp)+'°C':Math.round((d.main.temp*9/5)+32)+'°F'; card.querySelector('.small-muted').textContent = t; card.addEventListener('click', ()=> fetchAllForCity(entry.name)); } else card.querySelector('.small-muted').textContent = '—'; }catch(e){ card.querySelector('.small-muted').textContent='—'; } }); }

/* CHART */
function drawHourlyChart(labels, temps, unitLabel){
  if(hourlyChart) hourlyChart.destroy();
  const ctx = hourlyCanvas.getContext('2d');
  hourlyChart = new Chart(ctx, { type:'line', data:{labels, datasets:[{label:`Temp (${unitLabel})`,data:temps,fill:false,tension:0.2,pointRadius:3,borderWidth:2}]}, options:{responsive:true,scales:{x:{ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:10}},y:{beginAtZero:false}}}});
}

/* AQI & ALERTS */
function aqiLabel(i){ switch(i){case 1:return{l:'Good',c:'#2ecc71'};case 2:return{l:'Fair',c:'#f1c40f'};case 3:return{l:'Moderate',c:'#e67e22'};case 4:return{l:'Poor',c:'#e74c3c'};case 5:return{l:'Very Poor',c:'#8e44ad'};default:return{l:'Unknown',c:'#999'}}}
async function fetchAQI(lat, lon){ try{ const res = await fetch(`${airPollutionUrl}?lat=${lat}&lon=${lon}&appid=${apiKey}`); if(!res.ok) throw new Error('no aqi'); const j = await res.json(); const obj = j.list && j.list[0]; if(!obj) throw new Error('no list'); const idx = obj.main.aqi; const lab = aqiLabel(idx); aqiIndex.textContent = idx; aqiStatus.textContent = lab.l; aqiStatus.style.color = lab.c; aqiComponents.innerHTML = ''; Object.entries(obj.components).forEach(([k,v])=>{ const el = document.createElement('div'); el.style.padding='6px 8px'; el.style.background='rgba(0,0,0,0.04)'; el.style.borderRadius='8px'; el.style.fontSize='13px'; el.textContent = `${k}: ${Number(v).toFixed(2)}`; aqiComponents.appendChild(el); }); aqiBlock.style.display = 'block'; }catch(e){ aqiBlock.style.display = 'none' } }
async function fetchAlerts(lat, lon){ try{ const res = await fetch(`${oneCallUrl}?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily&appid=${apiKey}`); if(!res.ok) throw new Error('no onecall'); const j = await res.json(); const alerts = j.alerts||[]; if(!alerts.length){ alertsBlock.style.display='none'; return; } alertsBlock.style.display='block'; alertsBlock.innerHTML=''; alerts.forEach(a=>{ const div = document.createElement('div'); div.style.padding='8px'; div.style.borderRadius='8px'; div.style.marginBottom='8px'; div.style.background='rgba(255,240,240,0.9)'; div.innerHTML=`<strong>${a.event}</strong><div style="font-size:13px">${a.description||''}</div>`; alertsBlock.appendChild(div); if("Notification" in window && Notification.permission === "granted"){ new Notification(`Weather Alert: ${a.event}`, {body: a.description||''}); } else if("Notification" in window && Notification.permission !== "denied"){ Notification.requestPermission(); } }); }catch(e){ alertsBlock.style.display='none' } }

/* FORECAST PROCESS */
async function fetchForecastForCoords(lat, lon){ const url = `${forecastUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`; const r = await fetch(url); if(!r.ok) throw new Error('forecast fail'); return await r.json(); }
function processHourly(forecastData, tz){ const list = forecastData.list.slice(0,8); const labels = [], temps = []; list.forEach(it=>{ const local = new Date((it.dt + (tz||0))*1000); labels.push(String(local.getUTCHours()).padStart(2,'0')+':'+String(local.getUTCMinutes()).padStart(2,'0')); temps.push(Math.round(it.main.temp*10)/10); }); return {labels,temps}; }
function processDaily(forecastData, tz){ const grouped={}; forecastData.list.forEach(it=>{ const local = new Date((it.dt + (tz||0))*1000); const key = local.toISOString().slice(0,10); if(!grouped[key]) grouped[key]=[]; grouped[key].push(it); }); const keys = Object.keys(grouped).sort().slice(0,5); return keys.map(k=>{ const items=grouped[k]; let min=Infinity,max=-Infinity,mainAcc={}; items.forEach(it=>{ min=Math.min(min,it.main.temp_min); max=Math.max(max,it.main.temp_max); const m=it.weather[0].main; mainAcc[m]=(mainAcc[m]||0)+1; }); const fav = Object.keys(mainAcc).reduce((a,b)=> mainAcc[a]>=mainAcc[b]?a:b ); const sample = new Date((items[0].dt + (forecastData.city.timezone||0))*1000); const dayLabel = sample.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}); return {dayLabel,min:Math.round(min),max:Math.round(max),icon:mapToIcon(fav)} }); }

/* MAIN FETCH */
async function fetchAllForCity(city){
  if(!city) return;
  offlineBanner.style.display = navigator.onLine ? 'none':'block';
  try{
    const curRes = await fetch(`${currentUrl}?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}&lang=${LANG_CONFIG[getLang()]?.ow||'en'}`);
    if(!curRes.ok){
      if(!navigator.onLine){
        const cached = JSON.parse(localStorage.getItem(`cached_${city}`) || 'null');
        if(cached){ applyCached(cached); return; }
      }
      alert('City not found or API error'); weatherCard.style.display='none'; return;
    }
    const data = await curRes.json();
    weatherCard.style.display='block';
    const name = data.name + (data.sys && data.sys.country ? `, ${data.sys.country}` : '');
    cityEl.textContent = name;
    currentTempC = data.main.temp; currentWindKmh = data.wind.speed;
    tempEl.textContent = Math.round(currentTempC) + '°C';
    humidityEl.textContent = data.main.humidity + '%';
    windEl.textContent = data.wind.speed + ' km/h';
    feelsEl.textContent = Math.round(data.main.feels_like) + '°C';
    pressureEl.textContent = data.main.pressure + ' hPa';
    visibilityEl.textContent = (data.visibility/1000) + ' km';
    sunriseEl.textContent = fmtTime(data.sys.sunrise, data.timezone);
    sunsetEl.textContent = fmtTime(data.sys.sunset, data.timezone);
    weatherIcon.src = mapToIcon(data.weather[0].main);
    weatherIcon.alt = data.weather[0].description || data.weather[0].main;
    const now = Date.now();
    const isDay = now >= (data.sys.sunrise*1000) && now < (data.sys.sunset*1000);
    if(!manualTheme){ body.classList.remove('light','dark'); body.classList.add(isDay ? 'light':'dark'); }
    currentIsDaytime = isDay;
    localStorage.setItem(`cached_${data.name}`, JSON.stringify({type:'city',ts:Date.now(),data}));
    localStorage.setItem('lastCachedCity', data.name);
    saveHistoryFn(data.name);
    await fetchAQI(data.coord.lat, data.coord.lon);
    await fetchAlerts(data.coord.lat, data.coord.lon);
    const forecast = await fetchForecastForCoords(data.coord.lat, data.coord.lon);
    const tz = forecast.city.timezone || data.timezone || 0;
    const hourly = processHourly(forecast, tz);
    const unitLabel = isCelsius?'°C':'°F';
    const tempsForChart = isCelsius?hourly.temps:hourly.temps.map(t=>Math.round((t*9/5)+32));
    drawHourlyChart(hourly.labels, tempsForChart, unitLabel);
    const days = processDaily(forecast, tz);
    dailyForecast.innerHTML='';
    days.forEach(d=>{ const el=document.createElement('div'); el.className='daily-card'; el.innerHTML=`<img src="${d.icon}" style="width:48px"><div style="font-weight:700">${d.dayLabel}</div><div>${d.max}° / ${d.min}°</div>`; dailyForecast.appendChild(el); });
    saveDashboard.dataset.name = data.name; saveDashboard.dataset.lat = data.coord.lat; saveDashboard.dataset.lon = data.coord.lon;
    renderHistory(); renderDashboard();
  }catch(e){
    console.error(e);
    if(!navigator.onLine){
      offlineBanner.style.display='block';
      const last = localStorage.getItem('lastCachedCity');
      if(last){ const cached = JSON.parse(localStorage.getItem(`cached_${last}`)||'null'); if(cached){ applyCached(cached); return; } }
    }
    alert('Error fetching weather'); weatherCard.style.display='none';
  }
}

function applyCached(obj){ try{ const data = obj.data; weatherCard.style.display='block'; cityEl.textContent = data.name; currentTempC = data.main.temp; tempEl.textContent = Math.round(currentTempC)+'°C'; humidityEl.textContent = data.main.humidity + '%'; windEl.textContent = data.wind.speed + ' km/h'; feelsEl.textContent = Math.round(data.main.feels_like) + '°C'; pressureEl.textContent = data.main.pressure + ' hPa'; visibilityEl.textContent = (data.visibility/1000)+' km'; sunriseEl.textContent = fmtTime(data.sys.sunrise, data.timezone); sunsetEl.textContent = fmtTime(data.sys.sunset, data.timezone); weatherIcon.src = mapToIcon(data.weather[0].main); weatherIcon.alt = data.weather[0].description || data.weather[0].main; }catch(e){ console.warn('cache apply fail', e) } }

/* UNITS & SAVE */
unitToggle.addEventListener('click', ()=>{ isCelsius = !isCelsius; unitToggle.textContent = isCelsius ? 'Switch to °F':'Switch to °C'; updateUnits(); });
function updateUnits(){ if(currentTempC==null) return; if(isCelsius){ tempEl.textContent = Math.round(currentTempC)+'°C'; windEl.textContent = currentWindKmh+' km/h'; } else { tempEl.textContent = Math.round((currentTempC*9/5)+32)+'°F'; windEl.textContent = (currentWindKmh/1.609).toFixed(1)+' mph'; } if(hourlyChart && searchHistory.length){ setTimeout(()=>{ const last = searchHistory[searchHistory.length-1]; if(last) fetchAllForCity(last); },200); } }

saveDashboard.addEventListener('click', ()=>{ const name = saveDashboard.dataset.name; const lat = parseFloat(saveDashboard.dataset.lat); const lon = parseFloat(saveDashboard.dataset.lon); if(!name||!lat||!lon) return alert('No city loaded'); if(!dashboardCities.some(c=>c.name===name && c.lat===lat && c.lon===lon)){ dashboardCities.push({name,lat,lon}); localStorage.setItem('dashboardCities', JSON.stringify(dashboardCities)); renderDashboard(); alert(`${name} saved`); } else alert(`${name} already saved`); });

/* SEARCH handlers */
searchBtn.addEventListener('click', ()=> fetchAllForCity(searchInput.value.trim()));
searchInput.addEventListener('keyup', (e)=> { if(e.key==='Enter') fetchAllForCity(searchInput.value.trim()); });

/* VOICE (Web Speech API) */
let recognition = null;
let recognizing = false;
function configureSpeech(lang){
  const cfg = LANG_CONFIG[lang] || LANG_CONFIG.en;
  if(window.SpeechRecognition || window.webkitSpeechRecognition){
    try{
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SR();
      recognition.lang = cfg.sr;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = ()=>{ recognizing = true; voiceStatus.textContent='listening...'; voiceBtn.textContent='⏹'; };
      recognition.onend = ()=>{ recognizing = false; voiceStatus.textContent='idle'; voiceBtn.textContent='🎤'; };
      recognition.onerror = (e)=>{ console.warn(e); voiceStatus.textContent='error'; recognizing=false; voiceBtn.textContent='🎤'; };
      recognition.onresult = (evt)=>{ const text = evt.results[0][0].transcript; searchInput.value = text; fetchAllForCity(text); };
    }catch(e){ console.warn('speech setup', e); }
  } else { voiceBtn.disabled=true; voiceStatus.textContent='voice unsupported'; }
}
voiceBtn.addEventListener('click', ()=>{ const lang = getLang(); if(!recognition) configureSpeech(lang); if(!recognition) return alert('Voice not supported in this browser'); if(recognizing){ recognition.stop(); } else { recognition.start(); } });

/* TTS */
let selectedTtsVoice = null;
function configureTTS(lang){
  const cfg = LANG_CONFIG[lang] || LANG_CONFIG.en;
  selectedTtsVoice = null;
  const synth = window.speechSynthesis;
  const setVoice = ()=>{ const vs = synth.getVoices(); if(!vs || !vs.length) return; selectedTtsVoice = vs.find(v=>v.lang && v.lang.startsWith(cfg.tts.split('-')[0])) || vs[0]; };
  setVoice(); window.speechSynthesis.onvoiceschanged = setVoice;
}
function speakText(text, lang){ if(!('speechSynthesis' in window)) return; const synth = window.speechSynthesis; const u = new SpeechSynthesisUtterance(text); u.lang = (LANG_CONFIG[lang]||LANG_CONFIG.en).tts; if(selectedTtsVoice) u.voice = selectedTtsVoice; synth.cancel(); synth.speak(u); }

/* ASSISTANT */
function assistantAnswerFromQuery(q, lang){ q = (q||'').toLowerCase(); const temp = tempEl.textContent || '--'; const feels = feelsEl.textContent || '--'; const humidity = humidityEl.textContent || '--'; const wind = windEl.textContent || '--'; const sunrise = sunriseEl.textContent || '--'; const sunset = sunsetEl.textContent || '--'; let key='unknown', vars={}; if(/temp|temperature|hot|cold|তাপ|গরম|ठंड|तापमान/.test(q)){ key='temp'; vars.temp=temp; } else if(/feels|feels like|অনুভূত|अनुभव/.test(q)){ key='feels'; vars.feels=feels; } else if(/rain|umbrella|বৃষ্টি|बारिश/.test(q)){ key='rain'; vars.desc = weatherIcon.alt || ''; } else if(/humidity|আর্দ্র|नमी/.test(q)){ key='humidity'; vars.humidity=humidity; } else if(/wind|বাতাস|हवा/.test(q)){ key='wind'; vars.wind=wind; } else if(/sunrise|সূর্যোদয়|सूर्योदय/.test(q)){ key='sunrise'; vars.time=sunrise; } else if(/sunset|সূর্যাস্ত|सूर्यास्त/.test(q)){ key='sunset'; vars.time=sunset; } const tpl = ASSISTANT_TEMPLATES[key] ? (ASSISTANT_TEMPLATES[key][lang] || ASSISTANT_TEMPLATES[key].en) : ASSISTANT_TEMPLATES.unknown[lang]; return tmpl(tpl, vars); }
assistantBtn.addEventListener('click', ()=>{ const q = assistantInput.value.trim(); const l = getLang(); const ans = q? assistantAnswerFromQuery(q,l) : assistantAnswerFromQuery('temperature', l); assistantResponse.textContent = ans; speakText(ans, l); });
speakSummary.addEventListener('click', ()=>{ const l = getLang(); const s = assistantAnswerFromQuery('temperature', l) + ' ' + assistantAnswerFromQuery('feels', l); speakText(s, l); });

/* MAP */
let map = null;
function initMap(){
  try{
    map = L.map('map').setView([20.5937,78.9629],4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);
    map.on('click', async e=>{
      const lat = e.latlng.lat, lon = e.latlng.lng;
      try{ const r = await fetch(`${currentUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`); if(!r.ok) return; const d = await r.json(); L.marker([lat,lon]).addTo(map).bindPopup(`${d.name}<br>${Math.round(d.main.temp)}°C`).openPopup(); fetchAllForCity(d.name); }catch(e){ console.warn(e); }
    });
    const ctl = L.control({position:'topleft'});
    ctl.onAdd = function(){ const el = L.DomUtil.create('div','leaflet-bar'); el.style.background='#fff'; el.style.padding='6px'; el.style.cursor='pointer'; el.innerHTML='📍'; el.onclick = ()=> map.locate({setView:true,maxZoom:12}); return el; };
    ctl.addTo(map);
    map.on('locationfound', e=>{ L.marker([e.latlng.lat,e.latlng.lng]).addTo(map).bindPopup('You are here').openPopup(); });
  }catch(e){ console.warn('map init fail', e) }
}

/* SERVICE WORKER registration (separate file) */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(()=>console.log('SW registered')).catch(e=>console.warn('SW reg failed',e));
}
window.addEventListener('online', ()=> offlineBanner.style.display='none');
window.addEventListener('offline', ()=> offlineBanner.style.display='block');

/* Language init */
(function initLang(){ const saved = localStorage.getItem('preferredLang') || 'en'; if(!Object.keys(LANG_CONFIG).includes(saved)) localStorage.setItem('preferredLang','en'); langSelect.value = saved; applyUiLang(saved); configureSpeech(saved); configureTTS(saved); langSelect.addEventListener('change', ()=>{ setLang(langSelect.value); }); })();

/* initial render & geolocation */
renderHistory(); renderDashboard(); initMap();
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(async pos=>{ const lat=pos.coords.latitude, lon=pos.coords.longitude; try{ const r = await fetch(`${currentUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`); if(r.ok){ const d=await r.json(); fetchAllForCity(d.name); if(map) map.setView([lat,lon],9); } }catch(e){} }, ()=>{} );
}

/* expose for debugging */
window.fetchAllForCity = fetchAllForCity;

/* helper setLang needed earlier */
function setLang(l){ localStorage.setItem('preferredLang', l); langSelect.value = l; applyUiLang(l); configureSpeech(l); configureTTS(l); }
function getLang(){ return localStorage.getItem('preferredLang') || (langSelect.value || 'en'); }
