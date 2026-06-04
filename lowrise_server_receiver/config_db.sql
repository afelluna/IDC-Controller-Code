-- phpMyAdmin SQL Dump
-- version 4.7.9
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 04, 2020 at 07:48 PM
-- Server version: 10.1.31-MariaDB
-- PHP Version: 7.2.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `config_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `config_tbl`
--

CREATE TABLE `config_tbl` (
  `xthold` float NOT NULL,
  `ythold` float NOT NULL,
  `zthold` float NOT NULL,
  `warning` int(11) NOT NULL,
  `warrant` int(11) NOT NULL,
  `usep` int(11) NOT NULL,
  `tafter` int(11) NOT NULL,
  `tbefore` int(11) NOT NULL,
  `admin_def_username` varchar(50) NOT NULL,
  `admin_def_pass` varchar(50) NOT NULL,
  `ctrlip` varchar(50) NOT NULL,
  `ctrlport` varchar(50) NOT NULL,
  `node_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Dumping data for table `config_tbl`
--

INSERT INTO `config_tbl` (`xthold`, `ythold`, `zthold`, `warning`, `warrant`, `usep`, `tafter`, `tbefore`, `admin_def_username`, `admin_def_pass`, `ctrlip`, `ctrlport`, `node_name`) VALUES
(0.4, 0.4, 0.4, 4, 5, 0, 22, 22, 'usher', 'usher', '192.168.10.200', '3000', 'usher02');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
