/* fetch を差し替えて、GASの代わりにダミーデータを返す。ローカル確認専用。 */

(function () {
  var POSTS = [
    {
      id: 'p001', account: 'project', type: 'reel',
      scheduledAt: '2026-08-12 19:00',
      videoUrl: 'https://drive.google.com/file/d/1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/view?usp=sharing',
      caption: 'project 03／スクリュージャックスツール\n\n高さを回して変えられるステンレスのスツール。\n溶接の目を残したまま鏡面まで磨き上げています。\n\n図面から仕上げまで、全部この建屋の中でやっています。',
      hashtags: '#ステンレス #オーダーメイド家具 #気仙沼',
      status: '確認待ち', collab: null, music: '米津玄師 · 烏 - Raven', place: '気仙沼',
      logs: []
    },
    {
      id: 'p002', account: 'project', type: 'reel',
      scheduledAt: '2026-08-15 12:00',
      videoUrl: 'https://drive.google.com/file/d/1BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB/view',
      caption: 'KING PLANTSさんとの共同投稿。\n鉢のフチの仕上げを見てほしいです。',
      hashtags: '#KINGPLANTS #植木鉢 #ステンレス',
      status: '要修正', collab: true, music: '', place: '',
      logs: [
        { at: '2026-08-05 14:20', by: '吉田さん', result: '要修正', comment: '溶接シーンをもう少し長く' }
      ]
    },
    {
      id: 'p003', account: 'project', type: 'feed',
      scheduledAt: '2026-08-18 19:00',
      videoUrl: 'https://drive.google.com/file/d/1CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC/view, https://drive.google.com/file/d/1DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD/view',
      caption: '工場の朝。\n図面から仕上げまで、全部この建屋の中でやっています。',
      hashtags: '#気仙沼 #鉄工所',
      status: 'OK', collab: null, music: '', place: '',
      logs: [{ at: '2026-08-02 09:10', by: '米倉社長', result: 'OK', comment: '' }]
    },
    {
      id: 'p004', account: 'product', type: 'reel',
      scheduledAt: '2026-08-20 20:00',
      videoUrl: '',
      caption: '鉢の底穴の加工。\nここの精度で水はけが変わります。',
      hashtags: '#KINGPLANTS #観葉植物',
      status: '確認待ち', collab: true, music: '', place: '',
      logs: []
    },
    {
      id: 'p005', account: 'youtube', type: 'video',
      scheduledAt: '2026-08-22 18:00',
      videoUrl: 'https://drive.google.com/file/d/1EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE/view',
      caption: '【製作】ステンレスのスツールができるまで｜藤田鉄工所\n\n1枚のステンレス板から、回して高さを変えられるスツールができるまでを追いました。\n溶接、研磨、組み立てまでノーカットに近い形でお届けします。\n\n00:00 はじめに\n01:20 切り出し\n04:35 溶接\n09:10 仕上げ',
      hashtags: '#ものづくり #ステンレス #溶接',
      status: '確認待ち', collab: null, music: '', place: '',
      logs: []
    }
  ];

  var real = window.fetch;

  window.fetch = function (url, opt) {
    if (String(url).indexOf('example.invalid') === -1) return real.apply(this, arguments);

    return new Promise(function (resolve) {
      setTimeout(function () {
        if (opt && opt.method === 'POST') {
          var b = JSON.parse(opt.body);
          var p = POSTS.filter(function (x) { return x.id === b.id; })[0];
          if (p) {
            p.status = b.result;
            p.logs.push({ at: '2026-08-03 19:40', by: b.by, result: b.result, comment: b.comment });
          }
          resolve({ json: function () { return Promise.resolve({ ok: true, at: '2026-08-03 19:40' }); } });
        } else {
          resolve({ json: function () { return Promise.resolve({ ok: true, posts: POSTS }); } });
        }
      }, 600);
    });
  };
})();
