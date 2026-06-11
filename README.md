# 🏆 Future Champions — Prediction Challenge

**FIFA World Cup Prediction App**  
Predict match results, earn points every round, unlock MCQ bonus challenges, and compete for **$1,000 cash + vouchers**.

---

## 🎨 Brand Identity

| Color | Hex | Usage |
|-------|-----|-------|
| Electric Blue | `#0096FF` | Primary actions, highlights |
| Vibrant Orange | `#FF6400` | Secondary CTA, fire accents |
| Deep Purple | `#7800C8` | Cards, gradients |
| Bright White | `#FFFFFF` | Text on dark |
| Background Black | `#000000` | Base background |
| Cyan | `#00E5FF` | Blue mix |
| Magenta | `#FF00CC` | Pink highlights |
| Golden Yellow | `#FFD700` | Prize, gold accents |

**Fonts:** Bebas Neue (headings/hero) + Inter (body)  
**Vibe:** Sci-fi, futuristic, modern

---

## 🏅 Prize Structure (5 Winners)

| Round | Matches | Prize |
|-------|---------|-------|
| Round 1 | Group Stage | Voucher |
| Round 2 | R32 & Round of 16 | Voucher |
| Round 3 | Quarter-Finals & Semi-Finals | Voucher |
| Round 4 | Final | Voucher |
| **Full Tournament** | All stages | **$1,000 Cash** |

---

## 📊 Point System

| Stage | Correct Winner | Exact Score Bonus |
|-------|---------------|-------------------|
| Group Stage | 1 pt | +10 pts |
| Round of 32 | 3 pts | +10 pts |
| Round of 16 | 5 pts | +10 pts |
| Quarter-Finals | 7 pts | +10 pts |
| Semi-Finals | 9 pts | +10 pts |
| Third Place | 11 pts | +10 pts |
| Final | 13 pts | +10 pts |
| **Mini MCQ Bonus** | — | **+5 pts/question** |

---

## 🎥 Video Files Required

Place these in `frontend/public/videos/`:

| File | Used in | Description |
|------|---------|-------------|
| `hero-main.mp4` | Homepage hero | Full-screen background (16:9, 15-30s loop) |
| `promo-teaser.mp4` | All other pages | Promo banner (16:9, 10-20s loop) |

Also place poster images:
- `frontend/public/images/hero-poster.jpg` — Hero video first frame
- `frontend/public/images/promo-poster.jpg` — Promo video first frame
- `frontend/public/images/fc-logo.png` — Future Champions logo

---

## 🗂 Project Structure

```
future-champions/
├── frontend/               # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.js           ← Homepage (hero video + sections)
│   │   │   ├── matches/page.js   ← Predictions (was /predictions)
│   │   │   ├── leaderboard/page.js ← Round tabs + overall
│   │   │   ├── admin-panel/page.js ← Admin with MCQ management
│   │   │   ├── login/            ← Auth pages (copy from original)
│   │   │   ├── signup/
│   │   │   └── globals.css       ← Full sci-fi design system
│   │   ├── components/
│   │   │   ├── layout/Header.js
│   │   │   ├── layout/Footer.js  ← Now included in all pages
│   │   │   └── predictions/MatchCard.js
│   │   ├── context/              AuthContext + LanguageContext
│   │   ├── lib/                  api.js + constants.js + supabaseClient.js
│   │   └── locales/en.js
│   └── package.json
├── backend/                # Express.js API
│   └── src/
│       ├── routes/
│       │   ├── leaderboard.js    ← Round-based leaderboard
│       │   ├── mcq.js            ← NEW: Mini MCQ routes
│       │   └── ... (others unchanged)
│       └── index.js              ← MCQ routes registered
└── schema_future_champions.sql   ← COMPLETE Supabase schema
```

---

## 🛢 Database Setup (Supabase)

1. Go to **Supabase Dashboard → SQL Editor → New Query**
2. Paste the contents of `schema_future_champions.sql`
3. Run it — this creates all tables, functions, triggers, RLS policies

### New tables vs original:
- `mcq_questions` — Admin-created bonus questions
- `mcq_answers` — Player responses
- `prize_winners` — 5 prize slots (auto-seeded)
- `users` — Now has `points_round_1..4` + `mcq_bonus_points` columns

### Key functions:
- `recalculate_user_points(user_id)` — Updates all point buckets + total
- `score_match_predictions(match_number)` — Scores a finished match
- `add_mcq_bonus_points(user_id, points)` — Awards MCQ bonus
- `get_round_leaderboard(prize_round, limit)` — Fast round leaderboard

---

## 🔧 Local Development

### Backend
```bash
cd backend
cp .env.example .env
# Fill in Supabase, Firebase, JWT values
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Fill in API URL, Supabase, Firebase values
npm install
npm run dev
```

---

## 🧠 Admin MCQ Control

Admin URL: `/admin-panel`  
Login with your admin credentials.

**Mini MCQ tab lets you:**
- Create questions with 4 options + correct answer
- Set which round triggers the MCQ (group_stage, round_of_32, etc.)
- Toggle active/inactive per question
- Players who haven't answered see it on the Matches page
- Correct answer = **+5 bonus points** added to their total + round bucket

---

## 🔄 Key Changes from Original

| Feature | Original | Future Champions |
|---------|----------|-----------------|
| Brand | R-BUILD | Future Champions |
| Hero | Static banner image | Full-screen looping video |
| Other pages | Image banner | Promo video teaser banner |
| Nav: Predictions | `/predictions` | `/matches` (Matches) |
| Section title | How It Works | How To Join & WIN |
| Prizes | 1 winner ($1,000) | 5 winners ($1,000 + 4 vouchers) |
| Leaderboard | Single overall | 5 tabs (overall + 4 rounds) |
| Bonus | — | Mini MCQ (+5 pts, admin-controlled) |
| Colors | Deep blue / beige | Electric Blue / Orange / Purple / Black |
| Font | Helvetica Neue | **Bebas Neue** (hero/titles) |
| Footer | Not in pages | ✅ Added to all pages |
| Admin | Match/user control | + MCQ management tab |
| DB | Standard schema | + mcq_questions/answers, prize_winners, round point columns |

---

## 📦 Deployment

**Frontend (Vercel/Netlify):**
```bash
cd frontend && npm run build
# Deploy the .next/ output or use Vercel CLI
```

**Backend (Railway/Render/Fly.io):**
```bash
cd backend
# Set env vars on your hosting platform
npm start
```

**Admin password setup:**
```bash
cd backend
node scripts/setup-admin.js
```
