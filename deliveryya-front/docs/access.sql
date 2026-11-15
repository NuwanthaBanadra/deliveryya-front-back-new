-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.0.33 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for deliveryya
CREATE DATABASE IF NOT EXISTS `deliveryya` /*!40100 DEFAULT CHARACTER SET utf8mb3 */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `deliveryya`;

-- Dumping structure for table deliveryya.access
CREATE TABLE IF NOT EXISTS `access` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `desc` varchar(150) NOT NULL,
  `access_level_id` int NOT NULL,
  `access_type_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKsa9xkmrj4add8ynyecdql2lp2` (`access_level_id`),
  KEY `FKepdvvqghamcq2y3dglowsca5k` (`access_type_id`),
  CONSTRAINT `FKepdvvqghamcq2y3dglowsca5k` FOREIGN KEY (`access_type_id`) REFERENCES `access_types` (`id`),
  CONSTRAINT `FKsa9xkmrj4add8ynyecdql2lp2` FOREIGN KEY (`access_level_id`) REFERENCES `access_level` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb3;

-- Dumping data for table deliveryya.access: ~45 rows (approximately)
DELETE FROM `access`;
INSERT INTO `access` (`id`, `name`, `desc`, `access_level_id`, `access_type_id`) VALUES
	(44, 'Profile Panel', 'View and update own profile information', 3, 1),
	(29, 'Verify Documents', 'Review and verify submitted user documents', 1, 2),
	(67, 'Verification Data Delete', 'Top level document verification delete operations', 1, 2),
	(43, 'Request For Market', 'Submit a request to create a market account', 3, 3),
	(56, 'Market Requests', 'Review incoming market registration requests', 1, 4),
	(30, 'Markets Directory', 'View market directory and market records', 1, 5),
	(31, 'Market Categories And Brands', 'Manage global market categories and brands', 1, 5),
	(41, 'My Market Products', 'Manage products for owned or client markets', 3, 6),
	(42, 'My Market Categories And Brands', 'Manage categories and brands for own market', 3, 6),
	(61, 'Product Delete', 'Top level product and stock delete operations', 1, 6),
	(62, 'Product Category Delete', 'Top level category delete operations', 1, 6),
	(63, 'Product Brand Delete', 'Top level brand delete operations', 1, 6),
	(25, 'Dashboard Route Access', 'Open the dashboard route shell', 2, 7),
	(50, 'Dashboard - Delivery Company Side', 'View delivery company dashboard data and widgets', 2, 7),
	(51, 'Dashboard - Client Market Owner Side', 'View client and market owner dashboard data', 3, 7),
	(28, 'Manage Users', 'Manage system users and employee accounts', 1, 8),
	(60, 'User Role Update Or Delete', 'Top level user role update and delete operations', 1, 8),
	(39, 'Career Management', 'Manage career and employee registration records', 2, 9),
	(40, 'Complaints Management', 'Manage customer and business complaints', 2, 10),
	(47, 'My Complaints', 'View and manage own complaint records', 3, 10),
	(66, 'Complaint Delete', 'Top level complaint delete operations', 1, 10),
	(46, 'Receiving Orders', 'Receive and inspect incoming orders', 3, 11),
	(48, 'Access Management Console', 'Manage access catalog role grants and user grants', 1, 12),
	(27, 'Add Orders', 'Create delivery company orders', 1, 13),
	(32, 'Order Code Requests', 'Review and manage requested order codes', 1, 14),
	(26, 'Placed Orders', 'View placed orders in the delivery company console', 1, 15),
	(64, 'Order Delete Or Drop', 'Top level order drop and delete operations', 1, 15),
	(45, 'Order Checkout', 'Use checkout and order payment tools', 3, 16),
	(38, 'Order Analytics Route Access', 'Open the order analytics route shell', 2, 17),
	(52, 'Order Analytics - Delivery Company Side', 'View delivery company order analytics and reports', 2, 17),
	(53, 'Order Analytics - Client Market Owner Side', 'View client and market owner expense analytics', 3, 17),
	(33, 'Employee Assignments', 'Manage employee assignment workspace', 1, 18),
	(57, 'Pickup Request Assignments', 'Manage pickup request assignment queue', 2, 18),
	(58, 'On Hand Orders', 'View and manage on-hand assigned orders', 2, 18),
	(65, 'Agent Job Delete', 'Top level agent job and pickup request delete operations', 1, 18),
	(35, 'Agent Payment Handover', 'Process agent payment handovers', 2, 19),
	(34, 'Urgent Jobs', 'Create and manage urgent job requests', 1, 20),
	(36, 'Accounts Route Access', 'Open the accounts route shell', 2, 21),
	(54, 'Accounts - Delivery Company Side', 'View delivery company accounts and settlement reports', 2, 21),
	(55, 'Accounts - Client Market Owner Side', 'View scoped client and market owner account records', 3, 21),
	(69, 'Payment Record Status Or Delete', 'Top level payment status update and delete operations', 1, 21),
	(49, 'Bank Details', 'Manage bank details used by finance workflows', 2, 22),
	(37, 'Delivery Fees Management', 'Configure delivery fees and imports', 2, 23),
	(59, 'Delivery Fees View', 'View delivery fee information without editing', 3, 23),
	(68, 'Delivery Fee Delete', 'Top level delivery fee delete operations', 1, 23);

-- Dumping structure for table deliveryya.access_level
CREATE TABLE IF NOT EXISTS `access_level` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb3;

-- Dumping data for table deliveryya.access_level: ~3 rows (approximately)
DELETE FROM `access_level`;
INSERT INTO `access_level` (`id`, `name`) VALUES
	(1, 'Top Level'),
	(2, 'Mid Level'),
	(3, 'Low Level');

-- Dumping structure for table deliveryya.access_types
CREATE TABLE IF NOT EXISTS `access_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb3;

-- Dumping data for table deliveryya.access_types: ~23 rows (approximately)
DELETE FROM `access_types`;
INSERT INTO `access_types` (`id`, `name`) VALUES
	(1, 'Profile Panel'),
	(2, 'Verify Documents'),
	(3, 'Request For Market'),
	(4, 'User Requests'),
	(5, 'Markets'),
	(6, 'My Market'),
	(7, 'Dashboard'),
	(8, 'Manage Users'),
	(9, 'Career'),
	(10, 'Help Desk'),
	(11, 'Orders'),
	(12, 'Access Management'),
	(13, 'Add Orders'),
	(14, 'Ordercode Requests'),
	(15, 'Placed Orders'),
	(16, 'Order Checkout'),
	(17, 'Order Analytics'),
	(18, 'Agent Jobs'),
	(19, 'Agent Payment Handover'),
	(20, 'Urgent Jobs'),
	(21, 'Accounts'),
	(22, 'Bank Details'),
	(23, 'Delivery Fees');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
