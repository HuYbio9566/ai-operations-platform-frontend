// GitHub Pages 公开演示数据：仅用于展示界面，不包含真实业务记录。
const dates = ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13', '2026-09-14']
const feedback = {
  data_date: '2026-09-14', total_count: 128, item_total: 96, total_users: 42, reply_rate: 93.8, p0_count: 1, p0p1_count: 7,
  top_groups: [{ group: '产品体验群', count: 42 }, { group: 'AI 效能群', count: 31 }, { group: '研发协作群', count: 25 }, { group: '运营交流群', count: 18 }],
  by_date: dates.map((date, i) => ({ date, count: [12, 16, 18, 21, 17, 19, 25][i] })),
  trend: dates.map((date, i) => ({ date, count: [12, 16, 18, 21, 17, 19, 25][i], badcase: [3, 4, 2, 5, 3, 4, 2][i] })),
  category_dist: [{ category: 'badcase', count: 34 }, { category: 'goodcase', count: 58 }, { category: 'unknown', count: 4 }],
  priority_dist: [{ priority: 'P0', count: 1 }, { priority: 'P1', count: 6 }, { priority: 'P2', count: 38 }, { priority: 'P3', count: 51 }],
  domain_dist: [{ domain: 'WisCode/智效代码', count: 18 }, { domain: 'OpenClaw/龙虾', count: 16 }, { domain: '智脑API/模型', count: 14 }, { domain: 'Seaf平台', count: 12 }, { domain: '推推产品', count: 10 }],
  ai_tag_dist: [{ ai_tag: 'AI核心产品', count: 42 }, { ai_tag: 'AI辅助功能', count: 31 }, { ai_tag: '非AI产品', count: 23 }],
  status_dist: [{ status: '已处理', count: 62 }, { status: '私聊处理', count: 21 }, { status: '待跟进', count: 8 }, { status: '其他', count: 5 }],
  groups_trend: [], focus: Object.fromEntries(['龙虾', 'Seaf', '推推', 'SkillHub'].map((key, j) => [key, { daily: dates.map((date, i) => ({ date, count: (j + 2) * 2 + i })) }])),
  daily_product: [], weekday_dist: [], top_reporters: [{ name: '演示用户 A', count: 18 }, { name: '演示用户 B', count: 13 }], top_keywords: [{ keyword: '登录', count: 12 }, { keyword: '效率', count: 10 }]
}
const knowledge = {
  data_date: '2026-09-14', kb_total: 86, doc_total: 312, latest_month_active: 64, ai_sessions: 428, ai_qa_total: 1260, ai_users: 74,
  monthly_trend: ['2026-06', '2026-07', '2026-08', '2026-09'].map((月份, i) => ({ 月份, 知识库新增: 12 + i * 5, 文档新增: 48 + i * 18, 活跃用户: 38 + i * 9, 操作次数: 260 + i * 42 })),
  ai_monthly: ['2026-06', '2026-07', '2026-08', '2026-09'].map((月份, i) => ({ 月份, AI会话数: 180 + i * 70, AI问答数: 320 + i * 120, AI用户数: 38 + i * 12 })),
  dept_summary: [{ 部门: '研发中心', 知识库数: 24, 文档数: 108 }, { 部门: '产品中心', 知识库数: 18, 文档数: 76 }, { 部门: '运营中心', 知识库数: 15, 文档数: 58 }, { 部门: '客户成功', 知识库数: 11, 文档数: 42 }]
}
const tuitui = {
  data_date: '2026-09-14', daily_active: dates.map((日期, i) => ({ 日期, 活跃用户数: 46 + i * 7 })), daily_with_ma7: dates.map((日期, i) => ({ 日期, 活跃用户数: 46 + i * 7, ma7: 52 + i * 5 })), avg_daily_7d: 69,
  team_summary: { total_teams: 23 }, top_posters: [{ user: '演示用户 A', count: 32 }, { user: '演示用户 B', count: 26 }], top_teams: [{ team: '创新实验室', 近7日发帖数: 38 }, { team: '产品共创组', 近7日发帖数: 31 }, { team: '研发一部', 近7日发帖数: 24 }],
  dept_daily_avg: [{ dept: '研发中心', avg: 16 }, { dept: '产品中心', avg: 12 }, { dept: '运营中心', avg: 9 }], dept_active_agg: [{ dept: '研发中心', count: 142 }, { dept: '产品中心', count: 108 }, { dept: '运营中心', count: 86 }], dept_7d_activity: [{ dept: '研发中心', post_7d_total: 68, per_team: 8.5 }, { dept: '产品中心', post_7d_total: 48, per_team: 6.9 }, { dept: '运营中心', post_7d_total: 33, per_team: 5.5 }],
  week_post_dist: { '0帖': 5, '1-5帖': 8, '6-15帖': 6, '16帖以上': 4 }, member_size_dist: { '1-5人': 6, '6-15人': 9, '16-30人': 5, '30人以上': 3 }, team_by_dept: [{ 'owner一级部门': '研发中心', 团队数: 9 }, { 'owner一级部门': '产品中心', 团队数: 7 }, { 'owner一级部门': '运营中心', 团队数: 5 }]
}
const skillTypes = {}
for (const type of ['skill', 'cli', 'agent', 'mcp']) skillTypes[type] = { total: type === 'cli' ? 1260 : type === 'agent' ? 820 : type === 'mcp' ? 540 : 980, users: type === 'cli' ? 74 : type === 'agent' ? 51 : type === 'mcp' ? 38 : 63, delta_pct: type === 'mcp' ? -2.3 : 8.1, points: dates.map((time, i) => ({ time, count: 80 + i * 15 })) }
const skillhub = { types_summary: { total_users: 96, types: skillTypes }, trend_all: dates.map((time, i) => ({ time, count: 250 + i * 30 })) }
for (const type of ['cli', 'agent', 'mcp']) {
  skillhub['overview_' + type] = { total_calls: skillTypes[type].total, active_names: 18, active_users: skillTypes[type].users, success_rate: 98.2, p95_ms: 420, ai_rate: 76.5 }
  skillhub['health_' + type] = []
  skillhub['trend_' + type] = skillTypes[type].points
  skillhub['ranking_' + type] = [{ name: '内容生成', count: 320 }, { name: '数据分析', count: 240 }, { name: '项目助手', count: 180 }]
  skillhub['top_users_' + type] = [{ user_id: '演示用户 A', count: 82 }, { user_id: '演示用户 B', count: 64 }]
}
export function getDemoData(path) {
  if (path.startsWith('/feedback/items')) return { total: 3, items: [{ title: '示例反馈：希望优化搜索体验', group: '产品体验群', date: '2026-09-14', priority: 'P2', domain: 'AI核心产品', status: '已处理' }, { title: '示例反馈：增加快捷入口', group: 'AI效能群', date: '2026-09-13', priority: 'P1', domain: 'Seaf平台', status: '待跟进' }, { title: '示例反馈：导出体验建议', group: '运营交流群', date: '2026-09-12', priority: 'P3', domain: '推推产品', status: '私聊处理' }] }
  if (path.startsWith('/feedback')) return feedback
  if (path.startsWith('/knowledge')) return knowledge
  if (path.startsWith('/tuitui/agents')) return { total_agents: 48, daily_trend: dates.map((date, i) => ({ date, count: 3 + i })) }
  if (path.startsWith('/tuitui')) return tuitui
  if (path.startsWith('/skillhub')) return skillhub
  return {}
}
