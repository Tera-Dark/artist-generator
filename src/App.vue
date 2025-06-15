<script setup lang="ts">
import { onMounted } from 'vue'
import { useGeneratorStore } from '@/stores/generator'
import PresetGrid from '@/components/PresetGrid.vue'
import SimpleTest from '@/components/SimpleTest.vue'
</script>

<template>
  <div id="app" class="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50">
    <SimpleTest />
  </div>
</template>

<style scoped>
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}
</style>
