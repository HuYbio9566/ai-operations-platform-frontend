<template>
  <div>
    <!-- 工具栏：筛选 + 上传按钮 -->
    <div class="bh-toolbar" style="margin-bottom:16px">
      <select v-model="weekFilter" class="bh-select">
        <option value="all">全部周次</option>
        <option v-for="w in allWeeks" :key="w" :value="w">{{ w }}</option>
      </select>
      <select v-model="weekTopicFilter" class="bh-select">
        <option value="all">全部专题</option>
        <option v-for="t in topics" :key="t.id" :value="t.id">{{ t.parent }} / {{ t.name }}</option>
      </select>
      <button v-if="authStore.isAdmin" class="btn-primary-sm" @click="showUpload = true">+ 上传 HTML</button>
    </div>

    <div class="bh-list">
      <div v-if="materialsLoading" class="loading-overlay"><span class="spinner"></span> 加载中…</div>
      <BhMatCard v-for="item in weeksList" :key="item.id" :item="item"
        :can-replace="canReplace(item)"
        @preview="openPreview" @download="downloadSingle" @replace="openReplace" />
      <div v-if="!materialsLoading && weeksList.length === 0" class="empty-state">当前筛选下暂无材料</div>
    </div>

    <!-- 上传弹窗 -->
    <Teleport to="body">
      <div v-if="showUpload" class="bh-backdrop" @click.self="closeUpload">
        <div class="upload-modal">
          <div class="upload-modal-head">
            <h3>{{ replaceTarget ? '替换 HTML 材料' : '上传 HTML 材料' }}</h3>
            <button class="icon-btn" @click="closeUpload">关闭</button>
          </div>
          <div class="upload-modal-body">
            <!-- 周次选择（当前+前2周） -->
            <div class="form-row">
              <label>选择周次 <span class="req">*</span></label>
              <div class="radio-group">
                <label v-for="w in recentWeeks" :key="w" class="radio-item">
                  <input type="radio" v-model="upload.week" :value="w" />
                  <span>{{ w }}</span>
                </label>
              </div>
            </div>
            <!-- 专题选择 -->
            <div class="form-row">
              <label>选择专题 <span class="req">*</span></label>
              <select v-model="upload.topicId" class="bh-select full-width">
                <option value="">-- 请选择专题 --</option>
                <option v-for="t in topics" :key="t.id" :value="t.id">
                  {{ t.parent }} / {{ t.name }}
                </option>
              </select>
            </div>
            <!-- 材料类型 -->
            <div class="form-row">
              <label>材料类型</label>
              <select v-model="upload.materialType" class="bh-select full-width">
                <option value="定期更新">定期更新</option>
                <option value="交办任务">交办任务</option>
              </select>
            </div>
            <!-- 标题（可选，默认用文件名） -->
            <div class="form-row">
              <label>标题（选填，默认用文件名）</label>
              <input v-model="upload.title" class="bh-input" placeholder="报告标题" />
            </div>
            <!-- 摘要 -->
            <div class="form-row">
              <label>摘要（选填）</label>
              <textarea v-model="upload.summary" class="bh-input" rows="3" placeholder="简要说明本材料的内容…" />
            </div>
            <!-- 文件 -->
            <div class="form-row">
              <label>HTML 文件 <span class="req">*</span></label>
              <div class="file-drop" @click="$refs.fileInput.click()" @dragover.prevent @drop.prevent="onFileDrop">
                <span v-if="!upload.file">点击或拖拽上传 .html 文件</span>
                <span v-else class="file-name">{{ upload.file.name }}</span>
              </div>
              <input ref="fileInput" type="file" accept=".html" style="display:none" @change="onFileChange" />
            </div>
            <!-- 错误提示 -->
            <div v-if="uploadError" class="upload-error">{{ uploadError }}</div>
          </div>
          <div class="upload-modal-foot">
            <button class="btn-cancel" @click="closeUpload">取消</button>
            <button class="btn-primary-sm" :disabled="uploading" @click="doUpload">
              {{ uploading ? '上传中…' : '确认上传' }}
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
import { useAuthStore } from '../stores/auth.js'
import {
  topics, materials, materialsLoading,
  allWeeks, recentWeeks,
  loadTopics, loadMaterials, loadRecentWeeks,
  uploadHtml, isAssignment, sortDesc, openPreview, downloadSingle
} from '../composables/useBriefHub.js'

const authStore = useAuthStore()
authStore.initAuth()

const weekFilter      = ref('all')
const weekTopicFilter = ref('all')
const showUpload      = ref(false)
const uploading       = ref(false)
const uploadError     = ref('')
const replaceTarget   = ref(null)

const upload = ref({
  week: '',
  topicId: '',
  materialType: '定期更新',
  title: '',
  summary: '',
  file: null,
})

onMounted(async () => {
  await Promise.all([loadTopics(), loadMaterials(), loadRecentWeeks()])
  if (recentWeeks.value.length) upload.value.week = recentWeeks.value[0]
})

const weeksList = computed(() => {
  let list = materials.value
  if (weekFilter.value !== 'all')      list = list.filter(m => m.week    === weekFilter.value)
  if (weekTopicFilter.value !== 'all') list = list.filter(m => m.topicId === weekTopicFilter.value)
  return list.slice().sort(sortDesc)
})

function onFileChange(e) {
  const f = e.target.files[0]
  if (f) upload.value.file = f
}
function onFileDrop(e) {
  const f = e.dataTransfer.files[0]
  if (f) upload.value.file = f
}

function authHeaders() {
  const token = localStorage.getItem('zt_access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function canReplace(item) {
  if (!authStore.isAdmin) return false
  if (authStore.isSuperAdmin) return true
  const uploader = (item.uploadedBy || '').trim()
  return !!uploader && [authStore.displayName, authStore.username]
    .map(v => (v || '').trim())
    .filter(Boolean)
    .includes(uploader)
}

function openReplace(item) {
  if (!canReplace(item)) return
  replaceTarget.value = item
  upload.value = {
    week: item.week || recentWeeks.value[0] || '',
    topicId: item.topicId || '',
    materialType: item.materialType || '定期更新',
    title: item.title || '',
    summary: item.summary || '',
    file: null,
  }
  uploadError.value = ''
  showUpload.value = true
}

function closeUpload() {
  showUpload.value = false
  replaceTarget.value = null
}

async function doUpload() {
  if (!authStore.isAdmin) return
  uploadError.value = ''
  if (!upload.value.week)    { uploadError.value = '请选择周次'; return }
  if (!upload.value.topicId) { uploadError.value = '请选择专题'; return }
  if (!upload.value.file)    { uploadError.value = '请选择 HTML 文件'; return }

  uploading.value = true
  try {
    const res = await uploadHtml({
      file: upload.value.file,
      week: upload.value.week,
      topicId: upload.value.topicId,
      title: upload.value.title,
      summary: upload.value.summary,
      materialType: upload.value.materialType,
      isReplace: !!replaceTarget.value,
      oldMaterial: replaceTarget.value,
    })
    if (res.code === 0) {
      closeUpload()
      upload.value = { week: recentWeeks.value[0] || '', topicId: '', materialType: '定期更新', title: '', summary: '', file: null }
      await loadMaterials()
    } else {
      uploadError.value = res.error || '上传失败'
    }
  } catch (e) {
    uploadError.value = '上传请求失败：' + e.message
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.bh-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.bh-select  { min-height: 38px; padding: 0 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font-size: 14px; }
.bh-select.full-width { width: 100%; }
.bh-list    { display: grid; gap: 12px; }

.btn-primary-sm {
  height: 38px; padding: 0 18px; border: 0; border-radius: 8px;
  background: var(--blue); color: #fff; font-size: 14px; font-weight: 700;
  cursor: pointer; white-space: nowrap;
}
.btn-primary-sm:hover { background: #1a55e8; }
.btn-primary-sm:disabled { opacity: .55; cursor: not-allowed; }

/* ── 上传弹窗 ── */
.bh-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(5,8,15,0.65); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center;
}
.upload-modal {
  width: min(560px, 95vw); border-radius: 16px; overflow: hidden;
  background: var(--surface); border: 1px solid var(--border);
  box-shadow: var(--shadow);
  display: flex; flex-direction: column;
}
.upload-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border);
  background: var(--surface-soft);
}
.upload-modal-head h3 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); }
.upload-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; max-height: 60vh; }
.upload-modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border); }

.form-row { display: flex; flex-direction: column; gap: 6px; }
.form-row label { font-size: 14px; font-weight: 600; color: var(--text); }
.req { color: var(--bad); }

.radio-group { display: flex; gap: 12px; flex-wrap: wrap; }
.radio-item { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 14px; color: var(--text); }
.radio-item input { accent-color: var(--blue); width: 15px; height: 15px; }

.bh-input {
  width: 100%; padding: 10px 13px; border: 1px solid var(--border-strong);
  border-radius: 8px; background: var(--surface); color: var(--text);
  font-size: 14px; font-family: inherit; resize: vertical;
}
.bh-input:focus { outline: none; border-color: var(--blue); box-shadow: 0 0 0 3px var(--blue-soft); }

.file-drop {
  width: 100%; min-height: 80px; border: 2px dashed var(--border-strong);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--muted); font-size: 14px; transition: border-color .15s;
}
.file-drop:hover { border-color: var(--blue); color: var(--blue); }
.file-name { color: var(--text); font-weight: 600; }

.upload-error { color: var(--bad); font-size: 14px; padding: 8px 12px; background: rgba(201,48,48,.07); border-radius: 8px; border: 1px solid rgba(201,48,48,.15); }

.btn-cancel {
  height: 38px; padding: 0 18px; border: 1px solid var(--border-strong);
  border-radius: 8px; background: var(--surface); color: var(--text);
  font-size: 14px; cursor: pointer;
}
.btn-cancel:hover { border-color: var(--blue); color: var(--blue); }
</style>
