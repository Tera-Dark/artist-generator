<script setup lang="ts">
import { nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { ImageOff, LoaderCircle } from 'lucide-vue-next'
import { getArtistPreview, getThumbnailSource, previewVariantCandidates } from '@/data/danbooru'
import type { PreviewVariant } from '@/data/localDatabase'
import type { ImageQuality } from '@/composables/usePreferences'

const props = defineProps<{ name: string; quality: ImageQuality }>()
const frame = ref<HTMLElement | null>(null)
const imageSrc = ref('')
const imageRatio = ref(1.2)
const actualQuality = ref<ImageQuality>('low')
const postUrl = ref('')
const status = ref<'idle' | 'loading' | 'empty' | 'error' | 'ready'>('idle')
let observer: IntersectionObserver | null = null
let controller: AbortController | null = null
let objectUrl = ''
let choices: (PreviewVariant & { quality: ImageQuality })[] = []
let choiceIndex = 0
const qualityLabel: Record<ImageQuality, string> = { low: '180', balanced: '360', high: '720' }

function releaseImage() {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = ''
  imageSrc.value = ''
}
function reset() {
  observer?.disconnect()
  controller?.abort()
  releaseImage()
  choices = []
  imageRatio.value = 1.2
  status.value = 'idle'
  void nextTick(observe)
}

async function displayChoice(signal: AbortSignal): Promise<void> {
  const choice = choices[choiceIndex]
  if (!choice) { status.value = 'error'; return }
  imageRatio.value = Math.max(0.68, Math.min(1.7, choice.width / choice.height))
  actualQuality.value = choice.quality
  try {
    const src = await getThumbnailSource(choice.url, signal)
    if (signal.aborted) { if (src.startsWith('blob:')) URL.revokeObjectURL(src); return }
    releaseImage()
    imageSrc.value = src
    if (src.startsWith('blob:')) objectUrl = src
    status.value = 'ready'
  } catch {
    if (signal.aborted) return
    choiceIndex++
    await displayChoice(signal)
  }
}

function onImageError() {
  releaseImage()
  choiceIndex++
  if (choices[choiceIndex] && controller && !controller.signal.aborted) {
    status.value = 'loading'
    void displayChoice(controller.signal)
  } else status.value = 'error'
}

async function load() {
  if (status.value === 'loading' || status.value === 'ready') return
  status.value = 'loading'
  controller = new AbortController()
  const signal = controller.signal
  try {
    const record = await getArtistPreview(props.name, signal, props.quality)
    if (signal.aborted) return
    choices = previewVariantCandidates(record, props.quality)
    if (!choices.length || !record.postId) { status.value = 'empty'; return }
    choiceIndex = 0
    postUrl.value = `https://danbooru.donmai.us/posts/${record.postId}`
    await displayChoice(signal)
  } catch {
    if (!signal.aborted) status.value = 'error'
  }
}

function observe() {
  if (status.value !== 'idle' || !frame.value) return
  if (!('IntersectionObserver' in window)) { void load(); return }
  observer?.disconnect()
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { observer?.disconnect(); void load() }
  }, { rootMargin: '150px' })
  observer.observe(frame.value)
}

watch(() => props.quality, reset)
onMounted(observe)
onActivated(observe)
onDeactivated(() => { observer?.disconnect(); controller?.abort(); if (status.value === 'loading') status.value = 'idle' })
onUnmounted(() => { observer?.disconnect(); controller?.abort(); releaseImage() })
</script>

<template>
  <div ref="frame" class="artwork-frame" :style="{ aspectRatio: String(imageRatio) }">
    <a v-if="status === 'ready' && imageSrc" :href="postUrl" target="_blank" rel="noopener noreferrer" :aria-label="`在 Danbooru 查看 ${name} 的作品`">
      <img :src="imageSrc" :alt="`${name} 的最新全年龄作品预览图`" loading="lazy" decoding="async" @error="onImageError" />
    </a>
    <div v-else-if="status === 'loading'" class="artwork-fallback artwork-loading" role="status" :aria-label="`${name} 图片加载中`">
      <LoaderCircle :size="19" class="spin" aria-hidden="true" /><span>正在获取预览图</span>
    </div>
    <div v-else-if="status === 'error'" class="artwork-fallback">
      <ImageOff :size="21" aria-hidden="true" /><button type="button" @click="load">加载失败 · 重试</button>
    </div>
    <div v-else class="artwork-fallback"><ImageOff :size="21" aria-hidden="true" /><span>{{ status === 'empty' ? '暂无全年龄作品' : '等待加载' }}</span></div>
    <span v-if="status === 'ready'" class="rating-label">G · {{ qualityLabel[actualQuality] }} px</span>
  </div>
</template>
