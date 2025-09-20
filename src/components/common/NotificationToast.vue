<template>
  <div class="toast-container">
    <div
      v-for="notification in notifications"
      :key="notification.id"
      class="toast-notification"
      :class="`toast-${notification.type}`"
    >
      <div class="toast-content">
        <div class="toast-icon">
          <span v-if="notification.type === 'success'">✅</span>
          <span v-else-if="notification.type === 'error'">❌</span>
          <span v-else-if="notification.type === 'warning'">⚠️</span>
          <span v-else>ℹ️</span>
        </div>
        <span class="toast-message">{{ notification.message }}</span>
        <button @click="removeNotification(notification.id)" class="toast-close">×</button>
      </div>
      <div class="toast-progress" v-if="notification.duration && notification.duration > 0">
        <div class="toast-progress-bar" :class="`progress-${notification.type}`"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface Props {
  notifications: ToastNotification[]
}

interface Emits {
  (e: 'remove', id: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const removeNotification = (id: string) => {
  emit('remove', id)
}
</script>

<style>
.toast-container {
  position: fixed !important;
  top: 24px !important;
  right: 24px !important;
  z-index: 1000 !important;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast-notification {
  min-width: 320px;
  max-width: 420px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.08),
    0 16px 32px rgba(0, 0, 0, 0.06);
  border: 2px solid;
  overflow: hidden;
  animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  pointer-events: auto;
  position: relative;
}

.toast-success {
  border-color: #22c55e;
}

.toast-error {
  border-color: #ef4444;
}

.toast-warning {
  border-color: #f59e0b;
}

.toast-info {
  border-color: #3b82f6;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  position: relative;
}

.toast-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.toast-message {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #666666;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.toast-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #1a1a1a;
}

.toast-progress {
  height: 4px;
  background: rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.toast-progress-bar {
  height: 100%;
  width: 100%;
  border-radius: 0 2px 2px 0;
  animation: progressShrink var(--duration, 3s) linear forwards;
}

.progress-success {
  background: #22c55e;
}

.progress-error {
  background: #ef4444;
}

.progress-warning {
  background: #f59e0b;
}

.progress-info {
  background: #3b82f6;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%) scale(0.8);
    opacity: 0;
  }
  to {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

@keyframes progressShrink {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .toast-container {
    top: 16px;
    right: 16px;
    left: 16px;
  }
  
  .toast-notification {
    min-width: auto;
    max-width: none;
  }
  
  .toast-content {
    padding: 14px 16px;
  }
  
  .toast-message {
    font-size: 13px;
  }
  
  .toast-icon {
    font-size: 18px;
  }
}
</style>
