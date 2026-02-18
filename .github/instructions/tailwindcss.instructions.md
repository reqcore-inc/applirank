---
name: 'Tailwind CSS Styling'
description: 'Tailwind CSS v4 utility-first styling patterns, theme customization, responsive design, dark mode, and component styling conventions for Applirank'
applyTo: 'app/**/*.vue,app/assets/css/**'
---

# Tailwind CSS — Styling Conventions for Applirank

Applirank uses **Tailwind CSS v4** via the `@tailwindcss/vite` plugin (NOT the `@nuxtjs/tailwindcss` module).
All styling uses **utility-first** classes — avoid scoped CSS unless absolutely necessary.

Reference docs:
- [Tailwind CSS v4 docs](https://tailwindcss.com/docs)
- [Theme variables](https://tailwindcss.com/docs/theme)
- [Dark mode](https://tailwindcss.com/docs/dark-mode)
- [Responsive design](https://tailwindcss.com/docs/responsive-design)

---

## 1. Installation & Setup — How Tailwind Is Integrated

### Vite plugin (NOT Nuxt module)

Tailwind CSS v4 is integrated as a **Vite plugin** in `nuxt.config.ts`:

```ts
// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
```

### Main CSS file

The Tailwind entry point is `app/assets/css/main.css`. This is where:
- Tailwind is imported (`@import "tailwindcss"`)
- Plugins are loaded (`@plugin "@tailwindcss/typography"`)
- Custom theme variables are defined (`@theme { ... }`)
- Custom base styles, components, and utilities are added (`@layer`)

```
app/
└── assets/
    └── css/
        └── main.css    # Tailwind entry point — @import "tailwindcss" + @plugin + @theme
```

### Typography plugin

The `@tailwindcss/typography` plugin provides `prose` classes for rendering Markdown content (blog articles). Loaded via `@plugin` in the CSS entry point:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

Used in blog article pages for styled content rendering:
```vue
<div class="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-a:text-brand-400">
  <ContentRenderer :value="post" />
</div>
```

### What NOT to do

| Anti-pattern | Why |
|---|---|
| `@nuxtjs/tailwindcss` module | That's the Tailwind v3 Nuxt module — we use `@tailwindcss/vite` directly |
| `tailwind.config.js` or `tailwind.config.ts` | Tailwind v4 has no config file — use `@theme` in CSS instead |
| `@tailwind base/components/utilities` directives | Tailwind v3 syntax — use `@import "tailwindcss"` in v4 |
| `postcss.config.js` with tailwindcss plugin | Not needed — the Vite plugin handles everything |
| `npx tailwindcss init` | This generates a v3 config file that is not used in v4 |

---

## 2. Theme Customization — `@theme` Directive

### How to add custom design tokens

In Tailwind v4, customization is done via the `@theme` directive in CSS (NOT a config file):

```css
/* app/assets/css/main.css */
@import "tailwindcss";

@theme {
  /* Custom brand colors — generates bg-brand-500, text-brand-500, etc. */
  --color-brand-500: oklch(62.3% 0.214 259.815);
  --color-brand-600: oklch(54.6% 0.245 262.881);

  /* Custom font family — generates font-display utility */
  --font-display: "Inter", sans-serif;

  /* Custom spacing — adds to default spacing scale */
  --spacing-18: 4.5rem;

  /* Custom animation — generates animate-fade-in utility */
  --animate-fade-in: fade-in 0.3s ease-out;

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

### Theme variable namespaces

| Namespace | Generates | Example |
|-----------|-----------|---------|
| `--color-*` | Color utilities (`bg-*`, `text-*`, `border-*`, etc.) | `--color-brand-500` → `bg-brand-500` |
| `--font-*` | Font family utilities (`font-*`) | `--font-display` → `font-display` |
| `--text-*` | Font size utilities (`text-*`) | `--text-xs` → `text-xs` |
| `--spacing-*` | Spacing utilities (`p-*`, `m-*`, `gap-*`, `w-*`, `h-*`) | `--spacing-18` → `p-18` |
| `--radius-*` | Border radius utilities (`rounded-*`) | `--radius-pill` → `rounded-pill` |
| `--shadow-*` | Box shadow utilities (`shadow-*`) | `--shadow-card` → `shadow-card` |
| `--breakpoint-*` | Responsive variants (`sm:*`, `md:*`, etc.) | `--breakpoint-3xl` → `3xl:*` |
| `--animate-*` | Animation utilities (`animate-*`) | `--animate-spin` → `animate-spin` |

### Overriding vs extending

```css
/* ✅ EXTEND — add new values alongside defaults */
@theme {
  --color-brand-500: oklch(62.3% 0.214 259.815);
}

/* ✅ OVERRIDE — replace an entire namespace */
@theme {
  --color-*: initial;  /* Clear all default colors */
  --color-white: #fff;
  --color-brand: #3f3cbb;
}

/* ❌ NEVER use tailwind.config.js — that's v3 syntax */
```

---

## 3. Component Styling Patterns

### Utility-first — the default approach

Apply Tailwind classes directly in templates. This is the primary styling method:

```vue
<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
    <div class="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
      <h1 class="text-xl font-bold text-gray-900">Title</h1>
      <p class="mt-1 text-sm text-gray-500">Subtitle</p>
    </div>
  </div>
</template>
```

### When to use `<style scoped>` with Tailwind

Only use scoped CSS for:
1. **Complex animations** that require many keyframes
2. **Third-party component overrides** where you can't add classes
3. **Truly dynamic styles** that can't be expressed with utilities

When you do use `<style scoped>`, use Tailwind's theme variables (CSS custom properties):

```vue
<style scoped>
.custom-element {
  background-color: var(--color-brand-500);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  font-size: var(--text-sm);
}
</style>
```

### Class organization in templates

Order classes consistently following this convention:

```
layout → sizing → spacing → typography → colors → borders → effects → states
```

```vue
<!-- ✅ Organized: layout, size, spacing, typography, color, border, shadow, hover -->
<button class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500">
  Save
</button>
```

### Long class lists — use multi-line formatting

For components with many classes, break across lines for readability:

```vue
<div
  class="
    flex items-center justify-between
    w-full max-w-2xl mx-auto
    px-6 py-4
    text-sm text-gray-700
    bg-white border border-gray-200 rounded-lg
    shadow-sm
    hover:shadow-md
    transition-shadow duration-200
  "
>
```

---

## 4. Responsive Design

### Mobile-first approach

Tailwind uses a mobile-first breakpoint system. Write base styles for mobile, then add responsive modifiers:

```vue
<!-- ✅ Mobile-first: single column → 2 cols on md → 3 cols on lg -->
<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  <!-- cards -->
</div>
```

### Default breakpoints

| Prefix | Min-width | Use case |
|--------|-----------|----------|
| (none) | 0px | Mobile base styles |
| `sm:` | 640px (40rem) | Large phones / small tablets |
| `md:` | 768px (48rem) | Tablets |
| `lg:` | 1024px (64rem) | Small desktops |
| `xl:` | 1280px (80rem) | Desktops |
| `2xl:` | 1536px (96rem) | Large desktops |

---

## 5. Dark Mode

Applirank uses **class-based** dark mode toggling. The `dark` variant is activated by adding a `.dark` class to an ancestor element (typically `<html>`).

This is configured in `app/assets/css/main.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

### How to use dark mode in templates

Always pair light and dark classes. Use our semantic tokens:

```vue
<!-- ✅ CORRECT — use semantic color tokens for both modes -->
<div class="bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100">
  <div class="bg-white border border-surface-200 dark:bg-surface-900 dark:border-surface-800">
    <h2 class="text-surface-900 dark:text-surface-50">Title</h2>
    <p class="text-surface-500 dark:text-surface-400">Description</p>
  </div>
</div>

<!-- ✅ Buttons work across both modes -->
<button class="bg-brand-600 text-white hover:bg-brand-700">
  Primary Action
</button>
```

### Dark mode class reference

| Element | Light mode | Dark mode |
|---------|------------|----------|
| Page bg | `bg-surface-50` | `dark:bg-surface-950` |
| Card / panel | `bg-white` | `dark:bg-surface-900` |
| Elevated card | `bg-white shadow-sm` | `dark:bg-surface-800` |
| Primary text | `text-surface-900` | `dark:text-surface-100` |
| Secondary text | `text-surface-500` | `dark:text-surface-400` |
| Muted text | `text-surface-400` | `dark:text-surface-500` |
| Border / divider | `border-surface-200` | `dark:border-surface-800` |
| Hover surface | `hover:bg-surface-100` | `dark:hover:bg-surface-800` |
| Input bg | `bg-white` | `dark:bg-surface-900` |
| Input border | `border-surface-300` | `dark:border-surface-700` |

### Toggling dark mode

Toggle by adding/removing the `.dark` class on `<html>`. Persist preference in `localStorage`:

```ts
// In a composable or plugin
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark')
  const isDark = document.documentElement.classList.contains('dark')
  localStorage.setItem('theme', isDark ? 'dark' : 'light')
}

// On page load (in a client plugin or app.vue onMounted)
if (localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark')
}
```

---

## 6. Custom CSS Layers

Use `@layer` to add custom base styles, components, or utilities that integrate with Tailwind's cascade:

```css
/* app/assets/css/main.css */
@import "tailwindcss";

@layer base {
  /* Normalize or global typography */
  body {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
}

@layer components {
  /* Reusable component patterns (use sparingly — prefer utilities) */
  .btn-primary {
    @apply px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md
           hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500;
  }
}

@layer utilities {
  /* Custom one-off utilities */
  .text-balance {
    text-wrap: balance;
  }
}
```

### Rules for custom layers

| Rule | Details |
|------|---------|
| Prefer utility classes in templates | Only create `@layer components` classes for highly reused patterns (buttons, cards) |
| Use `@apply` sparingly | It's convenient but defeats the purpose of utility-first — use only in `@layer components` |
| Never `@apply` in `.vue` `<style>` blocks | Put component classes in `main.css` under `@layer components` instead |
| Keep `@layer base` minimal | Only global resets and typography defaults |

---

## 7. Common Patterns for ATS Components

### Status badges

Use the **semantic color tokens** (success, warning, danger) instead of raw colors:

```vue
<span class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
  :class="{
    'bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400': status === 'active',
    'bg-warning-50 text-warning-700 dark:bg-warning-950 dark:text-warning-400': status === 'draft',
    'bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-400': status === 'closed',
    'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400': status === 'archived',
  }"
>
  {{ status }}
</span>
```

### Dynamic classes with Vue

Use Vue's `:class` binding for conditional styles. Never use string concatenation for class names:

```vue
<!-- ✅ Object/array syntax — Tailwind can detect these classes -->
<div :class="[
  'rounded-lg p-4',
  isActive ? 'bg-brand-50 border-brand-200' : 'bg-gray-50 border-gray-200',
]">

<!-- ❌ NEVER interpolate class names — Tailwind can't detect them -->
<div :class="`bg-${color}-500`">  <!-- WON'T WORK -->
```

### Complete class names — CRITICAL

Tailwind scans your source files for **complete, unbroken class names**. Dynamic construction will fail:

```ts
// ❌ BROKEN — Tailwind won't generate these classes
const color = 'red'
const cls = `bg-${color}-500`    // bg-red-500 won't be in CSS

// ✅ WORKS — full class names written somewhere in source
const bgMap = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
} as const
```

---

## 8. Applirank Design Tokens

The full color system is defined in `app/assets/css/main.css` under `@theme`. All tokens are semantic — named for their *purpose*, not their hue.

### Color palette overview

| Token | Hue | Purpose |
|-------|-----|--------|
| `brand-*` (50–950) | Deep indigo | Primary actions, active nav, brand identity |
| `accent-*` (50–950) | Teal | "Glass Box" highlights, AI insights, links |
| `surface-*` (50–950) | Slate | Backgrounds, cards, borders, text |
| `success-*` (50–950) | Emerald | Hired, active, verified, healthy |
| `warning-*` (50–950) | Amber | Draft, pending, expiring |
| `danger-*` (50–950) | Rose | Rejected, errors, destructive actions |
| `info-*` (50–950) | Sky | Informational notices, tips |

### When to use each token

| Context | Token | Example |
|---------|-------|--------|
| Primary button / CTA | `brand-600` | `bg-brand-600 hover:bg-brand-700 text-white` |
| Secondary button | `surface-*` | `bg-surface-100 hover:bg-surface-200 text-surface-700` |
| AI matching indicator | `accent-*` | `bg-accent-50 text-accent-700 border-accent-200` |
| Job status "open" | `success-*` | `bg-success-50 text-success-700` |
| Job status "draft" | `warning-*` | `bg-warning-50 text-warning-700` |
| Job status "closed" | `danger-*` | `bg-danger-50 text-danger-700` |
| Destructive action | `danger-600` | `bg-danger-600 hover:bg-danger-700 text-white` |
| Nav link (active) | `brand-*` | `bg-brand-50 text-brand-700` |
| Card background | `white` / `surface-900` | `bg-white dark:bg-surface-900` |
| Page background | `surface-50` / `surface-950` | `bg-surface-50 dark:bg-surface-950` |
| Border / divider | `surface-200` / `surface-800` | `border-surface-200 dark:border-surface-800` |

### Prefer semantic tokens over raw Tailwind colors

```vue
<!-- ✅ Semantic — intent is clear, dark mode is consistent -->
<span class="bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-400">
  Hired
</span>

<!-- ❌ Raw colors — harder to maintain, no semantic meaning -->
<span class="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
  Hired
</span>
```

Raw Tailwind colors (`red-*`, `blue-*`, `green-*`, etc.) are still available for one-off cases but prefer semantic tokens for consistency.

---

## 9. Dark Landing Page — Design Tokens

The public landing page (`app/pages/index.vue`) uses a **dedicated dark aesthetic** inspired by Linear/Resend/Raycast. These tokens are applied directly (not via `@theme`) since they're specific to the marketing page.

### Visual language

| Token | Value | Usage |
|-------|-------|-------|
| Background | `bg-[#09090b]` | Page body, sections |
| Glass borders | `border-white/[0.06]` | Cards, nav, dividers |
| Text primary | `text-white` | Headings |
| Text secondary | `text-white/60` | Descriptions, muted text |
| Text tertiary | `text-white/40` | Footer, subtle labels |
| Glow effects | `bg-indigo-500/20 blur-3xl` | Decorative blobs behind sections |
| Grid pattern | SVG with `white/[0.03]` strokes | Subtle texture overlay |
| Card bg | `bg-white/[0.03]` | Feature cards, tech stack items |
| Card hover | `hover:bg-white/[0.06]` | Interactive cards |
| CTA gradient | `bg-gradient-to-r from-indigo-500 to-purple-600` | Primary action buttons |

### Body background override

When a dark page sits inside a layout that uses a light body background (from `@layer base` in `main.css`), override the body color:

```ts
useHead({
  bodyAttrs: {
    style: 'background-color: #09090b;',
  },
})
```

### Overflow containment

Decorative glow blobs often use `translate-y-*` which can extend beyond section boundaries. Always wrap glowing sections in `overflow-hidden`:

```vue
<section class="relative overflow-hidden py-24">
  <!-- Decorative glow -->
  <div class="absolute -bottom-32 left-1/2 h-64 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
  <!-- Content -->
</section>
```

---

## 10. What NOT to Do

| Anti-pattern | Correct approach |
|---|---|
| `tailwind.config.js` or `tailwind.config.ts` | Use `@theme` in `app/assets/css/main.css` |
| `@nuxtjs/tailwindcss` module | Use `@tailwindcss/vite` plugin in `nuxt.config.ts` |
| `@tailwind base; @tailwind components; @tailwind utilities;` | Use `@import "tailwindcss"` (v4 syntax) |
| String interpolation for class names (`bg-${color}-500`) | Use complete class name maps |
| `@apply` everywhere / in `<style scoped>` | Use utility classes directly in templates |
| Inline `style` attributes for things Tailwind covers | Use utility classes |
| Custom CSS for layout (flexbox/grid) | Use `flex`, `grid`, `gap-*`, etc. utilities |
| `!important` overrides | Use Tailwind's `!` modifier: `!text-red-500` |
| Installing `postcss` + `autoprefixer` separately | The Vite plugin handles this |
| Creating a `postcss.config.js` | Not needed with `@tailwindcss/vite` |
