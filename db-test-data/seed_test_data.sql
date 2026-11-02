-- ============================================================================
--  DeliveryYa — QA / Manual-Testing Seed Script
--  Target : MySQL 8.x, database `deliveryya` (schema = deliveryya_db_new.sql)
--  Apply  : mysql -u root -p deliveryya < seed_test_data.sql
--
--  WHAT THIS SCRIPT DOES
--   * Seeds realistic business data across ALL functional tables (users,
--     markets, catalog, stock, orders, payments, wallets, agents, jobs,
--     support ...) — reference / status / type tables are NOT modified
--     (they already ship seeded with the schema dump).
--   * Creates one test user for EVERY role in `user_roles` (1..15), all
--     sharing the password:  DeliveryYa@123
--   * Completes the role→access matrix: the shipped seed left 201 gaps
--     (e.g. role 2 'admin' had ONLY ids 73/74; role 7 'agent' had no
--     Dashboard/Placed-Orders) and NEVER defined the "ghost" accesses
--     95..101 that the frontend guards (FrontendAccess.ts / App.tsx /
--     Accounts.tsx / PlacedOrders.tsx / Agent&CompanyWallet.tsx). Without
--     ids 95..101 being defined, no role can ever see those pages.
--
--  CONVENTIONS (why it looks the way it does)
--   * Physical column names below follow the DUMP (e.g. markets.name,
--     stock.qty/wpu, delivery_to.cites_id) — several differ from the JPA
--     entity property names in the backend.
--   * All seeded rows use fixed ids 1001+ so they can never collide with
--     dump data (max ids <1000) nor with what the live app allocates later.
--   * The permission inserts are idempotent (INSERT..SELECT..NOT EXISTS —
--     `access_has_user_roles` has NO unique key, so naive re-runs would
--     duplicate). `created_by='seed'` marks them for cleanup.
--   * Business rows are recreated fresh each run by the ACTIVE CLEANUP
--     block (it deletes ONLY ids in our 1001+ ranges / 'seed'-marked rows;
--     it never touches production-dump rows).
--
--  KNOWNS THAT SHAPED THIS DATA (see VERIFICATION_GUIDE.md for details):
--   - access_tokens: only token_type 1(web)/2(android) — type 3 (iOS) hits
--     a double gender-FK bug in the backend.
--   - Wallets: keep EXACTLY ONE is_active=1 row per owner — the repository
--     uses findByIsActiveTrue(Optional): a 2nd active row 500s every wallet
--     operation. Do not "deactivate + create" wallets in QA until fixed.
--   - `expiry_date`/`exp` on user_has_access must NEVER be NULL (NPE in
--     AuthController.setUser) — ours is 2027-12-31.
--   - products.is_active / stock.is_active default 0 → set explicitly.
--   - markets.is_active must be 1 or the store is invisible publicly.
-- ============================================================================

SET NAMES utf8mb4;
SET @now := NOW(6);
-- bcrypt hash for password: DeliveryYa@123 (round-trip verified)
SET @pw  := '$2a$10$Qt7z3zhgTWd.LsmWQxYnw.TK2IM3gEMdcM68DvPFlKA.aUYmvYRQK';

-- ----------------------------------------------------------------------------
-- ACTIVE CLEANUP (FK-safe order: children → parents)
-- ----------------------------------------------------------------------------
DELETE FROM `payment_record_items`            WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `payment_recode`                  WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `payment_records`                 WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `agent_wallet`                    WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `company_wallet`                  WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `client_market_owner_wallet`      WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `deliveries`                      WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `delivery_details`                WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `market_order_items`              WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `market_orders`                   WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `complains`                       WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `delivery_to`                     WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `orders`                          WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `order_codes`                     WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `order_code_requests`             WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `third_party_senders`             WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `feedbacks`                       WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `product_images`                  WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `stock`                           WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `products`                        WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `sizes`                           WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `category`                        WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `brands`                          WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `discount`                        WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `bank_details`                    WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `markets`                         WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `pickup_requests`                 WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `agent_job_tasks`                 WHERE `id` BETWEEN 1001 AND 1099;
-- `agent_job_completion` only exists if the running app has already created
-- it (ddl-auto=update); guard dynamically so a fresh-dump import doesn't fail:
SET @has := (SELECT COUNT(*) FROM information_schema.tables
             WHERE `table_schema`=DATABASE() AND `table_name`='agent_job_completion');
SET @s := IF(@has, 'DELETE FROM `agent_job_completion` WHERE `id` BETWEEN 1001 AND 1099', 'SELECT 1');
PREPARE clean FROM @s; EXECUTE clean; DEALLOCATE PREPARE clean;
DELETE FROM `agent_jobs`                      WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `urgent_job_items`                WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `urgent_jobs`                     WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `vehicle`                         WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `employees`                       WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `notifications`                   WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `user_requests`                   WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `verification_data`               WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `access_tokens`                   WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `user_has_access`                 WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `delivery_fees`                   WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `user_data`                       WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `users`                           WHERE `id` BETWEEN 1001 AND 1099;
DELETE FROM `access_has_user_roles`           WHERE `created_by` = 'seed';
DELETE FROM `access`                          WHERE `id` BETWEEN 95 AND 101;
-- revert our marker-edit on the EXISTING company wallet singleton (row 1
-- shipped active in the dump; a 2nd active row would break it — see §8):
UPDATE `company_wallet` SET `balance`=0.00, `note`=NULL, `ref`=NULL,
       `payment_category_id`=NULL, `payment_status_id`=NULL
 WHERE `id`=1 AND `ref`='SEED:COMPANY';

-- ----------------------------------------------------------------------------
-- SECTION 1 — GHOST ACCESS DEFINITIONS (ids 95..101) — referenced by the
-- frontend but absent from the shipped seed. (access_types: 15=order,
-- 17=report, 21=payment; access_levels: 1=Top, 2=Mid, 3=Low.)
-- ----------------------------------------------------------------------------
INSERT INTO `access` (`id`,`name`,`desc`,`access_level_id`,`access_type_id`) VALUES
  ( 95,'Payment Record Direction',        'Direction (to/from) control on payment records',2,21),
  ( 96,'Agent Wallet',                    'View & manage agent wallets',2,21),
  ( 97,'Client Market Owner Wallet',      'View & manage client/market-owner wallets',2,21),
  ( 98,'Company Wallet',                  'Company wallet ledger',1,21),
  ( 99,'Wallet Management',               'Create/reset wallet entries',1,21),
  (100,'Placed Orders Sending User Filter','Filter placed orders by sending user',2,15),
  (101,'Order Analytics Sending User Filter','Filter analytics by sending user',2,17)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `desc`=VALUES(`desc`);

-- ----------------------------------------------------------------------------
-- SECTION 2 — ROLE → ACCESS GRANTS (only the missing ones; idempotent)
-- Target matrix is documented in VERIFICATION_GUIDE.md §2.
-- ----------------------------------------------------------------------------
-- role 1 super admin +25..: missing 41,42,43,48,51,53,55,70-74,75-82,95-101
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 1, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (41,42,43,48,51,53,55,70,71,72,73,74,75,76,77,78,79,80,81,82,95,96,97,98,99,100,101)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=1);
-- role 2 admin (had ONLY 73,74 before) → full operator parity with roles 1/3
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 2, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,75,76,77,78,79,80,81,82,95,96,97,98,99,100,101)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=2);
-- role 3 owner: +51,53,55 (own-market side views) +wallets/filters
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 3, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (51,53,55,95,96,97,98,99,100,101)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=3);
-- role 4 manager: +storefront +wallet/filters (keeps ops set, no user mgmt 28/29)
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 4, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (75,76,77,78,79,80,81,82,95,96,97,98,99,100,101)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=4);
-- role 5 client: +43 request-market, 44 profile, 71/72 own requests, 97 CMO wallet
-- (client 1005 owns market 'Island Mobile Hub', so their wallet page must be visible)
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 5, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (43,44,71,72,97)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=5);
-- role 6 customer: +43,71,72
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 6, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (43,71,72)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=6);
-- role 7 agent: +25 Dashboard,26 PlacedOrders,36 Accounts,96 AgentWallet
--   (pre-seed agents logged into an EMPTY dashboard — visible bug demo)
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 7, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (25,26,36,96)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=7);
-- role 8 market owner: +71,72 own requests,97 own wallet
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 8, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (71,72,97)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=8);
-- roles 9 CEO / 10 secretory: +26,75..82
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 9, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (26,75,76,77,78,79,80,81,82)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=9);
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 10, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (26,75,76,77,78,79,80,81,82)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=10);
-- role 11 accounts manager: +26,75..82,95..99 (full payment ops)
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 11, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (26,75,76,77,78,79,80,81,82,95,96,97,98,99)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=11);
-- role 12 account assistant: +26,75..82,95..97 (no company-wallet mgmt)
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 12, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (26,75,76,77,78,79,80,81,82,95,96,97)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=12);
-- roles 13/14 HR: +75..82 (public pages they link to)
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 13, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (75,76,77,78,79,80,81,82)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=13);
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 14, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (75,76,77,78,79,80,81,82)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=14);
-- role 15 Markets Manager: +25 dashboard,41/42 own-market catalog,75..82
INSERT INTO `access_has_user_roles` (`access_id`,`user_roles_id`,`created_at`,`created_by`)
SELECT a.`id`, 15, @now, 'seed' FROM `access` a
 WHERE a.`id` IN (25,41,42,75,76,77,78,79,80,81,82)
   AND NOT EXISTS (SELECT 1 FROM `access_has_user_roles` x WHERE x.`access_id`=a.`id` AND x.`user_roles_id`=15);

-- ----------------------------------------------------------------------------
-- SECTION 3 — USERS: ONE PER ROLE (1001..1015)
-- verification_status: 1=Verified 2=in-progress 3=Unverified 4=New
-- ----------------------------------------------------------------------------
INSERT INTO `users`
 (`id`,`created_at`,`created_by`,`dob`,`email`,`email_verified`,`first_name`,`has_market`,`is_active`,`is_employee`,`last_name`,`nic`,`password`,`profile_img`,`updated_at`,`updated_by`,`gender_id`,`user_role_id`,`verification_status_id`,`is_deleted`)
VALUES
 (1001,@now,'seed','1988-04-12','superadmin@qa.deliveryya.test',1,'Super',   0,1,1,'Admin',   '198804123456V',@pw,NULL,@now,'seed',1, 1,1,0),
 (1002,@now,'seed','1990-07-01','admin@qa.deliveryya.test',     1,'Admin',   0,1,1,'Perera',  '199007012345V',@pw,NULL,@now,'seed',1, 2,1,0),
 (1003,@now,'seed','1985-02-20','owner@qa.deliveryya.test',     1,'Office',  0,1,1,'Owner',   '198502203456V',@pw,NULL,@now,'seed',1, 3,1,0),
 (1004,@now,'seed','1989-11-05','manager@qa.deliveryya.test',   1,'Nimal',   0,1,1,'Manager', '198911054567V',@pw,NULL,@now,'seed',1, 4,1,0),
 (1005,@now,'seed','1991-03-18','client@qa.deliveryya.test',    1,'Kumara',  1,1,0,'Client',  '199103185678V',@pw,NULL,@now,'seed',1, 5,1,0),
 (1006,@now,'seed','1996-09-25','customer@qa.deliveryya.test',  1,'Nuwan',   0,1,0,'Customer','199609256789V',@pw,NULL,@now,'seed',1, 6,4,0),
 (1007,@now,'seed','1993-06-14','agent@qa.deliveryya.test',     1,'Sunil',   0,1,1,'Agent',   '199306147890V',@pw,NULL,@now,'seed',1, 7,1,0),
 (1008,@now,'seed','1987-12-02','marketowner@qa.deliveryya.test',1,'Ruwan',  1,1,0,'Silva',   '198712028901V',@pw,NULL,@now,'seed',1, 8,1,0),
 (1009,@now,'seed','1980-01-30','ceo@qa.deliveryya.test',       1,'Dilani',  0,1,1,'Fernando','198001309012V',@pw,NULL,@now,'seed',2, 9,1,0),
 (1010,@now,'seed','1992-05-21','secretory@qa.deliveryya.test', 1,'Kamala',  0,1,1,'Nandini', '199205210123V',@pw,NULL,@now,'seed',2,10,1,0),
 (1011,@now,'seed','1990-08-08','accounts.manager@qa.deliveryya.test',1,'Priya',0,1,1,'Jayasuriya','199008081234V',@pw,NULL,@now,'seed',2,11,1,0),
 (1012,@now,'seed','1995-04-16','accounts.assistant@qa.deliveryya.test',1,'Ravi',0,1,1,'Bandara','199504162345V',@pw,NULL,@now,'seed',1,12,1,0),
 (1013,@now,'seed','1991-10-11','hr.manager@qa.deliveryya.test',1,'Ishara',  0,1,1,'Perera',  '199110113456V',@pw,NULL,@now,'seed',2,13,1,0),
 (1014,@now,'seed','1997-02-27','hr.assistant@qa.deliveryya.test',1,'Chamodi',0,1,1,'Silva',  '199702274567V',@pw,NULL,@now,'seed',2,14,1,0),
 (1015,@now,'seed','1986-06-19','markets.manager@qa.deliveryya.test',1,'Anura',0,1,1,'Jayawardena','198606195678V',@pw,NULL,@now,'seed',1,15,1,0);

INSERT INTO `user_data`
 (`id`,`primary_mobile`,`secondary_mobile`,`whatsapp`,`postal_code`,`users_id`,`cities_id`,`address`,`is_pno_verified`)
VALUES
 (1001,'0112345001','0112345002','0112345001','00700',1001,1,'No 45, Independence Ave, Colombo 07',1),
 (1002,'0112345003','0112345004','0112345003','00800',1002,1,'No 12, Vauxhall St, Colombo 08',1),
 (1003,'0112345005','0112345006','0112345005','00300',1003,1,'No 88, Dharmapala Mawatha, Colombo 03',1),
 (1004,'0112345007','0112345008','0112345007','00500',1004,1,'No 21, Flower Rd, Colombo 05',1),
 (1005,'0761234501','0761234502','0761234501','00300',1005,1,'No 3, Galle Rd, Colombo 03',1),
 (1006,'0712345678','0713456789','0712345678','00350',1006,2,'No 121, Lake House Rd, Slave Island',1),
 (1007,'0723456780','0723456781','0723456780','12000',1007,1,'No 56, Marine Dr, Kalutara',1),
 (1008,'0774567890','0774567891','0774567890','10200',1008,1,'No 7, Main St, Nugegoda',1),
 (1009,'0112345009','0112345010','0112345009','00700',1009,1,'No 101, Horton Place, Colombo 07',1),
 (1010,'0112345011','0112345012','0112345011','00700',1010,1,'No 15, Kingsbury Ave, Colombo 07',1),
 (1011,'0112345013','0112345014','0112345013','00100',1011,1,'No 2, Banka Rd, Colombo 01',1),
 (1012,'0112345015','0112345016','0112345015','00200',1012,2,'No 44, Slave Island Rd, Colombo 02',1),
 (1013,'0112345017','0112345018','0112345017','00700',1013,1,'No 9, Independence Sq, Colombo 07',1),
 (1014,'0112345019','0112345020','0112345019','00700',1014,1,'No 31, Ward Place, Colombo 07',1),
 (1015,'0112345021','0112345022','0112345021','10300',1015,1,'No 60, Colombo Rd, Dehiwala',1);

-- Direct per-user grant demo (proves the user_has_access UNION path; also the
-- "Request for Market" unlock used right after signup).
INSERT INTO `user_has_access` (`id`,`exp`,`access_id`,`users_id`,`created_at`,`created_by`,`updated_at`,`updated_by`) VALUES
 (1001,'2027-12-31 00:00:00',43,1006,@now,'seed',@now,'seed');

-- ----------------------------------------------------------------------------
-- SECTION 4 — MARKETS, CATALOG, STOCK
-- Market 1003 = inactive demo owned by a CUSTOMER (drives the
-- Become-Seller / market-approval flows). is_active default b'0' → set 1.
-- ----------------------------------------------------------------------------
INSERT INTO `markets`
 (`id`,`created_at`,`created_by`,`updated_at`,`updated_by`,`address`,`desc`,`first_num`,`is_active`,`is_deleted`,`location`,`logo_url`,`cover_img_url`,`name`,`second_num`,`whats_app`,`info_message`,`market_category_id`,`users_id`)
VALUES
 (1001,@now,'seed',@now,'seed','No 7, Main St, Nugegoda','Certified electronics & mobile accessories with island-wide delivery.','0774567890',1,0,'Nugegoda','users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg','users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg','Kaleox Electronics','0774567891','0774567890',NULL,2,1008),
 (1002,@now,'seed',@now,'seed','No 3, Galle Rd, Colombo 03','Latest smartphones with official warranty. EMI on selected models.','0761234501',1,0,'Colombo Fort','users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg',NULL,'Island Mobile Hub','0761234502','0761234501','Call before visiting.',1,1005),
 (1003,@now,'seed',@now,'seed','No 121, Lake House Rd, Slave Island','Demo store pending approval — test data for Become-Seller flow.','0712345678',0,0,'Colombo 02',NULL,NULL,'Pending Seller Demo','0713456789','0712345678',NULL,2,1006);

INSERT INTO `category` (`id`,`name`,`markets_id`,`img`,`is_active`,`is_deleted`) VALUES
 (1001,'Smartphones',1001,'',1,0),
 (1002,'Accessories',1001,'',1,0),
 (1003,'Smartphones',1002,'',1,0),
 (1004,'Tablets',    1003,'',1,0);

INSERT INTO `brands` (`id`,`name`,`market_id`,`is_active`,`is_deleted`,`markets_id`) VALUES
 (1001,'SampathTel',  NULL,1,0,1001),
 (1002,'GamiTech',    NULL,1,0,1001),
 (1003,'LankaMobiles',NULL,1,0,1002),
 (1004,'DiveoTab',    NULL,1,0,1003);

INSERT INTO `sizes` (`id`,`name`,`user_id`,`markets_id`) VALUES
 (1001,'6.1 inch',1008,1001),
 (1002,'6.7 inch',1008,1001),
 (1003,'6.5 inch',1005,1002);

-- is_active must be 1 or product disappears from store; wpu kept small so
-- delivery fee stays at base city fee unless total weight*qty > 1kg.
INSERT INTO `products`
 (`id`,`name`,`code`,`brands_id`,`desc`,`created_at`,`created_by`,`updated_at`,`updated_by`,`is_deleted`,`is_active`,`category_id`)
VALUES
 (1001,'SampathTel X5 128GB','SKU-KLEX-001',1001,'<p>6.1-inch AMOLED, 128GB, 5000mAh. Local 2-year warranty.</p>',@now,'seed',@now,'seed',0,1,1001),
 (1002,'GamiTech AirBuds Pro','SKU-KLEX-002',1002,'<p>ANC wireless earbuds, 30h total playtime.</p>',@now,'seed',@now,'seed',0,1,1002),
 (1003,'LankaMobiles LM-7 5G','SKU-IMH-001',1003,'<p>Budget 5G handset with 90Hz display.</p>',@now,'seed',@now,'seed',0,1,1003),
 (1004,'SampathTel PowerBank 20K','SKU-KLEX-003',1002,'<p>20,000mAh PD power bank, 22.5W.</p>',@now,'seed',@now,'seed',0,1,1002);

-- url is relative to UPLOAD_PATH (/uploads/**); repo ships this exact file.
INSERT INTO `product_images` (`id`,`url`,`products_id`,`is_default`) VALUES
 (1001,'users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg',1001,1),
 (1002,'users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg',1002,1),
 (1003,'users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg',1003,1),
 (1004,'users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg',1004,1);

-- quantities already net of the two seeded market orders (O1 took 1001+1003,
-- O3 took 1004). 1005 = low-stock alert, 1006 = hidden variant.
-- is_active defaults 0 → set 1 (hidden-but-active variants still selectable
-- by direct code path; hidden=1 removes them from the public picker).
INSERT INTO `stock`
 (`id`,`desc`,`cost`,`showing_price`,`selling_price`,`qty`,`unit_id`,`products_id`,`emi`,`color`,`sizes_id`,`wpu`,`is_active`,`is_deleted`,`hidden`)
VALUES
 (1001,'128GB Black',91000, 99990, 98500, 49,1,1001,NULL,'Black', 1001,0.20,1,0,0),
 (1002,'128GB White',94000,104990,102500, 30,1,1001,NULL,'White', 1002,0.21,1,0,0),
 (1003,'White box',  1300,   2190,  1850,199,1,1002,NULL,'White', NULL, 0.05,1,0,0),
 (1004,'5G Blue',   68000,  77000, 74500, 39,1,1003,NULL,'Blue',  1003,0.22,1,0,0),
 (1005,'Grey 20K',  17000,  22900, 21000,  5,1,1004,NULL,'Grey',  NULL, 0.40,1,0,0),
 (1006,'Navy 20K',  17000,  22000, 20500, 25,1,1004,NULL,'Navy',  NULL, 0.40,1,0,1);

-- checkout looks up fee by delivery_to.cites_id; missing row ⇒ checkout throws.
INSERT INTO `delivery_fees` (`id`,`fee`,`cites_id`,`additional_fee`) VALUES
 (1001,350.00,1,100.00),
 (1002,400.00,2,150.00),
 (1003,380.00,3,120.00);

INSERT INTO `discount` (`id`,`users_id`,`cities_id`,`discount`,`created_at`,`created_by`,`updated_at`,`updated_by`) VALUES
 (1001,1008,1,10.50,@now,'seed',@now,'seed');

-- ----------------------------------------------------------------------------
-- SECTION 5 — BRANCH STAFF, VEHICLE, BANK, THIRD-PARTY SENDER
-- ----------------------------------------------------------------------------
INSERT INTO `employees`
 (`id`,`location`,`branches_id`,`users_id`,`verification_status_id`,`created_at`,`updated_at`,`mobile`,`whatsapp`,`live_location`)
VALUES
 (1001,'Colombo Fort Hub',1,1007,1,@now,@now,'0723456780','0723456780',NULL),
 (1002,'Pettah Hub',     2,1004,1,@now,@now,'0112345007','0112345007',NULL);

INSERT INTO `vehicle` (`id`,`name`,`number`,`license_exp`,`vehicle_type_id`) VALUES
 (1001,'Honda Dio 110','HR-4521','2027-12-31 00:00:00',1);

-- dump's legacy rows used market_id=0 (no FK on it) — we use real market ids.
INSERT INTO `bank_details` (`id`,`acc_number`,`branch`,`name`,`bank_id`,`user_id`,`is_active`,`is_deleted`,`market_id`) VALUES
 (1001,'1234567890','Colombo Fort','Kaleox Electronics (Pvt) Ltd',1,1008,1,0,1001),
 (1002,'9876543210','Pettah',     'Island Mobile Hub',           2,1005,1,0,1002);

INSERT INTO `third_party_senders`
 (`id`,`address`,`created_at`,`created_by`,`first_mob`,`name`,`nic`,`note`,`sec_mob`,`updated_at`,`updated_by`,`whatsapp`,`is_deleted`)
VALUES
 (1001,'No 22, Chennai Ct, Colombo 01',@now,'seed','0112345678','GreenX Courier (Third Party)','199512345678','Handles out-of-district bulk parcels.','0112345679',@now,'seed','0112345678',0);

-- ----------------------------------------------------------------------------
-- SECTION 6 — ORDER CODES
-- `field` bit = code locked/used. Used codes are consumed by orders 1001..3
-- below; spare codes are for manual Add-Order testing:
--   ORD-1008-002/-003 (owner 1008), ORD-1006-002/-003 (1006), ORD-1005-002 (1005)
-- order_code_requests row 1001 is UNPROCESSED on purpose → console test.
-- ----------------------------------------------------------------------------
INSERT INTO `order_code_requests`
 (`id`,`created_at`,`updated_at`,`updated_by`,`printed`,`printed_bracodes_needed`,`qty`,`user_id`,`is_generated`)
VALUES
 (1001,@now,@now,NULL,0,0,5,1008,0);

INSERT INTO `order_codes` (`id`,`code`,`field`,`users_id`,`order_code_request`) VALUES
 (1001,'ORD-1008-001',1,1008,NULL),
 (1002,'ORD-1008-002',0,1008,NULL),
 (1003,'ORD-1008-003',0,1008,NULL),
 (1004,'ORD-1006-001',1,1006,NULL),
 (1005,'ORD-1006-002',0,1006,NULL),
 (1006,'ORD-1005-001',1,1005,NULL),
 (1007,'ORD-1005-002',0,1005,NULL),
 (1008,'ORD-1006-003',0,1006,NULL);

-- ----------------------------------------------------------------------------
-- SECTION 7 — ORDERS: 3 SCENARIOS COVERS ALL 3 PLACEMENT PATHS
-- payment_type: 1=COD 2=Bank transfer 3=Online 4=Cash(handover)
-- payment_status: 1=Pending 2=Completed 3=Paid By Customer 4=Paid By Agent
-- delivery_status: 1=Processing 2=Ready to pickup 5=On the way 7=Delivered By Agent
--  O1 1001 = MARKET-CHECKOUT order (market_orders link, COD, payment slip
--            pending verification — see PR-1001)
--  O2 1002 = MANUAL ADD-ORDER by staff (no market_order, third-party sender,
--            fee not collected from customer)
--  O3 1003 = COMPLETED COD lifecycle (delivered by agent, cash handed over →
--            wallets + verified PR-1002)
-- NOTE orders.delivery_fee is a denormalized AMOUNT (no FK to delivery_fees).
-- ----------------------------------------------------------------------------
INSERT INTO `market_orders` (`id`,`price`,`qty`,`users_id`,`discount`) VALUES
 (1001,100350.00,2,1006,0.00),
 (1002, 74500.00,1,1006,0.00);

INSERT INTO `market_order_items` (`id`,`price`,`qty`,`market_orders_id`,`stock_id`) VALUES
 (1001, 98500.00,1,1001,1001),
 (1002,  1850.00,1,1001,1003),
 (1003, 74500.00,1,1002,1004);

INSERT INTO `orders`
 (`id`,`created_at`,`collective_price`,`delivery_fee`,`desc`,`discount`,`qty`,`total_price`,`weight`,`delivery_status_id`,`market_orders_id`,`order_codes_id`,`payment_status_id`,`payment_type_id`,`dontCollectDeliveryFeeFromCustomer`,`paid_amount`,`third_party_senders_id`,`is_deleted`)
VALUES
 (1001,@now,100700.00,350.00,'<p>Deliver after 5 PM please.</p>',0.00,2,100350.00,0.25, 1,1001,1001,1,1,b'0',0.00,NULL,0),
 (1002,@now, 25550.00,550.00,NULL,                                     0.00,1, 25000.00,2.50, 2,NULL, 1004,1,2,b'1',0.00,1001,0),
 (1003,@now, 74850.00,350.00,NULL,                                     0.00,1, 74500.00,0.22, 7,1002,1006,4,1,b'0',74850.00,NULL,0);

INSERT INTO `delivery_to`
 (`id`,`address`,`full_name`,`location`,`primary_mobile`,`secondary_mobile`,`whatsapp`,`cites_id`,`orders_id`,`users_id`)
VALUES
 (1001,'Level 3, World Trade Center, Colombo 01','Nuwan Customer',NULL,'0712345678','0713456789','0712345678',1,1001,1006),
 (1002,'No 2A, Temples Rd, Colombo 04',     'Nimal Perera',    NULL,'0723456780','0723456781','0723456780',1,1002,1006),
 (1003,'Level 3, World Trade Center, Colombo 01','Nuwan Customer',NULL,'0712345678','0713456789','0712345678',1,1003,1006);

INSERT INTO `deliveries` (`id`,`note`,`orders_id`,`employees_id`,`delivery_status_id`,`created_at`,`updated_at`) VALUES
 (1001,'Picked parcel from Island Mobile Hub',1003,1001,2,@now,@now),
 (1002,'En route — B46 highway',              1003,1001,5,@now,@now),
 (1003,'Handed cash to company accounts',     1003,1001,7,@now,@now);

INSERT INTO `delivery_details`
 (`id`,`address`,`permanent`,`users_id`,`primary_mobile`,`secondary_mobile`,`whatsapp`,`cities_id`,`location`,`tag`)
VALUES
 (1001,'No 121, Lake House Rd, Slave Island',b'1',1006,'0712345678','0713456789','0712345678',2,NULL,'Home'),
 (1002,'Level 3, World Trade Center, Colombo 01',b'0',1006,'0712345678','0713456789','0712345678',1,NULL,'Office'),
 (1003,'No 7, Main St, Nugegoda',b'1',1008,'0774567890','0774567891','0774567890',1,NULL,'Shop');

-- ----------------------------------------------------------------------------
-- SECTION 8 — PAYMENTS & WALLETS
-- PR-1001: customer bank slip for O1 → verification_status 3 (Unverified)
--          so Accounts → Verify → company-wallet credit can be exercised.
-- PR-1002: verified COD HANDOVER for O3 by agent 1007 (category 8=HANDOVER,
--          type 4=Cash) → company wallet already holds 74,850.
-- O3 net 74,500 pre-credited to client 1005's wallet; market owner 1008's
-- wallet is 0 until PR-1001 is verified (credit of 100,350 expected).
-- ⚠ Keep EXACTLY ONE active wallet row per owner (2nd = 500 on all wallet ops).
-- ----------------------------------------------------------------------------
INSERT INTO `payment_records`
 (`id`,`acc_number`,`amount`,`bank_id`,`created_at`,`created_by`,`desc`,`is_return`,`proof_url`,`updated_at`,`updated_by`,`bank_details_id`,`payment_type_id`,`verification_status_id`,`payment_category_id`)
VALUES
 (1001,'1234567890',100700.00,1,@now,'1006','Bank transfer for ORD-1008-001 (Kaleox order) — awaiting verification',0,'payment-profs/3d9045f3-135e-4e07-9ef7-a17a55295842.pdf',@now,'seed',1001,2,3,2),
 (1002,NULL,          74850.00,NULL,@now,'1007','COD handover to company — ORD-1005-001',0,'payment-profs/3d9045f3-135e-4e07-9ef7-a17a55295842.pdf',@now,'seed',NULL,4,1,8);

INSERT INTO `payment_record_items` (`id`,`amount`,`code`,`note`,`payment_record_id`) VALUES
 (1001,100700.00,'ORD-1008-001','Full settlement incl. delivery fee',1001),
 (1002, 74850.00,'ORD-1005-001','COD collected at doorstep',1002);

-- legacy twin used by the older accounts screen mirrors PR-1001:
INSERT INTO `payment_recode`
 (`id`,`acc_number`,`amount`,`bank_id`,`created_at`,`created_by`,`desc`,`is_return`,`proof_url`,`references`,`updated_at`,`updated_by`,`bank_details_id`,`order_id`,`payment_type_id`,`urgent_jobs_id`,`verification_status_id`)
VALUES
 (1001,'1234567890',100700.00,1,@now,'1006','Bank slip for ORD-1008-001',b'0','payment-profs/3d9045f3-135e-4e07-9ef7-a17a55295842.pdf','ORD-1008-001',@now,'seed',1001,1001,2,NULL,3);

INSERT INTO `agent_wallet`
 (`id`,`agent_id`,`balance`,`is_active`,`created_at`,`created_by`,`updated_at`,`updated_by`,`is_expense`,`payment_category_id`,`payment_status_id`,`code`,`ref`,`other_reason`,`note`,`to_or_from`)
VALUES
 (1001,1007,0.00,1,@now,'seed',@now,'seed',0,8,2,'WALLET-AGENT-1007','SEED:AGENT:1007',NULL,'COD 74,850 collected for ORD-1005-001 and handed over (PR-1002)',NULL);

-- The dump already ships an ACTIVE singleton company_wallet (id 1, the only
-- row the app ever reads). Inserting a second active row would 500 every
-- company-wallet operation, so we UPDATE that row instead of inserting.
UPDATE `company_wallet`
   SET `balance`=74850.00, `is_active`=1, `is_expense`=0,
       `payment_category_id`=1, `payment_status_id`=2,
       `code`='WALLET-COMPANY', `ref`='SEED:COMPANY',
       `note`='Includes agent COD handover PR-1002', `updated_at`=@now, `updated_by`='seed'
 WHERE `id`=1;

INSERT INTO `client_market_owner_wallet`
 (`id`,`user_id`,`balance`,`is_active`,`created_at`,`created_by`,`updated_at`,`updated_by`,`is_expense`,`payment_category_id`,`payment_status_id`,`code`,`ref`,`other_reason`,`note`,`to_or_from`)
VALUES
 (1001,1005,74500.00,1,@now,'seed',@now,'seed',0,1,3,'WALLET-CMO-1005','SEED:CMO:1005',NULL,'Net of COD sale ORD-1005-001',NULL),
 (1002,1008,0.00,    1,@now,'seed',@now,'seed',0,NULL,NULL,'WALLET-CMO-1008','SEED:CMO:1008',NULL,'Opening balance — credit expected after PR-1001 verification',NULL);

-- ----------------------------------------------------------------------------
-- SECTION 9 — URGENT JOBS, AGENT JOBS, PICKUPS
-- ----------------------------------------------------------------------------
INSERT INTO `urgent_jobs`
 (`id`,`created_at`,`created_by`,`updated_at`,`updated_by`,`desc`,`email`,`job`,`job_status_id`,`mobile`,`nic`,`payment_status_id`,`payment_type_id`,`trip`,`username`,`cost`,`verification_status_id`,`vehicle_type_id`,`vehicle_id`,`message`,`job_code`)
VALUES
 (1001,@now,'seed',@now,'seed','Pick up signed documents from Colombo Fort railway parcel office and deliver to Negombo bus stand before 5 PM.','customer@qa.deliveryya.test','Document courier Colombo→Negombo',1,'0712345678','199609256789V',1,1,2,'Nuwan Customer',NULL,4,1,1001,'Call on arrival and ask for Mr. Fernando.','UJC-9001');

INSERT INTO `urgent_job_items` (`id`,`location`,`task`,`be_at`,`expected_time_duration`,`spent_duration`,`urgent_jobs_id`,`job_status_id`) VALUES
 (1001,'Colombo Fort Railway Station','Collect signed documents from parcel office','2026-11-03 09:00:00',30,NULL,1001,1),
 (1002,'Negombo Bus Stand',          'Hand over to Mr. Fernando',             '2026-11-03 12:30:00',20,NULL,1001,1);

-- AJ-1001 is NOT accepted yet (accept-flow as agent Sunil);
-- AJ-1002 accepted & open (appears on agent on-going list).
INSERT INTO `agent_jobs`
 (`id`,`accepted`,`created_at`,`created_by`,`deliver_to`,`go_to`,`task`,`updated_at`,`updated_by`,`employees_id`,`urgent_jobs_id`,`is_complete`)
VALUES
 (1001,b'0',@now,'seed','Negombo Bus Stand counter','Colombo Fort Railway Station parcel office','Collect documents and deliver to Negombo',@now,'seed',1001,1001,0),
 (1002,b'1',@now,'seed','No 121, Lake House Rd, Slave Island','No 7, Main St, Nugegoda','Pick up spare power banks and deliver to customer',@now,'seed',1001,NULL,0);

INSERT INTO `agent_job_tasks` (`id`,`is_complete`,`location`,`task`,`agent_job_id`,`be_at`) VALUES
 (1001,0,'No 5, Kelaniya Rd, Gampaha','Scan QR at GamiTech warehouse desk',1002,'2026-11-03 10:30:00');

INSERT INTO `pickup_requests`
 (`id`,`is_accepted`,`is_completed`,`location`,`message`,`user_id`,`created_at`,`created_by`,`is_deleted`,`updated_at`,`updated_by`)
VALUES
 (1001,0,0,'No 121, Lake House Rd, Slave Island','Extra charger boxes to collect tomorrow 9 AM — ask for Nuwan',1006,@now,'seed',0,@now,'seed');

-- ----------------------------------------------------------------------------
-- SECTION 10 — SUPPORT / ENGAGEMENT TABLES
-- ----------------------------------------------------------------------------
INSERT INTO `complains`
 (`id`,`code`,`complain`,`created_at`,`created_by`,`is_solve`,`response`,`subject`,`updated_at`,`updated_by`,`complain_status_id`,`complain_type_id`,`orders_id`)
VALUES
 (1001,'ORD-1008-001','Parcel was not dispatched on the promised day even though the payment slip was submitted. Please expedite.',@now,'1006',0,NULL,'Late dispatch on ORD-1008-001',@now,'seed',1,2,1001);

INSERT INTO `feedbacks` (`id`,`comment`,`created_at`,`created_by`,`rating`,`updated_at`,`updated_by`,`product_id`,`user_id`) VALUES
 (1001,'Arrived quickly, packaging solid, battery great.',@now,'seed',5,@now,'seed',1001,1006),
 (1002,'Good phone for the price; box slightly dented.',  @now,'seed',4,@now,'seed',1003,1006);

INSERT INTO `notifications` (`id`,`is_read`,`message`,`title`,`users_id`,`created_at`,`created_by`,`updated_at`,`updated_by`) VALUES
 (1001,b'0','Order ORD-1008-001 (2 items, LKR 100,700) placed by Nuwan Customer.','New order received',1008,@now,'seed',@now,'seed'),
 (1002,b'0','Your order ORD-1005-001 was delivered. Thanks for shopping at Island Mobile Hub!','Order delivered',1006,@now,'seed',@now,'seed'),
 (1003,b'0','Job for UJC-9001 (Document courier Colombo→Negombo) is awaiting your acceptance.','New agent job assigned',1007,@now,'seed',@now,'seed'),
 (1004,b'0','1 payment record (PR-1001, LKR 100,700) needs verification.','Payment verification pending',1002,@now,'seed',@now,'seed');

-- Become-Seller request: approving it in the console flips 1006 → role 8,
-- sets users.has_market and creates their market (1003 inactive demo also
-- exists for the market approve/deactivate toggles).
INSERT INTO `user_requests`
 (`id`,`accepted`,`desc`,`is_deleted`,`read`,`title`,`verification_data_ids`,`user_id`,`user_request_type_id`,`created_at`,`created_by`,`doc_urls`,`updated_at`,`updated_by`)
VALUES
 (1001,0,'I want to register my shop Kaleox Gadgets as a seller (mobiles & accessories).',0,0,'Become Seller – Kaleox Gadgets',NULL,1006,1,@now,'seed','["users/791b8d1d-b96a-4697-b884-3655d1158862.jpg"]',@now,'seed');

-- agent fully verified; market owner has one in-progress + one New doc so
-- the Verify Users console (access 29) has actionable rows.
INSERT INTO `verification_data` (`id`,`url`,`desc`,`users_id`,`verification_status_id`,`doc_type_id`) VALUES
 (1001,'users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg','NIC front — agent',      1007,1,1),
 (1002,'users/73f3f211-d469-4547-ad3a-aaa03bdc2671.jpg','NIC back — agent',       1007,1,2),
 (1003,'users/791b8d1d-b96a-4697-b884-3655d1158862.jpg','NIC front — market owner',1008,2,1),
 (1004,'users/791b8d1d-b96a-4697-b884-3655d1158862.jpg','NIC back — market owner',1008,4,2);

-- web(1)/android(2) ONLY — iOS tokens (type 3) hit the gender double-FK bug.
INSERT INTO `access_tokens` (`id`,`exp_at`,`token`,`token_type_id`,`users_id`,`device_id`) VALUES
 (1001,'2027-12-31 00:00:00','fcm-qa-web-token-agent-1007',1,1007,'qa-device-01'),
 (1002,'2027-12-31 00:00:00','fcm-qa-android-token-customer-1006',2,1006,'qa-device-02');

-- ============================================================================
-- SELF-CHECK — every count should be > 0 after import
-- ============================================================================
SELECT 'users (15 roles)' t, COUNT(*) n FROM `users` WHERE `id` BETWEEN 1001 AND 1015
UNION ALL SELECT 'distinct roles covered', COUNT(DISTINCT `user_role_id`) FROM `users` WHERE `id` BETWEEN 1001 AND 1015
UNION ALL SELECT 'new grants (201)', COUNT(*) FROM `access_has_user_roles` WHERE `created_by`='seed'
UNION ALL SELECT 'ghost accesses (7)', COUNT(*) FROM `access` WHERE `id` BETWEEN 95 AND 101
UNION ALL SELECT 'markets (3)', COUNT(*) FROM `markets` WHERE `id` BETWEEN 1001 AND 1099
UNION ALL SELECT 'products (4)', COUNT(*) FROM `products` WHERE `id` BETWEEN 1001 AND 1099
UNION ALL SELECT 'stock rows (6)', COUNT(*) FROM `stock` WHERE `id` BETWEEN 1001 AND 1099
UNION ALL SELECT 'orders (3)', COUNT(*) FROM `orders` WHERE `id` BETWEEN 1001 AND 1099
UNION ALL SELECT 'payment_records (2)', COUNT(*) FROM `payment_records` WHERE `id` BETWEEN 1001 AND 1099
UNION ALL SELECT 'wallets (3 new + 1 updated)', (SELECT COUNT(*) FROM `agent_wallet` WHERE `id` BETWEEN 1001 AND 1099)
       + (SELECT COUNT(*) FROM `client_market_owner_wallet` WHERE `id` BETWEEN 1001 AND 1099)
       + (SELECT COUNT(*) FROM `company_wallet` WHERE `ref`='SEED:COMPANY')
UNION ALL SELECT 'urgent+agent jobs', (SELECT COUNT(*) FROM `urgent_jobs` WHERE `id` BETWEEN 1001 AND 1099)
       + (SELECT COUNT(*) FROM `agent_jobs` WHERE `id` BETWEEN 1001 AND 1099);
