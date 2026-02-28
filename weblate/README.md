# Weblate — Translation Management for Reqcore

This directory contains everything needed to deploy a self-hosted
[Weblate](https://weblate.org/) instance on **Railway** (or any Docker host)
so that community translators can contribute without touching the codebase directly.

## Table of Contents

- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Option A: Deploy on Railway (production)](#option-a-deploy-on-railway-production)
- [Option B: Run locally with Docker Compose](#option-b-run-locally-with-docker-compose)
- [Configure the Weblate project](#configure-the-weblate-project)
- [Connect Weblate to GitHub](#connect-weblate-to-github)
- [Adding a new language](#adding-a-new-language)
- [Translator guide](#translator-guide)
- [Maintainer guide](#maintainer-guide)
- [Troubleshooting](#troubleshooting)

---

## How it works

```
┌────────────────────────────┐
│  Developer adds/edits      │
│  i18n/locales/en.json      │
│  (English source strings)  │
└────────────┬───────────────┘
             │  push to main
             ▼
┌────────────────────────────┐
│  GitHub repo               │
│  reqcore-inc/reqcore        │
│  branch: main              │
└────────────┬───────────────┘
             │  Weblate pulls changes
             ▼
┌────────────────────────────┐
│  Weblate instance          │
│  translate.reqcore.com     │
│                            │
│  Translators work here     │
│  via a web UI — no Git     │
│  knowledge required        │
└────────────┬───────────────┘
             │  Weblate opens a PR
             ▼
┌────────────────────────────┐
│  GitHub PR                 │
│  i18n/locales/vi.json      │
│  i18n/locales/nb.json      │
│                            │
│  Maintainer reviews &      │
│  merges the PR             │
└────────────────────────────┘
```

**In short:** developers maintain English strings in `en.json`. Weblate detects
new/changed keys, presents them to translators in a web UI, and opens pull
requests with the finished translations. Translators never need to touch Git.

### Currently supported locales

| Code | Language | Status |
|------|----------|--------|
| `en` | English | Source language (maintained by developers) |
| `vi` | Vietnamese (Tiếng Việt) | Community translation |
| `nb` | Norwegian Bokmål | Community translation |

---

## Prerequisites

You need **one** of the following depending on your deployment target:

| Target | What you need |
|--------|---------------|
| Railway (production) | A [Railway](https://railway.com) account (free tier works to start) |
| Local (development) | [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) v2+ |

For GitHub integration (both targets):
- A **GitHub Personal Access Token (PAT)** with `repo` scope — [create one here](https://github.com/settings/tokens/new?scopes=repo&description=Weblate+Reqcore)
- Or the [Weblate GitHub App](https://docs.weblate.org/en/latest/admin/continuous.html#github-setup) installed on the repo (recommended for production)

---

## Option A: Deploy on Railway (production)

> Deploy Weblate as a **separate Railway project** from the main Reqcore app.
> Weblate has its own database, Redis, and resource needs.

### Step 1: Create the Railway project

1. Go to [railway.com/new](https://railway.com/new) and click **Empty project**
2. Name it something like `reqcore-weblate`

### Step 2: Add PostgreSQL

1. Inside the project, click **+ New** → **Database** → **Add PostgreSQL**
2. Railway provisions it automatically. Note the internal connection variables
   (you'll reference them in Step 4)

### Step 3: Add Redis

1. Click **+ New** → **Database** → **Add Redis**
2. Same as above — Railway handles provisioning

### Step 4: Add the Weblate service

1. Click **+ New** → **Docker Image**
2. Enter the image: `weblate/weblate:5.17`
3. Under **Settings** → **Networking**, set the port to `8080`
4. Go to the **Variables** tab and add the variables below

#### Required environment variables

Copy these into the Variables tab. Replace `<placeholders>` with real values.

```env
# ─── Weblate core ───────────────────────────────────
WEBLATE_SITE_TITLE=Reqcore Translations
WEBLATE_SITE_DOMAIN=<your-railway-domain-or-custom-domain>
WEBLATE_ADMIN_EMAIL=admin@reqcore.com
WEBLATE_ADMIN_PASSWORD=<choose-a-strong-password>

# ─── Database ──────────────────────────────────────
# Use Railway's reference variables to auto-fill these:
#   ${{Postgres.PGHOST}}, ${{Postgres.PGPORT}}, etc.
# Or paste the raw values from the PostgreSQL service's
# "Connect" tab → "Variables" section.
POSTGRES_HOST=${{Postgres.PGHOST}}
POSTGRES_PORT=${{Postgres.PGPORT}}
POSTGRES_DATABASE=${{Postgres.PGDATABASE}}
POSTGRES_USER=${{Postgres.PGUSER}}
POSTGRES_PASSWORD=${{Postgres.PGPASSWORD}}

# ─── Redis ─────────────────────────────────────────
# Same approach — use Railway reference variables:
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}

# ─── GitHub integration ────────────────────────────
# Create a PAT at: https://github.com/settings/tokens
# Required scope: repo
WEBLATE_GITHUB_USERNAME=reqcore-weblate-bot
WEBLATE_GITHUB_TOKEN=<your-github-pat>

# ─── Registration & access ─────────────────────────
WEBLATE_REGISTRATION_OPEN=1
WEBLATE_REQUIRE_LOGIN=0

# ─── Railway-specific ──────────────────────────────
# Pango can't initialize in Railway's container (no D-Bus).
# Silence the check — not needed for core translation.
WEBLATE_SILENCED_SYSTEM_CHECKS=weblate.C024
# Accept requests from any hostname (or set to your specific domain):
WEBLATE_ALLOWED_HOSTS=*
# Railway terminates HTTPS at its proxy and forwards HTTP to the
# container. These settings tell Weblate to trust the proxy headers,
# fixing CSRF origin mismatches, redirect loops, and mixed-content:
WEBLATE_ENABLE_HTTPS=1
WEBLATE_IP_PROXY_HEADER=HTTP_X_FORWARDED_FOR
WEBLATE_SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https

# ─── Email (optional, for notifications) ───────────
WEBLATE_DEFAULT_FROM_EMAIL=noreply@reqcore.com
```

> **Tip:** Railway's reference variables (`${{Postgres.PGHOST}}` etc.) are
> auto-resolved at runtime so you don't need to hardcode credentials. See
> [Railway docs: Reference Variables](https://docs.railway.com/guides/variables#reference-variables).

### Step 5: Custom domain (optional but recommended)

1. In the Weblate service → **Settings** → **Networking** → **Custom Domain**
2. Add `translate.reqcore.com`
3. In your DNS provider, create a **CNAME** record:
   - Name: `translate`
   - Target: the Railway-provided domain (e.g. `weblate-production-xxxx.up.railway.app`)
4. Update `WEBLATE_SITE_DOMAIN` to match: `translate.reqcore.com`

### Step 6: Deploy

Click **Deploy** in Railway. First boot takes 2-5 minutes while Weblate runs
database migrations. Watch the deploy logs — you should see:

```
Weblate is running on http://0.0.0.0:8080
```

Log in with the admin email/password you configured.

---

## Option B: Run locally with Docker Compose

For local development and testing, use the compose file in this directory.

### Step 1: Start the services

```bash
cd weblate
docker compose up -d
```

This starts three containers:
- **weblate** — the Weblate web UI on `http://localhost:8080`
- **weblate-db** — PostgreSQL 16 for Weblate's own data
- **weblate-redis** — Redis 7 for caching and task queues

### Step 2: Wait for initialization

First boot takes 1-3 minutes. Check progress with:

```bash
docker compose logs -f weblate
```

Wait until you see:
```
Weblate is running on http://0.0.0.0:8080
```

### Step 3: Log in

Open `http://localhost:8080` in your browser.

- **Username:** `admin`
- **Password:** `admin`

> **⚠️ Change the admin password immediately** in Weblate → User settings → Password.

### Step 4: Clean up

When done testing:

```bash
docker compose down        # Stop containers (keep data)
docker compose down -v     # Stop containers AND delete all data
```

---

## Configure the Weblate project

These steps apply to **both** Railway and local deployments. Do this once after
Weblate is running.

### Step 1: Create the project

1. Go to Weblate → **+ Add** (top menu) → **Create new translation project**
2. Fill in:

| Field | Value |
|-------|-------|
| Project name | `Reqcore` |
| Project slug | `reqcore` |
| Project website | `https://reqcore.com` |

3. Click **Save**

### Step 2: Add the translation component

1. Inside the Reqcore project, click **+ Add new translation component**
2. Choose **From version control system**
3. Fill in:

| Field | Value |
|-------|-------|
| Component name | `Web App` |
| Component slug | `web-app` |
| Version control system | `GitHub` |
| Source code repository | `https://github.com/reqcore-inc/reqcore.git` |
| Repository branch | `main` |
| File mask | `i18n/locales/*.json` |
| Monolingual base language file | `i18n/locales/en.json` |
| File format | `JSON nested structure file` |
| Source language | `English` |
| Translation license | `AGPL-3.0` |

4. Click **Save**

Weblate will clone the repo and discover existing locale files. This may take
a minute. Once done, you'll see the available languages (English, Vietnamese,
Norwegian Bokmål) with their translation progress.

### What is "JSON nested structure file"?

The locale files use nested JSON keys like:

```json
{
  "nav": {
    "features": "Features",
    "roadmap": "Roadmap"
  },
  "hero": {
    "headline": "The hiring system",
    "subtitle": "Purpose-built for recruiting teams..."
  }
}
```

Weblate presents each leaf key (e.g. `nav → features`) as a separate
translatable string. Translators see the English source value and type
the translation — no need to understand JSON syntax.

---

## Connect Weblate to GitHub

This enables Weblate to **push translations back** to the repo as pull requests.

### Step 1: Configure push settings

1. In Weblate → **Reqcore** project → **Web App** component → **Manage** → **Settings**
2. Go to the **Version control** tab
3. Set these fields:

| Field | Value |
|-------|-------|
| Push URL | `git@github.com:reqcore-inc/reqcore.git` |
| Push branch | _(leave empty — Weblate creates feature branches)_ |

4. Click **Save**

### Step 2: Configure commit settings

1. Still in Settings → **Version control** tab
2. Scroll to **Commit settings**:

| Field | Value |
|-------|-------|
| Commit message | `i18n: update {language_name} translations` |
| Committer name | `Weblate` |
| Committer email | `noreply@weblate.org` |
| Merge style | `Rebase` |

3. Enable **☑ Automatically push changes**

### Step 3: Install add-ons

1. Go to **Manage** → **Add-ons**
2. Install these two:

| Add-on | Purpose |
|--------|---------|
| **Squash Git commits** | Combines many small translation commits into one per language, keeping Git history clean |
| **Create pull request** | Opens a GitHub PR instead of pushing directly to `main`. This lets maintainers review translations before merging |

### Step 4: Verify the connection

1. Go to **Manage** → **Repository maintenance**
2. Click **Push** — if successful, you'll see a green notification
3. If it fails, check:
   - The GitHub PAT has `repo` scope
   - The PAT belongs to a user with write access to `reqcore-inc/reqcore`
   - The push URL is correct

> **Alternative: GitHub App (recommended for production)**
>
> Instead of a PAT, you can install the
> [Weblate GitHub App](https://docs.weblate.org/en/latest/admin/continuous.html#github-setup)
> on the `reqcore-inc/reqcore` repository. This is more secure (fine-grained
> permissions, automatic token rotation) and easier to manage for organizations.

---

## Adding a new language

To add a new locale (e.g. French `fr`):

### 1. Create the locale file

```bash
echo '{}' > i18n/locales/fr.json
```

### 2. Register it in Nuxt config

Edit `nuxt.config.ts` and add the new locale to the `i18n.locales` array:

```ts
i18n: {
  locales: [
    { code: 'en', name: 'English', file: 'en.json' },
    { code: 'vi', name: 'Tiếng Việt', file: 'vi.json' },
    { code: 'nb', name: 'Norsk Bokmål', file: 'nb.json' },
    { code: 'fr', name: 'Français', file: 'fr.json' },  // ← add this
  ],
  // ...
}
```

### 3. Commit and push

```bash
git add i18n/locales/fr.json nuxt.config.ts
git commit -m "i18n: add French locale"
git push
```

### 4. Sync in Weblate

Weblate automatically detects the new file on its next pull (usually within
minutes). Or force it: **Manage** → **Repository maintenance** → **Pull**.

The new language will appear in the Weblate UI, ready for translators.

---

## Translator guide

This section is for **translators** — no coding or Git experience required.

### Getting started

1. Open the Weblate instance (e.g. `translate.reqcore.com`)
2. Click **Register** to create an account (or sign in with GitHub if enabled)
3. From the dashboard, click **Reqcore** → **Web App**
4. Click your language (e.g. Vietnamese, Norwegian Bokmål)

### Translating strings

You'll see a list of strings organized by their key path (e.g. `nav.features`,
`hero.headline`). For each string:

1. The **English source** is shown at the top
2. Type your translation in the text box below
3. Click **Save and continue** to move to the next string

#### Tips for translators

- **Placeholders like `{highlight}` or `{forever}`:** These are dynamic values
  inserted at runtime. Keep them exactly as-is in your translation — just move
  them to where they belong grammatically in your language.
  
  Example (English): `Cancel anytime — your talent pool stays with you {forever}.`
  
  Example (Vietnamese): `Hủy bất cứ lúc nào — nhóm nhân tài của bạn ở lại với bạn {forever}.`

- **Context:** Click the key name (e.g. `hero.subtitle`) to see where it's
  used. The key path gives a hint: `nav.*` = navigation bar, `hero.*` = hero
  section, `auth.*` = login/signup pages, etc.

- **Glossary:** Check if the project has a glossary (sidebar → Glossary) for
  consistent translation of recurring terms like "pipeline", "candidate",
  "self-hosted".

- **Suggestions:** If you're unsure, you can add a **suggestion** instead of
  a direct translation. A reviewer can approve it later.

### Translation progress

The dashboard shows translation progress per language:
- **Translated:** strings that have been translated
- **Needs editing:** strings flagged for review
- **Not translated:** strings still in English

### What happens after you translate?

Weblate batches your translations and opens a GitHub pull request automatically.
A maintainer will review the PR and merge it. Once merged, the translations
go live on the next deployment. You don't need to do anything else.

---

## Maintainer guide

### Reviewing translation PRs

Weblate opens PRs with the title format:
`i18n: update Vietnamese translations` (or similar).

When reviewing:

1. **Spot-check** a few key translations, especially user-facing strings like
   button labels and error messages
2. **Verify JSON validity** — Weblate always produces valid JSON, but a quick
   glance doesn't hurt
3. **Merge** when satisfied. Squash-merge is fine since Weblate already squashes
   internally

### When you add new English strings

1. Add the key to `i18n/locales/en.json`
2. Use the key in your Vue component with `$t('my.key')` or `t('my.key')`
3. Commit and push
4. Weblate detects the new key and shows it as "Not translated" for all
   target languages. Translators will see it in their queue.

### String key conventions

Keys follow a nested structure by feature area:

| Prefix | Area |
|--------|------|
| `nav.*` | Top navigation bar |
| `hero.*` | Landing page hero section |
| `valueProps.*` | Landing page value propositions |
| `manifesto.*` | Manifesto section |
| `howItWorks.*` | How it works steps |
| `techStack.*` | Technology stack cards |
| `roadmapSection.*` | Roadmap section |
| `cta.*` | Call-to-action sections |
| `footer.*` | Footer links and text |
| `auth.*` | Sign-in / sign-up pages |
| `sidebar.*` | Dashboard sidebar navigation |
| `dashboard.*` | Dashboard layout chrome |
| `public.*` | Public layout elements |
| `common.*` | Shared strings (app name, etc.) |

### Handling strings with inline formatting

For strings that contain bold/highlighted text within a sentence, use the
`i18n-t` component with named slots:

```vue
<!-- ✅ Correct: lets translators reorder the sentence -->
<i18n-t keypath="manifesto.p1" tag="p">
  <template #highlight>
    <span class="font-bold">{{ $t('manifesto.p1Highlight') }}</span>
  </template>
</i18n-t>

<!-- ❌ Wrong: hardcodes English word order -->
<p>{{ $t('manifesto.p1Before') }} <span>{{ $t('manifesto.p1Bold') }}</span> {{ $t('manifesto.p1After') }}</p>
```

The corresponding locale file:
```json
{
  "manifesto": {
    "p1": "I'm building this because I'm tired of seeing companies get charged {highlight} for simple features.",
    "p1Highlight": "huge amounts of money"
  }
}
```

---

## Troubleshooting

### Weblate can't clone the repo

- Make sure the GitHub PAT hasn't expired
- Verify the repo URL: `https://github.com/reqcore-inc/reqcore.git`
- Check Weblate logs: **Manage** → **Repository maintenance** → **Log**

### Weblate can't push / create PRs

- Check that the PAT has `repo` scope
- Ensure `Push URL` is set to `git@github.com:reqcore-inc/reqcore.git`
- If using SSH, make sure Weblate has the SSH key configured:
  **Weblate Admin** → **SSH keys** → add a deploy key to the repo

### Translations not showing up in the app

- Check that the PR was merged to `main`
- Verify the key path matches between `en.json` and the target locale
- Run the app locally and check the browser console for missing key warnings
- Make sure the locale file is syntactically valid JSON (`cat i18n/locales/vi.json | python3 -m json.tool`)

### First boot takes too long

Weblate runs database migrations on first start. This can take 2-5 minutes.
Check logs with `docker compose logs -f weblate` — look for
`Weblate is running on http://0.0.0.0:8080`.

### How to reset the admin password

```bash
# Local (Docker Compose):
docker compose exec weblate weblate changepassword admin

# Railway: use the Railway shell feature in the Weblate service
```
