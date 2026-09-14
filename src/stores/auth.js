import { defineStore } from 'pinia'
import { ref } from 'vue'

// Token 存储工具
const tokenStore = {
  getAccess: () => localStorage.getItem('zt_access_token'),
  getRefresh: () => localStorage.getItem('zt_refresh_token'),
  set(access, refresh) {
    localStorage.setItem('zt_access_token', access)
    if (refresh) localStorage.setItem('zt_refresh_token', refresh)
  },
  clear() {
    localStorage.removeItem('zt_access_token')
    localStorage.removeItem('zt_refresh_token')
  },
}

export { tokenStore }

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const username = ref('')
  const displayName = ref('')
  const isAdmin = ref(false)
  const isSuperAdmin = ref(false)
  const role = ref('user')
  const hasAccess = ref(false)

  // 初始化：从本地 token 恢复登录态
  function initAuth() {
    if (__DEMO_MODE__) {
      isAuthenticated.value = true
      username.value = 'demo'
      displayName.value = '演示访客'
      isAdmin.value = false
      isSuperAdmin.value = false
      role.value = 'user'
      hasAccess.value = true
      return
    }
    const access = tokenStore.getAccess()
    if (access) {
      isAuthenticated.value = true
      username.value = localStorage.getItem('zt_username') || ''
      displayName.value = localStorage.getItem('zt_display_name') || ''
      isAdmin.value = localStorage.getItem('zt_is_admin') === 'true'
      isSuperAdmin.value = localStorage.getItem('zt_is_super_admin') === 'true'
      role.value = localStorage.getItem('zt_role') || (isSuperAdmin.value ? 'super_admin' : (isAdmin.value ? 'admin' : 'user'))
      hasAccess.value = localStorage.getItem('zt_has_access') === 'true'
    } else {
      isAuthenticated.value = false
      username.value = ''
      displayName.value = ''
      isAdmin.value = false
      isSuperAdmin.value = false
      role.value = 'user'
      hasAccess.value = false
    }
  }

  // 360 SSO 登录：凭 ticket + service 向后端换取 JWT
  async function loginWithSSO(ticket, service) {
    const resp = await fetch('/api/auth/sso/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket, service }),
    })
    const data = await resp.json()
    if (data.status !== 'success') {
      throw new Error(data.message || 'SSO 登录失败')
    }
    tokenStore.set(data.access, data.refresh)
    isAuthenticated.value = true
    username.value = data.username || ''
    displayName.value = data.display || data.username || ''
    isAdmin.value = !!data.is_admin
    isSuperAdmin.value = !!data.is_super_admin
    role.value = data.role || (isSuperAdmin.value ? 'super_admin' : (isAdmin.value ? 'admin' : 'user'))
    hasAccess.value = !!data.has_access
    localStorage.setItem('zt_username', username.value)
    localStorage.setItem('zt_display_name', displayName.value)
    localStorage.setItem('zt_is_admin', isAdmin.value ? 'true' : 'false')
    localStorage.setItem('zt_is_super_admin', isSuperAdmin.value ? 'true' : 'false')
    localStorage.setItem('zt_role', role.value)
    localStorage.setItem('zt_has_access', hasAccess.value ? 'true' : 'false')
  }

  // 登出
  function logout() {
    tokenStore.clear()
    isAuthenticated.value = false
    username.value = ''
    displayName.value = ''
    isAdmin.value = false
    isSuperAdmin.value = false
    role.value = 'user'
    hasAccess.value = false
    localStorage.removeItem('zt_username')
    localStorage.removeItem('zt_display_name')
    localStorage.removeItem('zt_is_admin')
    localStorage.removeItem('zt_is_super_admin')
    localStorage.removeItem('zt_role')
    localStorage.removeItem('zt_has_access')
  }

  return { isAuthenticated, username, displayName, isAdmin, isSuperAdmin, role, hasAccess, initAuth, loginWithSSO, logout }
})
