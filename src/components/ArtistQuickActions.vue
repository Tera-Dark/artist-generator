<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId } from 'vue'
import { BookmarkPlus, Check, ChevronDown, Copy, Crown, Heart, SlidersHorizontal, UserPlus, X } from 'lucide-vue-next'
import { useStudio } from '@/composables/useStudio'
import { copyText } from '@/utils/clipboard'

const props = defineProps<{ name: string; url: string }>()
const emit = defineEmits<{
  choose: [name: string, role: 'main' | 'support']
  feedback: [message: string]
}>()
const studio = useStudio()
const expanded = ref(false)
const ratingDialog = ref<HTMLDialogElement | null>(null)
const ratingDraft = ref(8)
const menuId = useId()
const profile = computed(() => studio.profileOf(props.name))
const favored = computed(() => profile.value?.status === 'favorite')
const blocked = computed(() => profile.value?.status === 'blocked')
onMounted(() => { void studio.initStudio() })

async function setStatus(status: 'favorite' | 'neutral' | 'blocked') {
  try {
    await studio.updateProfile(props.name, { status })
    emit('feedback', status === 'favorite' ? '已加入喜欢的画师池' : status === 'blocked' ? '已排除该画师' : '已更新个人画师池')
  } catch { emit('feedback', '操作失败，请重试') }
}
function showRating() {
  ratingDraft.value = profile.value?.rating ?? 8
  void nextTick(() => ratingDialog.value?.showModal())
}
function closeRating() { ratingDialog.value?.close() }
async function saveRating(value: number | null) {
  try {
    await studio.updateProfile(props.name, { rating: value })
    emit('feedback', value === null ? '已清除个人评分' : '评分已保存')
    closeRating()
  } catch { emit('feedback', '评分保存失败，请重试') }
}
function adjustRating(change: number) {
  ratingDraft.value = Math.min(10, Math.max(0, Math.round((ratingDraft.value + change) * 2) / 2))
}
async function copyName() {
  try { await copyText(props.name); emit('feedback', '画师名称已复制') }
  catch { emit('feedback', '复制失败，请手动复制') }
}
function clickBackdrop(event: MouseEvent) {
  if (event.target === ratingDialog.value) closeRating()
}
</script>

<template>
  <div class="artist-quick-actions">
    <div class="artist-action-primary">
      <button type="button" class="artist-action artist-action-main" :aria-label="'将 '+name+' 设为主画师'" @click="emit('choose', name, 'main')">
        <Crown :size="16" aria-hidden="true" /> 设为主画师
      </button>
      <button type="button" class="artist-action" :aria-label="'将 '+name+' 加为辅助画师'" @click="emit('choose', name, 'support')">
        <UserPlus :size="16" aria-hidden="true" /> 加为辅助
      </button>
      <button type="button" class="artist-action artist-action-short" :class="{ 'is-selected': favored }" :aria-pressed="favored" :aria-label="favored ? '取消喜欢 '+name : '喜欢 '+name" @click="setStatus(favored ? 'neutral' : 'favorite')">
        <Heart :size="16" :fill="favored ? 'currentColor' : 'none'" aria-hidden="true" />
        {{ favored ? '已喜欢' : '喜欢' }}
      </button>
      <button type="button" class="artist-action artist-action-more" :aria-expanded="expanded" :aria-controls="menuId" @click="expanded = !expanded">
        <SlidersHorizontal :size="16" aria-hidden="true" /> 更多 <ChevronDown :size="14" :class="{ 'is-flipped': expanded }" aria-hidden="true" />
      </button>
    </div>
    <div v-if="expanded" :id="menuId" class="artist-action-secondary">
      <button type="button" @click="showRating"><span>个人评分</span><strong>{{ profile?.rating == null ? '未评分' : profile.rating.toFixed(1) + ' / 10' }}</strong></button>
      <button type="button" :aria-pressed="blocked" @click="setStatus(blocked ? 'neutral' : 'blocked')">
        <X v-if="blocked" :size="15" aria-hidden="true" />
        <BookmarkPlus v-else :size="15" aria-hidden="true" />
        {{ blocked ? '取消排除' : '加入排除名单' }}
      </button>
      <button type="button" @click="copyName"><Copy :size="15" aria-hidden="true" /> 复制画师名</button>
      <a :href="url" target="_blank" rel="noopener noreferrer">查看 Danbooru ↗</a>
    </div>
    <dialog ref="ratingDialog" class="artist-rating-dialog" :aria-label="'设置 '+name+' 的个人评分'" @click="clickBackdrop">
      <div class="artist-rating-panel">
        <div class="artist-rating-head">
          <div><p>个人画师评分</p><h3>{{ name }}</h3></div>
          <button type="button" aria-label="关闭评分窗口" @click="closeRating"><X :size="20" /></button>
        </div>
        <div class="artist-rating-value">{{ ratingDraft.toFixed(1) }} <small>/ 10</small></div>
        <div class="artist-rating-controls">
          <button type="button" aria-label="评分减 0.5" :disabled="ratingDraft <= 0" @click="adjustRating(-0.5)">−</button>
          <input v-model.number="ratingDraft" type="range" min="0" max="10" step="0.5" :aria-label="'给 '+name+' 评分'" />
          <button type="button" aria-label="评分加 0.5" :disabled="ratingDraft >= 10" @click="adjustRating(0.5)">+</button>
        </div>
        <div class="artist-rating-markers"><span>0</span><span>5</span><span>10</span></div>
        <div class="artist-rating-footer">
          <button type="button" @click="saveRating(null)">清除评分</button>
          <button type="button" class="artist-rating-confirm" @click="saveRating(ratingDraft)"><Check :size="17" /> 保存评分</button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.artist-quick-actions { min-width:0; width:100%; }
.artist-action-primary { display:grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap:8px; }
.artist-action { min-width:0; min-height:46px; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:9px 10px; border:1px solid var(--line); border-radius:11px; color:var(--ink); background:var(--soft); font-size:13px; font-weight:650; line-height:1.25; cursor:pointer; }
.artist-action svg { flex:none; }
.artist-action:hover, .artist-action:focus-visible { border-color:var(--accent-line); background:var(--accent-soft); color:var(--accent); }
.artist-action-main { background:var(--accent-soft); color:var(--accent); border-color:var(--accent-line); }
.artist-action.is-selected { color:var(--accent); border-color:var(--accent-line); }
.is-flipped { transform:rotate(180deg); }
.artist-action-secondary { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-top:10px; padding-top:11px; border-top:1px solid var(--line); }
.artist-action-secondary button, .artist-action-secondary a { display:flex; align-items:center; justify-content:center; gap:6px; min-height:44px; min-width:0; padding:8px; border:1px solid var(--line); border-radius:9px; color:var(--ink); background:var(--surface); font-size:12px; font-weight:600; text-decoration:none; }
.artist-action-secondary button:first-child { justify-content:space-between; }
.artist-action-secondary button strong { color:var(--accent); font-variant-numeric:tabular-nums; }
.artist-rating-dialog { border:0; padding:0; border-radius:20px; max-height:calc(100dvh - 32px); width:min(440px,calc(100vw - 32px)); color:var(--ink); background:var(--surface); box-shadow:0 22px 75px #0004; }
.artist-rating-dialog::backdrop { background:rgba(12,23,18,.55); }
.artist-rating-panel { padding:24px; }
.artist-rating-head { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.artist-rating-head p { font-size:12px; color:var(--muted); margin:0 0 8px; }
.artist-rating-head h3 { font-size:17px; margin:0; overflow-wrap:anywhere; }
.artist-rating-head button { display:grid; place-items:center; width:44px; height:44px; border:0; border-radius:10px; color:var(--ink); background:var(--soft); }
.artist-rating-value { margin:22px 0 10px; text-align:center; font-size:48px; font-weight:760; font-variant-numeric:tabular-nums; }
.artist-rating-value small { font-size:18px; color:var(--muted); }
.artist-rating-controls { display:flex; align-items:center; gap:14px; }
.artist-rating-controls button { flex:none; width:48px; height:48px; border:1px solid var(--line); border-radius:12px; color:var(--ink); background:var(--soft); font-size:24px; }
.artist-rating-controls input { min-width:0; flex:1; accent-color:var(--accent); }
.artist-rating-markers { display:flex; justify-content:space-between; padding:7px 62px 0; color:var(--muted); font-size:12px; }
.artist-rating-footer { display:grid; grid-template-columns:1fr 1.5fr; gap:10px; margin-top:26px; }
.artist-rating-footer button { min-height:48px; border:1px solid var(--line); border-radius:11px; color:var(--ink); background:var(--soft); font-size:14px; font-weight:650; }
.artist-rating-footer .artist-rating-confirm { display:flex; align-items:center; justify-content:center; gap:7px; color:var(--button-ink); background:var(--button); border-color:var(--button); }
@media (min-width:960px) {
  .artist-action-primary { grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px; }
  .artist-action { padding:8px 6px; min-height:42px; font-size:12px; }
}
@media (max-width:640px) {
  .artist-rating-dialog { width:100%; max-width:100%; max-height:min(90dvh,700px); margin:auto 0 0; border-radius:22px 22px 0 0; padding-bottom:env(safe-area-inset-bottom); }
  .artist-rating-panel { padding:22px 20px 20px; }
}
@media (prefers-reduced-motion:reduce) {
  .artist-action, .artist-action-secondary button { transition:none; }
}
</style>
