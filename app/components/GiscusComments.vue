<script setup lang="ts">
/**
 * GiscusComments — loads the Giscus widget for GitHub Discussions.
 * Renders as a client-only component; the <script> tag is injected on mount.
 */

const props = defineProps<{
  /** The discussion term — typically a feature path like "catalog/pipeline-management/job-management" */
  term: string
}>()

const containerRef = ref<HTMLDivElement>()
const runtimeConfig = useRuntimeConfig()

function loadGiscus() {
  if (!containerRef.value) return
  if (!runtimeConfig.public.giscusRepoId || !runtimeConfig.public.giscusCategoryId) return

  // Clear any existing widget
  containerRef.value.innerHTML = ''

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', 'applirank/applirank')
  script.setAttribute('data-repo-id', runtimeConfig.public.giscusRepoId)
  script.setAttribute('data-category', 'Feature Catalog')
  script.setAttribute('data-category-id', runtimeConfig.public.giscusCategoryId)
  script.setAttribute('data-mapping', 'specific')
  script.setAttribute('data-term', props.term)
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'top')
  script.setAttribute('data-theme', 'dark_dimmed')
  script.setAttribute('data-lang', 'en')
  script.setAttribute('data-loading', 'lazy')
  script.crossOrigin = 'anonymous'
  script.async = true

  containerRef.value.appendChild(script)
}

onMounted(() => {
  loadGiscus()
})

watch(() => props.term, () => {
  loadGiscus()
})
</script>

<template>
  <div ref="containerRef" class="giscus-container" />
</template>
