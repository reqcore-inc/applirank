<script setup lang="ts">
import {
  ShieldCheck, Plus, Trash2, Loader2, Check, X, AlertTriangle,
  ExternalLink, Copy, Globe, KeyRound,
} from 'lucide-vue-next'

definePageMeta({})

useSeoMeta({
  title: 'Single Sign-On — Reqcore',
  description: 'Configure enterprise SSO for your organization',
})

const { allowed: canManageSso } = usePermission({ organization: ['update'] })
const { track } = useTrack()

// ─────────────────────────────────────────────
// Fetch existing SSO providers
// ─────────────────────────────────────────────
const {
  data: providers,
  status: fetchStatus,
  refresh: refreshProviders,
} = useFetch<Array<{
  id: string
  providerId: string
  issuer: string
  domain: string
  organizationId: string
}>>('/api/sso/providers', {
  default: () => [],
})

const hasProvider = computed(() => (providers.value?.length ?? 0) > 0)

// ─────────────────────────────────────────────
// Registration form
// ─────────────────────────────────────────────
const showForm = ref(false)
const isRegistering = ref(false)
const formError = ref('')
const formSuccess = ref('')

const form = reactive({
  providerId: '',
  issuer: '',
  domain: '',
  clientId: '',
  clientSecret: '',
})

function resetForm() {
  form.providerId = ''
  form.issuer = ''
  form.domain = ''
  form.clientId = ''
  form.clientSecret = ''
  formError.value = ''
}

/**
 * Auto-suggest providerId from the domain entered.
 * e.g. "acme.com" → "acme-sso"
 */
watch(() => form.domain, (domain) => {
  if (!form.providerId && domain) {
    const slug = domain.split('.')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? ''
    if (slug) form.providerId = `${slug}-sso`
  }
})

async function handleRegister() {
  if (!canManageSso.value) return

  formError.value = ''
  formSuccess.value = ''
  isRegistering.value = true

  try {
    await $fetch('/api/sso/providers', {
      method: 'POST',
      body: {
        providerId: form.providerId.trim().toLowerCase(),
        issuer: form.issuer.trim(),
        domain: form.domain.trim().toLowerCase(),
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret.trim(),
      },
    })

    track('sso_provider_registered')
    formSuccess.value = 'SSO provider registered successfully. Your team can now sign in with their corporate credentials.'
    resetForm()
    showForm.value = false
    await refreshProviders()
  } catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }; message?: string }
    formError.value = fetchErr.data?.statusMessage ?? fetchErr.message ?? 'Failed to register SSO provider'
  } finally {
    isRegistering.value = false
  }
}

// ─────────────────────────────────────────────
// Delete provider
// ─────────────────────────────────────────────
const deletingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

async function handleDelete(id: string) {
  if (!canManageSso.value) return

  deletingId.value = id
  try {
    await $fetch(`/api/sso/providers/${id}`, { method: 'DELETE' })
    track('sso_provider_deleted')
    formSuccess.value = 'SSO provider removed.'
    confirmDeleteId.value = null
    await refreshProviders()
  } catch (err: unknown) {
    const fetchErr = err as { data?: { statusMessage?: string }; message?: string }
    formError.value = fetchErr.data?.statusMessage ?? fetchErr.message ?? 'Failed to remove SSO provider'
  } finally {
    deletingId.value = null
  }
}

// ─────────────────────────────────────────────
// Copy callback URL
// ─────────────────────────────────────────────
const copiedProviderId = ref<string | null>(null)

function getCallbackUrl(providerId: string) {
  const base = window.location.origin
  return `${base}/api/auth/sso/callback/${providerId}`
}

async function copyCallbackUrl(providerId: string) {
  try {
    await navigator.clipboard.writeText(getCallbackUrl(providerId))
    copiedProviderId.value = providerId
    setTimeout(() => { copiedProviderId.value = null }, 2000)
  } catch {
    // Fallback for non-HTTPS environments
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-100">
        Single Sign-On
      </h1>
      <p class="mt-1 text-sm text-surface-500 dark:text-surface-400">
        Allow your team to sign in with their corporate identity provider (Okta, Azure AD, Google Workspace, etc.).
      </p>
    </div>

    <!-- Success/Error Messages -->
    <Transition name="fade">
      <div
        v-if="formSuccess"
        class="mb-4 flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3"
      >
        <Check class="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p class="text-sm text-emerald-700 dark:text-emerald-300 flex-1">
          {{ formSuccess }}
        </p>
        <button class="text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200" @click="formSuccess = ''">
          <X class="size-4" />
        </button>
      </div>
    </Transition>

    <Transition name="fade">
      <div
        v-if="formError"
        class="mb-4 flex items-center gap-3 rounded-lg border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/30 px-4 py-3"
      >
        <AlertTriangle class="size-4 text-danger-500 shrink-0" />
        <p class="text-sm text-danger-700 dark:text-danger-300 flex-1">
          {{ formError }}
        </p>
        <button class="text-danger-400 hover:text-danger-600 dark:hover:text-danger-200" @click="formError = ''">
          <X class="size-4" />
        </button>
      </div>
    </Transition>

    <!-- Loading state -->
    <div v-if="fetchStatus === 'pending'" class="flex items-center gap-3 py-12 justify-center">
      <Loader2 class="size-5 animate-spin text-surface-400" />
      <span class="text-sm text-surface-400">Loading SSO configuration…</span>
    </div>

    <template v-else>
      <!-- Existing providers -->
      <div v-if="hasProvider" class="space-y-3 mb-6">
        <div
          v-for="provider in providers"
          :key="provider.id"
          class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <ShieldCheck class="size-4 text-emerald-500 shrink-0" />
                <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">
                  {{ provider.providerId }}
                </h3>
                <span class="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Active
                </span>
              </div>
              <div class="space-y-1 text-xs text-surface-500 dark:text-surface-400">
                <p class="flex items-center gap-1.5">
                  <Globe class="size-3" />
                  <span>Domain: <span class="font-medium text-surface-700 dark:text-surface-300">{{ provider.domain }}</span></span>
                </p>
                <p class="flex items-center gap-1.5">
                  <KeyRound class="size-3" />
                  <span>Issuer: <span class="font-mono text-surface-600 dark:text-surface-400">{{ provider.issuer }}</span></span>
                </p>
              </div>

              <!-- Callback URL helper -->
              <div class="mt-3 rounded-md bg-surface-50 dark:bg-surface-800/50 px-3 py-2">
                <p class="text-xs font-medium text-surface-600 dark:text-surface-300 mb-1">
                  Redirect URI (add this in your IdP):
                </p>
                <div class="flex items-center gap-2">
                  <code class="text-xs font-mono text-surface-500 dark:text-surface-400 break-all flex-1">
                    {{ getCallbackUrl(provider.providerId) }}
                  </code>
                  <button
                    class="shrink-0 rounded p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    title="Copy callback URL"
                    @click="copyCallbackUrl(provider.providerId)"
                  >
                    <Check v-if="copiedProviderId === provider.providerId" class="size-3.5 text-emerald-500" />
                    <Copy v-else class="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Delete button -->
            <div v-if="canManageSso" class="shrink-0">
              <template v-if="confirmDeleteId === provider.id">
                <div class="flex items-center gap-1">
                  <button
                    class="rounded px-2 py-1 text-xs font-medium text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-950/40 hover:bg-danger-100 dark:hover:bg-danger-950/60 transition-colors disabled:opacity-50"
                    :disabled="deletingId === provider.id"
                    @click="handleDelete(provider.id)"
                  >
                    <Loader2 v-if="deletingId === provider.id" class="size-3 animate-spin" />
                    <span v-else>Confirm</span>
                  </button>
                  <button
                    class="rounded px-2 py-1 text-xs font-medium text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    @click="confirmDeleteId = null"
                  >
                    Cancel
                  </button>
                </div>
              </template>
              <button
                v-else
                class="rounded p-1.5 text-surface-400 hover:text-danger-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                title="Remove SSO provider"
                @click="confirmDeleteId = provider.id"
              >
                <Trash2 class="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!showForm"
        class="rounded-lg border border-dashed border-surface-300 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30 p-8 text-center"
      >
        <ShieldCheck class="size-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
        <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">
          No SSO provider configured
        </h3>
        <p class="text-xs text-surface-500 dark:text-surface-400 mb-4 max-w-sm mx-auto">
          Connect your corporate identity provider so your team can sign in with their work accounts — no separate passwords needed.
        </p>
        <button
          v-if="canManageSso"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
          @click="showForm = true"
        >
          <Plus class="size-4" />
          Add SSO Provider
        </button>
      </div>

      <!-- Add another provider (when one already exists) -->
      <div v-if="hasProvider && !showForm && canManageSso" class="mb-6">
        <button
          class="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          @click="showForm = true"
        >
          <Plus class="size-4" />
          Add another provider
        </button>
      </div>

      <!-- Registration form -->
      <Transition name="fade">
        <div v-if="showForm" class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <h3 class="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-4">
            Register OIDC SSO Provider
          </h3>

          <form class="space-y-4" @submit.prevent="handleRegister">
            <!-- Domain -->
            <label class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300">
              <span>Email domain <span class="text-danger-500">*</span></span>
              <input
                v-model="form.domain"
                type="text"
                placeholder="company.com"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
              />
              <span class="text-xs text-surface-400">Users with this email domain will be routed to this SSO provider.</span>
            </label>

            <!-- Issuer URL -->
            <label class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300">
              <span>Issuer URL <span class="text-danger-500">*</span></span>
              <input
                v-model="form.issuer"
                type="url"
                placeholder="https://your-org.okta.com"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 font-mono text-xs"
              />
              <span class="text-xs text-surface-400">
                The OIDC issuer URL. Reqcore will auto-discover endpoints from
                <code class="text-xs">/.well-known/openid-configuration</code>.
              </span>
            </label>

            <!-- Provider ID -->
            <label class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300">
              <span>Provider ID <span class="text-danger-500">*</span></span>
              <input
                v-model="form.providerId"
                type="text"
                placeholder="company-sso"
                required
                pattern="^[a-z0-9-]+$"
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
              />
              <span class="text-xs text-surface-400">A unique slug for this provider. Lowercase letters, numbers, and hyphens only.</span>
            </label>

            <!-- Client ID -->
            <label class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300">
              <span>Client ID <span class="text-danger-500">*</span></span>
              <input
                v-model="form.clientId"
                type="text"
                placeholder="Paste from your IdP"
                required
                autocomplete="off"
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 font-mono text-xs"
              />
            </label>

            <!-- Client Secret -->
            <label class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300">
              <span>Client Secret <span class="text-danger-500">*</span></span>
              <input
                v-model="form.clientSecret"
                type="password"
                placeholder="Paste from your IdP"
                required
                autocomplete="off"
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
              />
              <span class="text-xs text-surface-400">Stored encrypted. Never exposed in the UI after saving.</span>
            </label>

            <!-- Actions -->
            <div class="flex items-center gap-3 pt-2">
              <button
                type="submit"
                :disabled="isRegistering"
                class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Loader2 v-if="isRegistering" class="size-4 animate-spin" />
                <ShieldCheck v-else class="size-4" />
                {{ isRegistering ? 'Verifying & registering…' : 'Register SSO Provider' }}
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                @click="showForm = false; resetForm()"
              >
                Cancel
              </button>
            </div>
          </form>

          <!-- Setup guide -->
          <div class="mt-6 border-t border-surface-100 dark:border-surface-800 pt-4">
            <h4 class="text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider mb-2">
              Quick setup guide
            </h4>
            <ol class="text-xs text-surface-500 dark:text-surface-400 space-y-1.5 list-decimal list-inside">
              <li>Create an OIDC application in your identity provider (Okta, Azure AD, Google Workspace, etc.).</li>
              <li>Set the <strong>Redirect URI</strong> to: <code class="bg-surface-100 dark:bg-surface-800 px-1 py-0.5 rounded text-xs">{{ `${typeof window !== 'undefined' ? window.location.origin : 'https://app.reqcore.com'}/api/auth/sso/callback/{provider-id}` }}</code></li>
              <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> from your IdP and paste them above.</li>
              <li>Enter the <strong>Issuer URL</strong> — Reqcore will auto-discover all OIDC endpoints.</li>
            </ol>

            <div class="mt-3 flex flex-wrap gap-2">
              <a
                href="https://developer.okta.com/docs/guides/sign-into-web-app-redirect/node-express/main/"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Okta guide <ExternalLink class="size-3" />
              </a>
              <a
                href="https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Azure AD guide <ExternalLink class="size-3" />
              </a>
              <a
                href="https://support.google.com/a/answer/60224"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Google Workspace guide <ExternalLink class="size-3" />
              </a>
            </div>
          </div>
        </div>
      </Transition>

      <!-- How it works -->
      <div class="mt-8 rounded-lg border border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/20 p-5">
        <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">
          How Enterprise SSO works
        </h3>
        <div class="space-y-3 text-xs text-surface-500 dark:text-surface-400">
          <div class="flex gap-3">
            <div class="flex items-center justify-center size-6 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0">1</div>
            <p>You register your company's identity provider (IdP) — Okta, Azure AD, Google Workspace, or any OIDC-compliant provider.</p>
          </div>
          <div class="flex gap-3">
            <div class="flex items-center justify-center size-6 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0">2</div>
            <p>Team members visit the sign-in page and enter their work email. Reqcore detects the email domain and redirects to your IdP.</p>
          </div>
          <div class="flex gap-3">
            <div class="flex items-center justify-center size-6 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0">3</div>
            <p>After authenticating with the IdP, users are automatically provisioned into your organization as members — no invitation needed.</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
