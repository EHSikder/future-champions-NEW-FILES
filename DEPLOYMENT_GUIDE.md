# 🚀 Future Champions — Complete Deployment Guide
## For Vercel (Frontend) + Render (Backend) + Supabase (Database)

---

## OVERVIEW — What You're Setting Up

```
Your Computer / GitHub
        │
        ├──► Vercel  ──►  futurchampions.com  (the website users see)
        │
        ├──► Render  ──►  api.futurechampions.com  (the backend / brain)
        │
        └──► Supabase  ──►  database.supabase.co  (all the data)
```

**Total time:** About 45–60 minutes  
**What you need:** A GitHub account, a Vercel account, a Render account, a Supabase account.  
All are free to sign up.

---

## STEP 0 — BEFORE YOU START: Prepare Your Files

1. Download the `future-champions-NEW-FILES.zip` you received
2. Extract (unzip) it — you'll get a folder called `future-champions`
3. Also have your **original project folder** (`worldcup-main`) open beside it

**Merge the files:**  
Copy everything from the extracted `future-champions` folder INTO your existing `worldcup-main` project folder.  
When asked "Replace existing files?" — click **Yes / Replace All**.

Your project should now have this structure:
```
your-project/
├── frontend/       (the website)
│   ├── src/
│   ├── package.json
│   ├── vercel.json   ← NEW
│   └── .env.example  ← NEW
├── backend/        (the API)
│   ├── src/
│   ├── package.json
│   ├── render.yaml   ← NEW (not used directly, just reference)
│   └── .env.example  ← NEW
└── schema_future_champions.sql  ← NEW (your database)
```

4. **Add your videos** — place these files in `frontend/public/videos/`:
   - `hero-main.mp4` ← your main hero video
   - `promo-teaser.mp4` ← your promo teaser video
   
5. **Add your logo** — place in `frontend/public/images/`:
   - `fc-logo.png` ← Future Champions logo

---

## STEP 1 — PUSH YOUR PROJECT TO GITHUB

> This is required — both Vercel and Render deploy from GitHub.

1. Go to **github.com** and sign in
2. Click the **+** button (top right) → **New repository**
3. Name it: `future-champions`
4. Set to **Private** (recommended)
5. Click **Create repository**
6. Follow GitHub's instructions to **"push an existing repository"**

   If you have GitHub Desktop app:
   - Open GitHub Desktop
   - File → Add Local Repository → choose your project folder
   - Click **Publish Repository** → connect to the repo you just made

---

## STEP 2 — SET UP SUPABASE DATABASE

> Supabase stores all your users, predictions, scores, MCQ questions, and leaderboard data.

### 2a. Create a Supabase project

1. Go to **supabase.com** → Sign in or Sign up
2. Click **New Project**
3. Fill in:
   - **Name:** `future-champions`
   - **Database Password:** make a strong password — **SAVE THIS SOMEWHERE**
   - **Region:** pick the closest to your users
4. Click **Create new project** — wait about 2 minutes for it to set up

### 2b. Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query** (top left)
3. Open the file `schema_future_champions.sql` from your project in any text editor (Notepad, TextEdit, VS Code)
4. **Select All** the text → **Copy** it
5. **Paste** it into the Supabase SQL editor
6. Click the **Run** button (green, bottom right)
7. You should see: `Success. No rows returned` — that means it worked ✅

### 2c. Get your Supabase credentials

You need 3 things from Supabase:

1. **Project URL:**
   - Go to **Settings** (gear icon, left sidebar)
   - Click **API**
   - Copy the **Project URL** — looks like: `https://abcdefghij.supabase.co`

2. **Anon Key (public):**
   - Same page → copy **anon public** key
   - Starts with `eyJ...`

3. **Service Role Key (secret):**
   - Same page → copy **service_role** key
   - Starts with `eyJ...` — ⚠️ **Keep this secret, never share it**

📝 **Save all 3 somewhere safe** — you'll need them in Steps 3 and 4.

---

## STEP 3 — DEPLOY BACKEND ON RENDER

> Render runs your API server — the backend that handles logins, predictions, scoring, etc.

### 3a. Create a Render account & new web service

1. Go to **render.com** → Sign in (use GitHub to sign in — easier)
2. Click **New +** → **Web Service**
3. Click **Connect a repository** → choose your `future-champions` GitHub repo
4. Click **Connect**

### 3b. Configure the service

Fill in these settings:

| Field | Value |
|-------|-------|
| **Name** | `future-champions-api` |
| **Region** | Oregon (US West) or closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node src/index.js` |
| **Instance Type** | Free (or paid for better performance) |

### 3c. Add environment variables

Scroll down to **Environment Variables** section.  
Click **Add Environment Variable** for each one:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SUPABASE_URL` | *(paste your Project URL from Step 2c)* |
| `SUPABASE_SERVICE_KEY` | *(paste your service_role key from Step 2c)* |
| `JWT_SECRET` | *(make up a long random string, e.g. `fc_jwt_s3cr3t_2026_xK9mN3pQ7rT1`)* |
| `FIREBASE_PROJECT_ID` | *(your Firebase project ID)* |
| `FIREBASE_CLIENT_EMAIL` | *(from your Firebase service account)* |
| `FIREBASE_PRIVATE_KEY` | *(from your Firebase service account .json file)* |
| `ALLOWED_ORIGINS` | *(leave blank for now — you'll add your Vercel URL after Step 4)* |
| `WORLDCUP_API_KEY` | *(your football data API key, if you have one)* |

> 💡 For `FIREBASE_PRIVATE_KEY`: open the Firebase service account JSON file, find the `private_key` value, copy the entire string including the `-----BEGIN...-----END-----` parts.

### 3d. Deploy

1. Click **Create Web Service** at the bottom
2. Render will start building — watch the logs at the bottom
3. Wait for: `🚀 Future Champions API running on port 3001`
4. **Copy your Render URL** — it looks like: `https://future-champions-api.onrender.com`

📝 **Save this URL** — you need it for Vercel.

### 3e. Test the backend is working

Open a new browser tab and go to:
`https://future-champions-api.onrender.com/health`

You should see: `{"status":"ok","app":"Future Champions API"...}`  
If you see that — **your backend is running** ✅

---

## STEP 4 — DEPLOY FRONTEND ON VERCEL

> Vercel hosts your website — what users actually see and visit.

### 4a. Create Vercel project

1. Go to **vercel.com** → Sign in (use GitHub)
2. Click **Add New...** → **Project**
3. Find your `future-champions` GitHub repo → click **Import**

### 4b. Configure the project

On the configuration screen:

| Field | Value |
|-------|-------|
| **Framework Preset** | `Next.js` (Vercel detects this automatically) |
| **Root Directory** | `frontend` ← **important, click Edit and type this** |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` |
| **Install Command** | `npm install` |

> ⚠️ The **Root Directory** must be set to `frontend`. Click the pencil/edit icon next to it and type `frontend`.

### 4c. Add environment variables

Click **Environment Variables** section and add each one:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | *(paste your Render URL from Step 3d, e.g. `https://future-champions-api.onrender.com`)* |
| `NEXT_PUBLIC_SUPABASE_URL` | *(paste your Supabase Project URL from Step 2c)* |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(paste your Supabase anon key from Step 2c)* |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | *(from Firebase console → Project Settings)* |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | *(e.g. `your-project.firebaseapp.com`)* |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | *(your Firebase project ID)* |

### 4d. Deploy

1. Click **Deploy**
2. Wait 2–3 minutes — watch the build logs
3. When it says **"Congratulations!"** or shows a preview — you're live ✅
4. **Copy your Vercel URL** — looks like: `https://future-champions.vercel.app`

---

## STEP 5 — CONNECT FRONTEND ↔ BACKEND (CORS fix)

Now that both are deployed, you need to tell the backend "it's okay to receive requests from the Vercel website."

1. Go back to **Render dashboard**
2. Click your `future-champions-api` service
3. Click **Environment** tab
4. Find `ALLOWED_ORIGINS` → click Edit
5. Set the value to your Vercel URL: `https://future-champions.vercel.app`
6. Click **Save Changes**
7. Render will restart the service automatically (~1 minute)

---

## STEP 6 — SET UP ADMIN PASSWORD

You need to create an admin account so you can log into `/admin-panel`.

1. In your **Render dashboard** → click your service → **Shell** tab
2. Type this command and press Enter:
   ```
   node scripts/setup-admin.js
   ```
3. It will ask you to set a username and password
4. **Save these credentials** — you'll use them to log in at `/admin-panel`

> If the Shell tab isn't available on the free tier, you can run this locally:
> - Open Terminal / Command Prompt
> - Navigate to your `backend` folder
> - Run: `SUPABASE_URL=your_url SUPABASE_SERVICE_KEY=your_key node scripts/setup-admin.js`

---

## STEP 7 — ADD A CUSTOM DOMAIN (Optional)

### On Vercel (frontend domain):
1. Go to your Vercel project → **Settings** → **Domains**
2. Click **Add** → type your domain (e.g. `futurechampions.com`)
3. Follow Vercel's instructions to update your DNS records (usually at GoDaddy, Namecheap, etc.)
4. Wait up to 24 hours for DNS to propagate

### On Render (API subdomain):
1. Go to your Render service → **Settings** → **Custom Domain**
2. Add: `api.futurechampions.com`
3. Update DNS at your domain registrar

After adding your real domain, go back to Render → Environment → update `ALLOWED_ORIGINS` to your real domain.

---

## STEP 8 — VERIFY EVERYTHING IS WORKING

Visit your site and test these:

- [ ] Homepage loads with full-screen video background ✅
- [ ] Sign Up with Google works ✅  
- [ ] After signup → Complete Profile page appears ✅
- [ ] Matches page shows — can select winners & scores ✅
- [ ] Predictions save (click Save button) ✅
- [ ] Leaderboard shows with 5 round tabs ✅
- [ ] Admin panel at `/admin-panel` accepts your credentials ✅
- [ ] Admin MCQ tab — can create a question ✅
- [ ] Matches page shows MCQ for logged-in users ✅

---

## TROUBLESHOOTING

### "Failed to load predictions" on Matches page
→ Your `NEXT_PUBLIC_API_URL` in Vercel doesn't match your Render URL exactly. Check for trailing slash — there should be none.

### Backend shows "Service unavailable" on Render free tier
→ Free tier sleeps after 15 min of inactivity. First visit takes ~30 seconds to wake up. Upgrade to Starter ($7/mo) to avoid this.

### Videos not showing
→ Make sure `hero-main.mp4` and `promo-teaser.mp4` are in `frontend/public/videos/`. Re-deploy after adding them.

### Google sign-in not working
→ In your Firebase console → Authentication → Settings → Authorized domains — add your Vercel domain (e.g. `future-champions.vercel.app`).

### Leaderboard empty
→ Normal until users sign up and make predictions.

---

## QUICK REFERENCE — All Your URLs

After deployment, write these down:

| Service | URL |
|---------|-----|
| **Your website** | `https://future-champions.vercel.app` (or your domain) |
| **Backend API** | `https://future-champions-api.onrender.com` |
| **Admin panel** | `https://future-champions.vercel.app/admin-panel` |
| **Supabase dashboard** | `https://supabase.com/dashboard/project/YOUR_PROJECT_ID` |

---

## UPDATING YOUR SITE LATER

Whenever you change any code:
1. Push the changes to GitHub (commit + push)
2. **Vercel** and **Render** automatically detect the change and re-deploy  
3. Wait 2–3 minutes → your live site is updated

No need to do anything else — it's all automatic once connected to GitHub. ✅
