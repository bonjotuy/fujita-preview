/* KING PLANTS版の設定。ここ以外のファイルは藤田鉄工所版と共通。 */

const CONFIG = {
  clientName: 'KING PLANTS',

  // KING PLANTS用の管理シートに紐づくGAS Web AppのURL（藤田鉄工所版とは別デプロイ）
  gasUrl: 'https://script.google.com/macros/s/yyyyyyyyyyyyyyyyyyyy/exec',

  // 1人だけなので名前選択画面は出さない
  reviewers: ['小野寺さん'],

  // プロダクトのみを共有する。タブは出さないが、共同投稿の表示に両方のhandleを使う
  accounts: [
    { key: 'product', label: 'プロダクト', handle: 'kingplants_pot' },
    { key: 'project', label: 'プロジェクト', handle: 'fujita_stainless' }
  ],

  // タブは出さない（シートに載っている投稿がそのまま全部出る）
  showAccountTabs: false,

  collabPair: ['project', 'product'],

  // KING PLANTS版に載せる投稿は基本すべて共同投稿
  collabDefault: true,

  commentPlaceholder: '店名の表記、植物の品種名、映り込みなど、気になる点があれば'
};
