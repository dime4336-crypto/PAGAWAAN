# PAGAWAAN — Digital & Physical IT Workshop Platform

An interactive service catalog, custom Ethernet cable configurator, multi-service quotation engine, development portfolio, and protected operations console for **Pagawaan**, a Philippine-based IT workshop built around the ethos *"Built, fixed, connected."*

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and design choices incorporate your Phase 1 answers alongside the core requirements. Review and approve to begin implementation.

- **Frictionless Customer Ordering (No Login Wall)**: Customers never encounter a login or registration screen. They browse services, configure hardware/software specifications, and submit a service request directly by providing their name, Metro Manila location, contact number, and preferred service arrangement.
- **Vintage Mechanical Visual Direction**: Deep oiled charcoal and warm graphite surfaces paired with aged parchment typography, burnished copper/brass primary accents, oxidized verdigris semantic highlights, and subtle drafting calibration lines.
- **Metro Manila Configuration & Honest Showcase**: Contact channels, Metro Manila service coverage, business hours, and pricing rules live in a centralized configuration module. *Built in the Workshop* features the Pagawaan platform alongside clearly labeled demonstration projects, with zero fabricated reviews, awards, or history.
- **Protected Owner Console**: Administrative operations (updating request statuses, saving internal notes, adjusting service prices, toggling availability, and exporting CSV reports) are isolated behind a dedicated owner access gate unlocked by an environment-configured passcode rather than a public login wall.

---

## 1. Overview & Core Concept

- **What It Does**: Pagawaan serves both as a flagship demonstration of custom web engineering and as a working storefront for computer repair, RJ45/Ethernet fabrication, mobile device assistance, and custom software services in Metro Manila. Visitors inspect interactive hardware schematics, design custom Cat5e/Cat6 cables with live pinout visuals, configure multiple services in a single quotation tray, and receive a tracked reference number (`PAG-2026-00001`).
- **Target Audience**: Metro Manila households, students, remote workers, and small businesses needing reliable device repair, structured cabling, or bespoke software—plus prospective web development clients evaluating Pagawaan's engineering craft.
- **Key Value**: Replaces vague "message us for rates" IT pages with transparent introductory PHP estimates, structured technical intake (OS backup needs, cable length, T568B pinouts, room counts), server-verified pricing, and an organized owner workflow.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Calibration Intro & Arrival**: A brief mechanical calibration reveal (wordmark, horizontal scan hairline, progress fill) settles quickly into the Hero view without blocking interaction (bypassed automatically when `prefers-reduced-motion` is enabled).
2. **Interactive Workshop Hero**: Visitors read the core proposition (*"Tech failing? We make it work."*) alongside an interactive bench schematic switching between RJ45 T568B pinouts, PC diagnostic paths, and relay routing—explicitly marked as an interactive schematic preview rather than fake live availability.
3. **Service Exploration & Configuration**: Visitors filter across four categories (*Computer & Laptop*, *Networking & Ethernet*, *Mobile Device Assistance*, *Software Development*) or search by keyword. Hovering triggers category-specific mechanical animations (diagnostic sweep, cable trace, device frame alignment, or code-line highlight). Clicking **Details** opens turnaround estimates and scope; clicking **Configure & Add** launches service-specific intake fields.
4. **Build Your Cable Studio**: A dedicated interactive workbench lets visitors pick Cat5e or Cat6, set length in meters, choose jacket color and connector/boot type, select Straight-Through or Crossover wiring, and watch an animated SVG cable and 8-pin RJ45 plug update live alongside transparent material + labor estimates.
5. **Quotation Tray & Submission**: Multiple configured services and custom cables accumulate in a slide-over request tray. Visitors fill in their name, PH contact number, optional email, Metro Manila barangay/city, service method, preferred date, and notes, confirm the quotation disclaimer checkbox, and submit to receive a server-generated `PAG-2026-XXXXX` reference receipt.
6. **Owner Operations Console**: Navigating to the protected admin route prompts for the workshop passcode, then opens a dense tabular workspace to inspect requests, inspect JSON configurations, advance workflow statuses, write internal notes, edit catalog pricing/categories, and download CSV exports.

### Visual Identity & Theme

- **Aesthetic Direction**: Antique drafting bench meets precision mechanical electronics workshop—restrained, tactile, and custom-engineered.
- **Color Palette & Mood** *(60-30-10 discipline)*:
  - *Canvas (`60%`)*: Warm Charcoal (`#141312`) and Deep Slate (`#1B1917`).
  - *Structural Surfaces & Ink (`30%`)*: Graphite panels (`#23201D`, `#2C2824`), fine drafting hairlines (`rgba(237, 230, 214, 0.12)`), Aged Parchment primary text (`#EDE6D6`), and Warm Pewter secondary text (`#A39B8B`).
  - *Accents (`10%`)*: Burnished Copper / Brass (`#D97724`) for primary interactive actions and focus indicators; Oxidized Verdigris (`#5C8D76`) for confirmed states; Oxblood (`#B8443A`) for validation errors—always paired with explicit text labels.
- **Typography & Hierarchy** *(2+1 rule)*:
  - *Display*: `Archivo` (semi-condensed industrial weight, `clamp(2.25rem, 4vw, 3.75rem)` with `text-wrap: balance`).
  - *Body*: `Public Sans` (15–16px, 1.6 line-height, optical tracking compensation on dark surfaces).
  - *Numeric & Technical*: `IBM Plex Mono` with `tabular-nums` for PHP currency (`₱`), order references, cable lengths, and pin assignments.
- **Layout & Restraint**: Clean 3-zone top navigation bar (`PAGAWAAN` wordmark, five single-line links, and primary `Request Service` trigger), single-level elevation with hairline borders, unboxed typographic metadata separators (`·`), and zero decorative pulsing dots or comment-syntax headings.

### Interactive Feedback & Motion

- **Desktop Precision Cursor**: Lightweight custom reticle on fine-pointer desktop devices displaying contextual labels on interactive surfaces (automatically disabled on touch devices and reduced-motion preferences).
- **Mechanical Tactile Motion**: Smooth settling curves (`cubic-bezier(0.16, 1, 0.3, 1)`), compositor-only transforms (`transform`, `opacity`), magnetic button attraction, flying add-to-tray feedback, and live SVG signal-trace updates inside the cable builder.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Authoritative Relational SQLite + PostgreSQL Migration Parity**
  - *Chosen Approach*: Run an Express API backed by a relational SQLite database (`better-sqlite3`) for instant zero-login persistence in the live environment, while shipping complete PostgreSQL/Supabase migration and seed SQL scripts for production portability.
  - *Why*: Eliminates any mandatory user login page or external credential blocker so customers can immediately submit requests, while enforcing foreign keys, atomic reference numbering, and server-side price calculation.
  - *Alternatives Considered*: Cloud SQL with mandatory Google Sign-In (rejected because the user requested no login wall for ordering) or browser-only storage (rejected because admin requests must persist across sessions and devices).

- **Decision 2: Passcode-Gated Owner Console**
  - *Chosen Approach*: Protect administrative API routes with an HttpOnly signed session cookie issued after verifying an environment-configured workshop passcode (`ADMIN_ACCESS_KEY`), surfaced only via the dedicated admin view.
  - *Why*: Keeps the public storefront completely free of login friction while ensuring public visitors cannot alter service prices, read customer phone numbers, or change request statuses.
  - *Alternatives Considered*: Publicly accessible admin controls (insecure) or full multi-user account registration (unnecessary friction).

- **Decision 3: Server-Side Pricing Engine**
  - *Chosen Approach*: Store deterministic cable and service pricing formulas in a shared rule configuration evaluated on the server upon submission; ignore client-submitted totals.
  - *Why*: Prevents tampering with PHP estimates in browser devtools and guarantees that quotes saved in the database always match current workshop rates.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER (React + Motion)                   │
│                                                                           │
│  ┌──────────────┐   ┌────────────────────┐   ┌─────────────────────────┐  │
│  │ Workshop Hero│   │  Service Catalog   │   │  Build Your Cable Studio│  │
│  │ & Schematics │   │  & Configurators   │   │  (Live SVG + Pricing)   │  │
│  └──────┬───────┘   └─────────┬──────────┘   └────────────┬────────────┘  │
│         │                     └──────────────┬────────────┘               │
│         ▼                                    ▼                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Request Tray & Zod-Validated Customer Form  │  Protected Admin UI  │  │
│  └──────────────────────┬───────────────────────┴──────────┬───────────┘  │
└─────────────────────────┼──────────────────────────────────┼──────────────┘
                          │ HTTP / JSON                      │ HttpOnly Cookie
                          ▼                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER & API LAYER                            │
│                                                                           │
│  Public Routes:                       Protected Admin Routes:             │
│  • GET  /api/catalog                  • POST /api/admin/session           │
│  • GET  /api/config                   • GET  /api/admin/requests          │
│  • POST /api/requests                 • PATCH /api/admin/requests/:id     │
│    ├─ Zod Schema Validation           • PATCH /api/admin/services/:id     │
│    ├─ Anti-Spam Honeypot & Rate Limit • POST/PATCH /api/admin/categories  │
│    └─ Server-Side Price Calculation   • GET  /api/admin/requests/export   │
└─────────────────────────┬──────────────────────────────────┬──────────────┘
                          │                                  │
                          ▼                                  ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 RELATIONAL DATABASE (SQLite + Postgres SQL)               │
│                                                                           │
│  [service_categories] 1──* [services]                                     │
│  [service_requests]   1──* [service_request_items] *──1 [services]        │
│  [service_requests]   1──* [request_internal_notes]                       │
│  [workshop_settings]  (Configurable contact, Metro Manila area & hours)   │
└───────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`service_categories`**: Slug, display name, description, display order, and active toggle.
- **`services`**: Foreign key to category, name, summary, turnaround estimate label, starting price in PHP (`integer`), pricing model (`fixed_starting`, `per_unit`, `custom_quote`, `cable_formula`, `monthly`), active status, and structured configurator key.
- **`service_requests`**: Unique sequential reference (`PAG-2026-00001`), customer full name, contact number, optional email, Metro Manila location/barangay, service method, preferred date, customer notes, server-computed `estimated_total`, workflow `status` (`New` through `Completed`/`Cancelled`), and creation timestamp.
- **`service_request_items`**: Foreign key to request and service, quantity, serialized JSON configuration payload (OS details, Cat5e/Cat6 cable specs, room count, website scope), and server-calculated line estimate.
- **`request_internal_notes`**: Timestamped internal workshop notes linked to each request.

### Interactive Component & State Mapping

- **Catalog & Configurator Flow**: Selecting a category filter or typing in the search bar filters the active catalog immediately. Clicking **Configure** opens the service-specific React Hook Form + Zod schema (Windows Installation, Custom Ethernet Cable, RJ45 Repair, PC Troubleshooting, Network Installation, Website Development, or general notes); submitting validates fields and appends the configured item to the persistent quotation tray state.
- **Cable Builder Flow**: Adjusting category (`Cat5e`/`Cat6`), length (`1–100m`), wiring (`Straight-Through`/`Crossover`), jacket color, connector type, or quantity immediately updates the SVG conductor animation, recalculates the breakdown via the shared pricing rules, and allows one-click addition to the quotation tray.
- **Request Submission & Recovery**: Submitting the customer form triggers `POST /api/requests` with loading lock, field-level Zod errors, server-side rate-limit/honeypot checks, and atomic reference generation. On success, the tray clears and displays the official `PAG-2026-XXXXX` confirmation receipt; on failure, user inputs remain intact with actionable retry messaging.
- **Admin Workflow**: Entering the passcode unlocks the admin session via cookie, fetches requests and catalog records, supports live status updates (`PATCH`), internal note appending, price/availability toggling, category management, and instant RFC-4180 CSV download.
