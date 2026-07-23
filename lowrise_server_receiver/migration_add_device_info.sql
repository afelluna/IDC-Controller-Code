-- Run this once against an existing deployment's config_db to add the new
-- device name/location/coordinates columns (config_db.sql already has them
-- for fresh installs). Safe to re-run: MariaDB/MySQL 8+ support
-- `ADD COLUMN IF NOT EXISTS`; on older MariaDB drop the IF NOT EXISTS clauses
-- and run once.

ALTER TABLE `config_tbl`
  ADD COLUMN IF NOT EXISTS `device_name` varchar(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `location` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `latitude` double DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `longitude` double DEFAULT NULL;
