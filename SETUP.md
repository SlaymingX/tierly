# Tierly — Google Login + Drive Sync Setup

This turns your app into a PWA that signs users in with Google and saves/loads
their tier lists from a private folder in their own Google Drive (the
`appDataFolder` — invisible in their normal Drive, only this app can read it).

## 1. How "stay logged in" works

Google access tokens expire after ~1 hour. To keep users logged in like other
sites do, the server exchanges the code Google gives it for a **refresh token**
(which doesn't expire until revoked) and stores it in an **encrypted,
`httpOnly` cookie** in the visitor's browser — never in JavaScript, never
readable by client-side code. Every API call decrypts it server-side, asks
Google for a fresh access token, and immediately discards it after the
request. The cookie lasts 180 days and silently renews on each visit, so a
user logs in once and stays in.

## 2. Google Cloud Console setup

1. Go to https://console.cloud.google.com/ and create (or pick) a project.
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: External (unless you have Workspace).
   - Add your app name, support email.
   - Scopes: add `.../auth/drive.appdata`, `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   - Under "Test users" (while the app is unverified), add your own Google
     account and anyone else who should be able to log in. Unverified apps
     work fine for personal projects/small groups — Google's "sensitive
     scope" verification is only required once you want the public at large
     to use it without seeing a warning screen.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URI: `https://YOUR-VERCEL-DOMAIN/api/auth/callback`
     (add `http://localhost:3000/api/auth/callback` too if you'll test locally
     with `vercel dev`).
   - Save. Copy the **Client ID** and **Client secret**.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

See `.env.example` for the full list:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` — must exactly match what you put in Google Console
- `APP_URL` — your deployed site's URL, trailing slash included
- `COOKIE_ENCRYPTION_KEY` — generate with `openssl rand -hex 32`

Redeploy after adding/changing env vars (Vercel doesn't hot-reload them).

## 4. Deploy

Push this whole folder (including `api/`, `package.json`, `manifest.json`,
`sw.js`, `icons/`) to your GitHub repo, then import it in Vercel. No build
command needed — Vercel auto-detects the `api/` folder as serverless
functions and serves `index.html` as the static root. It'll run `npm install`
automatically for the one dependency (`cookie`).

## 5. What's syncing

- Every change autosaves to `localStorage` immediately (so refreshing never
  loses work, signed in or not).
- If signed in, changes also autosave to Drive ~1.5s after you stop editing
  (debounced, so a drag-and-drop reorder doesn't fire dozens of requests).
- On sign-in / page load while signed in, the app pulls the latest version
  from Drive and replaces local data with it — so the same account looks
  the same on every device.
- The sync status indicator (top right) shows "Saved to Drive", "Saving…",
  "Sync error", or "Saved on this device only" (not signed in).

## 6. Files added

```
api/
  auth/login.js       redirects to Google's consent screen (PKCE)
  auth/callback.js     exchanges the auth code for tokens, sets cookies
  auth/status.js       tells the frontend if the user is logged in
  auth/logout.js       revokes the token, clears cookies
  drive/save.js        writes the tier-list JSON to appDataFolder
  drive/load.js        reads it back
  _lib/crypto.js        AES-256-GCM encrypt/decrypt for the cookie
  _lib/google.js         raw REST calls to Google's OAuth + Drive endpoints
  _lib/session.js         cookie read/write helpers
package.json           declares the one dependency (`cookie`)
.env.example            env vars to set in Vercel
```

`index.html` and `sw.js` were also updated: an auth bar was added (top
right), the render loop now autosaves on every change, and the service
worker was told to never cache `/api/*` so auth/session state is always
fresh.
