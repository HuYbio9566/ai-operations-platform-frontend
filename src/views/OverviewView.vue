<template>
  <div>
    <!-- 运营简报 -->
    <div class="brief-card">
      <div class="brief-header">
        <span class="brief-label">AI 运营简报</span>
        <span class="brief-date">{{ todayStr }}</span>
      </div>
      <div class="brief-body" v-if="!anyLoading">
        <span class="brief-item" v-if="fbData">内网反馈 <strong>{{ fmtNum(fbData.total_count) }}</strong> 条，覆盖 <strong>{{ fbData.top_groups?.length ?? 0 }}</strong> 个群组；</span>
        <span class="brief-item" v-if="kbData">知识库 <strong>{{ fmtNum(kbData.kb_total) }}</strong> 个，AI 对话 <strong>{{ fmtNum(kbData.ai_qa_total) }}</strong> 次；</span>
        <span class="brief-item" v-if="ttData">推推日活均值 <strong>{{ ttAvgActive }}</strong> 人，团队 <strong>{{ fmtNum(ttData.team_summary?.total_teams) }}</strong> 个；</span>
        <span class="brief-item" v-if="shData">SkillHub agent/cli/mcp 活跃用户 <strong>{{ fmtNum(shData.types_summary?.total_users) }}</strong> 人。</span>
      </div>
      <div class="brief-body" v-else>数据加载中，请稍候…</div>
    </div>

    <!-- 核心 KPI -->
    <div class="kpi-row kpi-row-3" style="margin-top:16px">
      <div class="kpi-card" @click="$router.push('/feedback')" style="cursor:pointer">
        <div class="kpi-label">内网反馈总量</div>
        <div class="kpi-value brand">{{ fbData ? fmtNum(fbData.total_count) : '--' }}</div>
        <div class="kpi-sub">近 {{ days }} 天</div>
      </div>
      <div class="kpi-card" @click="$router.push('/knowledge')" style="cursor:pointer">
        <div class="kpi-label">知识库 AI 对话</div>
        <div class="kpi-value good">{{ kbData ? fmtNum(kbData.ai_qa_total) : '--' }}</div>
        <div class="kpi-sub">累计</div>
      </div>
      <div class="kpi-card" @click="$router.push('/tuitui')" style="cursor:pointer">
        <div class="kpi-label">近7日活跃团队</div>
        <div class="kpi-value good">{{ ttActive7d }}</div>
        <div class="kpi-sub">有发帖的团队（1帖以上）</div>
      </div>
    </div>

    <!-- 四模块快照 -->
    <div class="grid-2" style="margin-top:16px">
      <!-- 内网反馈 -->
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between">
          <span>内网反馈趋势</span>
          <router-link to="/feedback" style="font-size:12px;color:var(--blue);text-decoration:none">查看详情 →</router-link>
        </div>
        <div v-if="fbLoading" class="chart-area" style="display:flex;align-items:center;justify-content:center;color:var(--text)">加载中…</div>
        <div v-else ref="fbChartRef" class="chart-area"></div>
      </div>

      <!-- 知识库 -->
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between">
          <span>知识库 AI 对话月度趋势</span>
          <router-link to="/knowledge" style="font-size:12px;color:var(--blue);text-decoration:none">查看详情 →</router-link>
        </div>
        <div v-if="kbLoading" class="chart-area" style="display:flex;align-items:center;justify-content:center;color:var(--text)">加载中…</div>
        <div v-else ref="kbChartRef" class="chart-area"></div>
      </div>

      <!-- 推推 -->
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between">
          <span>推推日活跃趋势</span>
          <router-link to="/tuitui" style="font-size:12px;color:var(--blue);text-decoration:none">查看详情 →</router-link>
        </div>
        <div v-if="ttLoading" class="chart-area" style="display:flex;align-items:center;justify-content:center;color:var(--text)">加载中…</div>
        <div v-else ref="ttChartRef" class="chart-area"></div>
      </div>

      <!-- SkillHub -->
      <div class="card">
        <div class="card-title" style="display:flex;justify-content:space-between">
          <span>SkillHub 四类型调用量</span>
          <router-link to="/skillhub" style="font-size:12px;color:var(--blue);text-decoration:none">查看详情 →</router-link>
        </div>
        <div v-if="shLoading" class="chart-area" style="display:flex;align-items:center;justify-content:center;color:var(--text)">加载中…</div>
        <div v-else ref="shChartRef" class="chart-area"></div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { fmtNum, fmtPct, getDays, fetchApi, triggerSync, T, makeXAxis, makeYAxis, shortDate } from '../utils.js'

const props = defineProps({ timeRange: { type: String, default: '14d' } })
const days = computed(() => getDays(props.timeRange))

const todayStr = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
const shTypes = ['skill', 'agent', 'cli', 'mcp']

const fbData = ref(null); const fbLoading = ref(false)
const kbData = ref(null); const kbLoading = ref(false)
const ttData = ref(null); const ttLoading = ref(false)
const shData = ref(null); const shLoading = ref(false)

const anyLoading = computed(() => fbLoading.value || kbLoading.value || ttLoading.value || shLoading.value)
const ttAvgActive = computed(() => {
  const d = ttData.value?.daily_active ?? []
  if (!d.length) return '--'
  return Math.round(d.reduce((s, r) => s + (r.活跃用户数 || 0), 0) / d.length)
})

const ttActive7d = computed(() => {
  const wd = ttData.value?.week_post_dist ?? {}
  return Object.entries(wd).filter(([k]) => k !== '0帖').reduce((s, [, v]) => s + v, 0) || '--'
})

const fbChartRef = ref(null); const kbChartRef = ref(null)
const ttChartRef = ref(null); const shChartRef = ref(null)

function tip() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return { backgroundColor: isDark ? '#1a2235' : '#ffffff', borderColor: T.line, textStyle: { color: isDark ? '#c8d4e3' : '#1f2937', fontSize: 12 } }
}

function initChart(el, opt) {
  if (!el) return
  let c = echarts.getInstanceByDom(el)
  if (!c) c = echarts.init(el, null, { renderer: 'canvas' })
  c.setOption(opt, true)
}

function drawCharts() {
  nextTick(() => {
    if (fbData.value) {
      const bd = fbData.value.by_date ?? []
      initChart(fbChartRef.value, {
        backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
        grid: { left: 40, right: 16, top: 16, bottom: 48 },
        xAxis: makeXAxis(bd.map(d => shortDate(d.date)), 35),
        yAxis: makeYAxis(),
        series: [{ type: 'bar', data: bd.map(d => d.count), itemStyle: { color: T.brand, borderRadius: [4,4,0,0] } }]
      })
    }
    if (kbData.value) {
      const trend = kbData.value.ai_monthly ?? []
      initChart(kbChartRef.value, {
        backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
        grid: { left: 40, right: 16, top: 16, bottom: 48 },
        xAxis: makeXAxis(trend.map(r => shortDate(r.月份)), 30),
        yAxis: makeYAxis(),
        series: [{ type: 'bar', data: trend.map(r => r.AI问答数 || 0), itemStyle: { color: T.good, borderRadius: [4,4,0,0] } }]
      })
    }
    if (ttData.value) {
      const daily = ttData.value.daily_active ?? []
      if (daily.length <= 1) {
        // 数据不足时降级提示，不画图
        const el = ttChartRef.value
        if (el) {
          let c = echarts.getInstanceByDom(el)
          if (!c) c = echarts.init(el, null, { renderer: 'canvas' })
          c.setOption({
            backgroundColor: 'transparent',
            graphic: [{
              type: 'text',
              left: 'center', top: 'middle',
              style: { text: daily.length === 0 ? '暂无数据' : `仅有 ${daily[0]?.日期} 一条记录\n同步数据可查看更多趋势`, fill: T.txt, font: '14px sans-serif', textAlign: 'center' }
            }],
            xAxis: { show: false }, yAxis: { show: false }, series: []
          }, true)
        }
      } else {
        initChart(ttChartRef.value, {
          backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
          grid: { left: 40, right: 16, top: 16, bottom: 48 },
          xAxis: makeXAxis(daily.map(r => shortDate(r.日期)), 35),
          yAxis: makeYAxis(),
          series: [{ type: 'line', smooth: true, data: daily.map(r => r.活跃用户数),
            areaStyle: { color: { type:'linear',x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:T.brand+'40'},{offset:1,color:T.brand+'05'}] } },
            lineStyle:{color:T.brand}, itemStyle:{color:T.brand}, symbol:'circle', symbolSize: 4 }]
        })
      }
    }
    if (shData.value) {
      const ts = shData.value.types_summary?.types ?? {}
      initChart(shChartRef.value, {
        backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer:{type:'shadow'} },
        grid: { left: 40, right: 16, top: 16, bottom: 32 },
        xAxis: { type:'category', data: shTypes, axisLine:{lineStyle:{color:T.line}}, axisLabel:{color:T.txt} },
        yAxis: makeYAxis(),
        series: [
          { name:'调用数', type:'bar', data: shTypes.map(t => ts[t]?.total ?? 0), itemStyle:{color:T.brand}, barMaxWidth:40 },
          { name:'活跃用户', type:'bar', data: shTypes.map(t => ts[t]?.users ?? 0), itemStyle:{color:T.good}, barMaxWidth:40 },
        ]
      })
    }
  })
}

async function loadAll() {
  await Promise.all([
    (async () => { fbLoading.value=true; try{ fbData.value=await fetchApi(`/feedback/?days=${days.value}`) }finally{ fbLoading.value=false; drawCharts() } })(),
    (async () => { kbLoading.value=true; try{ kbData.value=await fetchApi(`/knowledge/?days=${days.value}`) }finally{ kbLoading.value=false; drawCharts() } })(),
    (async () => { ttLoading.value=true; try{ ttData.value=await fetchApi(`/tuitui/?days=30`) }finally{ ttLoading.value=false; drawCharts() } })(),
    (async () => { shLoading.value=true; try{ shData.value=await fetchApi(`/skillhub/all/?days=${days.value}`) }finally{ shLoading.value=false; drawCharts() } })(),
  ])
}

onMounted(loadAll)
watch(() => props.timeRange, loadAll)
</script>

<style scoped>
.brief-card { margin-top: 16px; padding: 16px 20px; background: var(--blue-soft); border: 1px solid rgba(31,95,232,0.2); border-radius: 12px; }
.brief-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.brief-label { font-size: 12px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 0.06em; }
.brief-date { font-size: 12px; color: var(--text); }
.brief-body { font-size: 14px; color: var(--text); line-height: 1.8; }
.brief-item { margin-right: 6px; }
.brief-item strong { color: var(--text); }
</style>
