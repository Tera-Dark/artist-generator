<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">历史记录</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div v-if="history.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">暂无历史记录</div>
          <div class="empty-description">生成画师组合后，记录会自动保存在这里</div>
        </div>

        <div v-else class="history-list">
          <div
            v-for="item in paginatedHistory"
            :key="item.id"
            class="history-item"
            @click="$emit('restore', item)"
          >
            <div class="history-header">
              <span class="history-time">{{ formatTime(item.timestamp) }}</span>
              <span class="history-params">
                {{ item.params.count }}个画师 |
                <span v-if="item.params.pureMode">纯净模式</span>
                <span v-else-if="item.params.bracketMode">括号模式</span>
                <span v-else-if="item.params.naiMode">NAI模式</span>
                <span v-else>权重{{ item.params.minWeight }}-{{ item.params.maxWeight }}</span>
                <span v-if="item.params.minPostCount && item.params.minPostCount > 0">
                  | 作品≥{{ item.params.minPostCount }}</span
                >
              </span>
            </div>
            <div class="history-result">{{ item.result }}</div>
          </div>
        </div>

        <!-- 历史记录分页控件 -->
        <Pagination
          v-if="historyTotalPages > 1"
          :current-page="currentPage"
          :total-pages="historyTotalPages"
          @update:current-page="$emit('update:currentPage', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Pagination from '@/components/common/Pagination.vue'

interface HistoryItem {
  id: string
  result: string
  artists: string[]
  timestamp: Date
  params: {
    count: number
    minWeight: number
    maxWeight: number
    pureMode?: boolean
    bracketMode?: boolean
    naiMode?: boolean
    minPostCount?: number
  }
}

interface Props {
  show: boolean
  history: HistoryItem[]
  currentPage: number
  pageSize: number
}

interface Emits {
  (e: 'close'): void
  (e: 'restore', item: HistoryItem): void
  (e: 'update:currentPage', page: number): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const historyTotalPages = computed(() => {
  return Math.ceil(props.history.length / props.pageSize)
})

const paginatedHistory = computed(() => {
  const start = (props.currentPage - 1) * props.pageSize
  const end = start + props.pageSize
  return props.history.slice(start, end)
})

const formatTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString()
}
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
}

.modal-content {
  background: #ffffff;
  border-radius: 20px;
  width: 95%;
  max-width: 800px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.12);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #ffc700;
  border-radius: 20px 20px 0 0;
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: #2d2d2d;
  margin: 0;
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

.modal-body {
  flex: 1;
  padding: 16px 24px 24px;
  overflow-y: auto;
  min-height: 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 20px;
  font-weight: 700;
  color: #2d2d2d;
  margin-bottom: 10px;
}

.empty-description {
  font-size: 15px;
  color: #757575;
  font-weight: 500;
  line-height: 1.5;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 18px 20px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.06);
}

.history-item:hover {
  background: #ffc700;
  color: #2d2d2d;
  transform: translateY(-2px);
  box-shadow: 0px 6px 20px rgba(255, 199, 0, 0.15);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-time {
  font-size: 13px;
  color: #757575;
  font-weight: 600;
}

.history-params {
  font-size: 13px;
  color: #757575;
  font-weight: 500;
}

.history-result {
  font-size: 14px;
  color: #2d2d2d;
  font-weight: 500;
  line-height: 1.5;
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  padding: 12px 14px;
  border-radius: 12px;
  word-break: break-all;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .modal-content {
    width: 95%;
    max-width: none;
    margin: 10px;
    height: 95vh;
  }

  .history-header {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
}
</style>
