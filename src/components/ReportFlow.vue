<!--
  ReportFlow.vue
  独立报告栏组件：flow 时间轴展示 + 上传 + 替换（覆盖同名 topic 下同标题报告）
  Props:
    topicIds  – string[]  精确匹配 material.topicId
    keywords  – string[]  标题模糊匹配（topicId 未命中时追加）
    defaultTopicId – string  上传时默认选中的专题
-->
<template>
  <div class="rf-root">

    <!-- ── 头部工具栏 ── -->
    <div class="rf-bar">
      <span class="rf-bar-title">报告</span>
      <span class="rf-count">{{ totalCount }} 份</span>
      <div style="flex:1"></div>
      <button v-if="authStore.isAdmin" class="rf-upload-btn" @click="openUpload">+ 上传</button>
    </div>

    <!-- ── 空态 ── -->
    <div v-if="!totalCount && !loading" class="rf-empty">
      暂无相关报告{{ authStore.isAdmin ? '，点击右上角上传' : '' }}
    </div>

    <!-- ── 加载中 ── -->
    <div v-else-if="loading" class="rf-loading">
      <span class="spinner"></span> 加载中…
    </div>

    <!-- ── Flow 时间轴 ── -->
    <div v-else class="rf-timeline">
      <div v-for="(group, gi) in filteredGroups" :key="group.week" class="rf-week-col">

        <!-- 周次节点 -->
        <div class="rf-node-row">
          <div class="rf-dot"></div>
          <div class="rf-week-label">{{ group.week }}</div>
          <div class="rf-week-date">{{ groupDateRange(group) }}</div>
        </div>

        <!-- 纵向连接线（非最后一组） -->
        <div v-if="gi < filteredGroups.length - 1" class="rf-vline"></div>

        <!-- 该周的报告列表，每条独占一行 -->
        <div class="rf-cards">
          <div
            v-for="mat in group.items"
            :key="mat.id"
            class="rf-card"
          >
            <!-- 左侧：徽章 + 标题 + 摘要 -->
            <div class="rf-card-left">
              <div class="rf-card-meta">
                <span
                  class="rf-badge"
                  :class="mat.materialType === '交办任务' ? 'badge-task' : 'badge-regular'"
                >{{ mat.materialType || '定期更新' }}</span>
                <template v-if="mat.replacedBy">
                  <span class="rf-op-tag rf-op-replace">替换</span>
                  <span class="rf-op-info">{{ mat.replacedBy }} · {{ mat.replacedAt }}</span>
                </template>
                <template v-else-if="mat.createdAt">
                  <span class="rf-op-tag rf-op-upload">上传</span>
                  <span class="rf-op-info">{{ mat.uploadedBy ? mat.uploadedBy + ' · ' : '' }}{{ mat.createdAt }}</span>
                </template>
                <template v-else>
                  <span class="rf-card-date">{{ formatDate(mat.uploadDate || mat.date) }}</span>
                </template>
              </div>
              <div class="rf-card-title" :title="mat.title">{{ mat.title }}</div>
              <div v-if="mat.summary" class="rf-card-summary">{{ mat.summary }}</div>
            </div>
            <!-- 右侧：操作按钮 -->
            <div class="rf-card-actions">
              <button class="rf-btn" @click="doPreview(mat)">查看</button>
              <button class="rf-btn" @click="doDownload(mat)">下载</button>
              <button v-if="canReplace(mat)" class="rf-btn rf-btn-replace" @click="openReplace(mat)">替换</button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ══ 上传弹窗 ══ -->
    <Teleport to="body">
      <div v-if="showUpload" class="rf-backdrop" @click.self="closeUpload">
        <div class="rf-modal-form">
          <div class="rf-mf-head">
            <span>上传报告</span>
            <button class="rf-close-btn" @click="closeUpload">✕</button>
          </div>
          <div class="rf-mf-body">

            <!-- 周次 -->
            <div class="rf-form-row">
              <label>周次 <span class="req">*</span></label>
              <div class="rf-radio-group">
                <label v-for="w in recentWeeks" :key="w" class="rf-radio-item">
                  <input type="radio" v-model="form.week" :value="w" />
                  <span>{{ w }}</span>
                </label>
                <label class="rf-radio-item">
                  <input type="radio" v-model="form.week" value="__custom__" />
                  <span>手动输入</span>
                </label>
              </div>
              <input
                v-if="form.week === '__custom__'"
                v-model="form.weekCustom"
                class="rf-input"
                placeholder="如 2026-W28"
                style="margin-top:6px"
              />
            </div>

            <!-- 专题（只读） -->
            <div class="rf-form-row">
              <label>专题</label>
              <div class="rf-input rf-input-readonly">{{ currentTopicName }}</div>
            </div>

            <!-- 材料类型 -->
            <div class="rf-form-row">
              <label>类型</label>
              <select v-model="form.materialType" class="rf-select">
                <option value="定期更新">定期更新</option>
                <option value="交办任务">交办任务</option>
              </select>
            </div>

            <!-- 标题 -->
            <div class="rf-form-row">
              <label>标题（选填，默认取文件名）</label>
              <input v-model="form.title" class="rf-input" placeholder="报告标题" />
            </div>

            <!-- 摘要 -->
            <div class="rf-form-row">
              <label>摘要（选填）</label>
              <textarea v-model="form.summary" class="rf-input" rows="3" placeholder="简要说明内容…" />
            </div>

            <!-- 文件 -->
            <div class="rf-form-row">
              <label>HTML 文件 <span class="req">*</span></label>
              <div
                class="rf-file-drop"
                @click="$refs.fileInput.click()"
                @dragover.prevent
                @drop.prevent="onDrop"
              >
                <span v-if="!form.file" class="rf-drop-hint">点击或拖拽 .html 文件到此处</span>
                <span v-else class="rf-drop-chosen">{{ form.file.name }}</span>
              </div>
              <input ref="fileInput" type="file" accept=".html" style="display:none" @change="onFileChange" />
            </div>

            <div v-if="formError" class="rf-error">{{ formError }}</div>
          </div>
          <div class="rf-mf-foot">
            <button class="rf-btn-cancel" @click="closeUpload">取消</button>
            <button class="rf-btn-submit" :disabled="uploading" @click="doUpload">
              {{ uploading ? '上传中…' : '确认上传' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ 预览弹窗 ══ -->
    <Teleport to="body">
      <div v-if="previewItem" class="rf-backdrop" @click.self="closePreview">
        <div class="rf-modal-preview">
          <div class="rf-mp-head">
            <span class="rf-mp-title">{{ previewItem.title }}</span>
            <button class="rf-close-btn" @click="closePreview">✕</button>
          </div>
          <iframe
            class="rf-mp-frame"
            :src="previewUrl"
          ></iframe>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { recordOperation } from '../composables/useBriefHub.js'
import { useAuthStore } from '../stores/auth.js'

const props = defineProps({
  topicIds:       { type: Array,  default: () => [] },
  keywords:       { type: Array,  default: () => [] },
  defaultTopicId: { type: String, default: '' },
})

const BASE = '/api/brief'
const authStore = useAuthStore()
authStore.initAuth()

function authHeaders() {
  const token = localStorage.getItem('zt_access_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

function canReplace(mat) {
  if (!authStore.isAdmin) return false
  if (authStore.isSuperAdmin) return true
  const uploader = (mat.uploadedBy || '').trim()
  return !!uploader && [authStore.displayName, authStore.username]
    .map(v => (v || '').trim())
    .filter(Boolean)
    .includes(uploader)
}

// ── 数据 ─────────────────────────────────────────────────────
const materials  = ref([])
const allTopics  = ref([])
const recentWeeks = ref([])
const loading    = ref(false)

const currentTopicName = computed(() => {
  const t = allTopics.value.find(t => t.id === props.defaultTopicId)
  if (!t) return props.defaultTopicId || '—'
  return t.parent ? `${t.parent} / ${t.name}` : t.name
})

async function loadAll() {
  loading.value = true
  try {
    const [mr, tr, wr] = await Promise.all([
      fetch(`${BASE}/materials/`).then(r => r.json()),
      fetch(`${BASE}/topics/`).then(r => r.json()),
      fetch(`${BASE}/weeks/`).then(r => r.json()),
    ])
    if (mr.code === 0) materials.value  = mr.data
    if (tr.code === 0) allTopics.value  = tr.data
    if (wr.code === 0) recentWeeks.value = wr.data
  } catch (e) {
    console.warn('ReportFlow loadAll:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

// ── 过滤 & 分组 ───────────────────────────────────────────────
const filtered = computed(() => {
  return materials.value.filter(m => {
    if (props.topicIds.length && props.topicIds.includes(m.topicId)) return true
    if (props.keywords.length) {
      const t = (m.title || '').toLowerCase()
      return props.keywords.some(kw => t.includes(kw.toLowerCase()))
    }
    return false
  })
})

const filteredGroups = computed(() => {
  const sorted = [...filtered.value].sort((a, b) => {
    const da = (a.uploadDate || a.date || '').replace(/-/g, '')
    const db = (b.uploadDate || b.date || '').replace(/-/g, '')
    return db.localeCompare(da)
  })
  const groups = []
  const map = {}
  for (const m of sorted) {
    const w = m.week || '未知'
    if (!map[w]) { map[w] = { week: w, items: [] }; groups.push(map[w]) }
    map[w].items.push(m)
  }
  return groups
})

const totalCount = computed(() => filtered.value.length)

// ── 格式化 ───────────────────────────────────────────────────
function formatDate(raw) {
  if (!raw) return ''
  const s = String(raw).replace(/-/g, '')
  if (s.length === 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`
  return raw
}

// 将 ISO 周字符串（如 "2026-W27"）解析为该周周一和周日的日期
function isoWeekToRange(weekStr) {
  // 格式：YYYY-Www
  const m = weekStr.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return ''
  const year = parseInt(m[1])
  const week = parseInt(m[2])
  // ISO 8601：找到该年第一个周四所在周的周一
  const jan4 = new Date(year, 0, 4)          // 1月4日一定在第1周
  const dayOfWeek = (jan4.getDay() + 6) % 7  // 0=周一
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dayOfWeek + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`
  return `${fmt(monday)} – ${fmt(sunday)}`
}

// 取该周组最早和最晚日期，返回 "MM/DD" 或 "MM/DD – MM/DD"
function groupDateRange(group) {
  return isoWeekToRange(group.week)
}

// ── 预览 ─────────────────────────────────────────────────────
const previewItem = ref(null)
const previewUrl  = ref('')

function doPreview(mat) {
  previewItem.value = mat
  previewUrl.value  = mat.reportPath
  recordOperation({
    module: 'report',
    action: 'view',
    targetId: mat.id,
    targetTitle: mat.title,
    detail: { reportPath: mat.reportPath, week: mat.week, topicId: mat.topicId },
  })
}
function closePreview() { previewItem.value = null; previewUrl.value = '' }

// ── 下载 ─────────────────────────────────────────────────────
async function doDownload(mat) {
  try {
    recordOperation({
      module: 'report',
      action: 'download',
      targetId: mat.id,
      targetTitle: mat.title,
      detail: { reportPath: mat.reportPath, week: mat.week, topicId: mat.topicId },
    })
    const res = await fetch(mat.reportPath)
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = decodeURIComponent(mat.reportPath.split('/').pop() || `${mat.title}.html`)
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('下载失败，请确认报告文件可访问。')
  }
}

// ── 上传 / 替换 ───────────────────────────────────────────────
const showUpload    = ref(false)
const uploading     = ref(false)
const formError     = ref('')
const replaceTarget = ref(null)

const form = ref({
  week:         '',
  weekCustom:   '',
  materialType: '定期更新',
  title:        '',
  summary:      '',
  file:         null,
})

function openUpload() {
  if (!authStore.isAdmin) return
  replaceTarget.value = null
  form.value = {
    week: recentWeeks.value[0] || '',
    weekCustom: '',
    materialType: '定期更新',
    title: '', summary: '', file: null,
  }
  formError.value  = ''
  showUpload.value = true
}

function openReplace(mat) {
  if (!canReplace(mat)) return
  replaceTarget.value = mat
  form.value = {
    week: mat.week || (recentWeeks.value[0] || ''),
    weekCustom: '',
    materialType: mat.materialType || '定期更新',
    title: mat.title || '',
    summary: mat.summary || '',
    file: null,
  }
  formError.value  = ''
  showUpload.value = true
}

function closeUpload() {
  showUpload.value    = false
  replaceTarget.value = null
  formError.value     = ''
  form.value = { week: recentWeeks.value[0] || '', weekCustom: '', materialType: '定期更新', title: '', summary: '', file: null }
}

function onFileChange(e) {
  const f = e.target.files[0]; if (f) form.value.file = f
}
function onDrop(e) {
  const f = e.dataTransfer.files[0]; if (f) form.value.file = f
}

async function doUpload() {
  formError.value = ''
  const week = form.value.week === '__custom__' ? form.value.weekCustom.trim() : form.value.week
  if (!week)            { formError.value = '请选择或输入周次'; return }
  if (!form.value.file) { formError.value = '请选择 HTML 文件'; return }

  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file',          form.value.file)
    fd.append('week',          week)
    fd.append('topic_id',      props.defaultTopicId)
    fd.append('material_type', form.value.materialType)
    if (form.value.title)   fd.append('title',   form.value.title)
    if (form.value.summary) fd.append('summary', form.value.summary)
    if (replaceTarget.value) {
      fd.append('is_replace', '1')
      fd.append('replace_material_id', replaceTarget.value.id || '')
      fd.append('old_title', replaceTarget.value.title || '')
      fd.append('old_week', replaceTarget.value.week || '')
      fd.append('old_topic_id', replaceTarget.value.topicId || '')
      fd.append('old_summary', replaceTarget.value.summary || '')
      fd.append('old_report_path', replaceTarget.value.reportPath || '')
      fd.append('old_material_type', replaceTarget.value.materialType || '')
    }

    const res = await fetch(`${BASE}/upload/`, { method: 'POST', headers: authHeaders(), body: fd })
    const j   = await res.json()
    if (j.code === 0) {
      closeUpload()
      await loadAll()
    } else {
      formError.value = j.error || '上传失败'
    }
  } catch (e) {
    formError.value = '请求失败：' + e.message
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
/* ── 根容器 ── */
.rf-root {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px 20px 20px;
  box-shadow: var(--shadow-soft);
}

/* ── 头部工具栏 ── */
.rf-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}
.rf-bar-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--text);
}
.rf-count {
  font-size: 15px;
  color: var(--text);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 2px 8px;
}
.rf-upload-btn {
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: var(--blue);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background .12s;
}
.rf-upload-btn:hover { background: #1a55e8; }

/* ── 空态 / 加载 ── */
.rf-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  color: var(--text);
  font-size: 17px;
  border: 2px dashed var(--border);
  border-radius: 12px;
}
.rf-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 80px;
  justify-content: center;
  color: var(--text);
  font-size: 14px;
}

/* ── Flow 时间轴（纵向布局） ── */
.rf-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.rf-week-col {
  display: flex;
  flex-direction: column;
}

/* 节点行 */
.rf-node-row {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
}
.rf-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--blue);
  box-shadow: 0 0 0 3px rgba(31,95,232,.18);
  flex-shrink: 0;
  z-index: 1;
}
.rf-week-label {
  font-size: 16px;
  font-weight: 700;
  color: var(--blue);
  letter-spacing: .02em;
}
.rf-week-date {
  font-size: 14px;
  color: var(--text);
  font-weight: 400;
}

/* 纵向连接线 */
.rf-vline {
  width: 2px;
  min-height: 16px;
  background: var(--border-strong);
  margin-left: 5px;   /* 对齐 dot 中心 */
  flex-shrink: 0;
}

/* 卡片区：纵向堆叠，每报告一行 */
.rf-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 12px 22px;
}

/* 单行报告：左信息 + 右按钮，水平撑满 */
.rf-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 14px;
  transition: border-color .14s, box-shadow .14s;
}
.rf-card:hover {
  border-color: var(--blue);
  box-shadow: 0 2px 10px rgba(31,95,232,.08);
}

/* 左侧信息区 */
.rf-card-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rf-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rf-badge {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.badge-regular {
  background: rgba(31,95,232,.1);
  color: var(--blue);
  border: 1px solid rgba(31,95,232,.2);
}
.badge-task {
  background: rgba(201,48,48,.08);
  color: var(--bad);
  border: 1px solid rgba(201,48,48,.15);
}
.rf-card-date {
  font-size: 14px;
  color: var(--text);
}

.rf-card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-card-summary {
  font-size: 15px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rf-op-info {
  font-size: 13px;
  color: var(--muted);
}
.rf-op-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.rf-op-upload {
  background: rgba(31,95,232,0.08);
  color: var(--blue);
  border: 1px solid rgba(31,95,232,0.2);
}
.rf-op-replace {
  background: rgba(14,143,88,0.08);
  color: var(--green);
  border: 1px solid rgba(14,143,88,0.2);
}

/* 右侧操作按钮 */
.rf-card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.rf-btn {
  font-size: 15px;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
  white-space: nowrap;
}
.rf-btn:hover { background: var(--blue); border-color: var(--blue); color: #fff; }
.rf-btn-replace:hover { background: var(--muted); border-color: var(--text); color: #fff; }

/* ══ 弹窗通用 ══ */
.rf-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(5,8,15,.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rf-close-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}
.rf-close-btn:hover { background: var(--bad); border-color: var(--bad); color: #fff; }

/* ── 上传弹窗 ── */
.rf-modal-form {
  width: min(540px, 95vw);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,.3);
}
.rf-mf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.rf-mf-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  overflow-y: auto;
  max-height: 60vh;
}
.rf-mf-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}

.rf-form-row { display: flex; flex-direction: column; gap: 6px; }
.rf-form-row label { font-size: 16px; font-weight: 600; color: var(--text); }
.req { color: var(--bad); }

.rf-radio-group { display: flex; gap: 12px; flex-wrap: wrap; }
.rf-radio-item {
  display: inline-flex; align-items: center; gap: 5px;
  cursor: pointer; font-size: 16px; color: var(--text);
}
.rf-radio-item input { accent-color: var(--blue); }

.rf-select, .rf-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
}
.rf-input-readonly {
  background: var(--surface-soft);
  color: var(--text);
  cursor: default;
  user-select: none;
}
.rf-select:focus, .rf-input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px var(--blue-soft);
}

.rf-file-drop {
  width: 100%;
  min-height: 72px;
  border: 2px dashed var(--border-strong);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: border-color .14s;
}
.rf-file-drop:hover { border-color: var(--blue); }
.rf-drop-hint { font-size: 16px; color: var(--text); }
.rf-drop-chosen { font-size: 16px; font-weight: 600; color: var(--text); }

.rf-replace-hint {
  font-size: 12px;
  color: var(--blue);
  background: var(--blue-soft);
  border: 1px solid rgba(31,95,232,.2);
  border-radius: 8px;
  padding: 8px 12px;
}

.rf-error {
  font-size: 16px;
  color: var(--bad);
  background: rgba(201,48,48,.07);
  border: 1px solid rgba(201,48,48,.15);
  border-radius: 8px;
  padding: 8px 12px;
}

.rf-btn-cancel {
  height: 36px; padding: 0 16px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
}
.rf-btn-cancel:hover { border-color: var(--blue); color: var(--blue); }

.rf-btn-submit {
  height: 36px; padding: 0 20px;
  border: 0;
  border-radius: 8px;
  background: var(--blue);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background .12s;
}
.rf-btn-submit:hover { background: #1a55e8; }
.rf-btn-submit:disabled { opacity: .5; cursor: not-allowed; }

/* ── 预览弹窗 ── */
.rf-modal-preview {
  width: 90vw;
  height: 88vh;
  background: var(--surface);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,.35);
}
.rf-mp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 18px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  background: var(--surface-soft);
}
.rf-mp-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: calc(100% - 44px);
}
.rf-mp-frame {
  flex: 1;
  border: none;
  background: #fff;
}
</style>
