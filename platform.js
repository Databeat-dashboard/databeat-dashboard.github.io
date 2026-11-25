/*
 * Databeat Dashboard - the website (GitHub Pages + Firestore).
 *   - Sign-in: Firebase Authentication with Google, @databeat.io accounts only.
 *   - Reading: the page reads ONLY views/<your email>/calls/... (the Firestore rules refuse anything else). Apps Script writes your
 *     view there, already cut down to what you may see (PlatformScope.gs / PlatformViews.gs), and refreshes it every 10 minutes.
 *   - Admin changes (Access Control): sent straight to the platform's Apps Script web app (PLATFORM_API_URL) with your sign-in token,
 *     applied in seconds; if the web app cannot be reached they go through "actions" and the one-minute timer instead.
 *   - Local test: ?views=<file.json> reads a saved set of views instead of Firestore (nothing is sent anywhere).
 */
(function () {
  'use strict';
  var CFG = window.FIREBASE_CONFIG || {};
  var DOMAIN = String(window.ALLOWED_DOMAIN || 'databeat.io').toLowerCase();
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var READS = ['getCurrentUserAccess', 'getBusinessSummary', 'getOverallDepartmentSummary', 'getCoreTeamAiEfficiency', 'getBillables', 'getBillablesComments',
    'getScorecardData', 'getLeadGuidelines', 'getCsatData', 'getEsatData', 'getRmgData', 'getPerformanceMetricsData', 'getAiGainsData', 'getAccountScoringData', 'getAccessAdminData'];
  var WRITES = ['saveAccessUser', 'removeAccessUser', 'saveAiVisibility'];
  var MARK = 'getCurrentUserAccess';
  var API = String(window.PLATFORM_API_URL || '').trim();

  var css = document.createElement('style');
  css.textContent =
    '#pvOverlay{position:fixed;inset:0;z-index:99999;background:rgba(13,27,46,.6);display:flex;align-items:center;justify-content:center;font:14px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif}' +
    '#pvOverlay .card{background:#fff;border-radius:16px;padding:30px 32px;max-width:440px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,.3);color:#0d1b2e;text-align:center}' +
    '#pvOverlay h2{margin:0 0 6px;font-size:21px}#pvOverlay p{margin:8px 0;color:#4b5563}#pvOverlay .err{color:#b91c1c}' +
    '#pvOverlay button{margin-top:16px;background:#12b0a0;color:#fff;border:0;border-radius:10px;padding:11px 18px;font-weight:600;cursor:pointer;font-size:14px}' +
    '#pvOverlay button:hover{background:#0d8c80}' +
    '#pvToast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99998;background:#0d1b2e;color:#fff;padding:10px 16px;border-radius:10px;font:13px -apple-system,"Segoe UI",sans-serif;display:none;max-width:calc(100% - 32px)}' +
    '#pvUser{position:fixed;right:14px;bottom:14px;z-index:9997;background:#0d1b2e;color:#fff;border-radius:999px;padding:6px 8px 6px 14px;font:12px -apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);display:flex;align-items:center;gap:8px}' +
    '#pvUser button{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:999px;padding:4px 10px;cursor:pointer;font-size:12px}';
  document.head.appendChild(css);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function whenBody(f) { if (document.body) f(); else document.addEventListener('DOMContentLoaded', f); }
  function overlay(html) {
    whenBody(function () {
      var o = document.getElementById('pvOverlay');
      if (!html) { if (o) o.remove(); return; }
      if (!o) { o = document.createElement('div'); o.id = 'pvOverlay'; document.body.appendChild(o); }
      o.innerHTML = '<div class="card">' + html + '</div>';
    });
  }
  var toastT = null;
  function toast(msg, ms) {
    whenBody(function () {
      var t = document.getElementById('pvToast');
      if (!t) { t = document.createElement('div'); t.id = 'pvToast'; document.body.appendChild(t); }
      t.textContent = msg; t.style.display = msg ? 'block' : 'none';
      clearTimeout(toastT); if (msg) toastT = setTimeout(function () { t.style.display = 'none'; }, ms || 5000);
    });
  }

  /* ---------------------------------------------------------------- the stored views */
  function key(fn, args) {   // the same key PlatformSync.gs writes (fsKey_)
    return (fn + '__' + JSON.stringify(args || [])).replace(/[^A-Za-z0-9_\-.@]/g, function (c) { return '_' + c.charCodeAt(0).toString(16) + '_'; }).substring(0, 1400);
  }
  var fb = null, auth = null, db = null, me = '', CALLS = {}, waiters = [], readyResolve, ready = new Promise(function (r) { readyResolve = r; }), LOCAL = false;
  function setCalls(next) { CALLS = next; waiters = waiters.filter(function (w) { if (w.test()) { w.done(); return false; } return true; }); }
  function onCalls(snap) {
    var parts = {};
    snap.forEach(function (d) { var base = d.id.replace(/~p\d+$/, ''); (parts[base] = parts[base] || []).push(d.data()); });
    var next = {};
    Object.keys(parts).forEach(function (base) {
      var list = parts[base].sort(function (a, b) { return (a.part || 0) - (b.part || 0); }), head = list[0];
      if (!head || head.part !== 0 || list.length < (head.parts || 1)) return;   // not all parts arrived yet
      next[base] = { json: list.map(function (p) { return p.json; }).join(''), at: head.at || '' };
    });
    setCalls(next);
  }
  function waitFor(test, ms) {
    return new Promise(function (ok, bad) {
      if (test()) { ok(); return; }
      var w = { test: test, done: function () { clearTimeout(t); ok(); } };
      var t = setTimeout(function () { waiters = waiters.filter(function (x) { return x !== w; }); bad(new Error('timeout')); }, ms);
      waiters.push(w);
    });
  }
  function stored(fn, args) { var c = CALLS[key(fn, args)]; return c ? JSON.parse(c.json) : null; }
  function answer(r) { if (r.ok) return r.result; throw new Error(r.error || 'Failed'); }
  /** The platform's web app: answers in seconds. Rejects when it is not set up or cannot be reached (callers then use the queue). */
  async function api(op, extra, ms) {
    if (!API || LOCAL || !auth || !auth.currentUser) throw new Error('no api');
    var token = await auth.currentUser.getIdToken();
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 90000) : null;
    try {
      var r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ platform: 1, idToken: token, op: op }, extra || {})), signal: ctl ? ctl.signal : undefined });
      var j = await r.json();
      if (!j || j.ok !== true) { var err = new Error((j && j.error) || 'The platform did not answer.'); err.answered = true; throw err; }
      return j;
    } finally { if (timer) clearTimeout(timer); }
  }
  function atOf(fn, args) { var c = CALLS[key(fn, args)]; return c ? c.at : ''; }
  async function ask(fn, args) {   // a view that is not prepared yet
    if (LOCAL) throw new Error('Not in the saved views: ' + fn);
    toast('Fetching this from the sheet…', 70000);
    try { await api('prepare', { calls: [[fn, args]] }); await waitFor(function () { return !!stored(fn, args); }, 15000); toast(''); return answer(stored(fn, args)); }
    catch (e) { /* fall back to the queue */ }
    var send = function () { return fb.fs.setDoc(fb.fs.doc(db, 'wants', me), { at: new Date().toISOString(), pending: true, calls: fb.fs.arrayUnion(JSON.stringify({ fn: fn, args: args })) }, { merge: true }); };
    await send();
    try { await waitFor(function () { return !!stored(fn, args); }, 75000); }
    catch (e) {
      await send();
      try { await waitFor(function () { return !!stored(fn, args); }, 90000); }
      catch (e2) { toast(''); throw new Error('The data did not arrive in time. The Apps Script timer (platformQuick) may be stopped; ask the admin.'); }
    }
    toast('');
    return answer(stored(fn, args));
  }
  async function act(fn, args) {   // an Admin change: Apps Script does it as you, after checking you are an admin
    if (LOCAL) throw new Error('Changes are not saved in the local test.');
    var before = atOf('getAccessAdminData', []);
    toast('Saving…', 60000);
    try {
      var j = await api('action', { fn: fn, args: args }, 60000);
      try { await waitFor(function () { return atOf('getAccessAdminData', []) !== before; }, 8000); } catch (e) { /* the list follows in a moment */ }
      toast('Saved. Live on the platform and the dashboard.', 3500);
      return j.result;
    } catch (e) {
      if (e && e.answered) { toast(''); throw e; }
    }
    toast('Saving… it is applied within about a minute.', 120000);
    var ref = await fb.fs.addDoc(fb.fs.collection(db, 'actions'), { by: me, fn: fn, args: JSON.stringify(args), status: 'new', at: new Date().toISOString() });
    var res = await new Promise(function (ok, bad) {
      var stop = null, t = setTimeout(function () { if (stop) stop(); bad(new Error('Not applied yet: the Apps Script timer (platformQuick) may be stopped.')); }, 240000);
      stop = fb.fs.onSnapshot(ref, function (s) {
        var x = s.data() || {};
        if (x.status === 'done' || x.status === 'error') { clearTimeout(t); stop(); try { ok(Object.assign(JSON.parse(x.json || '{}'), { doneAt: x.doneAt || '' })); } catch (e) { bad(e); } }
      }, function (e) { clearTimeout(t); bad(e); });
    });
    try { await waitFor(function () { return atOf('getAccessAdminData', []) !== before; }, 8000); } catch (e) { /* follows */ }
    toast(res.ok ? 'Saved.' : '', 3000);
    return answer(res);
  }
  /** "Update now": brings this person's pages up to date with the sheet (only what changed is rewritten). */
  window.platformUpdateNow = function () {
    if (LOCAL) return Promise.resolve({ ok: true, written: 0 });
    return api('prepare', {}, 120000).catch(function () {
      return fb.fs.setDoc(fb.fs.doc(db, 'wants', me), { at: new Date().toISOString(), pending: true }, { merge: true }).then(function () { return { ok: true, queued: true }; });
    });
  };

  /* ---------------------------------------------------------------- sign-in and start */
  async function boot() {
    var lv = new URLSearchParams(location.search).get('views');
    if (lv && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {   // local test only
      LOCAL = true;
      var j = await (await fetch(lv)).json();
      me = j.email; setCalls(j.calls); readyResolve(); userChip(me + ' (local test)'); return;
    }
    if (!CFG.apiKey) { overlay('<h2>Almost there</h2><p>firebase-config.js is missing.</p>'); return; }
    var app = await import(SDK + 'firebase-app.js'), au = await import(SDK + 'firebase-auth.js'), fs = await import(SDK + 'firebase-firestore.js');
    fb = { au: au, fs: fs };
    var fa = app.initializeApp(CFG);
    auth = au.getAuth(fa); db = fs.getFirestore(fa);
    au.onAuthStateChanged(auth, function (u) {
      if (!u) { signIn(''); return; }
      var email = String(u.email || '').toLowerCase();
      if (email.split('@')[1] !== DOMAIN) { au.signOut(auth); signIn('Only @' + DOMAIN + ' accounts can open this dashboard. You signed in as ' + email + '.'); return; }
      me = email;
      start().catch(function (e) { overlay('<h2>Could not load the dashboard</h2><p class="err">' + esc(e.message) + '</p><button onclick="location.reload()">Try again</button>'); });
    });
  }
  function signIn(err) {
    overlay('<h2>Databeat Dashboard</h2><p>Sign in with your ' + esc(DOMAIN) + ' Google account.</p>' + (err ? '<p class="err">' + esc(err) + '</p>' : '') + '<button id="pvSignIn">Sign in with Google</button>');
    whenBody(function () {
      setTimeout(function () {
        var b = document.getElementById('pvSignIn'); if (!b) return;
        b.onclick = function () {
          var p = new fb.au.GoogleAuthProvider();
          p.setCustomParameters({ hd: DOMAIN, prompt: 'select_account' });
          fb.au.signInWithPopup(auth, p).catch(function (e) { signIn(e.code === 'auth/popup-closed-by-user' ? '' : e.message); });
        };
      }, 0);
    });
  }
  function userChip(text) {
    whenBody(function () {
      var el = document.createElement('div'); el.id = 'pvUser';
      el.innerHTML = '<span>' + esc(text) + '</span>' + (LOCAL ? '' : '<button id="pvOut">Sign out</button>');
      document.body.appendChild(el);
      var o = document.getElementById('pvOut'); if (o) o.onclick = function () { fb.au.signOut(auth).then(function () { location.reload(); }); };
    });
  }
  async function start() {
    overlay('<h2>Loading…</h2><p>Reading your dashboard.</p>');
    var first = true;
    await new Promise(function (ok, bad) {
      fb.fs.onSnapshot(fb.fs.collection(db, 'views', me, 'calls'), function (s) { onCalls(s); if (first) { first = false; ok(); } },
        function (e) { bad(new Error(/permission/i.test(e.message) ? 'Firestore refused to read your dashboard (check the security rules).' : e.message)); });
    });
    var has = !!CALLS[key(MARK, [])];
    if (!has) {
      overlay('<h2>Preparing your dashboard</h2><p>This is the first time you open it. It is prepared from the sheet for you; this takes up to a minute.</p>');
      var fast = false;
      try { await api('prepare', { force: true }, 120000); fast = true; } catch (e) { /* queue below */ }
      if (!fast) await fb.fs.setDoc(fb.fs.doc(db, 'wants', me), { at: new Date().toISOString(), first: true, pending: true }, { merge: true });
      try { await waitFor(function () { return !!CALLS[key(MARK, [])]; }, 180000); }
      catch (e) { throw new Error('Your dashboard was not prepared in time. The Apps Script timer (platformQuick) may be stopped; ask the admin.'); }
    }
    else {   // already prepared: show it now, and bring it up to date with the sheet in the background
      api('prepare', {}, 120000).catch(function () { fb.fs.setDoc(fb.fs.doc(db, 'wants', me), { at: new Date().toISOString(), pending: true }, { merge: true }); });
    }
    overlay(null);
    userChip(me);
    readyResolve();
  }

  /* ---------------------------------------------------------------- google.script.run for the dashboard page */
  function call(fn, args) {
    return ready.then(function () {
      if (READS.indexOf(fn) !== -1) { var r = stored(fn, args); return r ? answer(r) : ask(fn, args); }
      if (WRITES.indexOf(fn) !== -1) return act(fn, args);
      throw new Error('Not available on the website: ' + fn);
    });
  }
  function runner(ok, fail, obj) {
    var target = {
      withSuccessHandler: function (f) { return runner(f, fail, obj); },
      withFailureHandler: function (f) { return runner(ok, f, obj); },
      withUserObject: function (o) { return runner(ok, fail, o); }
    };
    return new Proxy(target, {
      get: function (t, name) {
        if (name in t) return t[name];
        return function () {
          var args = Array.prototype.slice.call(arguments);
          call(String(name), args).then(function (r) { if (ok) ok(r, obj); }, function (e) { if (fail) fail(new Error((e && e.message) || String(e)), obj); });
        };
      }
    });
  }
  window.google = { script: { get run() { return runner(null, null, undefined); } } };
  boot().catch(function (e) { overlay('<h2>Could not start</h2><p class="err">' + esc(e.message) + '</p>'); });
})();
