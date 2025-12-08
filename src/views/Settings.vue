<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import AppHeader from '@/components/common/AppHeader.vue'

const { t, locale } = useI18n()

// Theme State
const currentTheme = ref<'light' | 'dark' | 'system'>('system')

// Load initial theme preference
onMounted(() => {
  const stored = localStorage.getItem('theme') as 'light' | 'dark' | 'system'
  if (stored) {
    currentTheme.value = stored
  } else {
    currentTheme.value = 'system'
  }
  applyTheme(currentTheme.value)
})

// Apply theme logic
const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  if (isDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  
  localStorage.setItem('theme', theme)
}

watch(currentTheme, (val) => {
  applyTheme(val)
})

// Language State
const switchLanguage = (lang: string) => {
  locale.value = lang
  localStorage.setItem('locale', lang)
}

// Load initial locale
onMounted(() => {
    const savedLocale = localStorage.getItem('locale')
    if (savedLocale) {
        locale.value = savedLocale
    }
})
</script>

<template>
  <div class="app-shell min-h-screen">
    <AppHeader :sectionLabel="t('settings.title')" />

    <main class="section section-spacing">
      <div class="container-responsive max-w-2xl">
        <h1 class="heading-xl mb-8">{{ t('settings.title') }}</h1>

        <div class="space-y-8">
            <!-- Appearance -->
            <div class="card p-6">
                <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                    <span class="i-lucide-palette"></span>
                    {{ t('settings.appearance') }}
                </h2>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-neutral-500 mb-2 uppercase tracking-wide">{{ t('settings.theme') }}</label>
                        <div class="grid grid-cols-3 gap-3">
                            <button 
                                @click="currentTheme = 'light'"
                                :class="['p-3 border-2 text-center transition-all font-bold', currentTheme === 'light' ? 'border-primary-500 bg-primary-50 text-primary-900' : 'border-neutral-200 hover:border-neutral-400']"
                            >
                                ☀️ {{ t('settings.theme_light') }}
                            </button>
                            <button 
                                @click="currentTheme = 'dark'"
                                :class="['p-3 border-2 text-center transition-all font-bold', currentTheme === 'dark' ? 'border-primary-500 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-700']"
                            >
                                🌙 {{ t('settings.theme_dark') }}
                            </button>
                            <button 
                                @click="currentTheme = 'system'"
                                :class="['p-3 border-2 text-center transition-all font-bold', currentTheme === 'system' ? 'border-primary-500 bg-gray-100 dark:bg-zinc-800' : 'border-neutral-200 hover:border-neutral-400']"
                            >
                                💻 {{ t('settings.theme_system') }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Language -->
            <div class="card p-6">
                <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                    <span class="i-lucide-languages"></span>
                    {{ t('settings.language') }}
                </h2>
                
                <div class="grid grid-cols-2 gap-3">
                    <button 
                        @click="switchLanguage('zh')"
                        :class="['p-3 border-2 text-center transition-all font-bold', locale === 'zh' ? 'border-primary-500 bg-primary-50 text-primary-900' : 'border-neutral-200 hover:border-neutral-400']"
                    >
                        🇨🇳 中文
                    </button>
                    <button 
                        @click="switchLanguage('en')"
                        :class="['p-3 border-2 text-center transition-all font-bold', locale === 'en' ? 'border-primary-500 bg-primary-50 text-primary-900' : 'border-neutral-200 hover:border-neutral-400']"
                    >
                        🇺🇸 English
                    </button>
                </div>
            </div>
        </div>
      </div>
    </main>
  </div>
</template>
