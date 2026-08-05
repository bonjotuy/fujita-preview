/* 投稿確認プレビュー — 共通スクリプト
   Instagramのフィードで投稿を見たときの形をなぞる（動画の上にUIを重ねない）。
   藤田鉄工所版 / KING PLANTS版で共有。差分は config.js だけに置くこと。 */

(function () {
  'use strict';

  var root = document.getElementById('app');

  if (typeof CONFIG === 'undefined') {
    root.innerHTML = '<div class="center">config.js が読み込まれていません。</div>';
    return;
  }

  var C = CONFIG;
  var LS_KEY = 'preview:reviewer:' + C.clientName;

  var ACCOUNTS = {};
  (C.accounts || []).forEach(function (a) { ACCOUNTS[a.key] = a; });

  var state = {
    loading: true,
    error: null,
    posts: [],
    reviewer: null,
    account: (C.accounts && C.accounts[0]) ? C.accounts[0].key : null,
    picking: false,
    sheet: null,  // { id: 'p001', mode: 'view' | 'fix' }
    redo: {}      // { p001: true } … 確認済みだが「変更する」を押した状態
  };

  /* ---------- 小物 ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tagged(text) {
    return esc(text)
      .replace(/(#[^\s#　]+)/g, '<span class="tag">$1</span>')
      .replace(/\n/g, '<br>');
  }

  function oneLine(text) {
    return String(text || '').replace(/\s*\n+\s*/g, ' ').trim();
  }

  function driveId(url) {
    var m = String(url || '').match(/[-\w]{25,}/);
    return m ? m[0] : null;
  }

  function mediaIds(raw) {
    return String(raw || '').split(/[\s,、]+/).map(driveId).filter(Boolean);
  }

  function thumbUrl(id) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1000'; }
  function embedUrl(id) { return 'https://drive.google.com/file/d/' + id + '/preview'; }

  function parseWhen(s) {
    return String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  }

  function whenLabel(s, prefix) {
    var m = parseWhen(s);
    if (!m) return s ? (prefix || '') + esc(s) : '日時未定';
    return (prefix || '') + Number(m[2]) + '月' + Number(m[3]) + '日' +
      (m[4] ? ' ' + ('0' + m[4]).slice(-2) + ':' + m[5] : '');
  }

  function shortDate(s) {
    var m = parseWhen(s);
    if (!m) return esc(s);
    return Number(m[2]) + '/' + Number(m[3]) + (m[4] ? ' ' + ('0' + m[4]).slice(-2) + ':' + m[5] : '');
  }

  function isCollab(p) {
    if (p.collab === null || p.collab === undefined || p.collab === '') return !!C.collabDefault;
    return p.collab === true || String(p.collab).toUpperCase() === 'TRUE';
  }

  function myLogs(p) {
    return (p.logs || []).filter(function (l) { return l.by === state.reviewer; });
  }

  function reviewedByMe(p) { return myLogs(p).length > 0; }

  function myResult(p) {
    var m = myLogs(p);
    return m.length ? m[m.length - 1].result : '';
  }

  // 確認済みで、まだ「変更する」を押していない状態
  function locked(p) { return reviewedByMe(p) && !state.redo[p.id]; }

  function postById(id) {
    return state.posts.filter(function (p) { return p.id === id; })[0];
  }

  function isYt(p) {
    return p.type === 'short' || p.type === 'video' || p.account === 'youtube';
  }

  function toast(msg) {
    var host = document.querySelector('.phone') || document.body;
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  /* ---------- アイコン（公式ロゴは使わない汎用の形） ---------- */

  var I = {
    play: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13l11-6.5z"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.3 5.6a4.6 4.6 0 0 0-6.5 0L12 7.4l-1.8-1.8a4.6 4.6 0 1 0-6.5 6.5l8.3 8.3 8.3-8.3a4.6 4.6 0 0 0 0-6.5z"/></svg>',
    bubble: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 21l1.9-5A8.3 8.3 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    burger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2.4"/><circle cx="17" cy="16" r="2.4"/></svg>',
    thumb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21V10l5-8a2.4 2.4 0 0 1 2.3 3.2L13 9h5.6a2.4 2.4 0 0 1 2.3 3l-1.7 7a2.4 2.4 0 0 1-2.3 2H7z"/><path d="M7 10H4v11h3"/></svg>',
    ytcmt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H3v13h4v4l5-4h9z"/></svg>',
    ytshare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l7 6-7 6v-3.5C8 13 5 15 3 19c.5-6 4-9.5 11-10z"/></svg>',
    remix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l10 8h3"/><path d="M17 3l3 3-3 3"/><path d="M17 13l3 3-3 3"/><path d="M4 16h3l2-1.6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>',
    reels: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 8h18"/><path d="M8.5 3l3 5"/><path d="M14.5 3l3 5"/><path d="M11 12.5v5l4.5-2.5z"/></svg>',
    shorts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="5.5"/><path d="M10.5 9.5v5l4-2.5z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="6"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>',
    subs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="2.5" y="6.5" width="19" height="14" rx="3"/><path d="M6 3.5h12"/><path d="M10.5 11v5l4.5-2.5z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>'
  };

  /* ---------- 通信 ---------- */

  function load() {
    state.loading = true;
    state.error = null;
    render();

    fetch(C.gasUrl, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error(data && data.error ? data.error : 'bad_response');
        state.posts = sortPosts(data.posts || []);
        state.loading = false;
        render();
      })
      .catch(function (err) {
        state.loading = false;
        state.error = String(err && err.message ? err.message : err);
        render();
      });
  }

  // 自分が未確認のものを先に、確認済みを後ろに
  function sortPosts(posts) {
    var yet = posts.filter(function (p) { return !reviewedByMe(p); });
    var done = posts.filter(function (p) { return reviewedByMe(p); });
    return yet.concat(done);
  }

  function send(payload) {
    return fetch(C.gasUrl, {
      method: 'POST',
      // application/json にするとCORSプリフライトでGASに弾かれる
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    }).then(function (r) { return r.json(); });
  }

  /* ---------- 画面全体 ---------- */

  function render() {
    if (state.picking) return renderGate();

    var showTabs = C.showAccountTabs !== false && (C.accounts || []).length > 1;
    var many = (C.reviewers || []).length > 1;

    root.innerHTML =
      '<div class="phone">' +
        '<header class="topbar">' +
          '<div class="r1">' +
            '<div class="brand">' + esc(C.clientName) + '</div>' +
            '<button class="whoami"' + (many ? ' data-act="switch"' : ' disabled') + '>' +
              '<b>' + esc(state.reviewer) + '</b>' +
              (many ? '<span>切り替える</span>' : ' 確認中') +
            '</button>' +
          '</div>' +
          (showTabs ? '<nav class="tabs" id="tabs"></nav>' : '') +
        '</header>' +
        '<div class="feed" id="feed"></div>' +
        '<div class="backdrop" id="backdrop" hidden data-act="close-sheet"></div>' +
        '<div class="sheet" id="sheet" hidden></div>' +
      '</div>';

    if (showTabs) renderTabs();
    renderFeed();
  }

  function renderGate() {
    root.innerHTML =
      '<div class="phone"><div class="gate">' +
        '<h1>' + esc(C.clientName) + '　投稿確認</h1>' +
        '<p>どなたとして確認しますか？</p>' +
        (C.reviewers || []).map(function (n) {
          return '<button data-act="pick" data-name="' + esc(n) + '">' + esc(n) + '</button>';
        }).join('') +
      '</div></div>';
  }

  function renderTabs() {
    var el = document.getElementById('tabs');
    if (!el) return;
    el.innerHTML = (C.accounts || []).map(function (a) {
      var n = state.posts.filter(function (p) {
        return p.account === a.key && !reviewedByMe(p);
      }).length;
      return '<button class="tab" role="tab" data-act="tab" data-key="' + esc(a.key) + '"' +
        ' aria-selected="' + (state.account === a.key) + '">' + esc(a.label) +
        (n ? '<span class="count">' + n + '</span>' : '') + '</button>';
    }).join('');
  }

  function visiblePosts() {
    var showTabs = C.showAccountTabs !== false && (C.accounts || []).length > 1;
    return state.posts.filter(function (p) {
      return showTabs ? p.account === state.account : true;
    });
  }

  function renderFeed() {
    var el = document.getElementById('feed');
    if (!el) return;

    if (state.loading) {
      el.innerHTML = '<div class="center"><div class="sk"></div>読み込んでいます…</div>';
      return;
    }

    if (state.error) {
      el.innerHTML = '<div class="center">' +
        '投稿を読み込めませんでした。<br>通信状況を確認してもう一度お試しください。' +
        '<button data-act="retry">再読み込み</button></div>';
      return;
    }

    var list = visiblePosts();
    if (!list.length) {
      el.innerHTML = '<div class="center">確認する投稿はありません。</div>';
      return;
    }

    el.innerHTML = list.map(screenHtml).join('');
    el.scrollTop = 0;
    bindCarousels(el);
    if (list.length > 1) showSwipeHint();
  }

  function showSwipeHint() {
    var phone = document.querySelector('.phone');
    var old = phone.querySelector('.swipe-hint');
    if (old) old.remove();
    var h = document.createElement('div');
    h.className = 'swipe-hint';
    h.textContent = '上にスワイプで次の投稿';
    phone.appendChild(h);
    setTimeout(function () { h.remove(); }, 4200);
  }

  /* ---------- 1画面ぶん ---------- */

  function screenHtml(p) {
    return '<section class="screen" data-id="' + esc(p.id) + '">' +
      (isYt(p) ? ytScreen(p) : igScreen(p)) +
      actbarHtml(p) +
    '</section>';
  }

  /* Instagram（リール／ストーリーズ／フィード）
     フィードで投稿を見たときの形。動画の上には何も重ねない。 */

  function igScreen(p) {
    var ids = mediaIds(p.videoUrl);
    var acc = ACCOUNTS[p.account] || {};
    var isFeed = p.type === 'feed';
    var ar = isFeed ? 'ar45' : 'ar916';
    var multi = isFeed && ids.length > 1;

    var frames = !ids.length
      ? '<div class="frame blank">' + (isFeed ? '画像' : '動画') + 'URLが未設定です</div>'
      : (multi
          ? '<div class="carousel">' + ids.map(frameHtml).join('') + '</div>' +
            '<div class="p-count">1/' + ids.length + '</div>'
          : frameHtml(ids[0]));

    return '<div class="postview">' +
        '<div class="p-head">' + avatarsHtml(p) +
          '<div class="p-who">' +
            '<div class="handle">' + handleHtml(p) + '</div>' +
            '<div class="meta">' + whenLabel(p.scheduledAt, '投稿予定 ') + '</div>' +
          '</div>' +
          '<div class="follow">フォロー</div>' +
          '<div class="ico">' + I.burger + '</div>' +
        '</div>' +
        '<div class="p-media ' + ar + '">' + frames + '</div>' +
        (multi
          ? '<div class="dots">' + ids.map(function (_, i) {
              return '<i class="' + (i === 0 ? 'on' : '') + '"></i>';
            }).join('') + '</div>'
          : '') +
        '<div class="p-acts">' + I.heart + I.bubble + I.repeat + I.plane +
          '<div class="grow"></div>' + I.save +
        '</div>' +
        '<button class="p-cap" data-act="sheet">' +
          '<span class="txt"><b>' + esc(acc.handle || '') + '</b>' + tagged(oneLine(p.caption)) + '</span>' +
          '<span class="more">続きを読む</span>' +
        '</button>' +
      '</div>' + igNav();
  }

  function frameHtml(id) {
    return '<div class="frame" data-act="play" data-mid="' + esc(id) + '">' +
      '<img src="' + thumbUrl(id) + '" alt="" loading="lazy">' +
      '<div class="tap">' + I.play + '</div>' +
    '</div>';
  }

  function igNav() {
    return '<nav class="fakenav">' +
      '<div class="n">' + I.home + '</div>' +
      '<div class="n">' + I.reels + '</div>' +
      '<div class="n">' + I.plane + '</div>' +
      '<div class="n">' + I.search + '</div>' +
      '<div class="n"><div class="me"></div></div>' +
    '</nav>';
  }

  /* YouTube（ショート／動画）— 視聴画面の形 */

  function ytScreen(p) {
    var ids = mediaIds(p.videoUrl);
    var acc = ACCOUNTS[p.account] || {};
    var name = acc.handle || C.clientName;
    var title = String(p.caption || '').split('\n')[0] || '(タイトル未設定)';
    var ar = p.type === 'short' ? 'ar916' : 'ar169';

    return '<div class="postview">' +
        '<div class="p-media ' + ar + '">' +
          (ids.length ? frameHtml(ids[0]) : '<div class="frame blank">動画URLが未設定です</div>') +
        '</div>' +
        '<button class="yt-title" data-act="sheet">' +
          '<span class="txt">' + esc(title) + '</span>' +
          '<span class="more">…もっと見る</span>' +
        '</button>' +
        '<div class="yt-meta">' + whenLabel(p.scheduledAt, '公開予定 ') + '</div>' +
        '<div class="yt-ch">' +
          '<div class="avatar plain">' + esc(String(name).slice(0, 1)) + '</div>' +
          '<div class="name">@' + esc(name) + '</div>' +
          '<div class="subscribe">チャンネル登録</div>' +
        '</div>' +
        '<div class="yt-acts">' +
          '<div class="pill">' + I.thumb + '<span>高評価</span></div>' +
          '<div class="pill">' + I.ytcmt + '<span>コメント</span></div>' +
          '<div class="pill">' + I.ytshare + '<span>共有</span></div>' +
          '<div class="pill">' + I.remix + '<span>リミックス</span></div>' +
        '</div>' +
      '</div>' +
      '<nav class="fakenav yt">' +
        '<div class="n">' + I.home + '<span class="t">ホーム</span></div>' +
        '<div class="n">' + I.shorts + '<span class="t">ショート</span></div>' +
        '<div class="n">' + I.plus + '</div>' +
        '<div class="n">' + I.subs + '<span class="t">登録チャンネル</span></div>' +
        '<div class="n"><div class="me"></div><span class="t">マイページ</span></div>' +
      '</nav>';
  }

  /* 共通パーツ */

  function avatar(label, plain) {
    return '<div class="avatar' + (plain ? ' plain' : '') + '">' +
      esc(String(label || '?').slice(0, 1)) + '</div>';
  }

  function avatarsHtml(p) {
    var a = ACCOUNTS[p.account] || { handle: '?' };
    if (!isCollab(p)) return '<div class="avatars">' + avatar(a.handle) + '</div>';
    var pair = collabPair(p);
    return '<div class="avatars">' + avatar(pair[0].handle) + avatar(pair[1].handle) + '</div>';
  }

  function collabPair(p) {
    var keys = C.collabPair || [];
    var pair = keys.map(function (k) { return ACCOUNTS[k] || { key: k, handle: k }; });
    if (pair.length < 2) return [ACCOUNTS[p.account] || { handle: '?' }, { handle: '?' }];
    if (pair[1].key === p.account) pair.reverse();
    return pair;
  }

  function handleHtml(p) {
    var a = ACCOUNTS[p.account] || { handle: p.account };
    if (!isCollab(p)) return '<span>' + esc(a.handle) + '</span>';
    var pair = collabPair(p);
    return '<span>' + esc(pair[0].handle) + '</span>' +
      '<span class="and">と</span>' +
      '<span>' + esc(pair[1].handle) + '</span>';
  }

  function statusChip(p) {
    if (p.status === 'OK') return '<span class="chip ok">OK</span>';
    if (p.status === '要修正') return '<span class="chip fix">要修正</span>';
    return '<span class="chip wait">確認待ち</span>';
  }

  function actbarHtml(p) {
    var done = locked(p);
    return '<div class="actbar' + (done ? ' done' : '') + '" id="act-' + esc(p.id) + '">' +
      statusChip(p) +
      (done
        ? '<span class="mine">あなたの確認：' + esc(myResult(p)) + '</span>' +
          '<button class="act edit" data-act="redo">変更する</button>'
        : '<button class="act ok" data-act="ok">これでOK</button>' +
          '<button class="act fix" data-act="fix">修正したい</button>') +
    '</div>';
  }

  /* ---------- シート（タップで下から上がってくる） ---------- */

  function openSheet(id, mode) {
    state.sheet = { id: id, mode: mode || 'view' };
    renderSheet();
    var s = document.getElementById('sheet');
    var b = document.getElementById('backdrop');
    s.hidden = false;
    b.hidden = false;
    requestAnimationFrame(function () {
      s.classList.add('on');
      b.classList.add('on');
      if (mode === 'fix') {
        var ta = s.querySelector('[data-input]');
        if (ta) ta.focus();
      }
    });
  }

  function closeSheet() {
    var s = document.getElementById('sheet');
    var b = document.getElementById('backdrop');
    if (!s) return;
    s.classList.remove('on');
    b.classList.remove('on');
    state.sheet = null;
    setTimeout(function () {
      if (state.sheet) return;
      s.hidden = true;
      b.hidden = true;
    }, 220);
  }

  function renderSheet() {
    var s = document.getElementById('sheet');
    if (!s || !state.sheet) return;
    var p = postById(state.sheet.id);
    if (!p) return;
    var on = s.classList.contains('on') ? ' on' : '';

    if (isYt(p)) {
      s.className = 'sheet light' + on;
      s.innerHTML = '<div class="grab"></div>' +
        '<div class="sheet-head"><h2>概要</h2>' +
          '<button class="x" data-act="close-sheet" aria-label="閉じる">×</button></div>' +
        '<div class="sheet-body">' + ytSheetBody(p) + logsHtml(p) + '</div>' +
        footHtml(p);
    } else {
      s.className = 'sheet' + on;
      s.innerHTML = '<div class="grab"></div>' +
        '<div class="sheet-head"><h2>投稿内容</h2>' +
          '<button class="x" data-act="close-sheet" aria-label="閉じる">×</button></div>' +
        '<div class="sheet-body">' + igSheetBody(p) + logsHtml(p) + '</div>' +
        footHtml(p);
    }
  }

  function igSheetBody(p) {
    var acc = ACCOUNTS[p.account] || {};
    var music = p.music || ('オリジナル音声 · ' + (acc.handle || C.clientName));
    return '<div class="s-user">' + avatarsHtml(p) +
        '<div class="handle" style="flex:1">' + handleHtml(p) + '</div>' +
        '<div class="follow">フォロー</div>' +
      '</div>' +
      '<div class="music">' + I.note + '<span>' + esc(music) + '</span></div>' +
      '<div class="s-text">' + tagged(p.caption) + '</div>' +
      (p.hashtags ? '<div class="s-tags">' + esc(p.hashtags) + '</div>' : '') +
      '<div class="s-date">' + whenLabel(p.scheduledAt, '投稿予定 ') + '　・　' + typeLabel(p) + '</div>' +
      (p.place ? '<div class="s-place">' + I.pin + esc(p.place) + '</div>' : '');
  }

  function ytSheetBody(p) {
    var lines = String(p.caption || '').split('\n');
    var title = lines[0] || '(タイトル未設定)';
    var desc = lines.slice(1).join('\n').replace(/^\n+/, '');

    return '<h2 class="yt-h2">' + esc(title) +
        (p.hashtags ? ' <span class="tag">' + esc(p.hashtags) + '</span>' : '') + '</h2>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + esc(typeLabel(p)) + '</b><span>投稿タイプ</span></div>' +
        '<div class="stat"><b>' + esc(whenLabel(p.scheduledAt, '')) + '</b><span>公開予定</span></div>' +
        '<div class="stat"><b>' + esc(p.status || '確認待ち') + '</b><span>ステータス</span></div>' +
      '</div>' +
      (desc
        ? '<div class="desc-box"><div class="clamp" data-desc>' + tagged(desc) + '</div>' +
          '<button class="more-btn" data-act="more">…もっと見る</button></div>'
        : '');
  }

  function typeLabel(p) {
    return ({ reel: 'リール', feed: 'フィード', story: 'ストーリーズ', short: 'ショート', video: '動画' })[p.type] || p.type;
  }

  function logsHtml(p) {
    var logs = p.logs || [];
    if (!logs.length) return '';
    return '<div class="s-logs"><h3>これまでの確認</h3>' + logs.map(cmtHtml).join('') + '</div>';
  }

  function cmtHtml(l) {
    var cls = l.result === 'OK' ? 'r-ok' : 'r-fix';
    return '<div class="cmt">' +
      '<div class="av">' + esc(String(l.by || '?').slice(0, 1)) + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="who"><b>' + esc(l.by) + '</b>　' + shortDate(l.at) + '　' +
          '<span class="' + cls + '">' + esc(l.result) + '</span></div>' +
        (l.comment ? '<div class="body">' + esc(l.comment) + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  function footHtml(p) {
    if (locked(p)) {
      return '<div class="sheet-foot">' +
        '<div class="reviewed">あなたの確認：' + esc(myResult(p)) + '</div>' +
        '<div class="row"><button class="btn" data-act="redo">確認をやり直す</button></div>' +
      '</div>';
    }
    if (state.sheet && state.sheet.mode === 'fix') {
      return '<div class="sheet-foot">' +
        '<textarea data-input placeholder="' + esc(C.commentPlaceholder || '気になる点を書いてください') + '"></textarea>' +
        '<div class="row">' +
          '<button class="btn ghost" data-act="view-mode">やめる</button>' +
          '<button class="btn primary" data-act="send-fix">修正依頼を送る</button>' +
        '</div>' +
        '<div class="hint" data-hint>コメントは必須です。どこをどう直すか書いてください。</div>' +
      '</div>';
    }
    return '<div class="sheet-foot">' +
      (reviewedByMe(p)
        ? '<div class="hint">前回：' + esc(myResult(p)) + '　押し直すと新しい確認として記録されます。</div>'
        : '') +
      '<div class="row">' +
        '<button class="btn primary" data-act="ok">これでOK</button>' +
        '<button class="btn" data-act="fix">修正したい</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------- カルーセルのドット ---------- */

  function bindCarousels(scope) {
    scope.querySelectorAll('.carousel').forEach(function (c) {
      var wrap = c.parentNode;
      var dots = wrap.nextElementSibling;
      var counter = wrap.querySelector('.p-count');
      c.addEventListener('scroll', function () {
        var i = Math.round(c.scrollLeft / c.clientWidth);
        if (dots && dots.classList.contains('dots')) {
          dots.querySelectorAll('i').forEach(function (d, n) { d.classList.toggle('on', n === i); });
        }
        if (counter) counter.textContent = (i + 1) + '/' + c.children.length;
      }, { passive: true });
    });
  }

  /* ---------- イベント ---------- */

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    var screen = t.closest('.screen');
    var id = screen ? screen.getAttribute('data-id') : (state.sheet ? state.sheet.id : null);

    if (act === 'pick') {
      state.reviewer = t.getAttribute('data-name');
      localStorage.setItem(LS_KEY, state.reviewer);
      state.picking = false;
      state.redo = {};
      state.posts = sortPosts(state.posts);
      render();
      return;
    }

    if (act === 'switch') { state.picking = true; render(); return; }
    if (act === 'retry')  { load(); return; }

    if (act === 'tab') {
      state.account = t.getAttribute('data-key');
      renderTabs();
      renderFeed();
      return;
    }

    if (act === 'play') {
      t.innerHTML = '<iframe src="' + embedUrl(t.getAttribute('data-mid')) +
        '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      t.removeAttribute('data-act');
      return;
    }

    if (act === 'sheet')       { openSheet(id, 'view'); return; }
    if (act === 'close-sheet') { closeSheet(); return; }

    if (act === 'more') {
      var d = document.querySelector('[data-desc]');
      var clamped = d.classList.toggle('clamp');
      t.textContent = clamped ? '…もっと見る' : '一部を表示';
      return;
    }

    // 確認済みからの「変更する」
    if (act === 'redo') {
      state.redo[id] = true;
      refreshActbar(id);
      if (state.sheet && state.sheet.id === id) renderSheet();
      return;
    }

    if (act === 'fix') {
      if (state.sheet) {
        state.sheet.mode = 'fix';
        renderSheet();
        var ta = document.querySelector('#sheet [data-input]');
        if (ta) ta.focus();
      } else {
        openSheet(id, 'fix');
      }
      return;
    }

    if (act === 'view-mode') { state.sheet.mode = 'view'; renderSheet(); return; }

    if (act === 'ok') { submit(id, 'OK', '', t); return; }

    if (act === 'send-fix') {
      var input = document.querySelector('#sheet [data-input]');
      var hint = document.querySelector('#sheet [data-hint]');
      var text = input.value.trim();
      if (!text) {
        hint.classList.add('err');
        hint.textContent = 'コメントを入力してください。';
        input.focus();
        return;
      }
      submit(id, '要修正', text, t);
      return;
    }
  });

  function refreshActbar(id) {
    var post = postById(id);
    var bar = document.getElementById('act-' + id);
    if (post && bar) bar.outerHTML = actbarHtml(post);
  }

  function submit(id, result, comment, btn) {
    var post = postById(id);
    if (!post) return;

    var label = btn.textContent;
    var buttons = btn.parentNode.querySelectorAll('button');
    buttons.forEach(function (b) { b.disabled = true; });
    btn.textContent = '送信中…';

    send({ id: id, by: state.reviewer, result: result, comment: comment })
      .then(function (res) {
        if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'failed');

        post.status = result;
        post.logs = (post.logs || []).concat([
          { at: res.at || '', by: state.reviewer, result: result, comment: comment }
        ]);
        delete state.redo[id];

        refreshActbar(id);

        if (state.sheet && state.sheet.id === id) {
          state.sheet.mode = 'view';
          renderSheet();
          setTimeout(closeSheet, 900);
        }

        renderTabs();
        toast(result === 'OK' ? 'OKを送信しました' : '修正依頼を送信しました');
      })
      .catch(function (err) {
        buttons.forEach(function (b) { b.disabled = false; });
        btn.textContent = label;
        toast(err && err.message === 'comment_required'
          ? 'コメントを入力してください'
          : '送信できませんでした。もう一度お試しください');
      });
  }

  /* ---------- 起動 ---------- */

  var saved = localStorage.getItem(LS_KEY);
  var reviewers = C.reviewers || [];

  if (reviewers.length <= 1) {
    state.reviewer = reviewers[0] || '確認者';
  } else if (saved && reviewers.indexOf(saved) !== -1) {
    state.reviewer = saved;
  } else {
    state.picking = true;
  }

  if (state.picking) renderGate();
  load();
})();
