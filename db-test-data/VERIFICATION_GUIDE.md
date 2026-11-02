# DeliveryYa — QA Seed Data & Manual Verification Guide

Companion to [`seed_test_data.sql`](./seed_test_data.sql).
Everything below uses the data that script creates, so expected results are
exact (ids, codes, amounts), not "some row".

---

## 0. Setup (do once)

### 0.1 Database
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS deliveryya"
mysql -u root -p deliveryya < ../deliveryya_db_new.sql   # schema + reference/production data
mysql -u root -p deliveryya < seed_test_data.sql          # QA seed (this project)
```
The last command ends with a **self-check table** — all counts must be > 0
(`users 15`, `distinct roles 15`, `new grants 201`, `ghost accesses 7`).
Re-running `seed_test_data.sql` is safe: it deletes only its own rows
(ids 1001+, `created_by='seed'`, accesses 95–101) and re-inserts them.
Permission grants themselves are `INSERT … NOT EXISTS` (no unique key exists
on `access_has_user_roles`, so plain re-inserts would duplicate).

### 0.2 Backend
* Spring Boot 4.0.2, Java 17, runs on **:8080** (`deliveryya-backend`,
  `./mvnw spring-boot:run` or deploy the WAR to a Tomcat).
* Env `UPLOAD_PATH=uploads` — static files are served from
  **`<working-dir>/uploads/**`** under `/uploads/**`.
  Copy the repo root's `uploads/` next to where you start the backend:
  ```bash
  cp -r ../uploads ./uploads     # from deliveryya-backend/  (already contains users/*.jpg and payment-profs/*.pdf used by the seed)
  ```
  The seeded product images / payment proofs point at
  `users/73f3f211-….jpg`, `users/791b8d1d-….jpg` and
  `payment-profs/3d9045f3-….pdf` which live in the repo, so previews work.
* `spring.jpa.hibernate.ddl-auto=update`: on first boot the app may **add**
  extra columns (e.g. camelCase `isActive` drift on a few tables). This is
  harmless for the seed (all users are active in both spellings), but do the
  seeding **before** the first boot, and if you re-seed after heavy app use,
  expect fresh app rows — never delete below id 1000.

### 0.3 Frontend — known build blocker
`src/util/AxiosUtil.ts` **is referenced by ~all API calls but missing from
the repo** (audit finding #1) — the Vite app will not compile without it.
Re-create it with a stub like this (adjust `baseURL` to your backend):

```ts
// deliveryya-front/src/util/AxiosUtil.ts
import axios from 'axios';

export const baseURL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:8080';

const axiosInstance = axios.create({ baseURL, withCredentials: true });

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwtToken'); // key used by the whole app
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosInstance;
```
Then:
```bash
cd ../deliveryya-front && npm install && npm run dev
```
Images/proofs resolve as `${baseURL}/uploads/<stored path>` — that's why
`baseURL` must be the **bare backend origin** (no `/api` suffix).

### 0.4 All 15 logins
Password for **every** account: `DeliveryYa@123`

| id | email | role (`user_roles`) | notable seeded data |
|----|-------|---------------------|---------------------|
| 1001 | superadmin@qa.deliveryya.test | 1 `super admin` | full console |
| 1002 | admin@qa.deliveryya.test | 2 `admin` | full console (was **empty** pre-seed: only had 73/74) |
| 1003 | owner@qa.deliveryya.test | 3 `owner` | full console + 51/53/55 |
| 1004 | manager@qa.deliveryya.test | 4 `manager` | ops console (no 28/29/25…48 gap areas), employee 1002 |
| 1005 | client@qa.deliveryya.test | 5 `client` | owns **Island Mobile Hub** (market 1002), CMO wallet 74,500 |
| 1006 | customer@qa.deliveryya.test | 6 `customer` | buyer of all 3 orders, 2 saved addresses, direct grant 43 |
| 1007 | agent@qa.deliveryya.test | 7 `agent` | employee 1001, agent wallet, jobs AJ-1001/1002 |
| 1008 | marketowner@qa.deliveryya.test | 8 `market owner` | owns **Kaleox Electronics** (market 1001), 4 products, bank 1001, discount 10.5% |
| 1009 | ceo@qa.deliveryya.test | 9 `CEO` | exec views |
| 1010 | secretory@qa.deliveryya.test | 10 `secretory` | career/complaint views |
| 1011 | accounts.manager@qa.deliveryya.test | 11 `accounts maneger` | full wallets (95–99) |
| 1012 | accounts.assistant@qa.deliveryya.test | 12 `account assistant` | wallets except company mgmt |
| 1013 | hr.manager@qa.deliveryya.test | 13 `HR manager` | careers 39, complaints 40 |
| 1014 | hr.assistant@qa.deliveryya.test | 14 `HR assistant` | identical grant set to HR manager (+75–82) |
| 1015 | markets.manager@qa.deliveryya.test | 15 `Markets Manager` | market mgmt + My-Market 41/42 |

> ⚠️ Because DB role names contain spaces/typos (`super admin`, `market
> owner`, `accounts maneger`, and the backend's `SUPPER_ADMIN` typo),
> **only role 2 `admin` matches the hardcoded `ROLE_ADMIN`
> `@PreAuthorize` gates** (`/orders/request-codes`, `/users` staff
> endpoints). Use the **admin account (1002)** for those steps; do not
> report "access denied as super admin" as a data bug — it's code.

---

## 1. The seeded data map (memorize these five)

| Object | id / code | State | Purpose |
|---|---|---|---|
| Order **O1** | 1001, code `ORD-1008-001` | `delivery_status 1` Processing, `payment_status 1` Pending, type 1 COD, total 100,350 + 350 fee = 100,700 | market-checkout order; slip PR-1001 waiting for verification |
| Order **O2** | 1002, code `ORD-1006-001` | `ds 2` Ready to pickup, type 2 Bank, fee not collected, third-party sender GreenX, total 25,000 | manual add-order by staff |
| Order **O3** | 1003, code `ORD-1005-001` | `ds 7` Delivered by agent, `payment_status 4` Paid By Agent, 74,500+350=74,850 paid | full lifecycle, wallet money story done |
| Payment record **PR-1001** | unverified slip 100,700 | verification 3 Unverified | drives Accounts verify-flow |
| Payment record **PR-1002** | verified handover 74,850 | verification 1, category 8 HANDOVER | explains company wallet = 74,850 |

Spare order codes ready to use: `ORD-1008-002`, `ORD-1008-003` (market
owner 1008), `ORD-1006-002`, `ORD-1006-003` (customer 1006),
`ORD-1005-002` (client 1005). A code's `order_codes.field` bit =
1 means consumed/locked.

Wallets: agent 1007 → **0.00** (handed over), company → **74,850.00**
(stored on the existing dump row `company_wallet.id=1` — the seed updates
it instead of inserting, because a second active row breaks the wallet),
client/market-owner 1005 → **74,500.00**, market-owner 1008 → **0.00**
(credit lands when PR-1001 is verified).

Markets: 1001 **Kaleox Electronics** (active, 4 products), 1002 **Island
Mobile Hub** (active), 1003 **Pending Seller Demo** (inactive — approval
test). Stock quirks: 1005 Grey powerbank qty **5** (low-stock),
1006 Navy variant **hidden=1**.

---

## 2. Permissions — what the seed changed and how to verify

**Problem found while reviewing:** the shipped `access_has_user_roles`
seed had 201 holes (admin=only 2 rows, agent had no Dashboard/Placed-Orders,
manager had no storefront, wallets impossible to grant) and the frontend
guards ids **95–101** that did not exist in `access` at all ("ghost"
ids). `seed_test_data.sql` §1–2 defines them and backfills per the matrix
in the SQL comments.

**Verify grants with SQL:**
```sql
-- every role should now have grants, none should be 0 except by design
SELECT r.id, r.name, COUNT(x.access_id) AS grants
FROM user_roles r LEFT JOIN access_has_user_roles x ON x.user_roles_id = r.id
GROUP BY r.id ORDER BY r.id;
-- ghost accesses now defined & granted:
SELECT a.id, a.name, GROUP_CONCAT(a.user_roles_id ORDER BY a.user_roles_id) roles
FROM access_has_user_roles a WHERE a.id BETWEEN 95 AND 101 GROUP BY a.id;
```
**Expected totals after the seed** (original dump grants + added):
roles 1/2/3 = **65** each, 4 = **53**, 5 = **14**, 6 = **13**, 7 = **23**,
8 = **30**, 9/10 = **28**, 11 = **31**, 12 = **28**, 13/14 = **22**,
15 = **28**. (201 rows carry `created_by='seed'`.)

**Console** lives under `/deliverYya-cloud-console/*`; each sub-route is
RoleGuard-gated by access id (App.tsx): Dashboard 25, Add Orders 27, Placed
Orders 26, Accounts 36|54|55, Discounts 25 (same gate), Bank Details 49,
Employee Assignments 33, Access Mgmt 48, Verify Users 29, Manage Users 28,
Order-code Requests 32, Agent Jobs 33, Urgent Jobs 34, Payment Handover 35,
Delivery Fees 37, Analytics 38, Markets Directory 30, Market Requests 56,
My-Market Products 41, My-Market Cat&Brand 42, Complaints 40.
(FE ids 83–94 exist in `access` but no UI checks them — the per-status
delivery views are name-based in `DeliveryStatusCatalog.tsx`; no grants
needed.)

---

## 3. Flows — step by step

Each flow = **who logs in → clicks what → what must be visible → SQL
cross-check**. Do them in order; later flows assume earlier ones only in
that O1 stays unpaid until flow F7.

### F1 · Login & access smoke (all 15)
1. Log in with each account (§0.4) at the app root.
2. Open the console (`/deliverYya-cloud-console/dashboard`) with:
   superadmin, admin, owner, manager, accounts.manager, market-owner, agent.
3. **Expected:** menu items match §2 (e.g. agent sees Dashboard/Placed
   Orders/Accounts/Agent-Jobs, NOT Manage Users; assistant accountant sees
   Accounts but no Company-Wallet management).
4. **Before/after demo:** re-run F1 with the grants deleted
   (`DELETE FROM access_has_user_roles WHERE created_by='seed'`) — admin's
   console collapses to two pages. Re-apply the seed afterwards.

### F2 · Public store browsing (logout or customer)
1. Markets directory → **Kaleox Electronics** must appear (only active
   markets are listed; `Pending Seller Demo` must NOT appear).
2. Open product `SampathTel X5 128GB` → image loads from `/uploads`,
   rating shows 5 (and 4 for LM-7 on the other market).
3. Variant picker: X5 shows Black/White; **Navy PowerBank variant must not
   be offered** (hidden=1); Grey PowerBank shows low qty 5.
4. SQL: `SELECT s.id,s.qty,s.hidden FROM stock s WHERE s.id IN (1005,1006);`

### F3 · Signup + Become-Seller request (new tester account)
1. Register `tester@qa.deliveryya.test` (role is fixed to customer).
2. Submit a "Become Seller" request (market-request form; customer 1006
   already has one pending as a visible example — id 1001).
3. Admin console → **User Request Management** (73) → approve 1006's
   request → expect role flip to `market owner` (8), `has_market=1`,
   auto-created/inactive market row.
4. ⚠️ Known app bugs around here: forgot-password flow is broken (audit),
   and **deactivating a market** via console also forces the owner's role to
   id 8 (`updateMarketStatusInfo` bug) — verify carefully, don't confuse
   with seed data.
5. SQL: `SELECT id,user_role_id,has_market FROM users WHERE id IN (1006);`
   `SELECT * FROM markets WHERE id=1003;`

### F4 · Add order via market checkout (the main order-creation flow)
Actor: **customer 1006**.
1. Store page of **Kaleox Electronics** → *SampathTel X5* → color **Black**
   (stock 1001, qty 49) → add to cart → add *GamiTech AirBuds Pro*
   (stock 1003, 199 pcs) → cart total 100,350.
2. Checkout (access 45/77): pick saved address **Office — WTC, Colombo 01
   (city 1)** → delivery fee must preview **350** (from `delivery_fees`
   city 1; total weight 0.25 kg ≤ 1 kg so no surcharge). Switching to
   **Home — Slave Island (city 2)** should preview **400** — that's the
   fee-lookup working; our seeded O1/O3 are priced on city 1 (350 each).
   Coupon box: ⚠️ coupon is *never applied* (stub returns 0.0 — audit bug),
   don't count as data issue.
3. Payment method **COD** → submit.
4. **Expected:** new order row; stock decrements (49→48, 199→198); a new
   `order_codes` row for seller 1008 with `field=1` (auto-created code);
   notification lands for 1008.
5. SQL:
```sql
SELECT o.id,o.total_price,o.delivery_fee,o.collective_price,o.payment_status_id,o.delivery_status_id
FROM orders o ORDER BY o.id DESC LIMIT 3;
SELECT id,qty FROM stock WHERE id IN (1001,1003);
SELECT code,field,users_id FROM order_codes ORDER BY id DESC LIMIT 2;
```
6. Log in as **market owner 1008** → My-Market orders/receiving shows the
   order (gate 46 Receiving).

### F5 · Manual "Add Order" (staff wizard) — the second order path
Actor: **admin 1002** (role-name workaround §0.4).
1. Console → **Add Orders** (27).
2. Enter customer order code **`ORD-1006-002`** (spare, owner 1006) →
   form auto-fills sender; weight 3.2 kg, city 2 → fee = 400 + 150×ceil(3.2−1)…
   (fee formula: base + additional per kg over 1; check the preview value).
3. Mark **third-party sender** (GreenX, id 1001) + *don't collect delivery
   fee* → submit.
4. **Expected:** order with `market_orders_id NULL`,
   `dontCollectDeliveryFeeFromCustomer=1`, code `ORD-1006-002` flipped
   `field=1`; appears in **Placed Orders** (26) with sending-user filter
   (access 100 — the ghost id we created; filter must render for admin).
5. SQL: `SELECT o.id,o.order_codes_id,o.market_orders_id,o.dontCollectDeliveryFeeFromCustomer,
   o.third_party_senders_id FROM orders o ORDER BY o.id DESC LIMIT 1;`
   `SELECT code,field FROM order_codes WHERE code='ORD-1006-002';`

### F6 · Order-code request → generation → print
Actor: **market owner 1008** + **admin 1002**.
1. As 1008 use the *request order codes* UI (console gate 32/56; if blocked
   by the `SUPPER_ADMIN` role gate on `/orders/request-codes`, submit via
   the open `/set-order-code-request` endpoint — that's the known code bug,
   not data). Request row 1001 (qty 5, unprocessed) already exists.
2. As 1002 console → **Ordercode Requests** → generate → expect 5 new
   `order_codes` rows with `users_id=1008`, `field=0`, request marked
   `is_generated=1`; print/PDF (Bracodes flag left 0).
3. SQL: `SELECT COUNT(*) FROM order_codes WHERE order_code_request=1001;` → 5.

### F7 · Payment slip → verification → wallet credit
Actors: **customer 1006**, **accounts.manager 1011**.
1. On O1 (`ORD-1008-001`, due **100,700**) the customer submits a bank
   transfer slip (Uploads tab uses Cloudinary env vars from `vite.config` —
   offline, use an existing slip row instead: PR-1001 is pre-seeded
   *Unverified*).
2. 1011 (or 1002) → console **Accounts** (36) → pending list shows
   **PR-1001 = 100,700, proof PDF opens** (`/uploads/payment-profs/3d9045f3-…pdf`).
3. Approve/verify → expected: `payment_records.verification_status_id` 3→1,
   order O1 `payment_status_id` 1→2 (Completed),
   company wallet +100,700 (74,850 → **175,550** on row id 1),
   market-owner 1008 CMO wallet 0 → **100,350** (net of fee).
4. ⚠️ Do **NOT** try to create a second wallet row / "reset" a wallet — the
   2-active-rows bug 500s every later operation (see §4).
5. SQL:
```sql
SELECT id,verification_status_id FROM payment_records WHERE id=1001;
SELECT payment_status_id FROM orders WHERE id=1001;
SELECT balance FROM company_wallet WHERE id=1;                 -- 175,550.00 expected
SELECT balance FROM client_market_owner_wallet WHERE user_id=1008; -- 100,350.00 expected
```

### F8 · Agent job end-to-end (accept → on-hand → deliver → handover)
Actor: **agent 1007**.
1. Agent console (25) → **Agent Jobs / Employee Assignments** (33):
   AJ-1001 (UJC-9001, **not accepted**) and AJ-1002 (accepted, with 1
   sub-task "Scan QR at GamiTech warehouse").
2. Accept AJ-1001 → `accepted` flips; complete its task from
   `urgent_job_items` (status transitions 1→… job_status 2/3…).
3. **On-Hand** page (58) shows nothing yet; in **Order Checkout** (45) /
   delivery flow, mark **O2 (`ORD-1006-001`, Ready to pickup)**:
   pick up → status 3? per `delivery_status` names: pick "Accepted/On the
   way (5)" → deliver → status 7 *Delivered By Agent*.
4. Each transition must write a `deliveries` row (employee 1001).
5. COD handover (if collecting cash: 25,000 for O2 — our O2 is Bank +
   don't-collect, so use the seeded O3 story instead): Accounts →
   **Agent Pay Handover** (35) creates payment record type 4/Cash →
   verified → agent wallet stays consistent. PR-1002 already demonstrates
   a completed handover (74,850; agent wallet 0 after it).
6. SQL:
```sql
SELECT accepted,is_complete FROM agent_jobs WHERE id=1001;   -- expect 1 / progresses
SELECT d.id,d.delivery_status_id,d.employees_id FROM deliveries d
JOIN orders o ON o.id=d.orders_id WHERE o.order_codes_id=1004 ORDER BY d.id DESC;
SELECT balance,is_active FROM agent_wallet WHERE agent_id=1007; -- 0.00, still ONE active row
```

### F9 · Urgent job (public form → verify → assign)
1. Public **urgent-job** page (access 78): create job (any pickup/drop, city
   1) → row `verification_status 4` New.
2. Admin console → **Urgent Jobs** (34) → verify (1) → assign to employee
   1001 → agent sees it under 33 like AJ-1001 (which is seeded
   `job_status 1` + items `Colombo Fort 09:00 → Negombo 12:30`).
3. SQL: `SELECT * FROM urgent_jobs ORDER BY id DESC LIMIT 2;`

### F10 · Pickup request
1. **Customer 1006** → request pickup (seeded row 1001 exists unaccepted:
   "Extra charger boxes… tomorrow 9 AM").
2. Staff (57 Pickup Assign) assigns; agent accepts → `is_accepted=1`;
   completes → `is_completed=1`.
3. SQL: `SELECT is_accepted,is_completed FROM pickup_requests WHERE id=1001;`

### F11 · Market-owner self-service (1008)
1. **My Market Products** (41): list shows 4 seeded products (active
   flag), image previews load. Add a product → it appears with
   `is_active=0` unless toggled — ⚠️ known default-0 gotcha (audit):
   freshly added products stay invisible until active; that is *the test*.
2. **Stock**: toggle *Navy* variant hidden↔shown (1006) — public picker
   (F2.3) must flip immediately; edit price of 1005 → store shows new
   `showing_price`.
3. **Categories & Brands** (42): add category, delete a brand with products
   → expect block (FK) or force-delete preview
   (`/preview-force-delete-*`).
4. **Bank details** (49): seeded row 1001 (BOC …7890) visible; edit OK.
5. **Discounts**: 10.5% on city 1 — checkout to a Colombo-city address as a
   1008-market buyer should show it in staff add-order flows.
6. SQL: `SELECT id,hidden FROM stock WHERE id=1006;` etc.

### F12 · Complaints
1. **Customer 1006** → complain on **O1** (`ORD-1008-001`): seeded row 1001
   shows under My Complaints (47), status 1 Pending, type 2.
2. Admin/secretory (40) → respond → `is_solve`/status updates; customer
   sees status change.
3. SQL: `SELECT is_solve,complain_status_id FROM complains WHERE id=1001;`

### F13 · Feedbacks & ratings
1. Post rating on product 1001 as 1006 (feedback rows 1001 = 5★, 1002 = 4★
   already on 1003) → average on the store card updates.

### F14 · Notifications
1. Bell for **1008** ("New order received"), **1006** ("Order delivered"),
   **1007** ("New agent job assigned"), **1002** ("Payment verification
   pending") — all unread (is_read=0). SSE live push on new orders works if
   logged in during F4.
2. Read-marking flips `is_read` (43/70 both fine).

### F15 · Track order (public)
1. Public track page (79) with **`ORD-1005-001`** → timeline of 3
   `deliveries` rows (Picked → On the way → Delivered) for O3 must render
   even while logged out.

### F16 · Access management console (48)
1. Owner 1003 → console **Access Mgmt**: grant access *43 (Request for
   Market)* to any user with expiry — mirrors seeded direct grant
   `user_has_access(1001)` for 1006 (exp 2027-12-31).
2. ⚠️ Never save with empty expiry via SQL (NPE bug `setUser`); the UI form
   is fine.
3. SQL: `SELECT * FROM user_has_access WHERE users_id=1006;`

### F17 · Verify-users console (29)
1. As owner/admin → **Verify Users** → user **1008** has 2 docs: one
   `Verification in progress` (NIC front, id 1003) and one `New` (1004).
   Approve → `verification_data.status`=1, user 1008 `verification_status`
   updates. Agent 1007's docs are already verified (control group).
2. ⚠️ Self-verify endpoint is open (audit security finding) — don't
   "fix" data through it during QA.

### F18 · Analytics / delivery fees / markets directory
1. **Order Analytics** (38): filter by sending user (ghost access 101 — the
   filter control must be visible to admin/manager/owner; totals include
   O1–O3: 100,700 + 25,550 + 74,850 collective).
2. **Delivery Fees mgmt** (37): rows 1001–1003 (350/400/380 base,
   100/150/120 additional) editable; public fee preview
   `/get-delivery-fee-by-city-id?cityId=2` → 400.
3. **Markets Directory** (30): 2 active markets; toggle 1003 active —
   remember the role-forcing bug (F3.4).

---

## 4. Known app defects that LOOK like seed problems

| # | Symptom | Reality |
|---|---------|---------|
| 1 | Frontend won't build | `src/util/AxiosUtil.ts` missing — restore per §0.3 |
| 2 | 403 as super admin on `/orders/request-codes`, `/users/*` staff calls | hardcoded `ROLE_ADMIN` / typo `SUPPER_ADMIN`; use **admin 1002** |
| 3 | Wallet page 500 after adding 2nd wallet row | `findByIsActiveTrue` (Optional) breaks with >1 active row — keep one |
| 4 | Coupon never reduces total | stub always 0.0 |
| 5 | Product added via app invisible | `is_active` defaults 0 (seed rows are 1) |
| 6 | Market-owner deactivation changes their role | `updateMarketStatusInfo` sets role 8 in both branches |
| 7 | iOS push registration crash | `access_tokens.token_type 3` + gender double-FK — seed only uses 1/2 |
| 8 | Overselling stock in parallel test runs | no locking on decrement — run order flows serially |
| 9 | Forgot-password email flow dead | reset link/token flow broken (audit) — skip until fixed |
| 10 | Concurrency: same code usable twice quickly | `order_codes.field` flag isn't locked — single-user tests fine |

---

## 5. Appendix

### A. Full cross-check (run any time; compare to expected in §1)
```sql
SELECT 'users' k, COUNT(*) n FROM users WHERE id BETWEEN 1001 AND 1015
UNION ALL SELECT 'roles', COUNT(DISTINCT user_role_id) FROM users WHERE id BETWEEN 1001 AND 1015
UNION ALL SELECT 'grants added', COUNT(*) FROM access_has_user_roles WHERE created_by='seed'
UNION ALL SELECT 'markets', COUNT(*) FROM markets WHERE id BETWEEN 1001 AND 1099
UNION ALL SELECT 'products', COUNT(*) FROM products WHERE id BETWEEN 1001 AND 1099
UNION ALL SELECT 'stock', COUNT(*) FROM stock WHERE id BETWEEN 1001 AND 1099
UNION ALL SELECT 'orders', COUNT(*) FROM orders WHERE id BETWEEN 1001 AND 1099
UNION ALL SELECT 'codes used (3)', COUNT(*) FROM order_codes WHERE `field`=b'1' AND id BETWEEN 1001 AND 1099
UNION ALL SELECT 'payment_records', COUNT(*) FROM payment_records WHERE id BETWEEN 1001 AND 1099
UNION ALL SELECT 'wallets (4)', (SELECT COUNT(*) FROM agent_wallet WHERE id BETWEEN 1001 AND 1099)
       + (SELECT COUNT(*) FROM client_market_owner_wallet WHERE id BETWEEN 1001 AND 1099)
       + (SELECT COUNT(*) FROM company_wallet WHERE ref='SEED:COMPANY')
UNION ALL SELECT 'deliveries on O3 (3)', COUNT(*) FROM deliveries WHERE order_id=1003
UNION ALL SELECT 'urgent_jobs', COUNT(*) FROM urgent_jobs WHERE id BETWEEN 1001 AND 1099
UNION ALL SELECT 'agent_jobs', COUNT(*) FROM agent_jobs WHERE id BETWEEN 1001 AND 1099
UNION ALL SELECT 'complains/feedback/notifications/requests',
  (SELECT COUNT(*) FROM complains)+(SELECT COUNT(*) FROM feedbacks)
  +(SELECT COUNT(*) FROM notifications)+(SELECT COUNT(*) FROM user_requests);
-- invariant: exactly one ACTIVE wallet row per owner
SELECT agent_id, SUM(is_active) a FROM agent_wallet GROUP BY agent_id HAVING a>1
UNION ALL
SELECT user_id, SUM(is_active) FROM client_market_owner_wallet GROUP BY user_id HAVING SUM(is_active)>1;
```

### B. Table coverage
**Seeded by `seed_test_data.sql`** (business tables): users, user_data,
user_has_access, markets, category, brands, sizes, products, product_images,
stock, delivery_fees, discount, employees, vehicle, bank_details,
third_party_senders, order_code_requests, order_codes, market_orders,
market_order_items, orders, delivery_to, deliveries, delivery_details,
payment_records, payment_record_items, payment_recode (legacy), agent_wallet,
company_wallet, client_market_owner_wallet, urgent_jobs, urgent_job_items,
agent_jobs, agent_job_tasks, pickup_requests, complains, feedbacks,
notifications, user_requests, verification_data, access_tokens + `access`
(only the 7 undefined ghost ids) + `access_has_user_roles`.

**Deliberately untouched:** reference/lookup tables (`*_status`, `*_type(s)`,
access_level, access_types, market_category, cities, district, gender,
branches, bank, unit, doc_type, payment_categories, job_status,
complain_type/status, verification_status, token_type, vehicle_type,
user_roles, user_request_types, market orders-adjacent) — already complete
in the dump; API-layer tables (`apis`, `api_methods`, `api_features`,
`access_has_apis`) — not consumed by any UI flow; `agent_job_completion` —
table doesn't exist in the dump (created by the app at first completion;
the seed handles it dynamically in cleanup); `log` — unmapped by the backend.

**Created by the app during flows** (deliberately not pre-seeded): extra
`deliveries` rows for new status transitions, auto-created `order_codes`
when a market order is placed (F4 — note `order_codes` has **no** `order_id`
column; the order→code link lives on `orders.order_codes_id` and the
"used" marker is `order_codes.field`), `agent_job_completion` rows, new
`notifications`.

### C. Applying on top of the attached copy of the dump
The uploaded `deliveryya_db_new.sql` is content-identical to the repo copy
(CRLF line endings only) — the seed applies to either import unchanged.
