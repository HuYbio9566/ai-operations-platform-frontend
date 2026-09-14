<template>
  <div class="op-view">
    <div class="toolbar card">
      <select v-model="moduleFilter" class="op-select" @change="searchLogs">
        <option value="">全部板块</option>
        <option value="report">报告</option>
        <option value="video">视频</option>
      </select>
      <select v-model="actionFilter" class="op-select" @change="searchLogs">
        <option value="">全部行为</option>
        <option value="upload">上传</option>
        <option value="replace">替换</option>
        <option value="download">下载</option>
        <option value="view">查看</option>
        <option value="edit">编辑</option>
        <option value="delete">删除</option>
      </select>
      <input v-model="keyword" class="op-input" placeholder="搜索标题、操作人" />
      <button class="ghost-btn" @click="clearSearch">清空</button>
      <select v-model.number="pageSize" class="op-select" @change="changePageSize">
        <option :value="15">15/页</option>
        <option :value="30">30/页</option>
        <option :value="50">50/页</option>
      </select>
      <button class="primary-btn" :disabled="loading" @click="loadLogs">{{ loading ? '刷新中…' : '刷新' }}</button>
    </div>

    <section class="card">
      <div class="section-hd compact">
        <div class="section-title">操作记录</div>
        <span class="hint">共 {{ total }} 条</span>
      </div>
      <table class="data-table op-table">
        <thead>
          <tr>
            <th>操作人</th>
            <th>对象</th>
            <th>时间</th>
            <th>板块</th>
            <th>行为</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id" class="op-row" @dblclick="openDetail(log)">
            <td class="operator-cell">
              <b>{{ log.operator || log.operatorUsername || '-' }}</b>
              <span v-if="log.operatorUsername && log.operatorUsername !== log.operator">{{ log.operatorUsername }}</span>
            </td>
            <td class="target-cell">
              <b>{{ log.targetTitle || '-' }}</b>
            </td>
            <td class="time-cell">{{ log.createdAt }}</td>
            <td><span class="module-tag" :class="log.module">{{ log.moduleLabel }}</span></td>
            <td><span class="action-tag" :class="log.action">{{ log.actionLabel }}</span></td>
          </tr>
          <tr v-if="!loading && !logs.length"><td colspan="5"><div class="empty-state">暂无操作记录</div></td></tr>
        </tbody>
      </table>
      <div class="pager-bar">
        <div class="hint">第 {{ page }} / {{ totalPages }} 页，当前 {{ logs.length }} 条</div>
        <div class="pager-actions">
          <button class="ghost-btn mini" :disabled="page <= 1" @click="goPage(1)">首页</button>
          <button class="ghost-btn mini" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
          <button class="ghost-btn mini" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
          <button class="ghost-btn mini" :disabled="page >= totalPages" @click="goPage(totalPages)">末页</button>
        </div>
      </div>
    </section>

    <div v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
      <div class="modal-box modal-box-wide">
        <div class="modal-hd">
          <div class="modal-title">操作详情</div>
          <button class="modal-close" @click="closeDetail">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div><b>对象</b><span>{{ detailLog?.targetTitle || '-' }}</span></div>
            <div><b>操作人</b><span>{{ detailLog?.operator || detailLog?.operatorUsername || '-' }}</span></div>
            <div><b>时间</b><span>{{ detailLog?.createdAt || '-' }}</span></div>
            <div><b>板块</b><span>{{ detailLog?.moduleLabel || '-' }}</span></div>
            <div><b>行为</b><span>{{ detailLog?.actionLabel || '-' }}</span></div>
          </div>
          <div class="detail-box">
            <div class="detail-title">详细信息</div>
            <table v-if="compareRows.length" class="compare-table">
              <thead>
                <tr>
                  <th>字段</th>
                  <th>原来</th>
                  <th>现在</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in compareRows" :key="row.label">
                  <td>{{ row.label }}</td>
                  <td>{{ row.oldValue }}</td>
                  <td>{{ row.newValue }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="detailRows.length" class="detail-list">
              <div v-for="row in detailRows" :key="row.label" class="detail-item">
                <b>{{ row.label }}</b>
                <span>{{ row.value }}</span>
              </div>
            </div>
            <div v-if="!compareRows.length && !detailRows.length" class="empty-detail">暂无详细信息</div>
          </div>
        </div>
        <div class="modal-ft">
          <span>双击表格行可查看详情</span>
          <span class="hint">{{ detailLog?.id ? `记录 ID：${detailLog.id}` : '' }}</span>
        </div>
      </div>
    </div>

    <div v-if="error" class="err floating">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const logs = ref([])
const keyword = ref('')
const moduleFilter = ref('')
const actionFilter = ref('')
const loading = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const totalPages = ref(1)
const detailVisible = ref(false)
const detailLog = ref(null)
let searchTimer = null

const detailRows = computed(() => detailItems(detailLog.value?.detail || {}))
const compareRows = computed(() => compareItems(detailLog.value?.detail || {}))

function authHeaders(extra = {}) {
  const token = localStorage.getItem('zt_access_token')
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function parseJson(resp) {
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data.code !== 0) throw new Error(data.error || `请求失败（HTTP ${resp.status}）`)
  return data.data
}

async function loadLogs() {
  loading.value = true
  error.value = ''
  try {
    const qs = new URLSearchParams({
      q: keyword.value.trim(),
      module: moduleFilter.value,
      action: actionFilter.value,
      page: page.value,
      pageSize: pageSize.value,
    }).toString()
    const data = await parseJson(await fetch(`/api/admin/operation-logs/?${qs}`, { headers: authHeaders() }))
    logs.value = data.logs || []
    total.value = data.total || 0
    page.value = data.page || page.value
    pageSize.value = data.pageSize || pageSize.value
    totalPages.value = data.totalPages || 1
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function searchLogs() {
  page.value = 1
  loadLogs()
}

function clearSearch() {
  keyword.value = ''
  moduleFilter.value = ''
  actionFilter.value = ''
  page.value = 1
  loadLogs()
}

function goPage(nextPage) {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  loadLogs()
}

function changePageSize() {
  page.value = 1
  loadLogs()
}

function debounceSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(searchLogs, 350)
}

function openDetail(log) {
  detailLog.value = log
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
  detailLog.value = null
}

function detailItems(detail) {
  const labelMap = {
    source: '来源',
    week: '周次',
    topicId: '专题',
    reportPath: '报告路径',
    board: '运营板块',
    materialType: '材料类型',
    fileName: '文件名',
    size: '大小',
    tags: '标签',
    oldTitle: '原标题',
    oldTags: '原标签',
    oldDescription: '原简介',
    newTags: '新标签',
    fileReplaced: '是否替换文件',
    coverReplaced: '是否替换封面',
  }
  const valueMap = {
    backfill_existing_data: '历史数据导入',
    true: '是',
    false: '否',
  }
  const entries = Object.entries(detail || {})
    .filter(([key, value]) => !key.startsWith('old') && !key.startsWith('new') && key !== 'source' && value !== '' && value !== null && value !== undefined)
  return entries.map(([key, value]) => {
    const displayValue = valueMap[String(value)] || value
    return { label: labelMap[key] || key, value: displayValue }
  })
}

function compareItems(detail) {
  const fields = [
    ['Title', '标题'],
    ['Week', '周次'],
    ['TopicId', '专题'],
    ['Summary', '摘要'],
    ['Board', '运营板块'],
    ['ReportPath', '报告路径'],
    ['MaterialType', '材料类型'],
    ['Tags', '标签'],
    ['Description', '简介'],
    ['FileName', '文件名'],
    ['Size', '大小'],
  ]
  return fields
    .map(([key, label]) => {
      return {
        label,
        oldValue: formatCompareValue(detail[`old${key}`]),
        newValue: formatCompareValue(detail[`new${key}`]),
      }
    })
    .filter(row => row.oldValue !== '-' || row.newValue !== '-')
}

function formatCompareValue(value) {
  if (value === '' || value === null || value === undefined) return '-'
  return String(value)
}

watch(keyword, debounceSearch)
onMounted(loadLogs)
</script>

<style scoped>
.op-view { padding-bottom: 24px; }
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.op-input { height: 36px; flex: 1; border: 1px solid var(--border); background: var(--surface-soft); color: var(--text); border-radius: 9px; padding: 0 12px; font: inherit; font-size: 14px; }
.op-select { height: 36px; border: 1px solid var(--border); background: var(--surface-soft); color: var(--text); border-radius: 9px; padding: 0 10px; font: inherit; font-size: 14px; }
.primary-btn, .ghost-btn { height: 34px; border-radius: 8px; padding: 0 14px; cursor: pointer; font: inherit; font-size: 14px; white-space: nowrap; }
.primary-btn { border: 0; background: var(--blue); color: #fff; font-weight: 700; }
.primary-btn:disabled { opacity: .5; cursor: not-allowed; }
.ghost-btn { border: 1px solid var(--border); background: var(--surface-soft); color: var(--text); }
.mini { height: 28px; padding: 0 10px; font-size: 13px; }
.hint { color: var(--muted); font-size: 14px; }
.compact { margin-bottom: 10px; padding-top: 0; border-top: 0; }
.op-table { table-layout: fixed; }
.op-table th:nth-child(2) { width: 42%; }
.op-row { cursor: pointer; }
.op-row:hover { background: var(--surface-soft); }
.time-cell { width: 150px; white-space: nowrap; }
.target-cell b, .operator-cell b { display: block; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.target-cell span, .operator-cell span { display: block; margin-top: 3px; color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.module-tag, .action-tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 9px; border: 1px solid var(--border); background: var(--surface-soft); color: var(--muted); font-size: 13px; font-weight: 700; white-space: nowrap; }
.module-tag.report { color: var(--blue); border-color: rgba(31,95,232,.3); background: var(--blue-soft); }
.module-tag.video { color: var(--green); border-color: rgba(14,143,88,.28); background: rgba(14,143,88,.08); }
.action-tag.delete { color: var(--bad); border-color: rgba(201,48,48,.28); background: rgba(201,48,48,.08); }
.action-tag.upload, .action-tag.replace { color: var(--green); border-color: rgba(14,143,88,.28); background: rgba(14,143,88,.08); }
.pager-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.pager-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.err { border-radius: 10px; padding: 10px 12px; font-size: 14px; background: rgba(201,48,48,.08); color: var(--bad); border: 1px solid rgba(201,48,48,.22); }
.floating { position: fixed; right: 24px; bottom: 24px; z-index: 1200; max-width: 520px; box-shadow: var(--shadow); }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.detail-grid div { border: 1px solid var(--border); background: var(--surface-soft); border-radius: 12px; padding: 12px; }
.detail-grid b, .detail-item b { display: block; color: var(--muted); font-size: 13px; margin-bottom: 6px; }
.detail-grid span, .detail-item span { color: var(--text); font-size: 15px; word-break: break-all; }
.detail-box { margin-top: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-soft); overflow: hidden; }
.detail-title { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 13px; font-weight: 800; }
.detail-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px; }
.detail-item { border: 1px solid var(--border); background: var(--surface); border-radius: 10px; padding: 10px; }
.empty-detail { padding: 16px; color: var(--muted); font-size: 14px; }
.compare-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px; }
.compare-table th { text-align: left; color: var(--muted); background: var(--surface); border-bottom: 1px solid var(--border); padding: 9px 12px; }
.compare-table td { color: var(--text); border-bottom: 1px solid var(--border); padding: 10px 12px; vertical-align: top; word-break: break-all; }
.compare-table tr:last-child td { border-bottom: 0; }
.compare-table + .detail-list { border-top: 1px solid var(--border); }
@media (max-width: 1100px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .op-table { table-layout: auto; }
  .detail-grid, .detail-list { grid-template-columns: 1fr; }
}
</style>
