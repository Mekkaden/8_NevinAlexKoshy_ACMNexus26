/**
 * auth.js — lightweight session store (sessionStorage, no backend needed)
 * Roles: origin | node | carrier | subsidiary
 */

var CREDENTIALS = {
  origin:     { password: 'nexus26', route: '/origin',     label: 'Origin Hub' },
  node:       { password: 'nexus26', route: '/node',       label: 'Node Operations' },
  carrier:    { password: 'nexus26', route: '/carrier',    label: 'Heavy Carrier' },
  subsidiary: { password: 'nexus26', route: '/subsidiary', label: 'Subsidiary' },
};

var SESSION_KEY = 'nexus26_session';

function login(username, password) {
  var cred = CREDENTIALS[username];
  if (!cred) { return { ok: false, error: 'Unknown role.' }; }
  if (cred.password !== password) { return { ok: false, error: 'Incorrect password.' }; }
  var session = { username: username, label: cred.label, route: cred.route };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, session: session };
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

function getSession() {
  try {
    var raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export { login, logout, getSession, CREDENTIALS };
