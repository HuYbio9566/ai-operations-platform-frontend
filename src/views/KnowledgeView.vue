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
        :topic-ids="['best-practice-kb']"
        :keywords="['知识库']"
        default-topic-id="best-practice-kb"
      />
    </div>

    <!-- ── 数据 tab ── -->
    <template v-else>
    <div v-if="loading" class="loading-overlay"><span class="spinner"></span> 加载中…</div>

    <template v-else-if="data">
      <div v-if="data.data_date" class="data-date-bar">
        数据截止：{{ data.data_date }}（来源：知识库数据库）
      </div>

      <!-- KPI 行 -->
      <div class="kpi-row kpi-row-5">
        <div class="kpi-card">
          <div class="kpi-label">知识库总数</div>
          <div class="kpi-value good">{{ fmtNum(data.kb_total) }}</div>
          <div class="kpi-sub">累计建库</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">文档总数</div>
          <div class="kpi-value">{{ fmtNum(data.doc_total) }}</div>
          <div class="kpi-sub">知识库内文档</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">月度活跃用户</div>
          <div class="kpi-value brand">{{ fmtNum(data.latest_month_active) }}</div>
          <div class="kpi-sub">最近月操作用户数</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">AI 问答会话数</div>
          <div class="kpi-value">{{ fmtNum(data.ai_sessions) }}</div>
          <div class="kpi-sub">累计 AI 问答会话</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">AI 问答次数</div>
          <div class="kpi-value">{{ fmtNum(data.ai_qa_total) }}</div>
          <div class="kpi-sub">累计问答（{{ data.ai_users }} 人使用）</div>
        </div>
      </div>

      <!-- 行 1：月度知识库新增 + 月度活跃用户 -->
      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-title">月度知识库 / 文档新增趋势</div>
          <div ref="kbGrowthRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">月度活跃用户趋势</div>
          <div ref="activeUserRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 2：部门知识库 Top10 + AI 问答月度趋势 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">部门知识库数 Top 10</div>
          <div ref="deptKbRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">AI 问答月度趋势</div>
          <div ref="aiTrendRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 3：部门知识库详情表 -->
      <div class="card" style="margin-top:12px">
        <div class="card-title">各部门知识库详情 Top 10</div>
        <table class="data-table">
          <thead>
            <tr>
              <th class="rank-cell">#</th>
              <th>部门</th>
              <th class="num-cell">知识库数</th>
              <th class="num-cell">文档数</th>
              <th class="num-cell">成员数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in data.dept_summary" :key="row.部门 || idx">
              <td class="rank-cell">{{ idx + 1 }}</td>
              <td>{{ row.部门 }}</td>
              <td class="num-cell">{{ fmtNum(row.知识库数) }}</td>
              <td class="num-cell">{{ fmtNum(row.文档数) }}</td>
              <td class="num-cell">{{ fmtNum(row.成员数) }}</td>
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

const kbGrowthRef  = ref(null)
const activeUserRef = ref(null)
const deptKbRef    = ref(null)
const aiTrendRef   = ref(null)
const charts = {}

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
  try { data.value = await fetchApi(`/knowledge/?days=${days.value}`) }
  catch (e) { console.error(e) }
  finally { loading.value = false; drawCharts() }
}

function drawCharts() {
  nextTick(() => {
    if (!data.value) return
    const d = data.value

    // 1. 月度知识库 + 文档新增
    const trend = d.monthly_trend ?? []
    charts.kbGrowth = initChart(kbGrowthRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
      legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
      grid: { left: 40, right: 16, top: 32, bottom: 48 },
      xAxis: makeXAxis(trend.map(r => shortDate(r.月份)), 30),
      yAxis: [makeYAxis(), { type: 'value', splitLine: { show: false }, axisLabel: { color: T.txt, fontSize: 11 } }],
      series: [
        { name: '知识库新增', type: 'bar', data: trend.map(r => r.知识库新增 || 0),
          itemStyle: { color: T.brand }, barMaxWidth: 18 },
        { name: '文档新增', type: 'bar', data: trend.map(r => r.文档新增 || 0),
          itemStyle: { color: T.brand2 }, barMaxWidth: 18, yAxisIndex: 1 },
      ],
    })

    // 2. 月度活跃用户
    charts.activeUser = initChart(activeUserRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
      legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
      grid: { left: 40, right: 16, top: 32, bottom: 48 },
      xAxis: makeXAxis(trend.map(r => shortDate(r.月份)), 30),
      yAxis: makeYAxis(),
      series: [
        { name: '活跃用户', type: 'bar', data: trend.map(r => r.活跃用户 || 0),
          itemStyle: { color: T.good }, barMaxWidth: 22 },
        { name: '操作次数', type: 'line', data: trend.map(r => r.操作次数 || 0),
          smooth: true, lineStyle: { color: T.warn, type: 'dashed' }, itemStyle: { color: T.warn }, symbol: 'none' },
      ],
    })

    // 3. 部门知识库 Top10
    const dept = [...(d.dept_summary ?? [])].sort((a, b) => (a.知识库数||0) - (b.知识库数||0))
    charts.deptKb = initChart(deptKbRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      xAxis: makeYAxis(),
      yAxis: makeYCat(dept.map(r => r.部门 || '')),
      series: [
        { name: '知识库数', type: 'bar', data: dept.map(r => r.知识库数 || 0), barMaxWidth: 14,
          itemStyle: { color: T.brand, borderRadius: [0, 4, 4, 0] } },
        { name: '文档数(÷10)', type: 'bar', data: dept.map(r => Math.round((r.文档数||0)/10)), barMaxWidth: 14,
          itemStyle: { color: T.brand2, borderRadius: [0, 4, 4, 0] } },
      ],
    })

    // 4. AI 问答月度趋势
    const ai = d.ai_monthly ?? []
    charts.aiTrend = initChart(aiTrendRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
      legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
      grid: { left: 40, right: 40, top: 32, bottom: 48 },
      xAxis: makeXAxis(ai.map(r => shortDate(r.月份)), 30),
      yAxis: [makeYAxis(), { type: 'value', splitLine: { show: false }, axisLabel: { color: T.txt, fontSize: 11 } }],
      series: [
        { name: 'AI会话数', type: 'bar', data: ai.map(r => r.AI会话数 || 0),
          itemStyle: { color: T.brand }, barMaxWidth: 22 },
        { name: 'AI用户数', type: 'line', yAxisIndex: 1, data: ai.map(r => r.AI用户数 || 0),
          smooth: true, lineStyle: { color: T.good }, itemStyle: { color: T.good }, symbol: 'circle', symbolSize: 4 },
      ],
    })
  })
}

function onResize() { Object.values(charts).forEach(c => { try { c?.resize() } catch(e){} }) }
onMounted(() => { load(); window.addEventListener('resize', onResize) })
onUnmounted(() => window.removeEventListener('resize', onResize))
watch(() => props.timeRange, load)
watch(activeTab, val => { if (val === 'data') drawCharts() })
</script>
