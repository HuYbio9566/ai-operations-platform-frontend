<template>
  <!-- 登录页独占全屏，不渲染主布局 -->
  <router-view v-if="route.meta.requiresAuth === false" />

  <div v-else class="workbench">
    <!-- ══ 左栏：品牌 + 导航 ══ -->
    <aside class="col col-left">
      <!-- 品牌 -->
      <div class="panel panel-pad">
        <div class="brand">
          <img :src="logoSrc" class="logo-img" alt="logo" />
          <div>
            <b>AI 运营驾驶舱</b>
            <span>中台效能 AI 办公团队</span>
            <small v-if="demoMode" class="demo-badge">公开演示 · 数据已脱敏</small>
          </div>
        </div>
      </div>

      <!-- 导航 -->
      <div class="panel panel-pad nav-panel">
        <div class="nav-section-title">运营驾驶舱</div>
        <nav class="nav-list">
          <router-link class="nav-item" to="/overview">
            <span class="dot"></span><span class="nav-label">总览看板</span>
          </router-link>
        </nav>

        <div class="nav-section-title" style="margin-top:14px">运营板块</div>
        <nav class="nav-list">
           <router-link class="nav-item" to="/feedback">
            <span class="dot"></span><span class="nav-label">内网反馈运营</span>
          </router-link>
          <router-link class="nav-item" to="/knowledge">
            <span class="dot"></span><span class="nav-label">知识库运营</span>
          </router-link>
          <router-link class="nav-item" to="/tuitui">
            <span class="dot"></span><span class="nav-label">推推运营</span>
          </router-link>
          <router-link class="nav-item" to="/skillhub">
            <span class="dot"></span><span class="nav-label">SkillHub 运营</span>
          </router-link>
        </nav>

        <div class="nav-section-title" style="margin-top:14px">视频板块</div>
        <nav class="nav-list">
          <router-link class="nav-item" to="/videos">
            <span class="dot"></span><span class="nav-label">视频案例</span>
          </router-link>
        </nav>

        <div v-if="authStore.isSuperAdmin" class="nav-section-title" style="margin-top:14px">后台管理</div>
        <nav v-if="authStore.isSuperAdmin" class="nav-list">
          <router-link v-if="authStore.isSuperAdmin" class="nav-item" to="/org">
            <span class="dot"></span><span class="nav-label">组织管理</span>
          </router-link>
          <router-link v-if="authStore.isSuperAdmin" class="nav-item" to="/operation-logs">
            <span class="dot"></span><span class="nav-label">操作记录</span>
          </router-link>
        </nav>


      </div>

      <!-- 底部：更新时间 -->
      <div class="left-foot">
        <div class="update-time">更新: {{ updateTime }}</div>
      </div>
    </aside>

    <!-- ══ 主内容区（可滚动） ══ -->
    <main class="col col-mid">
      <!-- 顶部 Hero 信息 + 时间范围筛选 -->
      <div class="mid-topbar mid-block">
        <div class="mid-topbar-left">
          <h1 class="main-title">{{ currentTitle }}</h1>
        </div>
        <div class="mid-topbar-right">
          <span class="today-str">{{ todayStr }}</span>
          <div class="seg-group">
            <button class="seg-btn" :class="{ active: timeRange === '7d' }" @click="timeRange = '7d'">近7天</button>
            <button class="seg-btn" :class="{ active: timeRange === '14d' }" @click="timeRange = '14d'">近14天</button>
            <button class="seg-btn" :class="{ active: timeRange === '30d' }" @click="timeRange = '30d'">近30天</button>
          </div>
          <button class="theme-toggle" :title="isDark ? '切换亮色' : '切换暗色'" @click="toggleTheme">
            {{ isDark ? '☀️' : '🌙' }}
          </button>
          <AiAssistant />
          <div v-if="authStore.isAuthenticated" class="user-bar">
            <span class="role-badge">{{ roleLabel }}</span>
            <span class="user-name">{{ authStore.displayName || authStore.username }}</span>
            <button class="logout-btn" @click="handleLogout" title="退出登录">退出</button>
          </div>
        </div>
      </div>

      <!-- 页面内容 -->
      <div class="page-content">
        <router-view :time-range="timeRange" :key="timeRange" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import AiAssistant from './components/AiAssistant.vue'

const timeRange = ref('14d')
const updateTime = ref('加载中…')
const todayStr = ref(new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }))
const demoMode = __DEMO_MODE__
const logoSrc = import.meta.env.BASE_URL + 'logo.png'

async function fetchSyncTime() {
  if (demoMode) {
    updateTime.value = '演示数据'
    return
  }
  try {
    const r = await fetch('/api/sync/')
    const json = await r.json()
    const logs = json?.data?.logs || []
    const latest = logs.find(l => l.status === 'ok')
    if (latest?.sync_at) {
      const d = new Date(latest.sync_at)
      updateTime.value = d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } else {
      updateTime.value = '暂无同步记录'
    }
  } catch {
    updateTime.value = '获取失败'
  }
}
fetchSyncTime()

const route = useRoute()
const router = useRouter()
const currentTitle = computed(() => route.meta?.title ?? 'AI 中台运营驾驶舱')

const authStore = useAuthStore()
authStore.initAuth()
const roleLabel = computed(() => {
  const r = authStore.role
  if (r === 'super_admin') return '超级管理员'
  if (r === 'admin') return '管理员'
  if (authStore.hasAccess) return '可访问'
  return '普通用户'
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// ── 明暗主题 ────────────────────────────────────────────────
const STORAGE_KEY = 'zt-theme'
const isDark = ref(false)

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  isDark.value = dark
}

function toggleTheme() {
  const next = !isDark.value
  applyTheme(next)
  localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
}

;(function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const dark = saved ? saved === 'dark' : false
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  isDark.value = dark
})()


</script>

<style>
/* ══════════════════════════════════════════════════
   CSS 变量（bid 风格：亮色为主）
══════════════════════════════════════════════════ */
:root,
[data-theme="light"] {
  --bg:           #f2f5fa;
  --surface:      #ffffff;
  --surface-soft: #f7f9fc;
  --border:       #e4e8f0;
  --border-strong:#cdd4e0;
  --text:         #0f1e38;
  --muted:        #5a6a82;
  --faint:        #8c9bb0;
  --blue:         #1f5fe8;
  --blue-soft:    #e8effd;
  --green:        #0e8f58;
  --bad:          #c93030;
  --shadow:       0 8px 28px rgba(20,44,90,0.09);
  --shadow-soft:  0 4px 16px rgba(20,44,90,0.06);
}

[data-theme="dark"] {
  --bg:           #0d1320;
  --surface:      #141c2a;
  --surface-soft: #1a2336;
  --border:       #263044;
  --border-strong:#344058;
  --text:         #dce6f5;
  --muted:        #8a9ab8;
  --faint:        #5c6e88;
  --blue:         #4c7ef0;
  --blue-soft:    #1a2745;
  --green:        #1fa86a;
  --bad:          #d95555;
  --shadow:       0 8px 28px rgba(0,0,0,0.5);
  --shadow-soft:  0 4px 16px rgba(0,0,0,0.38);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  background: var(--bg); color: var(--text);
  font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  font-size: 19px; overflow: hidden;
}

/* ── 三列布局 ── */
.workbench {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 14px;
  height: 100vh;
  padding: 14px;
  overflow: hidden;
}
.col { min-width: 0; }
.col-left {
  height: 100%; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
}
.col-mid {
  height: 100%; overflow-y: auto; padding-right: 4px; scroll-behavior: smooth;
}

/* 自定义滚动条 */
.col-left::-webkit-scrollbar, .col-mid::-webkit-scrollbar { width: 6px; }
.col-left::-webkit-scrollbar-thumb, .col-mid::-webkit-scrollbar-thumb {
  background: var(--border-strong); border-radius: 6px;
}

/* ── 卡片/面板 ── */
.panel {
  border: 1px solid var(--border); border-radius: 16px;
  background: var(--surface); box-shadow: var(--shadow-soft);
}
.panel-pad { padding: 16px; }

/* ── 品牌 ── */
.brand { display: flex; align-items: center; gap: 12px; }
.logo-img {
  width: 42px; height: 42px; border-radius: 12px;
  object-fit: contain; flex: none;
}
.brand b { display: block; font-size: 20px; letter-spacing: -0.01em; color: var(--text); }
.brand span { display: block; font-size: 15px; color: var(--text); }
.demo-badge { display: inline-block; margin-top: 6px; color: var(--blue); font-size: 12px; font-weight: 600; }

/* ── 导航 ── */
.nav-panel { flex: 1; }
.nav-section-title {
  font-size: 17px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  color: var(--text); margin-bottom: 6px;
}
.nav-list { display: flex; flex-direction: column; gap: 4px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border: 1px solid transparent; border-radius: 10px;
  background: transparent; cursor: pointer;
  font-family: inherit; color: var(--text); text-align: left;
  font-size: 20px; text-decoration: none; transition: .12s;
}
.nav-item:hover { border-color: var(--blue); color: var(--text); background: var(--surface-soft); }
.nav-item.router-link-active {
  background: var(--blue-soft); border-color: var(--blue);
  color: var(--blue); font-weight: 700;
}
.nav-item .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--border-strong); flex: none; transition: .12s;
}
.nav-item.router-link-active .dot { background: var(--blue); }
.nav-item:hover .dot { background: var(--blue); }
.nav-label { flex: 1; }

/* ── 左栏底部 ── */
.left-foot {
  margin-top: auto; display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  padding: 8px 4px 2px;
}
.theme-toggle {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border-strong); background: var(--surface);
  cursor: pointer; font-size: 16px; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-soft); transition: .18s;
}
.theme-toggle:hover { border-color: var(--blue); transform: translateY(-1px); }
.update-time { font-size: 14px; color: var(--text); padding: 0 2px; }

/* ── 数据截止日期标注 ── */
.data-date-bar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--muted);
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  margin-bottom: 12px;
}

/* ── 用户栏 ── */
.user-bar { display: flex; align-items: center; gap: 8px; }
.role-badge { font-size: 13px; color: var(--blue); background: var(--blue-soft); border: 1px solid var(--blue); border-radius: 999px; padding: 3px 8px; white-space: nowrap; }
.user-name { font-size: 15px; color: var(--muted); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.logout-btn {
  padding: 5px 12px; border-radius: 7px;
  border: 1px solid var(--border-strong); background: var(--surface);
  color: var(--muted); font-size: 14px; cursor: pointer;
  font-family: inherit; transition: all 0.15s;
}
.logout-btn:hover { background: var(--bad); border-color: var(--bad); color: #fff; }

/* ── 主内容顶部 ── */
.mid-block { margin-bottom: 14px; }
.mid-topbar {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 16px; flex-wrap: wrap; padding: 2px 2px 0;
}
.mid-topbar-left { flex: 1; }
.eyebrow {
  margin: 0 0 4px; color: var(--blue); font-size: 12px;
  letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700;
}
.main-title {
  margin: 0; font-size: clamp(26px, 2.6vw, 36px); letter-spacing: -0.03em; color: var(--text);
}
.mid-topbar-right { display: flex; align-items: center; gap: 12px; }
.today-str { font-size: 16px; color: var(--text); }

.seg-group { display: flex; background: var(--border); border-radius: 8px; padding: 2px; gap: 1px; }
.seg-btn {
  background: transparent; border: none; color: var(--text); font-size: 16px;
  padding: 5px 14px; border-radius: 6px; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.seg-btn.active { background: var(--blue); color: #fff; box-shadow: 0 3px 8px rgba(31,95,232,.25); }

/* ── 页面内容区 ── */
.page-content { padding: 0 0 20px; }

/* ── view 内 Tab 切换 ── */
.view-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--surface-soft);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 4px;
  width: fit-content;
}
.view-tab {
  padding: 7px 22px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text);
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
}
.view-tab:hover { color: var(--text); }
.view-tab.active {
  background: var(--surface);
  color: var(--blue);
  box-shadow: var(--shadow-soft);
}

/* ── 通用组件样式（KPI卡片、表格、图表等） ── */
.kpi-row { display: grid; gap: 12px; }
.kpi-row-4 { grid-template-columns: repeat(4, 1fr); }
.kpi-row-3 { grid-template-columns: repeat(3, 1fr); }
.kpi-row-5 { grid-template-columns: repeat(5, 1fr); }
.kpi-row-6 { grid-template-columns: repeat(6, 1fr); }
.kpi-card {
  border: 1px solid var(--border); border-radius: 16px;
  background: var(--surface); box-shadow: var(--shadow-soft); padding: 14px 16px;
}
.kpi-label { font-size: 15px; color: var(--text); margin-bottom: 8px; font-weight: 500; }
.kpi-value { font-size: 32px; font-weight: 800; color: var(--text); line-height: 1.2; letter-spacing: -0.03em; }
.kpi-value.sm { font-size: 26px; }
.kpi-value.good { color: var(--green); }
.kpi-value.brand { color: var(--blue); }
.kpi-sub { font-size: 14px; color: var(--text); margin-top: 4px; }
.val-good { color: var(--green) !important; }
.val-warn { color: var(--blue) !important; }
.val-bad  { color: var(--bad)  !important; }

.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

.card {
  border: 1px solid var(--border); border-radius: 16px;
  background: var(--surface); box-shadow: var(--shadow-soft); padding: 16px;
}
.card-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 12px; letter-spacing: .04em; text-transform: uppercase; }
.chart-area { width: 100%; height: 260px; }

.section-block { margin-top: 24px; }
.section-hd {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; border-top: 1px solid var(--border); padding-top: 20px;
}
.section-title { font-size: 18px; font-weight: 700; color: var(--text); }

.icon-btn {
  background: var(--surface-soft); border: 1px solid var(--border);
  color: var(--text); font-size: 15px; padding: 6px 14px; border-radius: 8px;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.icon-btn:hover:not(:disabled) { background: var(--blue); border-color: var(--blue); color: #fff; }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.data-table { width: 100%; border-collapse: collapse; font-size: 15px; }
.data-table thead tr { border-bottom: 1px solid var(--border); }
.data-table th { text-align: left; color: var(--text); font-size: 13px; font-weight: 700; padding: 8px 12px; background: var(--surface-soft); }
.data-table tbody tr { border-bottom: 1px solid var(--border); transition: background 0.1s; }
.data-table tbody tr:hover { background: var(--surface-soft); }
.data-table td { padding: 9px 12px; color: var(--text); }
.data-table .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
.data-table .rank-cell { text-align: center; color: var(--text); font-size: 14px; }
.data-table .name-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tag-good { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 13px; background: rgba(14,143,88,0.1); color: var(--green); border: 1px solid rgba(14,143,88,0.2); }
.tag-dim  { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 13px; background: var(--surface-soft); color: var(--text); border: 1px solid var(--border); }
.err-tag  { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 13px; background: rgba(201,48,48,0.08); color: var(--bad); border: 1px solid rgba(201,48,48,0.15); margin-right: 4px; }

.loading-overlay {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  height: 200px; color: var(--text); font-size: 16px;
  background: var(--surface-soft); border-radius: 12px; border: 1px solid var(--border);
}
.spinner {
  display: inline-block; width: 18px; height: 18px;
  border: 2px solid var(--border-strong); border-top-color: var(--blue);
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state {
  display: flex; align-items: center; justify-content: center;
  height: 120px; color: var(--text); font-size: 16px;
  border: 2px dashed var(--border); border-radius: 12px;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted); }

/* ── 弹窗遮罩 ── */
.modal-mask {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

.modal-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.25);
  width: 100%;
  max-width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.18s ease;
}
.modal-box.modal-box-wide { max-width: 900px; }
@keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

.modal-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-title { font-size: 17px; font-weight: 700; color: var(--text); }
.modal-close {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--surface-soft);
  color: var(--text); font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.1s;
}
.modal-close:hover { background: var(--bad); border-color: var(--bad); color: #fff; }

.modal-body {
  flex: 1; overflow-y: auto; padding: 16px 22px;
}

.modal-ft {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 22px 16px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  font-size: 14px; color: var(--text);
}
.modal-pager { display: flex; align-items: center; gap: 8px; }
.modal-pager button {
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--surface-soft);
  color: var(--text); font-size: 14px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.modal-pager button:hover:not(:disabled) { background: var(--blue); border-color: var(--blue); color: #fff; }
.modal-pager button:disabled { opacity: 0.35; cursor: not-allowed; }
.modal-page-info { font-size: 14px; color: var(--text); }

.kpi-card.clickable { cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; }
.kpi-card.clickable:hover { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(31,95,232,0.1); }

/* 过渡动画 */
*, *::before, *::after {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.15s ease, box-shadow 0.2s ease;
}

@media (max-width: 1100px) {
  .workbench { grid-template-columns: 1fr; height: auto; overflow: visible; }
  .col-left, .col-mid { height: auto; overflow: visible; }
  .grid-2 { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: 1fr; }
  .kpi-row-6 { grid-template-columns: repeat(3, 1fr); }
}
</style>
