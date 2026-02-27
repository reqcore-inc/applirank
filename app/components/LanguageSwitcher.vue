<script setup lang="ts">
const { locale, availableLocales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

const localeFlags: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  vi: '🇻🇳',
  nb: '🇳🇴',
}

const localeOptions = computed(() => {
  return availableLocales.map(code => ({
    code,
    label: `${localeFlags[code] ?? '🌐'} ${code.toLowerCase()}`,
  }))
})

async function handleLocaleChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  const nextLocale = target?.value

  if (!nextLocale || nextLocale === locale.value) return

  const switchPath = switchLocalePath(nextLocale)
  await navigateTo(switchPath || localePath('/'))
}
</script>

<template>
  <select
    :value="locale"
    aria-label="Select language"
    class="h-8 min-w-14 rounded-md border border-surface-300/45 dark:border-surface-700/55 bg-transparent px-2 text-xs font-medium lowercase text-surface-500 dark:text-surface-400 outline-none transition-colors hover:border-surface-400/60 hover:text-surface-700 dark:hover:border-surface-600 dark:hover:text-surface-200 focus:border-brand-500/70 focus:text-surface-800 dark:focus:text-surface-100"
    @change="handleLocaleChange"
  >
    <option
      v-for="option in localeOptions"
      :key="option.code"
      :value="option.code"
    >
      {{ option.label }}
    </option>
  </select>
</template>
