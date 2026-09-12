// ============================================================
// FinFlow v2.0 — Professional Smart Money Tracker
// ============================================================
'use strict';

// ══════════════════════════════════════
// STATE
// ══════════════════════════════════════
const STATE = {
  currentPage:     'dashboard',
  currentMonth:    new Date().toISOString().slice(0, 7),
  transactions:    [],
  budgets:         {},
  customCategories:[],
  profile:         { name: 'User', avatar: '💸', currency: '₹', currencyCode: 'INR' },
  pin:             '',
  pinEnabled:      false,
  theme:           'dark',
  editingId:       null,
  filterType:      'all',
  searchQuery:     '',
  analyticsPeriod: 'month',
  viewMode:        'monthly',   // 'monthly' | 'yearly'
  isLocked:        false,
  editingCatId:    null,
  pinBuffer:       '',
  pinStep:         'enter',
  pinTemp:         '',
};

// ══════════════════════════════════════
// DEFAULT CATEGORIES
// ══════════════════════════════════════
const DEFAULT_CATS = {
  expense: [
    { id:'food',          label:'🍕 Food & Dining',    color:'#ff6b6b' },
    { id:'transport',     label:'🚗 Transport',         color:'#ffd166' },
    { id:'shopping',      label:'🛍️ Shopping',         color:'#6c63ff' },
    { id:'health',        label:'💊 Health',            color:'#06d6a0' },
    { id:'utilities',     label:'💡 Utilities',         color:'#00d4aa' },
    { id:'rent',          label:'🏠 Rent',              color:'#f77f00' },
    { id:'entertainment', label:'🎬 Entertainment',     color:'#e040fb' },
    { id:'education',     label:'📚 Education',         color:'#29b6f6' },
    { id:'travel',        label:'✈️ Travel',            color:'#ff9800' },
    { id:'other_exp',     label:'📦 Other',             color:'#8b8fa8' },
  ],
  income: [
    { id:'salary',        label:'💼 Salary',            color:'#06d6a0' },
    { id:'freelance',     label:'💻 Freelance',         color:'#00d4aa' },
    { id:'bonus',         label:'🎁 Bonus',             color:'#ffd166' },
    { id:'interest',      label:'🏦 Interest',          color:'#29b6f6' },
    { id:'dividend',      label:'📊 Dividend',          color:'#6c63ff' },
    { id:'rental',        label:'🏘️ Rental Income',    color:'#f77f00' },
    { id:'other_income',  label:'💰 Other Income',      color:'#8b8fa8' },
  ],
  investment: [
    { id:'stocks',        label:'📈 Stocks',            color:'#6c63ff' },
    { id:'mutual_fund',   label:'📊 Mutual Funds',      color:'#8b5cf6' },
    { id:'crypto',        label:'₿ Crypto',             color:'#f59e0b' },
    { id:'gold',          label:'🥇 Gold',              color:'#ffd166' },
    { id:'ppf',           label:'🏛️ PPF / EPF',        color:'#06d6a0' },
    { id:'fd',            label:'🏦 Fixed Deposit',     color:'#29b6f6' },
    { id:'real_estate',   label:'🏠 Real Estate',       color:'#f77f00' },
  ],
  loan: [
    { id:'emi',           label:'🏦 EMI Payment',       color:'#ffd166' },
    { id:'home_loan',     label:'🏠 Home Loan',         color:'#ff9800' },
    { id:'car_loan',      label:'🚗 Car Loan',          color:'#ffd166' },
    { id:'personal',      label:'💳 Personal Loan',     color:'#ff6b6b' },
    { id:'education_loan',label:'📚 Education Loan',    color:'#29b6f6' },
    { id:'other_loan',    label:'📄 Other Loan',        color:'#8b8fa8' },
  ],
  savings: [
    { id:'emergency',     label:'🆘 Emergency Fund',    color:'#00d4aa' },
    { id:'goal_savings',  label:'🎯 Goal Savings',      color:'#06d6a0' },
    { id:'retirement',    label:'👴 Retirement',        color:'#6c63ff' },
    { id:'other_save',    label:'💾 Other Savings',     color:'#8b8fa8' },
  ],
};

const TYPE_META = {
  expense:    { icon:'💸', color:'#ff6b6b', label:'Debit',     sign:-1 },
  income:     { icon:'💰', color:'#06d6a0', label:'Credit',    sign:+1 },
  investment: { icon:'📈', color:'#6c63ff', label:'Investment', sign:-1 },
  loan:       { icon:'🏦', color:'#ffd166', label:'Loan',       sign:-1 },
  savings:    { icon:'🏧', color:'#00d4aa', label:'Savings',    sign:-1 },
};

const PALETTE = ['#ff6b6b','#ffd166','#06d6a0','#6c63ff','#00d4aa','#f77f00','#e040fb','#29b6f6','#ff9800','#8b5cf6','#f59e0b','#ef4444'];

// ══════════════════════════════════════
// STORAGE
// ══════════════════════════════════════
function saveData() {
  localStorage.setItem('ff_txns',    JSON.stringify(STATE.transactions));
  localStorage.setItem('ff_budgets', JSON.stringify(STATE.budgets));
  localStorage.setItem('ff_cats',    JSON.stringify(STATE.customCategories));
  localStorage.setItem('ff_profile', JSON.stringify(STATE.profile));
  localStorage.setItem('ff_pin',     STATE.pin);
  localStorage.setItem('ff_pinOn',   STATE.pinEnabled ? '1' : '0');
  localStorage.setItem('ff_theme',   STATE.theme);
}
function loadData() {
  try {
    STATE.transactions     = JSON.parse(localStorage.getItem('ff_txns')    || '[]');
    STATE.budgets          = JSON.parse(localStorage.getItem('ff_budgets') || '{}');
    STATE.customCategories = JSON.parse(localStorage.getItem('ff_cats')    || '[]');
    STATE.profile          = JSON.parse(localStorage.getItem('ff_profile') || 'null') || STATE.profile;
    STATE.pin              = localStorage.getItem('ff_pin') || '';
    STATE.pinEnabled       = localStorage.getItem('ff_pinOn') === '1';
    STATE.theme            = localStorage.getItem('ff_theme') || 'dark';
  } catch(e) { console.error('Load error', e); }
}

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function fmt(n) {
  const sym = STATE.profile.currency || '₹';
  return sym + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 });
}
function fmtShort(n) {
  const sym = STATE.profile.currency || '₹';
  const a = Math.abs(n);
  if (a >= 1e7) return sym + (a/1e7).toFixed(1)+'Cr';
  if (a >= 1e5) return sym + (a/1e5).toFixed(1)+'L';
  if (a >= 1e3) return sym + (a/1e3).toFixed(1)+'k';
  return sym + a.toFixed(0);
}
function fmtDate(d) {
  return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
}
function todayStr() { return new Date().toISOString().slice(0,10); }
function monthLabel(ym) {
  const [y,m] = ym.split('-');
  return new Date(+y,+m-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
}
function prevMonth(ym) {
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  const ry = d.getFullYear();
  const rm = String(d.getMonth() + 1).padStart(2, '0');
  return `${ry}-${rm}`;
}
function nextMonth(ym) {
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, m, 1);
  const ry = d.getFullYear();
  const rm = String(d.getMonth() + 1).padStart(2, '0');
  return `${ry}-${rm}`;
}
function getAllCats() {
  const all = {};
  Object.values(DEFAULT_CATS).flat().forEach(c => all[c.id] = c);
  STATE.customCategories.forEach(c => all[c.id] = c);
  return all;
}
function getCatsForType(type) {
  return [...(DEFAULT_CATS[type]||[]), ...STATE.customCategories.filter(c=>c.type===type)];
}
function getCat(id) {
  return getAllCats()[id] || { label:id, color:'#8b8fa8', icon:'📦' };
}
function txnsForMonth(ym) { return STATE.transactions.filter(t=>t.date.startsWith(ym)); }
function monthSummary(ym) {
  let income=0, expense=0, investment=0, loan=0, savings=0;
  txnsForMonth(ym).forEach(t=>{
    if(t.type==='income')     income     +=t.amount;
    else if(t.type==='expense')   expense    +=t.amount;
    else if(t.type==='investment') investment +=t.amount;
    else if(t.type==='loan')      loan       +=t.amount;
    else if(t.type==='savings')   savings    +=t.amount;
  });
  return { income, expense, investment, loan, savings, balance: income-expense-investment-loan-savings };
}
function greetingText() {
  const h = new Date().getHours();
  if(h<12) return 'Good morning! ☀️';
  if(h<17) return 'Good afternoon! 🌤️';
  if(h<21) return 'Good evening! 🌇';
  return 'Good night! 🌙';
}
function haptic(pattern=[10]) {
  if(navigator.vibrate) navigator.vibrate(pattern);
}

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
let toastTimer;
function showToast(msg, emoji='✅') {
  const el = document.getElementById('toast');
  el.textContent = emoji+' '+msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.add('hidden'), 2800);
}

// ══════════════════════════════════════
// THEME
// ══════════════════════════════════════
function applyTheme(theme) {
  STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeBtn');
  if(btn) btn.textContent = theme==='dark' ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme==='dark'?'#0f0f1a':'#f4f5fb');
}
function toggleTheme() {
  applyTheme(STATE.theme==='dark'?'light':'dark');
  saveData();
  haptic([5,5,5]);
}

// ══════════════════════════════════════
// PIN SYSTEM
// ══════════════════════════════════════
function showPinLock() {
  STATE.isLocked = true;
  STATE.pinBuffer = '';
  updatePinDots('lockPinDots', 0);
  document.getElementById('pinLock').classList.remove('hidden');
  document.getElementById('pinError').classList.add('hidden');
  const profile = STATE.profile;
  document.getElementById('pinLockAvatar').textContent = profile.avatar || '💸';
  document.getElementById('pinLockName').textContent = profile.name || 'FinFlow';
}
function hidePinLock() {
  STATE.isLocked = false;
  document.getElementById('pinLock').classList.add('hidden');
}
function updatePinDots(containerId, count) {
  const dots = document.querySelectorAll(`#${containerId} .pin-dot`);
  dots.forEach((d,i)=>d.classList.toggle('filled', i<count));
}
function handlePinKey(padId, dotsId, val, onComplete, onError) {
  if(val==='del') {
    STATE.pinBuffer = STATE.pinBuffer.slice(0,-1);
  } else {
    if(STATE.pinBuffer.length>=4) return;
    STATE.pinBuffer += val;
    haptic([8]);
  }
  updatePinDots(dotsId, STATE.pinBuffer.length);
  if(STATE.pinBuffer.length===4) {
    setTimeout(()=>onComplete(STATE.pinBuffer), 100);
  }
}
function initPinPad(padId, dotsId, onComplete) {
  document.querySelectorAll(`#${padId} .pin-key`).forEach(btn=>{
    btn.onclick = ()=>{
      const val = btn.dataset.val;
      if(!val) return;
      handlePinKey(padId, dotsId, val, onComplete);
    };
  });
}

// ══════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════
function navigate(page) {
  STATE.currentPage = page;
  document.querySelectorAll('.nav-item[data-page]').forEach(b=>{
    b.classList.toggle('active', b.dataset.page===page);
  });
  renderPage();
  haptic([5]);
}

// ══════════════════════════════════════
// RENDER ROUTER
// ══════════════════════════════════════
function renderPage() {
  const main = document.getElementById('mainContent');
  // Properly destroy all Chart.js v4 instances to prevent duplicate charts on re-render
  Object.keys(Chart.instances).forEach(key => {
    try { Chart.instances[key].destroy(); } catch(e) {}
  });
  main.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'page-enter';
  if(STATE.currentPage==='dashboard')         wrap.appendChild(renderDashboard());
  else if(STATE.currentPage==='transactions') wrap.appendChild(renderTransactions());
  else if(STATE.currentPage==='budget')       wrap.appendChild(renderBudget());
  else if(STATE.currentPage==='insights')     wrap.appendChild(renderInsights());
  else if(STATE.currentPage==='settings')     wrap.appendChild(renderSettings());
  main.appendChild(wrap);
  // Update topbar
  document.getElementById('topbarAvatar').textContent = STATE.profile.avatar || '💸';
  document.getElementById('topbarGreeting').textContent = greetingText();
}

// ══════════════════════════════════════
// MONTH NAV
// ══════════════════════════════════════
function buildMonthNav(showYearly = false) {
  const nav = document.createElement('div');
  nav.className = 'month-nav';
  const prevBtn = document.createElement('button');
  prevBtn.className = 'month-nav-btn';
  prevBtn.textContent = '‹';
  prevBtn.onclick = () => { STATE.currentMonth = prevMonth(STATE.currentMonth); renderPage(); };

  const label = document.createElement('span');
  label.className = 'month-nav-label';
  label.textContent = monthLabel(STATE.currentMonth);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'month-nav-btn';
  nextBtn.textContent = '›';
  nextBtn.onclick = () => { STATE.currentMonth = nextMonth(STATE.currentMonth); renderPage(); };

  nav.appendChild(prevBtn);
  nav.appendChild(label);
  nav.appendChild(nextBtn);

  if (showYearly) {
    const yearBtn = document.createElement('button');
    yearBtn.className = 'month-nav-btn';
    yearBtn.style.cssText = 'border-radius:8px;padding:0 10px;font-size:0.72rem;font-weight:700;width:auto;color:var(--accent);border-color:var(--accent);';
    yearBtn.textContent = '📅 Year';
    yearBtn.onclick = () => { STATE.viewMode = STATE.viewMode === 'yearly' ? 'monthly' : 'yearly'; renderPage(); };
    nav.appendChild(yearBtn);
  }
  return nav;
}

// ══════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════
function renderDashboard() {
  const el = document.createElement('div');
  const ym = STATE.currentMonth;
  const s  = monthSummary(ym);
  const prevYm = prevMonth(ym);
  const sp = monthSummary(prevYm);

  el.appendChild(buildMonthNav());

  // Balance Card
  const bc = document.createElement('div');
  bc.className = 'balance-card';
  const balSign = s.balance>=0 ? '' : '-';
  const savRate = s.income>0 ? ((s.income-s.expense)/s.income*100).toFixed(0) : 0;
  bc.innerHTML = `
    <div class="balance-label">Net Balance — ${monthLabel(ym)}</div>
    <div class="balance-amount">${balSign}${fmt(s.balance)}</div>
    <div class="balance-month">💾 Savings rate: <b style="color:#06d6a0">${savRate}%</b></div>
    <div class="balance-chips">
      <div class="balance-chip">
        <div class="chip-label">💰 Credits</div>
        <div class="chip-value income-c">${fmtShort(s.income)}</div>
      </div>
      <div class="balance-chip">
        <div class="chip-label">💸 Debits</div>
        <div class="chip-value expense-c">${fmtShort(s.expense)}</div>
      </div>
    </div>
  `;
  el.appendChild(bc);

  // Stats grid
  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  const stats = [
    { icon:'📈', label:'Investments', value:s.investment, color:'var(--invest-color)' },
    { icon:'🏦', label:'Loan / EMI',  value:s.loan,       color:'var(--loan-color)' },
    { icon:'🏧', label:'Savings',     value:s.savings,    color:'var(--savings-color)' },
    { icon:'📦', label:'Transactions',value:txnsForMonth(ym).length, color:'var(--text-primary)', raw:true },
  ];
  stats.forEach(st=>{
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-card-accent" style="background:${st.color}"></div>
      <div class="stat-icon">${st.icon}</div>
      <div class="stat-label">${st.label}</div>
      <div class="stat-value" style="color:${st.color}">${st.raw ? st.value : fmtShort(st.value)}</div>
    `;
    grid.appendChild(card);
  });
  el.appendChild(grid);

  // Top Categories
  el.appendChild(buildTopCatsCard(ym));

  // Recent
  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  const recentTxns = [...STATE.transactions].filter(t=>t.date.startsWith(ym))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,6);
  recentCard.innerHTML = `<div class="card-header"><span class="card-title">Recent Transactions</span><span class="card-action" id="viewAllBtn">View All →</span></div>`;
  if(recentTxns.length===0) {
    recentCard.innerHTML += `<div class="empty-state"><div class="empty-state-icon">📭</div><p>No transactions yet.<br/>Tap <b>+</b> to add one!</p></div>`;
  } else {
    const list = document.createElement('div'); list.className = 'txn-list';
    recentTxns.forEach(t=>list.appendChild(buildTxnItem(t)));
    recentCard.appendChild(list);
  }
  el.appendChild(recentCard);

  setTimeout(()=>{
    const v = document.getElementById('viewAllBtn');
    if(v) v.onclick=()=>navigate('transactions');
  },0);
  return el;
}

function buildTopCatsCard(ym) {
  const card = document.createElement('div'); card.className = 'card';
  card.innerHTML = `<div class="card-header"><span class="card-title">Top Spending</span><span class="card-action" id="toInsightsBtn">Insights →</span></div>`;
  const expTxns = txnsForMonth(ym).filter(t=>t.type==='expense');
  if(!expTxns.length) {
    card.innerHTML += `<div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">No expense data yet.</div>`;
    return card;
  }
  const catMap={};
  expTxns.forEach(t=>catMap[t.category]=(catMap[t.category]||0)+t.amount);
  const total = Object.values(catMap).reduce((a,b)=>a+b,0);
  const sorted = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const cont = document.createElement('div'); cont.style.cssText='display:flex;flex-direction:column;gap:12px;';
  sorted.forEach(([id,amount])=>{
    const cat = getCat(id);
    const pct = ((amount/total)*100).toFixed(0);
    const div = document.createElement('div');
    div.innerHTML=`
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
        <span style="font-size:0.83rem;font-weight:600;">${cat.label}</span>
        <span style="font-size:0.83rem;font-weight:800;">${fmt(amount)} <span style="color:var(--text-muted);font-weight:500">(${pct}%)</span></span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${cat.color},${cat.color}99)"></div></div>`;
    cont.appendChild(div);
  });
  card.appendChild(cont);
  setTimeout(()=>{ const b=document.getElementById('toInsightsBtn'); if(b) b.onclick=()=>navigate('insights'); },0);
  return card;
}

// ══════════════════════════════════════
// TRANSACTIONS
// ══════════════════════════════════════
function renderTransactions() {
  const el = document.createElement('div');
  const ym = STATE.currentMonth;
  const s  = monthSummary(ym);

  el.appendChild(buildMonthNav());

  // Search
  const sb = document.createElement('div'); sb.className='search-bar';
  sb.innerHTML=`<span>🔍</span><input type="text" id="searchInput" placeholder="Search transactions..." value="${STATE.searchQuery}" />`;
  el.appendChild(sb);

  // Filters
  const fr = document.createElement('div'); fr.className='filter-row';
  [['all','All'],['expense','💸 Debit'],['income','💰 Credit'],['investment','📈 Invest'],['loan','🏦 Loan'],['savings','🏧 Savings']].forEach(([id,label])=>{
    const chip = document.createElement('button');
    chip.className='filter-chip'+(STATE.filterType===id?' active':'');
    chip.textContent=label;
    chip.onclick=()=>{ STATE.filterType=id; renderPage(); };
    fr.appendChild(chip);
  });
  el.appendChild(fr);

  // Quick stats
  const qs=document.createElement('div'); qs.className='quick-stats';
  qs.innerHTML=`
    <div class="qs-item"><div class="qs-label">Credits</div><div class="qs-value" style="color:var(--income-color)">${fmtShort(s.income)}</div></div>
    <div class="qs-item"><div class="qs-label">Debits</div><div class="qs-value" style="color:var(--expense-color)">${fmtShort(s.expense)}</div></div>
    <div class="qs-item"><div class="qs-label">Balance</div><div class="qs-value" style="color:${s.balance>=0?'var(--income-color)':'var(--expense-color)'}">${fmtShort(Math.abs(s.balance))}</div></div>
  `;
  el.appendChild(qs);

  // Filtered list
  let filtered = STATE.transactions
    .filter(t=>t.date.startsWith(ym))
    .filter(t=>STATE.filterType==='all'||t.type===STATE.filterType)
    .filter(t=>{
      if(!STATE.searchQuery) return true;
      const q=STATE.searchQuery.toLowerCase();
      return (t.description||'').toLowerCase().includes(q)||getCat(t.category).label.toLowerCase().includes(q);
    })
    .sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));

  if(!filtered.length) {
    el.appendChild(Object.assign(document.createElement('div'),{className:'empty-state',innerHTML:'<div class="empty-state-icon">📭</div><p>No transactions found.</p>'}));
  } else {
    const groups={};
    filtered.forEach(t=>{ if(!groups[t.date]) groups[t.date]=[]; groups[t.date].push(t); });
    Object.entries(groups).forEach(([date,txns])=>{
      const hdr=document.createElement('div'); hdr.className='date-group-header';
      const dayNet=txns.reduce((s,t)=>s+(t.type==='income'?t.amount:-t.amount),0);
      const c=dayNet>=0?'var(--income-color)':'var(--expense-color)';
      hdr.innerHTML=`<span>${fmtDate(date)}</span><span style="color:${c};font-weight:800">${dayNet>=0?'+':''}${fmt(dayNet)}</span>`;
      el.appendChild(hdr);
      const list=document.createElement('div'); list.className='txn-list'; list.style.marginBottom='6px';
      txns.forEach(t=>list.appendChild(buildTxnItem(t)));
      el.appendChild(list);
    });
  }

  const inp = document.getElementById('searchInput');
  if (inp) inp.oninput = e => { STATE.searchQuery = e.target.value; renderPage(); };
  return el;
}

function buildTxnItem(t) {
  const cat=getCat(t.category);
  const meta=TYPE_META[t.type]||TYPE_META.expense;
  const isCredit=t.type==='income';
  const item=document.createElement('div'); item.className='txn-item'; item.dataset.id=t.id;
  item.innerHTML=`
    <div class="txn-icon cat-${t.category}" style="color:${cat.color};background:${cat.color}18">${meta.icon}</div>
    <div class="txn-info">
      <div class="txn-name">${t.description||cat.label}</div>
      <div class="txn-meta">${cat.label} · ${fmtDate(t.date)} · ${t.account||'Bank'}</div>
    </div>
    <div class="txn-amount ${isCredit?'credit':'debit'}">${isCredit?'+':'-'}${fmt(t.amount)}</div>
    ${t.recurring?'<div class="txn-recurring-badge">🔄 Recurring</div>':''}
  `;
  item.onclick=()=>openTxnDetail(t.id);
  return item;
}

// ══════════════════════
// BUDGET PAGE (Full with inline edit)
// ══════════════════════
function renderBudget() {
  const el = document.createElement('div');
  const ym = STATE.currentMonth;

  // Month nav + Year toggle
  el.appendChild(buildMonthNav(true));

  // If yearly view
  if (STATE.viewMode === 'yearly') {
    el.appendChild(renderYearlyView());
    return el;
  }

  const budget = STATE.budgets[ym] || {};
  const s = monthSummary(ym);
  const catTotals = {};
  txnsForMonth(ym).filter(t => t.type === 'expense')
    .forEach(t => catTotals[t.category] = (catTotals[t.category] || 0) + t.amount);

  // Overview banner
  const totalBudget = Object.values(budget).reduce((a, b) => a + b, 0);
  const spentPct = totalBudget > 0 ? Math.min(100, (s.expense / totalBudget) * 100) : 0;
  const fillClass = spentPct > 90 ? 'danger' : spentPct > 70 ? 'warning' : '';
  const remaining = Math.max(0, totalBudget - s.expense);

  const overview = document.createElement('div');
  overview.className = 'budget-overview';
  overview.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-size:0.72rem;color:rgba(255,255,255,0.5);font-weight:600;margin-bottom:4px;text-transform:uppercase">Monthly Budget</div>
        <div style="font-family:var(--font-head);font-size:1.6rem;font-weight:800;color:#fff">${totalBudget > 0 ? fmt(totalBudget) : 'Not set'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.72rem;color:rgba(255,255,255,0.5);font-weight:600;margin-bottom:4px;text-transform:uppercase">Spent</div>
        <div style="font-family:var(--font-head);font-size:1.6rem;font-weight:800;color:${spentPct>90?'#ff9494':'#fff'}">${fmt(s.expense)}</div>
      </div>
    </div>
    <div class="progress-bar" style="height:10px">
      <div class="progress-fill ${fillClass}" style="width:${spentPct.toFixed(0)}%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px">
      <span style="font-size:0.72rem;color:rgba(255,255,255,0.5)">${spentPct.toFixed(0)}% used</span>
      <span style="font-size:0.72rem;color:#06d6a0;font-weight:700">${fmt(remaining)} remaining</span>
    </div>
  `;
  el.appendChild(overview);

  // Section: Categories with budgets set
  const heading = document.createElement('div');
  heading.className = 'section-heading';
  heading.style.cssText = 'display:flex;justify-content:space-between;align-items:center';
  heading.innerHTML = `<span>Category Budgets</span><button id="addBudgetCatBtn" style="font-size:0.78rem;color:var(--accent);font-weight:700;background:none;border:none;cursor:pointer">➕ Add Limit</button>`;
  el.appendChild(heading);

  // All expense categories
  const allExpCats = [...(DEFAULT_CATS.expense || []), ...STATE.customCategories.filter(c => c.type === 'expense')];

  const hasBudget = allExpCats.filter(cat => budget[cat.id] !== undefined);
  const noBudget  = allExpCats.filter(cat => budget[cat.id] === undefined && catTotals[cat.id] > 0);

  if (hasBudget.length === 0 && noBudget.length === 0) {
    const em = document.createElement('div'); em.className = 'empty-state';
    em.innerHTML = '<div class="empty-state-icon">🎯</div><p>No budgets set yet.<br/>Tap <b>➕ Add Limit</b> to get started.</p>';
    el.appendChild(em);
  }

  // Render categories that have a budget limit set
  hasBudget.forEach(cat => renderBudgetCatRow(el, cat, budget[cat.id], catTotals[cat.id] || 0, ym));

  // Render categories with spending but no budget (show without limit)
  if (noBudget.length > 0) {
    const subH = document.createElement('div');
    subH.className = 'settings-section-title';
    subH.style.marginTop = '16px';
    subH.textContent = 'Spending Without Budget Limit';
    el.appendChild(subH);
    noBudget.forEach(cat => renderBudgetCatRow(el, cat, null, catTotals[cat.id] || 0, ym));
  }

  // Add limit button
  const addBtn = document.createElement('button');
  addBtn.className = 'btn-outline';
  addBtn.textContent = '➕ Set / Update All Category Limits';
  addBtn.onclick = () => openBudgetModal();
  el.appendChild(addBtn);

  // Wire up the inline add button
  const addCatBtn = el.querySelector('#addBudgetCatBtn');
  if (addCatBtn) addCatBtn.onclick = () => openBudgetModal();

  return el;
}

function renderBudgetCatRow(container, cat, limit, spent, ym) {
  const pct  = limit > 0 ? Math.min(100, (spent / limit) * 100) : (spent > 0 ? 100 : 0);
  const fc   = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : '';
  const sym  = STATE.profile.currency || '₹';

  const row = document.createElement('div');
  row.className = 'budget-item';
  row.style.cssText = 'position:relative;';
  row.innerHTML = `
    <div class="budget-item-header">
      <span class="budget-category" style="color:${cat.color}">${cat.label}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="budget-amounts">${fmt(spent)} ${limit ? '/ ' + fmt(limit) : '(no limit)'}</span>
        <button class="btn-edit" style="padding:5px 10px;font-size:0.75rem" data-catid="${cat.id}" data-limit="${limit||0}">✏️</button>
        ${limit ? `<button class="btn-danger" style="padding:5px 10px;font-size:0.75rem" data-delcat="${cat.id}">×</button>` : ''}
      </div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill ${fc}" style="width:${pct.toFixed(0)}%;background:linear-gradient(90deg,${cat.color},${cat.color}99)"></div>
    </div>
    ${pct >= 90 && limit ? `<div style="font-size:0.7rem;color:var(--expense-color);margin-top:5px;font-weight:700">${pct >= 100 ? '🔴 Budget exceeded!' : '🟡 ' + pct.toFixed(0) + '% — almost at limit!'}</div>` : ''}
  `;
  container.appendChild(row);

  // Edit button — opens inline input
  row.querySelector('[data-catid]').onclick = (e) => {
    const catId = e.currentTarget.dataset.catid;
    const curLimit = parseFloat(e.currentTarget.dataset.limit) || 0;
    openInlineBudgetEdit(catId, curLimit, ym, row, cat, spent);
  };

  // Remove limit button
  const delBtn = row.querySelector('[data-delcat]');
  if (delBtn) delBtn.onclick = () => {
    if (!STATE.budgets[ym]) return;
    delete STATE.budgets[ym][delBtn.dataset.delcat];
    saveData(); renderPage(); showToast('Budget limit removed', '🗑️');
  };
}

function openInlineBudgetEdit(catId, curLimit, ym, rowEl, cat, spent) {
  // Replace row with an edit form
  const editEl = document.createElement('div');
  editEl.className = 'budget-item';
  editEl.style.cssText = 'border-color:var(--accent);background:var(--bg-card2)';
  editEl.innerHTML = `
    <div style="font-weight:700;color:${cat.color};margin-bottom:10px">${cat.label}</div>
    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:6px">Spent this month: <b>${fmt(spent)}</b></div>
    <div class="amount-input-wrap" style="margin-bottom:12px">
      <span class="currency-sym">${STATE.profile.currency || '₹'}</span>
      <input type="number" id="inlinebudgetinput" value="${curLimit || ''}" placeholder="Enter limit" min="0" style="padding-left:34px;font-size:1.1rem;font-weight:700;width:100%;padding:11px 14px 11px 34px;background:var(--bg-card);border:1.5px solid var(--accent);border-radius:10px;color:var(--text-primary);outline:none" />
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn-primary" id="saveBudgetInline" style="flex:1;padding:10px">💾 Save</button>
      <button class="btn-danger" id="cancelBudgetInline" style="padding:10px 16px">✕ Cancel</button>
    </div>
  `;
  rowEl.replaceWith(editEl);
  const input = editEl.querySelector('#inlinebudgetinput');
  input.focus();
  editEl.querySelector('#saveBudgetInline').onclick = () => {
    const val = parseFloat(input.value);
    if (!val || val <= 0) { showToast('Enter a valid amount', '⚠️'); return; }
    if (!STATE.budgets[ym]) STATE.budgets[ym] = {};
    STATE.budgets[ym][catId] = val;
    saveData(); renderPage(); showToast('Budget updated!', '🎯');
  };
  editEl.querySelector('#cancelBudgetInline').onclick = () => renderPage();
}

// ══════════════════════
// YEARLY VIEW
// ══════════════════════
function renderYearlyView() {
  const el = document.createElement('div');
  const year = STATE.currentMonth.split('-')[0];
  const months = Array.from({length:12}, (_,i) => `${year}-${String(i+1).padStart(2,'0')}`);

  // Year summary banner
  let totalIncome=0, totalExpense=0, totalInvest=0, totalLoan=0, totalSavings=0;
  months.forEach(ym => {
    const s = monthSummary(ym);
    totalIncome   += s.income;
    totalExpense  += s.expense;
    totalInvest   += s.investment;
    totalLoan     += s.loan;
    totalSavings  += s.savings;
  });
  const netBalance = totalIncome - totalExpense - totalInvest - totalLoan - totalSavings;
  const savRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;

  const banner = document.createElement('div');
  banner.className = 'balance-card';
  banner.style.marginBottom = '12px';
  banner.innerHTML = `
    <div class="balance-label">📅 Year ${year} — Full Summary</div>
    <div class="balance-amount">${netBalance >= 0 ? '' : '-'}${fmt(Math.abs(netBalance))}</div>
    <div class="balance-month">Savings rate: <b style="color:#06d6a0">${savRate}%</b></div>
    <div class="balance-chips">
      <div class="balance-chip"><div class="chip-label">💰 Income</div><div class="chip-value income-c">${fmtShort(totalIncome)}</div></div>
      <div class="balance-chip"><div class="chip-label">💸 Expense</div><div class="chip-value expense-c">${fmtShort(totalExpense)}</div></div>
    </div>
  `;
  el.appendChild(banner);

  // Quick stats
  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  [
    {icon:'📈',label:'Invested',    value:totalInvest,  color:'var(--invest-color)'},
    {icon:'🏦',label:'Loan / EMI', value:totalLoan,    color:'var(--loan-color)'},
    {icon:'🏧',label:'Savings',    value:totalSavings, color:'var(--savings-color)'},
    {icon:'📆',label:'Txn Count',  value:months.reduce((a,ym)=>a+txnsForMonth(ym).length,0), color:'var(--text-primary)', raw:true},
  ].forEach(st => {
    const card = document.createElement('div'); card.className = 'stat-card';
    card.innerHTML = `
      <div class="stat-card-accent" style="background:${st.color}"></div>
      <div class="stat-icon">${st.icon}</div>
      <div class="stat-label">${st.label}</div>
      <div class="stat-value" style="color:${st.color}">${st.raw ? st.value : fmtShort(st.value)}</div>`;
    grid.appendChild(card);
  });
  el.appendChild(grid);

  // Bar chart: monthly income vs expense across all 12 months
  const barCard = document.createElement('div'); barCard.className = 'card';
  barCard.innerHTML = `<div class="card-header"><span class="card-title">Monthly Breakdown ${year}</span></div>`;
  const barWrap = document.createElement('div'); barWrap.className = 'chart-container'; barWrap.style.height = '220px';
  const barCanvas = document.createElement('canvas'); barCanvas.id = 'yearlyBarChart';
  barWrap.appendChild(barCanvas); barCard.appendChild(barWrap); el.appendChild(barCard);

  // Monthly table breakdown
  const tableCard = document.createElement('div'); tableCard.className = 'card';
  tableCard.innerHTML = `<div class="card-header"><span class="card-title">Month-by-Month</span></div>`;
  const table = document.createElement('div'); table.style.cssText='display:flex;flex-direction:column;gap:6px;';
  months.forEach(ym => {
    const s = monthSummary(ym);
    if (s.income === 0 && s.expense === 0) return; // skip empty months
    const mLabel = new Date(ym+'-01').toLocaleDateString('en-IN',{month:'short'});
    const net = s.income - s.expense;
    const pct = s.income > 0 ? Math.min(100, s.expense / s.income * 100) : 0;
    const row = document.createElement('div');
    row.style.cssText = 'padding:10px 12px;background:var(--bg-card2);border-radius:10px;cursor:pointer';
    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-weight:700;font-size:0.88rem">${mLabel} ${ym.split('-')[0]}</span>
        <div style="display:flex;gap:8px;font-size:0.78rem;font-weight:700">
          <span style="color:var(--income-color)">+${fmtShort(s.income)}</span>
          <span style="color:var(--expense-color)">-${fmtShort(s.expense)}</span>
          <span style="color:${net>=0?'var(--income-color)':'var(--expense-color)'}">${net>=0?'✓':'⚠'} ${fmtShort(Math.abs(net))}</span>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-fill ${pct>90?'danger':pct>70?'warning':''}" style="width:${pct.toFixed(0)}%"></div></div>
    `;
    row.onclick = () => {
      STATE.currentMonth = ym;
      STATE.viewMode = 'monthly';
      navigate('budget');
    };
    table.appendChild(row);
  });
  tableCard.appendChild(table);
  el.appendChild(tableCard);

  // Draw bar chart after DOM insertion
  setTimeout(() => {
    const labels  = months.map(ym => new Date(ym+'-01').toLocaleDateString('en-IN',{month:'short'}));
    const incomes  = months.map(ym => monthSummary(ym).income);
    const expenses = months.map(ym => monthSummary(ym).expense);
    new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {label:'Income',  data:incomes,  backgroundColor:'rgba(6,214,160,0.75)',  borderRadius:5, borderSkipped:false},
          {label:'Expense', data:expenses, backgroundColor:'rgba(255,107,107,0.75)', borderRadius:5, borderSkipped:false},
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{labels:{color:'#8b8fa8',font:{size:11}}}},
        scales:{
          x:{ticks:{color:'#8b8fa8',font:{size:10}}, grid:{color:'rgba(255,255,255,0.04)'}},
          y:{ticks:{color:'#8b8fa8',font:{size:10},callback:v=>fmtShort(v)}, grid:{color:'rgba(255,255,255,0.04)'}}
        }
      }
    });
  }, 80);

  return el;
}


// ══════════════════════════════════════
// TRANSACTION DETAIL SHEET
// ══════════════════════════════════════
function openTxnDetail(id) {
  const t=STATE.transactions.find(x=>x.id===id); if(!t) return;
  const cat=getCat(t.category);
  const meta=TYPE_META[t.type]||TYPE_META.expense;
  const isCredit=t.type==='income';
  const body=document.getElementById('txnDetailBody');
  body.innerHTML=`
    <div style="text-align:center;padding:16px 0 20px">
      <div style="font-size:3rem;margin-bottom:8px">${meta.icon}</div>
      <div style="font-family:var(--font-head);font-size:2rem;font-weight:800;color:${isCredit?'var(--income-color)':'var(--expense-color)'}">${isCredit?'+':'-'}${fmt(t.amount)}</div>
      <div style="color:var(--text-muted);font-size:0.82rem;margin-top:4px">${t.description||cat.label}</div>
    </div>
    <div class="txn-detail-row"><span class="txn-detail-label">Type</span><span class="txn-detail-value">${meta.label}</span></div>
    <div class="txn-detail-row"><span class="txn-detail-label">Category</span><span class="txn-detail-value">${cat.label}</span></div>
    <div class="txn-detail-row"><span class="txn-detail-label">Date</span><span class="txn-detail-value">${fmtDate(t.date)}</span></div>
    <div class="txn-detail-row"><span class="txn-detail-label">Account</span><span class="txn-detail-value">${t.account||'Bank'}</span></div>
    <div class="txn-detail-row"><span class="txn-detail-label">Recurring</span><span class="txn-detail-value">${t.recurring?'✅ Yes ('+t.frequency+')':'No'}</span></div>
    ${t.notes?`<div class="txn-detail-row"><span class="txn-detail-label">Notes</span><span class="txn-detail-value">${t.notes}</span></div>`:''}
    <div style="display:flex;gap:10px;margin-top:20px">
      <button class="btn-edit" style="flex:1" id="detailEditBtn">✏️ Edit</button>
      <button class="btn-danger" style="flex:1" id="detailDeleteBtn">🗑️ Delete</button>
    </div>
  `;
  document.getElementById('txnDetail').classList.remove('hidden');
  document.getElementById('detailEditBtn').onclick=()=>{ closeTxnDetail(); openEditModal(id); };
  document.getElementById('detailDeleteBtn').onclick=()=>{ deleteTxn(id); closeTxnDetail(); };
}
function closeTxnDetail() { document.getElementById('txnDetail').classList.add('hidden'); }

// ══════════════════════════════════════
// INSIGHTS
// ══════════════════════════════════════
function renderInsights() {
  const el=document.createElement('div');
  el.appendChild(buildMonthNav());

  const ym=STATE.currentMonth;
  const prevYm=prevMonth(ym);
  const s=monthSummary(ym);
  const sp=monthSummary(prevYm);
  const txns=txnsForMonth(ym);
  const expTxns=txns.filter(t=>t.type==='expense');
  const totalExp=expTxns.reduce((a,t)=>a+t.amount,0);

  // ── Score Card
  const savRate = s.income>0 ? (s.income-s.expense)/s.income*100 : 0;
  const budgetScore = calcBudgetScore(ym);
  const score = Math.round((savRate*0.5 + budgetScore*0.5));
  const scoreColor = score>=70?'#06d6a0':score>=40?'#ffd166':'#ff6b6b';
  const scoreLabel = score>=70?'Excellent 🎉':score>=40?'Good 👍':'Needs Work ⚠️';
  const scoreCard=document.createElement('div'); scoreCard.className='insight-card';
  scoreCard.innerHTML=`
    <div class="insight-card-accent" style="background:${scoreColor}"></div>
    <div class="card-header" style="margin-bottom:0"><span class="card-title">Financial Health Score</span><span class="insight-badge badge-${score>=70?'green':score>=40?'yellow':'red'}">${scoreLabel}</span></div>
    <div class="score-ring-wrap">
      <div class="score-ring">
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="54" fill="none" stroke="var(--bg-card2)" stroke-width="12"/>
          <circle cx="65" cy="65" r="54" fill="none" stroke="${scoreColor}" stroke-width="12"
            stroke-dasharray="${2*Math.PI*54}" stroke-dashoffset="${2*Math.PI*54*(1-score/100)}"
            stroke-linecap="round" style="transition:stroke-dashoffset 0.8s ease"/>
        </svg>
        <div class="score-ring-label">
          <div class="score-ring-num" style="color:${scoreColor}">${score}</div>
          <div class="score-ring-text">/ 100</div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
      <div style="text-align:center;padding:10px;background:var(--bg-card2);border-radius:10px">
        <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600">SAVINGS RATE</div>
        <div style="font-size:1rem;font-weight:800;color:${savRate>=20?'var(--income-color)':'var(--expense-color)'};">${savRate.toFixed(1)}%</div>
      </div>
      <div style="text-align:center;padding:10px;background:var(--bg-card2);border-radius:10px">
        <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600">BUDGET SCORE</div>
        <div style="font-size:1rem;font-weight:800;color:${budgetScore>=70?'var(--income-color)':'var(--loan-color)'};">${budgetScore}/100</div>
      </div>
    </div>
  `;
  el.appendChild(scoreCard);

  // ── Daily Average & Projection
  const daysInMonth = new Date(+ym.split('-')[0], +ym.split('-')[1], 0).getDate();
  const today = new Date(); const dayOfMonth = today.getDate();
  const isCurrentMonth = ym===new Date().toISOString().slice(0,7);
  const daysPassed = isCurrentMonth ? dayOfMonth : daysInMonth;
  const dailyAvg = daysPassed>0 ? totalExp/daysPassed : 0;
  const projected = dailyAvg * daysInMonth;
  const projCard=document.createElement('div'); projCard.className='insight-card';
  projCard.innerHTML=`
    <div class="insight-card-accent" style="background:var(--accent)"></div>
    <div class="insight-header">
      <div class="insight-icon" style="background:rgba(108,99,255,0.12)">📅</div>
      <div style="flex:1">
        <div class="insight-title">Daily Average Spend</div>
        <div class="insight-value">${fmt(dailyAvg)}<span style="font-size:0.8rem;color:var(--text-muted);font-weight:500">/day</span></div>
        <div class="insight-sub">${isCurrentMonth?`Projected month-end: <b>${fmt(projected)}</b>`:`Avg over ${daysInMonth} days`}</div>
        ${isCurrentMonth&&projected>s.income?'<span class="insight-badge badge-red">⚠️ May exceed income</span>':''}
      </div>
    </div>
  `;
  el.appendChild(projCard);

  // ── Month-over-Month Category Changes
  const prevCatMap={};
  txnsForMonth(prevYm).filter(t=>t.type==='expense').forEach(t=>prevCatMap[t.category]=(prevCatMap[t.category]||0)+t.amount);
  const curCatMap={};
  expTxns.forEach(t=>curCatMap[t.category]=(curCatMap[t.category]||0)+t.amount);

  const changes=[];
  const allCatIds=new Set([...Object.keys(curCatMap),...Object.keys(prevCatMap)]);
  allCatIds.forEach(id=>{
    const cur=curCatMap[id]||0, prev=prevCatMap[id]||0;
    if(cur>0||prev>0) changes.push({ id, cur, prev, pct:prev>0?((cur-prev)/prev*100):null });
  });
  changes.sort((a,b)=>Math.abs(b.cur)-Math.abs(a.cur));

  if(changes.length>0) {
    const momCard=document.createElement('div'); momCard.className='insight-card';
    momCard.innerHTML=`<div class="insight-card-accent" style="background:var(--accent2)"></div><div class="card-header" style="margin-bottom:12px"><span class="card-title">Month-over-Month</span><span style="font-size:0.72rem;color:var(--text-muted)">vs ${monthLabel(prevYm)}</span></div>`;
    changes.slice(0,5).forEach(ch=>{
      const cat=getCat(ch.id);
      const isNew=ch.prev===0;
      const isUp=ch.pct>0;
      const chgText=isNew?'New':ch.pct===null?'—':(isUp?'+':'')+ch.pct.toFixed(0)+'%';
      const chgClass=isNew?'new':isUp?'up':'down';
      const item=document.createElement('div'); item.className='category-tip-item';
      item.innerHTML=`
        <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;background:${cat.color}18">${(TYPE_META[ch.type]||{icon:'📦'}).icon||'📦'}</div>
        <div class="cat-tip-info">
          <div class="cat-tip-name">${cat.label}</div>
          <div class="cat-tip-sub">${fmt(ch.cur)}${ch.prev>0?' (was '+fmt(ch.prev)+')':''}</div>
        </div>
        <div class="cat-tip-change ${chgClass}">${chgText}</div>
      `;
      momCard.appendChild(item);
    });
    el.appendChild(momCard);
  }

  // ── Budget Alerts
  const budget=STATE.budgets[ym]||{};
  const alerts=[];
  Object.entries(budget).forEach(([catId,limit])=>{
    const spent=curCatMap[catId]||0;
    const pct=(spent/limit)*100;
    if(pct>=80) alerts.push({catId,spent,limit,pct});
  });
  if(alerts.length>0) {
    const alertCard=document.createElement('div'); alertCard.className='insight-card';
    alertCard.innerHTML=`<div class="insight-card-accent" style="background:var(--expense-color)"></div><div class="card-header" style="margin-bottom:12px"><span class="card-title">Budget Alerts</span><span class="insight-badge badge-red">${alerts.length} alert${alerts.length>1?'s':''}</span></div>`;
    alerts.forEach(a=>{
      const cat=getCat(a.catId);
      const fc=a.pct>=100?'danger':a.pct>=90?'warning':'';
      const div=document.createElement('div'); div.className='budget-item'; div.style.marginBottom='8px';
      div.innerHTML=`
        <div class="budget-item-header">
          <span class="budget-category" style="color:${cat.color}">${cat.label}</span>
          <span class="budget-amounts">${fmt(a.spent)} / ${fmt(a.limit)}</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${fc}" style="width:${Math.min(100,a.pct)}%"></div></div>
        <div style="font-size:0.72rem;color:var(--expense-color);margin-top:4px;font-weight:700">${a.pct>=100?'🔴 Budget exceeded!':'🟡 '+a.pct.toFixed(0)+'% used — almost there!'}</div>
      `;
      alertCard.appendChild(div);
    });
    el.appendChild(alertCard);
  }

  // ── Top Spending Day
  const dayMap={};
  expTxns.forEach(t=>{ const d=new Date(t.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'long'}); dayMap[d]=(dayMap[d]||0)+t.amount; });
  if(Object.keys(dayMap).length>0) {
    const topDay=Object.entries(dayMap).sort((a,b)=>b[1]-a[1])[0];
    const tipCard=document.createElement('div'); tipCard.className='insight-card';
    tipCard.innerHTML=`
      <div class="insight-card-accent" style="background:var(--loan-color)"></div>
      <div class="insight-header">
        <div class="insight-icon" style="background:rgba(255,209,102,0.12)">📅</div>
        <div>
          <div class="insight-title">Biggest Spending Day</div>
          <div class="insight-value">${topDay[0]}</div>
          <div class="insight-sub">You spend the most on <b>${topDay[0]}</b> — averaging <b>${fmt(topDay[1])}</b> this month.</div>
          <span class="insight-badge badge-yellow">💡 Plan ahead for ${topDay[0]}</span>
        </div>
      </div>
    `;
    el.appendChild(tipCard);
  }

  // ── Smart Tip
  const tips = generateSmartTips(ym, s, sp, savRate);
  tips.slice(0,2).forEach(tip=>{
    const tipCard=document.createElement('div'); tipCard.className='insight-card';
    tipCard.innerHTML=`
      <div class="insight-card-accent" style="background:var(--accent)"></div>
      <div class="insight-header">
        <div class="insight-icon" style="background:rgba(108,99,255,0.12)">${tip.icon}</div>
        <div>
          <div class="insight-title">${tip.title}</div>
          <div class="insight-sub" style="margin-top:4px">${tip.text}</div>
          <span class="insight-badge badge-purple">${tip.badge}</span>
        </div>
      </div>
    `;
    el.appendChild(tipCard);
  });

  return el;
}

function calcBudgetScore(ym) {
  const budget=STATE.budgets[ym]||{};
  const catMap={};
  txnsForMonth(ym).filter(t=>t.type==='expense').forEach(t=>catMap[t.category]=(catMap[t.category]||0)+t.amount);
  const cats=Object.keys(budget);
  if(!cats.length) return 50;
  let score=0;
  cats.forEach(id=>{ const pct=(catMap[id]||0)/budget[id]*100; score+=pct<80?100:pct<100?60:20; });
  return Math.round(score/cats.length);
}

function generateSmartTips(ym, s, sp, savRate) {
  const tips=[];
  if(savRate<10) tips.push({icon:'🐷',title:'Low Savings Alert',text:`Your savings rate is ${savRate.toFixed(1)}% this month. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`,badge:'💡 50/30/20 Rule'});
  if(savRate>=20) tips.push({icon:'🌟',title:'Great Savings Habit!',text:`You saved ${savRate.toFixed(1)}% of income. Keep it up! Consider investing surplus in mutual funds or index funds.`,badge:'🚀 Keep Going!'});
  if(s.expense>sp.expense*1.2&&sp.expense>0) tips.push({icon:'📉',title:'Spending Spike',text:`Expenses are up ${(((s.expense-sp.expense)/sp.expense)*100).toFixed(0)}% vs last month. Review your recent purchases.`,badge:'⚠️ Action Needed'});
  if(s.investment>0) tips.push({icon:'📈',title:'Investing Wisely',text:`You invested ${fmt(s.investment)} this month. Consistent investing builds long-term wealth through compounding.`,badge:'✅ Wealth Building'});
  if(!s.investment) tips.push({icon:'💡',title:'Start Investing',text:`You haven't invested yet this month. Even ${STATE.profile.currency||'₹'}500/month in a SIP can grow significantly over 10 years.`,badge:'💰 SIP Tip'});
  if(s.loan>0) tips.push({icon:'🏦',title:'Loan Repayment',text:`Paying ${fmt(s.loan)} toward loans. Try to prepay when possible — it reduces interest significantly.`,badge:'📊 Smart Move'});
  tips.push({icon:'🔮',title:'Forecast',text:`Based on this month\'s spending, you\'ll have approximately ${fmt(s.income-s.expense)} in disposable income.`,badge:'📅 Monthly Forecast'});
  return tips;
}

// ══════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════
function renderSettings() {
  const el=document.createElement('div');
  el.style.paddingBottom='16px';

  // Profile card
  const p=STATE.profile;
  const profCard=document.createElement('div'); profCard.className='settings-profile';
  profCard.innerHTML=`
    <div class="profile-avatar-wrap">
      <div class="profile-avatar" id="profileAvatarDisp">${p.avatar||'💸'}</div>
      <button class="profile-edit-btn" id="changeAvatarBtn">✏️</button>
    </div>
    <div class="profile-name" id="profileNameDisp">${p.name||'User'}</div>
    <div class="profile-sub">Tap to edit your profile</div>
    <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
      <span style="background:rgba(var(--accent-rgb),0.1);border:1px solid rgba(var(--accent-rgb),0.2);color:var(--accent);padding:4px 14px;border-radius:20px;font-size:0.78rem;font-weight:700">${p.currency||'₹'} ${p.currencyCode||'INR'}</span>
    </div>
  `;
  el.appendChild(profCard);

  // ── Appearance
  const appSection=[
    { icon:'🌙', bg:'rgba(108,99,255,0.12)', label:'Dark Mode', sub:'Toggle dark/light theme', right:buildThemeToggle(), fn:null },
    { icon:'💱', bg:'rgba(6,214,160,0.12)', label:'Currency', sub:p.currency+' '+p.currencyCode, right:'›', fn:()=>openCurrencyPicker() },
  ];
  el.appendChild(buildSettingsSection('Appearance', appSection));

  // ── Security
  const secSection=[
    { icon:'🔐', bg:'rgba(255,107,107,0.12)', label:STATE.pinEnabled?'Change PIN':'Set PIN', sub:STATE.pinEnabled?'4-digit PIN is active':'Protect your data with PIN', right:'›', fn:()=>openPinSetModal() },
    { icon:'🔓', bg:'rgba(255,209,102,0.12)', label:'Disable PIN', sub:'Remove PIN protection', right:'›', fn:()=>disablePin(), hidden:!STATE.pinEnabled },
  ];
  el.appendChild(buildSettingsSection('Security', secSection.filter(x=>!x.hidden)));

  // ── Categories
  const catSection=[
    { icon:'🏷️', bg:'rgba(108,99,255,0.12)', label:'Custom Categories', sub:`${STATE.customCategories.length} custom categories`, right:'›', fn:()=>openCategoryManager() },
  ];
  el.appendChild(buildSettingsSection('Categories', catSection));

  // ── Budget
  const budgetSection=[
    { icon:'🎯', bg:'rgba(6,214,160,0.12)', label:'Set Monthly Budget', sub:'Set spending limits per category', right:'›', fn:()=>openBudgetModal() },
  ];
  el.appendChild(buildSettingsSection('Budget', budgetSection));

  // ── Data
  const dataSection=[
    { icon:'📤', bg:'rgba(108,99,255,0.12)', label:'Export CSV', sub:'Export this month\'s transactions', right:'›', fn:()=>exportCSV() },
    { icon:'📥', bg:'rgba(6,214,160,0.12)', label:'Export JSON', sub:'Full data backup', right:'›', fn:()=>exportJSON() },
    { icon:'📂', bg:'rgba(255,209,102,0.12)', label:'Import JSON', sub:'Restore from backup', right:'›', fn:()=>importJSON() },
    { icon:'🧪', bg:'rgba(108,99,255,0.12)', label:'Load Sample Demo Data', sub:'Optionally add test transactions', right:'›', fn:()=>seedDemoData() },
    { icon:'🗑️', bg:'rgba(255,107,107,0.12)', label:'Reset All Data', sub:'Delete everything permanently', right:'›', fn:()=>resetAllData() },
  ];
  el.appendChild(buildSettingsSection('Data Management', dataSection));

  // ── About
  const aboutSection=[
    { icon:'ℹ️', bg:'rgba(139,143,168,0.12)', label:'FinFlow v2.0', sub:'Smart Money Tracker · PWA', right:'', fn:null },
    { icon:'📱', bg:'rgba(0,212,170,0.12)', label:'Parse Bank SMS', sub:'Auto-import transactions from SMS', right:'›', fn:()=>openSmsModal() },
  ];
  el.appendChild(buildSettingsSection('About', aboutSection));

  setTimeout(()=>{
    document.getElementById('changeAvatarBtn')?.addEventListener('click',()=>openProfileEditor());
    document.getElementById('profileAvatarDisp')?.addEventListener('click',()=>openProfileEditor());
  },0);

  return el;
}

function buildSettingsSection(title, items) {
  const wrap=document.createElement('div');
  const t=document.createElement('div'); t.className='settings-section-title'; t.textContent=title;
  wrap.appendChild(t);
  const list=document.createElement('div'); list.className='settings-list';
  items.forEach(item=>{
    const row=document.createElement('div'); row.className='settings-item';
    if(item.fn) row.onclick=item.fn;
    const rightContent=typeof item.right==='string'
      ? `<span class="settings-item-right">${item.right}</span>`
      : '';
    row.innerHTML=`
      <div class="settings-item-icon" style="background:${item.bg}">${item.icon}</div>
      <div class="settings-item-info">
        <div class="settings-item-label">${item.label}</div>
        <div class="settings-item-sub">${item.sub}</div>
      </div>
      ${rightContent}
    `;
    if(item.right && typeof item.right!=='string') {
      row.appendChild(item.right);
    }
    list.appendChild(row);
  });
  wrap.appendChild(list);
  return wrap;
}

function buildThemeToggle() {
  const label=document.createElement('label'); label.className='toggle-switch';
  label.innerHTML=`<input type="checkbox" id="themeToggleChk" ${STATE.theme==='light'?'checked':''}/><div class="toggle-track"></div>`;
  setTimeout(()=>{
    const chk=document.getElementById('themeToggleChk');
    if(chk) chk.onchange=()=>{ toggleTheme(); };
  },0);
  return label;
}

// Profile Editor
function openProfileEditor() {
  const emojis=['💸','🦁','🐯','🦊','🐼','🐻','🤑','👑','💎','🚀','🌟','🎯'];
  const el=document.createElement('div');
  el.className='modal-overlay';
  el.innerHTML=`
    <div class="modal-card">
      <div class="modal-handle"></div>
      <div class="modal-header"><h2>Edit Profile</h2><button class="modal-close" id="profClose">✕</button></div>
      <div class="modal-body">
        <div class="form-group">
          <label>Your Name</label>
          <input type="text" id="profName" value="${STATE.profile.name||''}" placeholder="Your name" maxlength="20" />
        </div>
        <div class="form-group">
          <label>Avatar</label>
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px" id="emojiPicker">
            ${emojis.map(e=>`<button class="pin-key" style="width:48px;height:48px;font-size:1.5rem;border-radius:12px" data-emoji="${e}">${e}</button>`).join('')}
          </div>
        </div>
        <button class="btn-primary" id="saveProfBtn">💾 Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick=e=>{ if(e.target===el){ el.remove(); } };
  document.getElementById('profClose').onclick=()=>el.remove();
  document.querySelectorAll('#emojiPicker [data-emoji]').forEach(btn=>{
    btn.onclick=()=>{ STATE.profile.avatar=btn.dataset.emoji; saveData(); el.remove(); renderPage(); };
  });
  document.getElementById('saveProfBtn').onclick=()=>{
    const name=document.getElementById('profName').value.trim();
    if(name) STATE.profile.name=name;
    saveData(); el.remove(); renderPage(); showToast('Profile updated!');
  };
}

// Currency Picker
function openCurrencyPicker() {
  const currencies=[{sym:'₹',code:'INR',flag:'🇮🇳'},{sym:'$',code:'USD',flag:'🇺🇸'},{sym:'€',code:'EUR',flag:'🇪🇺'},{sym:'£',code:'GBP',flag:'🇬🇧'},{sym:'¥',code:'JPY',flag:'🇯🇵'},{sym:'د.إ',code:'AED',flag:'🇦🇪'}];
  const el=document.createElement('div'); el.className='modal-overlay';
  el.innerHTML=`
    <div class="modal-card">
      <div class="modal-handle"></div>
      <div class="modal-header"><h2>💱 Currency</h2><button class="modal-close" id="currClose">✕</button></div>
      <div class="modal-body">
        <div style="display:flex;flex-direction:column;gap:8px">
          ${currencies.map(c=>`
            <button class="settings-item" data-sym="${c.sym}" data-code="${c.code}" style="border-radius:var(--radius-md);border:1.5px solid ${STATE.profile.currencyCode===c.code?'var(--accent)':'var(--border)'};background:${STATE.profile.currencyCode===c.code?'rgba(var(--accent-rgb),0.08)':'var(--bg-card)'}">
              <div style="font-size:1.5rem">${c.flag}</div>
              <div class="settings-item-info"><div class="settings-item-label">${c.code}</div><div class="settings-item-sub">${c.sym}</div></div>
              ${STATE.profile.currencyCode===c.code?'<span style="color:var(--accent);font-size:1.1rem">✓</span>':''}
            </button>`).join('')}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick=e=>{ if(e.target===el) el.remove(); };
  document.getElementById('currClose').onclick=()=>el.remove();
  el.querySelectorAll('[data-sym]').forEach(btn=>{
    btn.onclick=()=>{
      STATE.profile.currency=btn.dataset.sym;
      STATE.profile.currencyCode=btn.dataset.code;
      saveData(); el.remove(); renderPage(); showToast('Currency updated!','💱');
    };
  });
}

// ══════════════════════════════════════
// CATEGORY MANAGER
// ══════════════════════════════════════
function openCategoryManager() {
  const el=document.createElement('div'); el.className='modal-overlay';
  const catList=STATE.customCategories;
  el.innerHTML=`
    <div class="modal-card" style="max-height:90dvh">
      <div class="modal-handle"></div>
      <div class="modal-header"><h2>🏷️ Custom Categories</h2><button class="modal-close" id="catMgrClose">✕</button></div>
      <div class="modal-body">
        ${catList.length===0?'<div class="empty-state" style="padding:20px 0"><div class="empty-state-icon">🏷️</div><p>No custom categories yet.</p></div>':''}
        <div id="catMgrList">
          ${catList.map(c=>`
            <div class="settings-item" style="border-radius:var(--radius-md);border:1px solid var(--border);margin-bottom:8px;background:var(--bg-card)">
              <div style="width:36px;height:36px;border-radius:10px;background:${c.color}20;display:flex;align-items:center;justify-content:center;font-size:1.1rem">${c.icon||'📦'}</div>
              <div class="settings-item-info"><div class="settings-item-label">${c.label}</div><div class="settings-item-sub">${c.type}</div></div>
              <div style="display:flex;gap:6px">
                <button class="btn-edit" style="padding:6px 12px" data-edit="${c.id}">✏️</button>
                <button class="btn-danger" style="padding:6px 12px" data-del="${c.id}">🗑️</button>
              </div>
            </div>`).join('')}
        </div>
        <button class="btn-primary" id="addNewCatBtn" style="margin-top:8px">+ Add Category</button>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.onclick=e=>{ if(e.target===el) el.remove(); };
  document.getElementById('catMgrClose').onclick=()=>el.remove();
  document.getElementById('addNewCatBtn').onclick=()=>{ el.remove(); openCatModal(null); };
  el.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{ el.remove(); openCatModal(b.dataset.edit); });
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(!confirm('Delete this category?')) return;
    STATE.customCategories=STATE.customCategories.filter(c=>c.id!==b.dataset.del);
    saveData(); el.remove(); openCategoryManager(); showToast('Category deleted','🗑️');
  });
}

function openCatModal(editId) {
  const editing=editId?STATE.customCategories.find(c=>c.id===editId):null;
  document.getElementById('catModalTitle').textContent=editing?'Edit Category':'Add Category';
  document.getElementById('catEmoji').value=editing?editing.icon||'':'';
  document.getElementById('catName').value=editing?editing.label.replace(/^.\s/,''):'';
  document.getElementById('catType').value=editing?editing.type:'expense';
  STATE.editingCatId=editId||null;

  // Color picker
  const row=document.getElementById('colorPickerRow'); row.innerHTML='';
  PALETTE.forEach(color=>{
    const sw=document.createElement('div'); sw.className='color-swatch'+(editing&&editing.color===color?' active':'');
    sw.style.background=color; sw.dataset.color=color;
    sw.onclick=()=>{ row.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('active')); sw.classList.add('active'); };
    row.appendChild(sw);
  });

  document.getElementById('catModal').classList.remove('hidden');
}

function closeCatModal() { document.getElementById('catModal').classList.add('hidden'); STATE.editingCatId=null; }

function saveCat() {
  const emoji=document.getElementById('catEmoji').value.trim()||'📦';
  const name=document.getElementById('catName').value.trim();
  const type=document.getElementById('catType').value;
  const color=document.querySelector('#colorPickerRow .color-swatch.active')?.dataset.color||PALETTE[0];
  if(!name) { showToast('Enter a category name','⚠️'); return; }
  const id=STATE.editingCatId||('custom_'+uid());
  const label=`${emoji} ${name}`;
  const cat={ id, icon:emoji, label, color, type };
  if(STATE.editingCatId) {
    const i=STATE.customCategories.findIndex(c=>c.id===STATE.editingCatId);
    if(i>=0) STATE.customCategories[i]=cat;
  } else {
    STATE.customCategories.push(cat);
  }
  saveData(); closeCatModal(); showToast(STATE.editingCatId?'Category updated!':'Category added!','🏷️');
}

// ══════════════════════════════════════
// ADD / EDIT TRANSACTION
// ══════════════════════════════════════
function openAddModal() {
  STATE.editingId=null;
  document.getElementById('modalTitle').textContent='Add Transaction';
  document.getElementById('txnAmount').value='';
  document.getElementById('amountDisplay').textContent=(STATE.profile.currency||'₹')+' 0';
  document.getElementById('amountDisplay').style.color='var(--accent)';
  document.getElementById('txnDesc').value='';
  document.getElementById('txnDate').value=todayStr();
  document.getElementById('txnNotes').value='';
  document.getElementById('txnAccount').value='bank';
  document.getElementById('txnRecurring').checked=false;
  document.getElementById('recurringOptions').classList.add('hidden');
  document.getElementById('currencySym').textContent=STATE.profile.currency||'₹';
  setActiveTypeTab('expense');
  populateCategorySelect('expense');
  // Reset modal actions
  const ma=document.getElementById('modalActions');
  ma.innerHTML='<button class="btn-primary" id="saveTxnBtn">💾 Save Transaction</button>';
  document.getElementById('saveTxnBtn').onclick=saveTxn;
  document.getElementById('txnModal').classList.remove('hidden');
}

function openEditModal(id) {
  const t=STATE.transactions.find(x=>x.id===id); if(!t) return;
  STATE.editingId=id;
  document.getElementById('modalTitle').textContent='Edit Transaction';
  document.getElementById('txnAmount').value=t.amount;
  document.getElementById('amountDisplay').textContent=(STATE.profile.currency||'₹')+' '+t.amount;
  document.getElementById('txnDesc').value=t.description||'';
  document.getElementById('txnDate').value=t.date;
  document.getElementById('txnNotes').value=t.notes||'';
  document.getElementById('txnAccount').value=t.account||'bank';
  document.getElementById('txnRecurring').checked=!!t.recurring;
  document.getElementById('currencySym').textContent=STATE.profile.currency||'₹';
  if(t.recurring) document.getElementById('recurringOptions').classList.remove('hidden');
  setActiveTypeTab(t.type);
  populateCategorySelect(t.type);
  document.getElementById('txnCategory').value=t.category;
  const ma=document.getElementById('modalActions');
  ma.innerHTML=`
    <button class="btn-primary" id="saveTxnBtn">💾 Update Transaction</button>
    <div class="modal-actions-row">
      <button class="btn-danger" style="flex:1" id="deleteTxnBtn">🗑️ Delete</button>
    </div>`;
  document.getElementById('saveTxnBtn').onclick=saveTxn;
  document.getElementById('deleteTxnBtn').onclick=()=>deleteTxn(id);
  document.getElementById('txnModal').classList.remove('hidden');
}

function setActiveTypeTab(type) {
  document.querySelectorAll('.type-tab').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
}
function populateCategorySelect(type) {
  const sel=document.getElementById('txnCategory'); sel.innerHTML='';
  getCatsForType(type).forEach(cat=>{
    const o=document.createElement('option'); o.value=cat.id; o.textContent=cat.label; sel.appendChild(o);
  });
}
function closeModal() { document.getElementById('txnModal').classList.add('hidden'); STATE.editingId=null; }

function saveTxn() {
  const amount=parseFloat(document.getElementById('txnAmount').value);
  if(!amount||amount<=0) { showToast('Enter a valid amount','⚠️'); return; }
  const date=document.getElementById('txnDate').value;
  if(!date) { showToast('Select a date','⚠️'); return; }
  const type=document.querySelector('.type-tab.active')?.dataset.type||'expense';
  const txn={
    id:STATE.editingId||uid(), type, amount,
    description:document.getElementById('txnDesc').value.trim(),
    category:document.getElementById('txnCategory').value,
    date, account:document.getElementById('txnAccount').value,
    recurring:document.getElementById('txnRecurring').checked,
    frequency:document.getElementById('txnFrequency').value,
    notes:document.getElementById('txnNotes').value.trim(),
  };
  if(STATE.editingId) {
    const i=STATE.transactions.findIndex(x=>x.id===STATE.editingId);
    STATE.transactions[i]={...STATE.transactions[i],...txn};
    showToast('Transaction updated!','✏️');
  } else {
    STATE.transactions.unshift({...txn,createdAt:new Date().toISOString()});
    showToast('Transaction added!','✅');
  }
  saveData(); closeModal(); renderPage(); haptic([10,5,10]);
}

function deleteTxn(id) {
  if(!confirm('Delete this transaction?')) return;
  STATE.transactions=STATE.transactions.filter(t=>t.id!==id);
  saveData(); closeModal(); closeTxnDetail(); showToast('Deleted','🗑️'); renderPage(); haptic([20]);
}

// ══════════════════════════════════════
// SMS PARSER
// ══════════════════════════════════════
function openSmsModal() { document.getElementById('smsText').value=''; document.getElementById('parsedResult').classList.add('hidden'); document.getElementById('smsModal').classList.remove('hidden'); }
function closeSmsModal() { document.getElementById('smsModal').classList.add('hidden'); }

function parseSMS(text) {
  if(!text?.trim()) return null;

  // Pre-cleaning: Strip Avl bal / Available balance to prevent picking up balance as txn amount
  const cleanedText = text.split(/(?:Avl|Available|Net)\s*(?:bal|balance)\s*:?/i)[0];

  // 1. Amount Extraction (supports Rs, Rs., INR, ₹, Amt, Amount)
  const amtPatterns = [
    /(?:Rs\.?|INR|₹|Amt\.?|Amount)\s*:?\s*([\d,]+\.?\d*)/i,
    /(?:debited|credited|paid|received|spent|transferred|sent|withdrawn|deducted|payment|txn)\s+(?:for\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i,
    /([\d,]+\.?\d*)\s*(?:Rs\.?|INR|₹)/i,
    /(?:VPA|UPI|Ref)\s+[\w@.-]+\s+for\s+([\d,]+\.?\d*)/i,
    /(?:by|for|of)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)/i
  ];

  let amount = null;
  for (const p of amtPatterns) {
    const m = cleanedText.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(val) && val > 0) { amount = val; break; }
    }
  }
  if (!amount) return null;

  // 2. Credit vs Debit Classification
  const isCredit = /credited|credit|received|salary|added|deposit|refund|cashback|interest|dividend|inward/i.test(cleanedText);
  const isDebit = /debited|debit|deducted|paid|spent|purchase|withdrawn|payment|emi|transferred|sent|txn|to\s+/i.test(cleanedText);

  let type = 'expense'; // Debits
  if (isCredit && !isDebit) {
    type = 'income'; // Credits
  } else if (/emi|loan repayment|housing loan|car loan|personal loan/i.test(cleanedText)) {
    type = 'loan';
  } else if (/mutual fund|sip|groww|zerodha|stocks|nse|bse|demat|indmoney|upstox|clearing corp|indian clearing/i.test(cleanedText)) {
    type = 'investment';
  } else if (/emergency fund|recurring deposit|fd|rd|fixed deposit/i.test(cleanedText)) {
    type = 'savings';
  }

  // 3. Merchant / Description Extraction
  let description = '';
  const descPatterns = [
    /(?:info:|towards|at|to|from|for|via)\s+([A-Za-z0-9\s&'.-]{2,35}?)(?:\.|\s+on|\s+ref|\s+vpa|\s+a\/c|\s+bal|\s+umrn|$)/i,
    /UPI[\s\/-]+(?:to|from)?\s*([A-Za-z0-9\s]{2,25})/i,
    /(?:VPA)\s+([A-Za-z0-9@._-]{3,30})/i
  ];
  for (const p of descPatterns) {
    const m = cleanedText.match(p);
    if (m && m[1]) {
      const cleaned = m[1].replace(/^(a\/c|account|ref|txn|val|bal|bank)\b/i, '').trim();
      if (cleaned.length >= 2) { description = cleaned; break; }
    }
  }

  // 4. Date Extraction (DD-MM-YYYY, YYYY-MM-DD, DD/MM/YY, DD Mon YYYY, DD-MM)
  let date = todayStr();
  const datePats = [
    /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\/]?\s*\d{0,4})/i,
    /(\d{1,2}[-\/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\/]\d{2,4})/i,
    /(\d{1,2}[-\/]\d{1,2})/
  ];
  for (const p of datePats) {
    const m = cleanedText.match(p);
    if (m) {
      try {
        let rawDate = m[1];
        if (/^\d{1,2}[-\/]\d{1,2}$/.test(rawDate)) {
          const yr = new Date().getFullYear();
          rawDate = `${rawDate}-${yr}`;
        }
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) date = d.toISOString().slice(0, 10);
      } catch (e) {}
      break;
    }
  }

  // 5. Smart Category Matcher
  let category = type === 'income' ? 'salary' : (type === 'loan' ? 'emi' : (type === 'investment' ? 'mutual_fund' : 'other_exp'));
  const catKw = {
    food: /zomato|swiggy|restaurant|cafe|food|dining|pizza|burger|blinkit|zepto|bigbasket|groceries|d-mart|dmart|instamart|starbucks/i,
    transport: /uber|ola|petrol|fuel|cab|taxi|metro|toll|rapido|bpcl|hpcl|iocl|fastag/i,
    shopping: /amazon|flipkart|myntra|mall|store|mart|meesho|nykaa|ajio|zara|tata cliq|retail|department/i,
    health: /pharmacy|medical|hospital|clinic|doctor|apollo|pharmeasy|1mg|lab|diagnostic/i,
    utilities: /electricity|water|broadband|wifi|internet|bsnl|airtel|jio|bill|recharge|tata play|dth/i,
    entertainment: /netflix|spotify|hotstar|movie|pvr|inox|bookmyshow|youtube|prime/i,
    emi: /emi|loan repayment|home loan|car loan/i,
    salary: /salary|wages|payroll|stipend/i,
    mutual_fund: /mutual fund|sip|groww|zerodha|upstox|coin|clearing corp|indian clearing/i,
    stocks: /nse|bse|stock|equity|share/i
  };
  for (const [cat, re] of Object.entries(catKw)) {
    if (re.test(cleanedText)) { category = cat; break; }
  }

  return { amount, type, category, description, date };
}

function parseBulkSMS(text) {
  if(!text?.trim()) return [];
  let blocks = text.split(/\n\s*\n/).filter(b=>b.trim());
  if(blocks.length === 1) {
    const lines = text.split(/\r?\n/).filter(l=>l.trim().length > 10);
    if(lines.length > 1) blocks = lines;
  }
  const results = [];
  blocks.forEach(block => {
    const res = parseSMS(block);
    if (res) results.push(res);
  });
  return results;
}

// Interactive SMS Confirmation Modal Queue
let pendingSmsQueue = [];

window.addEventListener('native_sms_received', (e) => {
  const detail = e.detail || {};
  let sender = detail.sender || 'Bank';
  let text = detail.text || '';
  
  if (detail.textB64) {
    try { text = decodeURIComponent(escape(atob(detail.textB64))); } catch(err) { text = atob(detail.textB64); }
  }
  if (detail.senderB64) {
    try { sender = decodeURIComponent(escape(atob(detail.senderB64))); } catch(err) { sender = atob(detail.senderB64); }
  }

  if (!text) return;
  const parsed = parseSMS(text);
  if (parsed) {
    const isDuplicate = STATE.transactions.some(t => 
      t.amount === parsed.amount && 
      t.date === parsed.date && 
      t.description === parsed.description
    );
    if (isDuplicate) return;

    pendingSmsQueue.push({ sender, text, parsed });
    showNextSmsConfirmation();
  }
});

function showNextSmsConfirmation() {
  if (pendingSmsQueue.length === 0) return;
  const current = pendingSmsQueue[0];
  const { sender, text, parsed } = current;

  const isCredit = parsed.type === 'income';
  const badge = document.getElementById('smsConfirmTypeBadge');
  if (badge) {
    badge.textContent = isCredit ? '💰 CREDIT SMS DETECTED' : '💸 DEBIT SMS DETECTED';
    badge.style.background = isCredit ? 'rgba(6,214,160,0.15)' : 'rgba(255,107,107,0.15)';
    badge.style.color = isCredit ? 'var(--income-color)' : 'var(--expense-color)';
  }

  const amtInput = document.getElementById('smsConfirmAmount');
  if (amtInput) amtInput.value = parsed.amount;

  const descInput = document.getElementById('smsConfirmDesc');
  if (descInput) descInput.value = parsed.description || (isCredit ? 'Credit Received' : 'Debit Payment');

  const dateInput = document.getElementById('smsConfirmDate');
  if (dateInput) dateInput.value = parsed.date;

  const rawTextEl = document.getElementById('smsConfirmRaw');
  if (rawTextEl) rawTextEl.textContent = text;

  const catSelect = document.getElementById('smsConfirmCategory');
  if (catSelect) {
    catSelect.innerHTML = '';
    const cats = getCatsForType(parsed.type);
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label;
      if (c.id === parsed.category) opt.selected = true;
      catSelect.appendChild(opt);
    });
  }

  const modal = document.getElementById('smsConfirmModal');
  if (modal) modal.classList.remove('hidden');
}

function confirmSmsTransaction() {
  if (pendingSmsQueue.length === 0) return;
  const current = pendingSmsQueue.shift();
  const amount = parseFloat(document.getElementById('smsConfirmAmount').value);
  const description = document.getElementById('smsConfirmDesc').value.trim();
  const category = document.getElementById('smsConfirmCategory').value;
  const date = document.getElementById('smsConfirmDate').value;

  if (!amount || amount <= 0) { showToast('Enter valid amount', '⚠️'); return; }

  STATE.transactions.unshift({
    id: uid(),
    amount,
    type: current.parsed.type,
    category,
    description,
    date,
    account: 'bank',
    recurring: false,
    notes: `Auto-detected from SMS (${current.sender})`,
    createdAt: new Date().toISOString()
  });

  saveData();
  const modal = document.getElementById('smsConfirmModal');
  if (modal) modal.classList.add('hidden');
  showToast(`Logged ${current.parsed.type === 'income' ? 'Credit' : 'Debit'}: ${fmt(amount)}`, '📱');
  renderPage();
  haptic([10, 5, 10]);

  if (pendingSmsQueue.length > 0) {
    setTimeout(showNextSmsConfirmation, 300);
  }
}

function ignoreSmsTransaction() {
  if (pendingSmsQueue.length === 0) return;
  pendingSmsQueue.shift();
  const modal = document.getElementById('smsConfirmModal');
  if (modal) modal.classList.add('hidden');
  showToast('SMS transaction ignored', 'ℹ️');
  if (pendingSmsQueue.length > 0) {
    setTimeout(showNextSmsConfirmation, 300);
  }
}

function handleParseSms() {
  const text = document.getElementById('smsText').value;
  const list = parseBulkSMS(text);
  const el = document.getElementById('parsedResult');
  
  if (!list.length) {
    el.classList.remove('hidden');
    el.style.background = 'rgba(255,107,107,0.08)';
    el.style.borderColor = 'rgba(255,107,107,0.2)';
    el.innerHTML = '❌ Could not parse any transaction. Please check the SMS text.';
    return;
  }

  el.classList.remove('hidden');
  el.style.background = 'rgba(6,214,160,0.06)';
  el.style.borderColor = 'rgba(6,214,160,0.2)';

  if (list.length === 1) {
    const res = list[0];
    el.innerHTML = `
      <div style="font-weight:700;color:var(--success);margin-bottom:8px">✅ 1 Transaction Detected</div>
      <div style="font-size:0.85rem;line-height:1.6;margin-bottom:12px">
        <b>Amount:</b> ${fmt(res.amount)}<br/>
        <b>Type:</b> ${TYPE_META[res.type].label}<br/>
        <b>Category:</b> ${getCat(res.category).label}<br/>
        <b>Description:</b> ${res.description || 'Auto-detected'}<br/>
        <b>Date:</b> ${fmtDate(res.date)}
      </div>
      <button id="confirmSmsBtn" class="btn-primary" style="width:100%">✅ Confirm & Add Transaction</button>
    `;
    document.getElementById('confirmSmsBtn').onclick = () => {
      STATE.transactions.unshift({
        id: uid(), ...res, account: 'bank', recurring: false, notes: 'Auto-imported from SMS', createdAt: new Date().toISOString()
      });
      saveData(); closeSmsModal(); showToast('SMS transaction added!', '📱'); renderPage(); haptic([10,5,10]);
    };
  } else {
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700;color:var(--success)">✅ ${list.length} Transactions Detected</span>
        <span style="font-size:0.75rem;color:var(--text-muted)">Select to import</span>
      </div>
      <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px" id="bulkSmsList">
        ${list.map((res, i) => `
          <label style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;cursor:pointer">
            <input type="checkbox" class="bulk-sms-chk" data-idx="${i}" checked style="width:18px;height:18px;accent-color:var(--accent)" />
            <div style="flex:1;font-size:0.8rem;line-height:1.3">
              <div style="font-weight:700;color:${res.type==='income'?'var(--success)':'var(--text-primary)'}">${fmt(res.amount)} · ${TYPE_META[res.type].label}</div>
              <div style="color:var(--text-secondary);font-size:0.75rem">${getCat(res.category).label} · ${res.description || 'SMS'}</div>
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted)">${fmtDate(res.date)}</div>
          </label>
        `).join('')}
      </div>
      <button id="confirmBulkSmsBtn" class="btn-primary" style="width:100%">📥 Import ${list.length} Transactions</button>
    `;
    document.getElementById('confirmBulkSmsBtn').onclick = () => {
      const selectedBoxes = el.querySelectorAll('.bulk-sms-chk:checked');
      if (!selectedBoxes.length) { showToast('Select at least one transaction', '⚠️'); return; }
      let count = 0;
      selectedBoxes.forEach(chk => {
        const idx = parseInt(chk.dataset.idx);
        const res = list[idx];
        if (res) {
          STATE.transactions.unshift({
            id: uid(), ...res, account: 'bank', recurring: false, notes: 'Auto-imported from SMS', createdAt: new Date().toISOString()
          });
          count++;
        }
      });
      saveData(); closeSmsModal(); showToast(`Imported ${count} transactions!`, '📱'); renderPage(); haptic([10,5,10]);
    };
  }
}

// ══════════════════════════════════════
// BUDGET MODAL
// ══════════════════════════════════════
function openBudgetModal() {
  const ym=STATE.currentMonth;
  document.getElementById('budgetMonth').value=ym;
  const list=document.getElementById('budgetCategoryList'); list.innerHTML='';
  const budget=STATE.budgets[ym]||{};
  [...DEFAULT_CATS.expense,...STATE.customCategories.filter(c=>c.type==='expense')].forEach(cat=>{
    const row=document.createElement('div'); row.className='budget-cat-input';
    row.innerHTML=`<label>${cat.label}</label><input type="number" data-cat="${cat.id}" placeholder="Limit" min="0" value="${budget[cat.id]||''}" />`;
    list.appendChild(row);
  });
  document.getElementById('budgetModal').classList.remove('hidden');
}
function closeBudgetModal() { document.getElementById('budgetModal').classList.add('hidden'); }
function saveBudget() {
  const ym=document.getElementById('budgetMonth').value||STATE.currentMonth;
  const budget={};
  document.querySelectorAll('#budgetCategoryList input[data-cat]').forEach(inp=>{ const v=parseFloat(inp.value); if(v>0) budget[inp.dataset.cat]=v; });
  STATE.budgets[ym]=budget; saveData(); closeBudgetModal(); showToast('Budget saved!','🎯'); renderPage();
}

// ══════════════════════════════════════
// PIN SET MODAL
// ══════════════════════════════════════
function openPinSetModal() {
  STATE.pinBuffer=''; STATE.pinStep='enter'; STATE.pinTemp='';
  document.getElementById('pinModalTitle').textContent='Set PIN';
  document.getElementById('pinModalSub').textContent='Enter a new 4-digit PIN';
  updatePinDots('modalPinDots',0);
  document.getElementById('pinModal').classList.remove('hidden');
  initPinPad('modalPinPad','modalPinDots',(pin)=>{
    if(STATE.pinStep==='enter'){
      STATE.pinTemp=pin; STATE.pinBuffer=''; STATE.pinStep='confirm';
      updatePinDots('modalPinDots',0);
      document.getElementById('pinModalSub').textContent='Confirm your PIN';
    } else {
      if(pin===STATE.pinTemp){
        STATE.pin=pin; STATE.pinEnabled=true; saveData();
        document.getElementById('pinModal').classList.add('hidden');
        showToast('PIN set successfully!','🔐'); renderPage();
      } else {
        STATE.pinBuffer=''; STATE.pinTemp=''; STATE.pinStep='enter';
        updatePinDots('modalPinDots',0);
        document.getElementById('pinModalSub').textContent='PINs did not match. Try again.';
        showToast('PINs do not match','❌');
      }
    }
  });
}
function disablePin() {
  if(!confirm('Remove PIN protection?')) return;
  STATE.pin=''; STATE.pinEnabled=false; saveData(); showToast('PIN disabled','🔓'); renderPage();
}

// ══════════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════════
function exportCSV() {
  const ym=STATE.currentMonth;
  const txns=txnsForMonth(ym);
  if(!txns.length){ showToast('No transactions to export','⚠️'); return; }
  const header=['Date','Description','Type','Category','Account','Amount','Notes'];
  const rows=txns.map(t=>[t.date,`"${(t.description||'').replace(/"/g,'""')}"`,t.type,getCat(t.category).label,t.account||'',t.type==='income'?t.amount:-t.amount,`"${(t.notes||'').replace(/"/g,'""')}"`]);
  const csv=[header,...rows].map(r=>r.join(',')).join('\n');
  downloadBlob(csv,'text/csv',`FinFlow_${ym}.csv`);
  showToast('Exported CSV!','📤');
}
function exportJSON() {
  const data={ transactions:STATE.transactions, budgets:STATE.budgets, customCategories:STATE.customCategories, profile:STATE.profile, exportedAt:new Date().toISOString() };
  downloadBlob(JSON.stringify(data,null,2),'application/json','FinFlow_backup.json');
  showToast('Backup exported!','📥');
}
function importJSON() {
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(data.transactions) STATE.transactions=data.transactions;
        if(data.budgets) STATE.budgets=data.budgets;
        if(data.customCategories) STATE.customCategories=data.customCategories;
        if(data.profile) STATE.profile=data.profile;
        saveData(); renderPage(); showToast('Data imported!','📂');
      }catch(e){ showToast('Invalid backup file','❌'); }
    };
    reader.readAsText(f);
  };
  inp.click();
}
function downloadBlob(content,type,name) {
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name; a.click();
  URL.revokeObjectURL(url);
}
function resetAllData() {
  if(!confirm('⚠️ This will permanently delete ALL your data. Are you sure?')) return;
  if(!confirm('Last chance! Delete everything?')) return;
  ['ff_txns','ff_budgets','ff_cats','ff_profile','ff_pin','ff_pinOn','ff_theme'].forEach(k=>localStorage.removeItem(k));
  location.reload();
}

// ══════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════
let obPin='';
function showOnboarding() {
  document.getElementById('onboarding').classList.remove('hidden');
  // Slide 1 next
  document.getElementById('ob1Next').onclick=()=>{
    const name=document.getElementById('obName').value.trim();
    if(!name){ showToast('Enter your name','⚠️'); return; }
    STATE.profile.name=name;
    document.getElementById('ob1').classList.add('hidden');
    document.getElementById('ob2').classList.remove('hidden');
    initObPinPad();
  };
  // Currency
  document.querySelectorAll('#obCurrencyGrid .currency-opt').forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll('#obCurrencyGrid .currency-opt').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      STATE.profile.currency=btn.dataset.sym; STATE.profile.currencyCode=btn.dataset.code;
    };
  });
  document.getElementById('ob3Finish').onclick=()=>{
    localStorage.setItem('ff_onboarded','1');
    document.getElementById('onboarding').classList.add('hidden');
    saveData(); showApp();
  };
  // Skip PIN
  document.getElementById('obSkipPin').onclick=()=>{
    document.getElementById('ob2').classList.add('hidden');
    document.getElementById('ob3').classList.remove('hidden');
  };
}

function initObPinPad() {
  obPin='';
  updatePinDots('obPinDots',0);
  document.querySelectorAll('#obPinPad .pin-key').forEach(btn=>{
    btn.onclick=()=>{
      const val=btn.dataset.val; if(!val) return;
      if(val==='del'){ obPin=obPin.slice(0,-1); }
      else if(obPin.length<4){ obPin+=val; haptic([8]); }
      updatePinDots('obPinDots',obPin.length);
      if(obPin.length===4){
        setTimeout(()=>{
          STATE.pin=obPin; STATE.pinEnabled=true;
          document.getElementById('ob2').classList.add('hidden');
          document.getElementById('ob3').classList.remove('hidden');
        },200);
      }
    };
  });
}

// ══════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════
function seedDemoData() {
  if(STATE.transactions.length>0 && !confirm('Load sample test transactions into your app?')) return;
  const ym=STATE.currentMonth;
  const prevYm=prevMonth(ym);
  const demo=[
    {type:'income',    category:'salary',     amount:75000, description:'Monthly Salary',     date:`${ym}-01`,     account:'bank'},
    {type:'expense',   category:'rent',        amount:18000, description:'House Rent',          date:`${ym}-01`,     account:'bank'},
    {type:'loan',      category:'emi',         amount:12000, description:'Home Loan EMI',        date:`${ym}-05`,     account:'bank'},
    {type:'investment',category:'mutual_fund', amount:5000,  description:'SIP — HDFC Flexi',    date:`${ym}-07`,     account:'bank'},
    {type:'investment',category:'stocks',      amount:3000,  description:'NSE Stock Purchase',  date:`${ym}-08`,     account:'bank'},
    {type:'expense',   category:'food',        amount:3200,  description:'Zomato & Groceries',  date:`${ym}-10`,     account:'upi'},
    {type:'expense',   category:'utilities',   amount:1400,  description:'Electricity + Wi-Fi', date:`${ym}-12`,     account:'upi'},
    {type:'expense',   category:'transport',   amount:2100,  description:'Petrol & Uber',        date:`${ym}-14`,     account:'cash'},
    {type:'expense',   category:'entertainment',amount:999,  description:'Netflix Subscription', date:`${ym}-15`,     account:'credit'},
    {type:'savings',   category:'emergency',   amount:5000,  description:'Emergency Fund',       date:`${ym}-20`,     account:'bank'},
    {type:'expense',   category:'shopping',    amount:4500,  description:'Amazon Purchase',      date:`${ym}-22`,     account:'credit'},
    {type:'income',    category:'freelance',   amount:12000, description:'Freelance Project',    date:`${ym}-25`,     account:'bank'},
    {type:'expense',   category:'health',      amount:800,   description:'Pharmacy',             date:`${ym}-26`,     account:'cash'},
    // Previous month
    {type:'income',    category:'salary',     amount:70000, description:'Monthly Salary',       date:`${prevYm}-01`, account:'bank'},
    {type:'expense',   category:'food',        amount:2200,  description:'Food',                 date:`${prevYm}-10`, account:'upi'},
    {type:'expense',   category:'transport',   amount:1500,  description:'Transport',            date:`${prevYm}-15`, account:'upi'},
    {type:'investment',category:'mutual_fund', amount:5000,  description:'SIP',                 date:`${prevYm}-07`, account:'bank'},
  ];
  demo.forEach(d=>STATE.transactions.unshift({...d,id:uid(),recurring:false,notes:'',createdAt:new Date().toISOString()}));
  STATE.budgets[ym]={food:5000,transport:3000,shopping:5000,entertainment:1500,health:2000,utilities:2000,rent:20000};
  saveData(); renderPage(); showToast('Sample demo data loaded!','🧪');
}

// ══════════════════════════════════════
// APP SHOW
// ══════════════════════════════════════
function showApp() {
  applyTheme(STATE.theme);
  document.getElementById('app').classList.remove('hidden');
  renderPage();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
function init() {
  loadData();
  applyTheme(STATE.theme);

  setTimeout(()=>{
    document.getElementById('splash').style.display='none';
    const onboarded=localStorage.getItem('ff_onboarded');
    if(!onboarded) {
      showOnboarding();
    } else if(STATE.pinEnabled&&STATE.pin) {
      showPinLock();
      STATE.pinBuffer='';
      initPinPad('lockPinPad','lockPinDots',(pin)=>{
        if(pin===STATE.pin){ hidePinLock(); showApp(); }
        else {
          STATE.pinBuffer='';
          updatePinDots('lockPinDots',0);
          document.getElementById('pinError').classList.remove('hidden');
          haptic([30,10,30]);
          setTimeout(()=>document.getElementById('pinError').classList.add('hidden'),2000);
        }
      });
    } else {
      showApp();
    }
  },2400);

  // Nav
  document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
  document.getElementById('addTxnBtn').onclick=openAddModal;
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('txnModal').onclick=e=>{ if(e.target===document.getElementById('txnModal')) closeModal(); };
  document.getElementById('txnDetailClose').onclick=closeTxnDetail;
  document.getElementById('txnDetail').onclick=e=>{ if(e.target===document.getElementById('txnDetail')) closeTxnDetail(); };
  document.getElementById('smsBtn').onclick=openSmsModal;
  document.getElementById('smsModalClose').onclick=closeSmsModal;
  document.getElementById('smsModal').onclick=e=>{ if(e.target===document.getElementById('smsModal')) closeSmsModal(); };
  document.getElementById('parseSmsBtn').onclick=handleParseSms;
  document.getElementById('budgetModalClose').onclick=closeBudgetModal;
  document.getElementById('budgetModal').onclick=e=>{ if(e.target===document.getElementById('budgetModal')) closeBudgetModal(); };
  document.getElementById('saveBudgetBtn').onclick=saveBudget;
  document.getElementById('catModalClose').onclick=closeCatModal;
  document.getElementById('catModal').onclick=e=>{ if(e.target===document.getElementById('catModal')) closeCatModal(); };
  document.getElementById('saveCatBtn').onclick=saveCat;
  document.getElementById('pinModalClose').onclick=()=>document.getElementById('pinModal').classList.add('hidden');
  document.getElementById('pinModal').onclick=e=>{ if(e.target===document.getElementById('pinModal')) document.getElementById('pinModal').classList.add('hidden'); };
  
  // SMS Confirmation Modal
  const confirmClose = document.getElementById('smsConfirmClose');
  if (confirmClose) confirmClose.onclick = ignoreSmsTransaction;
  const confirmAdd = document.getElementById('smsConfirmAddBtn');
  if (confirmAdd) confirmAdd.onclick = confirmSmsTransaction;
  const confirmCancel = document.getElementById('smsConfirmCancelBtn');
  if (confirmCancel) confirmCancel.onclick = ignoreSmsTransaction;

  // Type tabs
  document.querySelectorAll('.type-tab').forEach(b=>b.onclick=()=>{ setActiveTypeTab(b.dataset.type); populateCategorySelect(b.dataset.type); });
  // Recurring
  document.getElementById('txnRecurring').onchange=e=>document.getElementById('recurringOptions').classList.toggle('hidden',!e.target.checked);
  // Amount live display
  document.getElementById('txnAmount').oninput=e=>{
    const v=parseFloat(e.target.value);
    const disp=document.getElementById('amountDisplay');
    const sym=STATE.profile.currency||'₹';
    disp.textContent=isNaN(v)?sym+' 0':sym+' '+v.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
    disp.style.color=v>0?'var(--accent)':'var(--text-muted)';
  };
  // Lock btn
  document.getElementById('lockBtn').onclick=()=>{
    if(!STATE.pinEnabled){ showToast('Set a PIN in Settings first','🔐'); return; }
    showPinLock();
    STATE.pinBuffer='';
    initPinPad('lockPinPad','lockPinDots',(pin)=>{
      if(pin===STATE.pin){ hidePinLock(); }
      else{
        STATE.pinBuffer=''; updatePinDots('lockPinDots',0);
        document.getElementById('pinError').classList.remove('hidden');
        haptic([30,10,30]);
        setTimeout(()=>document.getElementById('pinError').classList.add('hidden'),2000);
      }
    });
  };
  // Theme btn
  document.getElementById('themeBtn').onclick=toggleTheme;
  // Settings btn & Avatar
  const sBtn = document.getElementById('settingsBtn');
  if(sBtn) sBtn.onclick=()=>navigate('settings');
  const tAvatar = document.getElementById('topbarAvatar');
  if(tAvatar) { tAvatar.style.cursor='pointer'; tAvatar.onclick=()=>navigate('settings'); }
}

document.addEventListener('DOMContentLoaded', init);
