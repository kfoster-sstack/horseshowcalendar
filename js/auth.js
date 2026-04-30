/* ===================================================================
   HorseShowCalendar — Auth Logic
   Handles login, signup (with role), confirm, password reset.
   ================================================================== */

(function () {
  'use strict';

  var siteBase = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');

  var isLogin = !!document.getElementById('loginForm');
  var isConfirm = !!document.getElementById('confirmBox');

  if (isLogin) {
    supabase.auth.getSession().then(function (r) {
      if (r.data.session) routeToHome();
    });
    initLoginPage();
  }

  if (isConfirm) {
    initConfirmPage();
  }

  async function routeToHome() {
    var u = await supabase.auth.getUser();
    var p = u && u.data.user
      ? (await supabase.from('profiles').select('role').eq('id', u.data.user.id).single()).data
      : null;
    if (p && p.role === 'manager') window.location.href = 'manager/dashboard.html';
    else if (p && p.role === 'judge') window.location.href = 'scoring/judge.html';
    else window.location.href = 'exhibitor/dashboard.html';
  }

  function initLoginPage() {
    var tabs = document.querySelectorAll('.auth-tab');
    var forms = document.querySelectorAll('.auth-form');
    var forgotPanel = document.getElementById('forgotPanel');
    var authBody = document.getElementById('authBody');
    var authTabs = document.getElementById('authTabs');

    var params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'signup') switchTab('signup');
    if (params.get('role') === 'manager') {
      switchTab('signup');
      var roleEl = document.getElementById('signupRole');
      if (roleEl) roleEl.value = 'manager';
    }

    document.getElementById('authTabs').addEventListener('click', function (e) {
      var tab = e.target.closest('.auth-tab');
      if (tab) { e.preventDefault(); switchTab(tab.getAttribute('data-tab')); }
    });

    function switchTab(name) {
      tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === name); });
      forms.forEach(function (f) { f.classList.toggle('active', f.id === name + 'Form'); });
      clearMsgs();
    }

    document.getElementById('loginForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      clearMsgs();
      var btn = document.getElementById('loginBtn');
      btn.disabled = true; btn.textContent = 'Logging in…';
      try {
        var r = await supabase.auth.signInWithPassword({
          email: document.getElementById('loginEmail').value.trim(),
          password: document.getElementById('loginPassword').value
        });
        if (r.error) throw r.error;
        routeToHome();
      } catch (err) {
        var m = err.message || 'Login failed.';
        if (m.toLowerCase().indexOf('invalid login credentials') !== -1) {
          m = 'Invalid email or password. Don\'t have an account? Click "Sign Up" above.';
        }
        showError('authError', m);
        btn.disabled = false; btn.textContent = 'Log In';
      }
    });

    document.getElementById('signupForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      clearMsgs();
      var btn = document.getElementById('signupBtn');
      var email = document.getElementById('signupEmail').value.trim();
      var pw = document.getElementById('signupPassword').value;
      var pw2 = document.getElementById('signupConfirm').value;
      var role = document.getElementById('signupRole').value;
      var name = document.getElementById('signupName').value.trim();

      if (pw !== pw2) return showError('authError', 'Passwords do not match.');
      if (pw.length < 6) return showError('authError', 'Password must be at least 6 characters.');

      btn.disabled = true; btn.textContent = 'Creating account…';

      try {
        var r = await supabase.auth.signUp({
          email: email,
          password: pw,
          options: {
            emailRedirectTo: siteBase + 'confirm.html',
            data: { role: role, full_name: name }
          }
        });
        if (r.error) throw r.error;
        if (r.data.user && !r.data.session) {
          showSuccess('authSuccess', 'Account created. Check your email to confirm, then log in.');
          btn.disabled = false; btn.textContent = 'Create Account';
          switchTab('login');
        } else {
          // Update profile with name/role since trigger may have set defaults
          if (r.data.user) {
            await supabase.from('profiles').update({ full_name: name, role: role }).eq('id', r.data.user.id);
          }
          routeToHome();
        }
      } catch (err) {
        showError('authError', err.message || 'Signup failed.');
        btn.disabled = false; btn.textContent = 'Create Account';
      }
    });

    document.getElementById('magicLinkBtn').addEventListener('click', async function () {
      clearMsgs();
      var email = document.getElementById('loginEmail').value.trim();
      if (!email) return showError('authError', 'Enter your email first.');
      this.disabled = true; this.textContent = 'Sending…';
      try {
        var r = await supabase.auth.signInWithOtp({
          email: email, options: { emailRedirectTo: siteBase + 'confirm.html' }
        });
        if (r.error) throw r.error;
        showSuccess('authSuccess', 'Magic link sent. Check your email.');
      } catch (err) {
        showError('authError', err.message || 'Failed to send.');
      }
      this.disabled = false; this.textContent = 'Send a magic link';
    });

    document.getElementById('forgotLink').addEventListener('click', function (e) {
      e.preventDefault();
      authBody.style.display = 'none';
      authTabs.style.display = 'none';
      forgotPanel.classList.add('active');
    });

    document.getElementById('backToLogin').addEventListener('click', function () {
      forgotPanel.classList.remove('active');
      authBody.style.display = '';
      authTabs.style.display = '';
      clearMsgs();
    });

    document.getElementById('forgotForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var email = document.getElementById('forgotEmail').value.trim();
      if (!email) return;
      try {
        var r = await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteBase + 'login.html' });
        if (r.error) throw r.error;
        showSuccess('forgotSuccess', 'Reset link sent. Check your email.');
      } catch (err) {
        showError('forgotError', err.message || 'Failed to send.');
      }
    });
  }

  function initConfirmPage() {
    var box = document.getElementById('confirmBox');
    box.innerHTML = '<h2>Confirming your account…</h2><p>One moment.</p>';
    setTimeout(function () {
      supabase.auth.getSession().then(function (r) {
        if (r.data.session) {
          box.innerHTML = '<h2>You\'re in.</h2><p>Redirecting to your dashboard…</p>';
          setTimeout(routeToHome, 1200);
        } else {
          box.innerHTML = '<h2>Almost there.</h2><p>If your inbox link expired, head back to <a href="login.html">log in</a> and request a new one.</p>';
        }
      });
    }, 600);
  }

  function showError(id, msg) { var el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.add('show'); } }
  function showSuccess(id, msg) { var el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.add('show'); } }
  function clearMsgs() { document.querySelectorAll('.auth-error, .auth-success').forEach(function (el) { el.classList.remove('show'); el.textContent = ''; }); }
})();
