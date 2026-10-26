# Dār — B2B furniture marketplace

<div dir="rtl">

## دار — سوق أثاث بين الشركات

**دار** منصة تجارة جملة مغلقة بتربط **مصانع الأثاث** مع **صالات العرض وتجّار التجزئة**، ومعها لوحة تحكم للإدارة.

- **للمصانع:** إضافة المنتجات بصورها وأسعار الجملة حسب الكمية، وتنظيمها بمجموعات، واستقبال طلبات التسعير والطلبات المباشرة ومتابعتها.
- **لصالات العرض:** تصفّح الكتالوج وفلترته، وحفظ القطع المفضّلة، وطلب عروض أسعار من أكتر من مصنع، ومتابعة الطلبات خطوة بخطوة.
- **للإدارة:** مراجعة طلبات العضوية والموافقة عليها، وتوثيق الشركات، وإدارة التصنيفات ومراجعة المنتجات، وتقارير المنصة.
- **الثقة:** أسعار الجملة بتظهر بس للأعضاء الموافَق عليهم، والتواصل بين الطرفين بيصير مباشرة على واتساب.
- **اللغة:** عربي من اليمين لليسار بشكل افتراضي، ومعه إنجليزي.

**التقنيات:** Next.js 16 وTypeScript وTailwind، وعلى Neon: قاعدة بيانات Postgres، وتسجيل دخول Neon Auth، وتخزين صور المنتجات، وتحديثات مباشرة للإشعارات والطلبات.

</div>

A closed trade marketplace connecting furniture **manufacturers** with **showroom retailers**, plus an **admin** console.
It runs on **Neon**:
- Lakebase Postgres for data
- Neon Auth (Managed Better Auth) for sign-in
- Object Storage for product images
- Realtime for live notifications and order updates

There are **no payments and no transactional email** yet. Neon Auth sends its own verification and reset emails.

## Run

```bash
npm install        # .npmrc sets legacy-peer-deps (needed by @hookform/resolvers' optional peers)
neon env pull      # writes the branch's env vars into .env.local (the project is linked in .neon)
npm run db:migrate # apply drizzle/ migrations (direct connection)
npm run db:seed    # load the demo catalogue (idempotent)
npm run dev        # http://localhost:3000
npm run smoke      # with dev running: Object Storage + Realtime end-to-end check (cleans up after itself)
npm run build      # production build
npm run lint
```

- **Environment (`.env.local`, git-ignored).** `neon deploy` and `neon env pull` write these:
  - `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
  - `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`
  - `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET`
  - the `AWS_*` storage credentials

  Add two app values yourself: `NEON_AUTH_COOKIE_SECRET` (`openssl rand -base64 32`) and `NEXT_PUBLIC_NEON_REALTIME_URL` (same value as `NEON_REALTIME_URL`).
- **Infrastructure as code.** `neon.ts` declares Auth, the private `assets` bucket and Realtime, including `allowedOrigins`. Add every deployed origin to that list before deploying there. Apply the file with `neon deploy`.
- **Seeded accounts.** The seed creates app accounts but no sign-in identities.
  - To use one, sign up through Neon Auth with its email, e.g. `abdullah@bayt.sa` (showroom), `omar@damietta-atelier.com` (manufacturer) or `admin@dar.trade` (admin). On first sign-in the identity is linked to that account.
  - Outside development, this link requires a verified email, so nobody can claim a seeded account just by typing its address.
- **Languages.** Arabic (RTL) is the default; switch with the language toggle. The choice is kept in the `dar-locale` cookie.
- **Placeholder images.** All images are generated SVG placeholders in `public/images`. To regenerate them, run `node scripts/generate-placeholders.mjs`.

## Design language

The whole site follows the landing hero (a RIVR-style glass hero, adapted):
- **Colours:** cool light grey `#f0f0f0` background, one navy accent and slate text. Every colour is a token in `app/globals.css` (light + dark). Dark mode follows the system setting.
- **Type:** Helvetica Regular (`@font-face`) everywhere. Instrument Sans fills in the Latin weights it lacks, and IBM Plex Sans Arabic covers Arabic.
- **Surfaces:** frosted glass (`.glass`), nested "double-bezel" trays (`.bezel` / `.bezel-core`), pill buttons and large squircle radii.
- **Hero video:** `public/videos/hero.mp4`, a self-hosted copy of the loop from `pulkitxm/claude-directory` (rivr-defi-hero). The CDN link in the original prompt answers 403.

### Animation components (VengeanceUI, MIT)

Copied from the [VengeanceUI](https://github.com/Ashutoshx7/VengeanceUI) registry into `components/ui/`. Each file's header lists what changed:

| Component | Used for | Adapted |
|---|---|---|
| `animated-number` | stats tray, dashboard KPI cards (digits roll in on view) | `motion/react`, spring digit columns, formatted strings, LTR digits |
| `image-reveal-list` | makers list on the home page (hover peeks a piece) | Next `Link`, RTL-safe positions, theme tokens |
| `border-beam` | closing call-to-action card | keyframes in `globals.css`, navy/white beam |
| `perspective-carousel` | collections page showcase | translatable labels, LTR track, glass controls |
| `smooth-scroll` (Lenis) | public pages | off for reduced motion, skips overlays, anchor offset |

Letter-by-letter text effects (e.g. `flip-fade-text`) were not used, because splitting words into letters breaks Arabic joining.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui on Radix · lucide-react · react-hook-form + zod · recharts · motion (`motion/react`) · sonner.

## Structure

```
app/
  (public)/        landing, catalog, product/[id], company/[id], makers, collections, login, register, pending-approval
  (manufacturer)/manufacturer/   overview, products (+new, [id]/edit), collections, orders (+[id]), notifications, profile
  (retailer)/retailer/           overview, saved, rfq, orders (+[id]), notifications
  (admin)/admin/                 overview, approvals, users, companies, categories, products (moderation), reports, notifications
components/
  ui/          shadcn primitives, re-themed through tokens
  shared/      navbar, footer, ProductCard, Filters, PriceTierTable/GatedPrice, gallery, states, motion, logo…
  dashboard/   DashboardShell, RoleGuard, DataTable, PriceTierEditor, ImageManager, ProductForm, orders, notifications…
lib/
  data/        THE swappable data layer
    types.ts     entities + repository interfaces + DataSource
    helpers.ts   pure domain helpers (tier pricing, totals, pipelines)
    http.ts      browser DataSource: every call is a POST to /api/data
    seed.ts      demo catalogue (used by scripts/seed-db.ts)
    index.ts     `export const db` — the only import the UI uses
  auth/        Neon Auth client + AuthProvider (currentUser, loginWithEmail, register, logout)
  realtime/    Realtime bridge: live queries -> `db.subscribe` listeners
  server/      server-only: db (Drizzle + pg), repositories, policy (authorization), auth, storage, realtime
  i18n/        ar.ts / en.ts dictionaries, provider, useT()
  hooks/       useQuery, quote-list (RFQ) + favorites providers, useStartChat
app/api/       auth/[...path] (Neon Auth proxy), data (RPC), me, register, uploads, files/[...key], realtime
drizzle/       SQL migrations (generated from lib/server/db/schema.ts)
scripts/       placeholder art generator, seed-db.ts, smoke-services.mts
proxy.ts       redirects signed-out visitors away from the dashboards
```

Route groups don't add URL segments, so each dashboard group holds a real segment (`/manufacturer`, `/retailer`, `/admin`).
Each segment's layout wraps its pages in `RoleGuard`.

## Contact between members: WhatsApp

There is no in-app messaging. Makers and showrooms talk directly on WhatsApp, which both sides already use and trust.
- Each company has an optional `whatsapp` number (`Company.whatsapp`). It falls back to `phone`, and is editable at registration and in the company profile.
- `whatsappLink()` in `lib/data/helpers.ts` builds a `https://wa.me/<digits>` link. `components/shared/whatsapp-button.tsx` renders it with a prefilled message that names the piece (product page), the order (order page) or the company.
- **Who sees it:** approved members only, like other contact details. Admins also get it on applications, to verify a business before approving.

## Backend (Neon)

**Data.** The UI still only talks to `db` (`lib/data`). In the browser, `db` is `lib/data/http.ts`: each repository call becomes `POST /api/data { repo, method, args }`. The route:
1. resolves the Neon Auth session to an app account,
2. runs that method's rule in `lib/server/policy.ts`,
3. calls the Postgres repository in `lib/server/repositories.ts` (Drizzle on `node-postgres`, pooled `DATABASE_URL`).

The rules:
- **Catalogue reads are public**, but limited to published products (owners and admins also see drafts). Guests see only verified companies.
- **Prices:** price tiers are stripped on the server for guests and pending accounts.
- **Own data only:** favorites, orders and notifications are always the caller's own. `retailerId`, `userId` and `manufacturerId` come from the session, never from the arguments.
- **Makers** can edit only their own products and collections.
- **Admin** methods require an approved admin.
- **Orders:** direct orders are priced on the server from the maker's tiers.
- **Notifications** for RFQs, quotes, status changes and approvals are written in the same transaction as the change.

**Auth.**
- `lib/server/auth.ts` (`createNeonAuth`) and `app/api/auth/[...path]` proxy Managed Better Auth. The browser uses `createAuthClient()` from `lib/auth`.
- Sign-up creates the identity first; then `/api/register` creates the company and a pending account.
- `/api/me` returns the signed-in account.
- Sign-out does a full page load.

**Storage.**
- `POST /api/uploads` accepts JPG, PNG, WebP or AVIF images up to 5 MB, from approved manufacturers only.
- Files go to the private `assets` bucket under `products/<company>/<uuid>.<ext>`, and the route returns `/api/files/<key>`.
- `/api/files/<key>` redirects to a presigned GET that is valid for 1 hour.

**Realtime.**
- `POST /api/realtime` seals three live queries for the caller: their account status, their notifications and their company's orders.
- `lib/realtime` subscribes to them and renews each capability 10 s before it expires. Every committed change fires `db.subscribe`.
- So a new RFQ, a quote, a status change or an approval shows up for the other party, and in other tabs, without a reload.

**Migrations.** Edit `lib/server/db/schema.ts`, then run `npm run db:generate` and `npm run db:migrate`. drizzle-kit only touches the `public` schema; `neon_auth` belongs to Neon Auth.

## `// TODO(backend):` seams

| File | Seam |
|---|---|
| `lib/data/index.ts` | move `categoryCovers` to a `cover_url` column |
| `lib/server/repositories.ts` | paginate `products.list`; real analytics pipeline (views are synthetic) |
| `app/(admin)/admin/approvals/page.tsx` | approval email |
| `app/(admin)/admin/users/page.tsx` | revoke sessions on suspend |
| `app/(admin)/admin/products/page.tsx` | audit log for moderation |
| `components/dashboard/company-profile-form.tsx` | logo upload |
| `components/shared/furniture-image.tsx` | CDN in front of the bucket, then drop `unoptimized` |
| `lib/placeholders.ts` | placeholder library replaced by real uploads |
| `lib/hooks/commerce-providers.tsx` | persist the quote list server-side |
| `lib/hooks/use-query.ts` | consider TanStack Query |

## Known limitations

- Prices are USD only.
- Analytics "views" are synthetic.
- Data views are still client components that fetch through `/api/data`. Public pages (catalog, product, company) could move to server components for SEO. Until then, `cacheComponents` stays disabled in `next.config.ts`.
- Neon Auth sends mail through Neon's shared SMTP sender. Production needs custom SMTP (see Neon's Auth production checklist).
