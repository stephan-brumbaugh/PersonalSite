// Shared helpers for the Photo365 viewer, upload page, and home page.
(function () {
  var CFG = window.P365_CONFIG || {};
  var SETTINGS_KEY = 'p365.settings';
  var DAY = 86400000;

  // ── Dates (always local "YYYY-MM-DD" strings) ──
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayKey() { return toKey(new Date()); }
  function addDays(k, n) { var d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); }
  function diffDays(a, b) { return Math.round((fromKey(b) - fromKey(a)) / DAY); }
  function prettyDate(k, opts) {
    return fromKey(k).toLocaleDateString(undefined, opts || { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  // ── Settings saved on the uploading device only ──
  function getSettings() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; } catch (e) {}
    var gh = CFG.github || {};
    return {
      cloudName: s.cloudName || CFG.cloudName || '',
      preset: s.preset || '',
      token: s.token || '',
      owner: s.owner || gh.owner || '',
      repo: s.repo || gh.repo || '',
      branch: s.branch || gh.branch || 'main',
      path: s.path || gh.path || 'photo365/entries.json'
    };
  }
  function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {} }
  function isAdmin() { var s = getSettings(); return !!(s.token && s.preset); }

  // ── Images ──
  var T = {
    grid: 'c_fill,g_auto,w_200,h_200,f_auto,q_auto',
    thumb: 'c_fill,g_auto,w_360,h_360,f_auto,q_auto',
    gallery: 'c_limit,w_900,f_auto,q_auto',
    full: 'c_limit,w_2000,h_2000,f_auto,q_auto'
  };
  function imgUrl(e, size) {
    if (e.url) return new URL(e.url, scriptSrc).href; // direct URL fallback
    var cloud = getSettings().cloudName || CFG.cloudName;
    return 'https://res.cloudinary.com/' + cloud + '/image/upload/' + (T[size] || T.gallery) + '/' +
      (e.version ? 'v' + e.version + '/' : '') + e.public_id.split('/').map(encodeURIComponent).join('/');
  }

  // ── Challenge maths ──
  function startKey(list) {
    if (CFG.startDate) return CFG.startDate;
    if (list && list.length) return list[0].date;
    return todayKey();
  }
  function dayNumber(k, list) { return diffDays(startKey(list), k) + 1; }
  // Anything dated before Day 1 is a practice shot.
  function isPractice(k, list) { return k < startKey(list); }
  function dayLabel(k, list) { return isPractice(k, list) ? 'Practice' : 'Day ' + dayNumber(k, list); }
  function stats(list) {
    var start = startKey(list), total = CFG.days || 365, end = addDays(start, total - 1), have = {};
    list.forEach(function (e) { have[e.date] = 1; });
    // The streak counts practice days too: it's about the habit.
    var t = todayKey(), streak = 0, k = have[t] ? t : addDays(t, -1);
    while (have[k]) { streak++; k = addDays(k, -1); }
    var official = list.filter(function (e) { return e.date >= start && e.date <= end; });
    var today = diffDays(start, t) + 1;
    var elapsed = Math.max(0, Math.min(today, total));
    return { start: start, end: end, total: total, today: today, count: official.length, streak: streak, elapsed: elapsed,
      practice: list.length - official.length - list.filter(function (e) { return e.date > end; }).length,
      daysToGo: Math.max(0, diffDays(t, start)),
      missed: Math.max(0, elapsed - official.filter(function (e) { return e.date <= t; }).length) };
  }

  // ── Text ──
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
        if (!/^(https?:|mailto:|\/|\.\/|#)/i.test(u.replace(/&amp;/g, '&'))) return t;
        return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>';
      });
  }
  // Small, safe Markdown: headings, lists, quotes, paragraphs, bold, italic, code, links.
  function markdown(src) {
    var blocks = esc(src || '').replace(/\r/g, '').split(/\n{2,}/), out = [];
    blocks.forEach(function (b) {
      b = b.replace(/^\n+|\n+$/g, ''); if (!b) return;
      var lines = b.split('\n'), m;
      if ((m = b.match(/^(#{1,3}) (.+)$/)) && lines.length === 1) {
        out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>');
      } else if (lines.every(function (l) { return /^\s*[-*] /.test(l); })) {
        out.push('<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-*] /, '')) + '</li>'; }).join('') + '</ul>');
      } else if (lines.every(function (l) { return /^\s*\d+[.)] /.test(l); })) {
        out.push('<ol>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*\d+[.)] /, '')) + '</li>'; }).join('') + '</ol>');
      } else if (lines.every(function (l) { return /^&gt; ?/.test(l); })) {
        out.push('<blockquote>' + lines.map(function (l) { return inline(l.replace(/^&gt; ?/, '')); }).join('<br>') + '</blockquote>');
      } else {
        out.push('<p>' + lines.map(inline).join('<br>') + '</p>');
      }
    });
    return out.join('\n');
  }

  // ── GitHub storage for entries.json ──
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(b64.replace(/\s/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function gh(s, url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + s.token, 'X-GitHub-Api-Version': '2022-11-28' }, opts.headers || {});
    opts.cache = 'no-store';
    return fetch('https://api.github.com/repos/' + s.owner + '/' + s.repo + url, opts).then(function (r) {
      if (r.ok) return r.json();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var err = new Error((j && j.message) || ('GitHub error ' + r.status)); err.status = r.status; throw err;
      });
    });
  }
  // Returns { data: {entries: [...]}, sha }
  function ghRead(s) {
    s = s || getSettings();
    return gh(s, '/contents/' + s.path + '?ref=' + encodeURIComponent(s.branch)).then(function (j) {
      if (j.content) return { data: parseData(b64decode(j.content)), sha: j.sha };
      // Files over 1 MB come back without content; read the blob instead.
      return gh(s, '/git/blobs/' + j.sha).then(function (b) { return { data: parseData(b64decode(b.content)), sha: j.sha }; });
    }).catch(function (e) {
      if (e.status === 404) return { data: { entries: [] }, sha: null };
      throw e;
    });
  }
  function ghWrite(s, data, sha, message) {
    var body = { message: message, content: b64encode(JSON.stringify(data, null, 2) + '\n'), branch: s.branch };
    if (sha) body.sha = sha;
    return gh(s, '/contents/' + s.path, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
      .then(function (j) { return j.content.sha; });
  }
  // Read, change, write; retries once if the file changed underneath us.
  function ghUpdate(mutate, message, s) {
    s = s || getSettings();
    function attempt(n) {
      return ghRead(s).then(function (cur) {
        var data = mutate(cur.data);
        data.entries.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
        return ghWrite(s, data, cur.sha, message).then(function () { return data; });
      }).catch(function (e) {
        if (n < 2 && (e.status === 409 || e.status === 422)) return attempt(n + 1);
        throw e;
      });
    }
    return attempt(0);
  }
  function parseData(text) {
    var d = JSON.parse(text || '{}');
    if (Array.isArray(d)) d = { entries: d };
    d.entries = d.entries || [];
    return d;
  }

  // Load entries: fresh from GitHub on the uploading device, otherwise the published file.
  function loadEntries() {
    var s = getSettings();
    var viaApi = s.token ? ghRead(s).then(function (r) { return r.data; }) : Promise.reject();
    return viaApi.catch(function () {
      var url = entriesUrl() + '?t=' + Date.now();
      return fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : '{}'; }).then(parseData);
    }).then(function (d) {
      return d.entries.filter(function (e) { return e && e.date && (e.public_id || e.url); })
        .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    });
  }
  var scriptSrc = (document.currentScript && document.currentScript.src) || location.href;
  function entriesUrl() { return new URL('entries.json', scriptSrc).href; }

  window.P365 = {
    cfg: CFG, toKey: toKey, fromKey: fromKey, todayKey: todayKey, addDays: addDays, diffDays: diffDays, prettyDate: prettyDate,
    getSettings: getSettings, saveSettings: saveSettings, isAdmin: isAdmin,
    imgUrl: imgUrl, startKey: startKey, dayNumber: dayNumber, isPractice: isPractice, dayLabel: dayLabel, stats: stats,
    esc: esc, markdown: markdown, ghRead: ghRead, ghUpdate: ghUpdate, loadEntries: loadEntries
  };
})();
