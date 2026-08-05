/* ローカル確認用（KING PLANTS版）。本番デプロイには含めない。 */

const CONFIG = {
  clientName: 'KING PLANTS（開発用）',
  gasUrl: 'https://example.invalid/exec',
  reviewers: ['小野寺さん'],
  accounts: [
    { key: 'product', label: 'プロダクト', handle: 'kingplants_pot' },
    { key: 'project', label: 'プロジェクト', handle: 'fujita_stainless' }
  ],
  showAccountTabs: false,
  collabPair: ['project', 'product'],
  collabDefault: true,
  commentPlaceholder: '店名の表記、植物の品種名、映り込みなど、気になる点があれば'
};
