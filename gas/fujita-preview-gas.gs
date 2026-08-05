// 投稿確認プレビュー用 Google Apps Script
// 管理シートを開き、拡張機能 > Apps Script に貼り付けて使う。
// デプロイ: 新しいデプロイ > ウェブアプリ > 実行ユーザー「自分」/ アクセス「全員」
// 藤田鉄工所版・KING PLANTS版とも同じコード。スプシごとに別デプロイする。

const NOTIFY_MAIL = 'ここにぼんちゃんのメールアドレス';

const SHEET_POSTS = '投稿確認';
const SHEET_LOGS  = '確認ログ';


function doGet(e) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const rows  = ss.getSheetByName(SHEET_POSTS).getDataRange().getValues();
  const logs  = ss.getSheetByName(SHEET_LOGS).getDataRange().getValues();

  const logsById = {};
  logs.slice(1).forEach(function (r) {
    if (!r[1]) return;
    const id = String(r[1]);
    if (!logsById[id]) logsById[id] = [];
    logsById[id].push({
      at:      fmt(r[0]),
      by:      String(r[2] || ''),
      result:  String(r[3] || ''),
      comment: String(r[4] || '')
    });
  });

  const posts = rows.slice(1)
    .filter(function (r) { return r[0] && r[8] !== false; })
    .map(function (r) {
      const id = String(r[0]);
      return {
        id:          id,
        account:     String(r[1] || ''),
        type:        String(r[2] || 'reel'),
        scheduledAt: fmt(r[3]),
        videoUrl:    String(r[4] || ''),
        caption:     String(r[5] || ''),
        hashtags:    String(r[6] || ''),
        status:      String(r[7] || '確認待ち'),
        collab:      bool(r[9]),
        music:       String(r[10] || ''),
        place:       String(r[11] || ''),
        logs:        logsById[id] || []
      };
    });

  return json({ ok: true, posts: posts });
}


function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  }

  if (!body.id || !body.result) return json({ ok: false, error: 'missing' });
  if (body.result === '要修正' && !String(body.comment || '').trim()) {
    return json({ ok: false, error: 'comment_required' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss  = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date();

    ss.getSheetByName(SHEET_LOGS).appendRow([
      now, body.id, body.by || '', body.result, body.comment || ''
    ]);

    const sh   = ss.getSheetByName(SHEET_POSTS);
    const ids  = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
    for (let i = 1; i < ids.length; i++) {
      if (String(ids[i][0]) === String(body.id)) {
        sh.getRange(i + 1, 8).setValue(body.result === 'OK' ? 'OK' : '要修正');
        break;
      }
    }

    if (NOTIFY_MAIL) {
      MailApp.sendEmail(
        NOTIFY_MAIL,
        '[投稿確認] ' + body.id + ' — ' + body.result + '（' + (body.by || '') + '）',
        [
          '投稿ID: ' + body.id,
          '確認者: ' + (body.by || ''),
          '結果: '   + body.result,
          '',
          body.comment || '(コメントなし)'
        ].join('\n')
      );
    }

    return json({ ok: true, at: fmt(now) });
  } finally {
    lock.releaseLock();
  }
}


function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function fmt(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  }
  return String(v || '');
}

// 「共同投稿」列。空欄のときは null を返し、サイト側の collabDefault に委ねる。
function bool(v) {
  if (v === '' || v === null || v === undefined) return null;
  if (v === true || v === false) return v;
  return String(v).toUpperCase() === 'TRUE';
}
