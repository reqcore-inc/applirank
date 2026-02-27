<script setup lang="ts">
const route = useRoute()
const requestURL = useRequestURL()
const { locale, locales, t } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
type SwitchLocale = Parameters<typeof switchLocalePath>[0]

type LocaleParam = string | string[] | undefined
type RouteName = string | symbol | null | undefined

const localeFlags: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  vi: '🇻🇳',
  nb: '🇳🇴',
}

type LocaleEntry = string | { code?: string | null }

function getLocaleCode(entry: LocaleEntry): string | null {
  if (typeof entry === 'string') return entry
  if (!entry || typeof entry.code !== 'string') return null
  return entry.code
}

function getLocaleFromRouteParam(value: LocaleParam): string | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return typeof candidate === 'string' ? candidate : null
}

function getFirstPathSegment(path: string): string | null {
  return path.split('?')[0]?.split('/').filter(Boolean)[0] ?? null
}

function normalizePath(path: string | null | undefined): string {
  if (!path) return '/'
  const [withoutQuery] = path.split('?')
  const [withoutHash] = withoutQuery.split('#')
  const trimmed = withoutHash.replace(/\/+$/, '')
  return trimmed || '/'
}

function getLocaleFromRouteName(name: RouteName): string | null {
  if (typeof name !== 'string') return null
  const parts = name.split('___')
  return parts[1] ?? null
}

const localeOptions = computed(() => {
  return locales.value
    .map(entry => getLocaleCode(entry as LocaleEntry))
    .filter((code): code is string => !!code)
    .map(code => ({
      code,
      label: `${localeFlags[code] ?? '🌐'} ${code.toLowerCase()}`,
    }))
})

const resolvedLocaleCode = computed(() => {
  const currentPath = normalizePath(
    import.meta.client ? window.location.pathname : requestURL.pathname,
  )
  const matchedBySwitchPath = localeOptions.value.find((option) => {
    const localizedPath = switchLocalePath(option.code as SwitchLocale)
    return normalizePath(localizedPath) === currentPath
  })
  if (matchedBySwitchPath) {
    return matchedBySwitchPath.code
  }

  const routeNameLocale = getLocaleFromRouteName(route.name)
  if (routeNameLocale && localeOptions.value.some(option => option.code === routeNameLocale)) {
    return routeNameLocale
  }

  const routeLocale = getLocaleFromRouteParam(route.params?.locale as LocaleParam)
  if (routeLocale && localeOptions.value.some(option => option.code === routeLocale)) {
    return routeLocale
  }

  const routePathLocale = getFirstPathSegment(route.path)
  if (routePathLocale && localeOptions.value.some(option => option.code === routePathLocale)) {
    return routePathLocale
  }

  const routeFullPathLocale = getFirstPathSegment(route.fullPath)
  if (routeFullPathLocale && localeOptions.value.some(option => option.code === routeFullPathLocale)) {
    return routeFullPathLocale
  }

  const requestPathLocale = getFirstPathSegment(requestURL.pathname)
  if (requestPathLocale && localeOptions.value.some(option => option.code === requestPathLocale)) {
    return requestPathLocale
  }

  const localeCode = String(locale.value)
  if (localeOptions.value.some(option => option.code === localeCode)) {
    return localeCode
  }

  return localeOptions.value[0]?.code ?? ''
})

const selectedLocaleCode = computed({
  get: () => resolvedLocaleCode.value,
  set: (nextLocale: string) => {
    void handleLocaleChange(nextLocale)
  },
})

const showI18nProbe = computed(() => {
  const i18nTestQuery = route.query.i18nTest
  if (Array.isArray(i18nTestQuery)) return i18nTestQuery.includes('1')
  return i18nTestQuery === '1'
})

const i18nProbeText = computed(() => t('common.language'))

async function handleLocaleChange(nextLocale: string) {
  if (!nextLocale || nextLocale === selectedLocaleCode.value) return

  const selectedLocale = localeOptions.value.find(option => option.code === nextLocale)?.code
  if (!selectedLocale) return

  const switchPath = switchLocalePath(selectedLocale)
  await navigateTo(switchPath || localePath('/'))
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      v-if="showI18nProbe"
      data-testid="i18n-probe"
      class="text-xs font-medium text-surface-500 dark:text-surface-400"
    >
      {{ i18nProbeText }}
    </span>

    <select
      v-model="selectedLocaleCode"
      aria-label="Select language"
      class="h-8 min-w-14 rounded-md border border-surface-300/45 dark:border-surface-700/55 bg-transparent px-2 text-xs font-medium lowercase text-surface-500 dark:text-surface-400 outline-none transition-colors hover:border-surface-400/60 hover:text-surface-700 dark:hover:border-surface-600 dark:hover:text-surface-200 focus:border-brand-500/70 focus:text-surface-800 dark:focus:text-surface-100"
    >
      <option
        v-for="option in localeOptions"
        :key="option.code"
        :value="option.code"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
