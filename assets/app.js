/* 投稿確認プレビュー — 共通スクリプト
   見た目の再現より「確認しやすさ」を優先。
   ・投稿文とハッシュタグは最初から全文表示（タップ不要）
   ・動画は枠の中に閉じ込め、ドライブのプレイヤーが文章やボタンにかぶらないようにする
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
    redo: {},   // 確認済みだが「変更する」を押した投稿
    fixing: {}  // コメント入力欄を開いている投稿
  };

  /* ---------- 小物 ---------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function tagged(text) {
    return esc(text).replace(/(#[^\s#　]+)/g, '<span class="tag">$1</span>');
  }

  function driveId(url) {
    var m = String(url || '').match(/[-\w]{25,}/);
    return m ? m[0] : null;
  }

  function thumbUrl(id) { return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1000'; }
  function embedUrl(id) { return 'https://drive.google.com/file/d/' + id + '/preview'; }

  /* E列の1つぶん。ドライブのリンクのほか、videos/p001.mp4 のような
     サイトに置いたファイルや、外部の直リンクも書ける。 */
  function mediaItems(raw) {
    return String(raw || '').split(/[\s,、]+/).filter(Boolean).map(function (s) {
      if (/^https?:/i.test(s) && !/drive\.google\.com/i.test(s)) {
        return { kind: /\.(jpe?g|png|webp|gif)$/i.test(s) ? 'img' : 'file', src: s };
      }
      if (/\.(mp4|m4v|mov|webm)$/i.test(s)) return { kind: 'file', src: rel(s) };
      if (/\.(jpe?g|png|webp|gif)$/i.test(s)) return { kind: 'img', src: rel(s) };
      var id = driveId(s);
      return id ? { kind: 'drive', id: id } : null;
    }).filter(Boolean);
  }

  function rel(path) { return '../' + String(path).replace(/^\.?\//, ''); }

  function parseWhen(s) {
    return String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  }

  function whenLabel(s) {
    var m = parseWhen(s);
    if (!m) return s ? esc(s) : '日時未定';
    return Number(m[2]) + '月' + Number(m[3]) + '日' +
      (m[4] ? '（' + WD[new Date(+m[1], +m[2] - 1, +m[3]).getDay()] + '）' + ('0' + m[4]).slice(-2) + ':' + m[5] : '');
  }

  var WD = ['日', '月', '火', '水', '木', '金', '土'];

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

  function locked(p) { return reviewedByMe(p) && !state.redo[p.id]; }
  function postById(id) { return state.posts.filter(function (p) { return p.id === id; })[0]; }
  function isYt(p) { return p.type === 'short' || p.type === 'video' || p.account === 'youtube'; }

  function typeLabel(p) {
    return ({ reel: 'リール', feed: 'フィード投稿', story: 'ストーリーズ',
              short: 'YouTubeショート', video: 'YouTube動画' })[p.type] || p.type;
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  var PLAY = '<svg viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13l11-6.5z"/></svg>';

  var EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/>' +
    '<path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

  /* ---------- 通信 ---------- */

  function load() {
    state.loading = true;
    state.error = null;
    render();

    fetch(C.gasUrl, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error(data && data.error ? data.error : 'bad_response');
        state.posts = data.posts || [];
        state.loading = false;
        render();
      })
      .catch(function (err) {
        state.loading = false;
        state.error = String(err && err.message ? err.message : err);
        render();
      });
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

  /* ---------- 画面 ---------- */

  function render() {
    if (state.picking) return renderGate();

    var showTabs = C.showAccountTabs !== false && (C.accounts || []).length > 1;
    var many = (C.reviewers || []).length > 1;

    root.innerHTML =
      '<header class="topbar"><div class="inner">' +
        '<div class="r1">' +
          '<h1>' + esc(C.clientName) + '　投稿確認</h1>' +
          '<button class="whoami"' + (many ? ' data-act="switch"' : ' disabled') + '>' +
            '<b>' + esc(state.reviewer) + '</b>' + (many ? '<span>切り替える</span>' : ' 確認中') +
          '</button>' +
        '</div>' +
        (showTabs ? '<nav class="tabs" id="tabs"></nav>' : '<div style="height:10px"></div>') +
      '</div></header>' +
      '<main class="wrap" id="main"></main>';

    if (showTabs) renderTabs();
    renderList();
  }

  function renderGate() {
    root.innerHTML =
      '<div class="wrap"><div class="gate">' +
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
      return '<button class="tab" data-act="tab" data-key="' + esc(a.key) + '"' +
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

  function renderList() {
    var el = document.getElementById('main');
    if (!el) return;

    if (state.loading) {
      el.innerHTML = '<div class="list">' + skeleton() + skeleton() + '</div>';
      return;
    }

    if (state.error) {
      el.innerHTML = '<div class="center">' +
        '<div class="big">📶</div>投稿を読み込めませんでした。<br>通信状況を確かめて、もう一度お試しください。' +
        '<br><button data-act="retry">再読み込み</button></div>';
      return;
    }

    var list = visiblePosts();
    if (!list.length) {
      el.innerHTML = '<div class="center"><div class="big">📭</div>確認する投稿はまだありません。</div>';
      return;
    }

    var yet = list.filter(function (p) { return !reviewedByMe(p); });
    var done = list.filter(function (p) { return reviewedByMe(p); });

    el.innerHTML =
      '<div class="summary">' +
        (yet.length
          ? '未確認 <b>' + yet.length + '件</b>　／　全' + list.length + '件'
          : '<b>すべて確認済みです。ありがとうございます。</b>') +
      '</div>' +
      '<div class="list">' +
        yet.map(card).join('') +
        (done.length && yet.length
          ? '<div class="summary" style="padding-top:26px">確認済み ' + done.length + '件</div>'
          : '') +
        done.map(card).join('') +
      '</div>';

    bindCarousels(el);
  }

  function skeleton() {
    return '<div class="skeleton"><div class="sk a"></div><div class="sk b"></div>' +
      '<div class="sk c"></div><div class="sk c"></div><div class="sk d"></div></div>';
  }

  /* ---------- カード ---------- */

  function card(p) {
    return '<article class="card' + (locked(p) ? ' done' : '') + '" id="card-' + esc(p.id) + '" data-id="' + esc(p.id) + '">' +
      headHtml(p) +
      mediaHtml(p) +
      bodyHtml(p) +
      logsHtml(p) +
      decideHtml(p) +
    '</article>';
  }

  function headHtml(p) {
    var acc = ACCOUNTS[p.account] || {};
    return '<div class="head">' +
      statusBadge(p) +
      '<span class="badge kind">' + esc(typeLabel(p)) + '</span>' +
      (isCollab(p) ? '<span class="badge collab">共同投稿</span>' : '') +
      '<div class="when">' + (acc.label ? esc(acc.label) + '　・　' : '') +
        '投稿予定 ' + whenLabel(p.scheduledAt) + '</div>' +
    '</div>';
  }

  function statusBadge(p) {
    if (p.status === 'OK') return '<span class="badge ok">OK</span>';
    if (p.status === '要修正') return '<span class="badge fix">要修正</span>';
    return '<span class="badge wait">確認待ち</span>';
  }

  function mediaHtml(p) {
    var items = mediaItems(p.videoUrl);
    var ar = isYt(p) && p.type !== 'short' ? 'ar169' : (p.type === 'feed' ? 'ar45' : 'ar916');

    if (!items.length) {
      return '<div class="stage"><div class="box blank">動画・画像が未設定です</div></div>';
    }

    if (items.length > 1) {
      return '<div class="stage ' + ar + '">' +
          '<div class="carousel">' + items.map(boxHtml).join('') + '</div>' +
        '</div>' +
        '<div class="dots" style="background:#000">' + items.map(function (_, i) {
          return '<i class="' + (i === 0 ? 'on' : '') + '"></i>';
        }).join('') + '</div>' + underHtml(items);
    }

    return '<div class="stage ' + ar + '">' + boxHtml(items[0]) + '</div>' + underHtml(items);
  }

  // 動画の下。使い方の案内と「ドライブで見る」
  function underHtml(items) {
    var first = items.filter(function (i) { return i.kind === 'drive'; })[0];
    if (!first) return '';
    return '<div class="under">' +
      '<div class="hint-play">再生ボタンを押すと動画が始まります。<br>' +
        '数秒だけ操作パネルが重なりますが、<b>触らずに待つと消えます。</b></div>' +
      '<a class="watch" href="https://drive.google.com/file/d/' + esc(first.id) + '/view"' +
        ' target="_blank" rel="noopener">ドライブで見る ' + EXT + '</a>' +
    '</div>';
  }

  function boxHtml(item) {
    if (item.kind === 'img') {
      return '<div class="box"><img src="' + esc(item.src) + '" alt="" loading="lazy"></div>';
    }
    if (item.kind === 'file') {
      return '<div class="box" data-act="playfile">' +
        '<video src="' + esc(item.src) + '" playsinline preload="metadata" loop></video>' +
        '<div class="tap"><span class="pb">' + PLAY + '</span></div>' +
      '</div>';
    }
    return '<div class="box" data-act="play" data-mid="' + esc(item.id) + '">' +
      '<img src="' + thumbUrl(item.id) + '" alt="" loading="lazy">' +
      '<div class="tap"><span class="pb">' + PLAY + '</span></div>' +
    '</div>';
  }

  function bodyHtml(p) {
    var text = String(p.caption || '');
    var body = text;
    var title = '';

    if (isYt(p)) {
      var lines = text.split('\n');
      title = lines[0] || '(タイトル未設定)';
      body = lines.slice(1).join('\n').replace(/^\n+/, '');
    }

    return '<div class="sec">' +
      '<h3>' + (isYt(p) ? 'タイトルと概要欄' : '投稿文') + '</h3>' +
      (title ? '<div class="yt-title">' + esc(title) + '</div>' : '') +
      '<div class="caption">' + tagged(body) + '</div>' +
      (p.hashtags ? '<div class="tags">' + esc(p.hashtags) + '</div>' : '') +
    '</div>';
  }

  function logsHtml(p) {
    var logs = p.logs || [];
    if (!logs.length) return '';
    return '<div class="sec"><div class="logs">' +
      '<h3>これまでの確認</h3>' +
      logs.map(function (l) {
        return '<div class="log">' +
          '<span class="who">' + esc(l.by) + '</span>' +
          '<span class="r ' + (l.result === 'OK' ? 'ok' : 'fix') + '">' + esc(l.result) + '</span>' +
          '<span class="at">' + shortDate(l.at) + '</span>' +
          (l.comment ? '<span class="txt">' + esc(l.comment) + '</span>' : '') +
        '</div>';
      }).join('') +
    '</div></div>';
  }

  function decideHtml(p) {
    if (locked(p)) {
      return '<div class="decide top-line"><div class="mydone">' +
        '<div class="t">あなたの確認：<b>' + esc(myResult(p)) + '</b></div>' +
        '<button class="btn edit" data-act="redo">変更する</button>' +
      '</div></div>';
    }

    var fixing = !!state.fixing[p.id];
    return '<div class="decide top-line">' +
      (reviewedByMe(p) ? '<div class="note">前回は「' + esc(myResult(p)) + '」でした。押し直すと新しい確認として記録されます。</div>' : '') +
      '<div class="row" data-buttons' + (fixing ? ' hidden' : '') + '>' +
        '<button class="btn primary" data-act="ok">これでOK</button>' +
        '<button class="btn" data-act="fix">修正したい</button>' +
      '</div>' +
      '<div class="comment" data-comment' + (fixing ? '' : ' hidden') + '>' +
        '<textarea data-input placeholder="' + esc(C.commentPlaceholder || '気になる点を書いてください') + '"></textarea>' +
        '<div class="row">' +
          '<button class="btn ghost" data-act="cancel-fix">やめる</button>' +
          '<button class="btn primary" data-act="send-fix">修正依頼を送る</button>' +
        '</div>' +
        '<div class="note" data-note>どこをどう直してほしいか書いてください。（必須）</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------- カルーセル ---------- */

  function bindCarousels(scope) {
    scope.querySelectorAll('.carousel').forEach(function (c) {
      var dots = c.parentNode.nextElementSibling;
      if (!dots || !dots.classList.contains('dots')) return;
      c.addEventListener('scroll', function () {
        var i = Math.round(c.scrollLeft / c.clientWidth);
        dots.querySelectorAll('i').forEach(function (d, n) { d.classList.toggle('on', n === i); });
      }, { passive: true });
    });
  }

  /* ---------- イベント ---------- */

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    var cardEl = t.closest('.card');
    var id = cardEl ? cardEl.getAttribute('data-id') : null;

    if (act === 'pick') {
      state.reviewer = t.getAttribute('data-name');
      localStorage.setItem(LS_KEY, state.reviewer);
      state.picking = false;
      state.redo = {}; state.fixing = {};
      render();
      return;
    }

    if (act === 'switch') { state.picking = true; render(); return; }
    if (act === 'retry')  { load(); return; }

    if (act === 'tab') {
      state.account = t.getAttribute('data-key');
      renderTabs();
      renderList();
      window.scrollTo(0, 0);
      return;
    }

    if (act === 'play') {
      t.innerHTML = '<iframe src="' + embedUrl(t.getAttribute('data-mid')) +
        '" allow="autoplay; fullscreen" allowfullscreen></iframe>';
      t.removeAttribute('data-act');
      return;
    }

    if (act === 'playfile') {
      var v = t.querySelector('video');
      if (!v) return;
      if (v.paused) { v.play(); t.classList.add('playing'); }
      else { v.pause(); t.classList.remove('playing'); }
      return;
    }

    if (act === 'redo') {
      state.redo[id] = true;
      refreshDecide(id);
      return;
    }

    if (act === 'fix') {
      state.fixing[id] = true;
      cardEl.querySelector('[data-buttons]').hidden = true;
      var box = cardEl.querySelector('[data-comment]');
      box.hidden = false;
      box.querySelector('[data-input]').focus();
      return;
    }

    if (act === 'cancel-fix') {
      state.fixing[id] = false;
      cardEl.querySelector('[data-comment]').hidden = true;
      cardEl.querySelector('[data-buttons]').hidden = false;
      return;
    }

    if (act === 'ok') { submit(id, 'OK', '', t); return; }

    if (act === 'send-fix') {
      var input = cardEl.querySelector('[data-input]');
      var note = cardEl.querySelector('[data-note]');
      var text = input.value.trim();
      if (!text) {
        note.classList.add('err');
        note.textContent = 'コメントを入力してください。';
        input.focus();
        return;
      }
      submit(id, '要修正', text, t);
      return;
    }
  });

  function refreshDecide(id) {
    var post = postById(id);
    var cardEl = document.getElementById('card-' + id);
    if (!post || !cardEl) return;
    var old = cardEl.querySelector('.decide');
    if (old) old.outerHTML = decideHtml(post);
    cardEl.classList.toggle('done', locked(post));
  }

  function submit(id, result, comment, btn) {
    var post = postById(id);
    if (!post) return;

    var label = btn.textContent;
    var buttons = btn.closest('.decide').querySelectorAll('button');
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
        state.fixing[id] = false;

        var cardEl = document.getElementById('card-' + id);
        var badge = cardEl.querySelector('.badge');
        if (badge) { badge.className = 'badge ' + (result === 'OK' ? 'ok' : 'fix'); badge.textContent = result; }

        var oldLogs = cardEl.querySelector('.logs');
        if (oldLogs) oldLogs.parentNode.outerHTML = logsHtml(post);
        else cardEl.querySelector('.decide').insertAdjacentHTML('beforebegin', logsHtml(post));

        refreshDecide(id);
        renderTabs();
        updateSummary();
        toast(result === 'OK' ? 'OKを送信しました' : '修正依頼を送信しました');
        goNext(id);
      })
      .catch(function (err) {
        buttons.forEach(function (b) { b.disabled = false; });
        btn.textContent = label;
        toast(err && err.message === 'comment_required'
          ? 'コメントを入力してください'
          : '送信できませんでした。もう一度お試しください');
      });
  }

  function updateSummary() {
    var el = document.querySelector('.summary');
    if (!el) return;
    var list = visiblePosts();
    var yet = list.filter(function (p) { return !reviewedByMe(p); }).length;
    el.innerHTML = yet
      ? '未確認 <b>' + yet + '件</b>　／　全' + list.length + '件'
      : '<b>すべて確認済みです。ありがとうございます。</b>';
  }

  // 次の未確認までスクロールして、確認をどんどん進められるようにする
  function goNext(fromId) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
    var i = cards.findIndex(function (c) { return c.getAttribute('data-id') === fromId; });
    for (var n = i + 1; n < cards.length; n++) {
      var p = postById(cards[n].getAttribute('data-id'));
      if (p && !reviewedByMe(p)) {
        setTimeout(function (el) {
          return function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
        }(cards[n]), 700);
        return;
      }
    }
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
