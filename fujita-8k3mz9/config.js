/* 藤田鉄工所版の設定。ここ以外のファイルはKING PLANTS版と共通。 */

const CONFIG = {
  clientName: '藤田鉄工所',

  // 藤田鉄工所の管理シートに紐づくGAS Web AppのURL（末尾 /exec）
  gasUrl: 'https://script.google.com/macros/s/AKfycbwMKEky05qic7sV3W9Bgi4sxS0f84Qe8di91hZFr3FzvuQV023Lk8VhZK2arACtFAOPtA/exec',

  reviewers: ['米倉社長', '吉田さん', '三浦さん'],

  // key … シートB列に書く値 / label … 画面上部のタブ名 / handle … 投稿に出るユーザー名
  accounts: [
    { key: 'project', label: 'プロジェクト', handle: 'fujita_stainless' },
    { key: 'product', label: 'プロダクト',   handle: 'kingplants_pot' },
    { key: 'youtube', label: 'YouTube',    handle: '藤田鉄工所' },
    { key: 'note',    label: 'note',       handle: '藤田鉄工所' }
  ],

  showAccountTabs: true,

  // 共同投稿のときに並べて表示する2アカウント（accounts の key）
  collabPair: ['project', 'product'],

  // シートの「共同投稿」列が空のときの既定値
  collabDefault: false,

  commentPlaceholder: '気になる点や直してほしいところを書いてください'
};
