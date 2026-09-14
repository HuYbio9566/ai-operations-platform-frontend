// 专题定义 - brief-hub 共享数据
export const TOPICS = [
  { id: 'feedback',              name: '核心AI产品用户反馈', parent: '用户反馈' },
  { id: 'safe-lobster',          name: '安全龙虾产品建议',   parent: '产品建议' },
  { id: 'skill-building-scenes', name: 'skill建设及场景示例', parent: '场景建设' },
  { id: 'best-practice-kb',      name: '优秀案例-知识库',    parent: '优秀案例' },
]

// 初始材料列表（与 /data/html/reports/ 下文件对应）
export const SEED_MATERIALS = [
  {
    id: 'ai-feedback-2026-06-17-2026-07-01',
    week: '2026-W27', date: '2026-07-01', uploadDate: '20260701',
    topicId: 'feedback', materialType: '定期更新',
    title: '内部反馈群用户反馈分析报告｜2026.06.17-2026.07.01',
    summary: '汇总 2026-06-17 至 2026-07-01 内部反馈群用户反馈，沉淀核心 AI 产品体验问题、用户诉求和后续优化线索。',
    reportPath: '/reports/用户反馈分析报告_2026-06-17至2026-07-01(1).html',
  },
  {
    id: 'safe-lobster-tuitui-upgrade-20260702',
    week: '2026-W27', date: '2026-07-02', uploadDate: '20260702',
    topicId: 'safe-lobster', materialType: '交办任务',
    title: '安全龙虾推推使用体验升级需求',
    summary: '围绕安全龙虾接入推推、对话快捷入口、skillhub 安装、文件传输、输出过程收起和版本同步等体验升级建议。',
    reportPath: '/reports/安全龙虾推推使用体验升级需求-20260702.html',
  },
  {
    id: 'skill-building-scenes-20260702',
    week: '2026-W27', date: '2026-07-02', uploadDate: '20260702',
    topicId: 'skill-building-scenes', materialType: '定期更新',
    title: 'skill打通进展及场景示例清单',
    summary: '整合内网技能接入进展与场景清单，展示安全龙虾、VPC 龙虾、SEAF 的 skill 打通状态，以及可落地的业务场景示例明细。',
    reportPath: '/reports/skill打通情况及场景示例明细-20260703.html',
  },
  {
    id: 'best-practice-kb-202606-20260702',
    week: '2026-W27', date: '2026-07-02', uploadDate: '20260702',
    updateCadence: '按月更新', versionLabel: '6月版',
    topicId: 'best-practice-kb', materialType: '定期更新',
    title: 'AI知识库运营案例集',
    summary: 'AI 知识库运营案例集 2026 年 6 月版，沉淀知识库运营优秀案例，按月更新用于复盘、参考和推广。',
    reportPath: '/reports/AI知识库运营案例集_2026.6_按月更新.html',
  },
  {
    id: 'ai-kb-weekly-20260703',
    week: '2026-W27', date: '2026-07-03', uploadDate: '20260703',
    updateCadence: '按周更新',
    topicId: 'feedback', materialType: '定期更新',
    title: 'AI知识库运营周报 20260629-20260703',
    summary: '汇总 AI 知识库本周运营进展、关键数据表现和后续关注事项，适合作为每周例行推送材料。',
    reportPath: '/reports/AI知识库运营周报20260629~20260703-w27.html',
  },
  {
    id: 'skill-cli-mcp-20260703',
    week: '2026-W27', date: '2026-07-03', uploadDate: '20260703',
    updateCadence: '每周更新',
    topicId: 'skill-building-scenes', materialType: '定期更新',
    title: 'skill/cli/mcp运营报告',
    summary: '汇总 skill、cli、mcp 相关运营情况，关注接入进展、使用表现和关键问题，为后续能力建设提供依据。',
    reportPath: '/reports/AI办公-skill&mcp&cli运营报告.html',
  },
  {
    id: 'tuitui-team-20260703',
    week: '2026-W27', date: '2026-07-03', uploadDate: '20260703',
    updateCadence: '每周更新',
    topicId: 'feedback', materialType: '定期更新',
    title: '推推团队（含项目）运营报告（首次摸底）',
    summary: '对推推团队及项目场景进行首次运营摸底，覆盖基础现状、使用情况和后续可推进方向。',
    reportPath: '/reports/推推团队（含项目）运营报告（首次摸底）_0703.html',
  },
]
