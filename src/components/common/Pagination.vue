<template>
  <div class="pagination">
    <button 
      @click="goToPage(currentPage - 1)" 
      :disabled="currentPage === 1"
      class="page-btn"
    >
      上一页
    </button>
    
    <button 
      v-for="page in visiblePages" 
      :key="page"
      @click="goToPage(page)"
      :class="['page-btn', { active: currentPage === page }]"
    >
      {{ page }}
    </button>
    
    <button 
      @click="goToPage(currentPage + 1)" 
      :disabled="currentPage === totalPages"
      class="page-btn"
    >
      下一页
    </button>
    
    <button 
      @click="goToPage(totalPages)" 
      :disabled="currentPage === totalPages"
      class="page-btn"
      title="跳转到最后一页"
    >
      末页
    </button>
  </div>
  
  <!-- 页面跳转输入框 -->
  <div class="page-jump">
    <span class="page-jump-label">跳转到</span>
    <input 
      v-model.number="pageJumpInput"
      @keyup.enter="jumpToPage"
      @blur="jumpToPage"
      type="number" 
      :min="1" 
      :max="totalPages"
      class="page-jump-input"
      :placeholder="`1-${totalPages}`"
    />
    <span class="page-jump-label">页</span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  currentPage: number
  totalPages: number
}

interface Emits {
  (e: 'update:currentPage', page: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const pageJumpInput = ref<number | null>(null)

// 计算可见页码
const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, props.currentPage - 2)
  const end = Math.min(props.totalPages, props.currentPage + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  
  return pages
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:currentPage', page)
  }
}

const jumpToPage = () => {
  if (pageJumpInput.value && pageJumpInput.value >= 1 && pageJumpInput.value <= props.totalPages) {
    emit('update:currentPage', pageJumpInput.value)
    pageJumpInput.value = null
  }
}
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.page-btn {
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 40px;
}

.page-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-btn.active {
  background: #fbbf24;
  border-color: #f59e0b;
  color: #ffffff;
}

.page-jump {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  justify-content: center;
}

.page-jump-label {
  font-size: 14px;
  color: #666666;
}

.page-jump-input {
  width: 80px;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
}

.page-jump-input:focus {
  outline: none;
  border-color: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
}
</style>
