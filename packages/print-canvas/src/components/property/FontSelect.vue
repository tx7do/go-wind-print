<template>
  <div class="font-select">
    <input
      ref="inputRef"
      v-model="text"
      class="pd-input font-select-input"
      type="text"
      role="combobox"
      aria-autocomplete="list"
      autocomplete="off"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="activeRowId"
      @focus="onOpen"
      @click="onClick"
      @input="onInput"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter.prevent="onEnter"
      @keydown.esc.prevent="onCancel"
      @blur="onCancel"
    />
    <ul
      v-if="open"
      :id="listId"
      ref="listRef"
      class="font-select-list"
      :class="{ 'is-up': placement === 'up' }"
      role="listbox"
    >
      <li
        v-for="(row, index) in rows"
        :id="`${listId}-${index}`"
        :key="row.key"
        class="font-select-option"
        :class="{ 'is-active': index === highlighted, 'is-muted': row.kind === 'unknown' || row.kind === 'free' }"
        role="option"
        :aria-selected="row.selected"
        @mousedown.prevent="pick(row)"
      >{{ row.label }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { resolveOverlayPlacement, type OverlayPlacement } from '@go-wind/print-core/designer'
import {
  filterFontOptions,
  findFontOption,
  fontOptionLabel,
  normalizeFontQuery,
  useInjectedFontCatalog,
} from '../../composables/useFontCatalog'

const props = withDefaults(defineProps<{
  /** 当前族名；undefined 表示未设置，走全局兜底字体栈 */
  modelValue?: string
  /** 空值行文案（同时用作输入框 placeholder） */
  placeholder?: string
  /** 禁用（如格式工具栏无可用目标时置灰） */
  disabled?: boolean
}>(), {
  placeholder: '默认',
  disabled: false,
})

const emit = defineEmits<{ 'update:model-value': [value: string | undefined] }>()

const catalog = useInjectedFontCatalog()

/** 每实例独立的列表 id，供 combobox 的 aria 关联使用 */
const listId = `font-select-list-${useId()}`

const listRef = ref<HTMLUListElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
/** 展开档：可用区取最近裁剪祖先与视口的交集，下方装不下且上方更宽时向上翻 */
const placement = ref<OverlayPlacement>('down')
/** 输入框显示值：未提交时与 modelValue 不一致，提交或取消后回到 modelValue 的展示名 */
const text = ref(toDisplayName(props.modelValue))
/** 过滤词：展开时为空表示「列出全部」 */
const query = ref('')
const open = ref(false)
/** 高亮行下标；-1 表示无高亮（此时 Enter 不提交任何东西） */
const highlighted = ref(-1)

interface FontRow {
  key: string
  kind: 'clear' | 'unknown' | 'font' | 'free'
  label: string
  /** 提交值；clear 行为 undefined */
  value?: string
  selected: boolean
}

/**
 * 模板当前值不在声明字体内时（如导入了使用系统字体的旧模板）必须保留一行，
 * 否则设计者会以为该字体在打开面板时被清掉了。
 */
const unknownFamily = computed(() => {
  const current = props.modelValue?.trim()
  if (!current) return ''
  return findFontOption(catalog.value, current) ? '' : current
})

const rows = computed<FontRow[]>(() => {
  const current = (props.modelValue ?? '').trim()
  const make = (kind: FontRow['kind'], key: string, label: string, value?: string): FontRow => ({
    kind,
    key,
    label,
    value,
    selected: (value ?? '') === current,
  })

  const typed = query.value.trim()
  // 过滤时不展示空值行与未知行：此时 Enter 应当落在命中项或用户输入的字体名上
  if (!typed) {
    const out: FontRow[] = [make('clear', '__clear__', props.placeholder)]
    if (unknownFamily.value) {
      out.push(make('unknown', '__unknown__', `${unknownFamily.value}（未知）`, unknownFamily.value))
    }
    for (const font of catalog.value) {
      out.push(make('font', font.family, fontOptionLabel(font), font.family))
    }
    return out
  }

  const matched = filterFontOptions(catalog.value, typed).map(font =>
    make('font', font.family, fontOptionLabel(font), font.family),
  )
  // 清单外字体名可直接录入：一条都没命中时才补「使用「xxx」」，
  // 有命中项时补这行只会成为方向键路径上的噪音。
  if (!matched.length) {
    const family = resolveTypedFamily(typed)
    matched.push(make('free', '__free__', `使用「${family}」`, family))
  }
  return matched
})

/** 输入的是展示名（label）时，写进模板的必须是真实族名，否则字体静默失效 */
function resolveTypedFamily(typed: string): string {
  const key = normalizeFontQuery(typed)
  const hit = catalog.value.find(font => font.label && normalizeFontQuery(font.label) === key)
  return hit?.family ?? typed
}

/**
 * 展示名：宿主用 prop 声明了 label 的字体在输入框里显示 label（业务名），
 * 便于识别；写入模板的始终是族名，展示与存储分离。
 */
function toDisplayName(family?: string): string {
  const key = family?.trim()
  if (!key) return ''
  return findFontOption(catalog.value, key)?.label ?? key
}

const activeRowId = computed(() =>
  open.value && highlighted.value >= 0 ? `${listId}-${highlighted.value}` : undefined,
)

/** 当前值所在行；用于展开时把高亮落在已选字体上，避免误按 Enter 改掉字体 */
function currentRowIndex(): number {
  const current = (props.modelValue ?? '').trim()
  return rows.value.findIndex(row => (row.value ?? '') === current)
}

function onOpen(): void {
  if (open.value) return
  open.value = true
  query.value = ''
  highlighted.value = currentRowIndex()
}

/** 点击输入框只负责重新展开（Esc 收起后再次点开），不改动已输入内容 */
function onClick(): void {
  open.value = true
}

function onInput(): void {
  open.value = true
  query.value = text.value
  highlighted.value = rows.value.length ? 0 : -1
}

function move(delta: number): void {
  if (!open.value) {
    onOpen()
    return
  }
  const last = rows.value.length - 1
  if (last < 0) return
  highlighted.value = Math.min(Math.max(highlighted.value + delta, 0), last)
  scrollActiveIntoView()
}

function scrollActiveIntoView(): void {
  void nextTick(() => {
    const el = listRef.value?.children[highlighted.value] as HTMLElement | undefined
    el?.scrollIntoView?.({ block: 'nearest' })
  })
}

/** 只取最近的一层裁剪祖先：更外层已被它的滚动裁住，再往外量没有意义 */
function measureBoundary(el: HTMLElement): { top: number; bottom: number } {
  const bottom = window.innerHeight
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    const oy = getComputedStyle(node).overflowY
    if (oy === 'auto' || oy === 'scroll' || oy === 'hidden' || oy === 'clip') {
      const r = node.getBoundingClientRect()
      return { top: Math.max(0, r.top), bottom: Math.min(bottom, r.bottom) }
    }
  }
  return { top: 0, bottom }
}

/** 列表已脱离文档流，这里只决定朝上还是朝下展开，避免长清单贴底被截断 */
async function applyPlacement(): Promise<void> {
  await nextTick()
  const input = inputRef.value
  const list = listRef.value
  if (!input || !list) return
  const trigger = input.getBoundingClientRect()
  const boundary = measureBoundary(input)
  placement.value = resolveOverlayPlacement({
    triggerTop: trigger.top,
    triggerBottom: trigger.bottom,
    overlayHeight: list.getBoundingClientRect().height,
    boundaryTop: boundary.top,
    boundaryBottom: boundary.bottom,
  })
}

// 展开与过滤都会改变列表高度，两者都要重判一档
watch([open, () => rows.value.length], () => {
  if (open.value) void applyPlacement()
})

function onEnter(): void {
  if (!open.value) return
  const row = rows.value[highlighted.value]
  if (row) {
    pick(row)
    return
  }
  const typed = query.value.trim()
  if (typed) {
    const family = resolveTypedFamily(typed)
    pick({ kind: 'free', key: '__free__', label: family, value: family, selected: false })
  }
}

function pick(row: FontRow): void {
  text.value = toDisplayName(row.value)
  query.value = ''
  open.value = false
  highlighted.value = -1
  emit('update:model-value', row.value)
}

function onCancel(): void {
  open.value = false
  query.value = ''
  highlighted.value = -1
  text.value = toDisplayName(props.modelValue)
}

watch(() => props.modelValue, value => { text.value = toDisplayName(value) })
</script>

<style scoped>
.font-select {
  position: relative;
}
.font-select-input {
  /* 块级：inline-block 会按基线排进行盒，外层因此多出降部空间，
     浮层的 top:100% 连这段一起算，列表与输入框之间就出现可见空隙 */
  display: block;
  width: 100%;
}
/* 候选列表必须是浮层：顶栏行高钉死 50px、属性台分组 overflow:hidden，
   占文档流会把宿主撑变形（Gitee #IKP3MU）。观感参数对齐 ToolbarDropdown 的下拉面板。 */
.font-select-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  min-width: 150px;
  z-index: 200;
  /* UA 给 ul 的 1em 外边距在脱离文档流后不再被折叠吸收，会把列表顶开 */
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
  padding: 2px;
  border: 1px solid var(--pd-border, #d9dde6);
  border-radius: 6px;
  background: var(--pd-surface, #ffffff);
  box-shadow: var(--pd-shadow-md, 0 2px 8px rgba(23, 32, 60, .06), 0 10px 28px rgba(23, 32, 60, .07));
  list-style: none;
}
.font-select-list.is-up {
  top: auto;
  bottom: calc(100% + 4px);
}
.font-select-option {
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.font-select-option.is-active {
  background: var(--pd-sidebar-hover, #f0f3f9);
}
.font-select-option.is-muted {
  color: var(--pd-text-muted, #8b909c);
}
</style>
