# HorseShowCalendar.com — Show Management Platform

A static-frontend + Supabase-backend platform that combines a public horse show
calendar with a full show management suite (entries, scheduling, scoring,
billing) and an exhibitor self-service portal.

Goes head-to-head with traditional show management software — but built as a
free public calendar first (drives organic exhibitor traffic) and a per-entry
SaaS second (managers only pay when entries flow).

## Stack

- **Frontend:** Vanilla HTML / CSS / ES2017 JS — no build step
- **Backend:** Supabase (Postgres + Auth + Realtime + RLS)
- **Payments (optional):** Stripe (publishable key only on client; capture via
  serverless function — not included)
- **Hosting:** Any static host. GitHub Pages workflow included.

## Surface

```
/                            Public calendar + alerts + show submissions
/show.html?id=…              Public show detail (overview / prize list / schedule / live results / announcements)
/for-managers.html           Sales landing for show organizers
/login.html                  Login / signup (with role: exhibitor / manager / judge)
/confirm.html                Post-confirmation redirect

/manager/dashboard.html      Manager portal: shows, stats, entries, revenue
/manager/show-edit.html?show=… General + Rings + Divisions + Classes + Entries + Financials + Announcements

/exhibitor/dashboard.html    Exhibitor portal: my entries, balance
/exhibitor/horses.html       My horses (USEF / Coggins / health certs)
/exhibitor/enter-show.html?show=… Online entry form: pick classes, fees auto-calculated, invoice auto-created
/exhibitor/my-entry.html?entry=… Entry detail + class scratching + invoice + payment
/exhibitor/billing.html      All my invoices
/exhibitor/schedule.html     My schedule across active shows

/scoring/judge.html          Judge console: score classes, auto-place, distribute prize money
/scoring/live.html?show=…    Public live results board (TV-friendly, auto-refresh, realtime)
```

## One-time setup

### 1. Create a Supabase project

1. Go to <https://supabase.com> → **New project** (free tier is fine to start)
2. Pick a region close to your users
3. Wait ~2 min for provisioning
4. Settings → API → copy:
   - **Project URL** (e.g. `https://abcd1234.supabase.co`)
   - **anon public key** (the one labeled `anon` `public`)

### 2. Wire up the frontend

Edit `js/supabase-config.js`:

```js
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
const STRIPE_PUBLISHABLE_KEY = ''; // optional — see Stripe section
```

### 3. Create the schema

In Supabase Dashboard → **SQL Editor** → **New query**, paste the contents of
`sql/migration.sql` and run. This creates:

- 18 tables (shows, classes, divisions, rings, entries, class_entries, results,
  horses, invoices, invoice_items, payments, stalls, show_staff, etc.)
- Full row-level security (exhibitors see only their data; managers see only
  their shows; judges only what they're assigned)
- Auto-profile creation on signup
- Auto invoice recalculation on item/payment change
- Helper function `is_show_staff(show_id, user_id)`

### 4. (Optional) Seed sample data

After signing up your first manager account, edit `sql/seed.sql` if needed and
run it in the SQL editor. Creates two demo shows with rings/divisions/classes.

### 5. Configure Auth (Supabase dashboard)

- Authentication → **URL Configuration** → set Site URL to your live domain
- Add your live domain to Redirect URLs (e.g. `https://horseshowcalendar.com/*`)
- Authentication → **Email Templates** → optional: customize the confirmation
  email
- Authentication → **Settings** → enable / disable email confirmations as
  desired

### 6. (Optional) Stripe payments

The exhibitor billing page has a placeholder Stripe button. To wire up real
card payments:

1. Stripe Dashboard → Developers → API keys → copy publishable key
2. Set `STRIPE_PUBLISHABLE_KEY` in `js/supabase-config.js`
3. Deploy a serverless function (Supabase Edge Function or Vercel/Netlify) that
   creates a `PaymentIntent` and returns the `client_secret` to the browser
4. Replace the `payStripeBtn` handler in `js/exhibitor.js` with a Stripe Elements
   modal that confirms the PaymentIntent
5. Have the function call `INSERT INTO payments (...)` after the Stripe webhook
   fires `payment_intent.succeeded`

Until that wiring is in place, the **Mark Paid On-Site** button records cash /
check payments — fully functional for in-person shows.

## Local development

It's a static site — open `index.html` in a browser, or run any static server:

```bash
cd "M:/Kevin/network websites/HorseShowCalendar"
python -m http.server 8000
# then http://localhost:8000
```

You **must** have `js/supabase-config.js` populated for the portal pages to
work. The public calendar (`index.html`) gracefully falls back to the static
seed data when Supabase is unreachable.

## Deployment

### GitHub Pages (free)

1. Create a new GitHub repo
2. Push this folder to it
3. Settings → Pages → Source = `main` branch, root
4. Visit `https://USERNAME.github.io/REPONAME`

The included `.github/workflows/pages.yml` will deploy automatically on push to
`main` and surface a custom domain via `CNAME`.

### Custom domain

1. Buy `horseshowcalendar.com` (or use an existing domain)
2. Set DNS:
   - `A` records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153` (GitHub Pages IPs)
   - or `CNAME` `www` → `USERNAME.github.io`
3. Add the apex domain to `CNAME` file at repo root (already included)
4. GitHub repo → Settings → Pages → Custom domain → enter `horseshowcalendar.com`
5. Wait for DNS check, then enable **Enforce HTTPS**

### Other hosts

- **Netlify / Vercel / Cloudflare Pages:** drag-and-drop or connect repo. No
  build step. Set output dir = repo root.
- **S3 + CloudFront:** standard static hosting; gzip the .css / .js / .html.

## Roles & permissions

The `profiles.role` column is set on signup based on the role-picker in the
signup form. Roles:

- **`exhibitor`** — default; can manage own horses, enter shows, view own
  invoices/results
- **`manager`** — can create shows, manage entries, score, post announcements,
  view financials
- **`judge`** — can score classes for shows where they're staff
- **`admin`** — full access to submissions/alerts moderation tables

A user can be a manager of one show and an exhibitor at another; the platform
already supports this — RLS scopes by `manager_id` on `shows` and by
`exhibitor_id` on `entries`.

To add staff to a show, run in SQL editor:
```sql
INSERT INTO show_staff (show_id, user_id, role)
VALUES ('show-uuid', 'user-uuid', 'judge'); -- or 'office', 'gate', 'announcer', 'readonly'
```

A small admin UI for staff management can be added to `manager/show-edit.html`
later — the schema already supports it.

## Realtime / live results

`show.html` and `scoring/live.html` use Supabase Realtime channels to subscribe
to changes on `classes`, `results`, and `show_announcements`. As soon as a
judge taps **Save** in the Judge Console, the public board updates in <1s with
no refresh.

This requires Supabase Realtime to be enabled (it is by default). For the
specific tables, also enable replication: Database → Replication → enable for
`classes`, `results`, `show_announcements`.

## Cost model

- **Supabase free tier:** 500MB DB, 50k MAUs, 2GB storage, 2GB bandwidth — plenty
  for the first dozen shows
- **Pro tier ($25/mo):** unlocks daily backups and longer log retention; needed
  for production
- **Stripe:** standard fees only (2.9% + 30¢) — no monthly minimum
- **Hosting (GH Pages / Netlify / Cloudflare):** free

## Roadmap (suggested)

- [ ] Stripe webhook + PaymentIntent edge function
- [ ] USEF lookup integration (cache results in `profiles`)
- [ ] CSV bulk import of class lists from prior years
- [ ] Show templates: clone last year's show in one click
- [ ] Stabling map drag-drop UI
- [ ] Staff invitations via magic link
- [ ] Native mobile wrapper (Capacitor) for offline judge scoring
- [ ] FEI integration for international shows
- [ ] QuickBooks export for closeout
- [ ] Sponsor / advertiser modules
- [ ] Multi-week circuit support (parent show + child shows)

## Troubleshooting

- **Login redirects to `index.html` instead of dashboard:** Confirm the
  `profiles.role` row was created. Run `select id, email, role from profiles;`
- **Manager sees no shows:** Make sure `shows.manager_id = auth.uid()`. The
  signup trigger sets `profiles.role` from `signup.options.data.role`.
- **Public calendar shows seed data:** That's the fallback. Either Supabase
  isn't configured or no `shows.visibility = 'public'` rows exist yet.
- **Live results don't update:** Verify Realtime replication is on for the
  `results` table.
- **CORS errors:** Add your origin to Supabase Dashboard → Settings → API →
  Configuration → Allowed origins.

## License

Internal/proprietary — Schneider Saddlery Equine Network. Not for redistribution.
