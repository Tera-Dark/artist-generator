import { ref, watch } from 'vue'
import { useGeneratorStore } from '@/stores/generator'
import { useI18n } from 'vue-i18n'

export type Artist = { name: string; other_names?: string[]; post_count?: number }
export type BracketStyle = 'paren' | 'curly' | 'square'
export type GeneratorMode = 'pure' | 'standard' | 'creative' | 'nai'
export type FilterMode = 'none' | 'gt' | 'lt'

const LS_KEY = 'artist_string_generator_v1'

export function useGeneratorLogic() {
    const store = useGeneratorStore()
    const { t } = useI18n()

    // --- State ---
    const selectedMode = ref<GeneratorMode>('standard')
    const enableCustomFormat = ref(false)
    const artistCount = ref(3)
    const finalResult = ref('')

    // Filter Settings
    const postCountFilterMode = ref<FilterMode>('none')
    const postCountThreshold = ref<number>(0)

    // Creative Mode Settings
    const creativeBracketStyle = ref<BracketStyle>('paren')
    const creativeNestLevels = ref<number>(0) // 0 = random

    // Weight Settings
    const standardWeightMin = ref<number>(0.5)
    const standardWeightMax = ref<number>(1.5)
    const naiWeightMin = ref<number>(0.5)
    const naiWeightMax = ref<number>(1.5)

    // Custom Format
    const customFormatString = ref<string>('artist:{name}')

    // Selection
    const preselectedNames = ref<string[]>([])

    // --- Helpers ---

    function passesPostCountFilter(a: Artist) {
        const mode = postCountFilterMode.value
        const threshold = postCountThreshold.value || 0
        const posts = a.post_count || 0
        if (mode === 'gt') return posts > threshold
        if (mode === 'lt') return posts < threshold
        return true
    }

    function incrementCount() {
        artistCount.value = Math.min(20, (artistCount.value || 1) + 1)
    }

    function decrementCount() {
        artistCount.value = Math.max(1, (artistCount.value || 1) - 1)
    }

    function isPreselected(name: string) {
        return preselectedNames.value.includes(name)
    }

    function addPreselected(name: string) {
        if (isPreselected(name)) return
        preselectedNames.value.push(name)
    }

    function removePreselected(idx: number) {
        preselectedNames.value.splice(idx, 1)
    }

    function clearPreselected() {
        preselectedNames.value = []
    }

    // --- Core Logic ---

    function sampleRandomArtists(pool: Artist[], count: number, exclude: Set<string>) {
        const available = pool.filter(a => !exclude.has(a.name) && passesPostCountFilter(a))
        const picked: string[] = []
        // optimization: clone available array only if needed, but here filter returns new array
        const candidates = [...available]

        for (let i = 0; i < count && candidates.length > 0; i++) {
            const idx = Math.floor(Math.random() * candidates.length)
            const a = candidates.splice(idx, 1)[0]
            picked.push(a.name)
        }
        return picked
    }

    function wrapWithBrackets(name: string, style: BracketStyle, layers: number) {
        let open = '(', close = ')'
        if (style === 'curly') { open = '{'; close = '}' }
        else if (style === 'square') { open = '['; close = ']' }

        let s = name
        for (let i = 0; i < layers; i++) s = `${open}${s}${close}`
        return s
    }

    function formatOutput(names: string[]) {
        let items: string[] = []

        if (selectedMode.value === 'pure') {
            items = names
        } else if (selectedMode.value === 'standard') {
            const clamp = (v: number) => Math.max(0, Math.min(2, v || 0))
            let lo = clamp(standardWeightMin.value)
            let hi = clamp(standardWeightMax.value)
            if (lo > hi) [lo, hi] = [hi, lo]

            const pick = () => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10
            items = names.map(n => `(${n}:${(lo === hi ? lo : pick()).toFixed(1)})`)
        } else if (selectedMode.value === 'creative') {
            const lv = creativeNestLevels.value
            const pickRandom = () => Math.floor(Math.random() * 5) + 1

            items = names.map(n => wrapWithBrackets(
                n,
                creativeBracketStyle.value,
                lv === 0 ? pickRandom() : Math.max(1, Math.min(5, lv || 1))
            ))
        } else if (selectedMode.value === 'nai') {
            const clamp = (v: number) => Math.max(0, Math.min(2, v || 0))
            let lo = clamp(naiWeightMin.value)
            let hi = clamp(naiWeightMax.value)
            if (lo > hi) [lo, hi] = [hi, lo]

            const pick = () => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10
            const weights = names.map(() => (lo === hi ? lo : pick()))
            items = names.map((n, i) => `${Number(weights[i]).toFixed(1)}::${n} ::`)
        } else {
            items = names
        }

        if (enableCustomFormat.value) {
            const fmt = customFormatString.value || '{name}'
            items = items.map(item => fmt.replace(/{name}/g, item))
        }

        return items.join(', ')
    }

    async function generate() {
        if (!store.artists.length && !store.isLoading) {
            store.loadArtists()
        }

        // Allow slight delay if loading, but typically we proceed with what we have or partial
        // For now, assume store might be empty initially but populated async

        const pool = store.artists.length ? store.artists : [
            // Fallback / Mock data if store is empty and offline (rare)
            { name: 'test_artist_1', other_names: ['test1'], post_count: 100 },
            { name: 'test_artist_2', other_names: ['test2'], post_count: 200 },
            { name: 'test_artist_3', other_names: ['test3'], post_count: 300 },
        ]

        const target = Math.max(1, Math.min(20, artistCount.value))
        // Take all preselected, slice if they exceed target?
        // Logic in original was: take first N preselected where N = target.
        // If preselected < target, fill with random.

        const baseNames = preselectedNames.value.slice(0, target)
        const exclude = new Set<string>(baseNames)
        const need = target - baseNames.length

        const randoms = need > 0 ? sampleRandomArtists(pool, need, exclude) : []
        const allNames = [...baseNames, ...randoms]

        finalResult.value = formatOutput(allNames)

        // Optional: Toast notification
        try {
            store.addToast('success', '生成成功', '已生成画师串，可复制使用', 2000)
        } catch { }
    }

    function copyOutput() {
        if (!finalResult.value) return
        // Note: Checking store.user might restrict general usage?
        // Original code checked store.user for copy?
        // "if (!store.user) ... auth_required"
        // Let's keep that check if it was intended to force login for copying.
        if (!store.user) {
            store.addToast('info', t('auth.identity_check'), t('share.auth_required'))
            return
        }

        navigator.clipboard?.writeText(finalResult.value)
        try {
            store.addToast('success', '已复制', '画师串已复制到剪贴板', 1800)
        } catch { }
    }

    // --- Persistence ---

    function saveState() {
        const payload = {
            mode: selectedMode.value,
            enableCustomFormat: enableCustomFormat.value,
            count: artistCount.value,
            postFilterMode: postCountFilterMode.value,
            postFilterThreshold: postCountThreshold.value,
            creativeBracketStyle: creativeBracketStyle.value,
            creativeNestLevels: creativeNestLevels.value,
            standardWeightMin: standardWeightMin.value,
            standardWeightMax: standardWeightMax.value,
            naiWeightMin: naiWeightMin.value,
            naiWeightMax: naiWeightMax.value,
            customFormatString: customFormatString.value,
            preselected: preselectedNames.value,
            final: finalResult.value,
        }
        try { localStorage.setItem(LS_KEY, JSON.stringify(payload)) } catch { }
    }

    function restoreState() {
        try {
            const raw = localStorage.getItem(LS_KEY)
            if (!raw) return
            const s = JSON.parse(raw)
            if (s.mode) selectedMode.value = s.mode
            if (typeof s.enableCustomFormat === 'boolean') enableCustomFormat.value = s.enableCustomFormat
            if (typeof s.count === 'number') artistCount.value = s.count
            if (s.postFilterMode) postCountFilterMode.value = s.postFilterMode
            if (typeof s.postFilterThreshold === 'number') postCountThreshold.value = s.postFilterThreshold
            if (s.creativeBracketStyle) creativeBracketStyle.value = s.creativeBracketStyle
            if (typeof s.creativeNestLevels === 'number') creativeNestLevels.value = s.creativeNestLevels
            if (typeof s.standardWeightMin === 'number') standardWeightMin.value = s.standardWeightMin
            if (typeof s.standardWeightMax === 'number') standardWeightMax.value = s.standardWeightMax
            if (typeof s.naiWeightMin === 'number') naiWeightMin.value = s.naiWeightMin
            if (typeof s.naiWeightMax === 'number') naiWeightMax.value = s.naiWeightMax
            if (typeof s.customFormatString === 'string') customFormatString.value = s.customFormatString
            if (Array.isArray(s.preselected)) preselectedNames.value = s.preselected
            if (typeof s.final === 'string') finalResult.value = s.final
        } catch { }
    }

    // Initialize
    restoreState()

    // Watch for changes
    watch([
        selectedMode,
        enableCustomFormat,
        artistCount,
        postCountFilterMode,
        postCountThreshold,
        creativeBracketStyle,
        creativeNestLevels,
        standardWeightMin,
        standardWeightMax,
        naiWeightMin,
        naiWeightMax,
        customFormatString,
        preselectedNames,
        finalResult
    ], saveState, { deep: true })

    return {
        // State
        selectedMode,
        enableCustomFormat,
        artistCount,
        finalResult,
        postCountFilterMode,
        postCountThreshold,
        creativeBracketStyle,
        creativeNestLevels,
        standardWeightMin,
        standardWeightMax,
        naiWeightMin,
        naiWeightMax,
        customFormatString,
        preselectedNames,

        // Methods
        generate,
        copyOutput,
        incrementCount,
        decrementCount,
        isPreselected,
        addPreselected,
        removePreselected,
        clearPreselected,
        passesPostCountFilter
    }
}
