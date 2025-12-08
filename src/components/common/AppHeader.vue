<template>
  <header class="app-nav">
    <div class="nav-container container-responsive h-24">
      <RouterLink to="/" class="nav-brand">
        <div class="w-12 h-12 bg-primary-500 border-2 border-neutral-900 dark:border-neutral-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center">
          <Palette class="w-7 h-7 text-neutral-900" stroke-width="2.5" />
        </div>
        <span class="text-2xl font-black tracking-tighter uppercase ml-3">{{ title }}</span>
        <span v-if="sectionLabel" class="ml-3 px-3 py-1 text-sm font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-2 border-neutral-900 dark:border-neutral-100 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">{{ sectionLabel }}</span>
      </RouterLink>
      <nav class="nav-links gap-6 text-base">
        <RouterLink class="nav-link" active-class="nav-link-active" to="/">{{ t('nav.home') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/library">{{ t('nav.artists') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/concept">{{ t('nav.workspace') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/prompts">{{ t('nav.share') }}</RouterLink>
        <RouterLink class="nav-link" active-class="nav-link-active" to="/moderation">{{ t('nav.login') }}</RouterLink>
        <RouterLink class="nav-link icon-only" active-class="nav-link-active" to="/settings" :title="t('nav.settings')">
            <Settings class="w-5 h-5" />
        </RouterLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Palette, Settings } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ title?: string; sectionLabel?: string }>()
const title = props.title ?? 'Artist Generator'
const { t } = useI18n()
</script>

<style scoped>
.app-nav {
    @apply sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-4 border-black mb-8 dark:bg-zinc-900/95 dark:border-zinc-700 dark:text-white transition-colors duration-300;
}
.nav-container {
    @apply flex items-center justify-between;
}
.nav-brand {
    @apply flex items-center cursor-pointer select-none hover:opacity-80 transition-opacity;
}
.nav-links {
    @apply hidden md:flex items-center;
}
.nav-link {
    @apply font-bold hover:text-black dark:hover:text-white transition-colors uppercase tracking-wide border-b-4 border-transparent hover:border-primary-500;
}
.nav-link-active {
    @apply border-black text-black dark:text-white dark:border-white;
}
.icon-only {
    @apply ml-2 p-2 rounded-none border-2 border-transparent hover:border-black hover:bg-white hover:shadow-[2px_2px_0_0_#000] dark:hover:border-white dark:hover:bg-zinc-800 dark:hover:shadow-[2px_2px_0_0_#fff] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none;
}
</style>