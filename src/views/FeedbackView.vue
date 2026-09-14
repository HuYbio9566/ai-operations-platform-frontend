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
        :topic-ids="['feedback']"
        :keywords="['反馈', '用户反馈']"
        default-topic-id="feedback"
      />
    </div>

    <!-- ── 数据 tab ── -->
    <template v-else>
    <div v-if="loading" class="loading-overlay"><span class="spinner"></span> 加载中…</div>

    <template v-else-if="data">

      <div v-if="data.data_date" class="data-date-bar">
        数据截止：{{ data.data_date }}（来源：360 云盘）
      </div>
      <!-- KPI 行 1：核心指标 -->
      <div class="kpi-row kpi-row-4">
        <div class="kpi-card clickable" @click="openModal('total_count')">
          <div class="kpi-label">反馈总量 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value brand">{{ fmtNum(data.total_count) }}</div>
          <div class="kpi-sub">近 {{ days }} 天（按群汇总）</div>
        </div>
        <div class="kpi-card clickable" @click="openModal('item_total')">
          <div class="kpi-label">结构化条目 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value">{{ fmtNum(data.item_total) }}</div>
          <div class="kpi-sub">涉及用户 {{ fmtNum(data.total_users) }} 人次</div>
        </div>
        <div class="kpi-card clickable" @click="openModal('reply_rate')">
          <div class="kpi-label">回复/解决率 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value good">{{ data.reply_rate }}%</div>
          <div class="kpi-sub">已处理 + 私聊处理</div>
        </div>
        <div class="kpi-card clickable" @click="openModal('groups')">
          <div class="kpi-label">覆盖群组 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value">{{ data.top_groups?.length ?? 0 }}</div>
          <div class="kpi-sub">有反馈的群</div>
        </div>
      </div>

      <!-- KPI 行 2：严重性 -->
      <div class="kpi-row kpi-row-4" style="margin-top:10px">
        <div class="kpi-card clickable" style="border-color:rgba(201,48,48,0.3)" @click="openModal('p0')">
          <div class="kpi-label">P0 阻断 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value" style="color:var(--bad)">{{ data.p0_count }}</div>
          <div class="kpi-sub">严重阻断问题</div>
        </div>
        <div class="kpi-card clickable" style="border-color:var(--border-strong)" @click="openModal('p0p1')">
          <div class="kpi-label">P0+P1 严重 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value" style="color:var(--text)">{{ data.p0p1_count }}</div>
          <div class="kpi-sub">需优先跟进</div>
        </div>
        <div class="kpi-card clickable" style="border-color:rgba(201,48,48,0.2)" @click="openModal('badcase')">
          <div class="kpi-label">问题/故障类反馈 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value" style="color:var(--bad)">{{ badcaseCount }}</div>
          <div class="kpi-sub">报错、无法使用等</div>
        </div>
        <div class="kpi-card clickable" style="border-color:rgba(14,143,88,0.25)" @click="openModal('goodcase')">
          <div class="kpi-label">需求/建议/咨询 <span class="kpi-hint">点击查看明细</span></div>
          <div class="kpi-value good">{{ goodcaseCount }}</div>
          <div class="kpi-sub">功能建议、使用咨询等</div>
        </div>
      </div>

      <!-- ══ 重点产品专项区 ══ -->
      <div class="section-hd" style="margin-top:24px">
        <span class="section-title">重点关注产品</span>
      </div>

      <div class="grid-2" style="margin-top:0">
        <div v-for="prod in FOCUS_PRODUCTS" :key="prod.key" class="focus-card">
          <!-- 产品头 -->
          <div class="focus-hd">
            <span class="focus-icon" :style="`background:${prod.color}22;color:${prod.color}`">{{ prod.icon }}</span>
            <span class="focus-name">{{ prod.key }}</span>
            <span class="focus-total">{{ fmtNum(focusData(prod.key)?.total) }} 条</span>
          </div>

          <!-- 产品 KPI -->
          <div class="focus-kpi-row">
            <div class="focus-kpi">
              <div class="fk-val" style="color:var(--bad)">{{ focusData(prod.key)?.badcase ?? 0 }}</div>
              <div class="fk-label">问题/故障</div>
            </div>
            <div class="focus-kpi">
              <div class="fk-val" style="color:var(--text)">{{ focusData(prod.key)?.p0p1 ?? 0 }}</div>
              <div class="fk-label">P0+P1</div>
            </div>
            <div class="focus-kpi">
              <div class="fk-val" style="color:var(--green)">{{ focusData(prod.key)?.reply_rate ?? 0 }}%</div>
              <div class="fk-label">解决率</div>
            </div>
            <div class="focus-kpi">
              <div class="fk-val">{{ focusData(prod.key)?.item_total ?? 0 }}</div>
              <div class="fk-label">条目数</div>
            </div>
          </div>

          <!-- 每日趋势迷你图 -->
          <div :ref="el => setFocusRef(prod.key, el)" class="focus-chart"></div>

          <!-- 高频问题 Top5 -->
          <div class="focus-issues">
            <div class="fi-title">高频问题 Top 5</div>
            <div v-for="(iss, idx) in (focusData(prod.key)?.top_issues ?? [])" :key="idx" class="fi-row">
              <span class="fi-rank">{{ idx + 1 }}</span>
              <span class="fi-text">{{ iss.title }}</span>
            </div>
            <div v-if="!focusData(prod.key)?.top_issues?.length" class="fi-empty">暂无数据</div>
          </div>
        </div>
      </div>

      <!-- 行 1：每日趋势（总量+Badcase）+ 优先级分布 -->
      <div class="grid-2" style="margin-top:16px">
        <div class="card">
          <div class="card-title">每日反馈趋势（总量 vs 问题/故障）</div>
          <div ref="trendRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">优先级分布</div>
          <div ref="priorityRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 2：Badcase/Goodcase + 问题领域 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">问题/故障 vs 需求/建议/咨询 占比</div>
          <div ref="categoryRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">问题领域分布</div>
          <div ref="domainRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 3：AI 产品属性 + 各群反馈量 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">AI 产品属性占比</div>
          <div ref="aiTagRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">各群反馈量 Top 10</div>
          <div ref="groupBarRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 4：每日领域堆叠 + 工作日分布 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">每日领域构成</div>
          <div ref="dailyDomainRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">工作日反馈量分布</div>
          <div ref="weekdayRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 5：活跃反馈人 + 高频关键词 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">活跃反馈人 Top 10</div>
          <div ref="reporterRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">高频关键词 Top 10</div>
          <div ref="keywordRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 行 6（全宽）：覆盖群数趋势 -->
      <div class="card" style="margin-top:12px" v-if="data.groups_trend?.length">
        <div class="card-title">每日覆盖群数趋势</div>
        <div ref="groupsTrendRef" style="width:100%;height:180px"></div>
      </div>

    </template>
    <div v-else class="empty-state">暂无数据</div>
    </template><!-- end 数据 tab -->

    <!-- ── KPI 详情弹窗 ── -->
    <teleport to="body">
      <div v-if="modal.open" class="modal-mask" @click.self="closeModal">
        <div class="modal-box" :class="{ 'modal-box-wide': modal.wide }">
          <div class="modal-hd">
            <span class="modal-title">{{ modal.title }}</span>
            <button class="modal-close" @click="closeModal">×</button>
          </div>
          <div class="modal-body">
            <div v-if="modal.loading" class="modal-loading"><span class="spinner"></span> 加载中…</div>
            <template v-else>
              <table class="modal-table">
                <colgroup>
                  <col style="width:40px">
                  <col v-for="col in modal.cols" :key="col.key" :style="col.width ? `width:${col.width}` : ''">
                </colgroup>
                <thead>
                  <tr>
                    <th class="mc-rank">#</th>
                    <th v-for="col in modal.cols" :key="col.key" :class="col.align === 'right' ? 'mc-right' : ''">{{ col.label }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in modalPageRows" :key="i">
                    <td class="mc-rank">{{ (modal.page - 1) * modal.pageSize + i + 1 }}</td>
                    <td
                      v-for="col in modal.cols"
                      :key="col.key"
                      :class="col.align === 'right' ? 'mc-right' : ''"
                      :style="col.style ? col.style(row) : ''"
                    >{{ row[col.key] }}</td>
                  </tr>
                  <tr v-if="!modal.rows.length && !modal.loading">
                    <td :colspan="modal.cols.length + 1" class="mc-empty">暂无数据</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>
          <div class="modal-ft">
            <span class="modal-page-info">共 {{ modal.total ?? modal.rows.length }} 条</span>
            <div class="modal-pager" v-if="modalTotalPages > 1">
              <button @click="modal.page = 1" :disabled="modal.page === 1">«</button>
              <button @click="modal.page--" :disabled="modal.page === 1">‹</button>
              <span class="modal-page-info">{{ modal.page }} / {{ modalTotalPages }}</span>
              <button @click="modal.page++" :disabled="modal.page === modalTotalPages">›</button>
              <button @click="modal.page = modalTotalPages" :disabled="modal.page === modalTotalPages">»</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>
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

const trendRef       = ref(null)
const priorityRef    = ref(null)
const categoryRef    = ref(null)
const domainRef      = ref(null)
const aiTagRef       = ref(null)
const groupBarRef    = ref(null)
const dailyDomainRef = ref(null)
const weekdayRef     = ref(null)
const reporterRef    = ref(null)
const keywordRef     = ref(null)
const groupsTrendRef = ref(null)
const charts = {}

// ── 四产品专项 ──
const FOCUS_PRODUCTS = [
  { key: '龙虾',     icon: '🦞', color: '#1f5fe8' },
  { key: 'Seaf',     icon: '🌊', color: '#1f5fe8' },
  { key: '推推',     icon: '💬', color: '#1f5fe8' },
  { key: 'SkillHub', icon: '⚡', color: '#1f5fe8' },
]
const focusChartRefs = {}
function setFocusRef(key, el) { focusChartRefs[key] = el }
function focusData(key) { return data.value?.focus?.[key] }

function drawFocusCharts() {
  nextTick(() => {
    FOCUS_PRODUCTS.forEach(prod => {
      const el = focusChartRefs[prod.key]
      if (!el) return
      const fd = focusData(prod.key)
      if (!fd) return
      const daily = fd.daily ?? []
      let c = echarts.getInstanceByDom(el)
      if (!c) c = echarts.init(el, null, { renderer: 'canvas' })
      c.setOption({
        backgroundColor: 'transparent',
        tooltip: { ...tip(), trigger: 'axis' },
        grid: { left: 32, right: 8, top: 8, bottom: 24 },
        xAxis: { type: 'category', data: daily.map(r => shortDate(r.date)), axisLine: { lineStyle: { color: T.line } }, axisLabel: { color: T.txt, fontSize: 10, rotate: 30 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: T.line } }, axisLabel: { color: T.txt, fontSize: 10 } },
        series: [{
          type: 'bar', data: daily.map(r => r.count),
          itemStyle: { color: prod.color, borderRadius: [3, 3, 0, 0] },
          barMaxWidth: 20,
        }],
      }, true)
      charts[`focus_${prod.key}`] = c
    })
  })
}

const badcaseCount  = computed(() => data.value?.category_dist?.find(r => r.category === 'badcase')?.count ?? 0)
const goodcaseCount = computed(() => data.value?.category_dist?.find(r => r.category === 'goodcase')?.count ?? 0)

// ── KPI 详情弹窗 ──
const modal = ref({ open: false, title: '', cols: [], rows: [], page: 1, pageSize: 15, wide: false, loading: false, total: 0 })
const modalTotalPages = computed(() => Math.max(1, Math.ceil(modal.value.rows.length / modal.value.pageSize)))
const modalPageRows   = computed(() => {
  const { rows, page, pageSize } = modal.value
  return rows.slice((page - 1) * pageSize, page * pageSize)
})

const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 }
const PRIORITY_COLOR = { P0: 'color:var(--bad)', P1: 'color:var(--bad)', P2: 'color:var(--blue)', P3: '' }
const STATUS_COLOR = { '已处理': 'color:var(--green)', '私聊处理': 'color:var(--green)', '待跟进': 'color:var(--bad)', '其他': '' }

// 具体条目列定义（宽弹窗）
const ITEM_COLS = [
  { key: 'title',    label: '反馈标题',  width: '38%' },
  { key: 'group',    label: '群组',      width: '18%' },
  { key: 'date',     label: '日期',      width: '10%' },
  { key: 'priority', label: '优先级',    width: '8%',  style: r => PRIORITY_COLOR[r.priority] || '' },
  { key: 'domain',   label: '领域',      width: '14%' },
  { key: 'status',   label: '状态',      width: '12%', style: r => STATUS_COLOR[r.status] || '' },
]

async function openModal(type) {
  if (!data.value) return
  const d = data.value

  // 需要拉取具体条目的卡片类型
  const ITEM_TYPES = { p0: 'P0', p0p1: 'P0,P1', badcase: null, goodcase: null }

  if (type in ITEM_TYPES) {
    const titleMap = {
      p0:       'P0 阻断 — 具体条目',
      p0p1:     'P0+P1 严重 — 具体条目',
      badcase:  '问题/故障类反馈 — 具体条目',
      goodcase: '需求/建议/咨询 — 具体条目',
    }
    modal.value = { open: true, title: titleMap[type], cols: ITEM_COLS, rows: [], page: 1, pageSize: 15, wide: true, loading: true, total: 0 }

    try {
      const params = new URLSearchParams({ days: days.value })
      if (type === 'p0')       params.set('priority', 'P0')
      else if (type === 'p0p1') params.set('priority', 'P0,P1')
      else if (type === 'badcase')  params.set('category', 'badcase')
      else if (type === 'goodcase') params.set('category', 'goodcase')

      const res = await fetchApi(`/feedback/items/?${params}`)
      modal.value.rows  = res.items ?? []
      modal.value.total = res.total ?? res.items?.length ?? 0
    } catch (e) {
      console.error(e)
    } finally {
      modal.value.loading = false
    }
    return
  }

  // 非条目类型：用本地数据
  let title = '', cols = [], rows = [], wide = false

  if (type === 'total_count' || type === 'groups') {
    title = type === 'total_count' ? '反馈总量 — 按群明细' : '覆盖群组 — 反馈量明细'
    cols = [
      { key: 'group', label: '群组名称', width: '70%' },
      { key: 'count', label: '反馈量',   width: '30%', align: 'right' },
    ]
    rows = [...(d.top_groups ?? [])].sort((a, b) => b.count - a.count)
  }

  else if (type === 'item_total') {
    title = '结构化条目 — 处理状态明细'
    const total = d.item_total || 1
    cols = [
      { key: 'status', label: '处理状态', width: '50%', style: r => STATUS_COLOR[r.status] || '' },
      { key: 'count',  label: '条目数',   width: '25%', align: 'right' },
      { key: 'pct',    label: '占比',     width: '25%', align: 'right' },
    ]
    rows = (d.status_dist ?? []).map(r => ({ ...r, pct: (r.count / total * 100).toFixed(1) + '%' }))
      .sort((a, b) => b.count - a.count)
  }

  else if (type === 'reply_rate') {
    title = '回复/解决率 — 状态分布'
    const total = d.item_total || 1
    cols = [
      { key: 'status', label: '处理状态', width: '50%', style: r => STATUS_COLOR[r.status] || '' },
      { key: 'count',  label: '条目数',   width: '25%', align: 'right' },
      { key: 'pct',    label: '占比',     width: '25%', align: 'right' },
    ]
    rows = (d.status_dist ?? []).map(r => ({ ...r, pct: (r.count / total * 100).toFixed(1) + '%' }))
      .sort((a, b) => b.count - a.count)
  }

  modal.value = { open: true, title, cols, rows, page: 1, pageSize: 15, wide, loading: false, total: rows.length }
}

function closeModal() {
  modal.value.open = false
}

// ESC 关闭弹窗
function onKeydown(e) { if (e.key === 'Escape') closeModal() }

const DOMAIN_COLORS = {
  'WisCode/智效代码': '#4f8cff',
  'OpenClaw/龙虾':    '#ff5c72',
  '智脑API/模型':     '#7c5cff',
  'Seaf平台':         '#2fd18b',
  '推推产品':         '#ffb020',
  '云盘/极库云':      '#36cfc9',
  '容器/智汇云':      '#9254de',
  '其他':             '#64748b',
}
const PRIORITY_COLORS = { P0: '#ff5c72', P1: '#ffb020', P2: '#4f8cff', P3: '#93a1b5' }

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
  try { data.value = await fetchApi(`/feedback/?days=${days.value}`) }
  catch (e) { console.error(e) }
  finally { loading.value = false; drawCharts() }
}

function drawCharts() {
  nextTick(() => {
    if (!data.value) return
    const d = data.value

    // 1. 每日趋势：总量柱 + Badcase 折线
    const tr = d.trend ?? []
    charts.trend = initChart(trendRef.value, {
      backgroundColor: 'transparent',
      tooltip: { ...tip(), trigger: 'axis' },
      legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
      grid: { left: 40, right: 40, top: 32, bottom: 48 },
      xAxis: makeXAxis(tr.map(r => shortDate(r.date)), 35),
      yAxis: [makeYAxis(), { type: 'value', splitLine: { show: false }, axisLabel: { color: T.txt, fontSize: 11 } }],
      series: [
        { name: '反馈总量', type: 'bar', data: tr.map(r => r.count), itemStyle: { color: T.brand, borderRadius: [3,3,0,0] } },
        { name: '问题/故障', type: 'line', yAxisIndex: 1, data: tr.map(r => r.badcase),
          smooth: true, lineStyle: { color: T.bad, width: 2 }, itemStyle: { color: T.bad }, symbol: 'circle', symbolSize: 5 },
      ],
    })

    // 2. 优先级环形
    const prio = d.priority_dist ?? []
    charts.priority = initChart(priorityRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: T.txt, fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
        data: prio.map(r => ({ name: r.priority, value: r.count, itemStyle: { color: PRIORITY_COLORS[r.priority] || T.txt } })),
        label: { color: T.txt, fontSize: 12, formatter: '{b}\n{c}条' },
      }],
    })

    // 3. 问题/故障 vs 需求/建议/咨询 环形
    const cat = d.category_dist ?? []
    const CAT_LABEL = { badcase: '问题/故障', goodcase: '需求/建议/咨询', unknown: '未分类' }
    const CAT_COLOR = { badcase: T.bad, goodcase: T.good, unknown: '#64748b' }
    charts.category = initChart(categoryRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: T.txt, fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
        data: cat.map(r => ({ name: CAT_LABEL[r.category] || r.category, value: r.count, itemStyle: { color: CAT_COLOR[r.category] || T.brand } })),
        label: { color: T.txt, fontSize: 12, formatter: '{b}\n{c}条' },
      }],
    })

    // 4. 领域横向条形
    const domains = [...(d.domain_dist ?? [])].sort((a, b) => a.count - b.count)
    charts.domain = initChart(domainRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
      xAxis: makeYAxis(),
      yAxis: makeYCat(domains.map(r => r.domain)),
      series: [{
        type: 'bar', data: domains.map(r => ({ value: r.count, itemStyle: { color: DOMAIN_COLORS[r.domain] || T.brand } })),
        barMaxWidth: 16, label: { show: true, position: 'right', color: T.txt, fontSize: 11 },
      }],
    })

    // 5. AI 属性环形
    const aiTag = d.ai_tag_dist ?? []
    const AI_COLOR = { 'AI核心产品': T.brand, 'AI辅助功能': T.good, '非AI产品': '#64748b' }
    charts.aiTag = initChart(aiTagRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0, textStyle: { color: T.txt, fontSize: 11 } },
      series: [{
        type: 'pie', radius: ['38%', '65%'], center: ['50%', '44%'],
        data: aiTag.map(r => ({ name: r.ai_tag, value: r.count, itemStyle: { color: AI_COLOR[r.ai_tag] || T.brand2 } })),
        label: { color: T.txt, fontSize: 12, formatter: '{b}\n{c}条' },
      }],
    })

    // 6. 各群条形
    const groups = [...(d.top_groups ?? [])].sort((a, b) => a.count - b.count)
    charts.groupBar = initChart(groupBarRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
      xAxis: makeYAxis(),
      yAxis: makeYCat(groups.map(r => r.group.length > 16 ? r.group.slice(0,16)+'…' : r.group)),
      series: [{ type: 'bar', data: groups.map(r => r.count), barMaxWidth: 14,
        itemStyle: { color: T.good, borderRadius: [0,4,4,0] },
        label: { show: true, position: 'right', color: T.txt, fontSize: 11 } }],
    })

    // 7. 每日领域堆叠
    const dp = d.daily_product ?? []
    const domainKeys = Object.keys(DOMAIN_COLORS)
    charts.dailyDomain = initChart(dailyDomainRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
      grid: { left: 40, right: 8, top: 32, bottom: 48 },
      xAxis: makeXAxis(dp.map(r => shortDate(r.date)), 35),
      yAxis: makeYAxis(),
      series: domainKeys.map(dk => ({
        name: dk, type: 'bar', stack: 'domain',
        data: dp.map(r => r[dk] || 0),
        itemStyle: { color: DOMAIN_COLORS[dk] },
      })),
    })

    // 8. 工作日分布
    const wd = d.weekday_dist ?? []
    charts.weekday = initChart(weekdayRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
      grid: { left: 40, right: 16, top: 16, bottom: 32 },
      xAxis: { type: 'category', data: wd.map(r => r.day), axisLine: { lineStyle: { color: T.line } }, axisLabel: { color: T.txt } },
      yAxis: makeYAxis(),
      series: [{
        type: 'bar', data: wd.map((r, i) => ({
          value: r.count,
          itemStyle: { color: i < 5 ? T.brand : '#64748b', borderRadius: [4,4,0,0] }
        })),
        label: { show: true, position: 'top', color: T.txt, fontSize: 11 },
      }],
    })

    // 9. 活跃反馈人
    const reporters = [...(d.top_reporters ?? [])].sort((a, b) => a.count - b.count)
    charts.reporter = initChart(reporterRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
      xAxis: makeYAxis(), yAxis: makeYCat(reporters.map(r => r.reporter)),
      series: [{ type: 'bar', data: reporters.map(r => r.count), barMaxWidth: 14,
        itemStyle: { color: T.brand2, borderRadius: [0,4,4,0] },
        label: { show: true, position: 'right', color: T.txt, fontSize: 11 } }],
    })

    // 10. 高频关键词
    const kws = [...(d.top_keywords ?? [])].sort((a, b) => a.count - b.count)
    charts.keyword = initChart(keywordRef.value, {
      backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 8, right: 60, top: 8, bottom: 8, containLabel: true },
      xAxis: makeYAxis(), yAxis: makeYCat(kws.map(r => r.kw)),
      series: [{ type: 'bar', data: kws.map(r => r.count), barMaxWidth: 14,
        itemStyle: { color: T.warn, borderRadius: [0,4,4,0] },
        label: { show: true, position: 'right', color: T.txt, fontSize: 11 } }],
    })

    // 11. 覆盖群趋势
    const gt = d.groups_trend ?? []
    if (gt.length && groupsTrendRef.value) {
      charts.groupsTrend = initChart(groupsTrendRef.value, {
        backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
        legend: { right: 0, top: 0, textStyle: { color: T.txt, fontSize: 11 } },
        grid: { left: 40, right: 8, top: 32, bottom: 40 },
        xAxis: makeXAxis(gt.map(r => shortDate(r.date)), 30),
        yAxis: makeYAxis(),
        series: [
          { name: '有消息群', type: 'bar', data: gt.map(r => r.groups_active), itemStyle: { color: T.good, borderRadius: [4,4,0,0] } },
          { name: '覆盖群总数', type: 'line', data: gt.map(r => r.groups_total), lineStyle: { color: T.warn }, itemStyle: { color: T.warn }, symbol: 'circle', symbolSize: 5 },
        ],
      })
    }
  })
  drawFocusCharts()
}

function onResize() {
  Object.values(charts).forEach(c => { try { c?.resize() } catch(e){} })
  Object.values(focusChartRefs).forEach(el => { try { echarts.getInstanceByDom(el)?.resize() } catch(e){} })
}
onMounted(() => { load(); window.addEventListener('resize', onResize); window.addEventListener('keydown', onKeydown) })
onUnmounted(() => { window.removeEventListener('resize', onResize); window.removeEventListener('keydown', onKeydown) })
watch(() => props.timeRange, load)
watch(activeTab, val => { if (val === 'data') drawCharts() })
</script>

<style scoped>
/* ── KPI 卡片提示标签 ── */
.kpi-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.kpi-card.clickable:hover .kpi-hint {
  opacity: 1;
}

/* ── 弹窗专用表格（固定列宽，表头内容严格对齐） ── */
.modal-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}
.modal-table thead tr {
  border-bottom: 2px solid var(--border);
}
.modal-table th {
  padding: 8px 10px;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  background: var(--surface-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.modal-table th.mc-right,
.modal-table td.mc-right {
  text-align: right;
}
.modal-table th.mc-rank,
.modal-table td.mc-rank {
  text-align: center;
  color: var(--muted);
  font-size: 12px;
  width: 40px;
}
.modal-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}
.modal-table tbody tr:hover {
  background: var(--surface-soft);
}
.modal-table td {
  padding: 8px 10px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modal-table td:first-child { /* 标题列允许折行 */
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
}
.mc-empty {
  text-align: center;
  padding: 24px;
  color: var(--muted);
  font-size: 14px;
}
.modal-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--text);
  font-size: 15px;
}

/* ── 四产品专项卡片 ── */
.focus-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.focus-hd {
  display: flex;
  align-items: center;
  gap: 8px;
}
.focus-icon {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: var(--blue-soft);
  color: var(--blue);
}
.focus-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  flex: 1;
}
.focus-total {
  font-size: 16px;
  color: var(--text);
}
.focus-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.focus-kpi {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 6px;
  text-align: center;
}
.fk-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}
.fk-label {
  font-size: 14px;
  color: var(--text);
  margin-top: 3px;
}
.focus-chart {
  width: 100%;
  height: 100px;
}
.focus-issues {
  border-top: 1px solid var(--border);
  padding-top: 10px;
}
.fi-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.fi-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 0;
  border-bottom: 1px solid var(--border);
  font-size: 15px;
  color: var(--text);
}
.fi-row:last-child { border-bottom: none; }
.fi-rank {
  width: 20px;
  text-align: center;
  color: var(--text);
  flex-shrink: 0;
  font-size: 15px;
}
.fi-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fi-count {
  color: var(--text);
  font-size: 14px;
  flex-shrink: 0;
}
.fi-empty {
  font-size: 15px;
  color: var(--text);
  padding: 4px 0;
}
</style>
