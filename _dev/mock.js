/* fetch を差し替えて、GASの代わりにダミーデータを返す。ローカル確認専用。 */

(function () {
  var POSTS = [
    {
      id: 'p001', account: 'project', type: 'reel',
      scheduledAt: '2026-08-12 19:00',
      videoUrl: 'https://drive.google.com/file/d/1Iwmi61aqKbr0e79_NylbbPaFuabS79ST/view?usp=drive_link',
      caption: 'project 03／スクリュージャックスツール\n\n高さを回して変えられるステンレスのスツール。\n溶接の目を残したまま鏡面まで磨き上げています。\n\n図面から仕上げまで、全部この建屋の中でやっています。',
      hashtags: '#ステンレス #オーダーメイド家具 #気仙沼',
      status: '確認待ち', collab: null, music: '米津玄師 · 烏 - Raven', place: '気仙沼',
      logs: []
    },
    {
      id: 'p002', account: 'project', type: 'reel',
      scheduledAt: '2026-08-15 12:00',
      videoUrl: 'https://drive.google.com/file/d/1eijpO2RTfB_BfXBnXUQqEDTBv2CMTqhL/view?usp=drive_link',
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
    },
    {
      id: 'p006', account: 'note', type: 'note',
      scheduledAt: '2026-08-25 08:00',
      videoUrl: '_dev/cover-sample.jpg',
      caption: '「切って、曲げて、溶かす」だけじゃない。気仙沼の鉄工所がステンレスにこだわる理由\n\n' +
        '気仙沼の港からすこし内陸に入ったところに、藤田鉄工所の建屋があります。\n' +
        'この会社がつくっているものの多くは、街の人の目には触れません。\n\n' +
        '## 主役は、水産の現場にある機械\n\n' +
        'わたしたちの仕事の柱は、水産加工の現場で使われる選別機です。\n' +
        '毎日、水と塩にさらされる場所で動きつづける機械。\n' +
        'だからこそ、素材にステンレスを選んでいます。\n\n' +
        '> 錆びない、ということは、洗えるということ。\n' +
        '> 食べものを扱う現場では、そこが一番大事なんです。\n\n' +
        '## ステンレスは、扱いのむずかしい素材です\n\n' +
        '- 熱をかけると歪む\n' +
        '- 溶接の跡が目立つ\n' +
        '- 磨いてはじめて表情が出る\n\n' +
        '### それでも選ぶ理由\n\n' +
        '図面から仕上げまで、全部この建屋の中でやっています。\n' +
        '**外に出さない**から、細かいところまで手を入れられる。\n\n' +
        '---\n\n' +
        'オーダーメイドのご相談はこちらから。\n' +
        'https://example.com/fujita-contact',
      hashtags: '#ステンレス #気仙沼 #ものづくり #町工場',
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
          // GASと同じく、毎回まっさらなコピーを返す（参照を共有しない）
          var copy = JSON.parse(JSON.stringify(POSTS));
          resolve({ json: function () { return Promise.resolve({ ok: true, posts: copy }); } });
        }
      }, 600);
    });
  };
})();
