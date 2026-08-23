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

## Local setup

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:push           # create the tables
npm run db:seed           # add sample offices, products, and users
npm run dev
```

Open http://localhost:3000.

Generate an `AUTH_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Seeded logins

All seeded users share the password **`Passw0rd!`** — change these before real use.

| Email | Role | Office |
|---|---|---|
| `admin@monocept.com` | Admin | Hyderabad |
| `rahul@monocept.com` | Demo Owner | Hyderabad |
| `priya@monocept.com` | Demo Owner | Mumbai |
| `arjun@monocept.com` | Viewer | Gurgaon |

---

## Deploying to Vercel

1. **Push to GitHub**, then import the repo at [vercel.com/new](https://vercel.com/new). Vercel detects Next.js automatically — no build settings to change.

2. **Add a database.** In your Vercel project → **Storage** → create a Postgres store (Neon). `DATABASE_URL` is injected into the project automatically.

   Using a database from elsewhere (Supabase, Railway, RDS) works too — just set `DATABASE_URL` yourself under **Settings → Environment Variables**.

3. **Add the remaining environment variables** under **Settings → Environment Variables**:

   | Variable | Required | Notes |
   |---|---|---|
   | `DATABASE_URL` | Yes | Auto-set if you used Vercel's Postgres store |
   | `AUTH_SECRET` | Yes | Long random string — sessions won't work without it |
   | `CRON_SECRET` | Recommended | Vercel sends this to the cron route so nothing else can trigger it |
   | `RESEND_API_KEY` | Optional | Without it, reminders are logged to the server console instead of emailed |
   | `REMINDER_FROM_EMAIL` | Optional | e.g. `DSMS <demos@yourdomain.com>` — must be a domain verified in Resend |
   | `NEXT_PUBLIC_APP_URL` | Optional | Your production URL, used for links inside reminder emails |

4. **Deploy**, then create the tables against the production database. From your local machine, with the production `DATABASE_URL` in your `.env`:

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Verify the cron.** `vercel.json` registers a daily run of `/api/cron/reminders` at 03:30 UTC (09:00 IST). It appears under **Settings → Cron Jobs** after the first deploy. You can trigger it manually to test:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/reminders
   ```

> **Note on the Vercel Hobby plan:** cron jobs run once per day and the exact minute is not guaranteed. That's fine for daily reminders. If you need precise timing or more frequent runs, that requires the Pro plan.

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
