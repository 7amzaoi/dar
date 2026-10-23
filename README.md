# Dār — B2B furniture marketplace (Phase 1: frontend only)

A closed trade marketplace connecting furniture **manufacturers** with **showroom retailers**, plus an **admin** console.
Phase 1 is frontend only: everything runs on a typed mock data layer and a mock auth context.
There is **no database, no auth provider, no payments, no uploads and no email**.

## Run

```bash
npm install        # .npmrc sets legacy-peer-deps (needed by @hookform/resolvers' optional peers)
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

- **Demo accounts.** Use `/login` → "Explore with a demo account", or the floating **Preview as** switcher (development only).
  - Showroom: Bayt Showroom, `abdullah@bayt.sa`
  - Manufacturer: Damietta Atelier, `omar@damietta-atelier.com`
  - Admin: `admin@dar.trade`
  - Any password works. Every seeded email can sign in.
- **Mock persistence.** Mock data changes persist in `localStorage` (`dar.mockdb.v1`), so they survive a reload. Restore the seed with **Preview as → Reset demo data**.
- **Languages.** Arabic (RTL) is the default; switch with the language toggle. The choice is kept in the `dar-locale` cookie.
- **Placeholder images.** All images are generated SVG placeholders in `public/images`. To regenerate them, run `node scripts/generate-placeholders.mjs`.

## Design language

The whole site follows the landing hero (a RIVR-style glass hero, adapted):
- **Colours:** cool light grey `#f0f0f0` background, one navy accent and slate text. Every colour is a token in `app/globals.css` (light + dark). Dark mode follows the system setting.
- **Type:** Helvetica Regular (`@font-face`) everywhere. Instrument Sans fills in the Latin weights it lacks, and IBM Plex Sans Arabic covers Arabic.
- **Surfaces:** frosted glass (`.glass`), nested "double-bezel" trays (`.bezel` / `.bezel-core`), pill buttons and large squircle radii.
- **Hero video:** `public/videos/hero.mp4`, a self-hosted copy of the loop from `pulkitxm/claude-directory` (rivr-defi-hero). The CDN link in the original prompt answers 403.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · shadcn/ui on Radix · lucide-react · react-hook-form + zod · recharts · motion (`motion/react`) · sonner.

## Structure

```
app/
  (public)/        landing, catalog, product/[id], company/[id], makers, collections, login, register, pending-approval
  (manufacturer)/manufacturer/   overview, products (+new, [id]/edit), collections, orders (+[id]), messages, notifications, profile
  (retailer)/retailer/           overview, saved, rfq, orders (+[id]), messages, notifications
  (admin)/admin/                 overview, approvals, users, companies, categories, products (moderation), reports, notifications
components/
  ui/          shadcn primitives, re-themed through tokens
  shared/      navbar, footer, ProductCard, Filters, PriceTierTable/GatedPrice, gallery, states, motion, logo…
  dashboard/   DashboardShell, RoleGuard, DataTable, PriceTierEditor, ImageManager, ProductForm, orders, messages…
lib/
  data/        THE swappable data layer
    types.ts     entities + repository interfaces + DataSource
    helpers.ts   pure domain helpers (tier pricing, totals, pipelines)
    mock/        in-memory implementation + seed data
    index.ts     `export const db` — the only import the UI uses
  auth/        mock auth context (currentUser, login(role), logout, register)
  i18n/        ar.ts / en.ts dictionaries, provider, useT()
  hooks/       useQuery, quote-list (RFQ) + favorites providers, useStartChat
scripts/       placeholder art generator
```

Route groups don't add URL segments, so each dashboard group holds a real segment (`/manufacturer`, `/retailer`, `/admin`).
Each segment's layout wraps its pages in `RoleGuard`.

## Data-layer swap plan (Phase 2)

1. Every repository in `lib/data/types.ts` is async and typed: `ProductRepository`, `UserRepository`, `CompanyRepository`, `CategoryRepository`, `CollectionRepository`, `FavoriteRepository`, `OrderRepository`, `MessageRepository`, `NotificationRepository` and `AnalyticsRepository`. They are grouped into one `DataSource`, which also has a `subscribe()` change feed.
2. Implement a `DataSource` against the chosen backend, for example `lib/data/supabase/index.ts`.
3. In `lib/data/index.ts`, change the single line `export const db: DataSource = mockDataSource;`.
4. Delete `lib/data/mock/` and the dev-only exports next to it (`resetDemoData`, `demoUserIdByRole`).
5. Map `subscribe()` to realtime channels or to query-cache invalidation. `useQuery` refetches on every event.

The UI never imports from `lib/data/mock`.
Side effects the mock does inline (notifications on new RFQs, quotes, status changes and messages) belong in server-side triggers or actions.

**Where auth plugs in:** `lib/auth/index.tsx`.
- Replace the localStorage session with the provider's session.
- Wire `loginWithEmail`, `register` and `logout`.
- Add server-side protection (`proxy.ts` and/or server layouts) in addition to the client `RoleGuard`.

**Rendering:** all data views are client components today, because the mock lives in the browser. With a real backend, public pages (catalog, product, company) can move to server components for SEO.

## `// TODO(backend):` seams

| File | Seam |
|---|---|
| `lib/data/index.ts` | swap `mockDataSource`; remove `resetDemoData`, `demoUserIdByRole`; move `categoryCovers` to a `cover_url` column |
| `lib/data/mock/store.ts` | whole in-memory/localStorage store goes away |
| `lib/data/mock/catalog.ts` | SQL / full-text search + pagination for `products.list`; ownership check on product create; FK policy for deleting categories in use |
| `lib/data/mock/accounts.ts` | user creation via the auth provider's sign-up; admin-only approval action + email |
| `lib/data/mock/commerce.ts` | server-validated order state machine; realtime messaging; real analytics pipeline / SQL views |
| `lib/auth/index.tsx` | real session; credential check; sign-up transaction + verification email; server-side logout; remove demo `login(role)` |
| `components/dashboard/role-guard.tsx` | enforce roles on the server too |
| `components/shared/dev-role-switcher.tsx` | delete with mock auth |
| `app/(public)/login/page.tsx` | remove demo sign-in buttons |
| `app/(admin)/admin/approvals/page.tsx` | approve/reject as admin-only server action + email |
| `app/(admin)/admin/users/page.tsx` | revoke sessions on suspend |
| `app/(admin)/admin/products/page.tsx` | audit log for moderation |
| `app/(retailer)/retailer/rfq/page.tsx` | submit RFQ as one server transaction (+ email to maker) |
| `components/dashboard/image-manager.tsx` | upload to storage instead of `URL.createObjectURL` |
| `components/dashboard/company-profile-form.tsx` | logo upload + server-side validation |
| `components/shared/furniture-image.tsx` | drop `unoptimized` once images come from a CDN |
| `lib/placeholders.ts` | placeholder library replaced by real uploads |
| `lib/hooks/commerce-providers.tsx` | persist the quote list server-side |
| `lib/hooks/use-query.ts` | consider TanStack Query for real network calls |

## Known Phase-1 limitations

- Uploaded images are object URLs, so they stop resolving after a reload. Placeholder-library images persist.
- Prices are USD only.
- Analytics "views" are synthetic.
- Mock data lives per browser. Two tabs share it on reload, not live.
- `cacheComponents` is disabled in `next.config.ts`, because every view is client-rendered in this phase.
