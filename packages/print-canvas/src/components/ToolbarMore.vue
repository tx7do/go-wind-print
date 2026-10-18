<!-- 「更多」下拉：承载被收纳单元的落位槽。
     面板必须常驻 DOM（keep-mounted），否则 Teleport 目标随开合消失，收纳单元会被丢回行内。 -->
<template>
  <div v-if="ctx" v-show="hasMoved" class="tb-group tb-more-group">
    <ToolbarDropdown test-id="more-dd" tip="更多" keep-mounted panel-class="tb-more-panel">
      <template #trigger>
        <Ellipsis :size="15" />
        <span class="tb-btn-text">更多</span>
      </template>
      <div class="tb-menu tb-more-menu">
        <div
          v-for="unit in chain"
          :key="unit.id"
          v-show="movedIds.has(unit.id)"
          class="tb-more-item"
          :data-unit="unit.id"
        >
          <div class="tb-menu-label">{{ unit.label }}</div>
          <div :id="moreSlotId(unit.id)" class="tb-more-slot" :data-unit="unit.id" />
        </div>
      </div>
    </ToolbarDropdown>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Ellipsis } from 'lucide-vue-next'
import ToolbarDropdown from './ToolbarDropdown.vue'
import { moreSlotId, useToolbarOverflow } from '../composables/useToolbarOverflow'

const ctx = useToolbarOverflow()

const hasMoved = computed(() => !!ctx && ctx.hasMoved.value)
const chain = computed(() => ctx?.chain.value ?? [])
const movedIds = computed(() => ctx?.movedIds.value ?? new Set<string>())
</script>

<style scoped>
.tb-more-group {
  flex-shrink: 0;
}
.tb-more-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  max-height: min(70vh, 520px);
}
.tb-more-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tb-menu-label {
  font-size: 11px;
  color: var(--pd-text-muted, #8b909c);
  padding-left: 2px;
}
/* 落位槽承接 teleport 进来的原分组，保持其横排形态不加额外宽度 */
.tb-more-slot {
  display: flex;
  align-items: center;
}
</style>
