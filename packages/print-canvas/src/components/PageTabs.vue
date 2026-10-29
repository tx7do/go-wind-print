<template>
  <div class="page-tabs" @mouseover="onTipOver" @mouseout="onTipOut" @mouseleave="hideTip">
    <div class="page-tabs-list">
      <template v-for="(p, i) in pages" :key="i">
        <input
          v-if="editingIndex === i"
          v-model="renameText"
          class="page-tab-rename"
          data-test="page-rename-input"
          @blur="commitRename(i)"
          @keydown.enter="commitRename(i)"
          @keydown.esc="cancelRename"
        />
        <button
          v-else
          class="page-tab"
          :class="{ active: i === activeIndex }"
          :data-tip="p.name ? `${p.name}（双击重命名）` : '双击重命名'"
          @click="$emit('select', i)"
          @dblclick="startRename(i)"
        >
          {{ p.name || `页面 ${i + 1}` }}
        </button>
      </template>
    </div>
    <div class="page-tabs-actions">
      <button data-test="add-page" :data-tip="addTip" :disabled="tilingEnabled" @click="$emit('add')">＋</button>
      <button data-test="duplicate-page" :data-tip="duplicateTip" :disabled="tilingEnabled" @click="$emit('duplicate')">⧉</button>
      <button data-test="delete-page" :data-tip="multi ? `删除当前页「${activeName}」` : '仅多页面模板可删除页面'" :disabled="!multi" @click="$emit('delete', activeIndex)">✕</button>
      <button data-test="move-left" :data-tip="`前移「${activeName}」`" :disabled="activeIndex <= 0" @click="$emit('move', activeIndex, activeIndex - 1)">←</button>
      <button data-test="move-right" :data-tip="`后移「${activeName}」`" :disabled="activeIndex >= pages.length - 1" @click="$emit('move', activeIndex, activeIndex + 1)">→</button>
    </div>
    <!-- 自定义 tooltip：fixed 定位挂在本组件根下，不受页签列表 overflow 裁剪，z-index 高于画布各层 -->
    <div v-if="tip" ref="tipEl" class="pd-hover-tip" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">{{ tip.text }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TemplateData } from '@go-wind/print-core/designer'
import { TILING_SINGLE_PAGE_TIP } from '../composables/useDesignerState'
import { useHoverTip } from '../composables/useHoverTip'

const props = defineProps<{
  pages: TemplateData[]
  activeIndex: number
  /** 多页模式（≥2 页）才可删除；单页回落单模板 */
  multi: boolean
  /** 已开启拼版：拼版模板只允许一个设计页面，禁用增页入口 */
  tilingEnabled?: boolean
}>()

const emit = defineEmits<{
  select: [index: number]
  add: []
  duplicate: []
  delete: [index: number]
  rename: [index: number, name: string]
  move: [from: number, to: number]
}>()

// 行内重命名：双击页签进入编辑，blur/Enter 提交，Esc 取消
const editingIndex = ref(-1)
const renameText = ref('')

/** 当前激活页名：用于操作按钮 tooltip 的上下文提示 */
const activeName = computed(() => props.pages[props.activeIndex]?.name || `页面 ${props.activeIndex + 1}`)

/** 增页按钮 tooltip：拼版开启时改为「不可增页」的原因说明 */
const addTip = computed(() =>
  props.tilingEnabled ? TILING_SINGLE_PAGE_TIP : '新增页面（在当前页后追加空白页）')
const duplicateTip = computed(() =>
  props.tilingEnabled ? TILING_SINGLE_PAGE_TIP : `复制当前页「${activeName.value}」`)

function startRename(i: number) {
  editingIndex.value = i
  renameText.value = props.pages[i]?.name ?? ''
}

function commitRename(i: number) {
  if (editingIndex.value !== i) return
  const name = renameText.value.trim()
  if (name) emit('rename', i, name)
  editingIndex.value = -1
}

function cancelRename() {
  editingIndex.value = -1
}

// 自定义 tooltip：与素材台字段树共用 useHoverTip（浮层形态见 native-controls.css 的 .pd-hover-tip）
const { tip, tipEl, onTipOver, onTipOut, hideTip } = useHoverTip()
</script>

<style scoped>
.page-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--pd-sidebar, #fff);
  border-bottom: 1px solid var(--pd-border, #d9dde6);
  flex-shrink: 0;
}
.page-tabs-list {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  align-items: center;
}
.page-tab {
  padding: 4px 12px;
  border: 1px solid var(--pd-border, #d9dde6);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  color: var(--pd-text, #2a2e37);
  font-size: 12px;
}
.page-tab.active {
  background: var(--pd-accent, #165DFF);
  color: #fff;
}
.page-tab-rename {
  padding: 4px 8px;
  width: 96px;
  border: 1px solid var(--pd-accent, #165DFF);
  border-radius: 4px;
  font-size: 12px;
  color: var(--pd-text, #2a2e37);
  outline: none;
}
.page-tabs-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}
.page-tabs-actions button {
  padding: 4px 8px;
  border: 1px solid var(--pd-border, #d9dde6);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--pd-text-muted, #8b909c);
  font-size: 12px;
  line-height: 1;
}
.page-tabs-actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
