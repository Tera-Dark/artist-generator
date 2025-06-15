<template>
  <div
    :class="[
      'preset-card',
      { 'active': isActive },
      `border-l-4 border-l-${preset.color}-500`
    ]"
    @click="$emit('select', preset.id)"
    @keydown.enter="$emit('select', preset.id)"
    @keydown.space.prevent="$emit('select', preset.id)"
    tabindex="0"
    role="button"
    :aria-pressed="isActive"
    :aria-label="`选择${preset.name}模式`"
  >
    <!-- 背景装饰 -->
    <div 
      :class="`absolute top-0 right-0 w-20 h-20 bg-${preset.color}-100 rounded-full -mr-10 -mt-10 opacity-30`"
    />
    
    <!-- 图标 -->
    <div :class="`text-4xl mb-3 ${preset.color === 'blue' ? 'text-blue-500' : preset.color === 'green' ? 'text-green-500' : 'text-purple-500'}`">
      {{ preset.icon }}
    </div>
    
    <!-- 标题 -->
    <h3 :class="`text-lg font-semibold mb-2 ${isActive ? `text-${preset.color}-700` : 'text-gray-800'}`">
      {{ preset.name }}
    </h3>
    
    <!-- 描述 -->
    <p :class="`text-sm mb-4 ${isActive ? `text-${preset.color}-600` : 'text-gray-600'}`">
      {{ preset.description }}
    </p>
    
    <!-- 配置信息 -->
    <div class="space-y-2 text-xs">
      <div :class="`flex justify-between ${isActive ? `text-${preset.color}-700` : 'text-gray-700'}`">
        <span>画师数量:</span>
        <span class="font-medium">{{ preset.config.countRange[0] }}-{{ preset.config.countRange[1] }}个</span>
      </div>
      <div :class="`flex justify-between ${isActive ? `text-${preset.color}-700` : 'text-gray-700'}`">
        <span>权重范围:</span>
        <span class="font-medium">{{ preset.config.weightRange[0] }}-{{ preset.config.weightRange[1] }}</span>
      </div>
    </div>
    
    <!-- 激活指示器 -->
    <div 
      v-if="isActive"
      :class="`absolute bottom-2 right-2 w-6 h-6 bg-${preset.color}-500 rounded-full flex items-center justify-center`"
    >
      <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
      </svg>
    </div>
    
    <!-- 悬停效果 -->
    <div 
      :class="`absolute inset-0 bg-gradient-to-br from-${preset.color}-500/5 to-${preset.color}-600/10 opacity-0 transition-opacity duration-300 rounded-2xl group-hover:opacity-100`"
    />
  </div>
</template>

<script setup lang="ts">
interface PresetConfig {
  id: string
  name: string
  icon: string
  description: string
  config: {
    countRange: [number, number]
    weightRange: [number, number]
  }
  color: string
  popularity: number
}

interface Props {
  preset: PresetConfig
  isActive: boolean
}

defineProps<Props>()
defineEmits<{
  select: [id: string]
}>()
</script>

<style scoped>
.preset-card {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.preset-card:hover {
  transform: translateY(-4px) scale(1.02);
}

.preset-card:focus {
  outline: none;
  ring: 2px;
  ring-color: theme('colors.primary.500');
  ring-offset: 2px;
}

.preset-card:active {
  transform: translateY(-2px) scale(1.01);
}

@media (max-width: 768px) {
  .preset-card:hover {
    transform: translateY(-2px) scale(1.01);
  }
}
</style> 