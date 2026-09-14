<template>
  <div>
    <!-- Tab 切换条 -->
    <div class="view-tabs">
      <button class="view-tab" :class="{ active: activeTab === 'data' }" @click="activeTab = 'data'">数据</button>
      <button class="view-tab" :class="{ active: activeTab === 'reports' }" @click="activeTab = 'reports'">报告</button>
    </div>

    <!-- ── 报告 tab ── -->
    <div v-if="activeTab === 'reports'">
      <ReportFlow
        :topic-ids="['safe-lobster']"
        :keywords="['推推']"
        default-topic-id="safe-lobster"
      />
    </div>

    <!-- ── 数据 tab ── -->
    <template v-else>
    <div v-if="loading" class="loading-overlay"><span class="spinner"></span> 加载中…</div>

    <template v-else-if="data">
      <div v-if="data.data_date" class="data-date-bar">
        数据截止：{{ data.data_date }}（来源：360 云盘）
      </div>
      <!-- KPI 行 1：推推团队 -->
      <div class="kpi-row kpi-row-4">
        <div class="kpi-card">
          <div class="kpi-label">团队总数</div>
          <div class="kpi-value">{{ fmtNum(data.team_summary?.total_teams) }}</div>
          <div class="kpi-sub">公开 {{ fmtNum(data.team_summary?.public_teams) }} / 私密 {{ fmtNum(data.team_summary?.private_teams) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">团队日活均值</div>
          <div class="kpi-value brand">{{ avgDailyActive }}</div>
          <div class="kpi-sub">近 {{ days }} 天均值</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">近7日活跃团队</div>
          <div class="kpi-value good">{{ active7dTeams }}</div>
          <div class="kpi-sub">有发帖的团队（1帖以上）</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">近7日人均帖子</div>
          <div class="kpi-value">{{ perUserPost7d }}</div>
          <div class="kpi-sub">近7日总发帖 / 近7日日活均值</div>
        </div>
      </div>

      <!-- KPI 行 2：智能体 -->
      <div class="kpi-row kpi-row-4" style="margin-top:12px">
        <div class="kpi-card">
          <div class="kpi-label">智能体总数</div>
          <div class="kpi-value">{{ agentData ? fmtNum(agentData.total) : '--' }}</div>
          <div class="kpi-sub">已发布</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">公开智能体</div>
          <div class="kpi-value good">{{ agentData ? fmtNum(agentData.public_count) : '--' }}</div>
          <div class="kpi-sub">占比 {{ agentData?.total ? ((agentData.public_count / agentData.total) * 100).toFixed(1) : 0 }}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">部分公开智能体</div>
          <div class="kpi-value brand">{{ agentData ? fmtNum(agentData.partial_count) : '--' }}</div>
          <div class="kpi-sub">占比 {{ agentData?.total ? ((agentData.partial_count / agentData.total) * 100).toFixed(1) : 0 }}%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">私有智能体</div>
          <div class="kpi-value">{{ agentData ? fmtNum(agentData.private_count) : '--' }}</div>
          <div class="kpi-sub">占比 {{ agentData?.total ? ((agentData.private_count / agentData.total) * 100).toFixed(1) : 0 }}%</div>
        </div>
      </div>

      <!-- 行 1：日活趋势（含7日均线）+ 智能体日增趋势 -->
      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-title">日活跃用户趋势（含 7 日均线）</div>
          <div ref="ttDailyRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">智能体日增趋势</div>
          <div ref="agentDailyRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 2：部门日均活跃 + 各部门活跃汇总 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">部门日均活跃人数</div>
          <div ref="deptDailyAvgRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">各部门累计活跃用户（近 {{ days }} 天）</div>
          <div ref="ttDeptRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 3：部门近7日发帖活跃度 + 近7日发帖分布 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">各部门近 7 日发帖量</div>
          <div ref="dept7dRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">近 7 日团队发帖分布</div>
          <div ref="ttWeekRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 4：团队规模分布 + 各部门团队数 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">团队规模分布（成员数）</div>
          <div ref="memberSizeRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">各部门团队数 + 部门人均发帖（近7日）</div>
          <div ref="ttTeamDeptRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 发帖排行 -->
      <div class="card" style="margin-top:12px">
        <div class="card-title">发帖/回帖排行 Top 10</div>
        <table class="data-table">
          <thead><tr><th class="rank-cell">排名</th><th>域账号</th><th>所在部门</th><th class="num-cell">发帖回帖总数</th></tr></thead>
          <tbody>
            <tr v-for="row in data.top_posters" :key="row.排名">
              <td class="rank-cell">{{ row.排名 }}</td>
              <td>{{ row.域账号 }}</td>
              <td>{{ row.所在部门 }}</td>
              <td class="num-cell">{{ fmtNum(row.发帖回帖总数) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 活跃团队 -->
      <div class="card" style="margin-top:12px">
        <div class="card-title">活跃团队 Top 10（按近7日人发帖数）</div>
        <table class="data-table">
          <thead><tr><th>团队名称</th><th class="rank-cell">公开</th><th>所属部门</th><th class="num-cell">成员数</th><th class="num-cell">近7日人发帖数</th><th class="num-cell">帖子总数</th></tr></thead>
          <tbody>
            <tr v-for="row in data.top_teams" :key="row.团队名称">
              <td>{{ row.团队名称 }}</td>
              <td><span :class="row.是否公开 === '公开' ? 'tag-good' : 'tag-dim'">{{ row.是否公开 }}</span></td>
              <td>{{ row['owner一级部门'] }}</td>
              <td class="num-cell">{{ row['成员总数（含bot）'] }}</td>
              <td class="num-cell">{{ fmtNum(row.近7日发帖数) }}</td>
              <td class="num-cell">{{ fmtNum(row.帖子总数) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-else class="empty-state">暂无数据</div>
    </template><!-- end 数据 tab -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { fmtNum, getDays, fetchApi, T, makeXAxis, makeYAxis, makeYCat, shortDate } from '../utils.js'
import ReportFlow from '../components/ReportFlow.vue'

const activeTab = ref('data')

const props = defineProps({ timeRange: { type: String, default: '14d' } })
const days = computed(() => getDays(props.timeRange))

const data = ref(null)
const loading = ref(false)

const ttDailyRef      = ref(null)
const agentDailyRef   = ref(null)
const deptDailyAvgRef = ref(null)
const ttDeptRef       = ref(null)
const dept7dRef       = ref(null)
const ttWeekRef       = ref(null)
const memberSizeRef   = ref(null)
const ttTeamDeptRef   = ref(null)
const charts = {}

const agentData  = ref(null)
const agentError = ref('')

const avgDailyActive = computed(() => {
  const d = data.value?.daily_active ?? []
  if (!d.length) return '--'
  return Math.round(d.reduce((s, r) => s + (r.活跃用户数 || 0), 0) / d.length)
})

const active7dTeams = computed(() => {
  const wd = data.value?.week_post_dist ?? {}
  return Object.entries(wd).filter(([k]) => k !== '0帖').reduce((s, [, v]) => s + v, 0)
})

const perUserPost7d = computed(() => {
  const teams = data.value?.top_teams ?? []
  const total7d = teams.reduce((s, t) => s + (t.近7日发帖数 || 0), 0)
  // 使用后端固定计算的近7日日活均值，与时间范围无关
  const avg7 = data.value?.avg_daily_7d
  if (!avg7) return '--'
  return (total7d / avg7).toFixed(1)
})

function tip() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return { backgroundColor: isDark ? '#1a2235' : '#ffffff', borderColor: T.line, textStyle: { color: isDark ? '#c8d4e3' : '#1f2937', fontSize: 12 } }
}
function initChart(el, opt) {
  if (!el) return
  let c = echarts.getInstanceByDom(el)
  if (!c) c = echarts.init(el, null, { renderer: 'canvas' })
  c.setOption(opt, true)
  return c
}

async function load() {
  loading.value = true
  try { data.value = await fetchApi(`/tuitui/?days=${days.value}`) }
  catch (e) { console.error(e) }
  finally { loading.value = false; drawCharts() }
}

async function loadAgents() {
  agentError.value = ''
  try {
    agentData.value = await fetchApi('/tuitui/agents/')
  } catch (e) {
    agentError.value = e?.message || String(e)
  }
  // 数据到位后再画图（此时 DOM 已由 data 驱动渲染完成）
  nextTick(drawAllCharts)
}

function drawAgentChart() {
  const d = agentData.value
  if (!d || !agentDailyRef.value) return
  const trend = d.daily_trend ?? []
  charts.agentDaily = initChart(agentDailyRef.value, {
    backgroundColor: 'transparent',
    tooltip: { ...tip(), trigger: 'axis' },
    grid: { left: 40, right: 8, top: 24, bottom: 48 },
    xAxis: makeXAxis(trend.map(r => shortDate(r.date)), 35),
    yAxis: makeYAxis(),
    series: [{
      name: '新增智能体',
      type: 'bar',
      data: trend.map(r => r.count),
      itemStyle: { color: T.good + 'cc', borderRadius: [3, 3, 0, 0] },
    }],
  })
}

function drawAllCharts() {
  if (!data.value) return

  const d = data.value

  // 1. 日活趋势 + 7日均线
  const ma7 = d.daily_with_ma7 ?? d.daily_active ?? []
  charts.daily = initChart(ttDailyRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
    legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
    grid: { left: 40, right: 8, top: 32, bottom: 48 },
    xAxis: makeXAxis(ma7.map(r => shortDate(r.日期)), 35),
    yAxis: makeYAxis(),
    series: [
      { name: '日活跃', type: 'bar', data: ma7.map(r => r.活跃用户数),
        itemStyle: { color: T.brand + '99', borderRadius: [3,3,0,0] } },
      { name: '7日均线', type: 'line', data: ma7.map(r => r.ma7 ?? null),
        smooth: true, lineStyle: { color: T.warn, width: 2 }, itemStyle: { color: T.warn }, symbol: 'none' },
    ],
  })

  // 2. 智能体日增趋势
  drawAgentChart()

  // 3. 部门日均活跃
  const dda = [...(d.dept_daily_avg ?? [])].sort((a, b) => a.avg - b.avg)
  charts.deptDailyAvg = initChart(deptDailyAvgRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
    xAxis: makeYAxis(), yAxis: makeYCat(dda.map(r => r.dept)),
    series: [{ type: 'bar', data: dda.map(r => r.avg), barMaxWidth: 14,
      itemStyle: { color: T.brand, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: T.txt, fontSize: 11 } }],
  })

  // 4. 部门累计活跃
  const dept = [...(d.dept_active_agg ?? [])].sort((a, b) => a.count - b.count).slice(-10)
  charts.dept = initChart(ttDeptRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
    xAxis: makeYAxis(), yAxis: makeYCat(dept.map(r => r.dept)),
    series: [{ type: 'bar', data: dept.map(r => r.count), barMaxWidth: 14,
      itemStyle: { color: T.brand2, borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: T.txt, fontSize: 11 } }],
  })

  // 5. 部门近7日发帖（双轴）
  const d7 = [...(d.dept_7d_activity ?? [])].sort((a, b) => a.post_7d_total - b.post_7d_total).slice(-10)
  charts.dept7d = initChart(dept7dRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
    legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
    grid: { left: 8, right: 60, top: 32, bottom: 8, containLabel: true },
    xAxis: [makeYAxis(), { type: 'value', splitLine: { show: false }, axisLabel: { color: T.txt, fontSize: 11 } }],
    yAxis: makeYCat(d7.map(r => r.dept)),
    series: [
      { name: '近7日发帖总量', type: 'bar', xAxisIndex: 0, data: d7.map(r => r.post_7d_total), barMaxWidth: 14,
        itemStyle: { color: T.good, borderRadius: [0, 4, 4, 0] } },
      { name: '每团队均发帖', type: 'scatter', xAxisIndex: 1, data: d7.map(r => r.per_team),
        symbolSize: 10, itemStyle: { color: T.warn } },
    ],
  })

  // 6. 近7日发帖分布环形
  const weekDist = d.week_post_dist ?? {}
  charts.week = initChart(ttWeekRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'item', formatter: '{b}: {c}个团队 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: T.txt, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['32%', '60%'], center: ['50%', '44%'],
      data: Object.entries(weekDist).map(([k, v]) => ({ name: k, value: v })),
      label: { color: T.txt, fontSize: 11 },
    }],
  })

  // 7. 团队规模分布环形
  const ms = d.member_size_dist ?? {}
  const MS_COLORS = { '1-5人': T.brand2, '6-15人': T.brand, '16-30人': T.good, '30人以上': T.warn }
  charts.memberSize = initChart(memberSizeRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'item', formatter: '{b}: {c}个团队 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: T.txt, fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['32%', '60%'], center: ['50%', '44%'],
      data: Object.entries(ms).map(([k, v]) => ({ name: k, value: v, itemStyle: { color: MS_COLORS[k] } })),
      label: { color: T.txt, fontSize: 11 },
    }],
  })

  // 8. 各部门团队数 + 人均发帖（双轴）
  const tbd = [...(d.team_by_dept ?? [])].sort((a, b) => a.团队数 - b.团队数).slice(-10)
  const d7Map = Object.fromEntries((d.dept_7d_activity ?? []).map(r => [r.dept, r.per_team]))
  charts.teamDept = initChart(ttTeamDeptRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
    legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
    grid: { left: 8, right: 60, top: 32, bottom: 8, containLabel: true },
    xAxis: [makeYAxis(), { type: 'value', splitLine: { show: false }, axisLabel: { color: T.txt, fontSize: 11 } }],
    yAxis: makeYCat(tbd.map(r => r['owner一级部门'] || '')),
    series: [
      { name: '团队数', type: 'bar', xAxisIndex: 0, data: tbd.map(r => r.团队数), barMaxWidth: 14,
        itemStyle: { color: T.warn, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: T.txt, fontSize: 11 } },
      { name: '人均7日发帖', type: 'scatter', xAxisIndex: 1,
        data: tbd.map(r => d7Map[r['owner一级部门']] ?? 0),
        symbolSize: 10, itemStyle: { color: T.brand } },
    ],
  })
}

function drawCharts() {
  nextTick(drawAllCharts)
}

function onResize() { Object.values(charts).forEach(c => { try { c?.resize() } catch(e){} }) }
onMounted(() => {
  load()
  loadAgents()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => window.removeEventListener('resize', onResize))
watch(() => props.timeRange, load)
watch(activeTab, val => { if (val === 'data') drawCharts() })
</script>
