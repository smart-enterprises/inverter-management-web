# Smart Enterprises — Inverter Management Web

Internal web app for Smart Enterprises' B2B inverter business. Frontend for the [API](https://github.com/smart-enterprises/inverter-management-api). Built with React + Vite + Tailwind.

Production: <https://app.warriorpower.in>

## What the project is

A role-based portal used by Smart Enterprises' staff to manage inverter orders end-to-end: salesmen book orders against dealers, production tracks build queues, packing/delivery handle fulfillment, accounts handle invoicing, and managers/admins see analytics across all of it.

It pairs with the [mobile app](#) used by salesmen in the field.

## Tech stack

- **React 18** + **Vite**
- **Tailwind CSS**
- **React Router**
- **React Icons** (Feather set, prefixed `Fi*`)
- **SweetAlert2** for confirmations
- **Firebase** (web push notifications)
- Custom select/dropdown component (`CustomSelect`)

## Project structure

```
src/
├── api/             API clients (fetchOrders, fetchDealers, fetchProductionSummary, ...)
├── components/      Reusable components (Sidebar, CustomSelect, modals, ...)
├── contexts/        React contexts (auth, etc.)
├── firebase/        Firebase init
├── hooks/           useAuth, etc.
├── layouts/         App shell (Sidebar + Outlet)
├── pages/           Route screens
├── routes/          AppRoutes + ROUTE_PERMISSIONS map
├── services/        Domain services
├── styles/          Tailwind config / globals
└── utils/           constants, roles, status, toast, ...
```

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run lint         # ESLint
npm run build        # production bundle into dist/
npm run preview      # serve dist/ locally
npm run deploy       # gh-pages publish
```

### Environment

The web app talks to the API via `src/api/apiClient.js`. Set the API base URL there (or via your own env wiring) before running.

## Roles & route permissions

Source of truth: `src/routes/routePermissions.js`. The sidebar uses the same map to hide nav entries the current user can't reach. `ProtectedRoute` enforces the gate at the route level.

| Role | Has access to |
|---|---|
| `ROLE_SUPER_ADMIN` / `ROLE_ADMIN` | Everything |
| `ROLE_MANAGER` | Everything except some admin-only mutations |
| `ROLE_SALESMAN` | Dashboard, dealers, products, orders (own), create order |
| `ROLE_PRODUCTION` / `ROLE_PACKING` | Dashboard, products, orders (production/packed view), delivery |
| `ROLE_ACCOUNTS` | Dashboard, dealers, products, orders, billing |
| `ROLE_DELIVERY` | Dashboard, orders, delivery |
| `ROLE_DEALER` | (mobile app primarily) |

Any backend response also enforces the same rule, so route guards are defense-in-depth, not the only check.

## Key screens

- `/dashboard` — KPIs and quick links
- `/orders` — order list with status / priority / date / salesman / dealer filters
- `/orders/create` — order creation flow with stock-aware product picker
- `/orders/:id` — order detail + status transitions
- `/production-summary` — per-product remaining work by status, with dealer drill-down (admin-only)
- `/dealers`, `/users`, `/products`, `/brands` — masters
- `/analytics` — server-side dashboard (admin/manager)

## Recent changes — May 2026

### Orders list — salesman + dealer filter
Admin / manager / super-admin can now filter by salesman; selecting one narrows the dealer dropdown to that salesman's assigned dealers. Salesman role only sees the dealer dropdown, scoped to their own dealers.

### Orders list — partial fulfillment progress bar
Each row now shows `X/Y delivered · NN%` with a thin progress bar driven by the new `order.progress` field from the API. Hidden on `CANCELLED` / `REJECTED`. Indigo while in progress, emerald when complete.

### Production Summary page (new)
`/production-summary` — per-product remaining qty grouped by status (`PRODUCTION`, `PACKED`, `INVOICE`, `SHIPPED`). Each product row is **expandable** to reveal a nested dealer table showing which dealers ordered how much and what status each chunk is in.

Access locked to super-admin / admin / manager (UI + backend both enforce).

### Dealer dropdown UX
The dealer picker (on `/orders/create` and the orders list filter) now shows:
- **Main label:** `Shop name — Town`
- **Sub-label (muted gray):** phone number, also searchable

`CustomSelect` was extended with an optional `subLabel` field — backward-compatible with existing usages.

### Add items to an existing order
Order Details page (`/orders/:id`) now has an emerald "Add Items" button. Opens a modal with the same Brand → Model → Product cascade as Create Order, scoped to the order's dealer. Multi-row, server-side validated, refreshes the order on success.

Visibility:
- Order status must not be `DELIVERED`, `COMPLETED`, `CANCELLED`, or `REJECTED`
- Caller must be the order's original creator OR `SUPER_ADMIN` / `ADMIN` / `MANAGER`

Backend wired via new endpoint `POST /api/v1/order-details/:orderNumber/items`.

### Status workflow (backend-driven cleanups reflected here)
The API tightened its order state machine:
- `DELIVERED → COMPLETED` is now an explicit transition
- `REJECTED` and `COMPLETED` are immutable (no further edits / cancels / status changes)

UI behaviour: edit / cancel / status-change buttons are hidden when `order.status ∈ {DELIVERED, COMPLETED, CANCELLED, REJECTED}`.

## Branching

- `shahul_dev` — Shahul's WIP branch (this README is on it)
- `dev` — integration branch
- `qa` / `live` — staging / production

## License

Internal — Smart Enterprises. Not for redistribution.
