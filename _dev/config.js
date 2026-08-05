/* ローカル確認用（GASにはつながない）。本番デプロイには含めない。 */

const CONFIG = {
  clientName: '藤田鉄工所（開発用）',
  gasUrl: 'https://example.invalid/exec',
  reviewers: ['米倉社長', '吉田さん', '三浦さん'],
  accounts: [
    { key: 'project', label: 'プロジェクト', handle: 'fujita_stainless' },
    { key: 'product', label: 'プロダクト',   handle: 'kingplants_pot' },
    { key: 'youtube', label: 'YouTube',    handle: '藤田鉄工所' }
  ],
  showAccountTabs: true,
  collabPair: ['project', 'product'],
  collabDefault: false,
  commentPlaceholder: '気になる点や直してほしいところを書いてください'
};
