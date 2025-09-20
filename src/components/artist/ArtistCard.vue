<template>
  <div class="artist-card" @click="$emit('click', artist)">
    <!-- 首字母徽章 -->
    <div class="artist-avatar" :style="{ backgroundColor: avatarColor }">
      {{ initial }}
    </div>

    <!-- 画师信息区域 -->
    <div class="artist-info">
      <!-- 主名称 -->
      <div class="artist-name" :title="artist.name">{{ artist.name }}</div>

      <!-- 别名 -->
      <div class="artist-aliases" v-if="artist.other_names.length > 0" :title="formattedAliases">
        {{ formattedAliases }}
      </div>
    </div>

    <!-- 作品数量和复制按钮 -->
    <div class="artist-stats">
      <div class="post-count">
        <span class="count-number">{{ formattedPostCount }}</span>
        <span class="count-label">作品</span>
      </div>
      <button class="copy-btn" @click.stop="$emit('copy', artist.name)" title="复制画师名称">
        📋
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Artist } from '@/types'

interface Props {
  artist: Artist
}

interface Emits {
  (e: 'click', artist: Artist): void
  (e: 'copy', name: string): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// 颜色缓存
const colorCache = new Map<string, string>()

// 生成首字母徽章颜色
const avatarColor = computed(() => {
  const name = props.artist.name
  if (colorCache.has(name)) {
    return colorCache.get(name)!
  }

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E9',
    '#F8C471',
    '#82E0AA',
    '#F1948A',
    '#85C1E9',
    '#D7BDE2',
    '#A9DFBF',
    '#F9E79F',
    '#D5A6BD',
    '#A3E4D7',
    '#FCF3CF',
  ]

  const color = colors[Math.abs(hash) % colors.length]
  colorCache.set(name, color)
  return color
})

// 获取首字母
const initial = computed(() => {
  return props.artist.name.charAt(0).toUpperCase()
})

// 别名格式化缓存
const aliasCache = new Map<string, string>()

// 格式化别名显示
const formattedAliases = computed(() => {
  const aliases = props.artist.other_names
  if (aliases.length === 0) return ''

  const key = aliases.join('|')
  if (aliasCache.has(key)) {
    return aliasCache.get(key)!
  }

  let result: string
  if (aliases.length <= 2) {
    result = aliases.join(', ')
  } else {
    const shown = aliases.slice(0, 2).join(', ')
    const remaining = aliases.length - 2
    result = `${shown} ...等${remaining}个`
  }

  aliasCache.set(key, result)
  return result
})

// 作品数格式化缓存
const countCache = new Map<number, string>()

// 格式化作品数量
const formattedPostCount = computed(() => {
  const count = props.artist.post_count
  if (countCache.has(count)) {
    return countCache.get(count)!
  }

  let result: string
  if (count >= 10000) {
    const wanValue = Math.floor(count / 1000) / 10
    result = `${wanValue}w+`
  } else if (count >= 1000) {
    const kValue = Math.floor(count / 100) / 10
    result = `${kValue}k+`
  } else {
    result = count.toString()
  }

  countCache.set(count, result)
  return result
})
</script>

<style scoped>
/* 画师卡片 */
.artist-card {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-height: 140px;
  width: 100%;
  max-width: 280px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
}

.artist-card:hover {
  border-color: #ffc700;
  transform: translateY(-4px);
  box-shadow: 0px 8px 24px rgba(255, 199, 0, 0.15);
}

/* 首字母徽章 */
.artist-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  flex-shrink: 0;
  margin-bottom: 16px;
  border: 2px solid #000000;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.15);
}

/* 画师信息区域 */
.artist-info {
  flex: 1;
  text-align: center;
  width: 100%;
  margin-bottom: 8px;
}

.artist-name {
  font-size: 15px;
  font-weight: 700;
  color: #2d2d2d;
  text-align: center;
  margin-bottom: 10px;
  line-height: 1.3;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.artist-aliases {
  font-size: 11px;
  color: #666666;
  line-height: 1.3;
  opacity: 0.8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 作品统计区域 */
.artist-stats {
  font-size: 13px;
  color: #757575;
  font-weight: 500;
  text-align: center;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
}

.post-count {
  display: flex;
  align-items: center;
  gap: 4px;
}

.count-number {
  font-size: 16px;
  font-weight: 700;
  color: inherit;
  line-height: 1;
}

.count-label {
  font-size: 10px;
  color: #666666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 复制按钮 */
.copy-btn {
  background: #ffffff;
  border: 1px solid #000000;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: 0.8;
}

.copy-btn:hover {
  background: #000000;
  color: #fbbf24;
  opacity: 1;
}
</style>
