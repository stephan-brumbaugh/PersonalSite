// Photo365 upload page: pick a photo, add optional words, publish.
// Photos go to Cloudinary; captions and posts are saved to entries.json in your GitHub repo.
(function () {
  var P = window.P365, $ = function (id) { return document.getElementById(id); };
  var S = P.getSettings(), entries = [], byDate = {}, cur = null, file = null, prepared = null, busy = false;
  var params = new URLSearchParams(location.search);

  // ───────────── Setup ─────────────
  function showSetup(canCancel) {
    $('setup').hidden = false; $('editor').hidden = true; $('publishbar').hidden = true;
    $('f-cloud').value = S.cloudName === 'YOUR_CLOUD_NAME' ? '' : S.cloudName;
    $('f-preset').value = S.preset;
    $('f-owner').value = /^YOUR_/.test(S.owner) ? '' : S.owner;
    $('f-repo').value = /^YOUR_/.test(S.repo) ? '' : S.repo;
    $('f-branch').value = S.branch || 'main';
    $('f-path').value = S.token ? S.path : guessPath($('f-repo').value);
    $('f-token').value = S.token;
    $('cancel-setup').hidden = !canCancel; $('forget').hidden = !S.token;
  }
  $('f-owner').addEventListener('input', function () {
    if (!$('f-repo').dataset.touched) $('f-repo').value = $('f-owner').value ? $('f-owner').value.toLowerCase() + '.github.io' : '';
  });
  $('f-repo').addEventListener('input', function () { $('f-repo').dataset.touched = '1'; });
  ['f-owner', 'f-repo'].forEach(function (id) {
    $(id).addEventListener('input', function () { if (!$('f-path').dataset.touched) $('f-path').value = guessPath($('f-repo').value); });
  });
  $('f-path').addEventListener('input', function () { $('f-path').dataset.touched = '1'; });
  // Works out where entries.json sits in the repo from this page's own address.
  // username.github.io repos serve from the site root; other repos serve from /repo-name/.
  function guessPath(repo) {
    var dir = location.pathname.replace(/[^\/]*$/, '').replace(/^\/+/, '');
    if (repo && !/\.github\.io$/i.test(repo)) dir = dir.replace(/^[^\/]+\//, '');
    return (location.hostname.endsWith('github.io') ? dir : 'photo365/') + 'entries.json';
  }
  $('open-settings').onclick = function () { showSetup(true); };
  $('cancel-setup').onclick = function () { showEditor(); };
  $('forget').onclick = function () {
    if (!confirm('Remove your saved token and settings from this device?')) return;
    try { localStorage.removeItem('p365.settings'); } catch (e) {}
    S = P.getSettings(); showSetup(false);
  };
  $('setup-form').onsubmit = function (ev) {
    ev.preventDefault();
    var s = {
      cloudName: $('f-cloud').value.trim(), preset: $('f-preset').value.trim(),
      owner: $('f-owner').value.trim(), repo: $('f-repo').value.trim(),
      branch: $('f-branch').value.trim() || 'main',
      // Drop spaces, line breaks and invisible characters that sneak in when copying the token
      token: $('f-token').value.replace(/[^\x21-\x7e]/g, ''),
      path: $('f-path').value.trim().replace(/^\/+/, '') || 'photo365/entries.json'
    };
    // Accept a pasted GitHub link like https://github.com/name/repo in either box
    var link = (s.owner + ' ' + s.repo).match(/github\.com\/([^\/\s]+)\/([^\/\s#?]+)/i);
    if (link) { s.owner = link[1]; s.repo = link[2].replace(/\.git$/, ''); }
    s.owner = s.owner.replace(/^@/, ''); s.repo = s.repo.replace(/^.*\//, '');
    $('f-owner').value = s.owner; $('f-repo').value = s.repo; $('f-token').value = s.token;
    var out = $('setup-status'); out.className = 'status'; out.textContent = 'Checking GitHub…';
    fetch('https://api.github.com/repos/' + s.owner + '/' + s.repo, { headers: { Authorization: 'Bearer ' + s.token, Accept: 'application/vnd.github+json' }, cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.j.message === 'Not Found' ? 'Repo not found, or the token can’t see it.' : (r.j.message || 'GitHub rejected the token.'));
        if (r.j.permissions && !r.j.permissions.push) throw new Error('The token can read the repo but not write to it. Give it Contents: Read and write.');
        P.saveSettings(s); S = P.getSettings();
        out.className = 'status ok'; out.textContent = 'Connected. Saved on this device.';
        setTimeout(showEditor, 500);
      })
      .catch(function (e) { out.className = 'status err'; out.textContent = P.explain(e); });
  };

  // ───────────── Editor ─────────────
  function showEditor() {
    $('setup').hidden = true; $('editor').hidden = false; $('publishbar').hidden = false;
    setStatus('Loading your entries…');
    P.ghRead(S).then(function (r) {
      setEntries(r.data.entries); setStatus('');
      loadDate(params.get('date') || P.todayKey());
    }).catch(function (e) {
      setStatus(P.explain(e), 'err');
      loadDate(params.get('date') || P.todayKey());
    });
    if (params.get('shared')) receiveShared();
  }
  function setEntries(list) {
    entries = list.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    byDate = {}; entries.forEach(function (e) { byDate[e.date] = e; });
    renderLists();
  }

  function loadDate(k) {
    $('date').value = k;
    cur = byDate[k] || null;
    var startList = entries.length ? entries : [{ date: k }];
    var label = P.dayLabel(k, startList);
    var pill = $('daypill'); pill.textContent = label; pill.className = 'daypill' + (cur ? ' has' : '');
    pill.title = P.isPractice(k, startList) ? 'Before Day 1. Shows on the site but doesn’t count toward the 365.' : '';
    $('ed-title').textContent = k === P.todayKey() ? 'Today' : P.prettyDate(k, { weekday: 'short', month: 'long', day: 'numeric' });
    $('mode-label').textContent = (cur ? 'Editing · ' : 'New entry · ') + label;
    $('delete').hidden = !cur;
    $('publish').textContent = cur ? 'Save changes' : 'Publish';
    $('view-link').hidden = !cur; $('view-link').href = './#day/' + k;

    var d = readDraft(k);
    $('caption').value = d ? d.caption : cur ? cur.caption || '' : '';
    $('post').value = d ? d.post : cur ? cur.post || '' : '';
    $('want-post').checked = !!$('post').value; $('post-wrap').hidden = !$('want-post').checked;
    showTab('write');

    if (!file) {
      if (cur) showPreview(P.imgUrl(cur, 'gallery'), 'Current photo. Tap to replace it.');
      else clearPreview();
    }
    prepareShare();
  }

  // ───────────── Share to Instagram / Facebook ─────────────
  // Copies the caption, then hands the photo to the phone's share menu.
  // The photo is fetched ahead of time because phones only allow the share
  // menu to open straight from a tap.
  var justUploaded = null, shareFile = null, shareFor = null, dayPageWrittenAt = {};
  function shareText(k) {
    var list = entries.length ? entries : [{ date: k }];
    var tag = P.isPractice(k, list) ? 'Practice shot' : 'Day ' + P.dayNumber(k, list) + ' of ' + (P.cfg.days || 365);
    return ((cur && cur.caption) ? cur.caption + '\n\n' : '') + tag + ' #photo365';
  }
  function prepareShare() {
    var k = $('date').value;
    $('share-panel').hidden = !cur;
    if (!cur) return;
    $('share-text').value = shareText(k);
    $('fb-text').value = fbText();
    $('share-status').textContent = ''; $('share-status').className = 'status';
    if (fb.k !== k || !fb.ready) { fbSet('Checking link…', false); checkFbLink(k, dayPageWrittenAt[k]); }
    if (shareFor === k && shareFile) return;
    shareFor = k; shareFile = null;
    var name = 'photo365-' + k + '.jpg';
    if (justUploaded && justUploaded.date === k) { shareFile = new File([justUploaded.blob], name, { type: 'image/jpeg' }); return; }
    fetch(P.imgUrl(cur, 'share')).then(function (r) { if (!r.ok) throw new Error(); return r.blob(); })
      .then(function (b) { if (shareFor === k) shareFile = new File([b], name, { type: b.type || 'image/jpeg' }); })
      .catch(function () {});
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
    return Promise.resolve();
  }
  $('share-btn').onclick = function () {
    var out = $('share-status'), text = $('share-text').value;
    if (!shareFile) { out.className = 'status'; out.textContent = 'Still getting the photo ready. Try again in a second.'; return; }
    var copied = copyText(text).then(function () { return true; }, function () { return false; });
    var data = { files: [shareFile] };
    if (navigator.canShare && navigator.canShare(data)) {
      navigator.share(data).then(function () {
        copied.then(function (ok) { out.className = 'status ok'; out.textContent = ok ? 'Caption copied. In Instagram, long-press the caption box and Paste.' : 'Shared. Copy the caption from the box above if you need it.'; });
      }).catch(function (e) {
        if (e && e.name === 'AbortError') { out.className = 'status'; out.textContent = 'Share cancelled. The caption is still copied.'; return; }
        saveInstead();
      });
    } else saveInstead();
    function saveInstead() {
      // Computers and older browsers can't share files: save the photo instead
      var a = document.createElement('a'); a.href = URL.createObjectURL(shareFile); a.download = shareFile.name;
      document.body.appendChild(a); a.click(); a.remove();
      copied.then(function (ok) {
        out.className = 'status ok';
        out.textContent = 'This browser can’t open the share menu, so the photo was saved to your downloads' + (ok ? ' and the caption was copied.' : '.') + ' Post it from the Instagram app.';
      });
    }
  };
  $('share-copy').onclick = function () {
    copyText($('share-text').value).then(function () { $('share-status').className = 'status ok'; $('share-status').textContent = 'Caption copied.'; });
  };

  // ───────────── Per-day share pages ─────────────
  // Facebook needs a real page per post to show the photo and caption as a
  // link preview. Each published day gets photo365/day/DATE.html, which holds
  // the preview details and forwards visitors to that day on the site.
  function dayRepoPath(k) { return S.path.replace(/[^\/]*$/, '') + 'day/' + k + '.html'; }
  function dayUrl(k) { return new URL('day/' + k + '.html', location.href).href; }
  function plain(md) {
    return String(md || '')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1 ($2)')
      .replace(/^#{1,3} /gm, '').replace(/^> ?/gm, '').replace(/^\s*[-*] /gm, '• ')
      .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2')
      .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1$2').replace(/`([^`]+)`/g, '$1').trim();
  }
  function dayPageHtml(e, list) {
    var k = e.date, E = P.esc;
    var label = P.isPractice(k, list) ? 'Practice shot' : 'Day ' + P.dayNumber(k, list) + ' of ' + (P.cfg.days || 365);
    var title = (e.caption ? e.caption + ' · ' : '') + label;
    var text = (plain(e.post) || e.caption || '').replace(/\s+/g, ' ');
    var desc = (text ? (text.length > 200 ? text.slice(0, 197).replace(/\s+\S*$/, '') + '…' : text) : P.prettyDate(k));
    var url = dayUrl(k), img = P.imgUrl(e, 'og'), back = '../#day/' + k;
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + E(title) + '</title>\n' +
      '<meta name="description" content="' + E(desc) + '">\n' +
      '<link rel="canonical" href="' + E(url) + '">\n' +
      '<meta property="og:type" content="article">\n' +
      '<meta property="og:site_name" content="' + E(P.cfg.title || 'Photo365') + '">\n' +
      '<meta property="og:title" content="' + E(title) + '">\n' +
      '<meta property="og:description" content="' + E(desc) + '">\n' +
      '<meta property="og:url" content="' + E(url) + '">\n' +
      '<meta property="og:image" content="' + E(img) + '">\n' +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      '<script>location.replace(' + JSON.stringify(back) + ');</script>\n' +
      '<style>body{background:#0d0d0e;color:#ececec;font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px 16px}img{max-width:100%;border-radius:6px}a{color:#e4b363}</style>\n' +
      '</head>\n<body>\n<p><a href="' + E(back) + '">View on the site →</a></p>\n' +
      '<img src="' + E(img) + '" alt="' + E(e.caption || label) + '">\n' +
      '<p>' + E(P.prettyDate(k)) + ' · ' + E(label) + '</p>\n' +
      (e.caption ? '<h1>' + E(e.caption) + '</h1>\n' : '') + P.markdown(e.post || '') + '\n</body>\n</html>\n';
  }
  function writeDayPage(e) {
    return P.ghPutFile(S, dayRepoPath(e.date), dayPageHtml(e, entries), 'Share page for Photo365 ' + e.date);
  }

  // ───────────── Share to Facebook (link back to the post) ─────────────
  var fb = { k: null, ready: false, timer: null };
  function fbText() {
    if (!cur) return '';
    return [cur.caption || '', plain(cur.post)].filter(Boolean).join('\n\n');
  }
  function fbSet(label, ready) { fb.ready = ready; $('fb-btn').lastChild.textContent = ' ' + label; $('fb-btn').classList.toggle('waiting', !ready); }
  function checkFbLink(k, written) {
    clearTimeout(fb.timer);
    fb.k = k;
    fetch(dayUrl(k) + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (fb.k !== k) return;
      if (r.ok) { fbSet('Share to Facebook', true); return; }
      if (!written) {
        // An older entry without a share page yet: make one now
        fbSet('Getting the link ready…', false);
        return writeDayPage(cur).then(function () { dayPageWrittenAt[k] = Date.now(); checkFbLink(k, dayPageWrittenAt[k]); }, function (e) {
          fbSet('Share to Facebook', false);
          $('share-status').className = 'status err';
          $('share-status').textContent = 'Couldn’t make the share link: ' + P.explain(e);
        });
      }
      fbSet('Link going live… (about a minute)', false);
      if (Date.now() - written < 5 * 60000) fb.timer = setTimeout(function () { checkFbLink(k, written); }, 8000);
      else fbSet('Link not live yet. Try again later.', false);
    }).catch(function () { if (fb.k === k) fbSet('Share to Facebook', true); });
  }
  $('fb-btn').onclick = function () {
    var k = $('date').value, out = $('share-status');
    if (!cur) return;
    if (!fb.ready) { out.className = 'status'; out.textContent = 'GitHub is still publishing the page for this post. The button turns on when the link works.'; return; }
    var url = dayUrl(k), text = $('fb-text').value;
    var copied = text ? copyText(text).then(function () { return true; }, function () { return false; }) : Promise.resolve(false);
    var done = function () {
      copied.then(function (ok) {
        out.className = 'status ok';
        out.textContent = ok ? 'Your text is copied. In Facebook, tap where it says to write something and Paste. The link preview is added for you.' : 'Opened Facebook with the link.';
      });
    };
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if (touch && navigator.share) {
      // Phone: share sheet → pick Facebook
      navigator.share({ url: url }).then(done).catch(function (e) {
        if (e && e.name === 'AbortError') { out.className = 'status'; out.textContent = 'Share cancelled.'; return; }
        openSharer();
      });
    } else openSharer();
    function openSharer() {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), 'fbshare', 'width=640,height=640');
      done();
    }
  };
  $('fb-copy-link').onclick = function () {
    copyText(dayUrl($('date').value)).then(function () { $('share-status').className = 'status ok'; $('share-status').textContent = 'Link copied.'; });
  };
  $('date').addEventListener('change', function () {
    if (!$('date').value) return;
    history.replaceState(null, '', '?date=' + $('date').value);
    loadDate($('date').value);
  });

  // Photo picking + preview
  function showPreview(src, note) {
    $('preview').src = src; $('preview').hidden = false; $('drop-hint').hidden = true;
    $('drop').classList.add('filled'); $('photo-note').textContent = note || '';
  }
  function clearPreview() {
    $('preview').hidden = true; $('preview').removeAttribute('src'); $('drop-hint').hidden = false;
    $('drop').classList.remove('filled'); $('photo-note').textContent = '';
  }
  function setFile(f) {
    if (!f) return;
    if (!/^image\//.test(f.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(f.name || '')) { setStatus('That file isn’t an image.', 'err'); return; }
    file = f;
    showPreview(URL.createObjectURL(f), 'Preparing…');
    prepared = compress(f).then(function (r) {
      $('photo-note').textContent = (r.resized ? 'Resized to ' + r.w + '×' + r.h + ', ' : '') + (r.blob.size >= 1048576 ? (r.blob.size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(r.blob.size / 1024)) + ' KB') + ' to upload' + (cur ? '. This will replace the current photo.' : '');
      return r;
    });
  }
  $('file').addEventListener('change', function () { setFile($('file').files[0]); });
  ['dragover', 'dragenter'].forEach(function (t) { $('drop').addEventListener(t, function (e) { e.preventDefault(); $('drop').classList.add('drag'); }); });
  ['dragleave', 'drop'].forEach(function (t) { $('drop').addEventListener(t, function () { $('drop').classList.remove('drag'); }); });
  $('drop').addEventListener('drop', function (e) { e.preventDefault(); setFile(e.dataTransfer.files[0]); });

  // Shrink big phone photos before upload (long edge 2560px, JPEG 85%).
  function compress(f) {
    var MAX = 2560;
    function draw(src, w, h) {
      var s = Math.min(1, MAX / Math.max(w, h)), cw = Math.round(w * s), ch = Math.round(h * s);
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      c.getContext('2d').drawImage(src, 0, 0, cw, ch);
      return new Promise(function (res) { c.toBlob(function (b) { res({ blob: b, w: cw, h: ch, resized: s < 1 }); }, 'image/jpeg', 0.85); });
    }
    function viaImg() {
      return new Promise(function (res, rej) {
        var img = new Image(); img.onload = function () { res(draw(img, img.naturalWidth, img.naturalHeight)); }; img.onerror = rej;
        img.src = URL.createObjectURL(f);
      });
    }
    var p = window.createImageBitmap
      ? createImageBitmap(f, { imageOrientation: 'from-image' }).then(function (b) { return draw(b, b.width, b.height); }).catch(viaImg)
      : viaImg();
    return p.then(function (r) {
      if (!r.blob || (r.blob.size > f.size && !r.resized)) return { blob: f, w: r.w, h: r.h, resized: false };
      return r;
    }).catch(function () { return { blob: f, w: 0, h: 0, resized: false }; }); // e.g. HEIC the browser can't read: Cloudinary converts it
  }

  // Post editor
  $('want-post').addEventListener('change', function () { $('post-wrap').hidden = !$('want-post').checked; if ($('want-post').checked) $('post').focus(); saveDraft(); });
  document.querySelectorAll('.tabs button').forEach(function (b) { b.onclick = function () { showTab(b.dataset.t); }; });
  function showTab(t) {
    document.querySelectorAll('.tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.t === t)); });
    $('post').hidden = t !== 'write'; $('post-preview').hidden = t !== 'preview';
    if (t === 'preview') $('post-preview').innerHTML = P.markdown($('post').value) || '<p class="muted">Nothing written yet.</p>';
  }

  // Drafts survive closing the app mid-thought
  function draftKey(k) { return 'p365.draft.' + k; }
  function readDraft(k) { try { return JSON.parse(localStorage.getItem(draftKey(k))); } catch (e) { return null; } }
  function saveDraft() {
    var k = $('date').value; if (!k) return;
    var d = { caption: $('caption').value, post: $('want-post').checked ? $('post').value : '' };
    var base = cur ? { caption: cur.caption || '', post: cur.post || '' } : { caption: '', post: '' };
    try {
      if (d.caption === base.caption && d.post === base.post) localStorage.removeItem(draftKey(k));
      else localStorage.setItem(draftKey(k), JSON.stringify(d));
    } catch (e) {}
  }
  $('caption').addEventListener('input', saveDraft);
  $('post').addEventListener('input', saveDraft);

  // ───────────── Publish ─────────────
  function setStatus(msg, kind) { var s = $('status'); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); }
  function setBar(p) { var b = $('bar'); b.style.display = p == null ? 'none' : 'block'; b.firstElementChild.style.width = (p || 0) + '%'; }

  // Tries with a dated file name first; if the preset's settings reject that,
  // retries with only the photo and the preset so any preset setup works.
  function upload(blob, k) {
    return uploadOnce(blob, k, true).catch(function (e) {
      if (e.status === 400) return uploadOnce(blob, k, false);
      throw e;
    });
  }
  function uploadOnce(blob, k, extras) {
    return new Promise(function (res, rej) {
      var fd = new FormData();
      fd.append('file', blob, k + '.jpg');
      fd.append('upload_preset', S.preset);
      if (extras) {
        fd.append('public_id', k + '-' + Math.random().toString(36).slice(2, 8));
        fd.append('tags', 'photo365');
      }
      var x = new XMLHttpRequest();
      x.open('POST', 'https://api.cloudinary.com/v1_1/' + encodeURIComponent(S.cloudName) + '/image/upload');
      x.upload.onprogress = function (e) { if (e.lengthComputable) setBar(5 + e.loaded / e.total * 80); };
      x.onload = function () {
        var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {}
        if (x.status >= 200 && x.status < 300 && j.public_id) res(j);
        else {
          var err = new Error('Photo upload failed: ' + ((j.error && j.error.message) || x.status));
          err.status = x.status; rej(err);
        }
      };
      x.onerror = function () { rej(new Error('Photo upload failed. Check your connection.')); };
      x.send(fd);
    });
  }

  $('publish').onclick = function () {
    if (busy) return;
    var k = $('date').value;
    if (!k) { setStatus('Pick a date.', 'err'); return; }
    if (!file && !cur) { setStatus('Choose a photo first.', 'err'); return; }
    busy = true; $('publish').disabled = true; setBar(3);
    var caption = $('caption').value.trim();
    var post = $('want-post').checked ? $('post').value.trim() : '';
    var n = P.dayLabel(k, entries.length ? entries : [{ date: k }]).toLowerCase();

    var photo = file
      ? (setStatus('Preparing photo…'), prepared.then(function (r) { setStatus('Uploading photo…'); justUploaded = { date: k, blob: r.blob }; return upload(r.blob, k); }))
      : Promise.resolve(null);

    photo.then(function (up) {
      setBar(90); setStatus('Saving…');
      return P.ghUpdate(function (data) {
        var old = null;
        data.entries = data.entries.filter(function (e) { if (e.date === k) { old = e; return false; } return true; });
        var e = Object.assign({}, old || {}, { date: k, caption: caption, post: post, updated: new Date().toISOString() });
        if (up) { e.public_id = up.public_id; e.version = up.version; e.w = up.width; e.h = up.height; delete e.url; }
        if (!e.caption) delete e.caption;
        if (!e.post) delete e.post;
        data.entries.push(e);
        return data;
      }, (cur ? 'Update' : 'Add') + ' Photo365 ' + n + ' (' + k + ')', S);
    }).then(function (data) {
      setBar(100);
      try { localStorage.removeItem(draftKey(k)); } catch (e) {}
      file = null; prepared = null; $('file').value = '';
      shareFor = null; fb.k = null; setEntries(data.entries);
      dayPageWrittenAt[k] = Date.now();
      writeDayPage(byDate[k]).catch(function () { delete dayPageWrittenAt[k]; });
      loadDate(k);
      $('share-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus((n === 'practice' ? 'Published practice shot. It won’t count toward the 365.' : 'Published ' + n + '.') + ' The public site updates in about a minute.', 'ok');
      setTimeout(function () { setBar(null); }, 800);
    }).catch(function (e) {
      setBar(null);
      setStatus(P.explain(e) + (e.status === 401 ? ' Your GitHub token may have expired; update it in Settings.' : ''), 'err');
    }).then(function () { busy = false; $('publish').disabled = false; });
  };

  $('delete').onclick = function () {
    var k = $('date').value; if (!cur || busy) return;
    if (!confirm('Remove the entry for ' + P.prettyDate(k) + '? The photo stays in your Cloudinary library.')) return;
    busy = true; setStatus('Removing…');
    P.ghUpdate(function (data) {
      data.entries = data.entries.filter(function (e) { return e.date !== k; }); return data;
    }, 'Remove Photo365 entry ' + k, S).then(function (data) {
      P.ghDeleteFile(S, dayRepoPath(k), 'Remove share page for Photo365 ' + k).catch(function () {});
      try { localStorage.removeItem(draftKey(k)); } catch (e) {}
      setEntries(data.entries); loadDate(k); setStatus('Removed.', 'ok');
    }).catch(function (e) { setStatus(P.explain(e), 'err'); }).then(function () { busy = false; });
  };

  window.addEventListener('beforeunload', function (e) { if (busy) { e.preventDefault(); e.returnValue = ''; } });

  // ───────────── Missed + recent ─────────────
  function renderLists() {
    var st = P.stats(entries), t = P.todayKey(), missed = [];
    if (entries.length) {
      for (var i = 0; i < st.total; i++) {
        var k = P.addDays(st.start, i);
        if (k >= t) break;
        if (!byDate[k]) missed.push(k);
      }
    }
    var m = $('missed'); m.innerHTML = '';
    missed.slice(-30).reverse().forEach(function (k) {
      var b = document.createElement('button'); b.className = 'chip warn'; b.type = 'button';
      b.textContent = 'Day ' + P.dayNumber(k, entries) + ' · ' + P.prettyDate(k, { month: 'short', day: 'numeric' });
      b.onclick = function () { pick(k); }; m.appendChild(b);
    });
    $('catchup').hidden = !missed.length;

    var r = $('recent'); r.innerHTML = '';
    entries.slice(-12).reverse().forEach(function (e) {
      var b = document.createElement('button'); b.type = 'button';
      b.innerHTML = '<img alt="" loading="lazy"><span>' + P.prettyDate(e.date, { month: 'short', day: 'numeric' }) + '</span>';
      b.firstChild.src = P.imgUrl(e, 'grid');
      b.setAttribute('aria-label', 'Edit ' + P.prettyDate(e.date));
      b.onclick = function () { pick(e.date); }; r.appendChild(b);
    });
    $('recent-panel').hidden = !entries.length;
  }
  function pick(k) {
    file = null; prepared = null; $('file').value = '';
    history.replaceState(null, '', '?date=' + k); loadDate(k); setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Photo shared from the phone's share sheet (Android)
  function receiveShared() {
    if (!('caches' in window)) return;
    var key = new URL('shared-photo', location.href).href;
    caches.open('p365-share').then(function (c) {
      return c.match(key).then(function (res) {
        if (!res) return;
        return res.blob().then(function (b) {
          setFile(new File([b], res.headers.get('x-name') || 'shared.jpg', { type: b.type || 'image/jpeg' }));
          return c.delete(key);
        });
      });
    }).catch(function () {});
  }

  // ───────────── Start ─────────────
  if (!S.token || !S.preset || !S.cloudName || /^YOUR_/.test(S.cloudName)) showSetup(false); else showEditor();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
