<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-vue-next'

type TourTab = 'workspace' | 'library' | 'saved' | 'settings'
const emit = defineEmits<{ navigate: [tab: TourTab]; close: [completed: boolean] }>()
const steps: { tab: TourTab; target: string; title: string; body: string }[] = [
  { tab: 'workspace', target: '.composer-heading', title: '欢迎来到画师串生成器', body: '生成、编辑和保存都在这个浏览器完成；不需要账号。接下来用一分钟认识常用功能。' },
  { tab: 'workspace', target: '[data-tour="count"]', title: '按需要选人数', body: '指定人数，或让每次在一个区间内随机。安全上限默认 99 位，也可以在设置中调低。' },
  { tab: 'workspace', target: '[data-tour="editor"]', title: '现有画师串也能继续改', body: '粘贴自己的串或带入结果，去权重、重随强调强度，并转换为纯文本、标准、创意括号或 NAI。' },
  { tab: 'library', target: '[data-tour="library"]', title: '用别名和条件找到画师', body: '输入多个画师名或别名，切换「且 / 或」匹配，再按作品数量与别名筛选。瀑布流仅请求屏幕附近的图片。' },
  { tab: 'saved', target: '.saved-controlbar', title: '历史与收藏留在本地', body: '生成自动进入历史，重要的串可以收藏。「我的串」还支持版本化 JSON 导入导出，建议定期备份。' },
  { tab: 'settings', target: '[data-tour="settings"]', title: '最后，调成你的习惯', body: '在设置中选择图片精度、瀑布流密度、自动复制等选项；也可以随时从这里重看本引导。' },
]

const current = ref(0)
const dialog = ref<HTMLElement | null>(null)
const viewport = ref({ width: window.innerWidth, height: window.innerHeight })
const spot = ref({ left: 0, top: 0, width: 0, height: 0 })
const card = ref({ left: 16, top: 16, width: 360 })
const step = computed(() => steps[current.value]!)
function targetElement() {
  // On short phones the entire filter toolbar and dialog cannot both fit above the fold.
  const selector = step.value.tab === 'library' && window.innerWidth <= 640 && window.innerHeight < 700
    ? '.library-toolbar .search-box' : step.value.target
  return document.querySelector<HTMLElement>(selector)
}
let operation = 0
let resizeFrame = 0

const shade = computed(() => {
  const { left, top, width, height } = spot.value
  const right = left + width, bottom = top + height
  const { width: vw, height: vh } = viewport.value
  return [
    { left: 0, top: 0, width: vw, height: Math.max(0, top) },
    { left: 0, top: bottom, width: vw, height: Math.max(0, vh - bottom) },
    { left: 0, top, width: Math.max(0, left), height },
    { left: right, top, width: Math.max(0, vw - right), height },
  ]
})

function measure() {
  viewport.value = { width: window.innerWidth, height: window.innerHeight }
  const target = targetElement()
  if (!target) return
  const rect = target.getBoundingClientRect()
  const width = viewport.value.width, height = viewport.value.height
  const left = Math.max(8, Math.min(width - 24, rect.left - 7))
  const top = Math.max(8, Math.min(height - 24, rect.top - 7))
  const right = Math.min(width - 8, rect.right + 7)
  const bottom = Math.min(height - 8, rect.bottom + 7)
  spot.value = { left, top, width: Math.max(16, right - left), height: Math.max(16, bottom - top) }

  const cardWidth = Math.min(380, width - 32)
  const cardHeight = dialog.value?.offsetHeight || 218
  const gap = 13
  let cardTop = bottom + gap
  if (cardTop + cardHeight > height - 16) cardTop = top - cardHeight - gap
  if (cardTop < 16) cardTop = height - cardHeight - 16
  card.value = {
    top: Math.max(16, cardTop), width: cardWidth,
    left: Math.min(width - cardWidth - 16, Math.max(16, rect.left)),
  }
}

async function activate() {
  const sequence = ++operation
  emit('navigate', step.value.tab)
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  if (sequence !== operation) return
  const target = targetElement()
  if (target) {
    if (window.innerWidth <= 640) {
      const header = document.querySelector<HTMLElement>('.site-header')?.getBoundingClientRect().bottom || 0
      window.scrollBy({ top: target.getBoundingClientRect().top - header - 24, behavior: 'instant' })
    } else target.scrollIntoView({ block: 'center', behavior: 'instant' })
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  if (sequence !== operation) return
  measure()
  await nextTick()
  dialog.value?.focus({ preventScroll: true })
}

function scheduleMeasure() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(measure)
}
function advance() {
  if (current.value === steps.length - 1) emit('close', true)
  else current.value++
}
function back() { if (current.value > 0) current.value-- }

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close', false); return }
  if (event.key !== 'Tab' || !dialog.value) return
  const focusable = [...dialog.value.querySelectorAll<HTMLElement>('button:not([disabled])')]
  if (!focusable.length) return
  const first = focusable[0]!, last = focusable[focusable.length - 1]!
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.value)) {
    event.preventDefault(); last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.value)) {
    event.preventDefault(); first.focus()
  }
}

watch(current, () => { void activate() })
onMounted(() => {
  window.addEventListener('resize', scheduleMeasure)
  window.addEventListener('scroll', scheduleMeasure, { passive: true })
  window.addEventListener('keydown', onKeyDown)
  void activate()
})
onUnmounted(() => {
  operation++
  cancelAnimationFrame(resizeFrame)
  window.removeEventListener('resize', scheduleMeasure)
  window.removeEventListener('scroll', scheduleMeasure)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="tour-layer">
    <div v-for="(rect, index) in shade" :key="index" class="tour-shade" :style="{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }"></div>
    <div class="tour-focus" :style="{ left: `${spot.left}px`, top: `${spot.top}px`, width: `${spot.width}px`, height: `${spot.height}px` }" aria-hidden="true"></div>
    <div class="tour-hitbox" :style="{ left: `${spot.left}px`, top: `${spot.top}px`, width: `${spot.width}px`, height: `${spot.height}px` }"></div>
    <section ref="dialog" class="tour-dialog" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description" tabindex="-1" :style="{ left: `${card.left}px`, top: `${card.top}px`, width: `${card.width}px` }">
      <div class="tour-dialog-top"><span>QUICK TOUR <span aria-hidden="true">·</span> {{ current + 1 }} / {{ steps.length }}</span><button type="button" aria-label="跳过新手引导" @click="emit('close', false)"><X :size="18" /></button></div>
      <div class="tour-progress" aria-hidden="true"><span :style="{ width: `${(current + 1) / steps.length * 100}%` }"></span></div>
      <h2 id="tour-title">{{ step.title }}</h2>
      <p id="tour-description">{{ step.body }}</p>
      <div class="tour-dialog-actions">
        <button v-if="current > 0" type="button" @click="back"><ArrowLeft :size="15" /> 上一步</button>
        <button v-else type="button" @click="emit('close', false)">暂时跳过</button>
        <button type="button" class="tour-next" @click="advance">{{ current === steps.length - 1 ? '开始使用' : '下一步' }} <Check v-if="current === steps.length - 1" :size="16" /><ArrowRight v-else :size="16" /></button>
      </div>
    </section>
  </div>
</template>
