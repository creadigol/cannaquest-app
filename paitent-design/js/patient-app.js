// CannaQuest Mobile PWA Application Logic
(function () {
  'use strict';

  // ── State Management ──
  const STORAGE_KEY = 'cannaquest_patient_state_v1';

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load stored state, using default data.', e);
    }
    return JSON.parse(JSON.stringify(window.DEFAULT_PATIENT_DATA));
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Could not save state to localStorage', e);
    }
  }

  let state = loadState();
  let cart = JSON.parse(localStorage.getItem('cannaquest_cart') || '[]');
  let pendingPrescriptionFile = null;

  function saveCart() {
    localStorage.setItem('cannaquest_cart', JSON.stringify(cart));
    updateCartBadges();
  }

  // ── Navigation & Tabs ──
  let currentTab = 'home';

  function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = btn.dataset.tab;
        switchTab(tab);
      });
    });

    // Check URL Hash
    const hash = window.location.hash.replace('#', '');
    if (['home', 'consults', 'scripts', 'products', 'profile'].includes(hash)) {
      switchTab(hash);
    } else {
      switchTab('home');
    }

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.replace('#', '');
      if (['home', 'consults', 'scripts', 'products', 'profile'].includes(h)) {
        switchTab(h);
      }
    });
  }

  function switchTab(tabId) {
    currentTab = tabId;
    window.location.hash = tabId;

    // Update bottom nav active classes
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all tab screens, show target
    document.querySelectorAll('.tab-screen').forEach(screen => {
      if (screen.id === `tab-${tabId}`) {
        screen.classList.remove('hidden');
        screen.classList.add('stagger-item');
      } else {
        screen.classList.add('hidden');
        screen.classList.remove('stagger-item');
      }
    });

    // Scroll main view to top
    const content = document.querySelector('.app-content');
    if (content) content.scrollTop = 0;

    // Re-render specific tab contents
    if (tabId === 'home') renderHomeTab();
    if (tabId === 'consults') renderConsultsTab();
    if (tabId === 'scripts') renderScriptsTab();
    if (tabId === 'products') renderProductsTab();
    if (tabId === 'profile') renderProfileTab();
  }

  // ── Toast Notification Helper ──
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-card toast-${type}`;
    
    let icon = `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    if (type === 'warning') {
      icon = `<svg class="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    } else if (type === 'info') {
      icon = `<svg class="w-4 h-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `
      ${icon}
      <span class="flex-1">${message}</span>
      <button class="opacity-50 hover:opacity-100 text-xs ml-2" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4000);
  }

  // ── Cart System ──
  function addToCart(product, prescriptionId = null) {
    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        manufacturer: product.manufacturer,
        form: product.form,
        strength: product.strength,
        price: product.unitPrice,
        quantity: 1,
        prescriptionId: prescriptionId
      });
    }
    saveCart();
    showToast(`Added "${product.name}" to your cart!`, 'success');
    renderCartDrawer();
  }

  function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCartDrawer();
    showToast('Item removed from cart', 'info');
  }

  function updateQuantity(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    } else {
      saveCart();
      renderCartDrawer();
    }
  }

  function updateCartBadges() {
    const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // Header badge
    const headerBadge = document.getElementById('header-cart-badge');
    if (headerBadge) {
      headerBadge.textContent = totalCount;
      headerBadge.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    // Floating FAB
    const fab = document.getElementById('floating-cart-fab');
    if (fab) {
      if (totalCount > 0) {
        fab.style.display = 'flex';
        fab.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span>Cart (${totalCount})</span>
          <span class="opacity-40">•</span>
          <span>$${subtotal.toFixed(2)}</span>
        `;
      } else {
        fab.style.display = 'none';
      }
    }
  }

  // ── Render Screens ──

  // 1. Home Tab
  function renderHomeTab() {
    const container = document.getElementById('tab-home');
    if (!container) return;

    const user = state.profile;
    const activeOrder = state.orders.find(o => o.status === 'In Transit') || state.orders[0];
    const nextConsult = state.upcomingConsultations[0];
    const orderable = state.prescriptions.filter(p => !p.isIntervalRestricted && p.remainingRepeats > 0);

    container.innerHTML = `
      <div class="space-y-4">
        <!-- ── HERO CARD ── -->
        <div class="today-hero-panel rounded-[26px] p-5 relative overflow-hidden">
          <div class="absolute inset-0 pointer-events-none rounded-[26px]" style="background: linear-gradient(135deg, #C8EAAA 0%, #A8E060 30%, #EEF5E4 70%, #C8EAAA 100%); background-size: 250% 250%; animation: hero-gradient 12s ease infinite; opacity: 0.95;"></div>
          
          <!-- CQ Watermark -->
          <div class="absolute inset-0 pointer-events-none flex items-center justify-end pr-2" style="opacity: 0.08;">
            <svg viewBox="0 0 925.02 424.78" class="h-44 w-auto fill-[#0e3017]">
              <path d="M0,210.77C0,89.27,89.26,0,215.73,0c106,0,185.97,62.61,208.91,154.98h-83.68c-19.22-48.97-65.09-81.21-125.22-81.21-80.59,0-135.14,57.65-135.14,137s54.55,137.62,135.14,137.62c60.13,0,106-32.85,125.22-81.83h83.68c-22.94,92.37-102.9,154.98-208.91,154.98C89.26,421.54,0,332.27,0,210.77Z"/>
            </svg>
          </div>

          <div class="relative z-10">
            <!-- Clinic badge -->
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold tracking-[0.14em] uppercase text-[#0e3017]/70">Patient Portal</span>
              <span class="hero-confirmed-pill text-[10px] font-bold px-2.5 py-0.5 rounded-full text-[#0e3017] flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse"></span>
                Active Patient
              </span>
            </div>

            <h1 class="text-2xl font-bold tracking-tight text-[#0e3017] leading-tight">
              Hi, ${user.firstName} 👋
            </h1>

            <!-- Live Status Ticker -->
            <div class="flex items-center gap-2 mt-2 h-5 overflow-hidden">
              <div class="w-2 h-2 rounded-full bg-emerald-600 shrink-0 shadow-[0_0_8px_rgba(5,150,105,0.8)]"></div>
              <p id="hero-status-ticker" class="text-xs font-semibold text-[#0e3017]/80 truncate">
                Refill ready for Sativite Okanagan • Next consult tomorrow
              </p>
            </div>

            <!-- CTA Row -->
            <div class="flex flex-nowrap items-center gap-2 mt-4">
              <button onclick="window.app.switchTab('consults'); window.app.openBookingModal();" class="btn-lime px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md whitespace-nowrap shrink-0">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z"/><path stroke-linecap="round" d="M8 13h3m-3 3h5"/></svg>
                Book Consultation
              </button>
              <button onclick="window.app.switchTab('scripts')" class="btn-glass-outline px-2.5 py-2 rounded-full text-[11px] font-semibold flex items-center gap-0.5 whitespace-nowrap shrink-0">
                View Scripts
                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ── CALL ME BUTTON ── -->
        ${nextConsult ? `
        <div class="appointment-reminder-banner rounded-2xl p-4 flex items-center gap-3">
          <div class="relative w-10 h-10 shrink-0">
            <div class="appointment-reminder-icon shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z"/><path stroke-linecap="round" d="M8 13h3m-3 3h5"/></svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#d2ffa0]">Tomorrow's appointment</p>
            <p class="text-sm font-bold text-white mt-1 truncate">${nextConsult.prescriberName}</p>
            <p class="text-[11px] font-semibold text-[#d2ffa0] mt-0.5">${nextConsult.bookDate} • ${nextConsult.startTime}</p>
          </div>
          <button onclick="window.app.switchTab('consults')" class="btn-lime px-3 py-2 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap">
            View details
          </button>
        </div>
        ` : ''}

        <!-- ── CARE JOURNEY TRACKER ── -->
        <div class="surface-card rounded-2xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-brand-label">Your Care Journey</p>
              <p class="text-xs text-muted-foreground">Step ${state.careJourney.completedCount + 1} of ${state.careJourney.totalSteps}</p>
            </div>
            <div class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              3/4 Complete
            </div>
          </div>

          <!-- Stepper Nodes -->
          <div class="journey-steps flex items-center justify-between relative py-2">
            <div class="dashed-step-line" aria-hidden="true"></div>
            ${state.careJourney.steps.map((st, i) => `
              <div class="flex flex-col items-center flex-1 relative z-10">
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${st.completed ? 'bg-[#d2ffa0] text-[#0e3017] shadow-sm' : (st.key === state.careJourney.currentStepKey ? 'bg-[#0e3017] text-white shadow-md' : 'bg-gray-100 text-gray-400')}">
                  ${st.completed ? '✓' : st.number}
                </div>
                <span class="text-[9px] font-semibold mt-1.5 text-center ${st.completed ? 'text-emerald-800' : (st.key === state.careJourney.currentStepKey ? 'text-foreground font-bold' : 'text-gray-400')}">
                  ${st.short_title}
                </span>
              </div>
            `).join('')}
          </div>

          <div class="journey-booking-card mt-4 rounded-2xl p-3.5 flex items-center gap-3">
            <div class="journey-booking-icon shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z"/><path stroke-linecap="round" d="M8 13h3m-3 3h5"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-foreground">Book a consultation</p>
              <p class="text-[11px] text-muted-foreground mt-0.5">Meet with a practitioner to discuss your care.</p>
            </div>
            <button onclick="window.app.switchTab('consults'); window.app.openBookingModal();" class="btn-lime px-3 py-2 rounded-xl text-[11px] font-bold shrink-0 whitespace-nowrap">
              Book now
              <svg class="w-3 h-3 inline-block ml-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6l6 6-6 6"/></svg>
            </button>
          </div>
        </div>

        <!-- ── QUICK ACCESS 4-GRID ── -->
        <div>
          <p class="text-brand-label mb-2 px-1">Quick Access</p>
          <div class="grid grid-cols-4 gap-2">
            <button onclick="window.app.switchTab('scripts')" class="glass-card-sm rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform text-center">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <span class="text-[11px] font-bold text-foreground">Scripts</span>
            </button>
            <button onclick="window.app.switchTab('consults')" class="glass-card-sm rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform text-center">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <span class="text-[11px] font-bold text-foreground">Consults</span>
            </button>
            <button onclick="window.app.openOrderHistory('home')" class="glass-card-sm rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform text-center">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M6 3h12l2 4H4l2-4zm-2 4h16v13H4V7zm5 4h6m-6 4h4"/></svg>
              </div>
              <span class="text-[11px] font-bold text-foreground">Orders</span>
            </button>
            <button onclick="window.app.switchTab('products')" class="glass-card-sm rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform text-center">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-800">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              </div>
              <span class="text-[11px] font-bold text-foreground">Catalog</span>
            </button>
          </div>
        </div>

        <!-- ── SMART CARD: NEXT CONSULTATION ── -->
        ${nextConsult ? `
          <div class="hero-panel rounded-2xl p-4 text-white">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-[10px] uppercase font-bold tracking-wider text-white/70">${nextConsult.timeUntil}</p>
                <h3 class="text-base font-bold text-white mt-1">${nextConsult.prescriberName}</h3>
                <p class="text-xs text-[#d2ffa0] font-medium mt-0.5">${nextConsult.bookDate} • ${nextConsult.startTime}</p>
              </div>
              <button onclick="window.app.launchTelehealthCall('${nextConsult.id}')" class="hero-confirmed-pill px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5 active:scale-95">
                <span class="w-2 h-2 rounded-full bg-[#d2ffa0] animate-ping"></span>
                Join Call
              </button>
            </div>
          </div>
        ` : ''}

        <!-- ── READY TO CONTINUE (Prescriptions) ── -->
        <div>
          <div class="flex items-center justify-between mb-2 px-1">
            <p class="text-brand-label">Scripts Ready to Order</p>
            <button onclick="window.app.switchTab('scripts')" class="text-xs font-bold text-emerald-800">View All</button>
          </div>
          <div class="space-y-2.5">
            ${orderable.slice(0, 2).map(rx => `
              <div class="surface-card rounded-2xl p-3.5 flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-white/80 border border-black/5 flex items-center justify-center shrink-0">
                  <svg class="w-6 h-6 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4.5" y="2.5" width="15" height="19" rx="7.5" transform="rotate(-45 12 12)" /><line x1="5.6" y1="18.4" x2="18.4" y2="5.6" /></svg>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-foreground truncate">${rx.name}</p>
                  <p class="text-[11px] text-muted-foreground mt-0.5">${rx.strength} • ${rx.remainingRepeats} repeats left</p>
                  <p class="text-xs font-bold text-emerald-800 mt-1">$${rx.unitPrice.toFixed(2)}</p>
                </div>
                <button onclick="window.app.addRxToCart('${rx.id}')" class="btn-lime px-3 py-1.5 rounded-xl text-xs font-bold shrink-0">
                  Add to Cart
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ── ACTIVE ORDER TRACKER ── -->
        ${activeOrder ? `
          <div class="surface-card rounded-2xl p-4">
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-brand-label">Active Order</p>
                <p class="text-xs font-bold text-foreground mt-0.5">${activeOrder.uuid}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5">
                <span class="status-pill emerald text-[10px]">${activeOrder.status}</span>
                <button onclick="window.app.openOrderHistory('home')" class="text-[10px] font-bold text-emerald-800 whitespace-nowrap">View order</button>
              </div>
            </div>

            <!-- Mini Progress steps -->
            <div class="order-steps relative flex items-center justify-between gap-1 mb-2">
              <div class="dashed-step-line order-step-line" aria-hidden="true"></div>
              ${activeOrder.progressSteps.map((step, idx) => `
                <div class="flex-1 flex flex-col items-center relative z-10">
                  <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step.status === 'completed' ? 'bg-emerald-600 text-white' : (step.status === 'current' ? 'bg-[#d2ffa0] text-[#0e3017] ring-2 ring-emerald-500' : 'bg-gray-200 text-gray-400')}">
                    ${step.status === 'completed' ? '✓' : (idx + 1)}
                  </div>
                  <span class="text-[8px] font-medium text-muted-foreground mt-1 text-center line-clamp-1">${step.name}</span>
                </div>
              `).join('')}
            </div>

            <p class="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-black/5">
              <svg class="w-3.5 h-3.5 text-emerald-700 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
              ${activeOrder.shippingSummary}
            </p>
          </div>
        ` : ''}

        <!-- Wellness Quote -->
        <div class="text-center py-3">
          <p class="text-xs text-muted-foreground/70 font-light italic">
            "Taking care of your health is an act of self-love."
          </p>
        </div>
      </div>
    `;
    startHeroPromptRotation();
  }

  const heroPromptMessages = [
    'How are you feeling today?',
    'Need help with your treatment plan?',
    'Ready to stay on track with your care?'
  ];
  let heroPromptTimer;

  function startHeroPromptRotation() {
    if (heroPromptTimer) clearInterval(heroPromptTimer);
    let promptIndex = 0;
    const ticker = document.getElementById('hero-status-ticker');
    if (!ticker) return;
    ticker.textContent = heroPromptMessages[promptIndex];
    heroPromptTimer = setInterval(() => {
      const currentTicker = document.getElementById('hero-status-ticker');
      if (!currentTicker) {
        clearInterval(heroPromptTimer);
        return;
      }
      promptIndex = (promptIndex + 1) % heroPromptMessages.length;
      currentTicker.classList.add('hero-prompt-fade');
      setTimeout(() => {
        currentTicker.textContent = heroPromptMessages[promptIndex];
        currentTicker.classList.remove('hero-prompt-fade');
      }, 180);
    }, 4200);
  }

  // 2. Prescriptions Tab
  function renderScriptsTab() {
    const container = document.getElementById('tab-scripts');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Banner Carousel -->
        <div class="catalog-header rounded-2xl p-5 text-white relative overflow-hidden">
          <div class="relative z-10">
            <span class="text-[10px] font-bold tracking-[0.14em] uppercase text-[#d2ffa0]">Your Prescriptions</span>
            <h2 class="text-lg font-bold text-white mt-1 leading-snug">Track Repeats & Refills</h2>
            <p class="text-xs text-white/70 mt-1">See remaining quantities and order repeats straight to your door.</p>
            <button onclick="window.app.openUploadPrescriptionModal()" class="btn-lime mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Upload Prescription
            </button>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="flex gap-2">
          <button id="rx-filter-current" class="chip chip-active" onclick="window.app.filterRxTab('current')">Current Active (${state.prescriptions.length})</button>
          <button id="rx-filter-past" class="chip" onclick="window.app.filterRxTab('past')">Past / Expired (${state.pastPrescriptions.length})</button>
        </div>

        <!-- Prescription List -->
        <div id="rx-cards-container" class="space-y-3">
          ${renderPrescriptionCards(state.prescriptions, true)}
        </div>
      </div>
    `;
  }

  function renderPrescriptionCards(rxList, isCurrent = true) {
    if (!rxList || rxList.length === 0) {
      return `
        <div class="surface-card rounded-2xl p-8 text-center">
          <p class="text-sm font-semibold text-foreground">No prescriptions in this category</p>
        </div>
      `;
    }

    return rxList.map(rx => {
      const redeemed = rx.redeemedRepeats || 0;
      const total = rx.repeatTimes || 1;
      const remaining = rx.remainingRepeats;
      const fillPct = total > 1 ? (redeemed / (total - 1)) * 100 : 0;
      const linkedOrder = state.orders.find(order => order.items?.some(item => item.name === rx.name));

      return `
        <div class="surface-card rounded-2xl p-4 space-y-3 ${rx.glowClass || ''}">
          <!-- Header Row -->
          <div class="flex items-start gap-3">
            <div class="w-14 h-14 rounded-xl bg-white border border-black/5 flex items-center justify-center shrink-0">
              <svg class="w-7 h-7 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4.5" y="2.5" width="15" height="19" rx="7.5" transform="rotate(-45 12 12)" /><line x1="5.6" y1="18.4" x2="18.4" y2="5.6" /></svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="chip py-0.5 px-2 text-[10px] font-bold">${rx.form}</span>
                <span class="status-pill ${rx.statusColor || 'emerald'} text-[10px]">${rx.status}</span>
              </div>
              <h3 class="text-sm font-bold text-foreground mt-1 leading-snug">${rx.name}</h3>
              ${rx.uploadedFileName ? `<p class="text-[10px] text-emerald-800 mt-1 truncate">Uploaded: ${rx.uploadedFileName}</p>` : ''}
              <p class="text-xs text-muted-foreground">${rx.manufacturer} • ${rx.strength}</p>
            </div>
          </div>

          <!-- Repeats Timeline -->
          ${isCurrent && rx.repeatTimes > 0 ? `
            <div class="space-y-1.5 pt-1">
              <div class="flex items-center justify-between text-[11px] font-semibold">
                <span class="text-brand-label">Repeats Progress</span>
                <span class="text-emerald-800">${remaining} of ${total} remaining</span>
              </div>

              <!-- Visual Dot Timeline -->
              <div class="relative py-2">
                <div class="absolute top-[14px] left-2 right-2 h-1 bg-gray-200 rounded-full">
                  <div class="h-full bg-emerald-600 rounded-full timeline-fill" style="width: ${Math.min(fillPct, 100)}%;"></div>
                </div>
                <div class="relative flex justify-between">
                  ${Array.from({ length: total }).map((_, idx) => {
                    const isRedeemed = idx < redeemed;
                    const isCurrentNode = idx === redeemed;
                    return `
                      <div class="flex flex-col items-center">
                        <div class="w-4 h-4 rounded-full flex items-center justify-center relative ${isRedeemed ? 'bg-emerald-600 text-white shadow-sm' : (isCurrentNode ? 'bg-[#d2ffa0] border-2 border-emerald-600 animate-pulse-ring' : 'bg-white border-2 border-gray-300')}">
                          ${isRedeemed ? '✓' : ''}
                        </div>
                        <span class="text-[8px] font-medium text-muted-foreground mt-1">${idx + 1}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Interval restriction banner -->
          ${rx.isIntervalRestricted ? `
            <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 font-medium flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>Refill available in ${rx.daysUntilAvailable} days (interval limit).</span>
            </div>
          ` : ''}

          <!-- Dosage Accordion & Action -->
          <details class="rx-dosage-details text-xs text-muted-foreground pt-1 border-t border-black/5">
            <summary class="cursor-pointer font-semibold text-foreground py-1 flex items-center justify-between">
              <span>Prescription & Dosage Details</span>
              <span class="text-xs">▾</span>
            </summary>
            <div class="rx-details-content py-2 space-y-1 bg-white/40 p-2.5 rounded-xl mt-1">
              <p><strong>Prescriber:</strong> ${rx.prescriber || 'Dr. Lachlan Vance'}</p>
              <p><strong>eRx Token:</strong> <code class="bg-gray-100 px-1 py-0.5 rounded">${rx.erxToken || 'N/A'}</code></p>
              <p><strong>Instructions:</strong> ${rx.dosageInstructions || 'As directed by physician'}</p>
              <p><strong>Expiry:</strong> ${rx.expiryDate || 'N/A'}</p>
            </div>
          </details>

          <!-- Action Row -->
          <div class="flex items-center justify-between pt-2">
            <div>
              <span class="text-xs text-muted-foreground">Unit Price</span>
              <p class="text-base font-bold text-foreground">$${rx.unitPrice ? rx.unitPrice.toFixed(2) : '0.00'}</p>
            </div>
            <div class="flex items-center gap-2">
            ${linkedOrder ? `<button onclick="window.app.openOrderHistoryForPrescription('${rx.name}')" class="btn-glass-outline px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap">View order</button>` : ''}
            ${isCurrent ? `
              ${!rx.isIntervalRestricted && remaining > 0 ? `
                <button onclick="window.app.addRxToCart('${rx.id}')" class="btn-lime px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  Add Refill to Cart
                </button>
              ` : `
                <button disabled class="btn-glass-outline px-4 py-2 rounded-xl text-xs font-semibold opacity-50 cursor-not-allowed">
                  Interval Locked
                </button>
              `}
            ` : `
              <span class="text-xs text-muted-foreground font-medium">Expired Script</span>
            `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 3. Products Tab
  let productCategoryFilter = 'All';
  let productSearchQuery = '';

  function renderProductsTab() {
    const container = document.getElementById('tab-products');
    if (!container) return;

    const categories = ['All', 'Flower', 'Oil', 'Cartridge', 'Devices'];

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Banner -->
        <div class="catalog-header rounded-2xl p-5 text-white relative overflow-hidden">
          <div class="relative z-10">
            <span class="text-[10px] font-bold tracking-[0.14em] uppercase text-[#d2ffa0]">Formulary Catalog</span>
            <h2 class="text-lg font-bold text-white mt-1 leading-snug">Prescribed Medical Products</h2>
            <p class="text-xs text-white/70 mt-1">Browse formulations and approved medical delivery hardware.</p>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="product-search-wrap relative">
          <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input
            id="product-search-input"
            type="text"
            placeholder="Search products or brands"
            class="product-search-input w-full pl-10 pr-4 rounded-xl bg-white/70 border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700 backdrop-blur-sm"
            oninput="window.app.handleProductSearch(this.value)"
          />
        </div>

        <!-- Category Horizontal Scroll -->
        <div class="flex items-center gap-2 overflow-x-auto category-scroll py-1 -mx-1 px-1">
          ${categories.map(cat => `
            <button
              onclick="window.app.filterProductsCategory('${cat}')"
              class="chip ${productCategoryFilter === cat ? 'chip-active' : ''} shrink-0 text-xs"
            >
              ${cat}
            </button>
          `).join('')}
        </div>

        <!-- Product Grid -->
        <div id="product-grid" class="grid grid-cols-2 gap-3">
          ${renderProductCards()}
        </div>
      </div>
    `;
  }

  function renderProductDemoImage(product) {
    const category = product.category || product.form || 'Flower';
    if (category === 'Oil') {
      return `<svg class="product-demo-art product-demo-oil" viewBox="0 0 120 100" aria-hidden="true"><path d="M54 18h12l3 9H51l3-9z"/><rect x="47" y="27" width="26" height="54" rx="6"/><path d="M51 43h18v23H51z"/><circle cx="60" cy="73" r="3"/></svg>`;
    }
    if (category === 'Cartridge') {
      return `<svg class="product-demo-art product-demo-cartridge" viewBox="0 0 120 100" aria-hidden="true"><rect x="39" y="28" width="42" height="48" rx="9"/><path d="M50 28v-9h20v9M55 19h10"/><path d="M48 47h24M48 55h16"/><circle cx="60" cy="66" r="4"/></svg>`;
    }
    if (category === 'Devices') {
      return `<svg class="product-demo-art product-demo-device" viewBox="0 0 120 100" aria-hidden="true"><rect x="40" y="20" width="40" height="60" rx="10"/><rect x="48" y="30" width="24" height="15" rx="3"/><circle cx="60" cy="62" r="7"/><path d="M54 62h12M60 56v12"/></svg>`;
    }
    return `<svg class="product-demo-art product-demo-flower" viewBox="0 0 120 100" aria-hidden="true"><path d="M39 35h42l-3 47H42l-3-47z"/><path d="M36 35h48v-8H36z"/><path d="M49 25c-3-8 5-12 10-5 5-7 13-3 10 5"/><path d="M50 52c8-8 14-8 21 0-8 5-14 5-21 0zM49 63c8-8 15-8 22 0-8 5-15 5-22 0z"/></svg>`;
  }

  function renderProductCards() {
    let prods = state.products;
    if (productCategoryFilter !== 'All') {
      prods = prods.filter(p => p.category === productCategoryFilter);
    }
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      prods = prods.filter(p => p.name.toLowerCase().includes(q) || p.manufacturer.toLowerCase().includes(q));
    }

    if (prods.length === 0) {
      return `
        <div class="col-span-2 surface-card rounded-2xl p-8 text-center">
          <p class="text-sm font-semibold text-foreground">No matching products found</p>
          <button onclick="window.app.filterProductsCategory('All')" class="btn-lime px-3 py-1.5 rounded-xl text-xs font-bold mt-2">
            Show All
          </button>
        </div>
      `;
    }

    return prods.map(p => `
      <div onclick="window.app.openProductModal('${p.id}')" role="button" tabindex="0" class="surface-card rounded-2xl p-3 flex flex-col justify-between active:scale-[0.98] transition-transform cursor-pointer">
        <div>
          <!-- Thumbnail -->
          <div class="w-full aspect-square rounded-xl bg-white border border-black/5 flex items-center justify-center p-2 mb-2 relative">
            ${renderProductDemoImage(p)}
            ${p.prescribed ? `
              <span class="absolute top-2 right-2 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                Prescribed
              </span>
            ` : ''}
          </div>

          <p class="text-[10px] text-muted-foreground font-semibold uppercase">${p.manufacturer}</p>
          <h4 class="text-xs font-bold text-foreground leading-snug line-clamp-2 mt-0.5">${p.name}</h4>
          <div class="flex items-center gap-1.5 mt-1.5">
            <span class="chip py-0.5 px-1.5 text-[9px]">${p.strength}</span>
          </div>
        </div>

        <div class="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
          <span class="text-sm font-bold text-foreground">$${p.unitPrice.toFixed(2)}</span>
          <button onclick="event.stopPropagation(); window.app.addToCartById('${p.id}')" class="btn-lime px-2.5 py-1.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
            <span class="text-sm leading-none">+</span> Add
          </button>
        </div>
      </div>
    `).join('');
  }

  // 4. Consultations Tab
  function renderConsultsTab() {
    const container = document.getElementById('tab-consults');
    if (!container) return;

    const upcoming = state.upcomingConsultations;
    const past = state.pastConsultations;

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Banner -->
        <div class="catalog-header rounded-2xl p-5 text-white relative overflow-hidden">
          <div class="relative z-10">
            <span class="text-[10px] font-bold tracking-[0.14em] uppercase text-[#d2ffa0]">Clinical Telehealth</span>
            <h2 class="text-lg font-bold text-white mt-1 leading-snug">Doctor Consultations</h2>
            <p class="text-xs text-white/70 mt-1">Book or join appointments with Australian Authorised Prescribers.</p>
            <button onclick="window.app.openBookingModal()" class="btn-lime mt-3 px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
              Book New Consult
            </button>
          </div>
        </div>

        <!-- Upcoming Section -->
        <div>
          <p class="text-brand-label mb-2 px-1">Upcoming Appointments</p>
          ${upcoming.length > 0 ? upcoming.map(c => `
            <div class="surface-card rounded-2xl p-4 space-y-3 status-glow-emerald">
              <div class="flex items-start justify-between">
                <div>
                  <span class="status-pill emerald text-[10px]">Confirmed Video Call</span>
                  <h3 class="text-sm font-bold text-foreground mt-1">${c.prescriberName}</h3>
                  <p class="text-xs text-muted-foreground">${c.prescriberTitle} • ${c.clinicName}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs font-bold text-emerald-800">${c.bookDate}</p>
                  <p class="text-[11px] text-muted-foreground">${c.startTime}</p>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-white/60 text-xs text-foreground font-medium">
                ${c.purpose || 'Routine treatment plan renewal and medication dosage adjustment.'}
              </div>

              <div class="flex items-center gap-2 pt-1">
                <button onclick="window.app.rescheduleConsult('${c.id}')" class="btn-primary-green flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm3 10h3"/></svg>
                  Reschedule
                </button>
                <button onclick="window.app.cancelConsult('${c.id}')" class="btn-glass-outline px-3 py-2 rounded-xl text-xs font-semibold text-red-700">
                  Cancel
                </button>
              </div>
            </div>
          `).join('') : `
            <div class="surface-card rounded-2xl p-6 text-center">
              <p class="text-sm font-semibold text-foreground">No upcoming consultations</p>
              <button onclick="window.app.openBookingModal()" class="btn-lime mt-2 px-3.5 py-1.5 rounded-xl text-xs font-bold">
                Book Consultation
              </button>
            </div>
          `}
        </div>

        <!-- Past Consultations -->
        <div>
          <p class="text-brand-label mb-2 px-1">Consultation History</p>
          <div class="surface-card rounded-2xl divide-y divide-black/5 overflow-hidden">
            ${past.map(pc => `
              <div class="p-3.5">
                <div class="flex items-center justify-between">
                  <p class="text-xs font-bold text-foreground">${pc.prescriberName}</p>
                  <span class="text-[10px] text-muted-foreground font-medium">${pc.bookDate}</span>
                </div>
                <p class="text-[11px] text-muted-foreground mt-0.5">${pc.type} • ${pc.clinicName}</p>
                <p class="text-xs text-foreground/80 mt-1 italic font-light">${pc.summary}</p>
              </div>
            `).join('')}
          </div>
          <button onclick="window.app.openAppointmentHistory('consults')" class="btn-glass-outline w-full py-2.5 rounded-xl text-xs font-bold mt-2">View full history</button>
        </div>
      </div>
    `;
  }

  // 5. Profile Tab
  function renderProfileTab() {
    const container = document.getElementById('tab-profile');
    if (!container) return;

    const u = state.profile;

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Profile Header -->
        <div class="surface-card rounded-2xl p-4 flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-[#0e3017] text-white flex items-center justify-center font-bold text-base shadow-sm">
            ${u.initials}
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-bold text-foreground leading-snug">${u.fullName}</h3>
            <p class="text-xs text-muted-foreground truncate">${u.email}</p>
          </div>
          <button onclick="window.app.openEditProfileScreen()" class="btn-glass-outline px-3 py-1.5 rounded-xl text-xs font-semibold">
            Edit
          </button>
        </div>

        <!-- Personal Info -->
        <div>
          <p class="text-brand-label mb-2 px-1">Personal Details</p>
          <div class="surface-card rounded-2xl divide-y divide-black/5 overflow-hidden text-xs">
            <div class="p-3 flex justify-between items-center">
              <span class="text-muted-foreground">Mobile Phone</span>
              <span class="font-bold text-foreground">${u.phone}</span>
            </div>
            <div class="p-3 flex justify-between items-center">
              <span class="text-muted-foreground">Date of Birth</span>
              <span class="font-bold text-foreground">${u.dateOfBirth}</span>
            </div>
            <div class="p-3 flex justify-between items-center">
              <span class="text-muted-foreground">Medicare Number</span>
              <span class="font-bold text-foreground">${u.medicareNumber} (IRN: ${u.medicareIrn})</span>
            </div>
            <div class="p-3 flex justify-between items-center">
              <span class="text-muted-foreground">Medicare Expiry</span>
              <span class="font-bold text-foreground">${u.medicareExpiry}</span>
            </div>
          </div>
        </div>

        <!-- Documents Section -->
        <div>
          <p class="text-brand-label mb-2 px-1">Clinical Documents</p>
          <div class="surface-card rounded-2xl p-3.5 flex items-center justify-between cursor-pointer active:scale-[0.99]" onclick="window.app.openDocumentsModal()">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              </div>
              <div>
                <p class="text-xs font-bold text-foreground">Treatment Plan & TGA Forms</p>
                <p class="text-[11px] text-muted-foreground">${state.documents.length} official clinical records</p>
              </div>
            </div>
            <span class="text-emerald-800 text-xs font-bold">View ➔</span>
          </div>
        </div>

        <!-- Delivery & Payment -->
        <div>
          <p class="text-brand-label mb-2 px-1">Shipping & Delivery</p>
          <div class="surface-card rounded-2xl p-3.5 space-y-1 text-xs relative">
            <p class="font-bold text-foreground">${u.deliveryAddress.line1}</p>
            <p class="text-muted-foreground">${u.deliveryAddress.suburb}, ${u.deliveryAddress.state} ${u.deliveryAddress.postcode}</p>
            <p class="text-[11px] text-emerald-800 italic mt-1 font-light">${u.deliveryAddress.notes}</p>
            <button onclick="window.app.openAddressEditor()" class="btn-glass-outline px-3 py-1.5 rounded-lg text-[10px] font-bold mt-2">Edit address</button>
          </div>
          <div class="surface-card rounded-2xl p-3.5 flex items-center justify-between mt-2">
            <div>
              <p class="text-xs font-bold text-foreground">Payment methods</p>
              <p class="text-[11px] text-muted-foreground mt-0.5">${u.paymentMethod || 'Add a secure payment method.'}</p>
            </div>
            <button onclick="window.app.openPaymentEditor()" class="btn-lime px-3 py-1.5 rounded-lg text-[10px] font-bold">Add payment</button>
          </div>
        </div>

        <!-- History -->
        <div>
          <p class="text-brand-label mb-2 px-1">Order & Appointment History</p>
          <div class="space-y-2">
            <button onclick="window.app.openOrderHistory()" class="detail-action-card w-full rounded-2xl p-3.5 flex items-center justify-between text-left">
              <span><span class="block text-xs font-bold text-foreground">Order history</span><span class="block text-[11px] text-muted-foreground mt-0.5">View your medication orders and delivery updates.</span></span><span class="text-emerald-800 text-xs font-bold">View →</span>
            </button>
            <button onclick="window.app.openAppointmentHistory()" class="detail-action-card w-full rounded-2xl p-3.5 flex items-center justify-between text-left">
              <span><span class="block text-xs font-bold text-foreground">Appointment history</span><span class="block text-[11px] text-muted-foreground mt-0.5">Review past consultations and outcomes.</span></span><span class="text-emerald-800 text-xs font-bold">View →</span>
            </button>
          </div>
        </div>

        <!-- My Signature -->
        <div>
          <p class="text-brand-label mb-2 px-1">My Signature</p>
          <div class="surface-card rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">✎</div>
              <div class="min-w-0">
                <p class="text-xs font-bold text-foreground">My Signature</p>
                <p class="text-[11px] text-muted-foreground">${u.signature?.label || 'No signature saved yet'}</p>
              </div>
            </div>
            ${u.signature?.data ? `<img src="${u.signature.data}" alt="Saved signature" class="profile-signature-preview">` : (u.signature?.label ? `<span class="profile-signature-typed">${u.signature.label}</span>` : '')}
            <button onclick="window.app.openSignatureModal()" class="btn-glass-outline px-3 py-1.5 rounded-xl text-xs font-bold shrink-0">${u.signature?.data || u.signature?.label ? 'Edit Signature' : 'Add Signature'}</button>
          </div>
        </div>

        <!-- Security & Legal -->
        <div>
          <p class="text-brand-label mb-2 px-1">Account & Security</p>
          <div class="surface-card rounded-2xl divide-y divide-black/5 overflow-hidden text-xs">
            <div class="p-3 flex justify-between items-center">
              <span>Two-Factor Authentication</span>
              <button onclick="window.app.toggle2FA()" class="chip ${u.twoFactorEnabled ? 'chip-active' : ''}">
                ${u.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <div class="p-3 flex justify-between items-center cursor-pointer" onclick="window.app.sendPasswordResetEmail()">
              <span>Change Password</span>
              <span class="text-muted-foreground">➔</span>
            </div>
          </div>
        </div>

        <!-- Account Actions (Sign Out & Reset) -->
        <div class="pt-3 text-center space-y-2">
          <button onclick="window.app.logout()" class="btn-glass-danger w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Sign Out of Patient Account
          </button>
          <button onclick="window.app.resetDemoData()" class="text-xs text-muted-foreground hover:text-red-600 font-semibold underline block mx-auto pt-1">
            Reset Demo Data to Original
          </button>
        </div>
      </div>
    `;
  }

  // ── Cart & Multi-Step Checkout Modal ──
  let checkoutStep = 1;
  let checkoutPaymentMethod = 'Credit Card';
  let checkoutShippingMethod = 'Delivery';
  let checkoutDispenser = 'Luke Wale';
  let pendingPayIdPayment = null;

  function renderCheckoutProgress(currentStep) {
    const labels = ['Cart', 'Delivery', 'Payment', 'Confirm'];
    return `<div class="checkout-progress" aria-label="Checkout progress"><div class="checkout-progress-line" aria-hidden="true"></div>${labels.map((label, index) => { const step = index + 1; const stateClass = step < currentStep ? 'is-complete' : step === currentStep ? 'is-current' : ''; return `<div class="checkout-progress-step ${stateClass}"><span class="checkout-progress-dot">${step < currentStep ? '✓' : step}</span><span>${label}</span></div>`; }).join('')}</div>`;
  }

  function renderCartDrawer() {
    const container = document.getElementById('cart-modal-content');
    if (!container) return;
    if (checkoutStep > 1) {
      renderCheckoutStep(checkoutStep);
      return;
    }

    const totalItems = cart.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const courierFee = subtotal > 0 ? 15.00 : 0.00;
    const grandTotal = subtotal + courierFee;

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center space-y-3">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          </div>
          <h3 class="text-base font-bold text-foreground">Your cart is empty</h3>
          <p class="text-xs text-muted-foreground">Add medications or device refills from your prescriptions.</p>
          <button onclick="window.app.closeCartModal(); window.app.switchTab('scripts');" class="btn-lime px-4 py-2 rounded-xl text-xs font-bold mt-2">
            View Prescriptions
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="p-4 space-y-4">
        ${renderCheckoutProgress(1)}
        <!-- Item List -->
        <div class="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
          ${cart.map(item => `
            <div class="surface-card rounded-xl p-3 flex items-center gap-3">
              <div class="w-12 h-12 rounded-lg bg-white border border-black/5 flex items-center justify-center shrink-0">
                <svg class="w-6 h-6 text-emerald-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4.5" y="2.5" width="15" height="19" rx="7.5" transform="rotate(-45 12 12)" /><line x1="5.6" y1="18.4" x2="18.4" y2="5.6" /></svg>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-foreground truncate">${item.name}</h4>
                <p class="text-[11px] text-muted-foreground">${item.strength || item.form}</p>
                <p class="text-xs font-bold text-emerald-800 mt-0.5">$${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <div class="qty-stepper shrink-0">
                <button onclick="window.app.updateCartQty('${item.id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button onclick="window.app.updateCartQty('${item.id}', 1)">+</button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Delivery & Address Summary -->
        <div class="p-3 rounded-xl bg-white/70 border border-black/5 text-xs space-y-1">
          <div class="flex justify-between items-center text-muted-foreground">
            <span class="font-bold text-foreground">Delivery Destination</span>
            <span class="text-emerald-800 font-bold">Express Medical Post</span>
          </div>
          <p class="text-foreground">${state.profile.deliveryAddress.line1}, ${state.profile.deliveryAddress.suburb} ${state.profile.deliveryAddress.state} ${state.profile.deliveryAddress.postcode}</p>
        </div>

        <!-- Payment Method Toggle -->
        <div class="legacy-cart-payment space-y-1.5">
          <p class="text-brand-label">Select Payment</p>
          <div class="grid grid-cols-2 gap-2 text-xs font-semibold">
            <label class="surface-card rounded-xl p-2.5 flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment-method" value="cc" checked class="accent-emerald-700">
              <span>Credit Card</span>
            </label>
            <label class="surface-card rounded-xl p-2.5 flex items-center gap-2 cursor-pointer">
              <input type="radio" name="payment-method" value="payid" class="accent-emerald-700">
              <span>PayID Instant</span>
            </label>
          </div>
        </div>

        <!-- Summary Calculation -->
        <div class="surface-card rounded-xl p-3 space-y-1.5 text-xs">
          <div class="flex justify-between text-muted-foreground">
            <span>Medications Subtotal</span>
            <span class="font-bold text-foreground">$${subtotal.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-muted-foreground">
            <span>Express Courier (TGA Compliant)</span>
            <span class="font-bold text-foreground">$${courierFee.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-sm font-bold text-foreground pt-1.5 border-t border-black/5">
            <span>Total Payable</span>
            <span class="text-emerald-800">$${grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <!-- Checkout Button -->
        <button onclick="window.app.openCheckoutStep()" class="btn-primary-green w-full py-3 rounded-xl text-sm font-bold shadow-lg">
          Proceed to checkout
        </button>
      </div>
    `;
  }

  function openCheckoutStep() {
    if (cart.length === 0) return;
    checkoutStep = 2;
    pendingPayIdPayment = null;
    renderCheckoutStep(checkoutStep);
  }

  function selectCheckoutShipping(method) {
    checkoutShippingMethod = method;
    renderCheckoutStep(2);
  }

  function selectCheckoutDispenser(name) {
    checkoutDispenser = name;
    renderCheckoutStep(2);
  }

  function continueToCheckoutPayment() {
    checkoutStep = 3;
    renderCheckoutStep(3);
  }

  function selectCheckoutPayment(method) {
    checkoutPaymentMethod = method;
    renderCheckoutStep(3);
  }

  function renderCheckoutStep(step) {
    const container = document.getElementById('cart-modal-content');
    if (!container) return;
    if (step === 2) {
      renderCheckoutDeliveryStep();
      return;
    }
    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const grandTotal = subtotal + 15;
    const address = state.profile.deliveryAddress;
    container.innerHTML = `<div class="checkout-screen p-5 space-y-5">${renderCheckoutProgress(step)}<div><p class="text-brand-label">Step 3 of 4: Payment</p><h3 class="text-lg font-bold text-foreground mt-1">Choose your payment method</h3><p class="text-xs text-muted-foreground mt-1">Your order will be delivered to your saved address.</p></div><div class="detail-action-card rounded-2xl p-4"><p class="text-brand-label mb-2">Delivery</p><p class="text-sm font-bold text-foreground">${address.line1}</p><p class="text-xs text-muted-foreground mt-1">${address.suburb}, ${address.state} ${address.postcode}</p></div><div class="space-y-2"><button onclick="window.app.selectCheckoutPayment('Credit Card')" class="checkout-payment-card ${checkoutPaymentMethod === 'Credit Card' ? 'is-selected' : ''}"><span class="checkout-payment-icon">▣</span><span><b>Debit / Credit Card</b><small>Secure demo payment</small></span><span>${checkoutPaymentMethod === 'Credit Card' ? '✓' : '○'}</span></button><button onclick="window.app.selectCheckoutPayment('PayID')" class="checkout-payment-card ${checkoutPaymentMethod === 'PayID' ? 'is-selected' : ''}"><span class="checkout-payment-icon">◎</span><span><b>PayID / Bank Transfer</b><small>Pay directly from your bank</small></span><span>${checkoutPaymentMethod === 'PayID' ? '✓' : '○'}</span></button></div><div class="detail-action-card rounded-2xl p-4 space-y-2 text-xs"><div class="flex justify-between"><span class="text-muted-foreground">Items</span><span class="font-bold text-foreground">$${subtotal.toFixed(2)}</span></div><div class="flex justify-between"><span class="text-muted-foreground">Express delivery</span><span class="font-bold text-foreground">$15.00</span></div><div class="flex justify-between border-t border-black/5 pt-2 text-sm"><span class="font-bold text-foreground">Total</span><span class="font-bold text-emerald-800">$${grandTotal.toFixed(2)}</span></div></div><button onclick="window.app.submitCheckout()" class="btn-primary-green w-full py-3 rounded-xl text-sm font-bold">Confirm & Pay</button></div>`;
  }

  function renderCheckoutDeliveryStep() {
    const container = document.getElementById('cart-modal-content');
    if (!container) return;
    const address = state.profile.deliveryAddress;
    const phone = state.profile.phone || '0412 635 879';
    const recipient = state.profile.fullName || 'Test User';
    const dispensers = [
      { name: 'Luke Wale', location: 'Shop G4 Earle Plaza, 52 Price Street, Nerang QLD 4211', phone: '07 5578 1220' },
      { name: 'Zahra Al Awady', location: '340 Princes Highway, Officer VIC 3809', phone: '03 5925 7770' }
    ];

    container.innerHTML = `
      <div class="checkout-screen p-5 space-y-5">
        ${renderCheckoutProgress(2)}
        <div>
          <p class="text-brand-label">Step 2 of 4: Delivery</p>
          <h3 class="text-lg font-bold text-foreground mt-1">Delivery details</h3>
          <p class="text-xs text-muted-foreground mt-1">${checkoutShippingMethod === 'Pickup' ? 'Where would you like to collect your order?' : 'Where should we deliver your order?'}</p>
        </div>

        <div class="detail-action-card rounded-2xl p-4 space-y-3">
          <p class="text-brand-label">Shipping method</p>
          <div class="grid grid-cols-2 gap-2">
            <button onclick="window.app.selectCheckoutShipping('Delivery')" class="checkout-payment-card ${checkoutShippingMethod === 'Delivery' ? 'is-selected' : ''} text-left">
              <span class="checkout-payment-icon">⌁</span><span><b>Delivery</b><small>Delivered to your address</small></span>
            </button>
            <button onclick="window.app.selectCheckoutShipping('Pickup')" class="checkout-payment-card ${checkoutShippingMethod === 'Pickup' ? 'is-selected' : ''} text-left">
              <span class="checkout-payment-icon">▣</span><span><b>Pickup</b><small>Collect from pharmacy</small></span>
            </button>
          </div>

          <label class="text-[10px] font-bold uppercase text-muted-foreground">Recipient name<input value="${recipient}" readonly class="auth-input mt-1 bg-gray-50"></label>
          <label class="text-[10px] font-bold uppercase text-muted-foreground">Phone number<input value="${phone}" readonly class="auth-input mt-1 bg-gray-50"></label>

          ${checkoutShippingMethod === 'Delivery' ? `
            <div>
              <p class="text-[10px] font-bold uppercase text-muted-foreground mb-1">Delivery address</p>
              <div class="p-3 rounded-xl bg-white border border-black/5 flex items-start justify-between gap-3">
                <div><p class="text-xs font-bold text-foreground">Saved address</p><p class="text-[11px] text-muted-foreground mt-1">${address.line1}<br>${address.suburb}, ${address.state} ${address.postcode}</p></div>
                <span class="status-pill emerald text-[10px]">Selected</span>
              </div>
            </div>
          ` : ''}

          <div>
            <p class="text-[10px] font-bold uppercase text-muted-foreground mb-1">${checkoutShippingMethod === 'Pickup' ? 'Select pickup location' : 'Select fulfilling dispenser'}</p>
            <div class="space-y-2">
              ${dispensers.map(d => `<button onclick="window.app.selectCheckoutDispenser('${d.name}')" class="w-full text-left p-3 rounded-xl border ${checkoutDispenser === d.name ? 'border-emerald-700 bg-emerald-50/70' : 'border-black/10 bg-white/70'} flex items-start gap-2"><span class="checkout-payment-icon shrink-0">▣</span><span class="min-w-0 flex-1"><b class="block text-xs text-foreground">${d.name}</b><small class="block text-[10px] text-muted-foreground mt-0.5">${d.location}</small><small class="block text-[10px] text-muted-foreground">☎ ${d.phone}</small></span><span class="text-emerald-700 font-bold">${checkoutDispenser === d.name ? '✓' : '○'}</span></button>`).join('')}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3">
          <button onclick="window.app.openCartModal()" class="btn-glass-outline px-4 py-2.5 rounded-xl text-xs font-bold">← Back to cart</button>
          <button onclick="window.app.continueToCheckoutPayment()" class="btn-primary-green px-4 py-2.5 rounded-xl text-xs font-bold">Continue to payment →</button>
        </div>
      </div>
    `;
  }

  function showOrderConfirmation(orderId) {
    const container = document.getElementById('cart-modal-content');
    if (!container) return;
    container.innerHTML = `<div class="order-confirmation-screen"><div class="order-confirmation-circle"><span>✓</span></div><p class="text-brand-label mt-5">Order confirmed</p><h3 class="text-xl font-extrabold text-[#0e3017] mt-1">Your order is on its way</h3><p class="text-xs text-muted-foreground mt-2">Order ${orderId} has been placed successfully.</p></div>`;
    setTimeout(() => { closeCartModal(); switchTab('products'); }, 2000);
  }

  function copyPayIdValue(value) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => showToast('Copied to clipboard.', 'success'));
      return;
    }
    showToast(value, 'info');
  }

  function renderPayIdPaymentScreen() {
    const container = document.getElementById('cart-modal-content');
    if (!container || !pendingPayIdPayment) return;

    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const grandTotal = subtotal + 15;
    const address = state.profile.deliveryAddress;
    const reference = pendingPayIdPayment.reference;

    container.innerHTML = `
      <div class="checkout-screen p-5 space-y-4">
        <button onclick="window.app.backToCheckoutPayment()" class="text-sm font-semibold text-emerald-900 inline-flex items-center gap-2">
          <span class="text-lg leading-none">‹</span> Back
        </button>

        <div class="detail-action-card rounded-2xl p-4 space-y-4">
          <div>
            <h3 class="text-base font-bold text-foreground">PayID / Bank Transfer</h3>
            <p class="text-[11px] text-muted-foreground mt-1">Pay directly from your bank. No card surcharge.</p>
            <span class="inline-flex mt-2 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">0% Fees!</span>
          </div>

          <div class="space-y-2 text-[11px]">
            <p class="text-brand-label">PayID</p>
            <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-black/5">
              <span class="font-semibold text-foreground">payments@cannaquest.com.au</span>
              <button onclick="window.app.copyPayIdValue('payments@cannaquest.com.au')" class="btn-glass-outline px-2 py-1 rounded-lg text-[10px] font-bold">Copy</button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-[11px]">
            <div><p class="text-brand-label">BSB</p><p class="font-semibold text-foreground mt-1">082356</p></div>
            <div><p class="text-brand-label">Account Number</p><p class="font-semibold text-foreground mt-1">775060933</p></div>
          </div>

          <div>
            <p class="text-brand-label">Amount to pay</p>
            <p class="text-xl font-extrabold text-foreground mt-1">$${grandTotal.toFixed(2)}</p>
          </div>

          <div class="space-y-1">
            <p class="text-brand-label">Payment reference</p>
            <div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span class="font-bold text-emerald-900">${reference}</span>
              <button onclick="window.app.copyPayIdValue('${reference}')" class="btn-glass-outline px-2 py-1 rounded-lg text-[10px] font-bold">Copy</button>
            </div>
            <p class="text-[10px] text-amber-700">Please include this reference in your transfer so we can match your payment.</p>
          </div>

          <p class="text-[10px] text-muted-foreground border-t border-black/5 pt-3">Orders are processed once payment clears. This demo reference expires today.</p>
          <button onclick="window.app.markPayIdPaid()" class="btn-lime w-full py-2.5 rounded-xl text-xs font-bold">Mark As Paid</button>
        </div>

        <div class="detail-action-card rounded-2xl p-4 space-y-2 text-xs">
          <h4 class="text-sm font-bold text-foreground mb-2">Order Summary</h4>
          ${cart.map(item => `<div class="flex justify-between gap-3"><span class="text-muted-foreground">${item.name} × ${item.quantity}</span><span class="font-semibold text-foreground">$${(item.price * item.quantity).toFixed(2)}</span></div>`).join('')}
          <div class="flex justify-between border-t border-black/5 pt-2"><span class="text-muted-foreground">Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Shipping</span><span>$15.00</span></div>
          <div class="flex justify-between text-sm font-bold border-t border-black/5 pt-2"><span>Total</span><span class="text-emerald-800">$${grandTotal.toFixed(2)}</span></div>
          <div class="border-t border-black/5 pt-3 mt-2"><p class="text-brand-label">Delivering to</p><p class="font-semibold text-foreground mt-1">${state.profile.fullName || 'Test User'}</p><p class="text-muted-foreground">${state.profile.phone || '0412 635 879'}</p><p class="text-muted-foreground mt-1">${address.line1}, ${address.suburb}, ${address.state} ${address.postcode}</p></div>
        </div>
      </div>
    `;
  }

  function backToCheckoutPayment() {
    pendingPayIdPayment = null;
    renderCheckoutStep(3);
  }

  function markPayIdPaid() {
    if (!pendingPayIdPayment) return;
    submitCheckout(true);
  }

  function submitCheckout(paymentConfirmed = false) {
    if (cart.length === 0) return;

    if (checkoutPaymentMethod === 'PayID' && !paymentConfirmed) {
      pendingPayIdPayment = {
        reference: `CQ-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      };
      renderPayIdPaymentScreen();
      return;
    }

    const orderId = `CQ-${Math.floor(10000 + Math.random() * 90000)}-AU`;
    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const grandTotal = subtotal + 15.00;

    const newOrder = {
      id: Date.now(),
      uuid: orderId,
      createdAt: "Just now",
      totalAmount: grandTotal,
      status: "In Transit",
      statusColor: "emerald",
      shippingSummary: "Express Medical Courier • Dispatched from Sydney Pharmacy",
      items: JSON.parse(JSON.stringify(cart)),
      progressSteps: [
        { name: "Order Placed", status: "completed" },
        { name: "Pharmacy Verified", status: "completed" },
        { name: "In Transit", status: "current" },
        { name: "Delivered", status: "pending" }
      ],
      deliveryAddress: checkoutShippingMethod === 'Pickup'
        ? `Pickup from ${checkoutDispenser}`
        : `${state.profile.deliveryAddress.line1}, ${state.profile.deliveryAddress.suburb} ${state.profile.deliveryAddress.state} ${state.profile.deliveryAddress.postcode}`,
      shippingMethod: checkoutShippingMethod,
      fulfillingDispenser: checkoutDispenser,
      paymentMethod: `${checkoutPaymentMethod} (Instant Clearance)`
    };

    // Decrement repeats on prescriptions
    cart.forEach(cartItem => {
      if (cartItem.prescriptionId) {
        const rx = state.prescriptions.find(p => p.id === cartItem.prescriptionId);
        if (rx && rx.remainingRepeats > 0) {
          rx.remainingRepeats -= 1;
          rx.redeemedRepeats += 1;
        }
      }
    });

    state.orders.unshift(newOrder);
    saveState(state);

    cart = [];
    saveCart();
    pendingPayIdPayment = null;
    checkoutStep = 4;
    showOrderConfirmation(orderId);
  }

  // ── Telehealth Live Call Simulation ──
  function launchTelehealthCall(consultId) {
    const modal = document.getElementById('telehealth-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    let seconds = 0;
    const timerEl = document.getElementById('telehealth-timer');
    if (window._callInterval) clearInterval(window._callInterval);
    window._callInterval = setInterval(() => {
      seconds++;
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      if (timerEl) timerEl.textContent = `${m}:${s}`;
    }, 1000);
  }

  function closeTelehealthCall() {
    const modal = document.getElementById('telehealth-modal');
    if (modal) modal.classList.add('hidden');
    if (window._callInterval) clearInterval(window._callInterval);
    showToast('Consultation session ended. Summary saved to history.', 'info');
  }

  function rescheduleConsult(consultId) {
    const consult = state.upcomingConsultations.find(item => item.id === consultId);
    if (!consult) return;
    openBookingModal();
    showToast(`Choose a new time for your appointment with ${consult.prescriberName}.`, 'info');
  }

  function cancelConsult(consultId) {
    const index = state.upcomingConsultations.findIndex(item => item.id === consultId);
    if (index < 0) return;
    const consult = state.upcomingConsultations[index];
    if (!window.confirm(`Cancel your appointment with ${consult.prescriberName}?`)) return;

    state.upcomingConsultations.splice(index, 1);
    saveState(state);
    renderConsultsTab();
    showToast('Appointment cancelled.', 'success');
  }

  // ── "Call Me" Interactive Feature ──
  function triggerCallMe() {
    const widget = document.getElementById('call-me-widget');
    if (!widget) return;

    widget.innerHTML = `
      <div class="flex items-center gap-3 w-full">
        <div class="relative w-10 h-10 shrink-0">
          <span class="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping"></span>
          <div class="relative w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white">
            <svg class="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
          </div>
        </div>
        <div class="flex-1">
          <p class="text-xs font-bold text-emerald-900">Calling your mobile now…</p>
          <p class="text-[11px] text-emerald-800">Your phone ending in 203 will ring in 3 seconds.</p>
        </div>
        <button onclick="window.app.renderHomeTab()" class="text-xs font-semibold text-gray-500 hover:text-gray-800">
          Cancel
        </button>
      </div>
    `;

    setTimeout(() => {
      showToast('Incoming clinical team call initiated to 0412 849 203', 'success');
    }, 2500);
  }

  // ── Booking Wizard Modal ──
  function openBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderBookingStep(1);
  }

  function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) modal.classList.add('hidden');
  }

  let bookingState = {
    clinic: 'CannaQuest Telehealth Hub',
    practitioner: 'Dr. Lachlan Vance',
    date: '14 Oct 2026',
    dateKey: '',
    calendarMonthKey: '',
    time: '11:30 AM',
    reason: ''
  };

  const bookingTimes = ['8:30 AM', '10:00 AM', '11:30 AM', '1:00 PM', '2:15 PM', '3:45 PM'];

  function bookingDateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }

  function bookingMonthKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), '01'].join('-');
  }

  function formatBookingDate(date) {
    return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function formatBookingDateLong(dateKey) {
    const date = new Date(`${dateKey}T00:00:00`);
    return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function ensureBookingDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let selected = bookingState.dateKey ? new Date(`${bookingState.dateKey}T00:00:00`) : null;
    if (!selected || selected < today) {
      selected = new Date(today);
      selected.setDate(today.getDate() + 1);
    }
    bookingState.dateKey = bookingDateKey(selected);
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    let visibleMonth = bookingState.calendarMonthKey ? new Date(`${bookingState.calendarMonthKey}T00:00:00`) : new Date(selected.getFullYear(), selected.getMonth(), 1);
    if (visibleMonth < currentMonth) visibleMonth = currentMonth;
    bookingState.calendarMonthKey = bookingMonthKey(visibleMonth);
    bookingState.date = formatBookingDate(selected);
    if (!bookingTimes.includes(bookingState.time)) bookingState.time = bookingTimes[0];
    return { today, selected };
  }

  function captureBookingNotes() {
    const notes = document.getElementById('booking-notes');
    if (notes && notes.value.trim()) bookingState.reason = notes.value.trim();
  }

  function selectBookingDate(dateKey) {
    captureBookingNotes();
    bookingState.dateKey = dateKey;
    bookingState.calendarMonthKey = `${dateKey.slice(0, 7)}-01`;
    bookingState.time = bookingTimes[0];
    renderBookingStep(3);
  }

  function selectBookingMonth(direction) {
    captureBookingNotes();
    const { today } = ensureBookingDate();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const visibleMonth = new Date(`${bookingState.calendarMonthKey}T00:00:00`);
    visibleMonth.setMonth(visibleMonth.getMonth() + direction);
    if (visibleMonth < currentMonth) return;
    bookingState.calendarMonthKey = bookingMonthKey(visibleMonth);
    renderBookingStep(3);
  }

  function selectBookingTime(time) {
    captureBookingNotes();
    bookingState.time = time;
    renderBookingStep(3);
  }

  function renderBookingProgress(currentStep) {
    const labels = ['Clinic', 'Practitioner', 'Date & time', 'Confirm'];
    return `<div class="booking-progress" aria-label="Booking progress">
      <div class="booking-progress-line" aria-hidden="true"></div>
      ${labels.map((label, index) => {
        const step = index + 1;
        const stateClass = step < currentStep ? 'is-complete' : (step === currentStep ? 'is-current' : 'is-upcoming');
        return `<div class="booking-progress-step ${stateClass}"><div class="booking-progress-dot">${step < currentStep ? '✓' : step}</div><span>${label}</span></div>`;
      }).join('')}
    </div>`;
  }

  function renderBookingStepLegacy(step) {
    const content = document.getElementById('booking-modal-content');
    if (!content) return;

    if (step === 1) {
      content.innerHTML = `
        <div class="p-4 space-y-3">
          ${renderBookingProgress(1)}
          <p class="text-brand-label">Step 1 of 3: Choose Practitioner</p>
          <div class="space-y-2">
            <label class="surface-card rounded-xl p-3 flex items-center justify-between cursor-pointer border border-emerald-600">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-800">LV</div>
                <div>
                  <p class="text-xs font-bold text-foreground">Dr. Lachlan Vance</p>
                  <p class="text-[11px] text-muted-foreground">Authorised Prescriber • Chronic Pain & Sleep</p>
                </div>
              </div>
              <input type="radio" name="book-doc" value="Dr. Lachlan Vance" checked class="accent-emerald-700">
            </label>
            <label class="surface-card rounded-xl p-3 flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700">EC</div>
                <div>
                  <p class="text-xs font-bold text-foreground">Dr. Emily Chen</p>
                  <p class="text-[11px] text-muted-foreground">General Practice & Botanical Medicine</p>
                </div>
              </div>
              <input type="radio" name="book-doc" value="Dr. Emily Chen" class="accent-emerald-700">
            </label>
          </div>
          <button onclick="window.app.renderBookingStep(2)" class="btn-primary-green w-full py-2.5 rounded-xl text-xs font-bold mt-3">
            Next: Select Time Slot ➔
          </button>
        </div>
      `;
    } else if (step === 2) {
      const calendarState = ensureBookingDate();
      const visibleMonth = new Date(`${bookingState.calendarMonthKey}T00:00:00`);
      const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
      const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
      const leadingDays = monthStart.getDay();
      const monthLabel = visibleMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      const calendarCells = Array.from({ length: leadingDays + daysInMonth }, (_, index) => {
        if (index < leadingDays) return '<span></span>';
        const day = index - leadingDays + 1;
        const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
        const key = bookingDateKey(date);
        const isPast = date < calendarState.today;
        const isSelected = key === bookingState.dateKey;
        return `<button type="button" ${isPast ? 'disabled' : `onclick="window.app.selectBookingDate('${key}')"`} class="booking-calendar-day ${isPast ? 'is-past' : ''} ${isSelected ? 'is-selected' : ''}">${day}</button>`;
      }).join('');

      content.innerHTML = `
        <div class="p-4 space-y-3">
          ${renderBookingProgress(2)}
          <p class="text-brand-label">Step 2 of 3: Date & Time</p>
          <div class="booking-selection-section modern-booking-section booking-input-section">
            <div class="booking-date-header flex items-center justify-between mb-3">
              <p class="text-xs font-bold text-foreground">Date</p>
              <div class="booking-month-controls">
                <button type="button" onclick="window.app.selectBookingMonth(-1)" class="booking-month-arrow" aria-label="Previous month" ${visibleMonth <= new Date(calendarState.today.getFullYear(), calendarState.today.getMonth(), 1) ? 'disabled' : ''}>‹</button>
                <span class="text-[10px] font-semibold text-muted-foreground">${monthLabel}</span>
                <button type="button" onclick="window.app.selectBookingMonth(1)" class="booking-month-arrow" aria-label="Next month">›</button>
              </div>
            </div>
            <div class="booking-weekdays">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => `<span>${day}</span>`).join('')}</div>
            <div class="booking-calendar-grid">${calendarCells}</div>
            <p class="text-[10px] text-muted-foreground mt-2">Past dates are unavailable.</p>
          </div>
          <div class="booking-selection-section modern-booking-section booking-input-section">
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-bold text-foreground">Time</p>
              <span class="text-[10px] text-muted-foreground">${bookingState.date}</span>
            </div>
            <div class="booking-time-scroller" aria-label="Available appointment times">${bookingTimes.map(time => `<button type="button" onclick="window.app.selectBookingTime('${time}')" class="booking-time-slot ${bookingState.time === time ? 'is-selected' : ''}">${time}</button>`).join('')}</div>
          </div>
          <div class="booking-summary-card rounded-2xl p-3 flex items-center gap-3 modern-booking-section">
            <div class="booking-summary-icon"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13H4V6a1 1 0 011-1z"/></svg></div>
            <div><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Appointment summary</p><p class="text-xs font-bold text-foreground mt-0.5">Your appointment is on ${formatBookingDateLong(bookingState.dateKey)} at ${bookingState.time}.</p></div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs legacy-booking-options" style="display:none">
            <button class="chip chip-active py-2">Thu, 15 Oct</button>
            <button class="chip py-2">Fri, 16 Oct</button>
            <button class="chip py-2">Mon, 19 Oct</button>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs mt-2 legacy-booking-options" style="display:none">
            <button class="surface-card rounded-xl p-2 font-bold text-foreground border border-emerald-600">10:00 AM</button>
            <button class="surface-card rounded-xl p-2 font-bold text-foreground">11:30 AM</button>
            <button class="surface-card rounded-xl p-2 font-bold text-foreground">2:15 PM</button>
          </div>
          <div class="mt-3">
            <p class="text-brand-label mb-1">Reason for Consultation</p>
            <textarea id="booking-notes" class="w-full rounded-xl bg-white/70 border border-gray-200 p-2 text-xs" rows="2" placeholder="Brief note for the prescribing doctor…"></textarea>
          </div>
          <button onclick="window.app.captureBookingNotes(); window.app.renderBookingStep(3)" class="btn-primary-green w-full py-2.5 rounded-xl text-xs font-bold mt-2">
            Review & Confirm ➔
          </button>
        </div>
      `;
    } else if (step === 3) {
      content.innerHTML = `
        <div class="p-4 space-y-3">
          ${renderBookingProgress(3)}
          <p class="text-brand-label">Step 3 of 3: Confirm Booking</p>
          <div class="surface-card rounded-xl p-3.5 space-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Clinic:</span>
              <span class="font-bold text-foreground">${bookingState.clinic}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Doctor:</span>
              <span class="font-bold text-foreground">Dr. Lachlan Vance</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Date & Time:</span>
              <span class="font-bold text-foreground">${bookingState.date} · ${bookingState.time}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Type:</span>
              <span class="font-bold text-emerald-800">Telehealth Video Call</span>
            </div>
            ${bookingState.reason ? `
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground shrink-0">Reason:</span>
              <span class="font-bold text-foreground text-right">${bookingState.reason}</span>
            </div>
            ` : ''}
          </div>
          <button onclick="window.app.confirmBooking()" class="btn-primary-green w-full py-3 rounded-xl text-xs font-bold">
            Confirm Appointment
          </button>
        </div>
      `;
    }
  }

  function renderBookingStep(step) {
    const content = document.getElementById('booking-modal-content');
    if (!content) return;

    if (step === 1) {
      content.innerHTML = `
        <div class="p-4 space-y-3">
          ${renderBookingProgress(1)}
          <p class="text-brand-label">Step 1 of 4: Choose Clinic</p>
          <p class="text-xs text-muted-foreground">Choose a clinic for your consultation.</p>
          <div class="space-y-2">
            <button type="button" onclick="window.app.selectBookingClinic('PurePath')" class="surface-card rounded-xl p-3.5 w-full flex items-center justify-between text-left border border-emerald-600">
              <span><span class="block text-sm font-bold text-foreground">PurePath</span><span class="block text-[11px] text-muted-foreground mt-0.5">Nerang, QLD</span></span><span class="text-emerald-700 font-bold">✓</span>
            </button>
            <button type="button" onclick="window.app.selectBookingClinic('CannaQuest Telehealth Hub')" class="surface-card rounded-xl p-3.5 w-full flex items-center justify-between text-left">
              <span><span class="block text-sm font-bold text-foreground">CannaQuest Telehealth Hub</span><span class="block text-[11px] text-muted-foreground mt-0.5">Online telehealth clinic</span></span><span class="text-xs text-muted-foreground">›</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    const legacyStep = step === 2 ? 1 : (step === 3 ? 2 : 3);
    renderBookingStepLegacy(legacyStep);
    const progress = content.querySelector('.booking-progress');
    if (progress) progress.outerHTML = renderBookingProgress(step);
    const heading = content.querySelector('.text-brand-label');
    if (heading) heading.textContent = step === 2 ? 'Step 2 of 4: Choose Practitioner' : (step === 3 ? 'Step 3 of 4: Date & Time' : 'Step 4 of 4: Confirm Booking');
    if (step === 2) {
      content.innerHTML = content.innerHTML.replaceAll('window.app.renderBookingStep(2)', 'window.app.renderBookingStep(3)').replace('Next: Select Time Slot', 'Next: Select Date & Time');
    } else if (step === 3) {
      content.innerHTML = content.innerHTML.replaceAll('window.app.renderBookingStep(3)', 'window.app.renderBookingStep(4)');
    }
  }

  function selectBookingClinic(clinic) {
    bookingState.clinic = clinic;
    renderBookingStep(2);
  }

  function confirmBooking() {
    captureBookingNotes();
    const newConsult = {
      id: `CONS-${Math.floor(1000 + Math.random() * 9000)}`,
      prescriberName: "Dr. Lachlan Vance",
      prescriberTitle: "Authorised Prescriber",
      clinicName: "CannaQuest Telehealth Hub",
      bookDate: `${bookingState.date} 2026`,
      startTime: bookingState.time,
      timeUntil: `UPCOMING • ${bookingState.time} AEST`,
      canJoin: false,
      type: "Video Telehealth Call",
      purpose: bookingState.reason || 'Consultation booking'
    };
    state.upcomingConsultations.unshift(newConsult);
    saveState(state);
    closeBookingModal();
    showToast('Consultation booked with Dr. Lachlan Vance!', 'success');
    renderConsultsTab();
  }

  // ── Consumption Calendar Modal ──
  function openConsumptionCalendar() {
    const modal = document.getElementById('calendar-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    renderCalendarContent();
  }

  function closeConsumptionCalendar() {
    const modal = document.getElementById('calendar-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderCalendarContent() {
    const content = document.getElementById('calendar-modal-content');
    if (!content) return;

    // October 2026 demo calendar
    content.innerHTML = `
      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-label">Prescription Continuity</p>
            <h3 class="text-base font-bold text-foreground">October 2026</h3>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span class="font-medium text-muted-foreground">Refill Eligible</span>
          </div>
        </div>

        <!-- 7-day grid -->
        <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 py-1">
          <div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div><div>S</div>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-xs">
          ${Array.from({ length: 31 }).map((_, i) => {
            const day = i + 1;
            const isToday = day === 6;
            const isRefillDue = day === 14 || day === 28;
            return `
              <div class="p-2 rounded-xl text-xs font-semibold ${isToday ? 'bg-[#0e3017] text-white shadow-sm' : (isRefillDue ? 'bg-[#d2ffa0] text-[#0e3017] font-bold' : 'surface-card text-foreground')}">
                ${day}
              </div>
            `;
          }).join('')}
        </div>

        <div class="p-3 rounded-xl bg-emerald-50 text-emerald-900 text-xs space-y-1">
          <p class="font-bold">Next Refill Milestone: 14 October</p>
          <p class="text-[11px] text-emerald-800">Your interval lock for Cannatrek T25 releases in 4 days.</p>
        </div>
      </div>
    `;
  }

  // ── Upload Prescription Modal ──
  function openUploadPrescriptionModal() {
    const modal = document.getElementById('upload-modal');
    pendingPrescriptionFile = null;
    const fileInput = document.getElementById('upload-prescription-file');
    const fileName = document.getElementById('upload-file-name');
    const tokenInput = document.getElementById('upload-erx-token');
    if (fileInput) fileInput.value = '';
    if (fileName) fileName.textContent = 'eRx tokens, PDF scripts, max 10MB';
    if (tokenInput) tokenInput.value = '';
    if (modal) modal.classList.remove('hidden');
  }

  function closeUploadPrescriptionModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.classList.add('hidden');
  }

  function handlePrescriptionFile(event) {
    const file = event?.target?.files?.[0];
    const fileName = document.getElementById('upload-file-name');
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      event.target.value = '';
      pendingPrescriptionFile = null;
      if (fileName) fileName.textContent = 'eRx tokens, PDF scripts, max 10MB';
      showToast('Please choose a file smaller than 10MB.', 'error');
      return;
    }

    pendingPrescriptionFile = file;
    if (fileName) fileName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)}MB selected`;
  }

  function submitUploadedPrescription(e) {
    if (e) e.preventDefault();
    const tokenInput = document.getElementById('upload-erx-token');
    const tokenVal = tokenInput ? tokenInput.value.trim() : '';

    if (!pendingPrescriptionFile && !tokenVal) {
      showToast('Choose a prescription file or enter an eRx token to continue.', 'error');
      return;
    }

    const newRx = {
      id: `RX-${Math.floor(10000 + Math.random() * 90000)}`,
      name: "External Script (Uploaded)",
      manufacturer: "Pending Clinical Verification",
      form: "Flower",
      strength: "TGA Category 5",
      unitPrice: 140.00,
      status: "Awaiting Approval",
      statusColor: "amber",
      repeatTimes: 3,
      remainingRepeats: 3,
      redeemedRepeats: 0,
      prescriber: "External Practitioner",
      erxToken: tokenVal || "eRx-EXT-8891-AU",
      uploadedFileName: pendingPrescriptionFile ? pendingPrescriptionFile.name : null,
      uploadedFileType: pendingPrescriptionFile ? pendingPrescriptionFile.type : null,
      uploadedFileSize: pendingPrescriptionFile ? pendingPrescriptionFile.size : null,
      expiryDate: "30 Dec 2026",
      glowClass: "status-glow-amber",
      isIntervalRestricted: false
    };

    state.prescriptions.unshift(newRx);
    saveState(state);
    pendingPrescriptionFile = null;
    closeUploadPrescriptionModal();
    showToast('Prescription uploaded! Clinical team will review within 24 hours.', 'success');
    renderScriptsTab();
  }

  // ── Product Details Modal ──
  function openProductModal(productId) {
    const modal = document.getElementById('product-modal');
    if (!modal) return;
    const p = state.products.find(item => item.id === productId);
    if (!p) return;

    const content = document.getElementById('product-modal-content');
    content.innerHTML = `
      <div class="p-4 space-y-3">
        <div class="w-full aspect-[4/3] rounded-2xl bg-white border border-black/5 flex items-center justify-center p-4">
          <svg class="w-20 h-20 text-emerald-800/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4.5" y="2.5" width="15" height="19" rx="7.5" transform="rotate(-45 12 12)" /><line x1="5.6" y1="18.4" x2="18.4" y2="5.6" /></svg>
        </div>
        <div>
          <span class="chip text-[10px] font-bold">${p.category}</span>
          <h2 class="text-base font-bold text-foreground mt-1">${p.name}</h2>
          <p class="text-xs text-muted-foreground">${p.manufacturer} • ${p.packageSize}</p>
        </div>
        <p class="text-xs text-foreground/80 leading-relaxed">${p.description}</p>
        <div class="surface-card rounded-xl p-3 text-xs space-y-1">
          <div class="flex justify-between"><span class="text-muted-foreground">Potency:</span><span class="font-bold text-foreground">${p.strength}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Terpene Profile:</span><span class="font-bold text-foreground">${p.terpenes}</span></div>
          <div class="flex justify-between"><span class="text-muted-foreground">Clinical Indication:</span><span class="font-bold text-foreground">${p.indications}</span></div>
        </div>
        <button onclick="window.app.openProductBrochure('${p.id}')" class="btn-glass-outline w-full py-2.5 rounded-xl text-xs font-bold">View product brochure</button>
        <div class="flex items-center justify-between pt-2">
          <span class="text-xl font-bold text-foreground">$${p.unitPrice.toFixed(2)}</span>
          ${p.canPurchase ? `
            <button onclick="window.app.addToCartById('${p.id}'); window.app.closeProductModal();" class="btn-lime px-4 py-2 rounded-xl text-xs font-bold">
              <span class="text-lg leading-none">+</span> Add
            </button>
          ` : `
            <button onclick="window.app.closeProductModal(); window.app.openBookingModal();" class="btn-glass-outline px-4 py-2 rounded-xl text-xs font-bold">
              Consultation Required
            </button>
          `}
        </div>
      </div>
    `;
    openProfileDetail(p.name, content.innerHTML, 'products');
  }

  function closeProductModal() {
    closeProfileDetail();
  }

  function openProductBrochure(productId) {
    const product = state.products.find(item => item.id === productId);
    const modal = document.getElementById('product-brochure-modal');
    const content = document.getElementById('product-brochure-content');
    if (!product || !modal || !content) return;
    content.innerHTML = `<div class="space-y-3"><p class="text-brand-label">${product.category} · Product brochure</p><h3 class="text-lg font-bold text-foreground">${product.name}</h3><p class="text-xs text-muted-foreground">${product.manufacturer} · ${product.packageSize}</p><p class="text-sm text-foreground/80 leading-relaxed">${product.description}</p><div class="brochure-facts"><div><span>Strength</span><b>${product.strength}</b></div><div><span>Terpenes</span><b>${product.terpenes}</b></div><div><span>Indications</span><b>${product.indications}</b></div></div><div class="flex gap-2 pt-2"><button onclick="window.app.downloadProductBrochure('${product.id}')" class="btn-lime flex-1 py-2.5 rounded-xl text-xs font-bold">Download brochure</button><button onclick="window.app.closeProductBrochure()" class="btn-glass-outline px-4 py-2.5 rounded-xl text-xs font-bold">Close</button></div></div>`;
    modal.classList.remove('hidden');
  }

  function closeProductBrochure() {
    const modal = document.getElementById('product-brochure-modal');
    if (modal) modal.classList.add('hidden');
  }

  function downloadProductBrochure(productId) {
    const product = state.products.find(item => item.id === productId);
    if (!product) return;
    const brochure = `CannaQuest Product Brochure\n\n${product.name}\n${product.manufacturer} · ${product.packageSize}\n\n${product.description}\n\nStrength: ${product.strength}\nTerpenes: ${product.terpenes}\nClinical indication: ${product.indications}`;
    const url = URL.createObjectURL(new Blob([brochure], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-brochure.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Demo brochure downloaded', 'success');
  }

  let signatureMode = 'draw';
  let signatureDrawing = false;
  let signatureHasStroke = false;

  function openSignatureModal() {
    const modal = document.getElementById('signature-modal');
    if (modal) modal.classList.remove('hidden');
    renderSignatureModal('draw');
  }

  function closeSignatureModal() {
    const modal = document.getElementById('signature-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderSignatureModal(mode = 'draw') {
    signatureMode = mode;
    const content = document.getElementById('signature-modal-content');
    if (!content) return;
    ['draw', 'type', 'upload'].forEach(tab => {
      const button = document.getElementById(`signature-tab-${tab}`);
      if (button) button.classList.toggle('chip-active', tab === mode);
    });
    if (mode === 'draw') {
      content.innerHTML = `<p class="text-xs text-muted-foreground mt-3">Draw your signature below using your finger or mouse.</p><div class="signature-canvas-wrap mt-3"><canvas id="signature-canvas" width="900" height="300"></canvas><button onclick="window.app.clearSignatureCanvas()" class="signature-clear">Clear</button></div><button onclick="window.app.saveDrawnSignature()" class="btn-primary-green w-full py-3 rounded-xl text-xs font-bold mt-3">Save drawn signature</button>`;
      setupSignatureCanvas();
    } else if (mode === 'type') {
      content.innerHTML = `<p class="text-xs text-muted-foreground mt-3">Type your full name — it will be saved in a signature style.</p><input id="typed-signature-input" value="${state.profile.signature?.label || state.profile.fullName}" class="auth-input mt-3" placeholder="Your full name"><div id="typed-signature-preview" class="typed-signature-preview mt-3">${state.profile.signature?.label || 'Preview'}</div><button onclick="window.app.saveTypedSignature()" class="btn-primary-green w-full py-3 rounded-xl text-xs font-bold mt-3">Save typed signature</button>`;
      const input = document.getElementById('typed-signature-input');
      if (input) input.addEventListener('input', event => { const preview = document.getElementById('typed-signature-preview'); if (preview) preview.textContent = event.target.value || 'Preview'; });
    } else {
      content.innerHTML = `<p class="text-xs text-muted-foreground mt-3">Upload an image of your handwritten signature (PNG or JPG).</p><label class="signature-upload-box mt-3"><input type="file" accept="image/png,image/jpeg" onchange="window.app.handleSignatureUpload(event)" class="hidden"><span>↑</span><b>Click to upload image</b></label>`;
    }
  }

  function setupSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.strokeStyle = '#0e3017';
    const point = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
    };
    canvas.onpointerdown = event => { signatureDrawing = true; signatureHasStroke = true; const p = point(event); context.beginPath(); context.moveTo(p.x, p.y); canvas.setPointerCapture(event.pointerId); };
    canvas.onpointermove = event => { if (!signatureDrawing) return; const p = point(event); context.lineTo(p.x, p.y); context.stroke(); };
    canvas.onpointerup = () => { signatureDrawing = false; };
    canvas.onpointercancel = () => { signatureDrawing = false; };
  }

  function clearSignatureCanvas() {
    const canvas = document.getElementById('signature-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    signatureHasStroke = false;
  }

  function saveSignature(data, label) {
    state.profile.signature = { data, label, updatedAt: new Date().toLocaleDateString('en-AU') };
    saveState(state);
    closeSignatureModal();
    renderProfileTab();
    showToast('Signature saved', 'success');
  }

  function saveDrawnSignature() {
    const canvas = document.getElementById('signature-canvas');
    if (!canvas || !signatureHasStroke) { showToast('Please add your signature first', 'info'); return; }
    saveSignature(canvas.toDataURL('image/png'), 'Drawn signature');
  }

  function saveTypedSignature() {
    const input = document.getElementById('typed-signature-input');
    const value = input?.value.trim();
    if (!value) { showToast('Please enter your name first', 'info'); return; }
    saveSignature('', value);
  }

  function handleSignatureUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => saveSignature(reader.result, file.name);
    reader.readAsDataURL(file);
  }

  // ── Documents Modal ──
  function openDocumentsModal() {
    openProfileDetail('Clinical Documents', `
      <div class="space-y-3">
        <p class="text-brand-label">Patient clinical records</p>
        ${state.documents.map(d => `
          <div class="detail-action-card rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0"><div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0"><svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586l5.414 5.414V19a2 2 0 01-2 2z"/></svg></div><div class="min-w-0"><p class="text-xs font-bold text-foreground truncate">${d.title}</p><p class="text-[11px] text-muted-foreground">${d.doctor} · ${d.uploadedAt} · ${d.size}</p></div></div>
            <button onclick="window.app.showToast('Demo document opened', 'info')" class="btn-glass-outline px-2.5 py-1 rounded-lg text-xs font-bold shrink-0">View</button>
          </div>
        `).join('')}
      </div>
    `, 'profile');
    return;
    /* Legacy sheet retained below for compatibility. */
    const modal = document.getElementById('documents-modal');
    if (!modal) return;
    const content = document.getElementById('documents-modal-content');
    content.innerHTML = `
      <div class="p-4 space-y-3">
        <p class="text-brand-label">Patient Clinical Records</p>
        <div class="space-y-2">
          ${state.documents.map(d => `
            <div class="surface-card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p class="text-xs font-bold text-foreground">${d.title}</p>
                <p class="text-[11px] text-muted-foreground">${d.doctor} • ${d.uploadedAt} (${d.size})</p>
              </div>
              <button onclick="window.app.showToast('Downloaded ${d.title}', 'success')" class="btn-glass-outline px-2.5 py-1 rounded-lg text-xs font-bold">
                View PDF
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  function closeDocumentsModal() {
    const modal = document.getElementById('documents-modal');
    if (modal) modal.classList.add('hidden');
  }

  let profileDetailOrigin = 'profile';

  function openProfileDetail(title, contentHtml, originTab = 'profile') {
    const screen = document.getElementById('profile-detail-screen');
    const titleEl = document.getElementById('profile-detail-title');
    const content = document.getElementById('profile-detail-content');
    if (!screen || !titleEl || !content) return;
    profileDetailOrigin = originTab;
    titleEl.textContent = title;
    content.innerHTML = contentHtml;
    screen.classList.remove('hidden');
    content.scrollTop = 0;
  }

  function closeProfileDetail() {
    const screen = document.getElementById('profile-detail-screen');
    if (screen) screen.classList.add('hidden');
    if (profileDetailOrigin === 'order-history') {
      openOrderHistory('profile');
    } else if (profileDetailOrigin && profileDetailOrigin !== 'profile') {
      switchTab(profileDetailOrigin);
    }
  }

  function openEditProfileScreen() {
    const u = state.profile;
    openProfileDetail('Edit Profile', `
      <form onsubmit="window.app.saveProfileEdits(event)" class="space-y-3">
        <div class="grid grid-cols-2 gap-2"><label class="text-[10px] font-bold uppercase text-muted-foreground">First name<input id="edit-first-name" value="${u.firstName}" class="auth-input mt-1" required></label><label class="text-[10px] font-bold uppercase text-muted-foreground">Last name<input id="edit-last-name" value="${u.lastName}" class="auth-input mt-1" required></label></div>
        <label class="text-[10px] font-bold uppercase text-muted-foreground">Mobile phone<input id="edit-phone" value="${u.phone}" class="auth-input mt-1" required></label>
        <label class="text-[10px] font-bold uppercase text-muted-foreground">Email address<input value="${u.email}" class="auth-input mt-1" disabled></label>
        <label class="text-[10px] font-bold uppercase text-muted-foreground">Date of birth<input id="edit-dob" value="${u.dateOfBirth}" class="auth-input mt-1"></label>
        <button class="btn-lime w-full py-3 rounded-xl text-xs font-bold">Save changes</button>
      </form>
    `, 'profile');
  }

  function saveProfileEdits(event) {
    event.preventDefault();
    const u = state.profile;
    u.firstName = document.getElementById('edit-first-name').value.trim();
    u.lastName = document.getElementById('edit-last-name').value.trim();
    u.fullName = `${u.firstName} ${u.lastName}`;
    u.initials = (u.firstName[0] + u.lastName[0]).toUpperCase();
    u.phone = document.getElementById('edit-phone').value.trim();
    u.dateOfBirth = document.getElementById('edit-dob').value.trim();
    saveState(state);
    closeProfileDetail();
    renderProfileTab();
    showToast('Profile updated successfully', 'success');
  }

  function openAddressEditor() {
    const a = state.profile.deliveryAddress;
    openProfileDetail('Edit delivery address', `
      <form onsubmit="window.app.saveAddress(event)" class="space-y-3">
        <label class="text-[10px] font-bold uppercase text-muted-foreground">Street address<input id="address-line1" value="${a.line1}" class="auth-input mt-1" required></label>
        <div class="grid grid-cols-2 gap-2"><label class="text-[10px] font-bold uppercase text-muted-foreground">Suburb<input id="address-suburb" value="${a.suburb}" class="auth-input mt-1" required></label><label class="text-[10px] font-bold uppercase text-muted-foreground">State<input id="address-state" value="${a.state}" class="auth-input mt-1" required></label></div>
        <label class="text-[10px] font-bold uppercase text-muted-foreground">Postcode<input id="address-postcode" value="${a.postcode}" class="auth-input mt-1" required></label>
        <label class="text-[10px] font-bold uppercase text-muted-foreground">Delivery notes<textarea id="address-notes" class="auth-input mt-1" rows="3">${a.notes || ''}</textarea></label>
        <button class="btn-lime w-full py-3 rounded-xl text-xs font-bold">Save address</button>
      </form>
    `, 'profile');
  }

  function saveAddress(event) {
    event.preventDefault();
    const a = state.profile.deliveryAddress;
    a.line1 = document.getElementById('address-line1').value.trim();
    a.suburb = document.getElementById('address-suburb').value.trim();
    a.state = document.getElementById('address-state').value.trim();
    a.postcode = document.getElementById('address-postcode').value.trim();
    a.notes = document.getElementById('address-notes').value.trim();
    saveState(state);
    closeProfileDetail();
    renderProfileTab();
    showToast('Delivery address saved', 'success');
  }

  function openPaymentEditor() {
    openProfileDetail('Payment methods', `
      <div class="space-y-4">
        <div class="payment-progress" aria-label="Payment setup progress">
          <div class="payment-progress-line" aria-hidden="true"></div>
          <div class="payment-progress-step is-complete"><span class="payment-progress-dot">✓</span><span>Choose method</span></div>
          <div class="payment-progress-step is-current"><span class="payment-progress-dot">2</span><span>Add details</span></div>
          <div class="payment-progress-step"><span class="payment-progress-dot">3</span><span>Save securely</span></div>
        </div>
        <div class="detail-action-card rounded-2xl p-4 space-y-3">
          <p class="text-xs font-bold text-foreground">Add a payment method</p>
          <div class="grid grid-cols-2 gap-2"><button type="button" class="chip chip-active py-2">Debit / Credit</button><button type="button" class="chip py-2">PayID</button></div>
          <label class="text-[10px] font-bold uppercase text-muted-foreground">Cardholder name<input id="payment-name" value="Sarah Walker" class="auth-input mt-1"></label>
          <label class="text-[10px] font-bold uppercase text-muted-foreground">Card number<input id="payment-number" placeholder="4242 4242 4242 4242" class="auth-input mt-1"></label>
          <div class="grid grid-cols-2 gap-2"><input placeholder="MM / YY" class="auth-input"><input placeholder="CVC" class="auth-input"></div>
          <button onclick="window.app.savePaymentMethod()" class="btn-lime w-full py-3 rounded-xl text-xs font-bold">Save payment method</button>
        </div>
        <p class="text-[11px] text-muted-foreground text-center">Demo only — no real payment details are processed.</p>
      </div>
    `, 'profile');
  }

  function savePaymentMethod() {
    state.profile.paymentMethod = 'Visa ending in 4242';
    saveState(state);
    closeProfileDetail();
    renderProfileTab();
    showToast('Demo payment method saved', 'success');
  }

  let selectedPaymentMethod = '';

  function paymentProgress(step) {
    return `<div class="payment-progress" aria-label="Payment setup progress"><div class="payment-progress-line" aria-hidden="true"></div><div class="payment-progress-step ${step > 1 ? 'is-complete' : 'is-current'}"><span class="payment-progress-dot">${step > 1 ? '✓' : '1'}</span><span>Choose method</span></div><div class="payment-progress-step ${step === 2 ? 'is-current' : ''}"><span class="payment-progress-dot">2</span><span>Add details</span></div><div class="payment-progress-step"><span class="payment-progress-dot">3</span><span>Save securely</span></div></div>`;
  }

  function openPaymentEditor() {
    selectedPaymentMethod = '';
    openProfileDetail('Payment methods', `<div class="space-y-4">${paymentProgress(1)}<div class="detail-action-card rounded-2xl p-4 space-y-3"><div><p class="text-sm font-bold text-foreground">Choose a payment method</p><p class="text-[11px] text-muted-foreground mt-1">Select how you would like to pay for future orders.</p></div><div class="space-y-2"><button type="button" onclick="window.app.choosePaymentMethod('Debit / Credit')" class="payment-method-card"><span class="payment-method-icon">▣</span><span><b>Debit / Credit</b><small>Visa, Mastercard or debit card</small></span><span>›</span></button><button type="button" onclick="window.app.choosePaymentMethod('PayID')" class="payment-method-card"><span class="payment-method-icon">◎</span><span><b>PayID</b><small>Pay securely from your bank</small></span><span>›</span></button></div></div></div>`, 'profile');
  }

  function choosePaymentMethod(method) {
    selectedPaymentMethod = method;
    const isCard = method === 'Debit / Credit';
    openProfileDetail('Payment methods', `<form onsubmit="window.app.savePaymentMethod(event)" autocomplete="off" class="space-y-4">${paymentProgress(2)}<div class="detail-action-card rounded-2xl p-4 space-y-3"><div><p class="text-sm font-bold text-foreground">Add ${method}</p><p class="text-[11px] text-muted-foreground mt-1">Your details are used for this demo only.</p></div>${isCard ? `<label class="text-[10px] font-bold uppercase text-muted-foreground">Cardholder name<input id="payment-name" value="Sarah Walker" autocomplete="off" class="auth-input mt-1"></label><label class="text-[10px] font-bold uppercase text-muted-foreground">Card number<input id="payment-number" placeholder="4242 4242 4242 4242" autocomplete="off" inputmode="numeric" class="auth-input mt-1"></label><div class="grid grid-cols-2 gap-2"><input placeholder="MM / YY" autocomplete="off" class="auth-input"><input placeholder="CVC" autocomplete="off" class="auth-input"></div>` : `<label class="text-[10px] font-bold uppercase text-muted-foreground">PayID email or mobile<input id="payment-payid" placeholder="name@example.com" autocomplete="off" class="auth-input mt-1"></label>`}<button type="submit" class="btn-lime w-full py-3 rounded-xl text-xs font-bold">Save payment method</button></div><p class="text-[11px] text-muted-foreground text-center">Demo only — no real payment details are processed.</p></form>`, 'profile');
  }

  function savePaymentMethod(event) {
    if (event) event.preventDefault();
    state.profile.paymentMethod = selectedPaymentMethod === 'PayID' ? 'PayID payment method' : 'Visa ending in 4242';
    saveState(state);
    showPaymentSavingScreen();
  }

  function showPaymentSavingScreen() {
    const title = document.getElementById('profile-detail-title');
    const content = document.getElementById('profile-detail-content');
    if (title) title.textContent = 'Save securely';
    if (content) content.innerHTML = `<div class="payment-saving-screen"><div class="payment-saving-logo">CQ</div><h3>Save securely</h3><p>Your payment method is being saved.</p></div>`;
    setTimeout(() => { closeProfileDetail(); renderProfileTab(); showToast('Payment method saved', 'success'); }, 1000);
  }

  let orderHistoryFilter = 'active';
  let orderHistoryTargetId = null;

  function orderHistoryMarkup() {
    const matches = order => {
      if (orderHistoryFilter === 'completed') return order.status === 'Delivered';
      if (orderHistoryFilter === 'cancelled') return order.status === 'Cancelled';
      return !['Delivered', 'Cancelled'].includes(order.status);
    };
    const orders = state.orders.filter(order => (!orderHistoryTargetId || order.id === orderHistoryTargetId) && matches(order));
    return `<div class="space-y-4"><div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">${['active', 'completed', 'cancelled'].map(filter => `<button onclick="window.app.setOrderHistoryFilter('${filter}')" class="chip ${orderHistoryFilter === filter ? 'chip-active' : ''} shrink-0 text-xs">${filter[0].toUpperCase() + filter.slice(1)}</button>`).join('')}</div><p class="text-brand-label">Medication orders</p>${orders.length ? orders.map(order => `<div class="detail-action-card rounded-2xl p-3.5"><div class="flex justify-between"><p class="text-xs font-bold text-foreground">${order.uuid}</p><span class="status-pill emerald text-[10px]">${order.status}</span></div><p class="text-[11px] text-muted-foreground mt-1">${order.shippingSummary}</p><p class="text-xs font-bold text-emerald-800 mt-2">$${order.totalAmount.toFixed(2)}</p><button onclick="window.app.openOrderDetails('${order.id}')" class="btn-glass-outline w-full mt-3 py-2 rounded-xl text-xs font-bold">View full details</button></div>`).join('') : `<div class="detail-action-card rounded-2xl p-5 text-center text-xs text-muted-foreground">No ${orderHistoryFilter} orders yet.</div>`}</div>`;
  }

  function setOrderHistoryFilter(filter) {
    orderHistoryTargetId = null;
    orderHistoryFilter = filter;
    const content = document.getElementById('profile-detail-content');
    if (content) content.innerHTML = orderHistoryMarkup();
  }

  function openOrderHistory(originTab = 'profile') {
    orderHistoryTargetId = null;
    orderHistoryFilter = 'active';
    openProfileDetail('Order history', orderHistoryMarkup(), originTab);
  }

  function openOrderHistoryForPrescription(prescriptionName) {
    const order = state.orders.find(item => item.items?.some(orderItem => orderItem.name === prescriptionName));
    orderHistoryTargetId = order?.id || null;
    orderHistoryFilter = order?.status === 'Delivered' ? 'completed' : 'active';
    openProfileDetail('Order history', orderHistoryMarkup(), 'scripts');
  }

  function openOrderDetails(orderId) {
    const order = state.orders.find(item => String(item.id) === String(orderId));
    if (!order) return;
    openProfileDetail('Order details', `<div class="space-y-4 order-detail-view"><div><p class="text-brand-label">${order.uuid}</p><p class="text-xs text-muted-foreground mt-1">Placed ${order.createdAt}</p></div><div class="detail-action-card rounded-2xl p-4"><div class="flex items-center justify-between mb-4"><p class="text-brand-label">Order status</p><span class="status-pill emerald text-[10px]">${order.status}</span></div><div class="order-detail-progress">${order.progressSteps.map((step, index) => `<div class="order-detail-progress-step ${step.status === 'completed' ? 'is-complete' : step.status === 'current' ? 'is-current' : ''}"><span class="order-detail-progress-dot">${step.status === 'completed' ? '✓' : index + 1}</span><span>${step.name}</span></div>`).join('')}</div></div><div><p class="text-brand-label mb-2">Order items</p><div class="space-y-2">${order.items.map(item => `<div class="detail-action-card rounded-2xl p-3.5 flex items-center justify-between gap-3"><div><p class="text-sm font-bold text-foreground">${item.name}</p><p class="text-[11px] text-muted-foreground mt-1">${item.form} · ${item.strength} · Qty ${item.quantity}</p></div><p class="text-sm font-bold text-emerald-800">$${item.price.toFixed(2)}</p></div>`).join('')}</div></div><div class="detail-action-card rounded-2xl p-4 space-y-2 text-xs"><p class="text-brand-label">Order summary</p><div class="flex justify-between"><span class="text-muted-foreground">Total</span><span class="font-bold text-foreground">$${order.totalAmount.toFixed(2)}</span></div><div class="flex justify-between"><span class="text-muted-foreground">Payment</span><span class="font-bold text-foreground text-right">${order.paymentMethod}</span></div></div><div class="detail-action-card rounded-2xl p-4 space-y-2 text-xs"><p class="text-brand-label">Delivery information</p><p class="font-bold text-foreground">${state.profile.fullName}</p><p class="text-muted-foreground">${order.deliveryAddress}</p><p class="text-muted-foreground">${order.shippingSummary}</p></div></div>`, 'order-history');
  }

  function openAppointmentHistory(originTab = 'profile') {
    openProfileDetail('Appointment history', `<div class="space-y-3"><p class="text-brand-label">Past consultations</p>${state.pastConsultations.map(item => `<div class="detail-action-card rounded-2xl p-3.5"><div class="flex justify-between gap-2"><p class="text-xs font-bold text-foreground">${item.prescriberName}</p><span class="text-[10px] text-muted-foreground">${item.bookDate}</span></div><p class="text-[11px] text-muted-foreground mt-1">${item.type} · ${item.clinicName}</p><p class="text-xs text-foreground/80 mt-1 italic">${item.summary}</p></div>`).join('')}</div>`, originTab);
  }

  function sendPasswordResetEmail() {
    const modal = document.getElementById('password-reset-modal');
    const email = document.getElementById('password-reset-email');
    if (!modal || !email) return;
    const [name, domain] = state.profile.email.split('@');
    const masked = `${name.slice(0, 1)}${'*'.repeat(Math.max(6, name.length - 1))}@${domain}`;
    email.textContent = masked;
    modal.classList.remove('hidden');
  }

  function closePasswordResetModal() {
    const modal = document.getElementById('password-reset-modal');
    if (modal) modal.classList.add('hidden');
  }

  function confirmPasswordReset() {
    closePasswordResetModal();
    showToast(`Password reset link sent to ${state.profile.email}`, 'success');
  }

  // ── PWA Installation Support ──
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwa-install-banner');
    if (banner) banner.style.display = 'flex';
    const authBanner = document.getElementById('auth-install-banner');
    if (authBanner) authBanner.style.display = 'flex';
  });

  function isInstalledApp() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIosDevice() {
    return /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  }

  function updateAppInstallGate() {
    const gate = document.getElementById('app-install-gate');
    if (!gate) return;
    const installed = isInstalledApp();
    gate.classList.toggle('hidden', installed);

    const iosGuide = document.getElementById('ios-install-guide');
    const action = document.getElementById('install-gate-action');
    if (iosGuide) iosGuide.classList.toggle('hidden', !isIosDevice() || installed);
    if (action && isIosDevice()) action.textContent = 'Show install steps';
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    updateAppInstallGate();
  });

  function triggerPwaInstall() {
    if (isIosDevice()) {
      const guide = document.getElementById('ios-install-guide');
      if (guide) {
        guide.classList.remove('hidden');
        guide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
        const authBanner = document.getElementById('auth-install-banner');
        if (authBanner) authBanner.style.display = 'none';
      });
    } else {
      showToast('To install: tap Share (Safari) then "Add to Home Screen"', 'info');
    }
  }

  async function openIosShareMenu() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'CannaQuest Patient Portal',
          text: 'Add CannaQuest to your Home Screen to continue testing.',
          url: window.location.href
        });
      } catch (error) {
        if (error?.name !== 'AbortError') showToast('Tap Safari Share, then choose Add to Home Screen.', 'info');
      }
    } else {
      showToast('Tap Safari Share, then choose Add to Home Screen.', 'info');
    }
  }

  // ── 3-Second Motion Splash Screen ──
  function dismissSplashScreen() {
    const splash = document.getElementById('app-splash-screen');
    if (splash && !splash.classList.contains('fade-out')) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.style.display = 'none';
      }, 550);
    }
  }

  // ── Authentication Management (Login & Sign Up) ──
  function checkAuth() {
    const authScreen = document.getElementById('auth-screen');
    if (!authScreen) return;
    const appContainer = document.querySelector('.app-container');
    // New installs should land on the auth screen. Demo/testing users can
    // continue straight into the portal after either auth form is submitted.
    if (state.isLoggedIn !== true) {
      authScreen.classList.remove('hidden');
      if (appContainer) appContainer.classList.add('auth-active');
    } else {
      authScreen.classList.add('hidden');
      if (appContainer) appContainer.classList.remove('auth-active');
    }
  }

  function openPasswordResetScreen() {
    const screen = document.getElementById('password-reset-screen');
    const input = document.getElementById('reset-email-input');
    const loginEmail = document.getElementById('login-email');
    if (input && loginEmail && loginEmail.value) input.value = loginEmail.value;
    if (screen) screen.classList.remove('hidden');
  }

  function closePasswordResetScreen() {
    const screen = document.getElementById('password-reset-screen');
    if (screen) screen.classList.add('hidden');
  }

  function requestPasswordReset(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('reset-email-input')?.value || 'your email';
    closePasswordResetScreen();
    showToast(`Reset password link sent to ${email}`, 'success');
  }

  function switchAuthTab(tab) {
    const btnIn = document.getElementById('auth-tab-signin');
    const btnUp = document.getElementById('auth-tab-signup');
    const formIn = document.getElementById('form-signin');
    const formUp = document.getElementById('form-signup');
    if (tab === 'signin') {
      if (btnIn) btnIn.className = 'flex-1 py-2 rounded-lg bg-white text-[#0e3017] shadow-sm transition-all';
      if (btnUp) btnUp.className = 'flex-1 py-2 rounded-lg text-muted-foreground hover:text-[#0e3017] transition-all';
      if (formIn) formIn.classList.remove('hidden');
      if (formUp) formUp.classList.add('hidden');
    } else {
      if (btnUp) btnUp.className = 'flex-1 py-2 rounded-lg bg-white text-[#0e3017] shadow-sm transition-all';
      if (btnIn) btnIn.className = 'flex-1 py-2 rounded-lg text-muted-foreground hover:text-[#0e3017] transition-all';
      if (formUp) formUp.classList.remove('hidden');
      if (formIn) formIn.classList.add('hidden');
    }
  }

  let pendingAuthEmail = '';

  function beginEmailVerification(email) {
    pendingAuthEmail = email || state.profile.email;
    const recipient = document.getElementById('email-code-recipient');
    const modal = document.getElementById('email-code-modal');
    if (recipient) recipient.textContent = pendingAuthEmail;
    if (modal) modal.classList.remove('hidden');
  }

  function handleLoginSubmit(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('login-email')?.value || state.profile.email;
    state.profile.email = email;
    saveState(state);
    beginEmailVerification(email);
  }

  function quickDemoLogin() {
    state.isLoggedIn = true;
    saveState(state);
    checkAuth();
    showToast('Logged in as Sarah Walker!', 'success');
    switchTab('home');
  }

  function handleSignupSubmit(e) {
    if (e) e.preventDefault();
    const fname = document.getElementById('signup-fname')?.value || 'New';
    const lname = document.getElementById('signup-lname')?.value || 'Patient';
    const email = document.getElementById('signup-email')?.value || 'patient@example.com';
    const phone = document.getElementById('signup-phone')?.value || '0400 000 000';
    const medicare = document.getElementById('signup-medicare')?.value || '2345 67890 1';

    state.profile.firstName = fname;
    state.profile.lastName = lname;
    state.profile.fullName = `${fname} ${lname}`;
    state.profile.initials = (fname[0] + (lname[0] || '')).toUpperCase();
    state.profile.email = email;
    state.profile.phone = phone;
    if (medicare) state.profile.medicareNumber = medicare;

    saveState(state);
    beginEmailVerification(email);
  }

  function confirmEmailCode() {
    const modal = document.getElementById('email-code-modal');
    if (modal) modal.classList.add('hidden');
    state.isLoggedIn = true;
    saveState(state);
    checkAuth();
    showToast(`Welcome to CannaQuest, ${state.profile.firstName}!`, 'success');
    switchTab('home');
  }

  function closeEmailCodeModal() {
    const modal = document.getElementById('email-code-modal');
    if (modal) modal.classList.add('hidden');
  }

  function logout() {
    state.isLoggedIn = false;
    saveState(state);
    checkAuth();
    showToast('Signed out of patient account.', 'info');
  }

  // ── Clinical Notifications Drawer ──
  function openNotificationDrawer() {
    const modal = document.getElementById('notification-modal');
    const content = document.getElementById('notification-modal-content');
    if (!modal || !content) return;

    const notifs = state.notifications || [];
    if (notifs.length === 0) {
      content.innerHTML = `
        <div class="py-8 text-center text-muted-foreground">
          <p class="text-sm font-semibold">No notifications right now</p>
        </div>
      `;
    } else {
      content.innerHTML = notifs.map(n => `
        <div class="surface-card rounded-2xl p-3.5 space-y-1 ${!n.read ? 'border-l-4 border-l-emerald-600' : ''}">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-foreground">${n.title}</h4>
            <span class="text-[10px] text-muted-foreground font-medium">${n.time}</span>
          </div>
          <p class="text-xs text-foreground/80 leading-relaxed">${n.description}</p>
        </div>
      `).join('') + `
        <div class="pt-2 text-center">
          <button onclick="window.app.clearNotifications()" class="text-xs font-semibold text-emerald-800 underline">
            Mark all as read
          </button>
        </div>
      `;
    }

    modal.classList.remove('hidden');
  }

  function closeNotificationDrawer() {
    const modal = document.getElementById('notification-modal');
    if (modal) modal.classList.add('hidden');
  }

  function clearNotifications() {
    if (state.notifications) {
      state.notifications.forEach(n => n.read = true);
      saveState(state);
    }
    const badge = document.getElementById('header-notif-badge');
    if (badge) badge.style.display = 'none';
    showToast('All notifications marked as read', 'info');
    closeNotificationDrawer();
  }

  // ── Expose to Global Window ──
  window.app = {
    switchTab,
    showToast,
    addToCart,
    addToCartById: (id) => {
      const p = state.products.find(item => item.id === id);
      if (p) addToCart(p);
    },
    addRxToCart: (rxId) => {
      const rx = state.prescriptions.find(p => p.id === rxId);
      if (rx) {
        addToCart({
          id: rx.id,
          name: rx.name,
          manufacturer: rx.manufacturer,
          form: rx.form,
          strength: rx.strength,
          unitPrice: rx.unitPrice
        }, rx.id);
      }
    },
    updateCartQty: updateQuantity,
    removeFromCart,
    openCartModal: () => {
      const modal = document.getElementById('cart-modal');
      if (modal) {
        checkoutStep = 1;
        pendingPayIdPayment = null;
        modal.classList.remove('hidden');
        renderCartDrawer();
      }
    },
    closeCartModal: () => {
      const modal = document.getElementById('cart-modal');
      checkoutStep = 1;
      pendingPayIdPayment = null;
      if (modal) modal.classList.add('hidden');
    },
    openCheckoutStep,
    selectCheckoutShipping,
    selectCheckoutDispenser,
    continueToCheckoutPayment,
    selectCheckoutPayment,
    copyPayIdValue,
    backToCheckoutPayment,
    markPayIdPaid,
    submitCheckout,
    renderHomeTab,
    launchTelehealthCall,
    closeTelehealthCall,
    rescheduleConsult,
    cancelConsult,
    openBookingModal,
    closeBookingModal,
    renderBookingStep,
    selectBookingClinic,
    selectBookingDate,
    selectBookingMonth,
    selectBookingTime,
    captureBookingNotes,
    confirmBooking,
    openConsumptionCalendar,
    closeConsumptionCalendar,
    openUploadPrescriptionModal,
    closeUploadPrescriptionModal,
    handlePrescriptionFile,
    submitUploadedPrescription,
    openProductModal,
    closeProductModal,
    openProductBrochure,
    closeProductBrochure,
    downloadProductBrochure,
    openSignatureModal,
    closeSignatureModal,
    renderSignatureModal,
    clearSignatureCanvas,
    saveDrawnSignature,
    saveTypedSignature,
    handleSignatureUpload,
    openDocumentsModal,
    closeDocumentsModal,
    openProfileDetail,
    closeProfileDetail,
    openEditProfileScreen,
    saveProfileEdits,
    openAddressEditor,
    saveAddress,
    openPaymentEditor,
    choosePaymentMethod,
    savePaymentMethod,
    showPaymentSavingScreen,
    openOrderHistory,
    openOrderHistoryForPrescription,
    openOrderDetails,
    setOrderHistoryFilter,
    openAppointmentHistory,
    sendPasswordResetEmail,
    closePasswordResetModal,
    confirmPasswordReset,
    triggerPwaInstall,
    openIosShareMenu,
    dismissSplashScreen,
    switchAuthTab,
    handleLoginSubmit,
    confirmEmailCode,
    closeEmailCodeModal,
    openPasswordResetScreen,
    closePasswordResetScreen,
    requestPasswordReset,
    quickDemoLogin,
    handleSignupSubmit,
    logout,
    openNotificationDrawer,
    closeNotificationDrawer,
    clearNotifications,
    filterRxTab: (tab) => {
      const btnCur = document.getElementById('rx-filter-current');
      const btnPast = document.getElementById('rx-filter-past');
      const c = document.getElementById('rx-cards-container');
      if (tab === 'current') {
        if (btnCur) btnCur.classList.add('chip-active');
        if (btnPast) btnPast.classList.remove('chip-active');
        if (c) c.innerHTML = renderPrescriptionCards(state.prescriptions, true);
      } else {
        if (btnPast) btnPast.classList.add('chip-active');
        if (btnCur) btnCur.classList.remove('chip-active');
        if (c) c.innerHTML = renderPrescriptionCards(state.pastPrescriptions, false);
      }
    },
    filterProductsCategory: (cat) => {
      productCategoryFilter = cat;
      const grid = document.getElementById('product-grid');
      if (grid) grid.innerHTML = renderProductCards();
      // Update chip active states
      document.querySelectorAll('#tab-products .chip').forEach(el => {
        if (el.textContent.trim() === cat) el.classList.add('chip-active');
        else el.classList.remove('chip-active');
      });
    },
    handleProductSearch: (val) => {
      productSearchQuery = val;
      const grid = document.getElementById('product-grid');
      if (grid) grid.innerHTML = renderProductCards();
    },
    toggle2FA: () => {
      state.profile.twoFactorEnabled = !state.profile.twoFactorEnabled;
      saveState(state);
      showToast(`Two-Factor Auth ${state.profile.twoFactorEnabled ? 'enabled' : 'disabled'}`, 'info');
      renderProfileTab();
    },
    resetDemoData: () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('cannaquest_cart');
      state = JSON.parse(JSON.stringify(window.DEFAULT_PATIENT_DATA));
      cart = [];
      saveCart();
      switchTab('home');
      showToast('Demo data reset to original!', 'success');
    }
  };

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then(registrations => registrations.forEach(registration => registration.unregister())).catch(err => {
        console.log('SW registration note:', err);
      });
    });
  }

  // Initial Boot
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    updateCartBadges();
    checkAuth();
    updateAppInstallGate();

    // Auto-dismiss 3-second motion splash
    setTimeout(() => {
      dismissSplashScreen();
    }, 3000);
  });

})();
