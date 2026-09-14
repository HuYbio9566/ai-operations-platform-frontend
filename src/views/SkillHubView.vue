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
        :topic-ids="['skill-building-scenes']"
        :keywords="['skill', 'mcp', 'cli', 'skillhub']"
        default-topic-id="skill-building-scenes"
      />
    </div>

    <!-- ── 数据 tab ── -->
    <template v-else>
    <div v-if="loading" class="loading-overlay"><span class="spinner"></span> 加载中…</div>

    <template v-else-if="data">
      <div class="data-date-bar">实时数据（来源：SkillHub API）</div>
      <!-- 四类型总览卡 -->
      <div class="kpi-row kpi-row-3">
        <div v-for="t in shTypes" :key="t" class="sh-type-card" :class="{ active: activeType === t }" @click="activeType = t">
          <div class="kpi-label" style="text-transform:uppercase;font-weight:700;letter-spacing:0.08em">{{ t }}</div>
          <div class="kpi-value">{{ fmtNum(data.types_summary?.types?.[t]?.total) }}</div>
          <div class="kpi-sub">
            用户 {{ data.types_summary?.types?.[t]?.users ?? '-' }}
            <span :style="deltaStyle(data.types_summary?.types?.[t]?.delta_pct)">{{ fmtDelta(data.types_summary?.types?.[t]?.delta_pct) }}</span>
          </div>
          <div :ref="el => setSparkRef(t, el)" style="height:36px;margin-top:8px"></div>
        </div>
      </div>

      <!-- 当前 type KPI -->
      <div class="kpi-row kpi-row-6" style="margin-top:12px" v-if="curOv">
        <div class="kpi-card"><div class="kpi-label">调用次数</div><div class="kpi-value sm">{{ fmtNum(curOv.total_calls) }}</div></div>
        <div class="kpi-card"><div class="kpi-label">活跃 name</div><div class="kpi-value sm">{{ fmtNum(curOv.active_names) }}</div></div>
        <div class="kpi-card"><div class="kpi-label">活跃用户</div><div class="kpi-value sm">{{ fmtNum(curOv.active_users) }}</div></div>
        <div class="kpi-card"><div class="kpi-label">成功率</div><div class="kpi-value sm" :class="rateClass(curOv.success_rate)">{{ fmtPct(curOv.success_rate) }}</div></div>
        <div class="kpi-card"><div class="kpi-label">P95 耗时</div><div class="kpi-value sm">{{ fmtMs(curOv.p95_ms) }}</div></div>
        <div class="kpi-card"><div class="kpi-label">AI 占比</div><div class="kpi-value sm">{{ fmtPct(curOv.ai_rate) }}</div></div>
      </div>

      <!-- 图表行 1 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">{{ activeType }} 调用趋势</div>
          <div ref="shTrendRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">Top Name 排行</div>
          <div ref="shRankRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 图表行 2 -->
      <div class="grid-2" style="margin-top:12px">
        <div class="card">
          <div class="card-title">Top 用户排行</div>
          <div ref="shUserRef" class="chart-area"></div>
        </div>
        <div class="card">
          <div class="card-title">四类型调用量对比</div>
          <div ref="shCompareRef" class="chart-area"></div>
        </div>
      </div>

      <!-- 全类型趋势 -->
      <div class="card" style="margin-top:12px">
        <div class="card-title">全类型调用趋势</div>
        <div ref="shAllTrendRef" style="width:100%;height:200px"></div>
      </div>

    </template>

    <div v-else class="empty-state">暂无数据</div>
    </template><!-- end 数据 tab -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { fmtNum, fmtPct, fmtMs, getDays, fetchApi, triggerSync, T, makeXAxis, makeYAxis, makeYCat, shortDate } from '../utils.js'
import ReportFlow from '../components/ReportFlow.vue'

const activeTab = ref('data')

const props = defineProps({ timeRange: { type: String, default: '14d' } })
const days = computed(() => getDays(props.timeRange))

const shTypes = ['cli', 'agent', 'mcp']
const activeType = ref('cli')
const data = ref(null)
const loading = ref(false)

const shTrendRef = ref(null); const shRankRef = ref(null)
const shUserRef = ref(null); const shCompareRef = ref(null)
const shAllTrendRef = ref(null)
const sparkRefs = {}
const charts = {}

const curOv = computed(() => data.value?.[`overview_${activeType.value}`])
const curHealth = computed(() => data.value?.[`health_${activeType.value}`] ?? [])

function tip() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return { backgroundColor: isDark ? '#1a2235' : '#ffffff', borderColor: T.line, textStyle: { color: isDark ? '#c8d4e3' : '#1f2937', fontSize: 12 } }
}
function setSparkRef(t, el) { sparkRefs[t] = el }
function fmtDelta(v) { if (v==null) return ''; const s=v>0?'▲':v<0?'▼':''; return ` ${s}${Math.abs(v).toFixed(1)}%` }
function deltaStyle(v) { return `color:${v>0?T.good:v<0?T.bad:'var(--text)'};font-size:12px;` }
function rateClass(v) { return v==null?'': v>=95?'val-good':v>=80?'':' val-bad' }

function initChart(el, opt) {
  if (!el) return
  let c = echarts.getInstanceByDom(el)
  if (!c) c = echarts.init(el, null, { renderer: 'canvas' })
  c.setOption(opt, true)
  return c
}

async function load() {
  loading.value = true
  try { data.value = await fetchApi(`/skillhub/all/?days=${days.value}`) }
  catch (e) { console.error(e) }
  finally { loading.value = false; drawCharts() }
}

function drawMain() {
  if (!data.value) return
  const pts = data.value[`trend_${activeType.value}`] ?? []
  const rank = [...(data.value[`ranking_${activeType.value}`] ?? [])].sort((a,b)=>a.count-b.count)
  const users = [...(data.value[`top_users_${activeType.value}`] ?? [])].sort((a,b)=>a.count-b.count)
  const ts = data.value.types_summary?.types ?? {}
  const allPts = data.value.trend_all ?? []

  charts.trend = initChart(shTrendRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
    grid: { left: 40, right: 16, top: 16, bottom: 48 },
    xAxis: makeXAxis(pts.map(p => shortDate(p.time)), 35),
    yAxis: makeYAxis(),
    series: [{ type:'line', smooth:true, data:pts.map(p=>p.count),
      areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:T.brand+'40'},{offset:1,color:T.brand+'05'}]}},
      lineStyle:{color:T.brand}, itemStyle:{color:T.brand}, symbol:'none' }]
  })

  charts.rank = initChart(shRankRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer:{type:'shadow'} },
    grid: { left: 8, right: 60, top: 16, bottom: 8, containLabel: true },
    xAxis: makeYAxis(), yAxis: makeYCat(rank.map(x=>{const n=x.name||''; return n.length>18?n.slice(0,18)+'…':n})),
    series: [{ type:'bar', data:rank.map(x=>x.count), barMaxWidth:16,
      itemStyle:{color:T.brand,borderRadius:[0,4,4,0]},
      label:{show:true,position:'right',color:T.txt,fontSize:11} }]
  })

  charts.user = initChart(shUserRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer:{type:'shadow'} },
    grid: { left: 8, right: 60, top: 16, bottom: 8, containLabel: true },
    xAxis: makeYAxis(), yAxis: makeYCat(users.map(x=>{const u=x.user_id||''; return u.length>20?u.slice(0,20)+'…':u})),
    series: [{ type:'bar', data:users.map(x=>x.count), barMaxWidth:16,
      itemStyle:{color:T.good,borderRadius:[0,4,4,0]},
      label:{show:true,position:'right',color:T.txt,fontSize:11} }]
  })

  charts.compare = initChart(shCompareRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis', axisPointer:{type:'shadow'} },
    legend: { right:0, top:0, textStyle:{color:T.txt,fontSize:11} },
    grid: { left: 40, right: 8, top: 32, bottom: 32 },
    xAxis: { type:'category', data:shTypes, axisLine:{lineStyle:{color:T.line}}, axisLabel:{color:T.txt} },
    yAxis: makeYAxis(),
    series: [
      { name:'调用总数', type:'bar', data:shTypes.map(t=>ts[t]?.total??0), itemStyle:{color:T.brand}, barMaxWidth:40 },
      { name:'活跃用户', type:'bar', data:shTypes.map(t=>ts[t]?.users??0), itemStyle:{color:T.good}, barMaxWidth:40 },
    ]
  })

  charts.allTrend = initChart(shAllTrendRef.value, {
    backgroundColor: 'transparent', tooltip: { ...tip(), trigger: 'axis' },
    grid: { left: 40, right: 16, top: 8, bottom: 48 },
    xAxis: makeXAxis(allPts.map(p => shortDate(p.time)), 35),
    yAxis: makeYAxis(),
    series: [{ type:'bar', data:allPts.map(p=>p.count), itemStyle:{color:T.warn,borderRadius:[4,4,0,0]} }]
  })
}

function drawSparks() {
  nextTick(() => {
    shTypes.forEach(t => {
      const el = sparkRefs[t]
      if (!el) return
      const pts = data.value?.types_summary?.types?.[t]?.points ?? []
      let c = echarts.getInstanceByDom(el)
      if (!c) c = echarts.init(el, null, { renderer: 'canvas' })
      c.setOption({
        backgroundColor: 'transparent', animation: false,
        grid: { left:0, right:0, top:0, bottom:0 },
        xAxis: { type:'category', data:pts.map(p=>p.time), show:false },
        yAxis: { type:'value', show:false },
        series: [{ type:'line', data:pts.map(p=>p.count), smooth:true, symbol:'none', lineStyle:{width:1.5,color:T.brand} }]
      }, true)
    })
  })
}

function drawCharts() {
  nextTick(() => { drawMain(); drawSparks() })
}

function onResize() {
  Object.values(charts).forEach(c => c?.resize())
  Object.values(sparkRefs).forEach(el => { try { echarts.getInstanceByDom(el)?.resize() } catch(e){} })
}

onMounted(() => { load(); window.addEventListener('resize', onResize) })
onUnmounted(() => window.removeEventListener('resize', onResize))
watch(() => props.timeRange, load)
watch(activeType, () => nextTick(drawMain))
watch(activeTab, val => { if (val === 'data') drawCharts() })
</script>

<style scoped>
.sh-type-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  padding: 14px 16px; cursor: pointer; transition: all 0.15s;
  box-shadow: var(--shadow-soft);
}
.sh-type-card:hover { border-color: var(--blue); box-shadow: 0 4px 16px rgba(31,95,232,0.1); }
.sh-type-card.active { border-color: var(--blue); background: var(--blue-soft); box-shadow: 0 4px 16px rgba(31,95,232,0.12); }
</style>
