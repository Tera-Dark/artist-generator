<template>
  <div class="space-y-6">
    <!-- 标题 -->
    <div class="text-center">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">
        选择生成模式
      </h2>
      <p class="text-gray-600">
        选择适合您需求的预设模式，或使用高级设置自定义参数
      </p>
    </div>
    
    <!-- 预设卡片网格 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <PresetCard
        v-for="preset in presets"
        :key="preset.id"
        :preset="preset"
        :is-active="selectedPreset === preset.id"
        @select="handlePresetSelect"
        class="animate-slide-up"
        :style="{ animationDelay: `${preset.popularity * 100}ms` }"
      />
    </div>
    
    <!-- 快速操作提示 -->
    <div class="text-center mt-8" v-if="selectedPreset">
      <div class="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
        </svg>
        <span>双击卡片可快速生成，或点击下方生成按钮</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PresetCard from './PresetCard.vue'
import type { PresetConfig } from '@/types'

interface Props {
  selectedPreset: string | null
  presets: PresetConfig[]
}

interface Emits {
  'update:selectedPreset': [value: string]
  'quick-generate': [presetId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handlePresetSelect = (presetId: string) => {
  emit('update:selectedPreset', presetId)
}

// 双击快速生成
const handleDoubleClick = (presetId: string) => {
  emit('quick-generate', presetId)
}
</script>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.6s ease-out both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 