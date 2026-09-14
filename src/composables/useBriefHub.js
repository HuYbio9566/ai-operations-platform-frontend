import { ref, computed } from 'vue'

const BASE = '/api/brief'

// ── 专题（从后端获取）──────────────────────────────────────
export const topics = ref([])
export const topicsLoading = ref(false)

export async function loadTopics() {
  topicsLoading.value = true
  try {
    const r = await fetch(`${BASE}/topics/`)
    const j = await r.json()
    if (j.code === 0) topics.value = j.data
  } catch (e) {
    console.warn('加载专题失败', e)
  } finally {
    topicsLoading.value = false
  }
}

// 兼容旧组件：TOPICS 同步别名
export const TOPICS = topics

// ── 材料（从后端获取）──────────────────────────────────────
export const materials = ref([])
export const materialsLoading = ref(false)

function authHeaders(extra = {}) {
  const token = localStorage.getItem('zt_access_token')
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

export async function recordOperation({ module, action, targetId, targetTitle, detail }) {
  try {
    await fetch('/api/operations/record/', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ module, action, targetId, targetTitle, detail: detail || {} }),
    })
  } catch (e) {
    console.warn('记录操作失败', e)
  }
}

export async function loadMaterials(params = {}) {
  materialsLoading.value = true
  try {
    const qs = new URLSearchParams(params).toString()
    const r = await fetch(`${BASE}/materials/${qs ? '?' + qs : ''}`)
    const j = await r.json()
    if (j.code === 0) materials.value = j.data
  } catch (e) {
    console.warn('加载材料失败', e)
  } finally {
    materialsLoading.value = false
  }
}

// ── 上传 HTML ──────────────────────────────────────────────
export async function uploadHtml({ file, week, topicId, title, summary, materialType, updateCadence, versionLabel, isReplace, oldMaterial }) {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('week', week)
  fd.append('topic_id', topicId)
  if (title)         fd.append('title', title)
  if (summary)       fd.append('summary', summary)
  if (materialType)  fd.append('material_type', materialType)
  if (updateCadence) fd.append('update_cadence', updateCadence)
  if (versionLabel)  fd.append('version_label', versionLabel)
  if (isReplace) {
    fd.append('is_replace', '1')
    if (oldMaterial) {
      fd.append('old_title', oldMaterial.title || '')
      fd.append('replace_material_id', oldMaterial.id || '')
      fd.append('old_week', oldMaterial.week || '')
      fd.append('old_topic_id', oldMaterial.topicId || '')
      fd.append('old_summary', oldMaterial.summary || '')
      fd.append('old_report_path', oldMaterial.reportPath || '')
      fd.append('old_material_type', oldMaterial.materialType || '')
    }
  }

  const r = await fetch(`${BASE}/upload/`, { method: 'POST', headers: authHeaders(), body: fd })
  return r.json()
}

// ── 获取最近3周次 ──────────────────────────────────────────
export const recentWeeks = ref([])
export async function loadRecentWeeks() {
  try {
    const r = await fetch(`${BASE}/weeks/`)
    const j = await r.json()
    if (j.code === 0) recentWeeks.value = j.data
  } catch (e) {
    console.warn('加载周次失败', e)
    // fallback：本地计算
    recentWeeks.value = _localRecentWeeks(3)
  }
}

function _localRecentWeeks(n) {
  const result = []
  const d = new Date()
  for (let i = 0; i < n; i++) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i * 7)
    const year = dd.getFullYear()
    const start = new Date(year, 0, 1)
    const week = Math.ceil(((dd - start) / 86400000 + start.getDay() + 1) / 7)
    result.push(`${year}-W${String(week).padStart(2, '0')}`)
  }
  return [...new Set(result)]
}

// ── 专题 CRUD API ──────────────────────────────────────────
export async function createTopic({ name, parent }) {
  const r = await fetch(`${BASE}/topics/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent }),
  })
  return r.json()
}

export async function updateTopic(topicId, { name, parent, sort_order }) {
  const r = await fetch(`${BASE}/topics/${topicId}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent, sort_order }),
  })
  return r.json()
}

export async function deleteTopic(topicId) {
  const r = await fetch(`${BASE}/topics/${topicId}/`, { method: 'DELETE' })
  return r.json()
}

// ── 工具函数 ──────────────────────────────────────────────
export const uploadDateOf   = (item) => item.uploadDate || (item.date || '').replaceAll('-', '')
export const topicName      = (id)   => topics.value.find(t => t.id === id)?.name   || '未分类'
export const topicParent    = (id)   => topics.value.find(t => t.id === id)?.parent || '未分类'
export const materialTypeOf = (item) => item.materialType || '定期更新'
export const isAssignment   = (item) => materialTypeOf(item) === '交办任务'

export function latestUploadDate(topicId) {
  const dates = materials.value
    .filter(m => m.topicId === topicId)
    .map(uploadDateOf).sort().reverse()
  return dates[0] || '-'
}

export function sortDesc(a, b) {
  if (Number(isAssignment(b)) !== Number(isAssignment(a)))
    return Number(isAssignment(b)) - Number(isAssignment(a))
  return uploadDateOf(b).localeCompare(uploadDateOf(a))
}

export const allWeeks = computed(() =>
  [...new Set(materials.value.map(m => m.week))].sort().reverse()
)
export const currentWeek = computed(() => allWeeks.value[0] || '')

// ── 预览 / 下载（全局共享弹窗状态）────────────────────────
export const previewItem   = ref(null)
export const previewSrcdoc = ref('')

export async function openPreview(item) {
  previewItem.value = item
  previewSrcdoc.value = '<p style="padding:2rem;font-family:sans-serif;color:#888">加载中…</p>'
  recordOperation({
    module: 'report',
    action: 'view',
    targetId: item.id,
    targetTitle: item.title,
    detail: { reportPath: item.reportPath, week: item.week, topicId: item.topicId },
  })
  try {
    const res = await fetch(item.reportPath)
    previewSrcdoc.value = res.ok
      ? await res.text()
      : `<p style="padding:2rem;font-family:sans-serif;color:#888">无法加载（${res.status}）：${item.reportPath}</p>`
  } catch {
    previewSrcdoc.value = `<p style="padding:2rem;font-family:sans-serif;color:#888">加载失败：${item.reportPath}</p>`
  }
}

export function closePreview() {
  previewItem.value = null
  previewSrcdoc.value = ''
}

export async function downloadSingle(item) {
  try {
    recordOperation({
      module: 'report',
      action: 'download',
      targetId: item.id,
      targetTitle: item.title,
      detail: { reportPath: item.reportPath, week: item.week, topicId: item.topicId },
    })
    const res = await fetch(item.reportPath)
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = decodeURIComponent(item.reportPath.split('/').pop() || `${item.title}.html`)
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('下载失败，请确认报告文件路径可访问。')
  }
}
