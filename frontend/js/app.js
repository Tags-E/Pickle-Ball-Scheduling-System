/* ============================================================
   KITCHEN — Pickleball Court Booking System (frontend)
  Talks to the PHP/MongoDB backend in ../backend/api/*.php over
   fetch(). Requires the site to be served by Apache (XAMPP) —
   opening this file directly (file://) will NOT work because
   PHP must run on a real web server.
   ============================================================ */

const API_BASE = "../backend/api";
const SLOT_TIMES = ["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM",
  "1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","8:00 PM"];

let state = {
  view: "loading",       // loading | auth | dashboard | book | schedule | notifications
  authMode: "login",
  authError: "",
  user: null,
  courts: [],
  takenSlots: [],
  bookings: [],
  notifications: [],
  bookStep: 1,
  selectedCourt: null,
  selectedDate: null,
  selectedTime: null,
  paying: false,
  lastBooking: null,
};

/* ---------------- API helper ---------------- */
async function apiCall(path, { method = "GET", body } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(`${API_BASE}/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      throw new Error("The server took too long to respond. Is Apache running and is MongoDB configured?");
    }
    throw new Error("Could not reach the server. Is Apache running in XAMPP, and is this page loaded via http://localhost/...?");
  }
  clearTimeout(timeoutId);
  let data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON response */ }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (HTTP ${res.status})`);
  }
  return data;
}

function todayISO(){ const d=new Date(); return d.toISOString().slice(0,10); }
function fmtDateLabel(iso){
  const d = new Date(iso+"T00:00:00");
  return d.toLocaleDateString(undefined,{ weekday:'short', month:'short', day:'numeric' });
}
function next14Days(){
  const days = []; const start = new Date();
  for(let i=0;i<14;i++){ const d = new Date(start); d.setDate(start.getDate()+i); days.push(d.toISOString().slice(0,10)); }
  return days;
}

/* ---------------- toast ---------------- */
function toast(msg, type){
  const wrap = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast' + (type==='warn' ? ' warn' : '');
  el.innerHTML = `<span>${type==='warn'?'⚠️':'✅'}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 3600);
}

window.addEventListener('error', (e) => console.error('Unhandled error:', e.error || e.message));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled promise rejection:', e.reason));

/* ---------------- render root ---------------- */
async function render(){
  const app = document.getElementById('app');
  if(state.view === 'loading'){
    app.innerHTML = `<div class="loading-wrap"><div class="spinner"></div>Loading Kitchen…</div>`;
    return;
  }
  if(state.view === 'auth'){
    app.innerHTML = renderAuth();
    bindAuthEvents();
    return;
  }
  app.innerHTML = `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">K</div>
        <div>
          <div class="brand-name">Kitchen</div>
          <div class="brand-tag">Book your next rally</div>
        </div>
      </div>
      <div class="top-actions">
        <button class="icon-btn" id="notifBtn" title="Notifications">
          🔔
          ${state.notifications.filter(n=>!Number(n.is_read)).length ? `<span class="badge">${state.notifications.filter(n=>!Number(n.is_read)).length}</span>` : ""}
        </button>
        <div class="user-pill" id="userPill">
          <div class="user-avatar">${state.user.name.slice(0,1).toUpperCase()}</div>
          <span>${state.user.name}</span>
        </div>
      </div>
    </div>
    <div class="body-wrap">
      <div class="rail">
        ${railItem('dashboard','🏟️','Book a Court')}
        ${railItem('schedule','📅','My Schedule')}
        ${railItem('notifications','🔔','Notifications')}
        <div style="flex:1"></div>
        <div class="rail-item" id="logoutBtn"><span class="ic">↩️</span>Log out</div>
      </div>
      <div class="main" id="main"></div>
    </div>
    <div class="mobile-tabbar">
      ${mtab('dashboard','🏟️','Book')}
      ${mtab('schedule','📅','Schedule')}
      ${mtab('notifications','🔔','Alerts')}
    </div>
  `;
  document.getElementById('logoutBtn').onclick = doLogout;
  document.getElementById('notifBtn').onclick = () => { state.view='notifications'; render(); };
  document.querySelectorAll('.rail-item[data-nav]').forEach(el=>{
    el.onclick = () => { state.view = el.dataset.nav; if(state.view==='dashboard'){ resetBooking(); } render(); };
  });
  document.querySelectorAll('.mtab[data-nav]').forEach(el=>{
    el.onclick = () => { state.view = el.dataset.nav; if(state.view==='dashboard'){ resetBooking(); } render(); };
  });

  const main = document.getElementById('main');
  try{
    if(state.view === 'dashboard') { main.innerHTML = renderDashboard(); bindDashboardEvents(); }
    else if(state.view === 'book') { main.innerHTML = renderBook(); bindBookEvents(); }
    else if(state.view === 'schedule') { main.innerHTML = `<div class="loading-wrap" style="height:200px"><div class="spinner"></div>Loading your schedule…</div>`; await loadSchedule(); main.innerHTML = renderSchedule(); bindScheduleEvents(); }
    else if(state.view === 'notifications') { main.innerHTML = `<div class="loading-wrap" style="height:200px"><div class="spinner"></div>Loading notifications…</div>`; await loadNotifications(); main.innerHTML = renderNotifications(); }
  }catch(err){
    console.error(err);
    main.innerHTML = `<div class="empty"><div class="ic">⚠️</div>${err.message}</div>`;
  }
}

function railItem(key, icon, label){
  return `<div class="rail-item ${state.view===key?'active':''}" data-nav="${key}"><span class="ic">${icon}</span>${label}</div>`;
}
function mtab(key, icon, label){
  return `<button class="mtab ${state.view===key?'active':''}" data-nav="${key}"><span class="ic">${icon}</span>${label}</button>`;
}

/* ---------------- AUTH VIEW ---------------- */
function renderAuth(){
  const isLogin = state.authMode === 'login';
  return `
  <div class="auth-shell">
    <div class="auth-card">
      <div class="brand-mark" style="font-size:18px;width:38px;height:38px;">K</div>
      <h1>${isLogin ? "Welcome back" : "Create your account"}</h1>
      <p class="auth-sub">${isLogin ? "Log in to book your next pickleball court." : "Join Kitchen to start booking courts near you."}</p>
      ${state.authError ? `<div class="error-box">${state.authError}</div>` : ""}
      <form id="authForm" novalidate>
        ${!isLogin ? `
        <div class="field"><label>Full name</label><input name="name" placeholder="Jamie Rivera"></div>
        <div class="row2">
          <div class="field"><label>Email</label><input name="email" type="email" placeholder="jamie@email.com"></div>
          <div class="field"><label>Phone</label><input name="phone" type="tel" placeholder="(555) 010-0000"></div>
        </div>` : ``}
        <div class="field"><label>Username</label><input name="username" placeholder="jamie.r" autocomplete="username"></div>
        <div class="field"><label>Password</label><input name="password" type="password" placeholder="••••••••" autocomplete="${isLogin?'current-password':'new-password'}"></div>
        <button class="btn btn-primary btn-block" type="submit">${isLogin ? "Log in" : "Create account"}</button>
      </form>
      <div class="switch-line">
        ${isLogin ? `New to Kitchen? <button class="link-btn" id="switchMode">Create an account</button>`
                   : `Already have an account? <button class="link-btn" id="switchMode">Log in</button>`}
      </div>
    </div>
  </div>`;
}
function bindAuthEvents(){
  document.getElementById('switchMode').onclick = () => {
    state.authMode = state.authMode === 'login' ? 'register' : 'login';
    state.authError = "";
    render();
  };
  document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = (fd.get('username')||"").trim().toLowerCase();
    const password = fd.get('password')||"";
    const submitBtn = e.target.querySelector('button[type=submit]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true; submitBtn.textContent = "Please wait…";

    try{
      if(state.authMode === 'login'){
        if(!username || !password){ state.authError = "Please enter your username and password."; render(); return; }
        const res = await apiCall('login.php', { method:'POST', body:{ username, password } });
        await completeLogin(res.user);
      } else {
        const name = (fd.get('name')||"").trim();
        const email = (fd.get('email')||"").trim();
        const phone = (fd.get('phone')||"").trim();
        if(!username || !password || !name){ state.authError = "Please fill in all required fields."; render(); return; }
        const res = await apiCall('register.php', { method:'POST', body:{ username, password, name, email, phone } });
        await completeLogin(res.user);
      }
    }catch(err){
      state.authError = err.message;
      render();
    }finally{
      const btn = document.querySelector('#authForm button[type=submit]');
      if(btn){ btn.disabled = false; btn.textContent = originalLabel; }
    }
  };
}
async function completeLogin(user){
  state.user = user;
  state.authError = "";
  try{
    state.courts = (await apiCall('courts.php')).courts;
    state.notifications = (await apiCall('notifications.php')).notifications;
  }catch(e){ console.error(e); }
  state.view = "dashboard";
  render();
  toast(`Logged in as ${user.name}`);
}
async function doLogout(){
  try{ await apiCall('logout.php', { method:'POST' }); }catch(e){}
  state.user = null;
  state.view = "auth";
  state.authMode = "login";
  render();
}

/* ---------------- DASHBOARD ---------------- */
function renderDashboard(){
  const byLoc = {};
  state.courts.forEach(c => { (byLoc[c.location] = byLoc[c.location]||[]).push(c); });
  const locHtml = Object.keys(byLoc).map(loc => `
    <div class="loc-title">${loc} — ${byLoc[loc][0].address}</div>
    <div class="grid">
      ${byLoc[loc].map(c => `
        <div class="card court-card" data-court="${c.id}">
          <div class="court-name">${c.name}</div>
          <div class="court-meta">${Number(c.indoor) ? "Indoor" : "Outdoor"} court</div>
          <div class="court-foot">
            <span class="tag ${Number(c.indoor)?'tag-indoor':'tag-outdoor'}">${Number(c.indoor)?'Indoor':'Outdoor'}</span>
            <span class="price ${Number(c.fee)===0?'free':''}">${Number(c.fee)===0 ? "Free" : "$"+Number(c.fee).toFixed(2)+"/hr"}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");

  return `
    <div class="page-head">
      <div><h1>Book a court</h1><p>Choose a location and court to see live availability.</p></div>
    </div>
    <hr class="kitchen-line">
    ${locHtml || `<div class="empty"><div class="ic">🎾</div>No courts available yet.</div>`}
  `;
}
function bindDashboardEvents(){
  document.querySelectorAll('[data-court]').forEach(el => {
    el.onclick = async () => {
      state.selectedCourt = state.courts.find(c=>String(c.id)===el.dataset.court);
      state.selectedDate = todayISO();
      state.selectedTime = null;
      state.bookStep = 2;
      state.view = "book";
      render(); // show step 2 immediately with a loading slot grid
      await loadTakenSlots();
      render();
    };
  });
}

/* ---------------- BOOK FLOW ---------------- */
function resetBooking(){
  state.selectedCourt = null; state.selectedDate = null; state.selectedTime = null;
  state.bookStep = 1; state.lastBooking = null; state.paying = false; state.takenSlots = [];
}
async function loadTakenSlots(){
  try{
    const res = await apiCall(`slots.php?court_id=${state.selectedCourt.id}&date=${state.selectedDate}`);
    state.takenSlots = res.taken || [];
  }catch(e){
    state.takenSlots = [];
    toast(e.message, 'warn');
  }
}
function isSlotTaken(time){ return state.takenSlots.includes(time); }

function renderBook(){
  if(!state.selectedCourt){
    return `<div class="empty"><div class="ic">🎾</div>No court selected.<br><button class="btn btn-ghost" style="margin-top:14px" id="emptyGoDash">Browse courts</button></div>`;
  }
  const c = state.selectedCourt;
  const step = state.bookStep;
  const fee = Number(c.fee);

  const stepLabels = ["Court","Date & Time","Review & Pay","Confirmed"];
  const dots = stepLabels.map((_,i)=>`<div class="step-dot ${i < step ? 'done':''}"></div>`).join("");
  const labels = stepLabels.map((l,i)=>`<span class="${i+1===step?'on':''}">${l}</span>`).join("");

  let body = "";
  if(step === 2){
    const days = next14Days();
    const dateChips = days.map(d => {
      const dd = new Date(d+"T00:00:00");
      return `<div class="date-chip ${state.selectedDate===d?'sel':''}" data-date="${d}">
        <div class="dow">${dd.toLocaleDateString(undefined,{weekday:'short'})}</div>
        <div class="num">${dd.getDate()}</div>
      </div>`;
    }).join("");
    const slotHtml = SLOT_TIMES.map(t => {
      const taken = isSlotTaken(t);
      const sel = state.selectedTime === t;
      return `<div class="slot ${taken?'taken':''} ${sel?'sel':''}" data-time="${taken?'':t}">${t}</div>`;
    }).join("");

    body = `
      <div class="card">
        <div class="court-name">${c.name}</div>
        <div class="court-meta">${c.location} · ${Number(c.indoor)?'Indoor':'Outdoor'} · ${fee===0?'Free':'$'+fee.toFixed(2)+'/hr'}</div>
      </div>
      <div style="margin-top:20px; font-weight:600; font-size:14px;">Select a date</div>
      <div class="date-scroller" style="margin-top:10px;">${dateChips}</div>
      <div style="margin-top:20px; font-weight:600; font-size:14px;">Select a time — ${fmtDateLabel(state.selectedDate)}</div>
      <div class="slot-grid">${slotHtml}</div>
      <div style="margin-top:26px; display:flex; gap:10px;">
        <button class="btn btn-ghost" id="backToDash">Back</button>
        <button class="btn btn-primary" id="toReview" ${state.selectedTime?'':'disabled'}>Continue</button>
      </div>
    `;
  } else if(step === 3){
    body = `
      <div class="summary-card">
        <div class="summary-row"><span>Court</span><b>${c.name}</b></div>
        <div class="summary-row"><span>Location</span><b>${c.location}</b></div>
        <div class="summary-row"><span>Date</span><b>${fmtDateLabel(state.selectedDate)}</b></div>
        <div class="summary-row"><span>Time</span><b>${state.selectedTime} · 1 hr</b></div>
        <div class="summary-total"><span>Total</span><span>${fee===0?'Free':'$'+fee.toFixed(2)}</span></div>
      </div>
      ${fee > 0 ? `
      <div class="pay-fields">
        <div style="font-weight:600; font-size:14px; margin-bottom:14px;">Payment details</div>
        <div class="field"><label>Card number</label><input id="cardNum" placeholder="4242 4242 4242 4242" maxlength="19"></div>
        <div class="row2">
          <div class="field"><label>Expiry</label><input id="cardExp" placeholder="MM/YY" maxlength="5"></div>
          <div class="field"><label>CVC</label><input id="cardCvc" placeholder="123" maxlength="4"></div>
        </div>
        <div style="font-size:11.5px; color:var(--muted);">Simulated payment for demo purposes — no real charge is made.</div>
      </div>` : `<p style="color:var(--muted); font-size:13.5px; margin-top:14px;">This court is free to book — no payment required.</p>`}
      <div style="margin-top:22px; display:flex; gap:10px;">
        <button class="btn btn-ghost" id="backToSlots">Back</button>
        <button class="btn btn-primary" id="confirmBooking" ${state.paying?'disabled':''}>
          ${state.paying ? "Processing…" : (fee>0 ? `Pay $${fee.toFixed(2)} & Confirm` : "Confirm booking")}
        </button>
      </div>
    `;
  } else if(step === 4){
    const b = state.lastBooking;
    body = `
      <div class="confirm-hero">
        <div class="confirm-check">✓</div>
        <h2 style="margin:0 0 6px;">Booking confirmed</h2>
        <p style="color:var(--muted); margin:0 0 24px;">A confirmation notification has been sent to your inbox.</p>
      </div>
      <div class="summary-card" style="max-width:420px; margin:0 auto;">
        <div class="summary-row"><span>Court</span><b>${b.court_name}</b></div>
        <div class="summary-row"><span>Date</span><b>${fmtDateLabel(b.date)}</b></div>
        <div class="summary-row"><span>Time</span><b>${b.time}</b></div>
        <div class="summary-row"><span>Confirmation #</span><b>${String(b.id).padStart(6,'0')}</b></div>
      </div>
      <div style="max-width:420px; margin:24px auto 0; display:flex; gap:10px;">
        <button class="btn btn-ghost" style="flex:1" id="bookAnother">Book another court</button>
        <button class="btn btn-primary" style="flex:1" id="viewSchedule">View my schedule</button>
      </div>
    `;
  }

  return `
    <div class="page-head"><div><h1>${c.name}</h1><p>${c.location}</p></div></div>
    <div class="stepper">${dots}</div>
    <div class="step-labels">${labels}</div>
    ${body}
  `;
}
function bindBookEvents(){
  const emptyGoDash = document.getElementById('emptyGoDash');
  if(emptyGoDash) emptyGoDash.onclick = () => { state.view='dashboard'; render(); };

  const backDash = document.getElementById('backToDash');
  if(backDash) backDash.onclick = () => { state.view='dashboard'; render(); };

  document.querySelectorAll('[data-date]').forEach(el=>{
    el.onclick = async () => {
      state.selectedDate = el.dataset.date; state.selectedTime = null;
      render();
      await loadTakenSlots();
      render();
    };
  });
  document.querySelectorAll('[data-time]').forEach(el=>{
    if(!el.dataset.time) return;
    el.onclick = () => { state.selectedTime = el.dataset.time; render(); };
  });
  const toReview = document.getElementById('toReview');
  if(toReview) toReview.onclick = () => { state.bookStep = 3; render(); };

  const backSlots = document.getElementById('backToSlots');
  if(backSlots) backSlots.onclick = () => { state.bookStep = 2; render(); };

  const confirmBtn = document.getElementById('confirmBooking');
  if(confirmBtn) confirmBtn.onclick = handleConfirmBooking;

  const bookAnother = document.getElementById('bookAnother');
  if(bookAnother) bookAnother.onclick = () => { resetBooking(); state.view='dashboard'; render(); };
  const viewSched = document.getElementById('viewSchedule');
  if(viewSched) viewSched.onclick = () => { resetBooking(); state.view='schedule'; render(); };
}

async function handleConfirmBooking(){
  const c = state.selectedCourt;
  const fee = Number(c.fee);
  state.paying = true;
  render();

  try{
    if(fee > 0){
      await new Promise(res => setTimeout(res, 900)); // simulate payment gateway latency
    }
    const res = await apiCall('book.php', {
      method:'POST',
      body:{ court_id:c.id, date:state.selectedDate, time:state.selectedTime }
    });
    state.lastBooking = res.booking;
    try{ state.notifications = (await apiCall('notifications.php')).notifications; }catch(e){}
    state.paying = false;
    state.bookStep = 4;
    render();
    toast("Booking confirmed!");
  }catch(err){
    state.paying = false;
    toast(err.message, 'warn');
    // slot conflict or other error — refresh availability and send them back to pick again
    state.bookStep = 2;
    state.selectedTime = null;
    render();
    await loadTakenSlots();
    render();
  }
}

/* ---------------- SCHEDULE ---------------- */
async function loadSchedule(){
  const res = await apiCall('schedule.php');
  state.bookings = res.bookings || [];
}
function renderSchedule(){
  const mine = state.bookings;
  const now = todayISO();
  const upcoming = mine.filter(b => b.date >= now && b.status==='confirmed');
  const past = mine.filter(b => b.date < now || b.status==='cancelled');

  function row(b){
    const isPast = b.date < now;
    const statusClass = b.status==='cancelled' ? 'status-cancelled' : (isPast ? 'status-past' : 'status-confirmed');
    const statusLabel = b.status==='cancelled' ? 'Cancelled' : (isPast ? 'Completed' : 'Confirmed');
    const fee = Number(b.fee);
    return `
      <div class="booking-row">
        <div>
          <div class="bcourt">${b.court_name}</div>
          <div class="bwhen">${fmtDateLabel(b.date)} · ${b.time} · ${fee>0 ? '$'+fee.toFixed(2) : 'Free'}</div>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="status-pill ${statusClass}">${statusLabel}</span>
          ${(!isPast && b.status==='confirmed') ? `<button class="btn btn-danger btn-sm" data-cancel="${b.id}">Cancel</button>` : ""}
        </div>
      </div>`;
  }

  return `
    <div class="page-head"><div><h1>My schedule</h1><p>Your upcoming and past bookings.</p></div></div>
    <hr class="kitchen-line">
    <div style="font-weight:600; font-size:14px; margin-bottom:10px;">Upcoming (${upcoming.length})</div>
    ${upcoming.length ? upcoming.map(row).join("") : `<div class="empty"><div class="ic">📅</div>No upcoming bookings yet.<br><button class="btn btn-lime btn-sm" style="margin-top:12px" id="goBookEmpty">Book a court</button></div>`}
    ${past.length ? `
      <div style="font-weight:600; font-size:14px; margin:28px 0 10px;">Past &amp; cancelled</div>
      ${past.map(row).join("")}
    ` : ""}
  `;
}
function bindScheduleEvents(){
  document.querySelectorAll('[data-cancel]').forEach(el=>{
    el.onclick = () => cancelBooking(el.dataset.cancel);
  });
  const goBook = document.getElementById('goBookEmpty');
  if(goBook) goBook.onclick = () => { resetBooking(); state.view='dashboard'; render(); };
}
async function cancelBooking(id){
  try{
    await apiCall('cancel.php', { method:'POST', body:{ booking_id:Number(id) } });
    toast("Booking cancelled.");
    state.view = 'schedule';
    render();
  }catch(err){
    toast(err.message, 'warn');
  }
}

/* ---------------- NOTIFICATIONS ---------------- */
async function loadNotifications(){
  const res = await apiCall('notifications.php');
  state.notifications = res.notifications || [];
}
function renderNotifications(){
  const list = state.notifications;
  return `
    <div class="page-head"><div><h1>Notifications</h1><p>Booking confirmations, cancellations, and updates.</p></div></div>
    <hr class="kitchen-line">
    <div class="card" style="padding:6px 16px;">
      ${list.length ? list.map(n => `
        <div class="notif-row ${Number(n.is_read)?'read':''}">
          <div class="notif-dot"></div>
          <div>
            <div class="notif-text">${n.message}</div>
            <div class="notif-time">${new Date(n.created_at.replace(' ','T')).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</div>
          </div>
        </div>
      `).join("") : `<div class="empty"><div class="ic">🔔</div>No notifications yet.</div>`}
    </div>
  `;
}

/* ---------------- boot ---------------- */
async function boot(){
  try{
    const res = await apiCall('session.php');
    if(res.user){
      state.user = res.user;
      state.courts = (await apiCall('courts.php')).courts;
      state.notifications = (await apiCall('notifications.php')).notifications;
      state.view = "dashboard";
    } else {
      state.view = "auth";
    }
  }catch(err){
    console.error("Boot failed:", err);
    state.view = "auth";
    state.authError = err.message;
  }
  render();
}
boot();
