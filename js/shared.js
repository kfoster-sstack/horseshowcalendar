/* ===================================================================
   HorseShowCalendar — Shared Utilities
   Used across public, manager, exhibitor, and scoring pages.
   ================================================================== */

window.HSC = (function () {
  'use strict';

  // ---------- Format helpers ----------
  function fmtMoney(n) {
    if (n === null || n === undefined || isNaN(Number(n))) return '$0.00';
    return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function fmtDateRange(s, e) {
    if (!s) return '';
    if (!e || s === e) return fmtDate(s);
    var d1 = new Date(s + 'T00:00:00');
    var d2 = new Date(e + 'T00:00:00');
    if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
      return d1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '–' + d2.getDate() + ', ' + d2.getFullYear();
    }
    return fmtDate(s) + ' – ' + fmtDate(e);
  }

  function fmtTime(t) {
    if (!t) return '';
    var parts = t.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + m + ' ' + ampm;
  }

  function slugify(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function escHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // ---------- Toast ----------
  var toastTimer;
  function toast(msg, type) {
    var el = document.getElementById('hscToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hscToast';
      el.className = 'hsc-toast';
      document.body.appendChild(el);
    }
    el.className = 'hsc-toast show ' + (type || 'info');
    el.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
  }

  // ---------- Confirm dialog ----------
  function confirmAction(msg) {
    return Promise.resolve(window.confirm(msg));
  }

  // ---------- Auth shortcuts ----------
  async function getUser() {
    var r = await supabase.auth.getUser();
    return r.data.user;
  }

  async function getProfile() {
    var u = await getUser();
    if (!u) return null;
    var r = await supabase.from('profiles').select('*').eq('id', u.id).single();
    return r.data;
  }

  async function requireAuth(redirectTo) {
    var s = await supabase.auth.getSession();
    if (!s.data.session) {
      window.location.href = redirectTo || '../login.html';
      return null;
    }
    return s.data.session;
  }

  async function requireRole(allowedRoles, redirectTo) {
    var s = await requireAuth(redirectTo);
    if (!s) return null;
    var p = await getProfile();
    if (!p || allowedRoles.indexOf(p.role) === -1) {
      toast('Your account does not have access to this area.', 'error');
      setTimeout(function () { window.location.href = '../index.html'; }, 1500);
      return null;
    }
    return p;
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/index.html';
  }

  // ---------- DOM helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setHTML(el, html) { if (el) el.innerHTML = html; }
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  // ---------- Debounce ----------
  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 250);
    };
  }

  // ---------- Mobile nav toggle (shared header) ----------
  function initMobileNav() {
    var btn = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');
    if (btn && nav) {
      btn.addEventListener('click', function () {
        nav.classList.toggle('open');
        var expanded = nav.classList.contains('open');
        btn.setAttribute('aria-expanded', expanded);
      });
    }
  }

  // ---------- Session-aware nav for landing/public pages ----------
  async function initNavSession() {
    var navAccount = document.getElementById('navAccount');
    if (!navAccount) return;
    var session = await supabase.auth.getSession();
    if (session.data.session) {
      var p = await getProfile();
      if (p && p.role === 'manager') {
        navAccount.textContent = 'Show Manager';
        navAccount.href = 'manager/dashboard.html';
      } else if (p && p.role === 'judge') {
        navAccount.textContent = 'Judge Console';
        navAccount.href = 'scoring/judge.html';
      } else {
        navAccount.textContent = 'My Account';
        navAccount.href = 'exhibitor/dashboard.html';
      }
    } else {
      navAccount.textContent = 'Log In';
      navAccount.href = 'login.html';
    }
  }

  // ---------- Empty state ----------
  function emptyState(title, body, ctaHtml) {
    return '<div class="empty-state">' +
      '<h3>' + escHtml(title) + '</h3>' +
      '<p>' + escHtml(body) + '</p>' +
      (ctaHtml || '') +
      '</div>';
  }

  // ---------- Status pill ----------
  function statusPill(status) {
    var map = {
      draft: 'gray', open: 'green', closed: 'amber', live: 'red',
      completed: 'blue', cancelled: 'gray',
      submitted: 'amber', approved: 'green', verified: 'blue',
      scratched: 'gray', entered: 'green', no_show: 'gray',
      eliminated: 'red', paid: 'green', partial: 'amber', refunded: 'gray', void: 'gray',
      pending: 'amber', in_progress: 'red'
    };
    var color = map[status] || 'gray';
    return '<span class="pill pill-' + color + '">' + escHtml(status.replace(/_/g, ' ')) + '</span>';
  }

  return {
    fmtMoney: fmtMoney,
    fmtDate: fmtDate,
    fmtDateRange: fmtDateRange,
    fmtTime: fmtTime,
    slugify: slugify,
    escHtml: escHtml,
    qs: qs,
    toast: toast,
    confirmAction: confirmAction,
    getUser: getUser,
    getProfile: getProfile,
    requireAuth: requireAuth,
    requireRole: requireRole,
    logout: logout,
    $: $,
    $$: $$,
    setHTML: setHTML,
    show: show,
    hide: hide,
    debounce: debounce,
    initMobileNav: initMobileNav,
    initNavSession: initNavSession,
    emptyState: emptyState,
    statusPill: statusPill
  };
})();
