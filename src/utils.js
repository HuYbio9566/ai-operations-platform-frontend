// 公共工具函数
import { getDemoData } from './demo-data.js'

export const DEMO_MODE = __DEMO_MODE__

// 从 CSS 变量动态读取当前主题色，供 ECharts 使用
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() }

export const T = new Proxy({}, {
  get(_, key) {
    const map = {
      bg:     'transparent',
      // 新 CSS 变量名映射（兼容旧 --line/--txt-dim 回退）
      line:   () => css('--border')      || css('--line')    || '#e6eaf2',
      txt:    () => css('--muted')       || css('--txt-dim') || '#6b7a90',
      brand:  () => css('--blue')        || css('--brand')   || '#2f6bff',
      brand2: () => css('--blue')        || css('--brand-2') || '#2f6bff',
      good:   () => css('--green')       || css('--good')    || '#16a06a',
      warn:   () => css('--blue')        || css('--warn')    || '#2f6bff',  // 橘黄统一改蓝
      bad:    () => css('--bad')         || '#e5484d',
    }
    const v = map[key]
    return typeof v === 'function' ? v() : v
  }
})

export function fmtNum(v) {
  if (v == null) return '--'
  const n = Number(v)
  return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString()
}
export function fmtPct(v) { if (v == null) return '--'; return Number(v).toFixed(1) + '%' }
export function fmtMs(v) { if (v == null) return '--'; return Number(v).toFixed(0) + ' ms' }
export function shortDate(d) { if (!d) return ''; return String(d).replace(/^\d{4}-/, '') }

export function getDays(timeRange) {
  return timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 14
}

// ECharts 公共轴/提示配置
export function tip() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
  return {
    backgroundColor: isDark ? '#1a2235' : '#ffffff',
    borderColor: T.line,
    textStyle: { color: isDark ? '#c8d4e3' : '#1f2937', fontSize: 12 }
  }
}
export function makeXAxis(data, rotate) {
  return { type: 'category', data, axisLine: { lineStyle: { color: T.line } }, axisLabel: { color: T.txt, fontSize: 11, rotate: rotate || 0 } }
}
export function makeYAxis() {
  return { type: 'value', splitLine: { lineStyle: { color: T.line } }, axisLabel: { color: T.txt, fontSize: 11 } }
}
export function makeYCat(data) {
  return { type: 'category', data, axisLabel: { color: T.txt, fontSize: 11 }, axisLine: { lineStyle: { color: T.line } } }
}
export function baseGrid(opts = {}) {
  return { left: 40, right: 16, top: 16, bottom: 48, ...opts }
}
export function hBarGrid() {
  return { left: 8, right: 60, top: 16, bottom: 8, containLabel: true }
}

export async function fetchApi(path) {
  if (DEMO_MODE) return getDemoData(path)
  const r = await fetch('/api' + path)
  const j = await r.json()
  return j.data ?? j
}

export async function triggerSync(source = 'all') {
  if (DEMO_MODE) {
    alert('公开演示模式不执行数据同步')
    return
  }
  try {
    const r = await fetch('/api/sync/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source }),
    })
    const j = await r.json()
    alert(j.message || '已启动同步')
  } catch {
    alert('同步请求失败')
  }
}
