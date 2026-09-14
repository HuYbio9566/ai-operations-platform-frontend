import axios from 'axios'
import { useAuthStore } from './stores/auth.js'

// 全局 HTTP 拦截：后端返回令牌过期（SimpleJWT token_not_valid）时，登出并跳转登录页

let redirecting = false

// 判断响应体是否为令牌无效/过期
function isTokenInvalid(data) {
  if (!data) return false
  if (data.code === 'token_not_valid') return true
  // 兜底：命中关键文案
  const detail = typeof data.detail === 'string' ? data.detail : ''
  return detail.includes('令牌') && (detail.includes('无效') || detail.includes('过期'))
}

// 令牌过期处理：清理登录态并跳转登录页（防重入）
export function handleTokenExpired(router) {
  if (redirecting) return
  redirecting = true
  try {
    useAuthStore().logout()
  } catch (e) {
    localStorage.removeItem('zt_access_token')
    localStorage.removeItem('zt_refresh_token')
  }
  const done = () => { redirecting = false }
  if (router) {
    router.push('/login').then(done).catch(done)
  } else {
    window.location.hash = '#/login'
    done()
  }
}

// 在 main.js 中调用，注入全局拦截
export function setupHttpAuthInterceptor(router) {
  // 1. 覆写原生 fetch：拦截 401 响应
  const origFetch = window.fetch
  window.fetch = async function (input, init) {
    const resp = await origFetch.call(this, input, init)
    if (resp.status === 401) {
      try {
        const data = await resp.clone().json().catch(() => null)
        if (isTokenInvalid(data)) handleTokenExpired(router)
      } catch (e) {
        /* 忽略解析错误 */
      }
    }
    return resp
  }

  // 2. axios 响应拦截器
  axios.interceptors.response.use(
    (resp) => {
      if (isTokenInvalid(resp.data)) handleTokenExpired(router)
      return resp
    },
    (err) => {
      const r = err.response
      if (r && r.status === 401 && isTokenInvalid(r.data)) {
        handleTokenExpired(router)
      }
      return Promise.reject(err)
    }
  )
}
