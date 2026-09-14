import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { requiresAuth: false } },
  { path: '/no-permission', component: () => import('../views/NoPermissionView.vue'), meta: { title: '无访问权限' } },
  { path: '/', redirect: '/overview' },
  { path: '/overview',  component: () => import('../views/OverviewView.vue'),  meta: { title: '运营总览' } },
  { path: '/feedback',  component: () => import('../views/FeedbackView.vue'),  meta: { title: '内网反馈运营' } },
  { path: '/knowledge', component: () => import('../views/KnowledgeView.vue'), meta: { title: '知识库运营' } },
  { path: '/tuitui',    component: () => import('../views/TuituiView.vue'),    meta: { title: '推推运营' } },
  { path: '/skillhub',  component: () => import('../views/SkillHubView.vue'),  meta: { title: 'SkillHub 运营' } },
  { path: '/videos',    component: () => import('../views/VideoView.vue'),     meta: { title: '视频板块' } },
  { path: '/org',       component: () => import('../views/OrgManageView.vue'), meta: { title: '后台管理 / 组织管理', requiresSuperAdmin: true } },
  { path: '/operation-logs', component: () => import('../views/OperationLogsView.vue'), meta: { title: '后台管理 / 操作记录', requiresSuperAdmin: true } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  authStore.initAuth()

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    return { path: '/login' }
  }

  // 已登录但无系统访问权限 → 无权限页（无权限页本身放行）
  if (requiresAuth && !authStore.hasAccess && to.path !== '/no-permission') {
    return { path: '/no-permission' }
  }

  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    return { path: '/overview' }
  }

  if (to.path === '/login' && authStore.isAuthenticated) {
    return { path: authStore.hasAccess ? '/overview' : '/no-permission' }
  }
})

export default router
