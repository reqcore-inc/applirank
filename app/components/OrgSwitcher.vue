<script setup lang="ts">
const { orgs, activeOrg, switchOrg } = useCurrentOrg()
const isOpen = ref(false)
const isSwitching = ref(false)

async function handleSwitch(orgId: string) {
  if (orgId === activeOrg.value?.id) {
    isOpen.value = false
    return
  }

  isSwitching.value = true
  try {
    await switchOrg(orgId)
  } catch {
    isSwitching.value = false
  }
}

/** Close dropdown on outside click */
const switcherRef = useTemplateRef<HTMLElement>('switcherRoot')

function onClickOutside(e: MouseEvent) {
  if (switcherRef.value && !switcherRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="switcherRoot" class="relative">
    <button
      class="flex items-center justify-between w-full px-3 py-2 bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-md cursor-pointer text-[13px] font-medium text-surface-900 dark:text-surface-100 text-left hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      @click="isOpen = !isOpen"
    >
      <ClientOnly fallback="Select org">
        <span class="truncate">{{ activeOrg?.name ?? 'Select org' }}</span>
      </ClientOnly>
      <span class="text-[10px] text-surface-500 dark:text-surface-400">{{ isOpen ? '▲' : '▼' }}</span>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-md shadow-lg z-50 overflow-hidden"
    >
      <div v-if="isSwitching" class="px-3 py-3 text-center text-[13px] text-surface-500 dark:text-surface-400">
        Switching…
      </div>
      <template v-else>
        <button
          v-for="org in orgs"
          :key="org.id"
          class="block w-full px-3 py-2 bg-transparent border-0 text-[13px] text-surface-700 dark:text-surface-300 text-left cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          :class="org.id === activeOrg?.id
            ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-medium'
            : ''"
          @click="handleSwitch(org.id)"
        >
          {{ org.name }}
        </button>

        <NuxtLink
          :to="$localePath('/onboarding/create-org')"
          class="block w-full px-3 py-2 border-t border-surface-200 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400 text-left cursor-pointer no-underline hover:text-surface-900 dark:hover:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          @click="isOpen = false"
        >
          + Create organization
        </NuxtLink>
      </template>
    </div>
  </div>
</template>
