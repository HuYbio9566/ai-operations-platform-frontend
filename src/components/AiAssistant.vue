<script setup>
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { marked } from 'marked'
import ChartBlock from './ChartBlock.vue'

marked.setOptions({ gfm: true, breaks: true })

const rootRef = ref(null)
const open = ref(false)
const messages = ref([])            // { role, content }
const input = ref('')
const loading = ref(false)
const sessionId = ref('')
const bodyRef = ref(null)

const quickQuestions = [
  '最近的用户反馈情况怎么样？',
  '有哪些 P0 反馈？',
  'SkillHub 各类调用量对比',
  '推推日活趋势如何？',
]

const chartRegex = /```chart:(bar|pie|line)\n([\s\S]*?)```/g

function looksLikeTable(text) {
  const lines = text.split('\n').filter(l => l.trim() !== '')
  if (lines.length < 2) return false
  const hasSeparator = lines.some(l => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(l) && l.includes('-'))
  const pipeLines = lines.filter(l => l.includes('|')).length
  return hasSeparator && pipeLines >= 2
}

// 剥离 AI 误包的 ``` / ```markdown 表格围栏（chart 围栏保留）
function normalizeMarkdown(raw) {
  return raw.replace(/```([a-zA-Z]*)\n([\s\S]*?)```/g, (full, lang, body) => {
    const language = (lang || '').toLowerCase()
    if (language.startsWith('chart')) return full
    const isPlainFence = ['', 'markdown', 'md', 'text', 'plaintext'].includes(language)
    if (isPlainFence && looksLikeTable(body)) return body.trim()
    return full
  })
}

// 把一条消息拆成 text / chart 段
function messageParts(rawContent) {
  const content = normalizeMarkdown(rawContent)
  const parts = []
  let lastIdx = 0
  let match
  chartRegex.lastIndex = 0
  while ((match = chartRegex.exec(content)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: 'text', content: marked.parse(content.slice(lastIdx, match.index)) })
    }
    parts.push({ type: 'chart', content: match[2] ?? '', chartType: match[1] ?? 'bar' })
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < content.length) {
    parts.push({ type: 'text', content: marked.parse(content.slice(lastIdx)) })
  }
  return parts
}

function scrollToBottom() {
  nextTick(() => {
    if (bodyRef.value) bodyRef.value.scrollTop = bodyRef.value.scrollHeight
  })
}
watch([messages, loading], scrollToBottom, { deep: true })

function toggle() { open.value = !open.value }

// 点击组件外部（面板和触发按钮之外）自动关闭
function handleOutsideClick(e) {
  if (!open.value) return
  // target 已从 DOM 移除（如点击后被 v-if 卸载的快捷按钮）不算外部点击
  if (!e.target || !document.contains(e.target)) return
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}
// Esc 键也关闭
function handleEsc(e) {
  if (e.key === 'Escape' && open.value) open.value = false
}
onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
  document.addEventListener('keydown', handleEsc)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
  document.removeEventListener('keydown', handleEsc)
})

async function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || loading.value) return
  input.value = ''
  messages.value.push({ role: 'user', content: q })
  const assistant = { role: 'assistant', content: '' }
  messages.value.push(assistant)
  loading.value = true

  if (__DEMO_MODE__) {
    assistant.content = '这是公开演示模式。当前页面展示的是脱敏模拟数据，AI 助手与实时后端未连接。你可以浏览总览、反馈、知识库、推推和 SkillHub 的示例看板。'
    loading.value = false
    messages.value = [...messages.value]
    return
  }

  try {
    const resp = await fetch('/api/ai/chat/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, session_id: sessionId.value || '' }),
    })
    if (!resp.ok || !resp.body) throw new Error('请求失败: ' + resp.status)

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          if (data.content) {
            assistant.content += data.content
            messages.value = [...messages.value]   // 触发响应式
          }
          if (data.done && data.session_id) sessionId.value = data.session_id
        } catch { /* 跳过非 JSON 行 */ }
      }
    }
    if (!assistant.content) assistant.content = '抱歉，没有收到响应，请再试一次。'
  } catch (e) {
    assistant.content = '抱歉，AI 助手暂时无法响应，请稍后再试。'
  } finally {
    loading.value = false
    messages.value = [...messages.value]
  }
}
</script>

<template>
  <div class="ai-assist" ref="rootRef">
    <!-- 触发按钮（放在顶栏） -->
    <button class="ai-trigger" :class="{ active: open }" @click="toggle" title="AI 问答助手">
      <span class="ai-ico">🤖</span>
      <span class="ai-txt">AI 助手</span>
    </button>

    <!-- 悬浮聊天面板 -->
    <transition name="ai-fade">
      <div v-if="open" class="ai-panel">
        <div class="ai-head">
          <div class="ai-head-title"><span>🤖</span><span>AI 运营分析助手</span></div>
          <button class="ai-close" @click="toggle">✕</button>
        </div>

        <div ref="bodyRef" class="ai-body">
          <!-- 空状态 -->
          <div v-if="messages.length === 0" class="ai-empty">
            <div class="ai-empty-emoji">🤖</div>
            <p class="ai-empty-t">我是 AI 运营分析助手</p>
            <p class="ai-empty-s">可查询并分析反馈 / 知识库 / 推推 / SkillHub 数据，支持图表生成</p>
          </div>

          <!-- 消息 -->
          <div v-for="(msg, i) in messages" :key="i" class="ai-msg" :class="msg.role">
            <template v-if="msg.role === 'user'">
              <div class="ai-bubble ai-bubble-user">{{ msg.content }}</div>
            </template>
            <template v-else>
              <div class="ai-bubble ai-bubble-bot">
                <template v-if="msg.content">
                  <template v-for="(part, j) in messageParts(msg.content)" :key="j">
                    <div v-if="part.type === 'text'" class="ai-prose" v-html="part.content"></div>
                    <ChartBlock v-else :type="part.chartType" :data="part.content" />
                  </template>
                </template>
                <span v-else class="ai-typing"><span class="ai-dot"></span>正在分析…</span>
              </div>
            </template>
          </div>
        </div>

        <!-- 快捷问题 -->
        <div v-if="messages.length === 0" class="ai-quick">
          <button v-for="q in quickQuestions" :key="q" class="ai-quick-btn" @click="send(q)">{{ q }}</button>
        </div>

        <!-- 输入 -->
        <div class="ai-input-bar">
          <div class="ai-input-inner">
            <input
              v-model="input"
              class="ai-input"
              placeholder="询问反馈 / 知识库 / 推推 / SkillHub 数据…"
              :disabled="loading"
              @keyup.enter="send()"
            />
            <button class="ai-send" :disabled="loading || !input.trim()" @click="send()">发送</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.ai-assist { position: relative; }

.ai-trigger {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 999px;
  border: 1px solid var(--blue); background: var(--blue); color: #fff;
  font-size: 15px; font-family: inherit; cursor: pointer;
  box-shadow: 0 3px 10px rgba(31,95,232,.25); transition: all .15s;
}
.ai-trigger:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(31,95,232,.35); }
.ai-trigger.active { box-shadow: 0 0 0 3px rgba(31,95,232,.2); }
.ai-ico { font-size: 16px; }

.ai-panel {
  position: fixed; top: 3vh; bottom: 3vh; right: 2vw; z-index: 2000;
  width: 33.333vw; min-width: 360px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 18px; box-shadow: 0 24px 70px rgba(20,44,90,.28);
  display: flex; flex-direction: column; overflow: hidden;
}
.ai-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; color: #fff;
  background: linear-gradient(135deg, #1f5fe8, #4c7ef0);
}
.ai-head-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 16px; }
.ai-close { background: transparent; border: none; color: #fff; font-size: 16px; cursor: pointer; opacity: .85; }
.ai-close:hover { opacity: 1; }

.ai-body { flex: 1; overflow-y: auto; padding: 16px; background: var(--surface-soft); }
.ai-body::-webkit-scrollbar { width: 6px; }
.ai-body::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 6px; }

.ai-empty { text-align: center; color: var(--muted); padding: 40px 12px; }
.ai-empty-emoji { font-size: 40px; margin-bottom: 10px; }
.ai-empty-t { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.ai-empty-s { font-size: 13px; line-height: 1.6; }

.ai-msg { display: flex; margin-bottom: 16px; }
.ai-msg.user { justify-content: flex-end; }
.ai-msg.assistant { justify-content: flex-start; }
.ai-bubble { padding: 12px 18px; border-radius: 14px; font-size: 15px; line-height: 1.7; }
.ai-bubble-user { max-width: 85%; background: var(--blue); color: #fff; border-top-right-radius: 4px; }
.ai-bubble-bot {
  max-width: 100%; background: var(--surface); color: var(--text);
  border: 1px solid var(--border); border-top-left-radius: 4px;
  overflow-x: auto;
}

.ai-typing { display: inline-flex; align-items: center; gap: 6px; color: var(--blue); font-size: 13px; }
.ai-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); animation: aiPulse 1s infinite; }
@keyframes aiPulse { 0%,100% { opacity: .3 } 50% { opacity: 1 } }

.ai-quick { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px 4px; background: var(--surface-soft); }
.ai-quick-btn {
  padding: 5px 12px; border-radius: 999px; font-size: 12px; cursor: pointer;
  border: 1px solid var(--border); background: var(--surface); color: var(--muted);
  font-family: inherit; transition: all .12s;
}
.ai-quick-btn:hover { border-color: var(--blue); color: var(--blue); }

.ai-input-bar { padding: 12px 16px; border-top: 1px solid var(--border); background: var(--surface); }
.ai-input-inner { display: flex; gap: 8px; }
.ai-input {
  flex: 1; padding: 11px 16px; border-radius: 10px; font-size: 15px; font-family: inherit;
  border: 1px solid var(--border); background: var(--surface-soft); color: var(--text); outline: none;
}
.ai-input:focus { border-color: var(--blue); }
.ai-send {
  padding: 9px 18px; border-radius: 10px; border: none; cursor: pointer;
  background: var(--blue); color: #fff; font-size: 14px; font-family: inherit; transition: all .12s;
}
.ai-send:disabled { opacity: .4; cursor: not-allowed; }

.ai-fade-enter-active, .ai-fade-leave-active { transition: all .18s ease; }
.ai-fade-enter-from, .ai-fade-leave-to { opacity: 0; transform: translateY(12px) scale(.98); }

/* markdown 渲染样式 */
.ai-prose :deep(table) { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12.5px; }
.ai-prose :deep(th), .ai-prose :deep(td) { border: 1px solid var(--border); padding: 6px 9px; text-align: left; }
.ai-prose :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
.ai-prose :deep(th), .ai-prose :deep(td) { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.ai-prose :deep(th) { background: var(--surface-soft); font-weight: 600; }
.ai-prose :deep(h1), .ai-prose :deep(h2), .ai-prose :deep(h3) { margin: 14px 0 8px; color: var(--text); }
.ai-prose :deep(h1) { font-size: 20px; }
.ai-prose :deep(h2) { font-size: 18px; }
.ai-prose :deep(h3) { font-size: 16px; }
.ai-prose :deep(ul), .ai-prose :deep(ol) { padding-left: 20px; margin: 8px 0; }
.ai-prose :deep(li) { margin: 4px 0; }
.ai-prose :deep(p) { margin: 8px 0; }
.ai-prose :deep(strong) { font-weight: 700; }
.ai-prose :deep(code) { background: var(--surface-soft); padding: 1px 5px; border-radius: 4px; font-size: 13px; color: var(--blue); }
.ai-prose :deep(pre) { background: #1f2937; color: #f3f4f6; padding: 14px; border-radius: 8px; overflow-x: auto; }
.ai-prose :deep(pre code) { background: transparent; color: inherit; padding: 0; }

@media (max-width: 640px) {
  .ai-panel { inset: 0; border-radius: 0; }
}
</style>
