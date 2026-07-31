# ClaimPilot AI - Frontend

This is the frontend for **ClaimPilot AI**, the product name for this project's
AI-driven expense reimbursement automation system.

**Important context:** the real work - receipt extraction, policy validation,
duplicate/anomaly detection, and approval routing - is a fully built and tested
Python pipeline that lives one directory up (`../src/extraction`,
`../src/validation`, `../src/anomaly`, `../src/workflow`, plus the multi-agent
signing extension in `../src/agent` and `../src/agents`). That pipeline
actually ran against 12 seeded receipts and produced real output
(`../data/final_decisions.json`).

This React app is a **demo layer on top of that real output**. It renders the
actual 12 processed claims, the actual employee roster, and the actual policy
rulebook values everywhere it can - but it also adds an interactive frontend
(login, receipt upload, a chatbot, a personalized dashboard) that has no
server behind it. See "What's real vs. simulated" below for the exact line.

## Getting started

```
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

```
npm run build   # production build into dist/
npm run preview # serve the production build locally
```

## Routes

| Route             | Auth required? | What it is                                                                 |
| ------------------ | --------------- | --------------------------------------------------------------------------- |
| `/`                | No              | Marketing landing page (hero, how-it-works, features, security, FAQ, etc.) |
| `/login`           | No              | Employee ID + official email login (no password)                          |
| `/register`        | No              | Self-service demo registration                                            |
| `/live-demo`       | No              | Public aggregate view of all 12 real claims - the one-click "watch the demo" |
| `/dashboard`       | Yes             | Personalized dashboard, scoped to the logged-in employee's own claims     |
| `/upload-receipt`  | Yes             | Upload a receipt PDF, see a simulated extraction result                   |

"Auth required" redirects to `/login` if there's no session - see
`src/utils/session.js`. It's a demo gate, not real security (more below).

## Project structure

```
src/
  pages/          One component per route (see table above)
  layouts/        MainLayout (marketing pages) and DashboardLayout (authenticated pages)
  components/     Reusable UI: cards, charts, tables, the chat widget, modals
  data/           Static content - some is real project data, some is copy/config (see below)
  hooks/          Thin wrappers around data/session access (useClaims, useCurrentUser, useTheme, ...)
  utils/          localStorage-backed helpers (session, demo users, session-uploaded claims, theme)
  styles/         Single global.css - CSS custom properties for the dark/light theme, then per-component rules
```

## Real data vs. demo/config content in `src/data/`

| File                     | Source                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `claims.json`            | Converted from the real `../data/final_decisions.json` (Phase 5 output), with `is_duplicate`/`is_outlier`/`duplicate_of`/`outlier_ratio` merged in from the real `../data/risk_scored_transactions.json` (Phase 4 output). All 12 records, unmodified otherwise. |
| `employees.json`         | Converted from the real `../data/employee_roster.csv`.                                    |
| `policySummary.js`       | Hand-copied from the real `../data/policy_rulebook.json` values (meal/lodging/mileage/etc. caps) - kept in sync manually, not auto-generated. |
| `chatbotResponses.js`    | Chatbot Q&A dataset; every policy figure it states matches `policy_rulebook.json`, everything else is written copy. |
| `security.js`, `integrations.js`, `features.js`, `faq.js`, `workflow.js`, `businessImpact.js` | Marketing/product copy - accurately describes real project capabilities, but the text itself isn't pulled from a data file. |

## Feature list

- **Marketing landing page** - hero, animated "How ClaimPilot AI Works" timeline (mirrors the real Phase 2-5 flow), 7 feature cards, business-impact KPI counters, security/integrations sections, FAQ accordion, contact section.
- **Floating AI chatbot** - keyword-matched against a 59+ entry local dataset, grounded in the real policy rulebook. No API calls.
- **Login / Register** - Employee ID + official email only, no password. Login validates against the real employee roster (or a session-registered demo account).
- **Upload Receipt** - drag-and-drop or file picker (PDF), simulated "AI processing" animation, mock extraction result, added to the employee's claims for the rest of the session.
- **Personalized Dashboard** (`/dashboard`) - welcome/profile cards, quick actions, KPI cards and most charts scoped to the logged-in employee's own claims, company-wide charts (department spending) for comparison, notifications, recent activity, an expense-policy modal, dark/light theme toggle.
- **Live Demo** (`/live-demo`) - the original public, no-login aggregate view of all 12 real claims, category spend, and routing outcomes.

## What's real vs. simulated

**Real and grounded in this project's actual backend output:**
- The 12 claims shown everywhere (Live Demo, Dashboard, charts) - actual Phase 5 output, not placeholder numbers.
- The employee roster used for login/lookup.
- Every dollar figure the chatbot and the Expense Policy modal state (meal/lodging/mileage/per-diem/office-supply caps, submission window).
- The is-duplicate / is-outlier flags used in the Fraud & Anomaly chart - real Phase 4 output.

**Simulated for this demo (no server exists):**
- **Receipt extraction** on Upload Receipt - there's no OCR or model call; a small pool of realistic vendor/category/amount combinations is picked to simulate a result.
- **Authentication** - Login/Register check identity against static JSON + localStorage, not a real auth backend. No passwords, no real sessions/tokens.
- **Persistence** - new registrations and uploaded claims live in the browser's localStorage only (see `src/utils/demoUsers.js` and `src/utils/sessionClaims.js`). Clearing browser storage clears them; nothing is sent to a server.
- **The chatbot** - local keyword matching, not a live LLM call.
- **Contact form** - shows a success state locally; nothing is actually sent.
- **Travel Coupons / Hotel Offers** - explicitly labeled illustrative, not live inventory.
- **Business Impact percentages** (90% faster, etc.) - framed as architecture targets, not measured production metrics.
