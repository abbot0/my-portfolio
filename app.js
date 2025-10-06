// theme
let THEME = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', THEME);

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSmoothScroll();
  initStarfield();       // falling stars (hero only)
  initNameAnimation();   // slot effect
  setTimeout(runSlot, 300);

  initProjects();
  bindFilters();
  bindCompact();
  bindTilt();            // 3D tilt
  bindScrollUI();
});

/* ---------- theme ---------- */
function initTheme(){
  const btn = document.getElementById('theme-toggle');
  const icon = document.getElementById('theme-icon');
  const setIcon = () => icon.textContent = (THEME==='dark') ? '☀️' : '🌙';
  setIcon();
  btn.addEventListener('click', () => {
    THEME = (THEME==='dark') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', THEME);
    localStorage.setItem('theme', THEME);
    setIcon();
  });
}

/* ---------- smooth scroll ---------- */
function initSmoothScroll(){
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-scroll]');
    if(!t) return;
    e.preventDefault();
    const el = document.querySelector(t.getAttribute('data-scroll'));
    if(el) window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
  });
}

/* ---------- starfield (hero only) ---------- */
function initStarfield(){
  const canvas = document.getElementById('starfield');
  const hero = document.getElementById('hero');
  if(!canvas || !hero) return;
  const ctx = canvas.getContext('2d', { alpha:true });

  let DPR = dpr(), W=0, H=0, stars=[];
  function dpr(){ return Math.max(1, Math.min(2, window.devicePixelRatio || 1)); }

  function resize(){
    DPR = dpr();
    const r = hero.getBoundingClientRect();
    const w = Math.max(320, r.width);
    const h = Math.max(300, r.height);
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    canvas.width = Math.floor(w*DPR); canvas.height = Math.floor(h*DPR);
    W = canvas.width; H = canvas.height;

    const count = Math.floor(W*H*0.00012); // scales with size
    stars = new Array(count).fill(0).map(()=>({
      x: Math.random()*W,
      y: Math.random()*H,
      r: Math.random()*(1.6*DPR)+0.4*DPR,
      vy: (20 + Math.random()*90) * (H/900), // speed scales with height
      a: Math.random()*0.6 + 0.35
    }));
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    for(const s of stars){
      // tail
      ctx.strokeStyle = (THEME==='light') ? `rgba(26,26,46,${s.a*0.25})` : `rgba(255,255,255,${s.a*0.55})`;
      ctx.lineWidth = Math.max(1, s.r*0.5);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - 6*DPR); ctx.stroke();

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = (THEME==='light') ? `rgba(26,26,46,${s.a*0.35})` : `rgba(255,255,255,${s.a})`;
      ctx.fill();

      s.y += s.vy/60;
      if(s.y > H + s.r){ s.y = -s.r; s.x = Math.random()*W; }
    }
    requestAnimationFrame(draw);
  }

  new ResizeObserver(resize).observe(hero);
  window.addEventListener('resize', resize);
  resize(); requestAnimationFrame(draw);
}

/* ---------- name slot animation ---------- */
function initNameAnimation(){
  const spans = document.querySelectorAll('.animated-name span:not(.space)');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  spans.forEach(s => s.textContent = chars[Math.floor(Math.random()*chars.length)]);
  window._nameSpans = spans; window._slotChars = chars;
}
function runSlot(){
  const spans = window._nameSpans || [];
  const chars = window._slotChars || 'ABC';
  spans.forEach((span,i)=>{
    const final = span.getAttribute('data-char');
    let count = 0, max = 9 + Math.floor(Math.random()*5);
    const iv = setInterval(()=>{
      span.textContent = chars[Math.floor(Math.random()*chars.length)];
      if(++count>=max){ span.textContent = final; clearInterval(iv); }
    }, 45 + i*2);
  });
}

/* ---------- projects data ---------- */
let PROJECTS = [];
function initProjects(){
  PROJECTS = [
    {id:1, category:'ue5',   icon:'🪃', title:'Boomerang Loop Combat',  desc:'Unreal Engine boomerang action.', tags:['Unreal','Blueprints','C++']},
    {id:2, category:'ue5',   icon:'🪟', title:'Breakable Glass System', desc:'Glass fractures with physics.',  tags:['Unreal','Physics']},
    {id:8, category:'ue5',   icon:'🚢', title:'Battleship Online',      desc:'Multiplayer Battleship in UE.', tags:['Unreal','Networking']},

    {id:4, category:'web',   icon:'📋', title:'Tacky — Task Manager',   desc:'Boards and lists with React.', tags:['React','HTML','CSS']},
    {id:5, category:'web',   icon:'📚', title:'ShelfSync — Book Manager', desc:'Desktop catalog + search.', tags:['Python','Electron']},
    {id:15,category:'web',   icon:'🛍️', title:'Shop UI Demo',           desc:'Simple product UI.', tags:['React','Design']},
    {id:17,category:'web',   icon:'🌐', title:'3D Portfolio',            desc:'Three.js site.', tags:['Three.js','WebGL']},

    {id:6, category:'iot',   icon:'📡', title:'ESP32 GPS Tracker',      desc:'Wi-Fi GPS tracker.', tags:['ESP32','IoT']},
    {id:9, category:'iot',   icon:'🔘', title:'Wi-Fi Button',           desc:'Triggers webhooks.', tags:['ESP8266','Ardino']},

    {id:10,category:'ai-ml', icon:'🌦️', title:'Weather App',            desc:'Current + forecast.', tags:['Python','API']},
    {id:11,category:'ai-ml', icon:'🤖', title:'Local Chatbot',          desc:'Ollama models.', tags:['Python','LLM']},
    {id:12,category:'ai-ml', icon:'🎬', title:'Movie Genre Classifier', desc:'TF-IDF text model.', tags:['Python','NLP']},
    {id:13,category:'ai-ml', icon:'💳', title:'Fraud Detection',        desc:'Binary classifier.', tags:['Python','sklearn']},
    {id:14,category:'ai-ml', icon:'✉️', title:'Spam SMS',               desc:'TF-IDF NB/SVM.', tags:['Python','NLP']},

    {id:7, category:'linux', icon:'💾', title:'DIY NAS',                desc:'Backups + share.', tags:['Linux','Samba']}
  ];
  renderProjects('all');
}

function renderProjects(filter){
  const grid = document.getElementById('projects-grid');
  const list = (filter==='all') ? PROJECTS : PROJECTS.filter(p=>p.category===filter);
  grid.innerHTML = list.map(p=>`
    <article class="card project" data-category="${p.category}" tabindex="0">
      <div class="thumb">${p.icon}</div>
      <div class="body">
        <h3>${p.title}</h3>
        <p>${p.desc}</p>
        <div class="tags">${p.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      </div>
    </article>
  `).join('');
  bindTilt(); // re-attach after render
}

/* ---------- filters / compact ---------- */
function bindFilters(){
  document.querySelectorAll('.chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderProjects(btn.getAttribute('data-filter'));
    });
  });
}
function bindCompact(){
  const t = document.getElementById('compact-toggle');
  const grid = document.getElementById('projects-grid');
  t.addEventListener('change', ()=> grid.classList.toggle('compact', t.checked));
}

/* ---------- 3D tilt ---------- */
function bindTilt(){
  document.querySelectorAll('.project').forEach(card=>{
    const max = 10; // deg
    function calc(e){
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const rx = (0.5 - y) * (max*2);
      const ry = (x - 0.5) * (max*2);
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    }
    card.addEventListener('mousemove', calc);
    card.addEventListener('mouseleave', ()=> card.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateZ(0)');
    // focus tilt
    card.addEventListener('focus', ()=> card.style.transform = 'perspective(900px) translateZ(10px)');
    card.addEventListener('blur',  ()=> card.style.transform = 'perspective(900px) translateZ(0)');
  });
}

/* ---------- scroll UI ---------- */
function bindScrollUI(){
  const btn = document.getElementById('scroll-top');
  addEventListener('scroll', ()=>{
    btn.classList.toggle('visible', window.scrollY > 320);
  });
  btn.addEventListener('click', ()=> window.scrollTo({top:0,behavior:'smooth'}));
}
