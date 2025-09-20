<template>
  <div v-if="show && artist" class="modal-overlay" @click="$emit('close')">
    <div class="artist-detail-modal" @click.stop>
      <div class="artist-detail-header">
        <div class="artist-detail-avatar" :style="{ backgroundColor: avatarColor }">
          {{ initial }}
        </div>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>
      
      <div class="artist-detail-body">
        <div class="artist-detail-section">
          <h3 class="section-title">主名称</h3>
          <div class="name-item">
            <span class="name-text">{{ artist.name }}</span>
            <button class="copy-name-btn" @click="$emit('copy', artist.name)" title="复制">📋</button>
          </div>
        </div>
        
        <div class="artist-detail-section" v-if="artist.other_names.length > 0">
          <h3 class="section-title">其他名称 ({{ artist.other_names.length }}个)</h3>
          <div class="aliases-list">
            <div v-for="alias in artist.other_names" :key="alias" class="name-item">
              <span class="name-text">{{ alias }}</span>
              <button class="copy-name-btn" @click="$emit('copy', alias)" title="复制">📋</button>
            </div>
          </div>
        </div>
        
        <div class="artist-detail-section">
          <h3 class="section-title">作品统计</h3>
          <div class="stats-display">
            <div class="stat-item">
              <span class="stat-number">{{ artist.post_count.toLocaleString() }}</span>
              <span class="stat-label">作品总数</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artist } from '@/types'

interface Props {
  show: boolean
  artist: Artist | null
}

interface Emits {
  (e: 'close'): void
  (e: 'copy', name: string): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// 颜色缓存
const colorCache = new Map<string, string>()

// 生成首字母徽章颜色
const avatarColor = computed(() => {
  if (!props.artist) return '#ccc'
  
  const name = props.artist.name
  if (colorCache.has(name)) {
    return colorCache.get(name)!
  }
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7', '#FCF3CF'
  ]
  
  const color = colors[Math.abs(hash) % colors.length]
  colorCache.set(name, color)
  return color
})

// 获取首字母
const initial = computed(() => {
  return props.artist?.name.charAt(0).toUpperCase() || ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

/* 画师详情模态框 */
.artist-detail-modal {
  background: #ffffff;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.12);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.artist-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #ffc700;
  border-radius: 20px 20px 0 0;
}

.artist-detail-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: none;
  background: #ffffff;
  color: #2d2d2d;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
}

.close-btn:hover {
  background: #2d2d2d;
  color: #ffc700;
  transform: scale(1.05);
}

.artist-detail-body {
  padding: 24px 28px 28px;
  max-height: calc(80vh - 100px);
  overflow-y: auto;
}

.artist-detail-section {
  margin-bottom: 28px;
}

.artist-detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d2d2d;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #ffc700;
  letter-spacing: 0.3px;
}

.name-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #ffffff;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  border: 1px solid #e0e0e0;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.04);
}

.name-item:hover {
  background: #fafafa;
  border-color: #ffc700;
  box-shadow: 0px 4px 12px rgba(255, 199, 0, 0.1);
}

.name-item:last-child {
  margin-bottom: 0;
}

.name-text {
  font-size: 16px;
  color: #2d2d2d;
  font-weight: 500;
  flex: 1;
  word-break: break-all;
  line-height: 1.4;
}

.copy-name-btn {
  background: #ffc700;
  border: none;
  color: #2d2d2d;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 12px;
  flex-shrink: 0;
  box-shadow: 0px 2px 6px rgba(255, 199, 0, 0.25);
}

.copy-name-btn:hover {
  background: #2d2d2d;
  color: #ffc700;
  transform: scale(1.05);
}

.aliases-list {
  max-height: 200px;
  overflow-y: auto;
}

.aliases-list::-webkit-scrollbar {
  width: 4px;
}

.aliases-list::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.aliases-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.stats-display {
  display: flex;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 28px;
  background: linear-gradient(135deg, #ffc700 0%, #ffb700 100%);
  border-radius: 16px;
  color: #2d2d2d;
  text-align: center;
  box-shadow: 0px 4px 12px rgba(255, 199, 0, 0.2);
}

.stat-number {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.8;
}
</style>
