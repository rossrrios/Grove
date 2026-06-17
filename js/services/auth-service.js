/*
  Grove Auth Service
  Abstracts localStorage — swap to Firebase Auth later.
  Manages users, sessions, password hashing, and validation.
*/

var AuthService = {
  _userListKey: 'grove_users',
  _sessionKey: 'grove_session',
  _currentUserKey: 'grove_user',

  /* ── Internal helpers ── */

  _getUsers: function () {
    try { return JSON.parse(localStorage.getItem(this._userListKey)) || []; } catch (_) { return []; }
  },

  _saveUsers: function (users) {
    try { localStorage.setItem(this._userListKey, JSON.stringify(users)); } catch (_) {}
  },

  _hash: function (password) {
    if (!password) return '';
    var hash = 0, i, chr;
    for (i = 0; i < password.length; i++) {
      chr = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return 'gv' + Math.abs(hash).toString(36);
  },

  _validateEmail: function (email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  _setSession: function (user) {
    try {
      localStorage.setItem(this._sessionKey, JSON.stringify({ id: user.id, email: user.email }));
      localStorage.setItem(this._currentUserKey, JSON.stringify({ name: user.name, email: user.email }));
    } catch (_) {}
  },

  /* ── Public API ── */

  signUp: function (name, email, password, confirm) {
    var errors = [];

    if (!name || name.trim().length < 2) errors.push('Name must be at least 2 characters.');
    if (!email || !this._validateEmail(email)) errors.push('Please enter a valid email address.');
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters.');
    if (password !== confirm) errors.push('Passwords do not match.');

    if (errors.length) return { success: false, errors: errors };

    var users = this._getUsers();
    var emailLower = email.trim().toLowerCase();

    if (users.some(function (u) { return u.email === emailLower; })) {
      return { success: false, errors: ['An account with this email already exists.'] };
    }

    var user = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: name.trim(),
      email: emailLower,
      password: this._hash(password),
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this._saveUsers(users);
    this._setSession(user);

    return { success: true, user: { id: user.id, name: user.name, email: user.email } };
  },

  logIn: function (email, password) {
    var errors = [];

    if (!email || !this._validateEmail(email)) errors.push('Please enter a valid email address.');
    if (!password) errors.push('Please enter your password.');

    if (errors.length) return { success: false, errors: errors };

    var users = this._getUsers();
    var hash = this._hash(password);
    var user = users.find(function (u) {
      return u.email === email.trim().toLowerCase() && u.password === hash;
    });

    if (!user) {
      return { success: false, errors: ['Invalid email or password.'] };
    }

    this._setSession(user);
    return { success: true, user: { id: user.id, name: user.name, email: user.email } };
  },

  logOut: function () {
    try { localStorage.removeItem(this._sessionKey); } catch (_) {}
    try { localStorage.removeItem(this._currentUserKey); } catch (_) {}
  },

  getSession: function () {
    try { return JSON.parse(localStorage.getItem(this._sessionKey)); } catch (_) { return null; }
  },

  getUser: function () {
    try { return JSON.parse(localStorage.getItem(this._currentUserKey)); } catch (_) { return null; }
  },

  isLoggedIn: function () {
    return this.getSession() !== null;
  },
};
