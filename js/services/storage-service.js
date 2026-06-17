/*
  Grove Storage Service
  Abstracts localStorage — swap to Firebase later.
*/

var StorageService = {
  get: function (key) {
    try { return JSON.parse(localStorage.getItem('grove_' + key)); } catch (_) { return null; }
  },
  set: function (key, value) {
    try { localStorage.setItem('grove_' + key, JSON.stringify(value)); } catch (_) {}
  },
  remove: function (key) {
    try { localStorage.removeItem('grove_' + key); } catch (_) {}
  },
  loadWorkspace: function () {
    return this.get('workspace');
  },
  saveWorkspace: function (state) {
    this.set('workspace', state);
  },
  loadUser: function () {
    return this.get('user');
  },
  saveUser: function (user) {
    this.set('user', user);
  },
  removeUser: function () {
    this.remove('user');
  },
  loadSettings: function () {
    return this.get('settings');
  },
  saveSettings: function (settings) {
    this.set('settings', settings);
  }
};
