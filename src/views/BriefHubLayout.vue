<template>
  <div>
    <router-view />

    <!-- 全局预览弹窗 -->
    <Teleport to="body">
      <div v-if="previewItem" class="bh-backdrop" @click.self="closePreview">
        <div class="bh-modal">
          <div class="bh-modal-head">
            <div>
              <div class="bh-modal-meta">{{ topicName(previewItem.topicId) }}</div>
              <h3 class="bh-modal-title">{{ previewItem.title }}</h3>
            </div>
            <div class="bh-modal-actions">
              <button class="icon-btn" @click="downloadSingle(previewItem)">下载 HTML</button>
              <button class="icon-btn" @click="closePreview">关闭</button>
            </div>
          </div>
          <iframe
            class="bh-modal-frame"
            :srcdoc="previewSrcdoc"
            title="原文预览"
            sandbox="allow-same-origin allow-scripts"
          ></iframe>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { previewItem, previewSrcdoc, closePreview, downloadSingle, topicName } from '../composables/useBriefHub.js'
</script>

<style scoped>
.bh-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(5,8,15,0.75); backdrop-filter: blur(6px);
  display: flex; align-items: stretch; justify-content: stretch; padding: 24px;
}
.bh-modal {
  display: grid; grid-template-rows: auto 1fr; width: 100%;
  border-radius: 16px; overflow: hidden;
  border: 1px solid var(--border); background: #fff;
  box-shadow: 0 32px 100px rgba(0,0,0,0.45);
}
.bh-modal-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; padding: 14px 16px 14px 18px;
  border-bottom: 1px solid var(--border-strong); background: var(--surface-soft);
}
.bh-modal-meta  { font-size: 12px; color: var(--cyan); font-weight: 700; margin-bottom: 4px; }
.bh-modal-title { margin: 0; font-size: 17px; color: var(--text); font-weight: 700; line-height: 1.35; }
.bh-modal-actions { display: flex; gap: 8px; flex-shrink: 0; }
.bh-modal-frame { width: 100%; height: 100%; border: 0; background: #fff; }
.icon-btn {
  background: var(--surface); border: 1px solid var(--border-strong); color: var(--muted);
  font-size: 12px; padding: 5px 12px; border-radius: 8px; cursor: pointer; transition: all 0.15s;
}
.icon-btn:hover { background: var(--blue); border-color: var(--blue); color: #fff; }
</style>
