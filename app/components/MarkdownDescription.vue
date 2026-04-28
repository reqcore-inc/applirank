<script setup lang="ts">
import type { MDCParseOptions } from '@nuxtjs/mdc'
import MDC from '@nuxtjs/mdc/runtime/components/MDC.vue'

const props = defineProps<{
  value?: string | null
}>()

const parserOptions: MDCParseOptions = {
  rehype: {
    options: {
      allowDangerousHtml: false,
    },
    plugins: {
      'rehype-raw': false,
    },
  },
  highlight: false,
  toc: false,
}

const normalizedValue = computed(() => props.value ?? '')
</script>

<template>
  <MDC
    :value="normalizedValue"
    :parser-options="parserOptions"
    class="prose prose-sm max-w-none prose-headings:mt-5 prose-headings:mb-2 prose-headings:text-surface-900 prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1.5 prose-a:text-brand-600 hover:prose-a:text-brand-700 prose-headings:[&_a]:text-inherit hover:prose-headings:[&_a]:text-inherit prose-headings:[&_a]:no-underline hover:prose-headings:[&_a]:no-underline prose-headings:[&_a]:font-[inherit] dark:prose-invert dark:prose-headings:text-surface-100"
  />
</template>