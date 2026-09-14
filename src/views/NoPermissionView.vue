<template>
  <div class="no-perm">
    <div class="card">
      <div class="icon">⛔</div>
      <h2>无访问权限</h2>
      <p class="desc">您当前没有访问本系统的权限。</p>
      <p class="hint">请联系超级管理员在「后台管理 / 组织管理」中为您授予「可访问」权限。</p>
      <div class="actions">
        <button class="primary-btn" @click="goLogin">重新登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

function goLogin() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.no-perm { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.card { max-width: 460px; text-align: center; padding: 36px 28px; border: 1px solid var(--border); background: var(--surface-soft); border-radius: 16px; }
.icon { font-size: 44px; }
h2 { margin: 12px 0 6px; color: var(--text); }
.desc { color: var(--text); font-size: 15px; margin: 0 0 4px; }
.hint { color: var(--muted); font-size: 13px; margin: 0 0 18px; }
.actions { display: flex; justify-content: center; gap: 10px; }
.primary-btn { height: 38px; padding: 0 22px; border: 0; border-radius: 9px; background: var(--blue); color: #fff; font: inherit; font-weight: 700; cursor: pointer; }
.primary-btn:hover { opacity: .92; }
</style>
