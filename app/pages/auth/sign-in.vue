<script setup lang="ts">
import { ShieldCheck } from "lucide-vue-next";

definePageMeta({
    layout: "auth",
    middleware: ["guest"],
});

useSeoMeta({
    title: "Sign In — Reqcore",
    description: "Sign in to your Reqcore account",
    robots: "noindex, nofollow",
});

const email = ref("");
const password = ref("");
const error = ref("");
const isLoading = ref(false);
const ssoRedirecting = ref(false);
const route = useRoute();
const config = useRuntimeConfig();
const localePath = useLocalePath();
const { track } = useTrack();
const oidcEnabled = computed(() => config.public.oidcEnabled as boolean);
const oidcProviderName = computed(
    () => (config.public.oidcProviderName as string) || "SSO",
);

onMounted(() => track("signin_page_viewed"));

if (route.query.live === "1") {
    email.value = config.public.liveDemoEmail;
    password.value = config.public.liveDemoPasscode;
}

// Handle SSO error callbacks
onMounted(() => {
    const ssoError = route.query.error as string | undefined;
    if (ssoError) {
        const description = route.query.error_description as string | undefined;
        error.value =
            description?.replace(/\+/g, " ") ||
            "SSO authentication failed. Please try again.";
    }
});

async function handleSignIn() {
    error.value = "";

    if (!email.value || !password.value) {
        error.value = "Email and password are required.";
        return;
    }

    isLoading.value = true;

    const result = await authClient.signIn.email({
        email: email.value,
        password: password.value,
    });

    if (result.error) {
        if (result.error.status === 500) {
            error.value =
                result.error.message && result.error.message !== "Server Error"
                    ? result.error.message
                    : 'Sign-in failed due to a server error. If you are self-hosting, make sure the BETTER_AUTH_URL environment variable is set to your deployment domain (e.g. "https://your-app.up.railway.app") and redeploy.';
        } else {
            error.value =
                result.error.message ??
                "Invalid credentials. Please try again.";
        }
        isLoading.value = false;
        return;
    }

    clearNuxtData();

    track("signin_completed");

    // If the user was accepting an invitation, redirect back to accept it
    const pendingInvitation = route.query.invitation as string | undefined;
    if (pendingInvitation) {
        await navigateTo(
            localePath(`/auth/accept-invitation/${pendingInvitation}`),
        );
    } else {
        await navigateTo(localePath("/dashboard"));
    }
}

/**
 * Self-hosted OIDC SSO — global provider configured via env vars.
 */
async function handleSelfHostedSso() {
    isLoading.value = true;
    error.value = "";
    try {
        await authClient.signIn.oauth2({
            providerId: "oidc",
            callbackURL: localePath("/dashboard"),
        });
    } catch (e: unknown) {
        error.value =
            e instanceof Error
                ? e.message
                : "SSO sign-in failed. Please try again.";
        isLoading.value = false;
    }
}

/**
 * Enterprise SSO — per-organization provider routing by email domain.
 * Uses Better Auth's SSO plugin: signIn.sso({ email, callbackURL })
 */
async function handleEnterpriseSso() {
    if (!email.value) {
        error.value =
            "Enter your work email address to sign in with SSO.";
        return;
    }

    ssoRedirecting.value = true;
    error.value = "";

    try {
        const result = await authClient.signIn.sso({
            email: email.value,
            callbackURL: localePath("/dashboard"),
            errorCallbackURL: localePath("/auth/sign-in"),
        });

        if (result.error) {
            error.value =
                result.error.message ??
                "No SSO provider found for this email domain. Sign in with email and password instead.";
            ssoRedirecting.value = false;
        }
    } catch (e: unknown) {
        error.value =
            e instanceof Error
                ? e.message
                : "SSO sign-in failed. Please try again.";
        ssoRedirecting.value = false;
    }
}
</script>

<template>
    <form class="flex flex-col gap-4" @submit.prevent="handleSignIn">
        <h2
            class="text-xl font-semibold text-center text-surface-900 dark:text-surface-100 mb-2"
        >
            Sign in to your account
        </h2>

        <div
            v-if="error"
            class="rounded-md border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400"
        >
            {{ error }}
        </div>

        <!-- Self-hosted OIDC SSO — only shown when global OIDC is configured via environment variables -->
        <template v-if="oidcEnabled">
            <button
                type="button"
                :disabled="isLoading"
                class="px-4 py-2.5 bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 rounded-md text-sm font-medium hover:bg-surface-900 dark:hover:bg-surface-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                @click="handleSelfHostedSso"
            >
                {{
                    isLoading
                        ? "Redirecting…"
                        : `Sign in with ${oidcProviderName}`
                }}
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
                autocomplete="current-password"
                required
                class="px-3 py-2 border border-surface-300 dark:border-surface-700 rounded-md text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15"
            />
        </label>

        <button
            type="submit"
            :disabled="isLoading"
            class="mt-2 px-4 py-2.5 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
            {{ isLoading ? "Signing in…" : "Sign in" }}
        </button>

        <!-- Enterprise SSO button — always available on cloud, uses per-org providers -->
        <template v-if="!oidcEnabled">
            <div class="relative">
                <div class="absolute inset-0 flex items-center">
                    <div
                        class="w-full border-t border-surface-200 dark:border-surface-700"
                    />
                </div>
                <div class="relative flex justify-center text-xs">
                    <span
                        class="bg-white dark:bg-surface-900 px-2 text-surface-400"
                        >or</span
                    >
                </div>
            </div>

            <button
                type="button"
                :disabled="ssoRedirecting"
                class="px-4 py-2.5 border border-surface-300 dark:border-surface-700 rounded-md text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                @click="handleEnterpriseSso"
            >
                <ShieldCheck class="size-4" />
                {{ ssoRedirecting ? "Redirecting to your IdP…" : "Sign in with SSO" }}
            </button>
        </template>

        <p class="text-center text-sm text-surface-500 dark:text-surface-400">
            Don't have an account?
            <NuxtLink
                :to="
                    route.query.invitation
                        ? $localePath({
                              path: '/auth/sign-up',
                              query: { invitation: route.query.invitation },
                          })
                        : $localePath('/auth/sign-up')
                "
                class="text-brand-600 dark:text-brand-400 hover:underline"
                >Sign up</NuxtLink
            >
        </p>
    </form>
</template>
