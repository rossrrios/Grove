/* ═══════════════════════════════════════════
   GROVE — Auth UI (Login + Signup)
   ═══════════════════════════════════════════ */

(function () {

  /* ── Redirect if already logged in ── */
  if (AuthService.isLoggedIn()) {
    window.location.replace('dashboard.html');
    return;
  }

  /* ── Detect page ── */
  var isSignup = document.getElementById('signupForm') !== null;
  var form = document.getElementById(isSignup ? 'signupForm' : 'loginForm');
  if (!form) return;

  var submitBtn = document.getElementById('submitBtn');
  var alertBox = document.getElementById('alertBox');

  /* ── Helpers ── */
  function getEl(id) { return document.getElementById(id); }

  function setFieldError(inputId, errorId, msg) {
    var input = getEl(inputId);
    var errEl = getEl(errorId);
    if (input) input.classList.toggle('error', !!msg);
    if (errEl) {
      errEl.textContent = msg || '';
      errEl.classList.toggle('visible', !!msg);
    }
  }

  function clearErrors() {
    if (isSignup) {
      setFieldError('name', 'nameError', '');
      setFieldError('confirm', 'confirmError', '');
    }
    setFieldError('email', 'emailError', '');
    setFieldError('password', 'passwordError', '');
    alertBox.classList.remove('visible', 'error', 'success');
    alertBox.textContent = '';
  }

  function showAlert(msg, type) {
    alertBox.textContent = msg;
    alertBox.className = 'auth-alert visible ' + (type || 'error');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading
      ? (isSignup ? 'Creating account\u2026' : 'Logging in\u2026')
      : (isSignup ? 'Create Account' : 'Log In');
  }

  /* ── Password visibility toggle ── */
  document.querySelectorAll('.pw-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrapper = this.parentNode;
      var input = wrapper.querySelector('input');
      if (!input) return;
      var isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      this.textContent = isPassword ? 'Hide' : 'Show';
    });
  });

  /* ── Real-time field validation ── */
  if (isSignup) {
    getEl('name').addEventListener('blur', function () {
      var valid = this.value.trim().length >= 2;
      setFieldError('name', 'nameError', valid ? '' : 'Name must be at least 2 characters.');
    });

    getEl('confirm').addEventListener('input', function () {
      var pw = getEl('password').value;
      var match = this.value === pw;
      setFieldError('confirm', 'confirmError', match ? '' : 'Passwords do not match.');
    });
  }

  getEl('email').addEventListener('blur', function () {
    var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value.trim());
    setFieldError('email', 'emailError', valid ? '' : 'Please enter a valid email address.');
  });

  getEl('password').addEventListener('blur', function () {
    if (isSignup) {
      var valid = this.value.length >= 6;
      setFieldError('password', 'passwordError', valid ? '' : 'Password must be at least 6 characters.');
    }
  });

  if (isSignup) {
    getEl('password').addEventListener('input', function () {
      var confirm = getEl('confirm');
      if (confirm.value) {
        var match = this.value === confirm.value;
        setFieldError('confirm', 'confirmError', match ? '' : 'Passwords do not match.');
      }
    });
  }

  /* ── Form submit ── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var email = getEl('email').value.trim();
    var password = getEl('password').value;

    if (isSignup) {
      var name = getEl('name').value.trim();
      var confirm = getEl('confirm').value;

      // Client-side check before calling service
      var hasErrors = false;
      if (name.length < 2) { setFieldError('name', 'nameError', 'Name must be at least 2 characters.'); hasErrors = true; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('email', 'emailError', 'Please enter a valid email address.'); hasErrors = true; }
      if (password.length < 6) { setFieldError('password', 'passwordError', 'Password must be at least 6 characters.'); hasErrors = true; }
      if (password !== confirm) { setFieldError('confirm', 'confirmError', 'Passwords do not match.'); hasErrors = true; }
      if (hasErrors) return;

      setLoading(true);
      var result = AuthService.signUp(name, email, password, confirm);
      setLoading(false);

      if (result.success) {
        showAlert('Account created! Redirecting\u2026', 'success');
        setTimeout(function () { window.location.href = 'dashboard.html'; }, 600);
      } else {
        showAlert(result.errors.join(' '));
        // Map first error to field
        if (result.errors.length) {
          var msg = result.errors[0];
          if (msg.toLowerCase().indexOf('name') !== -1) setFieldError('name', 'nameError', msg);
          else if (msg.toLowerCase().indexOf('email') !== -1) setFieldError('email', 'emailError', msg);
          else if (msg.toLowerCase().indexOf('password') !== -1) setFieldError('password', 'passwordError', msg);
          else if (msg.toLowerCase().indexOf('match') !== -1) setFieldError('confirm', 'confirmError', msg);
        }
      }
    } else {
      // Login
      var hasErrors = false;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldError('email', 'emailError', 'Please enter a valid email address.'); hasErrors = true; }
      if (!password) { setFieldError('password', 'passwordError', 'Please enter your password.'); hasErrors = true; }
      if (hasErrors) return;

      setLoading(true);
      var result = AuthService.logIn(email, password);
      setLoading(false);

      if (result.success) {
        showAlert('Welcome back! Redirecting\u2026', 'success');
        setTimeout(function () { window.location.href = 'dashboard.html'; }, 600);
      } else {
        showAlert(result.errors.join(' '));
      }
    }
  });

  /* ── Enter to submit on any field ── */
  form.querySelectorAll('input').forEach(function (inp) {
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') form.dispatchEvent(new Event('submit'));
    });
  });

})();
