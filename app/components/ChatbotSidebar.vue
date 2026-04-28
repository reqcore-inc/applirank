<script setup lang="ts">
/**
 * ChatbotSidebar
 *
 * Left rail of the chatbot page:
 *   - "New chat" button (creates a conversation in the currently-selected folder).
 *   - Folder list with collapsible groups.
 *   - "Uncategorised" group at the top (conversations with folderId === null).
 *   - Pinned conversations float to the top of every group.
 *   - Per-conversation actions: rename, pin/unpin, move to folder, delete.
 *   - Manage Agents button → opens the agent manager modal.
 *
 * State comes from useChatbot(); this component is purely presentational
 * + thin wiring around the composable's actions.
 */
import {
  Plus, FolderPlus, Folder as FolderIcon, FolderOpen,
  ChevronRight, MessageSquare, Pin, PinOff,
  MoreHorizontal, Pencil, Trash2, Sparkles, Inbox,
  X, Check,
} from 'lucide-vue-next'
import type { ChatbotConversationSummary, ChatbotFolder } from '~~/shared/chatbot'

const {
  conversations, folders,
  currentConversationId,
  newConversation, openConversation,
  updateConversation, deleteConversation,
  createFolder, renameFolder, deleteFolder,
} = useChatbot()

const emit = defineEmits<{ openAgents: [] }>()

// ── Folder collapse state — local only. Defaults to expanded. ──
const collapsed = ref<Set<string>>(new Set())
function toggleFolder(id: string) {
  if (collapsed.value.has(id)) collapsed.value.delete(id)
  else collapsed.value.add(id)
  collapsed.value = new Set(collapsed.value)
}

// ── Group conversations by folder ──
const uncategorised = computed(() =>
  conversations.value.filter((c) => !c.folderId),
)
function conversationsForFolder(folderId: string) {
  return conversations.value.filter((c) => c.folderId === folderId)
}

// ── New folder inline input ──
const showNewFolder = ref(false)
const newFolderName = ref('')
const newFolderInput = useTemplateRef<HTMLInputElement>('newFolderInput')
function startNewFolder() {
  showNewFolder.value = true
  newFolderName.value = ''
  nextTick(() => newFolderInput.value?.focus())
}
async function commitNewFolder() {
  const name = newFolderName.value.trim()
  if (!name) {
    showNewFolder.value = false
    return
  }
  await createFolder(name)
  showNewFolder.value = false
  newFolderName.value = ''
}

// ── Per-conversation menu ──
const openMenuId = ref<string | null>(null)
const editingConvId = ref<string | null>(null)
const editingTitle = ref('')

function startRename(c: ChatbotConversationSummary) {
  editingConvId.value = c.id
  editingTitle.value = c.title
  openMenuId.value = null
}
async function commitRename(c: ChatbotConversationSummary) {
  const t = editingTitle.value.trim()
  editingConvId.value = null
  if (t && t !== c.title) {
    await updateConversation(c.id, { title: t })
  }
}

async function togglePin(c: ChatbotConversationSummary) {
  openMenuId.value = null
  await updateConversation(c.id, { pinned: !c.pinned })
}

async function moveToFolder(c: ChatbotConversationSummary, folderId: string | null) {
  openMenuId.value = null
  if (c.folderId === folderId) return
  await updateConversation(c.id, { folderId })
}

async function confirmDeleteConv(c: ChatbotConversationSummary) {
  openMenuId.value = null
  if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return
  await deleteConversation(c.id)
}

async function confirmDeleteFolder(f: ChatbotFolder) {
  if (!confirm(`Delete folder "${f.name}"? Conversations inside will be moved to Uncategorised.`)) return
  await deleteFolder(f.id)
}

// ── Editing folders ──
const editingFolderId = ref<string | null>(null)
const editingFolderName = ref('')
function startRenameFolder(f: ChatbotFolder) {
  editingFolderId.value = f.id
  editingFolderName.value = f.name
}
async function commitRenameFolder(f: ChatbotFolder) {
  const n = editingFolderName.value.trim()
  editingFolderId.value = null
  if (n && n !== f.name) await renameFolder(f.id, n)
}

// ── New chat: stays in same folder if currently inside one ──
async function handleNewChat(folderId?: string | null) {
  const cur = conversations.value.find((c) => c.id === currentConversationId.value)
  await newConversation({ folderId: folderId !== undefined ? folderId : cur?.folderId ?? null })
}

// ── Click-outside dismissal for action menu ──
function onWindowClick() {
  openMenuId.value = null
}
onMounted(() => window.addEventListener('click', onWindowClick))
onUnmounted(() => window.removeEventListener('click', onWindowClick))

function relativeTime(ms: number | null) {
  if (!ms) return ''
  const diff = Date.now() - ms
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(ms).toLocaleDateString()
}
</script>

<template>
  <aside class="flex h-full w-72 shrink-0 flex-col border-r border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-950/40">
    <!-- Top actions -->
    <div class="flex items-center gap-2 border-b border-surface-200 dark:border-surface-800 px-3 h-14 shrink-0">
      <button
        class="inline-flex flex-1 h-9 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors cursor-pointer"
        @click="handleNewChat()"
      >
        <Plus class="size-4" />
        New chat
      </button>
      <button
        class="inline-flex items-center justify-center size-9 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer"
        title="New folder"
        @click="startNewFolder"
      >
        <FolderPlus class="size-4" />
      </button>
    </div>

    <!-- Inline new-folder input -->
    <div v-if="showNewFolder" class="border-b border-surface-200 dark:border-surface-800 px-3 py-2">
      <div class="flex items-center gap-1.5 rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-surface-900 px-2 py-1">
        <FolderIcon class="size-4 text-brand-500" />
        <input
          ref="newFolderInput"
          v-model="newFolderName"
          class="flex-1 bg-transparent text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none"
          placeholder="Folder name"
          @keydown.enter="commitNewFolder"
          @keydown.escape="showNewFolder = false"
        />
        <button
          class="inline-flex size-6 items-center justify-center rounded text-surface-500 hover:text-success-600 hover:bg-success-50 dark:hover:bg-success-950/30 cursor-pointer border-0 bg-transparent"
          title="Create"
          @click="commitNewFolder"
        >
          <Check class="size-3.5" />
        </button>
        <button
          class="inline-flex size-6 items-center justify-center rounded text-surface-500 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 cursor-pointer border-0 bg-transparent"
          title="Cancel"
          @click="showNewFolder = false"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </div>

    <!-- Conversation list -->
    <div class="flex-1 min-h-0 overflow-y-auto py-2">
      <!-- Folders -->
      <div
        v-for="f in folders"
        :key="f.id"
        class="mb-2"
      >
        <div class="group flex items-center gap-1 px-2 py-1">
          <button
            class="inline-flex size-5 items-center justify-center rounded text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 cursor-pointer border-0 bg-transparent"
            :title="collapsed.has(f.id) ? 'Expand' : 'Collapse'"
            @click="toggleFolder(f.id)"
          >
            <ChevronRight class="size-3 transition-transform" :class="collapsed.has(f.id) ? '' : 'rotate-90'" />
          </button>
          <component
            :is="collapsed.has(f.id) ? FolderIcon : FolderOpen"
            class="size-3.5 text-brand-500"
          />
          <input
            v-if="editingFolderId === f.id"
            v-model="editingFolderName"
            class="min-w-0 flex-1 rounded bg-white dark:bg-surface-900 px-1 py-0.5 text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            @keydown.enter="commitRenameFolder(f)"
            @keydown.escape="editingFolderId = null"
            @blur="commitRenameFolder(f)"
          >
          <button
            v-else
            class="flex-1 truncate text-left text-[11px] font-semibold uppercase tracking-wider text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-surface-100 cursor-pointer border-0 bg-transparent"
            @click="toggleFolder(f.id)"
            @dblclick="startRenameFolder(f)"
          >
            {{ f.name }}
          </button>
          <button
            class="invisible inline-flex size-5 items-center justify-center rounded text-surface-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 group-hover:visible cursor-pointer border-0 bg-transparent"
            title="New chat in this folder"
            @click="handleNewChat(f.id)"
          >
            <Plus class="size-3" />
          </button>
          <button
            class="invisible inline-flex size-5 items-center justify-center rounded text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 group-hover:visible cursor-pointer border-0 bg-transparent"
            title="Rename folder"
            @click="startRenameFolder(f)"
          >
            <Pencil class="size-3" />
          </button>
          <button
            class="invisible inline-flex size-5 items-center justify-center rounded text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 group-hover:visible cursor-pointer border-0 bg-transparent"
            title="Delete folder"
            @click="confirmDeleteFolder(f)"
          >
            <Trash2 class="size-3" />
          </button>
        </div>

        <ul v-if="!collapsed.has(f.id)" class="space-y-0.5 px-1.5 pl-5">
          <li v-if="conversationsForFolder(f.id).length === 0" class="px-2 py-1 text-xs italic text-surface-400">
            Empty.
          </li>
          <li
            v-for="c in [...conversationsForFolder(f.id)].sort((a, b) => Number(b.pinned) - Number(a.pinned))"
            :key="c.id"
          >
            <ConversationItem
              :conversation="c"
              :active="c.id === currentConversationId"
              :is-editing="editingConvId === c.id"
              :menu-open="openMenuId === c.id"
              :edit-title-model="editingTitle"
              :folders="folders"
              :relative-time="relativeTime(c.lastMessageAt ?? c.createdAt)"
              @open="openConversation(c.id)"
              @start-rename="startRename"
              @commit-rename="commitRename"
              @cancel-rename="editingConvId = null"
              @update:edit-title="editingTitle = $event"
              @toggle-menu="(e) => { e.stopPropagation(); openMenuId = openMenuId === c.id ? null : c.id }"
              @toggle-pin="togglePin"
              @move="moveToFolder"
              @delete="confirmDeleteConv"
            />
          </li>
        </ul>
      </div>

      <!-- Uncategorised group -->
      <div class="mb-2">
        <div class="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
          <Inbox class="size-3" />
          Uncategorised
        </div>
        <p
          v-if="uncategorised.length === 0"
          class="px-3 py-1 text-xs italic text-surface-400 dark:text-surface-500"
        >
          No chats yet.
        </p>
        <ul v-else class="space-y-0.5 px-1.5">
          <li
            v-for="c in [...uncategorised].sort((a, b) => Number(b.pinned) - Number(a.pinned))"
            :key="c.id"
          >
            <ConversationItem
              :conversation="c"
              :active="c.id === currentConversationId"
              :is-editing="editingConvId === c.id"
              :menu-open="openMenuId === c.id"
              :edit-title-model="editingTitle"
              :folders="folders"
              :relative-time="relativeTime(c.lastMessageAt ?? c.createdAt)"
              @open="openConversation(c.id)"
              @start-rename="startRename"
              @commit-rename="commitRename"
              @cancel-rename="editingConvId = null"
              @update:edit-title="editingTitle = $event"
              @toggle-menu="(e) => { e.stopPropagation(); openMenuId = openMenuId === c.id ? null : c.id }"
              @toggle-pin="togglePin"
              @move="moveToFolder"
              @delete="confirmDeleteConv"
            />
          </li>
        </ul>
      </div>
    </div>

    <!-- Agents button -->
    <div class="border-t border-surface-200 dark:border-surface-800 p-3">
      <button
        class="inline-flex w-full items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300 transition-colors cursor-pointer"
        @click="emit('openAgents')"
      >
        <Sparkles class="size-4 text-brand-500" />
        Manage agents
      </button>
    </div>
  </aside>
</template>
