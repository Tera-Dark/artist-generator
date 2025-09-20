<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">画师库</h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="search-box">
          <input
            v-model="searchQuery"
            @input="$emit('search', searchQuery)"
            placeholder="搜索画师..."
            class="search-input"
          />
        </div>

        <div class="artist-stats">
          <div class="stats-info">
            共 {{ totalArtists }} 个画师
            <span v-if="searchQuery">(筛选出 {{ filteredCount }} 个)</span>
            <span v-if="showPagination && totalPages > 1"
              >- 第 {{ currentPage }} / {{ totalPages }} 页 (每页{{ pageSize }}个)</span
            >
          </div>
          <div class="stats-controls">
            <button
              @click="$emit('togglePagination')"
              class="pagination-toggle"
              :class="{ active: !showPagination }"
            >
              {{ showPagination ? '显示全部' : '启用分页' }}
            </button>
          </div>
        </div>

        <!-- 排序控件 -->
        <div class="sort-controls">
          <span class="sort-label">排序方式：</span>
          <div class="sort-buttons">
            <button
              class="sort-btn"
              :class="{
                active: sortBy === 'name',
                'sort-asc': sortBy === 'name' && sortOrder === 'asc',
                'sort-desc': sortBy === 'name' && sortOrder === 'desc',
              }"
              @click="$emit('sort', 'name')"
              title="按字母顺序排序"
            >
              字母顺序
              <span class="sort-icon" v-if="sortBy === 'name'">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
            <button
              class="sort-btn"
              :class="{
                active: sortBy === 'postCount',
                'sort-asc': sortBy === 'postCount' && sortOrder === 'asc',
                'sort-desc': sortBy === 'postCount' && sortOrder === 'desc',
              }"
              @click="$emit('sort', 'postCount')"
              title="按作品数量排序"
            >
              作品数量
              <span class="sort-icon" v-if="sortBy === 'postCount'">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </button>
          </div>
        </div>

        <div v-if="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <span>加载中...</span>
        </div>
        <div v-else>
          <!-- 搜索结果为空 -->
          <div v-if="searchQuery && artists.length === 0" class="empty-state">
            <div class="empty-icon">🔍</div>
            <div class="empty-title">未找到相关画师</div>
            <div class="empty-description">尝试使用其他关键词搜索，或清空搜索框查看所有画师</div>
          </div>

          <!-- 画师列表 -->
          <div v-else class="artist-list">
            <ArtistCard
              v-for="artist in artists"
              :key="artist.name"
              :artist="artist"
              @click="$emit('artistClick', artist)"
              @copy="$emit('copy', $event)"
            />
          </div>

          <!-- 分页控件 -->
          <Pagination
            v-if="showPagination && totalPages > 1"
            :current-page="currentPage"
            :total-pages="totalPages"
            @update:current-page="$emit('update:currentPage', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Artist } from '@/types'
import ArtistCard from './ArtistCard.vue'
import Pagination from '@/components/common/Pagination.vue'

interface Props {
  show: boolean
  artists: Artist[]
  totalArtists: number
  filteredCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  showPagination: boolean
  sortBy: 'name' | 'postCount'
  sortOrder: 'asc' | 'desc'
  isLoading: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'search', query: string): void
  (e: 'sort', field: 'name' | 'postCount'): void
  (e: 'togglePagination'): void
  (e: 'artistClick', artist: Artist): void
  (e: 'copy', name: string): void
  (e: 'update:currentPage', page: number): void
}

defineProps<Props>()
defineEmits<Emits>()

const searchQuery = ref('')
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
  max-width: 1200px;
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

/* 搜索框样式 */
.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 14px 18px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  color: #2d2d2d;
  background: #ffffff;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
  outline: none;
  border-color: #ffc700;
  box-shadow: 0px 4px 12px rgba(255, 199, 0, 0.2);
}

/* 画师统计 */
.artist-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #757575;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
}

.stats-info {
  flex: 1;
}

.stats-controls {
  flex-shrink: 0;
  margin-left: 16px;
}

.pagination-toggle {
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #2d2d2d;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
}

.pagination-toggle:hover {
  background: #ffc700;
  color: #2d2d2d;
  transform: translateY(-1px);
  box-shadow: 0px 4px 8px rgba(255, 199, 0, 0.2);
}

.pagination-toggle.active {
  background: #2d2d2d;
  color: #ffc700;
  border-color: #2d2d2d;
}

/* 排序控件 */
.sort-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
}

.sort-label {
  font-size: 14px;
  color: #757575;
  font-weight: 500;
}

.sort-buttons {
  display: flex;
  gap: 8px;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #2d2d2d;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.05);
}

.sort-btn:hover {
  background: #ffc700;
  color: #2d2d2d;
  transform: translateY(-1px);
  box-shadow: 0px 4px 8px rgba(255, 199, 0, 0.2);
}

.sort-btn.active {
  background: #2d2d2d;
  color: #ffc700;
  border-color: #2d2d2d;
}

.sort-icon {
  font-size: 12px;
  font-weight: bold;
  margin-left: 2px;
}

/* 加载状态 */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: #757575;
  font-size: 16px;
  font-weight: 500;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #666666;
  border-top: 2px solid #000000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 画师列表 */
.artist-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 12px;
  background: #ffffff;
  border: 1px solid #000000;
  border-radius: 4px;
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
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .modal-content {
    width: 95%;
    max-width: none;
    margin: 10px;
    height: 95vh;
  }

  .artist-list {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .artist-stats {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .stats-controls {
    margin-left: 0;
  }

  .sort-controls {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }

  .sort-buttons {
    justify-content: center;
  }
}
</style>
