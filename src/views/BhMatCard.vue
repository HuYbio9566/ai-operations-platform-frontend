<template>
  <article class="bh-mat-card">
    <div class="bh-mat-main">
      <div class="bh-mat-meta">
        <span class="bh-pill">{{ item.week }}</span>
        <span class="bh-pill">上传日期 {{ uploadDate }}</span>
        <span class="bh-pill">{{ parentName }} / {{ tName }}</span>
        <span class="bh-pill" :class="isAssign ? 'pill-assign' : 'pill-routine'">{{ item.materialType || '定期更新' }}</span>
        <span v-if="item.updateCadence" class="bh-pill pill-cadence">{{ item.updateCadence }}</span>
        <span v-if="item.versionLabel"  class="bh-pill pill-version">{{ item.versionLabel }}</span>
      </div>
      <div class="bh-mat-title-row">
        <h4 class="bh-mat-title">{{ item.title }}</h4>
        <div class="bh-mat-actions">
          <button class="icon-btn icon-btn-primary" @click="$emit('preview', item)">查看</button>
          <button class="icon-btn" @click="$emit('download', item)">下载 HTML</button>
          <button v-if="props.canReplace" class="icon-btn" @click="$emit('replace', item)">替换</button>
        </div>
      </div>
      <p class="bh-mat-summary">
        <span class="bh-summary-label">摘要</span>{{ item.summary || '暂无摘要' }}
      </p>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { topics } from '../composables/useBriefHub.js'

const props = defineProps({
  item: { type: Object, required: true },
  canReplace: { type: Boolean, default: false },
})
defineEmits(['preview', 'download', 'replace'])

const tName      = computed(() => topics.value.find(t => t.id === props.item.topicId)?.name   || '未分类')
const parentName = computed(() => topics.value.find(t => t.id === props.item.topicId)?.parent || '未分类')
const uploadDate = computed(() => props.item.uploadDate || (props.item.date || '').replaceAll('-', ''))
const isAssign   = computed(() => (props.item.materialType || '') === '交办任务')
</script>

<style scoped>
.bh-mat-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-soft);
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  overflow: hidden;
}
.bh-mat-card:hover {
  border-color: var(--blue);
  box-shadow: 0 8px 28px rgba(47,107,255,0.12);
  transform: translateY(-1px);
}
.bh-mat-main { padding: 14px 16px; display: grid; gap: 8px; }
.bh-mat-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.bh-mat-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.bh-mat-title { margin: 0; font-size: 16px; font-weight: 700; color: var(--text); line-height: 1.4; }
.bh-mat-actions { display: flex; gap: 6px; flex-shrink: 0; }
.bh-mat-summary { margin: 0; color: var(--text); font-size: 14px; line-height: 1.65; }

.bh-pill {
  display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px;
  border-radius: 4px; background: var(--blue-soft); color: var(--blue);
  font-size: 12px; font-weight: 600; border: 1px solid rgba(31,95,232,0.18);
}
.pill-assign  { background: rgba(201,48,48,0.08); color: var(--bad);  border-color: rgba(201,48,48,0.15); }
.pill-routine { background: rgba(14,143,88,0.08);  color: var(--green); border-color: rgba(14,143,88,0.15); }
.pill-cadence { background: var(--surface-soft);   color: var(--text); border-color: var(--border); }
.pill-version { background: var(--surface-soft);   color: var(--text); border-color: var(--border); }

.bh-summary-label {
  display: inline-flex; align-items: center; min-height: 20px;
  margin-right: 6px; padding: 0 6px; border-radius: 4px;
  background: var(--border); color: var(--text); font-size: 11px; font-weight: 700;
}
.icon-btn {
  background: var(--surface-soft); border: 1px solid var(--border); color: var(--text);
  font-size: 12px; padding: 5px 12px; border-radius: 8px; cursor: pointer; transition: all 0.15s;
}
.icon-btn:hover { background: var(--blue); border-color: var(--blue); color: #fff; }
.icon-btn-primary {
  background: var(--blue) !important;
  border-color: var(--blue) !important;
  color: #fff !important;
}
.icon-btn-primary:hover { background: #1a55e8 !important; border-color: #1a55e8 !important; }
</style>
