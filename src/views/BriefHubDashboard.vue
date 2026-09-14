<template>
  <div>
    <div class="kpi-row kpi-row-4" style="margin-bottom:16px">
      <div class="kpi-card">
        <div class="kpi-label">材料总数</div>
        <div class="kpi-value brand">{{ materials.length }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">本周推送（{{ currentWeek }}）</div>
        <div class="kpi-value brand">{{ weekMaterials.length }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">专题数量</div>
        <div class="kpi-value brand">{{ topics.length }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">交办任务</div>
        <div class="kpi-value" :class="assignmentCount > 0 ? 'val-warn' : ''">{{ assignmentCount }}</div>
      </div>
    </div>

    <!-- 本周推送包 -->
    <div class="card" style="margin-bottom:16px">
      <div class="bh-panel-head">
        <span class="card-title" style="margin:0">本周推送包</span>
        <div class="bh-toolbar">
          <select v-model="dashWeek" class="bh-select">
            <option v-for="w in allWeeks" :key="w" :value="w">{{ w }}</option>
          </select>
          <label class="bh-check-label">
            <input type="checkbox" v-model="assignmentOnly" />只看交办
          </label>
        </div>
      </div>
      <div v-if="materialsLoading" class="loading-overlay"><span class="spinner"></span> 加载中…</div>
      <div class="bh-list" v-else>
        <BhMatCard v-for="item in dashboardList" :key="item.id" :item="item"
          @preview="openPreview" @download="downloadSingle" />
        <div v-if="dashboardList.length === 0" class="empty-state">当前筛选下暂无材料</div>
      </div>
    </div>

    <!-- 重点阅读 + 专题热度 -->
    <div class="grid-2">
      <div class="card">
        <div class="card-title">重点阅读</div>
        <div class="bh-brief-list">
          <div v-for="item in priorityItems.slice(0, 3)" :key="item.id" class="bh-brief-item">
            <div class="bh-brief-meta">{{ uploadDateOf(item) }} · {{ topicName(item.topicId) }}</div>
            <div class="bh-brief-row">
              <strong class="bh-brief-title">{{ item.title }}</strong>
              <div class="bh-brief-actions">
                <span class="bh-pill" :class="isAssignment(item) ? 'pill-assign' : 'pill-routine'">
                  {{ materialTypeOf(item) }}
                </span>
                <button class="icon-btn" @click="openPreview(item)">立即查看</button>
              </div>
            </div>
            <p class="bh-summary"><span class="bh-summary-label">摘要</span>{{ item.summary }}</p>
          </div>
          <div v-if="priorityItems.length === 0" class="empty-state">暂无材料</div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">专题热度</div>
        <div class="bh-heat-list">
          <div v-for="t in topicHeat" :key="t.id" class="bh-heat-row">
            <span class="bh-heat-name">{{ t.name }}</span>
            <div class="bh-bar-wrap">
              <div class="bh-bar-fill" :style="{ width: Math.max(8, t.count / maxTopicCount * 100) + '%' }"></div>
            </div>
            <strong class="bh-heat-count">{{ t.count }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import BhMatCard from './BhMatCard.vue'
import {
  topics, materials, materialsLoading,
  allWeeks, currentWeek,
  uploadDateOf, topicName, materialTypeOf, isAssignment, sortDesc,
  loadTopics, loadMaterials,
  openPreview, downloadSingle
} from '../composables/useBriefHub.js'

const assignmentOnly = ref(false)
const dashWeek = ref('')
const dashWeekActual = computed(() => dashWeek.value || currentWeek.value)

onMounted(async () => {
  await Promise.all([loadTopics(), loadMaterials()])
  if (allWeeks.value.length) dashWeek.value = allWeeks.value[0]
})

const weekMaterials   = computed(() => materials.value.filter(m => m.week === currentWeek.value))
const assignmentCount = computed(() => materials.value.filter(isAssignment).length)

const dashboardList = computed(() => {
  let list = materials.value.filter(m => m.week === dashWeekActual.value)
  if (assignmentOnly.value) list = list.filter(isAssignment)
  return list.slice().sort(sortDesc)
})

const priorityItems = computed(() => materials.value.slice().sort(sortDesc))

const topicHeat = computed(() =>
  topics.value.map(t => ({ ...t, count: materials.value.filter(m => m.topicId === t.id).length }))
)
const maxTopicCount = computed(() => Math.max(...topicHeat.value.map(t => t.count), 1))
</script>

<style scoped>
.bh-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; flex-wrap: wrap; }
.bh-toolbar    { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.bh-select     { min-height: 36px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font-size: 13px; }
.bh-check-label { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); cursor: pointer; white-space: nowrap; }
.bh-check-label input { accent-color: var(--blue); width: 14px; height: 14px; }
.bh-list       { display: grid; gap: 12px; }

.bh-brief-list { display: grid; gap: 12px; }
.bh-brief-item { padding: 12px; border-left: 3px solid var(--border-strong); border-radius: 0 8px 8px 0; background: var(--surface-soft); }
.bh-brief-meta { font-size: 12px; color: var(--muted); font-weight: 700; margin-bottom: 6px; }
.bh-brief-row  { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.bh-brief-title  { font-size: 15px; line-height: 1.4; color: var(--text); }
.bh-brief-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.bh-summary      { margin: 6px 0 0; font-size: 14px; color: var(--muted); line-height: 1.6; }
.bh-summary-label { display: inline-flex; align-items: center; min-height: 20px; margin-right: 6px; padding: 0 6px; border-radius: 4px; background: var(--border); color: var(--faint); font-size: 11px; font-weight: 700; }
.bh-pill { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border-radius: 4px; background: var(--blue-soft); color: var(--blue); font-size: 12px; font-weight: 600; border: 1px solid rgba(31,95,232,0.18); }
.pill-assign  { background: rgba(201,48,48,0.08); color: var(--bad); border-color: rgba(201,48,48,0.15); }
.pill-routine { background: rgba(14,143,88,0.08); color: var(--green); border-color: rgba(14,143,88,0.15); }

.bh-heat-list  { display: grid; gap: 10px; }
.bh-heat-row   { display: grid; grid-template-columns: minmax(120px, 180px) 1fr 36px; gap: 10px; align-items: center; }
.bh-heat-name  { font-size: 14px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bh-bar-wrap   { height: 8px; border-radius: 999px; background: var(--border); overflow: hidden; }
.bh-bar-fill   { height: 100%; border-radius: 999px; background: var(--blue); transition: width 0.4s ease; }
.bh-heat-count { font-size: 14px; font-weight: 700; color: var(--text); text-align: right; }
</style>
