<template>
  <div>
    <!-- 工具栏 -->
    <div class="bh-toolbar" style="margin-bottom:16px">
      <select v-model="topicWeekFilter" class="bh-select">
        <option value="all">全部周</option>
        <option v-for="w in allWeeks" :key="w" :value="w">{{ w }}</option>
      </select>
      <button class="btn-primary-sm" @click="openTopicEditor()">+ 新建专题</button>
    </div>

    <div class="bh-topic-layout">
      <!-- 左侧专题列表 -->
      <div class="bh-topic-tabs">
        <div
          v-for="t in topicTabList"
          :key="t.id"
          class="bh-topic-tab"
          :class="{ active: selectedTopic === t.id }"
          @click="selectedTopic = t.id"
        >
          <div class="tab-row">
            <div class="tab-info">
              <strong>{{ t.name }}</strong>
              <span>{{ t.parent }}</span>
              <em>{{ topicFilteredCount(t.id) }} 篇 · 最近 {{ latestUploadDate(t.id) }}</em>
            </div>
            <div class="tab-actions" @click.stop>
              <button class="icon-btn-sm" title="编辑" @click="openTopicEditor(t)">编辑</button>
              <button class="icon-btn-sm danger" title="删除" @click="confirmDeleteTopic(t)">删除</button>
            </div>
          </div>
        </div>
        <div v-if="topicTabList.length === 0" class="empty-state" style="margin-top:8px">暂无专题</div>
      </div>

      <!-- 右侧材料列表 -->
      <div class="card bh-topic-content">
        <div class="bh-topic-content-head">
          <div class="card-title" style="font-size:15px;color:var(--text)">{{ selectedTopicName }}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">
            {{ topicMaterialList.length }} 份材料，按上传日期倒序
          </div>
        </div>
        <div v-if="materialsLoading" class="loading-overlay"><span class="spinner"></span> 加载中…</div>
        <div class="bh-list" v-else>
          <BhMatCard v-for="item in topicMaterialList" :key="item.id" :item="item"
            @preview="openPreview" @download="downloadSingle" />
          <div v-if="topicMaterialList.length === 0" class="empty-state">当前专题下暂无材料</div>
        </div>
      </div>
    </div>

    <!-- 专题编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showEditor" class="bh-backdrop" @click.self="showEditor = false">
        <div class="editor-modal">
          <div class="editor-modal-head">
            <h3>{{ editingTopic ? '编辑专题' : '新建专题' }}</h3>
            <button class="icon-btn" @click="showEditor = false">关闭</button>
          </div>
          <div class="editor-modal-body">
            <div class="form-row">
              <label>专题名称 <span class="req">*</span></label>
              <input v-model="editorForm.name" class="bh-input" placeholder="如：核心AI产品用户反馈" />
            </div>
            <div class="form-row">
              <label>所属分类（选填）</label>
              <input v-model="editorForm.parent" class="bh-input" placeholder="如：用户反馈" />
            </div>
            <div v-if="editorError" class="upload-error">{{ editorError }}</div>
          </div>
          <div class="editor-modal-foot">
            <button class="btn-cancel" @click="showEditor = false">取消</button>
            <button class="btn-primary-sm" :disabled="editorSaving" @click="saveTopicEdit">
              {{ editorSaving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <div v-if="deletingTopic" class="bh-backdrop" @click.self="deletingTopic = null">
        <div class="confirm-modal">
          <div class="confirm-body">
            <p>确认删除专题 <strong>「{{ deletingTopic.name }}」</strong>？此操作不可恢复。</p>
          </div>
          <div class="confirm-foot">
            <button class="btn-cancel" @click="deletingTopic = null">取消</button>
            <button class="btn-danger" :disabled="deleting" @click="doDeleteTopic">
              {{ deleting ? '删除中…' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BhMatCard from './BhMatCard.vue'
import {
  topics, materials, materialsLoading,
  allWeeks, loadTopics, loadMaterials,
  topicName, latestUploadDate, sortDesc,
  createTopic, updateTopic, deleteTopic,
  openPreview, downloadSingle
} from '../composables/useBriefHub.js'

const topicWeekFilter = ref('all')
const selectedTopic   = ref('')

// editor
const showEditor    = ref(false)
const editingTopic  = ref(null)
const editorForm    = ref({ name: '', parent: '' })
const editorError   = ref('')
const editorSaving  = ref(false)
// delete
const deletingTopic = ref(null)
const deleting      = ref(false)

onMounted(async () => {
  await Promise.all([loadTopics(), loadMaterials()])
  if (topics.value.length) selectedTopic.value = topics.value[0].id
})

const topicTabList = computed(() => {
  const week = topicWeekFilter.value
  const filtered = week === 'all' ? materials.value : materials.value.filter(m => m.week === week)
  const ids = [...new Set(filtered.map(m => m.topicId))]
  // Show topics that have materials OR all topics if no filter
  const withMats = topics.value.filter(t => ids.includes(t.id))
  return week === 'all' ? topics.value : withMats
})

const selectedTopicName = computed(() => topicName(selectedTopic.value))

function topicFilteredCount(topicId) {
  const week = topicWeekFilter.value
  return materials.value.filter(m =>
    m.topicId === topicId && (week === 'all' || m.week === week)
  ).length
}

const topicMaterialList = computed(() => {
  const week = topicWeekFilter.value
  return materials.value
    .filter(m => m.topicId === selectedTopic.value && (week === 'all' || m.week === week))
    .slice().sort(sortDesc)
})

// ── 新建/编辑专题 ──
function openTopicEditor(topic = null) {
  editingTopic.value = topic
  editorForm.value = topic ? { name: topic.name, parent: topic.parent } : { name: '', parent: '' }
  editorError.value = ''
  showEditor.value = true
}

async function saveTopicEdit() {
  editorError.value = ''
  if (!editorForm.value.name.trim()) { editorError.value = '专题名称不能为空'; return }
  editorSaving.value = true
  try {
    let res
    if (editingTopic.value) {
      res = await updateTopic(editingTopic.value.id, editorForm.value)
    } else {
      res = await createTopic(editorForm.value)
    }
    if (res.code === 0) {
      showEditor.value = false
      await loadTopics()
      if (!editingTopic.value && res.data) selectedTopic.value = res.data.id
    } else {
      editorError.value = res.error || '操作失败'
    }
  } catch (e) {
    editorError.value = '请求失败：' + e.message
  } finally {
    editorSaving.value = false
  }
}

// ── 删除专题 ──
function confirmDeleteTopic(topic) {
  deletingTopic.value = topic
}

async function doDeleteTopic() {
  if (!deletingTopic.value) return
  deleting.value = true
  try {
    const res = await deleteTopic(deletingTopic.value.id)
    if (res.code === 0) {
      deletingTopic.value = null
      await loadTopics()
      if (topics.value.length) selectedTopic.value = topics.value[0].id
    }
  } catch (e) {
    console.error(e)
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.bh-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.bh-select  { min-height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font-size: 14px; }
.bh-list    { display: grid; gap: 12px; }

.btn-primary-sm {
  height: 38px; padding: 0 18px; border: 0; border-radius: 8px;
  background: var(--blue); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-primary-sm:hover { background: #1a55e8; }
.btn-primary-sm:disabled { opacity: .55; cursor: not-allowed; }

.bh-topic-layout { display: grid; grid-template-columns: 220px 1fr; gap: 14px; align-items: start; }
.bh-topic-tabs   { display: grid; gap: 8px; }
.bh-topic-tab {
  padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px;
  background: var(--surface); color: var(--muted); text-align: left;
  cursor: pointer; transition: all 0.15s; width: 100%;
}
.bh-topic-tab:hover  { border-color: var(--blue); }
.bh-topic-tab.active { border-color: var(--blue); background: var(--blue-soft); box-shadow: 0 0 0 2px rgba(47,107,255,0.12); }
.tab-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.tab-info { display: grid; gap: 2px; flex: 1; min-width: 0; }
.tab-info strong { font-size: 13px; color: var(--text); display: block; }
.tab-info span   { font-size: 12px; color: var(--muted); display: block; }
.tab-info em     { font-size: 12px; color: var(--blue); font-style: normal; font-weight: 700; display: block; margin-top: 3px; }
.tab-actions { display: flex; gap: 4px; flex-shrink: 0; opacity: 0; transition: opacity .12s; }
.bh-topic-tab:hover .tab-actions { opacity: 1; }

.icon-btn-sm {
  padding: 4px 8px; border: 1px solid var(--border); border-radius: 6px;
  background: var(--surface-soft); color: var(--muted); font-size: 12px; cursor: pointer;
}
.icon-btn-sm:hover { border-color: var(--blue); color: var(--blue); }
.icon-btn-sm.danger:hover { border-color: #e5484d; color: #e5484d; }

.bh-topic-content      { padding: 16px; }
.bh-topic-content-head { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }

/* ── 弹窗共用 ── */
.bh-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(5,8,15,0.65); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
}
.editor-modal, .confirm-modal {
  border-radius: 16px; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border); box-shadow: var(--shadow);
}
.editor-modal { width: min(480px, 95vw); }
.confirm-modal { width: min(380px, 95vw); }
.editor-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border); background: var(--surface-soft);
}
.editor-modal-head h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); }
.editor-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.editor-modal-foot, .confirm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border); }
.confirm-body { padding: 20px; }
.confirm-body p { font-size: 14px; color: var(--text); line-height: 1.6; }

.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 14px; font-weight: 600; color: var(--text); }
.req { color: var(--bad); }
.bh-input {
  width: 100%; padding: 10px 13px; border: 1px solid var(--border-strong);
  border-radius: 8px; background: var(--surface); color: var(--text); font-size: 14px; font-family: inherit;
}
.bh-input:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-soft); }
.upload-error { color: var(--bad); font-size: 14px; padding: 8px 12px; background: rgba(201,48,48,.07); border-radius: 8px; }

.btn-cancel {
  height: 38px; padding: 0 18px; border: 1px solid var(--border-strong);
  border-radius: 8px; background: var(--surface); color: var(--text); font-size: 14px; cursor: pointer;
}
.btn-cancel:hover { border-color: var(--blue); color: var(--blue); }
.btn-danger {
  height: 38px; padding: 0 18px; border: 0; border-radius: 8px;
  background: var(--bad); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer;
}
.btn-danger:disabled { opacity: .55; cursor: not-allowed; }

@media (max-width: 900px) {
  .bh-topic-layout { grid-template-columns: 1fr; }
}
</style>
