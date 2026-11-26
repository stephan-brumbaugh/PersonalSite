// Photo365 viewer: calendar, 365 grid, gallery, and day view.
(function () {
  var P = window.P365, $ = function (id) { return document.getElementById(id); };
  var entries = [], byDate = {}, st = null, admin = P.isAdmin();
  var view = 'calendar', month = null, lbIndex = -1, lbFromApp = false;
  var WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var ICON_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>';

  try { view = localStorage.getItem('p365.view') || view; } catch (e) {}
  if (admin) $('fab').hidden = false;

  function fadeIn(img) { img.onload = function () { img.classList.add('ok'); }; if (img.complete && img.naturalWidth) img.classList.add('ok'); }
  function monthKey(k) { return k.slice(0, 7); }
  function shiftMonth(m, n) { var d = P.fromKey(m + '-01'); d.setMonth(d.getMonth() + n); return P.toKey(d).slice(0, 7); }

  // ── Header ──
  function renderHead() {
    st = P.stats(entries);
    if (P.cfg.title) $('title').textContent = P.cfg.title;
    var long = { month: 'long', day: 'numeric', year: 'numeric' }, day = st.today;
    $('stats').hidden = false;
    $('s-streak').textContent = st.streak;
    if (day < 1) {
      // Before Day 1: count down and show practice progress
      $('s-day').textContent = st.daysToGo;
      $('s-day').nextElementSibling.textContent = st.daysToGo === 1 ? 'Day to go' : 'Days to go';
      $('s-count').textContent = st.practice;
      $('s-count').nextElementSibling.textContent = 'Practice shots';
      $('sub').textContent = 'Day 1 is ' + P.prettyDate(st.start, long) + '. Practicing until then.';
      $('s-bar').style.width = '0';
      return;
    }
    $('s-day').textContent = day > st.total ? st.total : day;
    $('s-day').nextElementSibling.textContent = day > st.total ? 'Complete' : 'Day of ' + st.total;
    $('s-count').textContent = st.count;
    $('s-count').nextElementSibling.textContent = 'Photos';
    $('sub').textContent = P.prettyDate(st.start, long) + ' → ' + P.prettyDate(st.end, long);
    $('s-bar').style.width = Math.min(100, st.count / st.total * 100) + '%';
  }

  // ── Cells shared by calendar + grid ──
  function cellFor(k, label, extra) {
    var e = byDate[k], t = P.todayKey(), inRange = k >= st.start && k <= st.end, practice = k < st.start;
    var el;
    if (e) {
      el = document.createElement('a');
      el.href = '#day/' + k; el.className = 'cell has' + (practice ? ' practice' : '');
      el.setAttribute('aria-label', (practice ? 'Practice, ' : '') + P.prettyDate(k) + (e.caption ? ': ' + e.caption : ''));
      var img = document.createElement('img'); img.loading = 'lazy'; img.alt = ''; img.src = P.imgUrl(e, view === 'grid' ? 'grid' : 'thumb');
      fadeIn(img); el.appendChild(img);
      if (e.post) el.insertAdjacentHTML('beforeend', '<span class="dot" title="Has a post"></span>');
      if (practice && !extra) el.insertAdjacentHTML('beforeend', '<span class="tag">Practice</span>');
    } else if (admin && k <= t && (inRange || practice)) {
      // Your device: tap an empty past day to add a photo for it
      el = document.createElement('a'); el.href = 'add.html?date=' + k;
      el.className = 'cell ' + (k === t ? 'today' : practice ? 'out' : 'missed');
      el.setAttribute('aria-label', 'Add a ' + (practice ? 'practice ' : '') + 'photo for ' + P.prettyDate(k));
      if (k === t || !practice) el.innerHTML = '<span class="plus">+</span>';
    } else {
      el = document.createElement('div');
      el.className = 'cell ' + (!inRange ? 'out' : k > t ? 'future' : k === t ? 'today' : 'missed');
    }
    if (e && k === t) el.classList.add('today');
    el.insertAdjacentHTML('beforeend', '<span class="n">' + label + '</span>' + (extra || ''));
    return el;
  }

  // ── Calendar ──
  function renderCalendar(v) {
    // Calendar runs from the earliest of: first practice photo, this month (before Day 1), or Day 1
    var first = monthKey(st.start), last = monthKey(st.end), tm = monthKey(P.todayKey());
    if (entries.length && monthKey(entries[0].date) < first) first = monthKey(entries[0].date);
    if (st.today < 1 && tm < first) first = tm;
    if (month && (month < first || month > last)) month = null;
    if (!month) {
      var t = monthKey(P.todayKey());
      month = t >= first && t <= last ? t : entries.length ? monthKey(entries[entries.length - 1].date) : first;
    }
    var d1 = P.fromKey(month + '-01'), count = new Date(d1.getFullYear(), d1.getMonth() + 1, 0).getDate();
    var have = entries.filter(function (e) { return e.date.slice(0, 7) === month; }).length;
    var wrap = document.createElement('div'); wrap.className = 'cal';
    wrap.innerHTML =
      '<div class="cal-nav">' +
        '<button class="iconbtn" id="m-prev" aria-label="Previous month"' + (month <= first ? ' disabled' : '') + '>' + ICON_L + '</button>' +
        '<h2>' + d1.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) + '<small>' + have + ' photo' + (have === 1 ? '' : 's') + '</small></h2>' +
        '<button class="iconbtn" id="m-next" aria-label="Next month"' + (month >= last ? ' disabled' : '') + '>' + ICON_R + '</button>' +
      '</div>' +
      '<div class="cal-week">' + WEEK.map(function (w) { return '<div>' + w + '</div>'; }).join('') + '</div>';
    var grid = document.createElement('div'); grid.className = 'cal-grid';
    for (var i = 0; i < d1.getDay(); i++) grid.insertAdjacentHTML('beforeend', '<div class="cell blank"></div>');
    for (var dd = 1; dd <= count; dd++) grid.appendChild(cellFor(month + '-' + (dd < 10 ? '0' : '') + dd, dd));
    wrap.appendChild(grid);
    var hasPractice = st.start > month + '-01';
    wrap.insertAdjacentHTML('beforeend', '<div class="cal-foot">' +
      '<span><i style="background:var(--accent)"></i>Has a written post</span>' +
      (hasPractice ? '<span><i style="border:1px solid var(--muted)"></i>Practice (before Day 1)</span>' : '') +
      '<span><i style="border:1px dashed #555"></i>Missed</span>' +
      '<span><i style="border:1.5px solid var(--accent)"></i>Today</span></div>');
    v.appendChild(wrap);
    $('m-prev').onclick = function () { month = shiftMonth(month, -1); setHash('calendar/' + month, true); render(); };
    $('m-next').onclick = function () { month = shiftMonth(month, 1); setHash('calendar/' + month, true); render(); };
    var jump = document.createElement('button'); jump.className = 'btn ghost'; jump.textContent = 'Today'; jump.style.minHeight = '36px';
    jump.onclick = function () { month = null; setHash('calendar', true); render(); };
    $('extra').appendChild(jump);
  }

  // ── 365 grid ──
  function renderGrid(v) {
    var practice = entries.filter(function (e) { return e.date < st.start; });
    if (practice.length) {
      v.insertAdjacentHTML('beforeend', '<h3 class="gridhead">Practice <span>' + practice.length + ' before Day 1</span></h3>');
      var pg = document.createElement('div'); pg.className = 'daygrid';
      practice.forEach(function (e) {
        pg.appendChild(cellFor(e.date, P.prettyDate(e.date, { month: 'short', day: 'numeric' }), ' '));
      });
      v.appendChild(pg);
      v.insertAdjacentHTML('beforeend', '<h3 class="gridhead">The 365 <span>starts ' +
        P.prettyDate(st.start, { month: 'long', day: 'numeric', year: 'numeric' }) + '</span></h3>');
    }
    var g = document.createElement('div'); g.className = 'daygrid';
    for (var i = 0; i < st.total; i++) {
      var k = P.addDays(st.start, i), dt = P.fromKey(k);
      var m = dt.getDate() === 1 || i === 0 ? '<span class="m">' + dt.toLocaleDateString(undefined, { month: 'short' }) + '</span>' : '';
      g.appendChild(cellFor(k, i + 1, m));
    }
    v.appendChild(g);
    var span = document.createElement('span'); span.className = 'muted'; span.style.fontSize = '.85rem';
    span.textContent = st.count + ' / ' + st.total;
    $('extra').appendChild(span);
  }

  // ── Gallery ──
  var newestFirst = true, galleryFilter = 'all';
  try { newestFirst = localStorage.getItem('p365.order') !== 'old'; } catch (e) {}
  function galleryCols() { var w = window.innerWidth; return w >= 1100 ? 4 : w >= 720 ? 3 : 2; }
  var lastCols = galleryCols();
  window.addEventListener('resize', function () {
    var c = galleryCols();
    if (c !== lastCols) { lastCols = c; if (view === 'gallery') render(); }
  });
  function renderGallery(v) {
    // Masonry that keeps left-to-right reading order: each photo goes in the shortest column.
    var g = document.createElement('div'); g.className = 'gallery';
    var n = galleryCols(), cols = [], heights = [];
    for (var c = 0; c < n; c++) { var col = document.createElement('div'); col.className = 'gcol'; g.appendChild(col); cols.push(col); heights.push(0); }
    var list = entries.filter(function (e) {
      return galleryFilter === 'all' || (galleryFilter === 'practice') === (e.date < st.start);
    });
    if (newestFirst) list.reverse();
    if (!list.length) v.innerHTML = '<div class="empty"><p>Nothing here yet.</p></div>';
    list.forEach(function (e) {
      var a = document.createElement('a'); a.className = 'gitem'; a.href = '#day/' + e.date;
      var ratio = e.w && e.h ? ' width="' + e.w + '" height="' + e.h + '"' : '';
      a.innerHTML = '<div class="ph"><img loading="lazy" alt=""' + ratio + '></div>' +
        '<div class="meta"><span>' + P.dayLabel(e.date, entries) + ' · ' + P.prettyDate(e.date, { month: 'short', day: 'numeric' }) + '</span>' +
        (e.post ? '<span title="Has a post">✎</span>' : '') + '</div>' +
        (e.caption ? '<span class="cap">' + P.esc(e.caption) + '</span>' : '');
      var img = a.querySelector('img'); img.src = P.imgUrl(e, 'gallery'); img.alt = e.caption || ''; fadeIn(img);
      var i = heights.indexOf(Math.min.apply(null, heights));
      cols[i].appendChild(a);
      heights[i] += (e.w && e.h ? e.h / e.w : 1) + 0.15 + (e.caption ? 0.12 : 0);
    });
    if (list.length) v.appendChild(g);
    var hasPractice = entries.length && entries[0].date < st.start;
    var hasOfficial = entries.some(function (e) { return e.date >= st.start; });
    if (hasPractice && hasOfficial) {
      var sel = document.createElement('select'); sel.className = 'btn ghost'; sel.style.minHeight = '36px'; sel.setAttribute('aria-label', 'Show');
      sel.innerHTML = '<option value="all">All photos</option><option value="365">The 365</option><option value="practice">Practice</option>';
      sel.value = galleryFilter;
      sel.onchange = function () { galleryFilter = sel.value; render(); };
      $('extra').appendChild(sel);
    }
    var b = document.createElement('button'); b.className = 'btn ghost'; b.style.minHeight = '36px';
    b.textContent = newestFirst ? 'Newest first' : 'Oldest first';
    b.onclick = function () { newestFirst = !newestFirst; try { localStorage.setItem('p365.order', newestFirst ? 'new' : 'old'); } catch (e) {} render(); };
    $('extra').appendChild(b);
  }

  function render() {
    var v = $('view'); v.innerHTML = ''; $('extra').innerHTML = '';
    document.querySelectorAll('.seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
    if (!entries.length && view !== 'calendar') {
      v.innerHTML = '<div class="empty"><h2>No photos yet</h2><p>Day 1 is coming.</p>' +
        (admin ? '<a class="btn primary" href="add.html">Add your first photo</a>' : '') + '</div>';
      return;
    }
    if (view === 'grid') renderGrid(v); else if (view === 'gallery') renderGallery(v); else renderCalendar(v);
  }

  // ── Day view ──
  function openDay(k) {
    var i = -1;
    for (var j = 0; j < entries.length; j++) if (entries[j].date === k) { i = j; break; }
    if (i < 0) { closeLb(true); return; }
    lbIndex = i;
    var e = entries[i], img = $('lb-img');
    img.style.opacity = '.2';
    img.onload = function () { img.style.opacity = '1'; };
    img.src = P.imgUrl(e, 'full'); img.alt = e.caption || ('Photo for ' + P.prettyDate(k));
    $('lb-title').innerHTML = P.isPractice(k, entries) ? '<b>Practice</b> · before Day 1' : '<b>Day ' + P.dayNumber(k, entries) + '</b> of ' + st.total;
    $('lb-date').textContent = P.prettyDate(k);
    $('lb-cap').textContent = e.caption || ''; $('lb-cap').hidden = !e.caption;
    $('lb-post').innerHTML = P.markdown(e.post || '');
    $('lb-edit').hidden = !admin; $('lb-edit').href = 'add.html?date=' + k;
    [$('lb-prev'), $('lb-prev2')].forEach(function (b) { b.disabled = i === 0; });
    [$('lb-next'), $('lb-next2')].forEach(function (b) { b.disabled = i === entries.length - 1; });
    var lb = $('lb');
    if (!lb.classList.contains('open')) { lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
    lb.scrollTop = 0; document.querySelector('.lb-info').scrollTop = 0;
    document.title = P.dayLabel(k, entries) + ' · Photo365';
    // Warm up neighbours so swiping feels instant
    [i - 1, i + 1].forEach(function (n) { if (entries[n]) new Image().src = P.imgUrl(entries[n], 'full'); });
  }
  function closeLb(silent) {
    $('lb').classList.remove('open'); document.body.style.overflow = ''; lbIndex = -1;
    document.title = 'Photo365 · Stephan';
    if (silent) return;
    if (lbFromApp) { lbFromApp = false; history.back(); }
    else setHash(view === 'calendar' && month ? 'calendar/' + month : view, true);
  }
  function step(n) {
    var e = entries[lbIndex + n]; if (!e) return;
    setHash('day/' + e.date, true); openDay(e.date);
  }
  $('lb-close').onclick = function () { closeLb(); };
  $('lb-prev').onclick = $('lb-prev2').onclick = function () { step(-1); };
  $('lb-next').onclick = $('lb-next2').onclick = function () { step(1); };
  document.addEventListener('keydown', function (ev) {
    if (lbIndex < 0) return;
    if (ev.key === 'Escape') closeLb();
    else if (ev.key === 'ArrowLeft') step(-1);
    else if (ev.key === 'ArrowRight') step(1);
  });
  (function swipe() {
    var x0 = null, y0 = null, fig = $('lb-fig');
    fig.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    fig.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
      x0 = null;
    });
  })();

  // ── Routing: #calendar/2027-03, #grid, #gallery, #day/2027-03-14 ──
  function setHash(h, replace) {
    if (replace) history.replaceState(null, '', '#' + h); else location.hash = h;
  }
  function route() {
    var h = location.hash.replace(/^#\/?/, ''), parts = h.split('/');
    if (parts[0] === 'day' && parts[1]) {
      if (!$('view').children.length) { if (view === 'calendar') month = parts[1].slice(0, 7); render(); }
      openDay(parts[1]); return;
    }
    if (lbIndex >= 0) closeLb(true);
    if (['calendar', 'grid', 'gallery'].indexOf(parts[0]) >= 0) {
      view = parts[0];
      if (view === 'calendar' && /^\d{4}-\d{2}$/.test(parts[1] || '')) month = parts[1];
    }
    render();
  }
  window.addEventListener('hashchange', route);
  document.querySelectorAll('.seg button').forEach(function (b) {
    b.onclick = function () {
      view = b.dataset.view; try { localStorage.setItem('p365.view', view); } catch (e) {}
      setHash(view === 'calendar' && month ? 'calendar/' + month : view, true); render();
      window.scrollTo({ top: Math.min(window.scrollY, document.querySelector('.viewbar').offsetTop) });
    };
  });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#day/"]');
    if (a) lbFromApp = true;
  });

  // ── Load ──
  $('view').innerHTML = '<div class="empty">Loading…</div>';
  P.loadEntries().then(function (list) {
    entries = list; byDate = {};
    list.forEach(function (e) { byDate[e.date] = e; });
    renderHead(); $('view').innerHTML = ''; route();
  }).catch(function (err) {
    $('view').innerHTML = '<div class="empty"><h2>Couldn’t load photos</h2><p>' + P.esc(err.message) + '</p></div>';
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
