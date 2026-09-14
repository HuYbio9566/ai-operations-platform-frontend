<template>
  <div class="video-view">
    <!-- 顶部工具栏 -->
    <div class="vv-bar">
      <div class="vv-bar-left">
        <span class="vv-title">视频案例</span>
        <span class="vv-count">{{ filteredVideos.length }} / {{ videos.length }} 个</span>
      </div>
      <button v-if="isAdmin" class="vv-upload-btn" @click="openUpload()">＋ 上传视频</button>
    </div>

    <div v-if="tagOptions.length" class="vv-filter-panel">
      <div class="vv-filter-head">
        <span>标签筛选</span>
        <button v-if="selectedTags.length" class="vv-filter-clear" @click="selectedTags = []">清空</button>
      </div>
      <div class="vv-filter-tags" :class="{ expanded: showAllTags }">
        <button
          v-for="tag in tagOptions"
          :key="tag.name"
          class="vv-filter-tag"
          :class="{ active: selectedTags.includes(tag.name) }"
          :style="tagStyle(tag.name, selectedTags.includes(tag.name))"
          @click="toggleTag(tag.name)"
        >
          {{ tag.name }} <b>{{ tag.count }}</b>
        </button>
      </div>
      <button v-if="tagOptions.length > 8" class="vv-more-tags" @click="showAllTags = !showAllTags">
        {{ showAllTags ? '收起标签' : '展开全部标签' }}
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="vv-loading"><span class="spinner"></span> 加载中…</div>

    <!-- 空态 -->
    <div v-else-if="!filteredVideos.length" class="vv-empty">
      暂无视频{{ isAdmin ? '，点击右上角「上传视频」添加' : '' }}
    </div>

    <!-- 卡片网格画廊 -->
    <div v-else class="vv-grid">
      <div v-for="v in filteredVideos" :key="v.id" class="vv-card" @click="openPlayer(v)">
        <!-- 封面 / 缩略图 -->
        <div class="vv-thumb">
          <img v-if="v.coverUrl" :src="v.coverUrl" :alt="v.title" class="vv-cover" />
          <div v-else class="vv-cover vv-cover-fallback">{{ v.title }}</div>
          <div v-if="videoTags(v).length" class="vv-topic-idle vv-tags-idle">
            <span v-for="tag in videoTags(v)" :key="tag" class="vv-tag-chip" :style="tagStyle(tag)">{{ tag }}</span>
          </div>
          <div class="vv-hover-info">
            <div v-if="videoTags(v).length" class="vv-topic vv-tags">
              <span v-for="tag in videoTags(v)" :key="tag" class="vv-tag-chip" :style="tagStyle(tag)">{{ tag }}</span>
            </div>
            <div class="vv-card-title" :title="v.title">{{ v.title }}</div>
            <div class="vv-card-desc" v-if="v.description">{{ v.description }}</div>
            <div class="vv-meta">
              <span v-if="v.size">{{ fmtSize(v.size) }}</span>
              <span v-if="v.uploadedBy">{{ v.uploadedBy }}</span>
              <span v-if="v.createdAt">{{ v.createdAt }}</span>
            </div>
          </div>
          <div class="vv-play-overlay"><span class="vv-play-icon">▶</span></div>
        </div>
        <!-- 操作栏 -->
        <div v-if="canManage(v)" class="vv-actions" @click.stop>
          <button class="vv-act" @click="openEdit(v)">编辑</button>
          <button class="vv-act vv-danger" @click="doDelete(v)">删除</button>
        </div>
      </div>
    </div>

    <!-- 播放弹窗 -->
    <div v-if="playing" class="modal-mask" @click.self="closePlayer">
      <div class="modal-box modal-box-wide vv-player-box">
        <div class="modal-hd">
          <div class="vv-player-tags" :aria-label="videoTags(playing).length ? '行业分类标签' : '行业分类标签占位'">
            <span v-if="!videoTags(playing).length" class="vv-player-tag is-placeholder">行业分类</span>
            <span v-for="tag in videoTags(playing)" :key="tag" class="vv-player-tag" :style="tagStyle(tag, true)">{{ tag }}</span>
          </div>
          <button class="modal-close" @click="closePlayer">✕</button>
        </div>
        <div class="modal-body vv-player-body">
          <div class="vv-player-main">
            <div class="vv-player-wrap">
              <img
                v-if="playing.coverUrl && playerLoading"
                class="vv-player-poster"
                :src="playing.coverUrl"
                :alt="playing.title"
              />
              <div v-if="playerLoading" class="vv-player-loading">
                <span class="spinner"></span>
                <span>视频加载中...</span>
              </div>
              <video
                :key="playing.id"
                ref="playerRef"
                class="vv-player"
                :src="playing.videoUrl"
                :poster="playing.coverUrl || ''"
                controls
                autoplay
                controlslist="nodownload"
                playsinline
                @loadstart="playerLoading = true"
                @waiting="playerLoading = true"
                @canplay="playerLoading = false"
                @playing="playerLoading = false"
                @pointerdown="startFastPlay"
                @pointerup="stopFastPlay"
                @pointerleave="stopFastPlay"
                @touchend="stopFastPlay"
                @click.capture="handlePlayerClick"
              ></video>
              <div v-if="!fastPlaying" class="vv-hold-tip">长按视频 2 倍速播放</div>
              <div v-if="fastPlaying" class="vv-speed-tip">&gt;&gt;&gt;&gt;</div>
            </div>
            <aside class="vv-player-side">
              <div class="vv-side-head">
                <div class="vv-side-icon">▶</div>
                <div>
                  <div class="vv-side-title">{{ playing.title }}</div>
                  <div class="vv-side-subtitle">视频案例</div>
                </div>
              </div>
              <div class="vv-side-section vv-side-desc">
                <div class="vv-side-label">描述 / 简介</div>
                <p>{{ playing.description || '暂无描述' }}</p>
              </div>
              <div class="vv-side-bottom">
                <div class="vv-side-section vv-info-list">
                  <div class="vv-side-label">视频信息</div>
                  <div class="vv-info-row"><span>文件大小</span><b>{{ fmtSize(playing.size) || '-' }}</b></div>
                  <div class="vv-info-row"><span>上传人</span><b>{{ playing.uploadedBy || '-' }}</b></div>
                  <div class="vv-info-row"><span>上传时间</span><b>{{ playing.createdAt || '-' }}</b></div>
                </div>
                <a class="vv-player-download" :href="playing.downloadUrl">下载视频</a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传 / 编辑弹窗 -->
    <div v-if="showForm" class="modal-mask" @click.self="closeForm">
      <div class="modal-box">
        <div class="modal-hd">
          <div class="modal-title">{{ formTitle }}</div>
          <button class="modal-close" @click="closeForm">✕</button>
        </div>
        <div class="modal-body">
          <div class="vv-field">
            <label>标题</label>
            <input v-model="form.title" type="text" placeholder="视频标题，不填则自动使用视频文件名" />
            <div class="vv-file-hint">不填写标题时，会自动使用上传/替换的视频文件名作为标题。</div>
          </div>
          <div class="vv-field">
            <label>标签 <span class="vv-required">*</span></label>
            <div class="vv-tag-editor">
              <div v-if="form.tags.length" class="vv-form-tags">
                <span v-for="tag in form.tags" :key="tag" class="vv-form-tag">
                  {{ tag }}
                  <button type="button" @click="removeTag(tag)">×</button>
                </span>
              </div>
              <div class="vv-tag-add-row">
                <input
                  v-model="tagDraft"
                  type="text"
                  placeholder="输入标签后点击加号"
                  @keyup.enter="addTag"
                />
                <button type="button" class="vv-tag-add" @click="addTag">＋</button>
              </div>
            </div>
            <div class="vv-file-hint">一个视频可以有多个标签，输入标签后点加号添加。</div>
          </div>
          <div class="vv-field">
            <label>简介 / 描述</label>
            <textarea v-model="form.description" rows="3" placeholder="视频简介（可选）"></textarea>
          </div>

          <div class="vv-field">
            <label>视频文件 {{ formMode === 'edit' ? '（可选，选择后替换原视频）' : '' }}</label>
            <div
              class="vv-dropzone"
              :class="{ 'is-dragging': draggingVideo, 'has-preview': !!videoPreviewUrl }"
              @click="videoInput?.click()"
              @dragenter.prevent="draggingVideo = true"
              @dragover.prevent="draggingVideo = true"
              @dragleave.prevent="draggingVideo = false"
              @drop.prevent="onVideoDrop"
            >
              <template v-if="videoPreviewUrl">
                <video class="vv-file-preview" :src="videoPreviewUrl" muted preload="metadata"></video>
                <button type="button" class="vv-clear-file" @click.stop="clearVideoFile">×</button>
              </template>
              <template v-else>
                <div class="vv-drop-icon">⬆</div>
                <div class="vv-drop-main">点击或拖拽视频到这里</div>
                <div class="vv-drop-sub">支持 MP4、MOV、WEBM 等视频格式，一次只能选择一个视频</div>
              </template>
            </div>
            <input ref="videoInput" class="vv-file-input" type="file" accept="video/*" @change="onVideoPick" />
            <div v-if="form.file" class="vv-file-hint">{{ form.file.name }}（{{ fmtSize(form.file.size) }}）</div>
          </div>
          <div class="vv-field">
            <label>封面图（可选，不传则用视频首帧）</label>
            <div
              class="vv-dropzone vv-cover-dropzone"
              :class="{ 'is-dragging': draggingCover, 'has-preview': !!coverPreviewUrl }"
              @click="coverInput?.click()"
              @dragenter.prevent="draggingCover = true"
              @dragover.prevent="draggingCover = true"
              @dragleave.prevent="draggingCover = false"
              @drop.prevent="onCoverDrop"
            >
              <template v-if="coverPreviewUrl">
                <img class="vv-file-preview" :src="coverPreviewUrl" alt="封面预览" />
                <button type="button" class="vv-clear-file" @click.stop="clearCoverFile">×</button>
              </template>
              <template v-else>
                <div class="vv-drop-icon">▧</div>
                <div class="vv-drop-main">点击或拖拽封面图到这里</div>
                <div class="vv-drop-sub">支持 JPG、PNG、WEBP、GIF，一次只能选择一张封面</div>
              </template>
            </div>
            <input ref="coverInput" class="vv-file-input" type="file" accept="image/*" @change="onCoverPick" />
            <div v-if="form.cover" class="vv-file-hint">{{ form.cover.name }}</div>
          </div>

          <div v-if="uploading" class="vv-progress">
            <div class="vv-progress-bar" :style="{ width: progress + '%' }"></div>
            <span class="vv-progress-txt">{{ progress }}%</span>
          </div>
          <div v-if="formError" class="vv-error">{{ formError }}</div>
        </div>
        <div class="modal-ft">
          <button class="vv-cancel" @click="closeForm" :disabled="uploading">取消</button>
          <button class="vv-upload-btn" @click="doSubmit" :disabled="uploading">
            {{ uploading ? '上传中…' : '确定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const BASE = '/api/video'
const authStore = useAuthStore()
authStore.initAuth()

function authHeaders() {
  const token = localStorage.getItem('zt_access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function recordOperation(action, video) {
  try {
    await fetch('/api/operations/record/', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'video',
        action,
        targetId: video.id,
        targetTitle: video.title,
        detail: { tags: video.topic, fileName: video.originalName, size: video.size },
      }),
    })
  } catch (e) {
    console.warn('记录操作失败', e)
  }
}

const videos = ref([])
const loading = ref(false)
// 以后端返回的 isAdmin 为准（后端基于 JWT superuser 判定）
const isAdmin = ref(authStore.isAdmin)
const selectedTags = ref([])
const showAllTags = ref(false)
const TAG_COLORS = [
  ['#1f5fe8', 'rgba(31,95,232,.12)'],
  ['#0e8f58', 'rgba(14,143,88,.12)'],
  ['#b45309', 'rgba(180,83,9,.13)'],
  ['#7c3aed', 'rgba(124,58,237,.12)'],
  ['#c93030', 'rgba(201,48,48,.12)'],
  ['#0f766e', 'rgba(15,118,110,.12)'],
  ['#be185d', 'rgba(190,24,93,.12)'],
  ['#2563eb', 'rgba(37,99,235,.12)'],
]

function videoTags(v) {
  if (Array.isArray(v.tags)) return v.tags.filter(Boolean)
  return String(v.topic || '')
    .split(/[,，、]/)
    .map(t => t.trim())
    .filter(Boolean)
}

function canManage(v) {
  if (authStore.isSuperAdmin) return true
  if (!isAdmin.value) return false
  const uploader = (v.uploadedBy || '').trim()
  return !!uploader && [authStore.displayName, authStore.username]
    .map(name => (name || '').trim())
    .filter(Boolean)
    .includes(uploader)
}

const tagOptions = computed(() => {
  const counts = new Map()
  for (const v of videos.value) {
    for (const tag of videoTags(v)) counts.set(tag, (counts.get(tag) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
})

const filteredVideos = computed(() => {
  if (!selectedTags.value.length) return videos.value
  return videos.value.filter(v => {
    const tags = videoTags(v)
    return selectedTags.value.every(tag => tags.includes(tag))
  })
})

function tagStyle(tag, strong = false) {
  let hash = 0
  for (const ch of String(tag || '')) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const [color, bg] = TAG_COLORS[hash % TAG_COLORS.length]
  return strong
    ? { color: '#fff', background: color, borderColor: color }
    : { color, background: bg, borderColor: color }
}

function toggleTag(tag) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter(t => t !== tag)
    : [...selectedTags.value, tag]
}

function fmtSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / 1024 / 1024
  if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB'
  if (mb >= 1) return mb.toFixed(1) + ' MB'
  return (bytes / 1024).toFixed(0) + ' KB'
}

async function loadAll() {
  loading.value = true
  try {
    const r = await fetch(`${BASE}/`, { headers: authHeaders() })
    const j = await r.json()
    if (j.code === 0) {
      videos.value = j.data || []
      if (typeof j.isAdmin === 'boolean') isAdmin.value = j.isAdmin
    }
  } catch (e) {
    console.warn('VideoView loadAll:', e)
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

// ── 播放器 ────────────────────────────────
const playing = ref(null)
const playerLoading = ref(false)
const playerRef = ref(null)
const fastPlaying = ref(false)
let fastPlayTimer = null
let suppressNextClick = false
function openPlayer(v) { playerLoading.value = true; playing.value = v; recordOperation('view', v) }
function closePlayer() { stopFastPlay(); playing.value = null; playerLoading.value = false }
function startFastPlay() {
  if (!playerRef.value) return
  clearTimeout(fastPlayTimer)
  fastPlayTimer = setTimeout(() => {
    if (!playerRef.value) return
    playerRef.value.playbackRate = 2
    fastPlaying.value = true
    suppressNextClick = true
  }, 220)
}
function stopFastPlay() {
  clearTimeout(fastPlayTimer)
  fastPlayTimer = null
  if (playerRef.value) playerRef.value.playbackRate = 1
  fastPlaying.value = false
}
function handlePlayerClick(e) {
  if (!suppressNextClick) return
  e.preventDefault()
  e.stopPropagation()
  suppressNextClick = false
}

// ── 表单（上传 / 编辑） ────────────
const showForm = ref(false)
const formMode = ref('upload')   // upload | edit
const editTarget = ref(null)
const form = ref({ title: '', tags: [], description: '', file: null, cover: null })
const tagDraft = ref('')
const formError = ref('')
const uploading = ref(false)
const progress = ref(0)
const draggingVideo = ref(false)
const draggingCover = ref(false)
const videoInput = ref(null)
const coverInput = ref(null)
const videoPreviewUrl = ref('')
const coverPreviewUrl = ref('')

const formTitle = computed(() => ({
  upload: '上传视频', edit: '编辑视频',
}[formMode.value]))

function resetForm() {
  clearPreviewUrl(videoPreviewUrl)
  clearPreviewUrl(coverPreviewUrl)
  form.value = { title: '', tags: [], description: '', file: null, cover: null }
  tagDraft.value = ''
  formError.value = ''
  progress.value = 0
  draggingVideo.value = false
  draggingCover.value = false
  editTarget.value = null
}

onBeforeUnmount(() => {
  clearPreviewUrl(videoPreviewUrl)
  clearPreviewUrl(coverPreviewUrl)
})

function openUpload() { resetForm(); formMode.value = 'upload'; showForm.value = true }
function openEdit(v) {
  resetForm(); formMode.value = 'edit'; editTarget.value = v
  form.value.title = v.title; form.value.tags = videoTags(v); form.value.description = v.description
  showForm.value = true
}
function closeForm() { if (uploading.value) return; showForm.value = false; resetForm() }

function clearPreviewUrl(target) {
  if (target.value) URL.revokeObjectURL(target.value)
  target.value = ''
}

function setVideoFile(file) {
  if (!file) return
  clearPreviewUrl(videoPreviewUrl)
  form.value.file = file
  videoPreviewUrl.value = URL.createObjectURL(file)
  if (videoInput.value) videoInput.value.value = ''
}

function clearVideoFile() {
  form.value.file = null
  clearPreviewUrl(videoPreviewUrl)
  if (videoInput.value) videoInput.value.value = ''
}

function setCoverFile(file) {
  if (!file) return
  clearPreviewUrl(coverPreviewUrl)
  form.value.cover = file
  coverPreviewUrl.value = URL.createObjectURL(file)
  if (coverInput.value) coverInput.value.value = ''
}

function clearCoverFile() {
  form.value.cover = null
  clearPreviewUrl(coverPreviewUrl)
  if (coverInput.value) coverInput.value.value = ''
}

function onVideoPick(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('video/')) {
    formError.value = '请选择视频文件'
    if (videoInput.value) videoInput.value.value = ''
    return
  }
  formError.value = ''
  setVideoFile(file)
}
function onVideoDrop(e) {
  draggingVideo.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('video/')) {
    formError.value = '请拖入视频文件'
    return
  }
  formError.value = ''
  setVideoFile(file)
}
function onCoverPick(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    formError.value = '请选择图片文件'
    if (coverInput.value) coverInput.value.value = ''
    return
  }
  formError.value = ''
  setCoverFile(file)
}
function onCoverDrop(e) {
  draggingCover.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    formError.value = '请拖入图片文件'
    return
  }
  formError.value = ''
  setCoverFile(file)
}

function titleFromFile(file) {
  return (file?.name || '').replace(/\.[^.]+$/, '').trim()
}

function cleanTags(raw) {
  const source = Array.isArray(raw) ? raw : String(raw || '').split(/[,，、]/)
  return source
    .map(t => t.trim())
    .filter((tag, index, arr) => tag && arr.indexOf(tag) === index)
}

function addTag() {
  const tag = tagDraft.value.trim()
  if (!tag) return
  if (!form.value.tags.includes(tag)) form.value.tags.push(tag)
  tagDraft.value = ''
}

function removeTag(tag) {
  form.value.tags = form.value.tags.filter(t => t !== tag)
}

// 用 XHR 以便展示上传进度
function xhrSend(method, url, fd) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    const token = localStorage.getItem('zt_access_token')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) progress.value = Math.round((ev.loaded / ev.total) * 100)
    }
    xhr.onload = () => {
      try { resolve({ status: xhr.status, json: JSON.parse(xhr.responseText) }) }
      catch { resolve({ status: xhr.status, json: {} }) }
    }
    xhr.onerror = () => reject(new Error('网络错误'))
    xhr.send(fd)
  })
}

async function doSubmit() {
  formError.value = ''
  if (formMode.value === 'upload' && !form.value.file) { formError.value = '请选择视频文件'; return }
  addTag()
  const tags = cleanTags(form.value.tags)
  if (!tags.length) { formError.value = '请填写标签'; return }

  const title = form.value.title.trim() || titleFromFile(form.value.file)
  if (!title) { formError.value = '请填写标题或选择视频文件'; return }

  uploading.value = true
  progress.value = 0
  try {
    const fd = new FormData()
    fd.append('title', title)
    fd.append('tags', tags.join(','))
    fd.append('description', form.value.description.trim())
    if (form.value.file) fd.append('file', form.value.file)
    if (form.value.cover) fd.append('cover', form.value.cover)

    let res
    if (formMode.value === 'upload') {
      res = await xhrSend('POST', `${BASE}/`, fd)
    } else {
      res = await xhrSend('PUT', `${BASE}/${editTarget.value.id}/`, fd)
    }

    if (res.json.code === 0) {
      showForm.value = false
      resetForm()
      await loadAll()
    } else {
      formError.value = res.json.error || `操作失败（HTTP ${res.status}）`
    }
  } catch (e) {
    formError.value = '请求失败：' + e.message
  } finally {
    uploading.value = false
  }
}

async function doDelete(v) {
  if (!confirm(`确定删除视频「${v.title}」？该操作不可恢复。`)) return
  try {
    const r = await fetch(`${BASE}/${v.id}/`, { method: 'DELETE', headers: authHeaders() })
    const j = await r.json()
    if (j.code === 0) await loadAll()
    else alert(j.error || '删除失败')
  } catch (e) {
    alert('删除失败：' + e.message)
  }
}
</script>

<style scoped>
.video-view { padding-bottom: 20px; }

/* 顶部工具栏 */
.vv-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
.vv-bar-left { display: flex; align-items: center; gap: 10px; }
.vv-title { font-size: 20px; font-weight: 700; color: var(--text); }
.vv-count { font-size: 14px; color: var(--muted); background: var(--surface-soft); border: 1px solid var(--border); border-radius: 10px; padding: 2px 10px; }
.vv-upload-btn {
  height: 34px; padding: 0 16px; border: 0; border-radius: 8px;
  background: var(--blue); color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; font-family: inherit; text-decoration: none;
  display: inline-flex; align-items: center; transition: background .12s;
}
.vv-upload-btn:hover { background: #1a55e8; }

.vv-filter-panel {
  border: 1px solid var(--border); border-radius: 14px;
  background: var(--surface); box-shadow: var(--shadow-soft);
  padding: 12px 14px; margin-bottom: 16px;
}
.vv-filter-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; color: var(--text); font-size: 14px; font-weight: 800; }
.vv-filter-clear { border: 0; background: transparent; color: var(--blue); cursor: pointer; font: inherit; font-size: 13px; }
.vv-filter-tags { display: flex; flex-wrap: wrap; gap: 8px; max-height: 34px; overflow: hidden; }
.vv-filter-tags.expanded { max-height: none; }
.vv-filter-tag {
  height: 28px; display: inline-flex; align-items: center; gap: 5px;
  border: 1px solid var(--border); border-radius: 999px;
  background: var(--surface-soft); color: var(--text); padding: 0 10px;
  cursor: pointer; font: inherit; font-size: 13px; white-space: nowrap;
}
.vv-filter-tag b { color: var(--muted); font-size: 12px; }
.vv-filter-tag.active { background: var(--blue); border-color: var(--blue); color: #fff; }
.vv-filter-tag.active b { color: rgba(255,255,255,.78); }
.vv-more-tags { margin-top: 8px; border: 0; background: transparent; color: var(--blue); cursor: pointer; font: inherit; font-size: 13px; }

/* 加载 / 空态 */
.vv-loading, .vv-empty {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  height: 160px; color: var(--muted); font-size: 15px;
  border: 2px dashed var(--border); border-radius: 14px;
}

/* 卡片网格 */
.vv-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: stretch;
}
.vv-card {
  flex: 1 1 280px;
  min-width: 240px;
  max-width: 420px;
  position: relative;
  display: flex; flex-direction: column;
  border: 1px solid var(--border); border-radius: 16px;
  background: var(--surface); box-shadow: var(--shadow-soft);
  overflow: hidden; cursor: pointer;
  transition: box-shadow .18s, transform .18s, flex-basis .22s, max-width .22s;
}
.vv-card:hover { flex-basis: 390px; max-width: 520px; z-index: 2; box-shadow: var(--shadow); transform: translateY(-2px); }

/* 缩略图 */
.vv-thumb {
  position: relative; width: 100%; aspect-ratio: 16 / 9;
  background: #0d1320; cursor: pointer; overflow: hidden;
}
.vv-cover { width: 100%; height: 100%; object-fit: cover; display: block; }
.vv-cover-fallback {
  display: flex; align-items: center; justify-content: center; padding: 18px;
  background: radial-gradient(circle at 20% 20%, #274690, #0d1320 62%);
  color: rgba(255,255,255,.82); font-size: 15px; font-weight: 800; text-align: center;
}
.vv-topic-idle {
  position: absolute; left: 12px; bottom: 12px; z-index: 2;
  max-width: calc(100% - 24px); padding: 6px 12px; border-radius: 999px;
  background: rgba(8,13,24,.72); color: #fff; border: 1px solid rgba(255,255,255,.22);
  font-size: 13px; font-weight: 700; line-height: 1.2; backdrop-filter: blur(8px);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: opacity .15s, transform .15s;
}
.vv-tags-idle { display: flex; gap: 6px; padding: 0; background: transparent; border: 0; backdrop-filter: none; }
.vv-card:hover .vv-topic-idle { opacity: 0; transform: translateY(6px); }
.vv-hover-info {
  position: absolute; left: 0; right: 0; bottom: 0; z-index: 2;
  padding: 42px 16px 14px;
  background: linear-gradient(180deg, rgba(8,13,24,0), rgba(8,13,24,.78) 36%, rgba(8,13,24,.94));
  color: #fff; opacity: 0; transform: translateY(10px);
  transition: opacity .16s, transform .16s;
  pointer-events: none;
}
.vv-card:hover .vv-hover-info { opacity: 1; transform: translateY(0); }
.vv-topic {
  display: flex; flex-wrap: wrap; gap: 6px; max-width: 100%; margin-bottom: 8px;
}
.vv-tag-chip {
  display: inline-flex; max-width: 130px; padding: 5px 10px; border-radius: 999px;
  background: rgba(8,13,24,.72); color: #fff; border: 1px solid rgba(255,255,255,.24);
  font-size: 12px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  backdrop-filter: blur(8px);
}
.vv-play-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 1;
  background: rgba(0,0,0,0.18); opacity: 0; transition: opacity .15s;
}
.vv-thumb:hover .vv-play-overlay { opacity: 1; }
.vv-play-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(255,255,255,0.92); color: var(--blue);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; padding-left: 4px;
}

.vv-card-title { font-size: 17px; font-weight: 800; color: #fff; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-shadow: 0 1px 6px rgba(0,0,0,.36); }
.vv-card-desc { margin-top: 6px; font-size: 13px; color: rgba(255,255,255,.82); line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.vv-meta { margin-top: 8px; font-size: 12px; color: rgba(255,255,255,.72); display: flex; flex-wrap: wrap; gap: 8px; }

/* 操作栏 */
.vv-actions { position: absolute; right: 10px; top: 10px; z-index: 3; display: flex; flex-wrap: wrap; gap: 6px; opacity: 0; pointer-events: none; transition: opacity .15s; }
.vv-card:hover .vv-actions { opacity: 1; pointer-events: auto; }
.vv-act {
  padding: 5px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.34);
  background: rgba(12,18,32,.72); color: #fff; font-size: 13px; cursor: pointer;
  font-family: inherit; text-decoration: none; transition: all .12s;
  backdrop-filter: blur(8px);
}
.vv-act:hover { background: var(--blue); border-color: var(--blue); color: #fff; }
.vv-danger:hover { background: var(--bad); border-color: var(--bad); }

/* 播放器弹窗 */
.vv-player-box { max-width: min(1480px, 96vw); max-height: 92vh; }
.vv-player-box .modal-hd { padding: 14px 18px; }
.vv-player-tags { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-height: 30px; }
.vv-player-tag {
  display: inline-flex; align-items: center; max-width: 180px; padding: 6px 12px; border-radius: 999px;
  background: rgba(37,99,235,.1); color: var(--blue); border: 1px solid rgba(37,99,235,.24);
  font-size: 13px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.vv-player-tag.is-placeholder { color: var(--muted); background: var(--surface-soft); border-color: var(--border); }
.vv-player-body { padding: 0; overflow: hidden; }
.vv-player-main { display: flex; width: 100%; min-height: 650px; }
.vv-player-wrap { position: relative; flex: 0 0 70%; background: #000; min-height: 650px; }
.vv-player { width: 100%; height: 100%; max-height: calc(92vh - 60px); background: #000; display: block; object-fit: contain; }
.vv-player-poster {
  position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; object-fit: cover;
  filter: brightness(.72);
}
.vv-player-loading {
  position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; gap: 10px;
  color: #fff; background: rgba(0,0,0,.28); font-size: 15px; pointer-events: none;
}
.vv-player-download {
  display: flex; align-items: center; justify-content: center; width: 100%; height: 36px; margin-top: 14px;
  border-radius: 10px; background: var(--blue); color: #fff; border: 1px solid var(--blue);
  text-decoration: none; font-size: 14px; font-weight: 700;
}
.vv-player-download:hover { background: #1a55e8; border-color: #1a55e8; }
.vv-speed-tip {
  position: absolute; left: 50%; top: 18px; z-index: 3; transform: translateX(-50%);
  padding: 7px 18px; border-radius: 999px;
  background: rgba(12,18,32,.72); color: #fff; font-size: 18px; font-weight: 900; letter-spacing: 5px;
  pointer-events: none;
  text-shadow: 0 0 12px rgba(255,255,255,.75);
  animation: vvSpeedBlink .58s steps(2, end) infinite;
}
@keyframes vvSpeedBlink { 0%, 100% { opacity: 1 } 50% { opacity: .25 } }
.vv-hold-tip {
  position: absolute; left: 50%; bottom: 58px; z-index: 3; transform: translate(-50%, 6px);
  padding: 7px 12px; border-radius: 999px;
  background: rgba(12,18,32,.72); color: #fff; border: 1px solid rgba(255,255,255,.24);
  font-size: 13px; font-weight: 700; opacity: 0; white-space: nowrap;
  transition: opacity .15s, transform .15s; pointer-events: none; backdrop-filter: blur(8px);
}
.vv-player-wrap:hover .vv-hold-tip { opacity: 1; transform: translate(-50%, 0); }
.vv-player-side {
  flex: 0 0 30%; min-width: 280px; padding: 24px; overflow: hidden;
  display: flex; flex-direction: column;
  border-left: 1px solid var(--border); background: var(--surface);
}
.vv-side-head { display: flex; gap: 14px; align-items: center; flex: 0 0 auto; margin-bottom: 24px; }
.vv-side-icon {
  width: 46px; height: 46px; border-radius: 14px; flex: 0 0 auto;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, var(--blue), #5f8cff); color: #fff; font-size: 18px; font-weight: 900;
  box-shadow: 0 10px 22px rgba(31,95,232,.22);
}
.vv-side-title { font-size: 18px; font-weight: 800; color: var(--text); line-height: 1.35; }
.vv-side-subtitle { margin-top: 4px; font-size: 13px; color: var(--muted); }
.vv-side-section { padding-top: 18px; margin-top: 18px; border-top: 1px solid var(--border); }
.vv-side-section:first-of-type { border-top: 0; margin-top: 0; padding-top: 0; }
.vv-side-desc { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-right: 4px; }
.vv-side-bottom { flex: 0 0 auto; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); }
.vv-side-bottom .vv-side-section { margin-top: 0; padding-top: 0; border-top: 0; }
.vv-side-label { margin-bottom: 8px; color: var(--text); font-size: 14px; font-weight: 800; }
.vv-side-section p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
.vv-info-list { display: flex; flex-direction: column; gap: 10px; }
.vv-info-row { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--muted); }
.vv-info-row b { color: var(--text); font-weight: 700; text-align: right; word-break: break-word; }

@media (max-width: 900px) {
  .vv-player-box { max-height: 92vh; }
  .vv-player-main { flex-direction: column; min-height: 0; }
  .vv-player-wrap { flex-basis: auto; min-height: 260px; aspect-ratio: 16 / 9; }
  .vv-player { max-height: 52vh; }
  .vv-player-side { flex-basis: auto; min-width: 0; max-height: 42vh; border-left: 0; border-top: 1px solid var(--border); padding: 18px; }
}

/* 表单 */
.vv-field { margin-bottom: 16px; }
.vv-field label { display: block; font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.vv-field input[type="text"], .vv-field textarea {
  width: 100%; padding: 9px 12px; border: 1px solid var(--border-strong);
  border-radius: 8px; background: var(--surface-soft); color: var(--text);
  font-size: 14px; font-family: inherit; resize: vertical;
}
.vv-field input[type="text"]:focus, .vv-field textarea:focus { outline: none; border-color: var(--blue); }
.vv-tag-editor {
  border: 1px solid var(--border-strong); border-radius: 10px;
  background: var(--surface-soft); padding: 6px;
}
.vv-form-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.vv-form-tag {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 8px 5px 10px;
  border-radius: 999px; background: rgba(37,99,235,.1); color: var(--blue);
  border: 1px solid rgba(37,99,235,.22); font-size: 13px; font-weight: 700;
}
.vv-form-tag button {
  width: 16px; height: 16px; border: 0; border-radius: 50%; cursor: pointer;
  background: rgba(37,99,235,.18); color: var(--blue); line-height: 1;
}
.vv-tag-add-row { display: flex; gap: 8px; }
.vv-tag-add-row input {
  flex: 1; height: 32px; padding: 6px 10px; border: 1px solid var(--border-strong);
  border-radius: 8px; background: var(--surface); color: var(--text);
  font-size: 13px; font-family: inherit;
}
.vv-tag-add-row input:focus { outline: none; border-color: var(--blue); }
.vv-tag-add {
  width: 32px; height: 32px; border: 0; border-radius: 8px; background: var(--blue); color: #fff;
  font-size: 18px; line-height: 1; cursor: pointer; font-family: inherit;
}
.vv-tag-add:hover { background: #1a55e8; }
.vv-required { color: var(--bad); }
.vv-file-input { display: none; }
.vv-file-hint { margin-top: 6px; font-size: 12px; color: var(--muted); }
.vv-dropzone {
  position: relative;
  border: 1.5px dashed var(--border-strong); border-radius: 12px;
  background: var(--surface-soft); padding: 18px 16px; margin-bottom: 10px;
  min-height: 138px; overflow: hidden;
  text-align: center; color: var(--muted); transition: all .15s; cursor: pointer;
}
.vv-dropzone:hover { border-color: var(--blue); background: rgba(37, 99, 235, .06); }
.vv-dropzone.is-dragging {
  border-color: var(--blue); background: rgba(37, 99, 235, .08); color: var(--blue);
}
.vv-dropzone.has-preview { padding: 0; border-style: solid; background: #0d1320; min-height: 120px; }
.vv-cover-dropzone { padding: 16px; min-height: 128px; }
.vv-cover-dropzone.has-preview { padding: 0; min-height: 120px; }
.vv-file-preview { width: 100%; height: 120px; object-fit: cover; display: block; }
.vv-clear-file {
  position: absolute; top: 10px; right: 10px; z-index: 2;
  width: 30px; height: 30px; border: 0; border-radius: 999px;
  background: rgba(12,18,32,.78); color: #fff; font-size: 20px; line-height: 1;
  cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.28);
}
.vv-clear-file:hover { background: var(--bad); }
.vv-drop-icon { font-size: 28px; line-height: 1; margin-bottom: 8px; }
.vv-drop-main { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.vv-dropzone.is-dragging .vv-drop-main { color: var(--blue); }
.vv-drop-sub { font-size: 12px; line-height: 1.5; }
.vv-error { color: var(--bad); font-size: 13px; margin-top: 8px; }
.vv-cancel {
  padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-strong);
  background: var(--surface-soft); color: var(--text); font-size: 14px; cursor: pointer; font-family: inherit;
}
.vv-cancel:disabled { opacity: .5; cursor: not-allowed; }

/* 进度条 */
.vv-progress { position: relative; height: 22px; background: var(--surface-soft); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 8px; }
.vv-progress-bar { height: 100%; background: var(--blue); transition: width .15s; }
.vv-progress-txt { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text); }
</style>
