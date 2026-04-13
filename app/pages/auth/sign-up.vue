<script setup lang="ts">
definePageMeta({
    layout: "auth",
    middleware: ["guest"],
});

useSeoMeta({
    title: "Sign Up — Reqcore",
    description: "Create your Reqcore account",
    robots: "noindex, nofollow",
});

const route = useRoute();
const name = ref("");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const isLoading = ref(false);
const localePath = useLocalePath();
const { track } = useTrack();
const config = useRuntimeConfig();
const oidcEnabled = computed(() => config.public.oidcEnabled as boolean);
const oidcProviderName = computed(
    () => (config.public.oidcProviderName as string) || "SSO",
);
const socialLoading = ref<string | null>(null);

const socialProviders = computed(() => {
    const providers: { id: string; name: string }[] = [];
    if (config.public.authGoogleEnabled) providers.push({ id: "google", name: "Google" });
    if (config.public.authGithubEnabled) providers.push({ id: "github", name: "GitHub" });
    if (config.public.authMicrosoftEnabled) providers.push({ id: "microsoft", name: "Microsoft" });
    return providers;
});

onMounted(() => track("signup_page_viewed"));

// If the user arrived from an invitation link, we'll redirect back after sign-up
const pendingInvitation = computed(
    () => route.query.invitation as string | undefined,
);

async function handleSignUp() {
    error.value = "";

    if (!name.value || !email.value || !password.value) {
        error.value = "All fields are required.";
        return;
    }

    if (password.value.length < 8) {
        error.value = "Password must be at least 8 characters.";
        return;
    }

    if (password.value !== confirmPassword.value) {
        error.value = "Passwords do not match.";
        return;
    }

    isLoading.value = true;

    track("signup_submitted");

    const result = await authClient.signUp.email({
        email: email.value,
        password: password.value,
        name: name.value,
    });

    if (result.error) {
        if (result.error.status === 500) {
            error.value =
                result.error.message && result.error.message !== "Server Error"
                    ? result.error.message
                    : 'Sign-up failed due to a server error. If you are self-hosting, make sure the BETTER_AUTH_URL environment variable is set to your deployment domain (e.g. "https://your-app.up.railway.app") and redeploy.';
        } else {
            error.value =
                result.error.message ?? "Sign-up failed. Please try again.";
        }
        track("signup_failed", { error_type: result.error.code ?? "unknown" });
        isLoading.value = false;
        return;
    }

    track("signup_completed");

    clearNuxtData();

    // If the user was accepting an invitation, redirect back to accept it
    if (pendingInvitation.value) {
        await navigateTo(
            localePath(`/auth/accept-invitation/${pendingInvitation.value}`),
        );
    } else {
        await navigateTo(localePath("/onboarding/create-org"));
    }
}

async function handleSsoSignUp() {
    isLoading.value = true;
    error.value = "";
    const callbackURL = pendingInvitation.value
        ? localePath(`/auth/accept-invitation/${pendingInvitation.value}`)
        : localePath("/dashboard");
    try {
        await authClient.signIn.oauth2({
            providerId: "oidc",
            callbackURL,
        });
    } catch (e: unknown) {
        error.value =
            e instanceof Error
                ? e.message
                : "SSO sign-up failed. Please try again.";
        isLoading.value = false;
    }
}

/**
 * Social sign-up — Google, GitHub, Microsoft.
 * Uses better-auth's built-in signIn.social() which handles the full OAuth redirect flow.
 * New users are auto-registered on first social login.
 */
async function handleSocialSignUp(providerId: string) {
    socialLoading.value = providerId;
    error.value = "";
    const callbackURL = pendingInvitation.value
        ? localePath(`/auth/accept-invitation/${pendingInvitation.value}`)
        : localePath("/onboarding/create-org");
    try {
        await authClient.signIn.social({
            provider: providerId as "google" | "github" | "microsoft",
            callbackURL,
        });
    } catch (e: unknown) {
        error.value =
            e instanceof Error
                ? e.message
                : "Social sign-up failed. Please try again.";
        socialLoading.value = null;
    }
}
</script>

<template>
    <form class="flex flex-col gap-4" @submit.prevent="handleSignUp">
        <h2
            class="text-xl font-semibold text-center text-surface-900 dark:text-surface-100 mb-2"
        >
            Create your account
        </h2>

        <div
            v-if="error"
            class="rounded-md border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400"
        >
            {{ error }}
        </div>

        <!-- Social sign-up providers (Google, GitHub, Microsoft) -->
        <template v-if="socialProviders.length">
            <div class="flex flex-col gap-2.5">
                <button
                    v-for="provider in socialProviders"
                    :key="provider.id"
                    type="button"
                    :disabled="!!socialLoading || isLoading"
                    class="relative px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 hover:border-surface-300 dark:hover:border-surface-600"
                    @click="handleSocialSignUp(provider.id)"
                >
                    <template v-if="socialLoading === provider.id">
                        <svg class="animate-spin size-4 text-surface-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                        Redirecting…
                    </template>
                    <template v-else>
                        <!-- Google icon -->
                        <svg v-if="provider.id === 'google'" class="size-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        <!-- GitHub icon -->
                        <svg v-else-if="provider.id === 'github'" class="size-5 text-surface-900 dark:text-surface-100" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <!-- Microsoft icon -->
                        <svg v-else-if="provider.id === 'microsoft'" class="size-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
                            <rect x="12" y="1" width="10" height="10" fill="#7FBA00"/>
                            <rect x="1" y="12" width="10" height="10" fill="#00A4EF"/>
                            <rect x="12" y="12" width="10" height="10" fill="#FFB900"/>
                        </svg>
                        Continue with {{ provider.name }}
                    </template>
                </button>
            </div>

            <div v-if="!oidcEnabled" class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-surface-200 dark:border-surface-700" />
                </div>
                <div class="relative flex justify-center text-xs">
                    <span class="bg-white dark:bg-surface-900 px-2 text-surface-400">or continue with email</span>
                </div>
            </div>
        </template>

        <!-- SSO sign-up — only shown when OIDC is configured via environment variables -->
        <template v-if="oidcEnabled">
            <button
                type="button"
                :disabled="isLoading"
                class="px-4 py-2.5 bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 rounded-md text-sm font-medium cursor-pointer hover:bg-surface-900 dark:hover:bg-surface-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                @click="handleSsoSignUp"
            >
                <template v-if="isLoading">Redirecting…</template>
                <template v-else>
                    Sign up with {{ oidcProviderName }}
                    <span class="inline-flex items-center rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">Beta</span>
                </template>
            </button>

            <div class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div
                        class="w-full border-t border-surface-200 dark:border-surface-700"
                    />
                </div>
                <div class="relative flex justify-center text-xs">
                    <span
                        class="bg-white dark:bg-surface-900 px-2 text-surface-400"
                        >or continue with email</span
                    >
                </div>
            </div>
        </template>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Name</span>
            <input
                v-model="name"
                type="text"
                autocomplete="name"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Email</span>
            <input
                v-model="email"
                type="email"
                autocomplete="email"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Password</span>
            <input
                v-model="password"
                type="password"
                autocomplete="new-password"
                required
                minlength="8"
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <label
            class="flex flex-col gap-1 text-sm font-medium text-surface-700 dark:text-surface-300"
        >
            <span>Confirm password</span>
            <input
                v-model="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <button
            type="submit"
            :disabled="isLoading"
            class="mt-2 px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
            {{ isLoading ? "Creating account…" : "Sign up" }}
        </button>

        <p class="text-center text-sm text-surface-500 dark:text-surface-400">
            Already have an account?
            <NuxtLink
                :to="
                    pendingInvitation
                        ? $localePath({
                              path: '/auth/sign-in',
                              query: { invitation: pendingInvitation },
                          })
                        : $localePath('/auth/sign-in')
                "
                class="text-brand-600 dark:text-brand-400 hover:underline"
                >Sign in</NuxtLink
            >
        </p>
    </form>
</template>
