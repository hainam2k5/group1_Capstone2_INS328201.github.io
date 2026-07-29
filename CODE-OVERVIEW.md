# Code Overview — Student Risk Alert System

> A code map for reviewers: the **three-layer** structure (Front-end · Back-end · Database),
> the role of every source file, and a suggested reading path.
> Capstone Project II (INS3282) — VNU International School, Vietnam National University, Hanoi.

## Quick facts

- **Stack:** Next.js 14 (App Router) + TypeScript · Supabase (PostgreSQL + Auth + Row-Level Security + Realtime) · Vercel.
- **Roles:** Student · Teacher · Advisor · Manager. **Bilingual VI/EN.**
- **Three layers:** Front-end (UI) · Back-end (API + business logic) · Database (SQL).

> **Note on structure.** This is a **single Next.js full-stack app**, so the files follow the
> framework's required layout (`app/`, `components/`, `lib/`, `public/`, `supabase/`). The three
> layers below are a **logical grouping for review** — no files are moved out of the framework
> structure. Because `app/` holds both UI pages *and* API route handlers, a file's layer is
> decided by its role, not only by its folder.

---

## 1. Front-end — Presentation layer

Everything the user sees and interacts with: React **Client Components**, styling, bilingual
text, icons and small UI helpers. Private data stays protected by **RLS at the database**, not by the UI.

| File | Role |
|---|---|
| `app/layout.tsx` | Root layout: wraps the app in the `I18nProvider`, imports global CSS, mounts the demo bar (dev only). |
| `app/globals.css` | Global theme & styling in plain CSS (no UI framework): top bar, sidebar, cards, KPI/stat tiles, tables, chat pane, risk colours, dashboard charts, login split screen. |
| `app/page.tsx` | Login / forgot-password page (email + password, 6-digit OTP reset) with a campus-photo carousel on the brand pane. |
| `app/student/page.tsx` | Student portal: transcript, GPA/CPA, alerts, notifications, grade-improvement simulator, realtime chat with the advisor. |
| `app/teacher/page.tsx` | Teacher portal: the single **Classes** page (attendance + component grading). |
| `app/advisor/page.tsx` | Advisor/manager console (largest file): Overview dashboard, Students, Classes, Alerts & Interventions, Messages, Evaluation. |
| `components/common.tsx` | Shared UI primitives (risk badges, risk bars, language switch, reused table widgets). |
| `components/advisor-parts.tsx` | Advisor-specific UI pieces: grade-entry rows, add-course/add-student forms, risk-factor list. |
| `components/classes-view.tsx` | The Classes screen with two tabs (Attendance / Grades); reused by teacher and advisor. Saving grades notifies + emails the student. |
| `components/whatif.tsx` | Grade-improvement (what-if) simulator UI — client-only; recomputes CPA & risk instantly, never saved. |
| `components/demo-bar.tsx` | Role-switcher bar for local demo (dev only; renders nothing in production). |
| `lib/i18n.tsx` | Bilingual VI/EN dictionary + React context for instant language switching (stored in `localStorage`). |
| `lib/icons.tsx` | Hand-drawn SVG icon set (no external icon library). |
| `lib/format.ts` | Formatting helpers (dates, numbers, locale). |
| `lib/toast.ts` | Lightweight toast-notification helper. |
| `lib/programs.ts` | List of academic programs/majors used by dropdowns. |
| `lib/types.ts` | Shared TypeScript types (`Profile`, `Course`, `RiskScore`, `Section`, `Attendance`, `Alert`, …) used across the UI and logic. |

**Assets:** `public/school-logo.png` (VNU-IS shield) and `public/school/slide1–4.jpg` (login-page campus backgrounds).

---

## 2. Back-end — API routes & business logic

Server-side route handlers (Node runtime, JWT + role checks) plus the pure, explainable
logic engines. The API routes hold the secrets and call external services; the engines are pure functions.

| File | Role |
|---|---|
| `app/api/admin/import-students/route.ts` | Privileged route to bulk-create student login accounts (uses the `service_role` key); server-only. |
| `app/api/admin/sync-lms/route.ts` | Syncs LMS / attendance data (CSV) into the system, then recomputes risk. |
| `app/api/notify-alert/route.ts` | Sends a **risk-alert** email via Gmail SMTP; verifies the caller's JWT + advisor/manager role and resolves the recipient server-side (no open relay). |
| `app/api/notify-grade/route.ts` | Sends a **grade-update** email via Gmail SMTP; role-gated (advisor/manager/teacher), HTML-escaped, gracefully skipped if SMTP is not configured. |
| `lib/supabaseClient.ts` | Configures the Supabase client (real client in production; in-memory mock when `NEXT_PUBLIC_DEMO=1` in dev); role/profile lookup helpers. |
| `lib/risk.ts` | **The risk-scoring engine** — a weighted combination of GPA / attendance / LMS / fail-rate factors (40/30/15/15) with fixed thresholds. Explainable and pure (core of the project). |
| `lib/gpa.ts` | Grade & GPA/CPA computation on the VNU scale (TX/GK/CK weights → total → letter → 4-point). |
| `lib/predict.ts` | Alarm-zone prediction: an explainable estimate that a not-yet-alerted student will fall into the alert zone (threshold proximity + risk trend). |
| `lib/demo.ts` | In-memory Supabase stand-in for local demo mode (dev only; disabled in production by the `NODE_ENV` gate). |

---

## 3. Database — PostgreSQL schema & security

The whole backend rebuilds from code: tables, Row-Level Security policies, `SECURITY DEFINER`
functions, triggers and seed data. **Run `schema.sql` first, then the others in order.**

| File | Role |
|---|---|
| `supabase/schema.sql` | Core tables, RLS policies, signup trigger and realtime (**required, run first**). |
| `supabase/rls-major-scope.sql` | Tightens access by major so an advisor reads/writes only their own students (`is_my_student`). |
| `supabase/guards.sql` | Guard rails: unique email, one advisor per major, tightened `profiles`-select policy. |
| `supabase/teacher-classes.sql` | Adds the Teacher role, the `sections` & `attendance` tables, and class policies (incl. teacher-notify). |
| `supabase/risk-config.sql` | Configurable risk weights/thresholds (singleton config row). |
| `supabase/grade-lock.sql` | Grade-locking mechanism (prevent edits to locked grades). |
| `supabase/appointments.sql` | Advisor-appointment table + policies. |
| `supabase/seed-mis-30.sql` | Sample seed: 50 MIS students (cohort QH-2023) with grades / attendance / risk; **idempotent** (self-cleans). |
| `supabase/seed.sql` | Empty/placeholder seed (ships no demo data by design). |
| `supabase/hardening.sql` | Security patch for older schemas (force Student role on public signup + tighten policies). |
| `supabase/auto-assign-advisor.sql` | Trigger/backfill that auto-assigns an advisor by major. |
| `supabase/demo-2-majors.sql` | Demo dataset spanning two majors (dev/demo). |
| `supabase/remove-advisor-code.sql` | Migration to remove a deprecated advisor-code field. |

---

## Configuration & tooling (supporting — not one of the three layers)

`package.json` (dependencies & scripts) · `next.config.mjs` (security headers) · `tsconfig.json`
(strict mode) · `vercel.json` (deploy config) · `next-env.d.ts` (auto-generated types) ·
`.env.local.example` (env-var template, no secrets).

---

## Suggested reading path

1. **`README.md`** — how to set up Supabase, run locally, and deploy.
2. **Database** — `supabase/schema.sql` then `rls-major-scope.sql` to understand the data model and how RLS enforces access.
3. **Back-end** — `lib/risk.ts` (the scoring engine) and `app/api/notify-alert/route.ts` (a privileged route).
4. **Front-end** — `app/advisor/page.tsx` (the console) and `components/classes-view.tsx` (attendance + grading).

_Layer legend used above: **Front-end** = UI · **Back-end** = API + logic · **Database** = SQL._
