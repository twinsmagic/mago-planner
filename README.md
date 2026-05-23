# Amazing Mago Content Planner

Webinar content planning tool for the Amazing Mago Monthly Mastery series.

## Stack

- **Frontend**: Single-page React app (`index.html`) — no build step
- **Backend**: Cloudflare Pages Function (`functions/api.js`)
- **Storage**: Cloudflare KV (binding name: `PLANNER_KV`)
- **AI**: Claude API via `ANTHROPIC_API_KEY` environment variable

## Deploying to Cloudflare Pages

### 1. Connect your repo

1. Go to [Cloudflare Pages](https://pages.cloudflare.com) → Create a project → Connect to Git
2. Select this repo
3. **Build settings**: leave build command blank, set output directory to `/` (root)
4. Deploy

### 2. Create a KV namespace

```bash
npx wrangler kv namespace create PLANNER_KV
npx wrangler kv namespace create PLANNER_KV --preview
```

Note the `id` and `preview_id` values — you'll need them next.

### 3. Bind KV to your Pages project

In the Cloudflare dashboard → Pages → your project → Settings → Functions:
- Add KV namespace binding: **Variable name** `PLANNER_KV`, **KV namespace** = the one you created above

### 4. Add the Anthropic API key

In Pages → Settings → Environment variables:
- Add secret: `ANTHROPIC_API_KEY` = your key from [console.anthropic.com](https://console.anthropic.com)

### 5. Migrate your existing data

1. Open the deployed app
2. Click **Migrate Data** on the dashboard
3. Confirm the Apps Script URL is correct, click **Fetch Data from Google Sheets**
4. Click **Migrate** to import everything into Cloudflare KV

## Local development

```bash
npx wrangler pages dev . --kv PLANNER_KV
```

KV data is in-memory only during local dev (resets on restart). Set `ANTHROPIC_API_KEY` as a local secret or env var.
