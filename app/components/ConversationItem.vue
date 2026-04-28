<script setup lang="ts">
/**
 * Single conversation row in the chatbot sidebar.
 *
 * Stateless / fully controlled by the parent ChatbotSidebar:
 *   - "active" highlights the open conversation.
 *   - "is-editing" + "edit-title-model" puts the row into rename mode.
 *   - "menu-open" toggles the contextual action popover.
 * All actions emit upward — the composable lives in the parent.
 */
import {
  MessageSquare, Pin, PinOff, MoreHorizontal, Pencil, Trash2,
  FolderInput, Inbox,
} from 'lucide-vue-next'
import type { ChatbotConversationSummary, ChatbotFolder } from '~~/shared/chatbot'

const props = defineProps<{
  conversation: ChatbotConversationSummary
  active: boolean
  isEditing: boolean
  menuOpen: boolean
  editTitleModel: string
  folders: ChatbotFolder[]
  relativeTime: string
}>()

const emit = defineEmits<{
  open: []
  startRename: [c: ChatbotConversationSummary]
  commitRename: [c: ChatbotConversationSummary]
  cancelRename: []
  'update:editTitle': [value: string]
  toggleMenu: [e: MouseEvent]
  togglePin: [c: ChatbotConversationSummary]
  move: [c: ChatbotConversationSummary, folderId: string | null]
  delete: [c: ChatbotConversationSummary]
}>()

const renameInput = useTemplateRef<HTMLInputElement>('renameInput')

watch(() => props.isEditing, (v) => {
  if (v) nextTick(() => renameInput.value?.focus())
})
</script>

<template>
  <div
    class="group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer"
    :class="active
      ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-100'
      : 'text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800/60'"
    @click="!isEditing && emit('open')"
  >
    <MessageSquare class="size-3.5 shrink-0 opacity-60" />

    <input
      v-if="isEditing"
      ref="renameInput"
      :value="editTitleModel"
      class="min-w-0 flex-1 rounded bg-white dark:bg-surface-900 px-1 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      @click.stop
      @input="emit('update:editTitle', ($event.target as HTMLInputElement).value)"
      @keydown.enter="emit('commitRename', conversation)"
      @keydown.escape="emit('cancelRename')"
      @blur="emit('commitRename', conversation)"
    >
    <div v-else class="flex min-w-0 flex-1 flex-col">
      <div class="flex items-center gap-1.5">
        <span class="truncate">{{ conversation.title }}</span>
        <Pin v-if="conversation.pinned" class="size-3 shrink-0 text-warning-500" />
      </div>
      <span
        v-if="conversation.lastMessagePreview"
        class="truncate text-[11px] text-surface-400 dark:text-surface-500"
      >
        {{ conversation.lastMessagePreview }}
      </span>
    </div>

    <div v-if="!isEditing" class="relative shrink-0 flex items-center">
      <span class="whitespace-nowrap text-[10px] text-surface-400 dark:text-surface-500 group-hover:invisible">
        {{ relativeTime }}
      </span>
      <button
        class="absolute right-0 size-6 flex items-center justify-center rounded text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-700 invisible group-hover:visible cursor-pointer border-0 bg-transparent"
        title="Actions"
        @click.stop="(e) => emit('toggleMenu', e)"
      >
        <MoreHorizontal class="size-4" />
      </button>
    </div>

    <!-- Action menu -->
    <div
      v-if="menuOpen"
      class="absolute right-1 top-9 z-20 w-48 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-lg py-1"
      @click.stop
    >
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer border-0 bg-transparent"
        @click="emit('togglePin', conversation)"
      >
        <component :is="conversation.pinned ? PinOff : Pin" class="size-3.5" />
        {{ conversation.pinned ? 'Unpin' : 'Pin' }}
      </button>
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer border-0 bg-transparent"
        @click="emit('startRename', conversation)"
      >
        <Pencil class="size-3.5" />
        Rename
      </button>

      <div class="my-1 border-t border-surface-200 dark:border-surface-800" />
      <div class="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
        Move to
      </div>
      <button
        v-if="conversation.folderId !== null"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer border-0 bg-transparent"
        @click="emit('move', conversation, null)"
      >
        <Inbox class="size-3.5" />
        Uncategorised
      </button>
      <button
        v-for="f in folders.filter((x) => x.id !== conversation.folderId)"
        :key="f.id"
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer border-0 bg-transparent"
        @click="emit('move', conversation, f.id)"
      >
        <FolderInput class="size-3.5" />
        <span class="truncate">{{ f.name }}</span>
      </button>

      <div class="my-1 border-t border-surface-200 dark:border-surface-800" />
      <button
        class="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 cursor-pointer border-0 bg-transparent"
        @click="emit('delete', conversation)"
      >
        <Trash2 class="size-3.5" />
        Delete
      </button>
    </div>
  </div>
</template>
