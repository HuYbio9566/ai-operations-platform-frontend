<template>
  <div></div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

const SSO_LOGIN = 'https://login.ops.qihoo.net:4436/sec/login'

function getServiceUrl() {
  const loc = window.location
  return `${loc.protocol}//${loc.host}${loc.pathname}`
}

function redirectToSSO() {
  const service = getServiceUrl()
  window.location.href = `${SSO_LOGIN}?ref=${encodeURIComponent(service)}`
}

onMounted(async () => {
  if (__DEMO_MODE__) {
    window.location.replace(window.location.pathname + '#/overview')
    return
  }
  const searchParams = new URLSearchParams(window.location.search)
  const ticket = searchParams.get('ticket') || searchParams.get('token') || searchParams.get('sid')

  if (!ticket) {
    redirectToSSO()
    return
  }

  try {
    const service = getServiceUrl()
    await authStore.loginWithSSO(ticket, service)
    window.location.replace(window.location.pathname + '#/overview')
  } catch (e) {
    // 票据无效或过期，重新跳 SSO
    redirectToSSO()
  }
})
</script>
