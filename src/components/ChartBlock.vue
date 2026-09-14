<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: { type: String, required: true },
  data: { type: String, required: true },
})

const COLORS = ['#1f5fe8', '#0e8f58', '#d97706', '#c93030', '#7c3aed', '#db2777', '#0891b2', '#4f46e5']

const svg = computed(() => {
  try {
    const d = JSON.parse(props.data)
    if (props.type === 'bar') {
      if (d.data && !d.series) return renderBarChart(d.title || '', d.xAxis || [], d.data || [])
      if (d.series && Array.isArray(d.series)) return renderGroupedBarChart(d.title || '', d.xAxis || [], d.series || [])
      return ''
    }
    if (props.type === 'pie') return renderPieChart(d.title || '', d.data || [])
    if (props.type === 'line') {
      if (d.data && !d.series) return renderLineChart(d.title || '', d.xAxis || [], d.data || [])
      if (d.series && Array.isArray(d.series)) return renderMultiLineChart(d.title || '', d.xAxis || [], d.series || [])
      return ''
    }
    return ''
  } catch {
    return ''
  }
})

function renderBarChart(title, xAxis, data) {
  const max = Math.max(...data, 1)
  const barWidth = 50, barGap = 25, baseY = 140, barMaxHeight = 80
  const width = Math.max(300, xAxis.length * (barWidth + barGap) + 40)
  const bars = xAxis.map((label, i) => {
    const val = data[i] || 0
    const barHeight = (val / max) * barMaxHeight
    const x = 30 + i * (barWidth + barGap)
    const barY = baseY - barHeight
    return `<g><text x="${x + barWidth / 2}" y="${barY - 8}" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2937">${val}</text><rect x="${x}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="#1f5fe8" rx="3" /><text x="${x + barWidth / 2}" y="${baseY + 12}" text-anchor="middle" font-size="13" font-weight="600" fill="#374151">${label}</text></g>`
  }).join('')
  return `<svg width="${width}" height="180" viewBox="0 0 ${width} 180"><text x="0" y="15" font-size="14" font-weight="600" fill="#1f2937">${title}</text>${bars}</svg>`
}

function renderPieChart(title, data) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  let currentAngle = -90
  const cx = 100, cy = 80, r = 60
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360
    const startAngle = currentAngle, endAngle = currentAngle + angle
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)
    const largeArc = angle > 180 ? 1 : 0
    const midAngle = startAngle + angle / 2
    const midX = cx + (r - 20) * Math.cos((midAngle * Math.PI) / 180)
    const midY = cy + (r - 20) * Math.sin((midAngle * Math.PI) / 180)
    currentAngle += angle
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}" fill="${COLORS[i % COLORS.length]}" /><text x="${midX}" y="${midY}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${d.name}</text>`
  }).join('')
  const legend = data.map((d, i) => `<circle cx="210" cy="${20 + i * 18}" r="5" fill="${COLORS[i % COLORS.length]}" /><text x="220" y="${24 + i * 18}" font-size="10" fill="#374151">${d.name}: ${d.value}</text>`).join('')
  return `<svg width="300" height="${120 + data.length * 18}" viewBox="0 0 300 ${120 + data.length * 18}"><text x="0" y="15" font-size="14" font-weight="600" fill="#1f2937">${title}</text>${slices}${legend}</svg>`
}

function renderLineChart(title, xAxis, data) {
  const max = Math.max(...data, 1)
  const width = Math.max(200, xAxis.length * 50)
  const height = 180
  const points = xAxis.map((_, i) => `${i * 50},${height - ((data[i] ?? 0) / max) * (height - 50)}`).join(' ')
  const dataPoints = xAxis.map((_, i) => {
    const x = i * 50, y = height - ((data[i] ?? 0) / max) * (height - 50), value = data[i] ?? 0
    return `<circle cx="${x}" cy="${y}" r="4" fill="#1f5fe8" /><text x="${x}" y="${y - 8}" text-anchor="middle" font-size="10" font-weight="600" fill="#1f2937">${value}</text>`
  }).join('')
  const xLabels = xAxis.map((label, i) => `<text x="${i * 50}" y="${height - 15}" text-anchor="middle" font-size="11" fill="#6b7280">${label}</text>`).join('')
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="0" y="15" font-size="14" font-weight="600" fill="#1f2937">${title}</text><polyline fill="none" stroke="#1f5fe8" stroke-width="2.5" points="${points}" />${dataPoints}${xLabels}</svg>`
}

function renderGroupedBarChart(title, xAxis, series) {
  const barWidth = 28, groupGap = 30, barGap = 4
  const seriesCount = series.length
  const groupWidth = seriesCount * barWidth + (seriesCount - 1) * barGap
  const baseY = 150, barMaxHeight = 70
  const width = Math.max(400, xAxis.length * (groupWidth + groupGap) + 150)
  const allData = series.flatMap(s => s.data)
  const max = Math.max(...allData, 1)
  const groups = xAxis.map((groupLabel, groupIndex) => {
    const groupX = 30 + groupIndex * (groupWidth + groupGap)
    const bars = series.map((s, seriesIndex) => {
      const val = s.data[groupIndex] || 0
      const barHeight = (val / max) * barMaxHeight
      const barX = groupX + seriesIndex * (barWidth + barGap)
      const barY = baseY - barHeight
      const color = COLORS[seriesIndex % COLORS.length]
      return `<g><text x="${barX + barWidth / 2}" y="${barY - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="#1f2937">${val}</text><rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2" /></g>`
    }).join('')
    const nameLabel = `<text x="${groupX + groupWidth / 2}" y="${baseY + 12}" text-anchor="middle" font-size="13" font-weight="600" fill="#374151">${groupLabel}</text>`
    return bars + nameLabel
  }).join('')
  const legend = series.map((s, i) => {
    const color = COLORS[i % COLORS.length]
    return `<rect x="${width - 120}" y="${25 + i * 20}" width="12" height="12" fill="${color}" rx="2"/><text x="${width - 100}" y="${35 + i * 20}" font-size="11" font-weight="500" fill="#374151">${s.name}</text>`
  }).join('')
  return `<svg width="${width}" height="190" viewBox="0 0 ${width} 190"><text x="0" y="15" font-size="14" font-weight="600" fill="#1f2937">${title}</text>${groups}${legend}</svg>`
}

function renderMultiLineChart(title, xAxis, series) {
  const width = Math.max(300, xAxis.length * 50)
  const height = 180
  const allData = series.flatMap(s => s.data)
  const max = Math.max(...allData, 1)
  const lines = series.map((s, seriesIndex) => {
    const color = COLORS[seriesIndex % COLORS.length]
    const points = xAxis.map((_, i) => `${i * 50},${height - ((s.data[i] ?? 0) / max) * (height - 50)}`).join(' ')
    const dataPoints = xAxis.map((_, i) => {
      const x = i * 50, y = height - ((s.data[i] ?? 0) / max) * (height - 50), value = s.data[i] ?? 0
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.5" /><text x="${x}" y="${y - 6}" text-anchor="middle" font-size="9" font-weight="600" fill="${color}">${value}</text>`
    }).join('')
    return `<polyline fill="none" stroke="${color}" stroke-width="2" points="${points}" />${dataPoints}`
  }).join('')
  const xLabels = xAxis.map((label, i) => `<text x="${i * 50}" y="${height - 15}" text-anchor="middle" font-size="11" fill="#6b7280">${label}</text>`).join('')
  const legend = series.map((s, i) => {
    const color = COLORS[i % COLORS.length]
    return `<line x1="${width - 130}" y1="${25 + i * 18}" x2="${width - 115}" y2="${25 + i * 18}" stroke="${color}" stroke-width="3"/><text x="${width - 110}" y="${29 + i * 18}" font-size="11" fill="#374151">${s.name}</text>`
  }).join('')
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="0" y="15" font-size="14" font-weight="600" fill="#1f2937">${title}</text>${lines}${xLabels}${legend}</svg>`
}
</script>

<template>
  <div class="chart-block">
    <div v-html="svg" class="chart-container"></div>
  </div>
</template>

<style scoped>
.chart-block {
  margin: 10px 0;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  padding: 8px;
  overflow-x: auto;
}
.chart-container :deep(svg) { max-width: 100%; height: auto; display: block; }
</style>
