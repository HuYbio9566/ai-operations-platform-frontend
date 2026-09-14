<template>
  <div class="org-view">
    <div class="toolbar card">
      <select v-model="roleFilter" class="page-size">
        <option value="">全部角色</option>
        <option value="user">普通用户</option>
        <option value="admin">管理员</option>
        <option value="accessible">可访问</option>
      </select>
      <input v-model="keyword" class="org-input" placeholder="搜索姓名、账号、邮箱、部门（支持中英文）" />
      <button class="ghost-btn" @click="clearSearch">清空</button>
      <select v-model.number="pageSize" class="page-size" @change="changePageSize">
        <option :value="15">15/页</option>
        <option :value="30">30/页</option>
        <option :value="50">50/页</option>
      </select>
      <span class="hint">共 {{ total }} 人</span>
      <button class="primary-btn" :disabled="syncing" @click="syncOrg">{{ syncing ? '同步中…' : '同步组织架构' }}</button>
    </div>

    <section class="card">
      <div class="section-hd compact">
        <div class="section-title">成员列表</div>
        <div class="batch-actions">
          <span class="hint">已选 {{ selectedUsers.length }} 人</span>
          <button class="ghost-btn" @click="toggleSelectAll">{{ allVisibleSelected ? '取消全选' : '全选当前列表' }}</button>
          <select v-model="batchRole" class="page-size">
            <option value="admin">管理员</option>
            <option value="accessible">可访问</option>
          </select>
          <button class="primary-btn" :disabled="!selectedUsers.length || saving" @click="grantSelected">批量授予{{ roleLabel(batchRole) }}</button>
        </div>
      </div>
      <table class="data-table member-table">
        <thead>
          <tr>
            <th class="check-cell"><input type="checkbox" :checked="allVisibleSelected" @change="toggleSelectAll" /></th>
            <th>姓名</th>
            <th>账号</th>
            <th>邮箱</th>
            <th>部门</th>
            <th>部门路径</th>
            <th>权限</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="emp in employees" :key="emp.username" :class="{ selected: selectedSet.has(emp.username) }" @dblclick="openDetail(emp)">
            <td class="check-cell"><input type="checkbox" :checked="selectedSet.has(emp.username)" @change="toggleUser(emp.username)" /></td>
            <td>{{ emp.displayName || '-' }}</td>
            <td>{{ emp.username }}</td>
            <td>{{ emp.email || '-' }}</td>
            <td>{{ emp.dept || '-' }}</td>
            <td class="path-cell">{{ emp.deptPath || '-' }}</td>
            <td><span class="role-tag" :class="roleOf(emp)">{{ roleLabel(roleOf(emp)) }}</span></td>
          </tr>
          <tr v-if="!employees.length"><td colspan="7"><div class="empty-state">暂无成员，先同步组织架构或调整搜索词</div></td></tr>
        </tbody>
      </table>
      <div class="pager-bar">
        <div class="hint">第 {{ page }} / {{ totalPages }} 页，当前 {{ employees.length }} 人</div>
        <div class="pager-actions">
          <button class="ghost-btn mini" :disabled="page <= 1" @click="goPage(1)">首页</button>
          <button class="ghost-btn mini" :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
          <button
            v-for="(p, idx) in pageItems"
            :key="`${p}-${idx}`"
            class="ghost-btn mini page-num"
            :class="{ active: p === page }"
            :disabled="p === '...'"
            @click="p !== '...' && goPage(p)"
          >{{ p }}</button>
          <button class="ghost-btn mini" :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
          <button class="ghost-btn mini" :disabled="page >= totalPages" @click="goPage(totalPages)">末页</button>
        </div>
      </div>
    </section>

    <div v-if="detailVisible" class="modal-mask" @click.self="closeDetail">
      <div class="modal-box modal-box-wide">
        <div class="modal-hd">
          <div class="modal-title">成员详情：{{ detail?.displayName || detail?.username }}</div>
          <button class="modal-close" @click="closeDetail">×</button>
        </div>
        <div class="modal-body">
          <div class="info-grid">
            <div><b>姓名</b><span>{{ detail?.displayName || '-' }}</span></div>
            <div><b>账号</b><span>{{ detail?.username || '-' }}</span></div>
            <div><b>邮箱</b><span>{{ detail?.email || '-' }}</span></div>
            <div><b>部门</b><span>{{ detail?.dept || '-' }}</span></div>
            <div>
              <b>当前权限</b>
              <select v-model="detailRole" class="role-select" :class="detailRole" :disabled="saving" @change="setDetailRole">
                <option value="user">普通用户</option>
                <option value="accessible">可访问</option>
                <option value="admin">管理员</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </div>
            <div class="wide"><b>部门路径</b><span>{{ detail?.deptPath || '-' }}</span></div>
          </div>
          <div class="raw-box" v-if="detail?.raw">
            <div class="raw-title">接口原始信息</div>
            <pre>{{ prettyRaw }}</pre>
          </div>
        </div>
        <div class="modal-ft">
          <span>{{ detail?.username }}</span>
          <span class="hint">修改当前权限后自动生效</span>
        </div>
      </div>
    </div>

    <div v-if="message" class="msg floating">{{ message }}</div>
    <div v-if="error" class="err floating">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const BASE = '/api/org'
const keyword = ref('')
const roleFilter = ref('')
const employees = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(15)
const totalPages = ref(1)
const selected = ref([])
const syncing = ref(false)
const saving = ref(false)
const message = ref('')
const error = ref('')
const detailVisible = ref(false)
const detail = ref(null)
const grantRole = ref('admin')
const batchRole = ref('admin')
const detailRole = ref('user')
let searchTimer = null

const selectedSet = computed(() => new Set(selected.value))
const selectedUsers = computed(() => selected.value)
const allVisibleSelected = computed(() => employees.value.length > 0 && employees.value.every(e => selectedSet.value.has(e.username)))
const prettyRaw = computed(() => JSON.stringify(detail.value?.raw || {}, null, 2))
const pageItems = computed(() => {
  const total = totalPages.value
  const current = page.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const items = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) items.push('...')
  for (let p = start; p <= end; p += 1) items.push(p)
  if (end < total - 1) items.push('...')
  items.push(total)
  return items
})

function authHeaders(extra = {}) {
  const token = localStorage.getItem('zt_access_token')
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function parseJson(resp) {
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data.code !== 0) throw new Error(data.error || `请求失败（HTTP ${resp.status}）`)
  return data.data
}

async function loadEmployees() {
  error.value = ''
  try {
    const qs = new URLSearchParams({ q: keyword.value.trim(), role: roleFilter.value, page: page.value, pageSize: pageSize.value }).toString()
    const data = await parseJson(await fetch(`${BASE}/employees/?${qs}`, { headers: authHeaders() }))
    employees.value = data.employees || []
    total.value = data.total || employees.value.length
    page.value = data.page || page.value
    pageSize.value = data.pageSize || pageSize.value
    totalPages.value = data.totalPages || 1
    selected.value = selected.value.filter(u => employees.value.some(e => e.username === u))
  } catch (e) {
    error.value = e.message
  }
}

function roleLabel(role) {
  return ({ user: '普通用户', accessible: '可访问', admin: '管理员', super_admin: '超级管理员' }[role] || '普通用户')
}

function roleOf(emp) {
  if (!emp) return 'user'
  if (emp.role === 'super_admin') return 'super_admin'
  if (emp.role === 'admin') return 'admin'
  if (emp.hasAccess) return 'accessible'
  return 'user'
}

function searchEmployees() {
  page.value = 1
  loadEmployees()
}

function clearSearch() {
  keyword.value = ''
  roleFilter.value = ''
  page.value = 1
  loadEmployees()
}

function goPage(nextPage) {
  page.value = Math.min(Math.max(1, nextPage), totalPages.value)
  loadEmployees()
}

function changePageSize() {
  page.value = 1
  loadEmployees()
}

function changeRoleFilter() {
  page.value = 1
  loadEmployees()
}

function debounceSearchEmployees() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(searchEmployees, 350)
}

watch(keyword, debounceSearchEmployees)
watch(roleFilter, changeRoleFilter)

function toggleUser(username) {
  if (selectedSet.value.has(username)) selected.value = selected.value.filter(u => u !== username)
  else selected.value = [...selected.value, username]
}

function toggleSelectAll() {
  if (allVisibleSelected.value) {
    const visible = new Set(employees.value.map(e => e.username))
    selected.value = selected.value.filter(u => !visible.has(u))
  } else {
    selected.value = Array.from(new Set([...selected.value, ...employees.value.map(e => e.username)]))
  }
}

async function grantUsers(usernames, role = 'admin') {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    await parseJson(await fetch(`${BASE}/permissions/`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ targetType: 'user', targetValues: usernames, role }),
    }))
    message.value = `已授予 ${usernames.length} 人${roleLabel(role)}权限。`
    selected.value = []
    await loadEmployees()
    if (detail.value?.username) {
      detail.value = await parseJson(await fetch(`${BASE}/employees/${encodeURIComponent(detail.value.username)}/`, { headers: authHeaders() }))
    }
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

function grantSelected() { grantUsers(selected.value, batchRole.value) }
function grantOne(username) { grantUsers([username], grantRole.value) }

async function setDetailRole() {
  if (!detail.value?.username) return
  await grantUsers([detail.value.username], detailRole.value)
}

async function syncOrg() {
  syncing.value = true
  message.value = ''
  error.value = ''
  try {
    const data = await parseJson(await fetch(`${BASE}/sync/`, { method: 'POST', headers: authHeaders() }))
    message.value = `同步完成：共 ${data.total} 条，保存 ${data.saved} 条，部门 ${data.departments} 个，跳过 ${data.skipped} 条。`
    await loadEmployees()
  } catch (e) {
    error.value = e.message
  } finally {
    syncing.value = false
  }
}

async function openDetail(emp) {
  error.value = ''
  detailVisible.value = true
  detail.value = emp
  grantRole.value = emp.role === 'super_admin' ? 'super_admin' : 'admin'
  detailRole.value = roleOf(emp)
  try {
    detail.value = await parseJson(await fetch(`${BASE}/employees/${encodeURIComponent(emp.username)}/`, { headers: authHeaders() }))
    detailRole.value = roleOf(detail.value)
  } catch (e) {
    error.value = e.message
  }
}

function closeDetail() {
  detailVisible.value = false
  detail.value = null
}

onMounted(async () => {
  await loadEmployees()
})
</script>

<style scoped>
.org-view { padding-bottom: 24px; }
.toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.org-input { height: 36px; flex: 1; border: 1px solid var(--border); background: var(--surface-soft); color: var(--text); border-radius: 9px; padding: 0 12px; font: inherit; font-size: 14px; }
.page-size { height: 36px; border: 1px solid var(--border); background: var(--surface-soft); color: var(--text); border-radius: 9px; padding: 0 10px; font: inherit; font-size: 14px; }
.primary-btn, .ghost-btn, .danger-btn { height: 34px; border-radius: 8px; padding: 0 14px; cursor: pointer; font: inherit; font-size: 14px; white-space: nowrap; }
.primary-btn { border: 0; background: var(--blue); color: #fff; font-weight: 700; }
.primary-btn:disabled { opacity: .5; cursor: not-allowed; }
.ghost-btn { border: 1px solid var(--border); background: var(--surface-soft); color: var(--text); }
.danger-btn { border: 1px solid rgba(201,48,48,.3); background: rgba(201,48,48,.08); color: var(--bad); }
.mini { height: 28px; padding: 0 10px; font-size: 13px; }
.hint { color: var(--muted); font-size: 14px; }
.batch-actions { display: flex; align-items: center; gap: 8px; }
.compact { margin-bottom: 10px; padding-top: 0; border-top: 0; }
.member-table tbody tr.selected { background: var(--blue-soft); }
.member-table tbody tr { cursor: default; }
.member-table tbody tr:hover { background: var(--surface-soft); }
.check-cell { width: 44px; text-align: center !important; }
.path-cell { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.role-tag { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 9px; border: 1px solid var(--border); background: var(--surface-soft); color: var(--muted); font-size: 13px; font-weight: 700; white-space: nowrap; }
.role-tag.admin { color: var(--green); border-color: rgba(14,143,88,.28); background: rgba(14,143,88,.08); }
.role-tag.accessible { color: #c97b12; border-color: rgba(201,123,18,.3); background: rgba(201,123,18,.1); }
.role-tag.super_admin { color: var(--blue); border-color: rgba(31,95,232,.32); background: var(--blue-soft); }
.role-select { height: 32px; min-width: 140px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); padding: 0 10px; font: inherit; font-size: 14px; font-weight: 700; }
.role-select.admin { color: var(--green); border-color: rgba(14,143,88,.35); background: rgba(14,143,88,.08); }
.role-select.accessible { color: #c97b12; border-color: rgba(201,123,18,.35); background: rgba(201,123,18,.08); }
.role-select.super_admin { color: var(--blue); border-color: rgba(31,95,232,.35); background: var(--blue-soft); }
.pager-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
.pager-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.page-num.active { background: var(--blue); border-color: var(--blue); color: #fff; }
.info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.info-grid div { border: 1px solid var(--border); background: var(--surface-soft); border-radius: 12px; padding: 12px; }
.info-grid .wide { grid-column: 1 / -1; }
.info-grid b { display: block; color: var(--muted); font-size: 13px; margin-bottom: 6px; }
.info-grid span { color: var(--text); font-size: 15px; word-break: break-all; }
.raw-box { margin-top: 16px; border: 1px solid var(--border); border-radius: 12px; background: var(--surface-soft); overflow: hidden; }
.raw-title { padding: 10px 12px; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 13px; font-weight: 800; }
.raw-box pre { max-height: 320px; overflow: auto; padding: 12px; font-size: 12px; line-height: 1.6; color: var(--text); white-space: pre-wrap; word-break: break-all; }
.msg, .err { border-radius: 10px; padding: 10px 12px; font-size: 14px; }
.msg { background: rgba(14,143,88,.08); color: var(--green); border: 1px solid rgba(14,143,88,.22); }
.err { background: rgba(201,48,48,.08); color: var(--bad); border: 1px solid rgba(201,48,48,.22); }
.floating { position: fixed; right: 24px; bottom: 24px; z-index: 1200; max-width: 520px; box-shadow: var(--shadow); }
.modal-grant { display: flex; align-items: center; gap: 8px; }
@media (max-width: 1100px) {
  .toolbar, .batch-actions { flex-direction: column; align-items: stretch; }
  .path-cell { max-width: 220px; }
}
</style>
