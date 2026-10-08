# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Furnify's mobile app (Android first, iOS later): Expo SDK 57, Expo Router, TypeScript. It talks to the same Express API as the website. It lives beside the other two repos and copies code from the website, so keep the three as sibling folders:

```
hatim_project/
  Hatim/          website (React + Vite)        - source of locales and business logic
  hatim_Backend/  API (Express + Prisma)        - shared by website and app
  hatim_mobile/   this app
```

## Commands

```bash
npx expo start           # dev server; scan the QR code with Expo Go on the phone
npm run typecheck        # tsc --noEmit
npx expo lint
npx expo install <pkg>   # never plain npm install for a package - picks the SDK-compatible version
npx expo export --platform android --output-dir <tmp>   # full bundle check without a phone
```

The API defaults to the live server (`src/lib/config.ts`). Override with `EXPO_PUBLIC_API_BASE_URL` in `.env.local` (see `.env.example`); a local backend must be addressed by the computer's LAN IP, not `localhost`.

## How auth works (different from the website)

The website uses an httpOnly cookie pair. The app cannot rely on cookies, so:

- Every request sends `X-Client: mobile` (`src/lib/httpClient.ts`). For such requests `/auth/login`, `/auth/verify-otp` and `/auth/refresh-token` return `data.tokens = { accessToken, refreshToken, expiresInMs }` instead of setting cookies (`hatim_Backend/src/app/shared/mobileClient.ts`).
- Tokens live in `expo-secure-store` (`src/lib/tokenStore.ts`), never AsyncStorage.
- The access token goes out as `Authorization: Bearer`. On a 401 the client refreshes once (single-flight, because the server rotates the refresh token) and retries. Only a 401 from the refresh itself signs the user out; a network failure never does.
- Sign-out is local: forget the tokens. `/auth/logout` only clears website cookies.
- If login succeeds but `tokens` is missing, the backend predates the mobile change (`ServerTooOldError`).

Routing is guarded in `src/app/_layout.tsx` with `Stack.Protected` - there are no navigate calls on sign-in or sign-out. Signed out reaches `login`, `verify-otp`, `register*` and `forgot-password`; a fresh sign-in reaches `welcome` (the AuthContext `welcome` flag, never set on a cold start); after that `(app)` plus `business-info` and `soon`, or `locked` for an owner whose subscription is inactive. Registration verifies the emailed code but deliberately does not sign in. The locked screen must not link to buying a plan - store billing rules forbid steering users to outside payment.

Typed routes are off on purpose (`app.json`) and `.expo/types` is excluded from `tsconfig.json`: on Windows the dev server's watcher writes non-route files into `router.d.ts`, so tsc results depended on whether `expo start` happened to be running.

## Code shared with the website

- `src/locales/en.json` and `bn.json` are verbatim copies of `Hatim/src/locales/`, read through `t(key)`; re-copy them when the website changes. The app's own screens do not use them - see Strings below.
- `src/lib/balanceTabs.ts`, `accountLedger.ts` and `profit.ts` are verbatim copies (only import paths differ); `src/lib/balance.ts` and `src/lib/dashboard.ts` are line-for-line lifts of `Hatim/src/pages/Balance.tsx` and `Dashboard.tsx`. Figures must equal the website's - re-copy rather than edit.
- `src/context/LanguageContext.tsx` and `src/lib/account.ts` are ports of the website's LanguageContext and AuthContext rules. Keep them agreeing with the originals.
- When porting more business logic, copy the tested pure modules from `Hatim/src/lib/` rather than rewriting them; `Hatim/src/lib/permissions.ts` must also stay in step with `hatim_Backend/src/app/shared/permissions.ts`.

## Screens and the design

The screens are built pixel-for-pixel from the Figma file "Furnify Mobile App" (a claude.ai Design artifact, 390pt frames). Only these are designed: sign-in, verification and welcome; registration with its verification and success; forgot password; the Dashboard with its period and account sheets; Business Info; the More menu; Balance (Overview, Transfers, Ledger, Wallet); Shareholders (Overview, Invest / Withdraw, Profit withdraw, list); Loans (Overview, Bank / Person, Transactions, Statement); and Expenses (Overview, Transactions). Everything else routes to `/soon` (`ComingSoon`) until it is designed - replace that route with the real screen rather than inventing a design.

The Product List (More menu), the Inventory tab Damage (Overview, Entries with a full-screen Record damage form, Receive, Transactions), Supplier (Overview, Payments, Other income, Suppliers), Purchase (Invoices, Receive, a full-screen New purchase order) the Customers tab (Overview, Due received with a full-screen Receive due form, Ledger, Customers) the Sales tab (Invoices with a full-screen New sale form, Items sold) Employees (Overview, Salary / Bonus, Attendance, Employees) Target & Report (Summary, Yearly, Sales target, Purchase target) and the quick tools (History - the day's activity from `/activity/day`; Calculator - the Cash Counter, kept on the phone in AsyncStorage until cleared) Support (tickets and a ticket's conversation), Marketing (the SMS composer) and Billing & Plan (the owner's plan, SMS balance and payment history; read only) have no Figma frame; they were built from the website's pages in the design language above (same cards, sheets, chips, type and colours) - keep them consistent with it rather than inventing new looks. Lists that can run to thousands of rows (products, stock) are server-paged: `usePagedQuery` + `pagedRows` (`src/services/paged.services.ts`, 40 a page like the website) under `ListScreen` (a virtualised FlatList; loading, error and empty show below a header that stays mounted, so the search box keeps focus). Search boxes go through `useDebouncedValue`. Full-screen forms guard unsaved edits with `useLeaveGuard`; any form that needs a product uses `ProductPickerSheet`. Photos render with `ProductImage` (expo-image, cached; Cloudinary URLs are requested at the drawn size by `sizedImageUrl`), are chosen with `usePickImage` (checks the upload endpoint's JPEG/PNG/WebP/GIF and 5 MB limits first) and are sent by `uploadImage` to `POST /uploads/image`.

What a user may do: `useCan('products.write' | 'products.delete' | 'inventory.adjust')` (`src/lib/permissions.ts` - `hasPermission` copied verbatim from the website, plus each action's role gate and permission from its backend route). Hide what the server would refuse; the server still decides. Deleting a product first calls `GET /products/:id/usage` (added for the app) and refuses one used by any sale or purchase, as the website does.

Each of those More-menu sections is one `SectionShell` (header, section chips, pull to refresh, loading and error) fed by one React Query key per section (`['balance']`, `['shareholders']`, `['loans']`, `['expenses']`). A write goes through the section's `use…Write()` helper, which refetches every other key the same money shows up in - keep those lists complete when adding a section. The loan and expense figures are the website's own rules: `src/lib/loans.ts` is a verbatim copy of `Hatim/src/pages/loans/loanUtils.ts`, `src/lib/expenseTotals.ts` is lifted from `ExpenseDashboard.tsx`, the loan statement comes from the server's `/loans/statement`, supplier balances use `src/lib/purchaseAmounts.ts` (a verbatim copy of the website's) through `supplierSummary.ts` (lifted from `SupplierDashboard.tsx`), purchase lines are priced by `src/lib/purchaseOrder.ts` (lifted from `PurchaseOrders.tsx`) and the order form sends exactly the website's payload (`src/features/purchase/orderForm.ts`; saving as Received then calls receive-all, never writes `received_qty`), and SMS texts (`src/lib/smsTexts.ts`) are word for word the website's. Supplier and Purchase share one query, `['supplier-section']` (`useSupplierData`), so their figures never disagree. Editing a purchase invoice (`/more/purchase/edit/[id]`) is the website's Purchase Ledger edit, lifted into `src/features/purchase/editForm.ts`: there is no single server request, so `saveEditedPurchase` sends only what changed, in the website's order (new lines, changed lines, removed lines, then the header), and a failure part-way is a `PartlySavedError`. A quantity never goes below what has arrived, a line anything arrived on cannot come off, and a line left alone keeps its saved figures; a changed line's SP is re-worked at the invoice's SP %, and the shipping status is re-worked from the new quantities (the website leaves both stale). Every customer figure comes from `src/lib/customerDue.ts`, a verbatim copy of `Hatim/src/pages/customers/customerDashboardData.ts` (check it by running that file's own test against the copy); the Due Received list and the ledger are lifted into `customerReceipts.ts` and `customerLedger.ts`. A due discount lives in the payment's notes as `Discount Amount: Tk 1,500` and is read back from there, so the form always writes it in that English form (`src/features/customers/receiptForm.ts`), and it allows a discount only on a collection into one account, because every reader counts the notes once per payment row.

The Customers and Sales tabs are Stacks under the tab bar (`src/app/(app)/customers/`, `sales/`); their `SectionShell` has no back arrow (`backLabel` omitted), and tapping the tab again returns to its first screen. Sales reads the customer query (`useCustomerData`, which loads every completed sale with its lines, payments and deliveries), so a sale's previous due and a customer's due never disagree. A saved sale's figures are `src/lib/saleFigures.ts` (lifted from `Hatim/src/pages/Sales.tsx`); the sale form's pricing, totals and payment split are `src/features/sales/saleForm.ts` (lifted from its `updateItem` and `save`): one `POST /sales` writes the sale, stock and FIFO cost, then money beyond the invoice is posted as customer payments against the old due. Every sale line must be a catalogue product - `POST /sales` refuses a line without a `product_id`. Editing (`/sales/edit/[id]`) is the same `SaleFormScreen` filled by `formFromSale` (the website's `editSale`) and saved with `PUT /sales/:id`, which rolls the old lines' stock and FIFO cost back, writes the new ones and replaces the sale's payments; the old due is shown but never collected on an edit, and no invoice SMS goes out. Only a sale `saleEditable` accepts (every line a catalogue product, each once) offers Edit. One departure: an edited line keeps what had already been delivered unless marked delivered in full - the website re-saves it as nothing delivered. Sale drafts (Sales tab Drafts chip, `/sales/new?draft=<id>`) are the website's own shape - `src/features/sales/saleDraft.ts` writes and reads `SALE_DRAFT_VERSION` 1 exactly as `Hatim/src/lib/draftPayload.ts` and Sales.tsx's saveAsDraft/openDraft do - so a draft parked on either opens on the other; bump both together if the shape changes. A form opened on a draft keeps the copy it opened (publishing deletes the draft), and only the drafts list is refetched after a draft write.

A salary payment moves no money by itself: balances and profit read expenses, so it needs its expense twin (notes start `SalaryTransaction:<id>`). For `X-Client: mobile` the backend writes both in one transaction (`hatim_Backend/src/app/shared/salaryExpense.ts`) and deletes the twin with the payment; the website still writes it from the browser. `paySalary` (`src/services/employees.services.ts`) books the twin itself the website's way if the server answers without an `expense_id`, so a server that predates the change never leaves a payment that moved no money. Attendance is one row per employee a day (`PUT /attendance` upserts); its time rules are `src/lib/attendance.ts`.

Target & Report: `src/lib/rollingTarget.ts` and `purchaseRollingTarget.ts` are verbatim copies of the website's (its tests pass against them) - the owner's rolling daily target: a finished day locked, today held at its morning figure, the days after sharing what is left; never divide the post-sale remainder by a count that includes today. The Report Summary's figures are `src/lib/reportSummary.ts`, lifted from `ReportSummary.tsx`'s `loadReport` (it reads a product's company from `supplier`, the relation the API returns; the website reads `suppliers` and misfiles those sales as Unassigned). The Yearly report's figures are `src/lib/yearlyReport.ts`, lifted from `YearlyReport.tsx` (same `supplier` reading, and a date's month taken from its text). The website's "Monthly Report" menu item is the Report Summary; its older `/reports/monthly` page is hidden from the menu, so the app has no screen for it. A month holds one sales target (`PUT /monthly-targets` upserts, owner only). The WhatsApp tile reads the support number from `/platform-settings/payment-info` (`useSupportNumber`) and falls back to `src/lib/support.ts`, as the website does. A report mailed to the owner (`emailReport`) goes out with its figures unhidden even while the eye button hides amounts on screen. Support tickets: the website listens on an SSE stream; React Native has no EventSource, so `useMyTickets(true)` refetches every five seconds while a support screen is open, which brings replies and support's `other_typing` mark; the app sends `/support-tickets/:id/typing` at most every three seconds while typing. Marketing sends SMS only: every `/sms/*` route is the owner's, and the app neither sells SMS credits nor points anyone to where they are bought - store billing rules forbid steering users to outside payment, as for the locked screen and Billing. Pieces shared across sections are components: `AccountCard`, `BalanceBox`, `ContactCard`, `DocumentCard` (an invoice in a ledger), `HandoverSheet` (receive or deliver part of a line), `PaymentRowFields` (money across accounts), `TotalsList`, `FigureRow`, `PromptCard`; status colours for in-parts progress are `src/constants/progress.ts`.

Layout: `src/app/` holds routes only; screen parts live in `src/features/<area>/`; shared primitives in `src/components/`; pure logic in `src/lib/`; API calls and React Query hooks in `src/services/`.

## Styling

- Colours: `src/constants/theme.ts` - the `Slate` ramp for the sign-in and registration screens, `Zinc` for everything after sign-in, exactly as the design splits them. No other hex values in screens.
- Text: always `Txt`, never `Text`. It maps `fontWeight` to the right Inter or Hind Siliguri family for the current language, because React Native has no font fallback and no synthetic bold. Inputs set `fontFamily(lang, weight)` themselves.
- Icons: `DesignIcon` holds the design's own 24px paths; prefer it over lucide, whose current release redraws several of the shapes.
- Money: `formatMoney` or `useAmountShield().money` - `Tk 1,234` in English, `৳ ১,২৩৪` (lakh grouping) in Bangla, `****` while the eye button hides amounts.
- Reuse the primitives (Button, TextField, SelectField, DateField, BottomSheet, ChoiceSheet, ItemSheets, Toggle, StatTile, FilterChips, ScreenHeader, the toast) rather than restyling per screen. Light mode only.

## Strings

Each screen keeps its English and Bangla side by side in a `COPY` object (or `src/features/<area>/copy.ts`) read with `useCopy` - typed, so a missing translation fails to compile. Use the design's own Bangla wherever one of its `*Bn` frames shows it.
