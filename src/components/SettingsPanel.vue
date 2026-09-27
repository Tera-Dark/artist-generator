<script setup lang="ts">
import { ref } from 'vue'
import { BookOpen, Check, Image, RotateCcw, Settings2, ShieldCheck, Sparkles, Trash2 } from 'lucide-vue-next'
import { HARD_MAX_ARTISTS } from '@/core/generator'
import { normalizeGeneratorPreferences, resetPreferences, usePreferences } from '@/composables/usePreferences'
import { clearArtworkCache } from '@/data/danbooru'

const props = defineProps<{ themeChoice: 'system' | 'light' | 'dark' }>()
const emit = defineEmits<{ setTheme: [value: 'system' | 'light' | 'dark']; replayTour: [] }>()
const preferences = usePreferences()
const message = ref('')
const confirmReset = ref(false)
const busy = ref(false)

async function clearImages() {
  busy.value = true
  try { await clearArtworkCache(); message.value = '图片与作品查询缓存已清理；历史和收藏没有变化。' }
  catch { message.value = '无法清理图片缓存，请检查浏览器存储权限。' }
  finally { busy.value = false }
}

function reset() {
  if (!confirmReset.value) { confirmReset.value = true; return }
  resetPreferences()
  emit('setTheme', 'system')
  confirmReset.value = false
  message.value = '使用偏好已恢复默认（含跟随系统外观），历史与收藏未删除。'
}
</script>

<template>
  <section class="settings-page">
    <div class="page-header">
      <p class="section-eyebrow">MAKE IT YOURS / 设置</p>
      <h1>按你的习惯来<span class="title-period">.</span></h1>
      <p class="page-subtitle">只保存到当前浏览器。调整画师串与图片显示方式，不影响已有历史、收藏和导出的备份。</p>
    </div>

    <div class="settings-layout">
      <section class="settings-card panel" aria-labelledby="settings-generate-title">
        <div class="settings-card-heading" data-tour="settings"><span class="settings-icon"><Sparkles :size="19" /></span><div><p class="section-eyebrow">GENERATION</p><h2 id="settings-generate-title">生成体验</h2></div></div>
        <label class="settings-row settings-control-row" for="max-count">
          <span><strong>每次最多画师数</strong><small>默认 {{ HARD_MAX_ARTISTS }}，硬上限 {{ HARD_MAX_ARTISTS }}；即使导入异常配置也会钳制。</small></span>
          <input id="max-count" v-model.number="preferences.generator.maxCount" type="number" min="1" :max="HARD_MAX_ARTISTS" step="1" @change="normalizeGeneratorPreferences" />
        </label>
        <label class="settings-row">
          <span><strong>避开上一组画师</strong><small>候选充足时尽量不重复上一组；不足时自动回退，不会卡住。</small></span>
          <input v-model="preferences.avoidLastArtists" type="checkbox" role="switch" aria-label="避开上一组画师" />
        </label>
        <label class="settings-row">
          <span><strong>生成后自动复制</strong><small>需要浏览器允许剪贴板；失败时可用结果区的复制按钮。</small></span>
          <input v-model="preferences.autoCopy" type="checkbox" role="switch" aria-label="生成后自动复制" />
        </label>
        <label class="settings-row">
          <span><strong>生成后自动定位结果</strong><small>结果在屏幕下方时滚动过去；可随时关闭。</small></span>
          <input v-model="preferences.autoScroll" type="checkbox" role="switch" aria-label="生成后自动定位结果" />
        </label>
      </section>

      <section class="settings-card panel" aria-labelledby="settings-image-title">
        <div class="settings-card-heading"><span class="settings-icon"><Image :size="19" /></span><div><p class="section-eyebrow">ARTIST LIBRARY</p><h2 id="settings-image-title">画师库与图片</h2></div></div>
        <label class="settings-row settings-control-row" for="image-quality">
          <span><strong>图片显示精度</strong><small>使用 Danbooru 官方缩略图，不请求原图；缺少该尺寸时向低清晰度回退。</small></span>
          <select id="image-quality" v-model="preferences.imageQuality">
            <option value="low">省流 · 180 px</option>
            <option value="balanced">均衡 · 360 px（默认）</option>
            <option value="high">清晰 · 720 px</option>
          </select>
        </label>
        <label class="settings-row settings-control-row" for="gallery-density">
          <span><strong>瀑布流密度</strong><small>紧凑模式在桌面和较宽手机上多显示一列。</small></span>
          <select id="gallery-density" v-model="preferences.galleryDensity">
            <option value="comfortable">舒适（默认）</option>
            <option value="compact">紧凑</option>
          </select>
        </label>
        <label class="settings-row settings-control-row" for="image-page-size">
          <span><strong>图片每页数量</strong><small>图片始终进入可视区域后才请求，翻页不会一次加载所有画师。</small></span>
          <select id="image-page-size" v-model.number="preferences.imagePageSize">
            <option :value="12">12 位</option><option :value="18">18 位（默认）</option><option :value="24">24 位</option>
          </select>
        </label>
      </section>

      <section class="settings-card panel" aria-labelledby="settings-general-title">
        <div class="settings-card-heading"><span class="settings-icon"><Settings2 :size="19" /></span><div><p class="section-eyebrow">PREFERENCES & PRIVACY</p><h2 id="settings-general-title">常用选项</h2></div></div>
        <label class="settings-row settings-control-row" for="appearance">
          <span><strong>外观</strong><small>跟随系统，或固定为浅色 / 深色。页眉也可快速切换。</small></span>
          <select id="appearance" :value="props.themeChoice" @change="emit('setTheme', ($event.target as HTMLSelectElement).value as 'system' | 'light' | 'dark')">
            <option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option>
          </select>
        </label>
        <div class="settings-tools">
          <button type="button" @click="emit('replayTour')"><BookOpen :size="16" /> 重看新手引导</button>
          <button type="button" :disabled="busy" @click="clearImages"><Trash2 :size="16" /> 清理图片缓存</button>
          <button type="button" @click="reset"><RotateCcw :size="16" /> {{ confirmReset ? '确认恢复默认设置' : '恢复默认设置' }}</button>
          <button v-if="confirmReset" type="button" @click="confirmReset = false">取消</button>
        </div>
        <p class="settings-privacy"><ShieldCheck :size="15" /> 图像精度影响网络流量；历史和收藏仍仅保存在浏览器。备份请到「我的串」导出。</p>
      </section>
    </div>
    <p v-if="message" class="inline-message" role="status"><Check :size="16" /> {{ message }}</p>
  </section>
</template>
