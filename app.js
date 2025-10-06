// =============== Portfolio (plain UI) ===============
let theme = localStorage.getItem('theme') || 'dark';
let projects = [];

document.documentElement.setAttribute('data-theme', theme);

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSmoothScroll();
  initHeroStarfield();  // falling stars, hero only

  initName();
  setTimeout(runSlot, 400);

  initProjects();
  bindFilters();
  bindCompactToggle();
  bindTilt();
  bindScrollUI();
  bindForm();
});

/* Theme */
function initTheme(){
  const btn = document.getElementById('theme-toggle');
  const icon = btn.querySelector('i');
  const setIcon = () => icon.className = theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  setIcon();
  btn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    setIcon();
  });
}

/* Smooth scroll */
function initSmoothScroll(){
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-scroll]');
    if(!t) return;
    e.preventDefault();
    const el = document.querySelector(t.getAttribute('data-scroll'));
    if(el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  });
}

/* Falling starfield (hero only; small-window safe) */
function initHeroStarfield(){
  const canvas = document.getElementById('starfield');
  const hero   = document.getElementById('hero');
  if (!canvas || !hero) return;

  const ctx = canvas.getContext('2d', { alpha: true });

  let DPR = dpr(), W = 0, H = 0, last = performance.now();
  let layers = [];
  const BASE = [
    { depth: 0.35, density: 0.0006, size: [0.6, 1.1], speed: [24, 42] },
    { depth: 0.70, density: 0.0008, size: [0.8, 1.6], speed: [40, 78] },
    { depth: 1.00, density: 0.0010, size: [1.0, 2.0], speed: [72, 120] },
  ];

  function dpr(){ return Math.max(1, Math.min(2, window.devicePixelRatio || 1)); }

  function sizeCanvas(){
    DPR = dpr();
    const r = hero.getBoundingClientRect();
    const cssW = Math.max(1, r.width);
    const cssH = Math.max(1, r.height);
    canvas.style.width = cssW+'px';
    canvas.style.height = cssH+'px';
    canvas.width = Math.floor(cssW*DPR);
    canvas.height = Math.floor(cssH*DPR);
    W = canvas.width; H = canvas.height;

    const scale = Math.max(0.55, Math.min(1, cssW/500));
    layers = BASE.map(L => {
      const count = Math.max(16, Math.floor(W*H*(L.density*scale)/DPR));
      const minR = L.size[0]*DPR*scale, maxR = L.size[1]*DPR*scale;
      const minV = L.speed[0]*DPR*scale, maxV = L.speed[1]*DPR*scale;
      const arr = new Array(count).fill(0).map(() => ({
        x: Math.random()*W,
        y: Math.random()*H,
        r: Math.max(0.5*DPR, Math.random()*(maxR-minR)+minR),
        vy: Math.random()*(maxV-minV)+minV,
        a: Math.random()*0.5 + 0.35
      }));
      return { conf:L, arr, scale };
    });
  }

  function draw(now){
    const dt = Math.min(0.05, (now-last)/1000); last = now;
    ctx.clearRect(0,0,W,H);

    for(const layer of layers){
      const {conf, arr, scale} = layer;
      const tail = (conf.depth > 0.95) ? (6*DPR*scale) : 0;
      for(const s of arr){
        s.y += s.vy*dt;
        if(s.y > H + s.r){ s.y = -s.r; s.x = Math.random()*W; }

        if(tail){
          ctx.strokeStyle = (theme==='light') ? `rgba(26,26,46,${s.a*0.25})` : `rgba(255,255,255,${s.a*0.55})`;
          ctx.lineWidth = Math.max(1, s.r*0.6);
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - tail); ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = (theme==='light') ? `rgba(26,26,46,${s.a*0.35})` : `rgba(255,255,255,${s.a})`;
        ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(sizeCanvas);
  ro.observe(hero);
  window.addEventListener('resize', sizeCanvas);
  setInterval(()=>{ const cur = dpr(); if(Math.abs(cur - DPR)>0.01) sizeCanvas(); }, 1200);

  sizeCanvas();
  requestAnimationFrame(draw);
}

/* Name animation */
function initName(){
  const spans = document.querySelectorAll('.animated-name span:not(.space)');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
  spans.forEach(sp => sp.textContent = chars[Math.floor(Math.random()*chars.length)]);
  window._nameSpans = spans; window._randChars = chars;
}
function runSlot(){
  const spans = window._nameSpans || [], chars = window._randChars || '';
  spans.forEach((span, i) => {
    const final = span.getAttribute('data-char');
    setTimeout(() => {
      let c = 0, max = 10 + Math.random()*6;
      const iv = setInterval(() => {
        if(c < max){ span.textContent = chars[Math.floor(Math.random()*chars.length)]; c++; }
        else { span.textContent = final; clearInterval(iv); }
      }, 45);
    }, i*90);
  });
}

/* Projects */
function initProjects(){
  projects = [
    {id:1,  category:"ue5",   icon:"🪃", title:"Boomerang Loop Combat", description:"Unreal Engine action with boomerang movement and timing.", tags:["Unreal Engine","Blueprints","C++","Game Jam"], links:[{text:"Play",url:"#"}, {text:"Devlog",url:"#"}]},
    {id:2,  category:"ue5",   icon:"🪟", title:"Breakable Glass System", description:"Glass fractures at the hit point with physics shards.", tags:["Unreal Engine","Physics","Blueprints"], links:[{text:"Demo",url:"#"}, {text:"GitHub",url:"#"}]},
    {id:3,  category:"ue5",   icon:"🏃‍♂️", title:"Physics Parkour", description:"Climb and move with momentum using physics constraints.", tags:["Unreal Engine","Physics","Gameplay"], links:[{text:"Demo",url:"#"}, {text:"Source",url:"#"}]},
    {id:4,  category:"web",   icon:"📋", title:"Tacky — Task Manager", description:"Boards, lists, and cards with a simple Python backend.", tags:["Python","HTML","CSS","JS"], links:[{text:"Preview",url:"#"}, {text:"Backend",url:"#"}]},
    {id:5,  category:"web",   icon:"📚", title:"Book Manager", description:"Desktop and web tool for catalog and search.", tags:["Python","SQLite","Electron"], links:[{text:"Download",url:"#"}, {text:"Docs",url:"#"}]},
    {id:6,  category:"iot",   icon:"📡", title:"ESP32 GPS Tracker", description:"Sends position over Wi-Fi with a small API.", tags:["ESP32","GPS","IoT","C++"], links:[{text:"Hardware",url:"#"}, {text:"API",url:"#"}]},
    {id:7,  category:"linux", icon:"💾", title:"DIY NAS", description:"RPi/x86 NAS with backups and remote access.", tags:["Linux","Raspberry Pi","Samba"], links:[{text:"Guide",url:"#"}, {text:"Config",url:"#"}]},
    {id:8,  category:"web",   icon:"🚢", title:"Battleship Online", description:"Multiplayer with lobby and turn sync.", tags:["Python","Sockets"], links:[{text:"Play",url:"#"}, {text:"GitHub",url:"#"}]},
    {id:9,  category:"iot",   icon:"🔘", title:"Wi-Fi Button", description:"Triggers webhooks or MQTT.", tags:["ESP8266","Automation"], links:[{text:"Demo",url:"#"}, {text:"Hardware",url:"#"}]},
    {id:10, category:"ai-ml", icon:"🌦️", title:"Weather App", description:"Fetches current data and forecast.", tags:["Python","API","GUI"], links:[{text:"Download",url:"#"}, {text:"GitHub",url:"#"}]},
    {id:11, category:"ai-ml", icon:"🤖", title:"Local Chatbot", description:"Runs models with Ollama for local use.", tags:["Ollama","Python"], links:[{text:"Setup",url:"#"}, {text:"Demo",url:"#"}]},
    {id:12, category:"ai-ml", icon:"🎬", title:"Movie Genre Classifier", description:"Predicts genre from a plot summary.", tags:["Python","NLP","TF-IDF"], links:[{text:"Notebook",url:"#"}, {text:"Dataset",url:"#"}]},
    {id:13, category:"ai-ml", icon:"💳", title:"Fraud Detection", description:"Binary classifier with class imbalance fixes.", tags:["Python","sklearn"], links:[{text:"Notebook",url:"#"}, {text:"Dataset",url:"#"}]},
    {id:14, category:"ai-ml", icon:"✉️", title:"Spam SMS", description:"TF-IDF with NB/SVM.", tags:["Python","NLP"], links:[{text:"Notebook",url:"#"}, {text:"Dataset",url:"#"}]},
    {id:15, category:"web",   icon:"🛍️", title:"Shop UI Demo", description:"Clean product list and flow.", tags:["React","Design"], links:[{text:"Demo",url:"#"}, {text:"Design",url:"#"}]},
    {id:16, category:"ai-ml", icon:"🧠", title:"NN Visualizer", description:"Inspect layers and activations.", tags:["JS","D3","WebGL"], links:[{text:"Live",url:"#"}, {text:"Source",url:"#"}]},
    {id:17, category:"web",   icon:"🌐", title:"3D Portfolio", description:"Three.js site with simple controls.", tags:["Three.js","WebGL"], links:[{text:"Visit",url:"#"}, {text:"Code",url:"#"}]}
  ];
  renderProjects('all');
}

function renderProjects(filter){
  const grid = document.getElementById('projects-grid');
  const list = filter === 'all' ? projects : projects.filter(p => p.category === filter);
  grid.innerHTML = list.map(p => `
    <article class="card project" data-category="${p.category}" tabindex="0">
      <div class="thumb" aria-label="${p.title} icon">${p.icon}</div>
      <div class="body">
        <h3>${p.title}</h3>
        <p>${p.description}</p>
        <div class="tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="links">
          ${p.links.map(l=>`<a class="link" href="${l.url}" target="_blank" rel="noopener">${l.text}</a>`).join('')}
        </div>
      </div>
    </article>
  `).join('');
  bindTilt(); // rebind after render
}

/* Filters / Compact */
function bindFilters(){
  document.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.getAttribute('data-filter'));
    });
  });
}
function bindCompactToggle(){
  const t = document.getElementById('compact-toggle');
  const grid = document.getElementById('projects-grid');
  t.addEventListener('change', ()=> grid.classList.toggle('compact', t.checked));
}

/* Tilt */
function bindTilt(){
  document.querySelectorAll('.project').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const rx = ((y - r.height/2)/(r.height/2))*-8;
      const ry = ((x - r.width/2)/(r.width/2))*8;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', ()=> card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)');
  });
}

/* Scroll UI */
function bindScrollUI(){
  const btn = document.getElementById('scroll-top');
  const nav = document.querySelector('.navbar');
  addEventListener('scroll', ()=>{
    const y = scrollY;
    btn.classList.toggle('visible', y>300);
    nav.style.boxShadow = y>10 ? '0 6px 20px rgba(0,0,0,.25)' : 'none';
  });
  btn.addEventListener('click', ()=> scrollTo({top:0, behavior:'smooth'}));
}

/* Contact form (demo) */
function bindForm(){
  const form = document.querySelector('.contact-form');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const t = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    setTimeout(()=>{
      btn.textContent = 'Sent';
      setTimeout(()=>{ btn.disabled=false; btn.textContent=t; form.reset(); }, 1200);
    }, 800);
  });
}
