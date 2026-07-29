# Student Risk Alert System — Next.js (Vercel deploy)

A **Next.js (App Router) + TypeScript** build of the Academic Risk Alert System,
backed by **Supabase** (Auth + Postgres + Realtime + RLS). Four roles —
**Student · Teacher · Advisor · Manager**: a student portal (transcript, GPA/CPA,
alerts, a grade-improvement simulator, realtime Q&A), a **Classes** page
(attendance + TX/GK/CK grading on a weekly schedule), and an advisor dashboard
(risk-distribution chart, alerts, interventions, KPI evaluation). **Bilingual VI/EN.**

## Requirements
- **Node.js 18+** (to run / build locally).
- A free **Supabase** project.

## 1. Set up Supabase (once)
In **Supabase → SQL Editor**, run the files in `supabase/` in order:
1. `schema.sql` — tables, RLS, signup trigger, realtime (required)
2. `rls-major-scope.sql` + `guards.sql` — tighten access by major (recommended)
3. `teacher-classes.sql` — Teacher role + Classes (attendance & component grades)
4. `risk-config.sql`, `grade-lock.sql`, `appointments.sql` — risk config, grade locking, appointments
5. (optional) `seed-mis-30.sql` — 50 sample students so the dashboard has data

Then **Authentication → Providers → Email** → enable *Confirm email* for real use.
> If you previously ran an older `schema.sql`, also run `hardening.sql` to apply the
> security patch (public signup can only create Students + tightened policies).

## 2. Run locally
```bash
npm install
cp .env.local.example .env.local     # then fill in the values below
npm run dev
```
Open http://localhost:3000

`.env.local` (from **Supabase → Settings → API Keys**):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...    # anon public key (JWT)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...        # service_role secret (SERVER ONLY)
```
> **Use the legacy JWT keys** (`eyJ...`) under Supabase **Settings → API Keys → “Legacy
> anon, service_role API keys”**. The newer `sb_publishable_…` / `sb_secret_…` keys can
> fail server-side JWT verification (HTTP 401 on the API routes).
>
> `NEXT_PUBLIC_SUPABASE_URL` must be the **base project URL only** —
> `https://xxxx.supabase.co`, with **no** `/rest/v1/` suffix and no trailing slash.
>
> `NEXT_PUBLIC_*` is the **anon/public** key (safe thanks to RLS). `SUPABASE_SERVICE_ROLE_KEY`
> is the **full-access** key — server-only (no `NEXT_PUBLIC_`), used by
> `/api/admin/import-students` to **create student login accounts**. On Vercel:
> **Settings → Environment Variables**. Without it, login/read still works — you just
> **can't create new accounts** (a clear error is shown).

### Grade / alert emails (Gmail SMTP — optional)
To have the system **email students** when a grade is updated or a risk alert opens,
use a Gmail account as SMTP — **no custom domain needed**, delivers well to student
Gmail (~500 emails/day):
1. On a Google account (ideally a dedicated one, e.g. `vnuis.risk.alert@gmail.com`):
   enable **2-Step Verification**, then **Google Account → Security → App passwords**
   to create a **16-character app password** (this is NOT the normal login password).
2. Add these **server** variables (no `NEXT_PUBLIC_`) — in `.env.local` locally and in
   **Vercel → Settings → Environment Variables** for deploys:
   - `GMAIL_USER=vnuis.risk.alert@gmail.com`
   - `GMAIL_APP_PASSWORD=` (16 chars, remove spaces; must match `GMAIL_USER`'s account)
   - `NOTIFY_FROM_NAME=Academic Risk Alert System — VNU-IS` (optional display name only;
     the sending address is always `GMAIL_USER`).
> If `GMAIL_USER` / `GMAIL_APP_PASSWORD` are **not** set, the app runs fine and just
> **skips email** (in-app notifications still show the full component grades). These
> variables only power the app's **grade/alert emails**. **Password-reset / confirm**
> emails go through Supabase Auth — for reliability, set the same Gmail as a **Custom
> SMTP** under Supabase → Authentication → SMTP Settings.
>
> After changing any environment variable on Vercel you must **Redeploy** for it to
> take effect (Deployments → ⋯ → Redeploy).

### Student-data security
- **RLS** protects every table: a student reads only their own data and cannot edit
  grades; anonymous visitors read nothing; public signup is always a Student (a
  trigger forces the role).
- **Scope by major (recommended)**: run `supabase/rls-major-scope.sql` so an advisor
  can read/write only **their own students** at the database layer (by default the app
  only filters in the UI). Managers still see everything.
- **The email API** takes no arbitrary address: the client sends a `studentId`, the
  server resolves the email under the caller's RLS; email content is HTML-escaped.
- **For real (non-demo) use**: re-enable *Confirm email* in Authentication (so nobody
  can register with a pre-issued student email to hijack a profile), and set
  **Site URL** = your Vercel link under Authentication → URL Configuration (otherwise
  password-reset links point at `localhost`).

### Extra features
- **Print transcript**: a “Print transcript” button in the student portal → print
  dialog for **paper** or **Save as PDF**.
- **Scope by major**: each advisor only sees/manages students assigned to them
  (`advisor_id`); a `manager` sees all. Add other advisors via seed/SQL, assign
  students with “Add student” in the advisor table.
- **Excel/CSV import**: “Import Excel” + “Download template” (.xlsx) on the Students
  page (columns `student_code,full_name,email,program,cohort,attendance_rate,lms_activity_score`),
  and “Import grades (Excel)” to bulk-load grades matched by student code.
- **Classes page (teacher & advisor)**: pick a class → two tabs **Attendance** and
  **Grades** (TX/GK/CK) in one screen; classes meet once a week. Attendance shows the
  recorded sessions as **date chips** (click one to jump to that session) and a live
  *present this session* count. Saving grades as an advisor/teacher notifies + emails
  the student (demo `@sv.demo.edu.vn` addresses are skipped); if the mail server
  rejects the send, the toast says so instead of failing silently.
  > **Timetable convention**: a class header shows the weekly slot read from
  > `sections.name`, written as `Course name · Weekday · HH:MM–HH:MM`
  > (e.g. `Web Application Development · Thứ Ba · 07:00–09:30`). Everything after the
  > first `·` is treated as schedule text; notifications and emails use only the part
  > before it. A name with no `·` still works — the schedule line is simply omitted.
- **Overview dashboard**: a **risk-distribution donut** (Low/Medium/High/Critical) —
  click a level to filter the student list — plus a 14-day risk-trend chart.
- **Grade-improvement simulator (student portal)**: try better letter grades for a
  retake → CPA & risk score recompute instantly, with graduation-classification
  targets (simulation only, not saved).
- **Evaluation KPIs** on Overview: average alert-handling time, intervention
  completion rate, high-risk follow-up, alerts resolved.
- **Student detail (for staff)**: contact card (`mailto:` email), per-student
  transcript, and a **direct chat** with that student (plus interventions, alerts,
  notifications).
- **Alarm-zone prediction** (`lib/predict.ts`, explainable — no black box): estimates
  the % chance a **not-yet-alerted** student falls into the alert zone, from (1) how
  close the risk score & each factor are to threshold, and (2) the historical risk
  trend (30-day projection with an ETA). Shown in the **“Prediction”** column, on the
  detail page (with reasons + early-intervention hints), and as a KPI on Overview.

### Accounts
Accounts are **school-issued**: public signup is always a **Student** (a trigger
forces the role). Advisor/Teacher/Manager profiles are pre-created in `profiles`,
then activated by signing in with the matching email via **Supabase → Authentication**.
The role comes from `profiles.role` — never inferred from the email.
> This public document ships **no demo accounts/passwords** for security. For sample
> data, run `supabase/seed-mis-30.sql` (50 view-only students that can't log in), then
> create login accounts in the Supabase Dashboard if needed.

## 3. Deploy to Vercel
1. Push the repo to GitHub (if not already).
2. Vercel → **Add New… → Project** → import the repo.
3. **Root Directory**: `.` (the app is at the repository root). Framework auto-detects
   **Next.js**.
4. **Environment Variables**: add `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and (optional)
   `GMAIL_USER`, `GMAIL_APP_PASSWORD`. Use the **legacy JWT keys** (see §2).
5. **Deploy** → get a `https://…vercel.app` URL. Then set that URL as the Supabase
   **Site URL** (Authentication → URL Configuration).
> Changing env vars later requires a **Redeploy** to apply.

## Project structure
```
app/
  layout.tsx        # wraps I18nProvider, imports globals.css
  globals.css       # theme (plain CSS, no UI framework)
  page.tsx          # login / forgot password (6-digit OTP)
  student/page.tsx  # student portal (+ grade-improvement simulator)
  teacher/page.tsx  # teacher portal (Classes page)
  advisor/page.tsx  # advisor/manager (Overview, Students, Classes, Alerts, Messages, Evaluation)
  api/              # privileged routes: import-students, sync-lms, notify-alert, notify-grade
lib/                # supabaseClient, gpa, risk, predict, i18n, icons, format, types
components/         # common, advisor-parts, classes-view (Classes 2-tab), whatif (simulator)
supabase/           # schema.sql + rls-major-scope, guards, teacher-classes, risk-config, ...
```

## Technical notes
- **Client-side + RLS**: data is protected by Row-Level Security; pages are Client
  Components that guard roles with `useEffect` + redirect. No SSR for private data
  (can be upgraded to `@supabase/ssr` + middleware later).
- **i18n**: switching VI/EN updates state and re-renders instantly (no reload); stored
  in localStorage.
- **Realtime**: `supabase.channel(...).on('postgres_changes')`, cleaned up on unmount.
- VNU grade scale in `lib/gpa.ts`; the risk engine (40/30/15/15) in `lib/risk.ts`.
