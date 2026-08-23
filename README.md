# DSMS — Demo Schedule & Management System

An internal tool for pre-sales teams who run product demos across multiple offices. It answers one question that currently costs a lot of phone calls: **"is this environment free, and is anyone about to break it?"**

Scheduling a demo publishes a **freeze window** that every office can see, so nobody deploys a change into a live client demo. Reminders go out automatically before each demo, and anything found during the pre-demo test can be logged and routed to the person who can fix it.

---

## MVP scope

Seven features, deliberately no more:

| # | Feature | What it does |
|---|---|---|
| 1 | **Role-based access** | Admin / Demo Owner / Viewer. Only the person who brought the client can edit that demo — enforced server-side, not just hidden in the UI. |
| 2 | **Demo scheduling** | Create, edit, reschedule, complete, or cancel a demo with client, product/environment, office, and time. |
| 3 | **Shared calendar** | Month view of every demo across every office, filterable by office. This is the cross-office visibility layer. |
| 4 | **Conflict detection** | Booking an environment that's already reserved in an overlapping window (including buffers) is blocked with a message naming who holds it. |
| 5 | **Issue tracking** | Log a problem against a demo, assign it to someone, track Open → In Progress → Resolved. Only the assignee is notified. |
| 6 | **Automated reminders** | A daily cron emails a T-3 day "confirm client changes" reminder and a T-1 day "test the product" checklist. |
| 7 | **Admin panel** | Add new branch offices, products/environments, and users at runtime — no code change or redeploy. |

Deliberately **not** in the MVP: two-way calendar sync, escalation chains, reporting dashboards, CRM linkage, Slack/Teams notifications, external booking links. See `SPEC.md` in the sibling `PreSales-Demo-Scheduler` folder for the full roadmap.

---

## Tech stack

- **Next.js 15** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS** — styled to the Monocept brand palette
- **Prisma** + **PostgreSQL**
- **jose** for Edge-compatible JWT session cookies, **bcryptjs** for password hashing
- **Resend** for email (optional — the app runs fine without it)
- **Vercel Cron** for the daily reminder job

Chosen so the whole thing deploys to Vercel with no custom infrastructure: no long-running server, no separate API service, no background worker.

---

## Deploying to Vercel

Nothing to install, and no commands to run. Three steps:

**1. Push this folder to GitHub.**

```bash
git remote add origin https://github.com/<you>/demo-scheduler.git
git push -u origin main
```

**2. Import the repo at [vercel.com/new](https://vercel.com/new).**
Vercel detects Next.js on its own — leave every build setting alone.

The first deploy will succeed but the app won't work yet, because there's no database. That's expected.

**3. Attach a database, then redeploy.**
In your Vercel project → **Storage** → **Create Database** → **Neon (Postgres)** → connect it to the project. `DATABASE_URL` is injected automatically.

Now go to **Deployments** → the latest one → **⋯** → **Redeploy**.

That's it. The build creates the tables and inserts the starter data by itself (`scripts/setup-db.mjs`), so the app is ready to log into as soon as the redeploy finishes.

### Seeded logins

All seeded users share the password **`Passw0rd!`**

| Email | Role | Office |
|---|---|---|
| `admin@monocept.com` | Admin | Hyderabad |
| `rahul@monocept.com` | Demo Owner | Hyderabad |
| `priya@monocept.com` | Demo Owner | Mumbai |
| `arjun@monocept.com` | Viewer | Gurgaon |

> **Change these before anyone real uses the app.** Sign in as the admin, add proper accounts under **Admin → Users**, then remove the seed users. The default password is in this public repo, so any deployment still using it is effectively open. Also delete the credential hint at the bottom of `src/app/login/page.tsx`.

### Optional environment variables

None of these are needed to get running — add them later under **Settings → Environment Variables**.

| Variable | What it does if you set it |
|---|---|
| `RESEND_API_KEY` | Actually sends reminder emails. Without it they're written to the server log, visible under Vercel → Logs. Free key at [resend.com](https://resend.com). |
| `REMINDER_FROM_EMAIL` | Sender address, e.g. `DSMS <demos@yourdomain.com>`. Must be a domain verified in Resend. |
| `CRON_SECRET` | Stops anyone else from triggering the reminder job. Recommended once you're live. |
| `AUTH_SECRET` | An explicit session signing key. If unset, one is derived from `DATABASE_URL` automatically. |
| `NEXT_PUBLIC_APP_URL` | Your production URL, used for links inside reminder emails. Defaults to the Vercel URL. |

### About the daily reminder job

`vercel.json` registers a run of `/api/cron/reminders` at 03:30 UTC (09:00 IST). It appears under **Settings → Cron Jobs** after the first deploy. To trigger it manually:

```bash
curl https://your-app.vercel.app/api/cron/reminders
```

> On the Vercel Hobby plan, cron jobs run once per day and the exact minute isn't guaranteed — fine for daily reminders. More frequent or precisely-timed runs need the Pro plan.

---

## Running on your own machine (optional)

You don't need this to deploy. If you do want it locally, you still need a Postgres database — the easiest is to reuse the same Neon one:

```bash
npm install
cp .env.example .env    # paste your DATABASE_URL from Vercel → Storage
npm run dev
```

---

## How the core rules work

**Freeze windows.** A demo blocks its environment for the meeting time *plus a buffer either side* (default 30 min). Two demos conflict when those windows overlap — `findConflict()` in `src/app/actions/demos.ts`.

**Client confidentiality.** Client names are visible only to the demo's owner, anyone assigned an issue on it, and admins. Everyone else sees the freeze window with the client masked as "Confidential" — `canSeeClientName()` in `src/lib/auth.ts`.

**Reminder idempotency.** `ReminderLog` has a unique constraint on `(demoId, type)`, so a demo can never receive the same reminder twice even if the cron fires more than once.

**Timezone.** Every office is currently in India, so the app uses a fixed IST (UTC+5:30) for input and display, storing UTC in the database. If an office outside India is ever opened, `src/lib/time.ts` is the only file that needs to change.

---

## Project structure

```
src/
  app/
    actions/       server actions — auth, demos, issues, admin
    api/cron/      daily reminder job
    calendar/      shared month view
    demos/         list, create, detail, edit
    issues/        assigned worklist
    admin/         offices, products, users
    login/
  components/      Shell, DemoForm, IssueForm, AdminForms, Badges, Logo
  lib/             db, auth, session, time, email
prisma/
  schema.prisma
  seed.ts
```

---

## Useful commands

```bash
npm run dev        # local dev server
npm run build      # production build (runs prisma generate first)
npm run db:push    # sync schema to the database
npm run db:seed    # insert sample data
npm run db:reset   # wipe and re-seed — destroys all data
```
