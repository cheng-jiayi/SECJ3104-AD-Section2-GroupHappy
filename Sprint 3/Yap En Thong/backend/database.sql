-- ============================================
-- UTM ReMerit - Complete Database Setup
-- ============================================

-- First, disable safe updates for this session
SET SQL_SAFE_UPDATES = 0;

-- Create Database
DROP DATABASE IF EXISTS utm_remerit;
CREATE DATABASE utm_remerit;
USE utm_remerit;

-- ============================================
-- User TABLE (Base Table for both Students and Admins)
-- ============================================

CREATE TABLE User (
    userID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    utmID VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('student', 'admin') NOT NULL,
    contactNumber VARCHAR(20),
    address VARCHAR(255),
    profilePicture VARCHAR(255),
    createdDateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP NULL DEFAULT NULL,
    
    INDEX idx_user_role (role),
    INDEX idx_user_email (email),
    INDEX idx_user_username (username),
    INDEX idx_user_utmid (utmID)
);

-- ============================================
-- STUDENTS TABLE (extends User)
-- ============================================

CREATE TABLE Student (
    studentID VARCHAR(20) PRIMARY KEY,
    userID VARCHAR(36) NOT NULL UNIQUE,
    totalPoints INT DEFAULT 0,
    totalMerits INT DEFAULT 0,
    totalItemsRecycled INT DEFAULT 0,
    totalWeightRecycled DECIMAL(10,2) DEFAULT 0.00,
    faculty ENUM('FABU', 'FS', 'FKT', 'FKE', 'FK', 'FKM', 'FSSH', 'FEST', 'FM', 'SPACE') NOT NULL,
    yearOfStudy INT,
    
    CONSTRAINT fk_student_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    CONSTRAINT chk_total_points CHECK (totalPoints >= 0),
    CONSTRAINT chk_total_merits CHECK (totalMerits >= 0),
    CONSTRAINT chk_total_items CHECK (totalItemsRecycled >= 0),
    CONSTRAINT chk_total_weight CHECK (totalWeightRecycled >= 0),
    CONSTRAINT chk_year_of_study CHECK (yearOfStudy >= 1 AND yearOfStudy <= 5),
    
    INDEX idx_student_id (studentID),
    INDEX idx_student_points (totalPoints),
    INDEX idx_student_merits (totalMerits),
    INDEX idx_student_recycled (totalItemsRecycled),
    INDEX idx_student_faculty (faculty),
    INDEX idx_student_year (yearOfStudy)
);

-- ============================================
-- ADMINS TABLE (extends User)
-- ============================================

CREATE TABLE Admin (
    adminID VARCHAR(20) PRIMARY KEY,
    userID VARCHAR(36) NOT NULL UNIQUE,
    
    CONSTRAINT fk_admin_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    
    INDEX idx_admin_id (adminID)
);

-- ============================================
-- RECYCLING TRANSACTIONS TABLE
-- ============================================

CREATE TABLE recycling_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(36) NOT NULL,
    material_type ENUM('plastic', 'paper', 'glass', 'metal') NOT NULL,
    quantity DECIMAL(5,2) NOT NULL,
    points_earned INT NOT NULL,
    location VARCHAR(100),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(userID),
    
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_user_date (user_id, transaction_date),
    INDEX idx_material_type (material_type)
);

-- ============================================
-- EVENT TABLE
-- ============================================

CREATE TABLE Event (
    eventID INT AUTO_INCREMENT PRIMARY KEY,
    eventTitle VARCHAR(255) NOT NULL,
    eventDescription TEXT,
    eventCategory VARCHAR(100),
    eventStartDate DATE,
    eventEndDate DATE,
    rewardPoints INT DEFAULT 0,
    UTMMeritPoints INT DEFAULT 0,
    eventImageURL VARCHAR(500),
    status ENUM('Upcoming', 'Ongoing', 'Completed') DEFAULT 'Upcoming',
    createdBy VARCHAR(20),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_event_created_by FOREIGN KEY (createdBy) REFERENCES Admin(adminID) ON DELETE SET NULL,
    CONSTRAINT chk_event_duration CHECK (
        DATEDIFF(eventEndDate, eventStartDate) <= 30 
        AND eventEndDate >= eventStartDate
    ),
    CONSTRAINT chk_reward_points CHECK (rewardPoints >= 0),
    CONSTRAINT chk_merit_points CHECK (UTMMeritPoints >= 0),
    
    INDEX idx_event_category (eventCategory),
    INDEX idx_event_status (status),
    INDEX idx_event_dates (eventStartDate, eventEndDate),
    INDEX idx_event_created_by (createdBy),
    INDEX idx_event_reward_points (rewardPoints)
);

-- ============================================
-- PARTICIPATION TABLE
-- ============================================

CREATE TABLE Participation (
    participationID INT AUTO_INCREMENT PRIMARY KEY,
    studentID VARCHAR(20) NOT NULL,
    eventID INT NOT NULL,
    registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    participationStatus ENUM('Registered', 'Attended', 'Completed', 'Cancelled') DEFAULT 'Registered',
    rewardPointsEarned INT DEFAULT 0,
    meritPointsAwarded INT DEFAULT 0,
    attendanceVerifiedBy VARCHAR(20),
    verificationDate TIMESTAMP NULL,
    
    CONSTRAINT fk_participation_student FOREIGN KEY (studentID) REFERENCES Student(studentID) ON DELETE CASCADE,
    CONSTRAINT fk_participation_event FOREIGN KEY (eventID) REFERENCES Event(eventID) ON DELETE CASCADE,
    CONSTRAINT fk_participation_verified_by FOREIGN KEY (attendanceVerifiedBy) REFERENCES Admin(adminID) ON DELETE SET NULL,
    CONSTRAINT chk_reward_points_earned CHECK (rewardPointsEarned >= 0),
    CONSTRAINT chk_merit_points_awarded CHECK (meritPointsAwarded >= 0),
    CONSTRAINT uq_student_event UNIQUE (studentID, eventID),
    
    INDEX idx_participation_student (studentID),
    INDEX idx_participation_event (eventID),
    INDEX idx_participation_status (participationStatus),
    INDEX idx_participation_date (registrationDate)
);

-- ============================================
-- CAMPAIGN ANALYTICS TABLE
-- ============================================

CREATE TABLE CampaignAnalytics(
    analyticsID INT AUTO_INCREMENT PRIMARY KEY,
    eventID INT NOT NULL UNIQUE,
    participants INT DEFAULT 0,
    pointsCollected INT DEFAULT 0,
    goalPercent DECIMAL(5,2),
    averagePoints DECIMAL(5,2),
    snapshotDate DATE,
    calculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_analytics_event FOREIGN KEY (eventID) REFERENCES Event(eventID) ON DELETE CASCADE,
    CONSTRAINT chk_goal_percent CHECK (goalPercent >= 0 AND goalPercent <= 100),
    CONSTRAINT chk_average_points CHECK (averagePoints >= 0),
    CONSTRAINT chk_participants CHECK (participants >= 0),
    CONSTRAINT chk_points_collected CHECK (pointsCollected >= 0),
    
    INDEX idx_analytics_date (snapshotDate),
    INDEX idx_analytics_goal (goalPercent),
    INDEX idx_analytics_event (eventID)
);

-- ============================================
-- ANALYTICS REPORT TABLE
-- ============================================

CREATE TABLE AnalyticsReport(
    reportID INT AUTO_INCREMENT PRIMARY KEY,
    reportTitle VARCHAR(255) NOT NULL,
    reportType ENUM('Single campaign', 'Comparative analysis', 'Semester Summary'),
    createdBy VARCHAR(20) NOT NULL,
    reportConfig JSON,
    reportData JSON,
    downloadCount INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_report_created_by FOREIGN KEY (createdBy) REFERENCES Admin(adminID) ON DELETE CASCADE,
    CONSTRAINT chk_download_count CHECK (downloadCount >= 0),
    
    INDEX idx_report_type (reportType),
    INDEX idx_report_created_at (createdAt),
    INDEX idx_report_created_by (createdBy)
);

-- ============================================
-- CAMPAIGN ANALYTICS SNAPSHOT TABLE
-- ============================================

CREATE TABLE CampaignAnalyticsSnapshot(
    snapshotID INT AUTO_INCREMENT PRIMARY KEY,
    eventID INT NOT NULL,
    participants INT DEFAULT 0,
    pointsCollected INT DEFAULT 0,
    goalPercent DECIMAL(5,2),
    averagePoints DECIMAL(5,2),
    snapshotDate DATE NOT NULL,
    snapshotType ENUM('Completion', 'Report', 'Manual') DEFAULT 'Completion',
    calculatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_snapshot_event FOREIGN KEY (eventID) REFERENCES Event(eventID) ON DELETE CASCADE,
    CONSTRAINT chk_snapshot_goal CHECK (goalPercent >= 0 AND goalPercent <= 100),
    CONSTRAINT chk_snapshot_participants CHECK (participants >= 0),
    CONSTRAINT chk_snapshot_points CHECK (pointsCollected >= 0),
    
    INDEX idx_snapshot_event (eventID),
    INDEX idx_snapshot_date (snapshotDate)
);

-- ============================================
-- INSERT DATA
-- ============================================

-- Insert User (Combined from both modules)
INSERT INTO User (userID, username, password, fullName, utmID, email, role, contactNumber) VALUES
-- Admins
('U001', 'sarah_admin', 'hashed_pass1', 'Dr. Sarah Lim', 'ADM001', 'sarah.lim@utm.my', 'admin', '60123456789'),
('U002', 'ahmad_admin', 'hashed_pass2', 'Ahmad Faiz', 'ADM002', 'ahmad.faiz@utm.my', 'admin', '60123456790'),
('U003', 'priya_admin', 'hashed_pass3', 'Priya Sharma', 'ADM003', 'priya.sharma@utm.my', 'admin', '60123456791'),
('U004', 'wei_admin', 'hashed_pass4', 'Wei Chen', 'ADM004', 'wei.chen@utm.my', 'admin', '60123456792'),
-- Students (from Module 1 - FABU)
('U005', 'anora002', 'hashed_pass5', 'Siti Norhaliza', 'A23BU0001', 'siti.norhaliza@graduate.utm.my', 'student', '60123456793'),
('U006', 'akamal101', 'hashed_pass6', 'Ahmad Kamal', 'A23BU0002', 'ahmad.kamal@graduate.utm.my', 'student', '60123456794'),
('U007', 'naisyah102', 'hashed_pass7', 'Nor Aisyah', 'A23BU0003', 'nor.aisyah@graduate.utm.my', 'student', '60123456795'),
('U008', 'lweihan103', 'hashed_pass8', 'Lee Wei Han', 'A23BU0004', 'lee.weihan@graduate.utm.my', 'student', '60123456796'),
('U009', 'sjohnson104', 'hashed_pass9', 'Sarah Johnson', 'A23BU0005', 'sarah.johnson@graduate.utm.my', 'student', '60123456797'),
-- Students (from Module 1 - FS)
('U010', 'rkumar003', 'hashed_pass10', 'Raj Kumar', 'A23CS0001', 'raj.kumar@graduate.utm.my', 'student', '60123456798'),
('U011', 'cmeiling101', 'hashed_pass11', 'Chin Mei Ling', 'A23CS0002', 'chin.meiling@graduate.utm.my', 'student', '60123456799'),
('U012', 'dtan102', 'hashed_pass12', 'David Tan', 'A23CS0003', 'david.tan@graduate.utm.my', 'student', '60123456800'),
('U013', 'nhuda103', 'hashed_pass13', 'Nurul Huda', 'A23CS0004', 'nurul.huda@graduate.utm.my', 'student', '60123456801'),
('U014', 'mwong104', 'hashed_pass14', 'Michael Wong', 'A23CS0005', 'michael.wong@graduate.utm.my', 'student', '60123456802'),
('U015', 'fazzahra105', 'hashed_pass15', 'Fatimah Azzahra', 'A23CS0006', 'fatimah.azzahra@graduate.utm.my', 'student', '60123456803'),
('U016', 'jlim106', 'hashed_pass16', 'James Lim', 'A23CS0007', 'james.lim@graduate.utm.my', 'student', '60123456804'),
-- Students (from Module 1 - FKT)
('U017', 'mling004', 'hashed_pass17', 'Mei Ling', 'A23KT0001', 'mei.ling@graduate.utm.my', 'student', '60123456805'),
('U018', 'ahassan101', 'hashed_pass18', 'Ali Hassan', 'A23KT0002', 'ali.hassan@graduate.utm.my', 'student', '60123456806'),
('U019', 'pdevi102', 'hashed_pass19', 'Priya Devi', 'A23KT0003', 'priya.devi@graduate.utm.my', 'student', '60123456807'),
('U020', 'mzain103', 'hashed_pass20', 'Mohd Zain', 'A23KT0004', 'mohd.zain@graduate.utm.my', 'student', '60123456808'),
('U021', 'saishah104', 'hashed_pass21', 'Siti Aishah', 'A23KT0005', 'siti.aishah@graduate.utm.my', 'student', '60123456809'),
-- Students (from Module 1 - FKE)
('U022', 'aahmad001', 'hashed_pass22', 'Ali bin Ahmad', 'A23EN0001', 'ali.ahmad@graduate.utm.my', 'student', '60123456810'),
('U023', 'jsmith101', 'hashed_pass23', 'John Smith', 'A23EN0002', 'john.smith@graduate.utm.my', 'student', '60123456811'),
('U024', 'mrodriguez102', 'hashed_pass24', 'Maria Rodriguez', 'A23EN0003', 'maria.rodriguez@graduate.utm.my', 'student', '60123456812'),
('U025', 'wchen103', 'hashed_pass25', 'Wei Chen', 'A23EN0004', 'wei.chen@graduate.utm.my', 'student', '60123456813'),
('U026', 'adesai104', 'hashed_pass26', 'Anita Desai', 'A23EN0005', 'anita.desai@graduate.utm.my', 'student', '60123456814'),
('U027', 'rkim105', 'hashed_pass27', 'Robert Kim', 'A23EN0006', 'robert.kim@graduate.utm.my', 'student', '60123456815'),
('U028', 'sgarcia106', 'hashed_pass28', 'Sofia Garcia', 'A23EN0007', 'sofia.garcia@graduate.utm.my', 'student', '60123456816'),
('U029', 'ktanaka107', 'hashed_pass29', 'Kenji Tanaka', 'A23EN0008', 'kenji.tanaka@graduate.utm.my', 'student', '60123456817'),
-- Students (from Module 1 - FK)
('U030', 'zweifk101', 'hashed_pass30', 'Zhang Wei', 'A23CP0001', 'zhang.wei@graduate.utm.my', 'student', '60123456818'),
('U031', 'amohammed102', 'hashed_pass31', 'Aisha Mohammed', 'A23CP0002', 'aisha.mohammed@graduate.utm.my', 'student', '60123456819'),
('U032', 'tlee103', 'hashed_pass32', 'Thomas Lee', 'A23CP0003', 'thomas.lee@graduate.utm.my', 'student', '60123456820'),
('U033', 'nabdullah104', 'hashed_pass33', 'Nora Abdullah', 'A23CP0004', 'nora.abdullah@graduate.utm.my', 'student', '60123456821'),
('U034', 'kraj105', 'hashed_pass34', 'Kevin Raj', 'A23CP0005', 'kevin.raj@graduate.utm.my', 'student', '60123456822'),
-- Students (from Module 1 - FKM)
('U035', 'afirdaus005', 'hashed_pass35', 'Ahmad Firdaus', 'A23MG0001', 'ahmad.firdaus@graduate.utm.my', 'student', '60123456823'),
('U036', 'lwong101', 'hashed_pass36', 'Lisa Wong', 'A23MG0002', 'lisa.wong@graduate.utm.my', 'student', '60123456824'),
('U037', 'csilva102', 'hashed_pass37', 'Carlos Silva', 'A23MG0003', 'carlos.silva@graduate.utm.my', 'student', '60123456825'),
('U038', 'ynakamura103', 'hashed_pass38', 'Yuki Nakamura', 'A23MG0004', 'yuki.nakamura@graduate.utm.my', 'student', '60123456826'),
('U039', 'rali104', 'hashed_pass39', 'Rahman Ali', 'A23MG0005', 'rahman.ali@graduate.utm.my', 'student', '60123456827'),
-- Students (from Module 1 - FSSH)
('U040', 'ewilson101', 'hashed_pass40', 'Emily Wilson', 'A23SH0001', 'emily.wilson@graduate.utm.my', 'student', '60123456828'),
('U041', 'arahman102', 'hashed_pass41', 'Abdul Rahman', 'A23SH0002', 'abdul.rahman@graduate.utm.my', 'student', '60123456829'),
('U042', 'cli103', 'hashed_pass42', 'Chen Li', 'A23SH0003', 'chen.li@graduate.utm.my', 'student', '60123456830'),
('U043', 'saminah104', 'hashed_pass43', 'Siti Aminah', 'A23SH0004', 'siti.aminah@graduate.utm.my', 'student', '60123456831'),
-- Students (from Module 1 - FEST)
('U044', 'sjones101', 'hashed_pass44', 'Sarah Jones', 'A23ED0001', 'sarah.jones@graduate.utm.my', 'student', '60123456832'),
('U045', 'mali102', 'hashed_pass45', 'Mohammed Ali', 'A23ED0002', 'mohammed.ali@graduate.utm.my', 'student', '60123456833'),
('U046', 'pshah103', 'hashed_pass46', 'Priyanka Shah', 'A23ED0003', 'priyanka.shah@graduate.utm.my', 'student', '60123456834'),
('U047', 'thiroshi104', 'hashed_pass47', 'Tanaka Hiroshi', 'A23ED0004', 'tanaka.hiroshi@graduate.utm.my', 'student', '60123456835'),
-- Students (from Module 1 - FM)
('U048', 'daminah101', 'hashed_pass48', 'Dr. Aminah', 'A23MD0001', 'aminah@utm.my', 'student', '60123456836'),
('U049', 'dkumar102', 'hashed_pass49', 'Dr. Kumar', 'A23MD0002', 'kumar@utm.my', 'student', '60123456837'),
('U050', 'dlee103', 'hashed_pass50', 'Dr. Lee', 'A23MD0003', 'lee@utm.my', 'student', '60123456838'),
('U051', 'dgarcia104', 'hashed_pass51', 'Dr. Garcia', 'A23MD0004', 'garcia@utm.my', 'student', '60123456839'),
-- Students (from Module 1 - SPACE)
('U052', 'avolkov101', 'hashed_pass52', 'Alexei Volkov', 'A23SP0001', 'alexei.volkov@graduate.utm.my', 'student', '60123456840'),
('U053', 'falmansoor102', 'hashed_pass53', 'Fatima Al-Mansoor', 'A23SP0002', 'fatima.almansoor@graduate.utm.my', 'student', '60123456841'),
('U054', 'ksato103', 'hashed_pass54', 'Kenji Sato', 'A23SP0003', 'kenji.sato@graduate.utm.my', 'student', '60123456842'),
('U055', 'msantos104', 'hashed_pass55', 'Maria Santos', 'A23SP0004', 'maria.santos@graduate.utm.my', 'student', '60123456843');

-- Insert Admins
INSERT INTO Admin (adminID, userID) VALUES
('ADM001', 'U001'),
('ADM002', 'U002'),
('ADM003', 'U003'),
('ADM004', 'U004');

-- Insert Students
INSERT INTO Student (studentID, userID, faculty, yearOfStudy, totalPoints, totalMerits) VALUES
-- FABU
('A23BU0001', 'U005', 'FABU', 2, 0, 0),
('A23BU0002', 'U006', 'FABU', 1, 0, 0),
('A23BU0003', 'U007', 'FABU', 3, 0, 0),
('A23BU0004', 'U008', 'FABU', 2, 0, 0),
('A23BU0005', 'U009', 'FABU', 4, 0, 0),
-- FS
('A23CS0001', 'U010', 'FS', 4, 0, 0),
('A23CS0002', 'U011', 'FS', 2, 0, 0),
('A23CS0003', 'U012', 'FS', 3, 0, 0),
('A23CS0004', 'U013', 'FS', 1, 0, 0),
('A23CS0005', 'U014', 'FS', 4, 0, 0),
('A23CS0006', 'U015', 'FS', 2, 0, 0),
('A23CS0007', 'U016', 'FS', 3, 0, 0),
-- FKT
('A23KT0001', 'U017', 'FKT', 3, 0, 0),
('A23KT0002', 'U018', 'FKT', 1, 0, 0),
('A23KT0003', 'U019', 'FKT', 2, 0, 0),
('A23KT0004', 'U020', 'FKT', 3, 0, 0),
('A23KT0005', 'U021', 'FKT', 4, 0, 0),
-- FKE
('A23EN0001', 'U022', 'FKE', 3, 0, 0),
('A23EN0002', 'U023', 'FKE', 2, 0, 0),
('A23EN0003', 'U024', 'FKE', 1, 0, 0),
('A23EN0004', 'U025', 'FKE', 4, 0, 0),
('A23EN0005', 'U026', 'FKE', 3, 0, 0),
('A23EN0006', 'U027', 'FKE', 2, 0, 0),
('A23EN0007', 'U028', 'FKE', 1, 0, 0),
('A23EN0008', 'U029', 'FKE', 3, 0, 0),
-- FK
('A23CP0001', 'U030', 'FK', 2, 0, 0),
('A23CP0002', 'U031', 'FK', 1, 0, 0),
('A23CP0003', 'U032', 'FK', 3, 0, 0),
('A23CP0004', 'U033', 'FK', 4, 0, 0),
('A23CP0005', 'U034', 'FK', 2, 0, 0),
-- FKM
('A23MG0001', 'U035', 'FKM', 2, 0, 0),
('A23MG0002', 'U036', 'FKM', 1, 0, 0),
('A23MG0003', 'U037', 'FKM', 3, 0, 0),
('A23MG0004', 'U038', 'FKM', 2, 0, 0),
('A23MG0005', 'U039', 'FKM', 4, 0, 0),
-- FSSH
('A23SH0001', 'U040', 'FSSH', 1, 0, 0),
('A23SH0002', 'U041', 'FSSH', 2, 0, 0),
('A23SH0003', 'U042', 'FSSH', 3, 0, 0),
('A23SH0004', 'U043', 'FSSH', 4, 0, 0),
-- FEST
('A23ED0001', 'U044', 'FEST', 2, 0, 0),
('A23ED0002', 'U045', 'FEST', 1, 0, 0),
('A23ED0003', 'U046', 'FEST', 3, 0, 0),
('A23ED0004', 'U047', 'FEST', 4, 0, 0),
-- FM
('A23MD0001', 'U048', 'FM', 5, 0, 0),
('A23MD0002', 'U049', 'FM', 4, 0, 0),
('A23MD0003', 'U050', 'FM', 3, 0, 0),
('A23MD0004', 'U051', 'FM', 5, 0, 0),
-- SPACE
('A23SP0001', 'U052', 'SPACE', 3, 0, 0),
('A23SP0002', 'U053', 'SPACE', 2, 0, 0),
('A23SP0003', 'U054', 'SPACE', 4, 0, 0),
('A23SP0004', 'U055', 'SPACE', 1, 0, 0);

-- ============================================
-- INSERT RECYCLING TRANSACTIONS (Module 1 Data)
-- ============================================

-- Current Semester Data (Jan 2024 - Mar 2024)
-- Week 1: Jan 1-7, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Engineering (FKE) Student - High activity
('U022', 'plastic', 3.5, 70, '2024-01-02'), ('U022', 'paper', 2.0, 40, '2024-01-03'),
('U029', 'plastic', 2.8, 56, '2024-01-02'), ('U029', 'metal', 1.2, 24, '2024-01-04'),
('U025', 'glass', 1.5, 30, '2024-01-05'), ('U025', 'paper', 2.5, 50, '2024-01-06'),
-- Science (FS) Student
('U010', 'plastic', 2.0, 40, '2024-01-01'), ('U011', 'paper', 1.8, 36, '2024-01-03'),
('U012', 'glass', 1.2, 24, '2024-01-04'), ('U013', 'metal', 0.9, 18, '2024-01-05'),
-- Other faculties
('U006', 'plastic', 2.5, 50, '2024-01-02'), ('U014', 'paper', 3.0, 60, '2024-01-04'),
('U015', 'plastic', 1.8, 36, '2024-01-06'), ('U016', 'glass', 2.0, 40, '2024-01-07');

-- Week 2: Jan 8-14, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 2.8, 56, '2024-01-09'), ('U022', 'metal', 1.5, 30, '2024-01-10'),
('U029', 'paper', 3.2, 64, '2024-01-08'), ('U025', 'plastic', 2.0, 40, '2024-01-11'),
('U010', 'glass', 1.8, 36, '2024-01-12'), ('U011', 'paper', 2.2, 44, '2024-01-13'),
('U012', 'plastic', 3.0, 60, '2024-01-14'), ('U014', 'metal', 1.0, 20, '2024-01-09'), -- Fixed: UU014 to U014
('U015', 'paper', 2.5, 50, '2024-01-10'), ('U016', 'plastic', 2.8, 56, '2024-01-12'); -- Fixed: UU015/UU016 to U015/U016

-- Week 3: Jan 15-21, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Add more faculty diversity
('U017', 'plastic', 2.5, 50, '2024-01-15'), ('U018', 'paper', 3.0, 60, '2024-01-16'),
('U019', 'glass', 1.5, 30, '2024-01-17'), ('U020', 'metal', 1.2, 24, '2024-01-18'),
('U021', 'plastic', 2.0, 40, '2024-01-19'), ('U022', 'paper', 1.8, 36, '2024-01-20'),
('U025', 'glass', 2.2, 44, '2024-01-21'), ('U026', 'plastic', 3.5, 70, '2024-01-20');

-- Week 4: Jan 22-28, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 4.0, 80, '2024-01-22'), ('U022', 'paper', 2.8, 56, '2024-01-24'),
('U010', 'glass', 2.0, 40, '2024-01-23'), ('U029', 'metal', 1.8, 36, '2024-01-25'),
('U016', 'plastic', 3.2, 64, '2024-01-26'), ('U017', 'paper', 2.5, 50, '2024-01-27'),
('U028', 'glass', 1.5, 30, '2024-01-28'), ('U031', 'plastic', 2.8, 56, '2024-01-28');

-- Week 5: Jan 29 - Feb 4, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 2.0, 40, '2024-01-29'), ('U022', 'paper', 1.5, 30, '2024-01-30'),
('U029', 'plastic', 2.8, 56, '2024-01-31'), ('U025', 'glass', 1.0, 20, '2024-02-01'),
('U010', 'metal', 0.8, 16, '2024-02-02'), ('U011', 'paper', 2.2, 44, '2024-02-03'),
('U012', 'plastic', 3.0, 60, '2024-02-04'), ('U014', 'paper', 2.0, 40, '2024-02-04');

-- Week 6: Feb 5-11, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 2.0, 40, '2024-02-05'), ('U022', 'paper', 1.5, 30, '2024-02-06'),
('U029', 'plastic', 2.8, 56, '2024-02-07'), ('U025', 'glass', 1.0, 20, '2024-02-08'),
('U010', 'metal', 0.8, 16, '2024-02-09'), ('U011', 'plastic', 1.8, 36, '2024-02-10'),
('U012', 'paper', 2.5, 50, '2024-02-11'), ('U017', 'glass', 1.5, 30, '2024-02-11');

-- Week 7: Feb 12-18, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 3.5, 70, '2024-02-12'), ('U022', 'paper', 2.8, 56, '2024-02-13'),
('U029', 'metal', 1.0, 20, '2024-02-14'), ('U025', 'plastic', 2.3, 46, '2024-02-15'),
('U010', 'glass', 1.5, 30, '2024-02-16'), ('U011', 'paper', 2.0, 40, '2024-02-17'),
('U012', 'plastic', 2.7, 54, '2024-02-18'), ('U018', 'metal', 1.2, 24, '2024-02-18');

-- Week 8: Feb 19-25, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'metal', 1.2, 24, '2024-02-19'), ('U022', 'plastic', 2.7, 54, '2024-02-20'),
('U029', 'paper', 2.2, 44, '2024-02-21'), ('U025', 'plastic', 2.0, 40, '2024-02-22'),
('U010', 'glass', 1.8, 36, '2024-02-23'), ('U011', 'metal', 0.8, 16, '2024-02-24'),
('U012', 'paper', 3.0, 60, '2024-02-25'), ('U019', 'plastic', 2.5, 50, '2024-02-25');

-- Week 9: Feb 26 - Mar 3, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 2.5, 50, '2024-02-26'), ('U022', 'paper', 1.8, 36, '2024-02-27'),
('U029', 'glass', 2.2, 44, '2024-02-28'), ('U025', 'plastic', 3.0, 60, '2024-02-29'),
('U010', 'metal', 1.5, 30, '2024-03-01'), ('U011', 'paper', 2.5, 50, '2024-03-02'),
('U012', 'plastic', 2.8, 56, '2024-03-03'), ('U020', 'paper', 1.8, 36, '2024-03-03');

-- Week 10: Mar 4-10, 2024 (Current Week)
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Monday
('U022', 'plastic', 3.2, 64, '2024-03-04'), ('U022', 'paper', 2.5, 50, '2024-03-04'),
('U006', 'plastic', 2.5, 50, '2024-03-04'), ('U010', 'paper', 2.0, 40, '2024-03-04'),
-- Tuesday
('U022', 'plastic', 2.8, 56, '2024-03-05'), ('U022', 'glass', 1.5, 30, '2024-03-05'),
('U029', 'plastic', 3.0, 60, '2024-03-05'), ('U025', 'paper', 2.2, 44, '2024-03-05'),
-- Wednesday
('U022', 'metal', 0.9, 18, '2024-03-06'), ('U022', 'plastic', 1.8, 36, '2024-03-06'),
('U011', 'glass', 1.5, 30, '2024-03-06'), ('U012', 'plastic', 2.0, 40, '2024-03-06'),
-- Thursday
('U022', 'paper', 3.0, 60, '2024-03-07'), ('U022', 'glass', 2.0, 40, '2024-03-07'),
('U013', 'metal', 1.0, 20, '2024-03-07'), ('U014', 'plastic', 2.5, 50, '2024-03-07'),
-- Friday
('U022', 'plastic', 4.0, 80, '2024-03-08'), ('U022', 'metal', 1.2, 24, '2024-03-08'),
('U015', 'paper', 3.2, 64, '2024-03-08'), ('U016', 'glass', 1.8, 36, '2024-03-08'),
-- Saturday
('U022', 'paper', 2.2, 44, '2024-03-09'), ('U018', 'plastic', 3.5, 70, '2024-03-09'),
('U019', 'paper', 2.0, 40, '2024-03-09'), ('U020', 'metal', 1.5, 30, '2024-03-09'),
-- Sunday
('U022', 'plastic', 3.5, 70, '2024-03-10'), ('U021', 'glass', 2.5, 50, '2024-03-10'),
('U023', 'paper', 3.0, 60, '2024-03-10'), ('U024', 'plastic', 2.8, 56, '2024-03-10');

-- Additional data for March 4-10
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Monday
('U029', 'plastic', 1.5, 30, '2024-03-04'),
('U025', 'metal', 0.8, 16, '2024-03-04'),
('U010', 'glass', 1.2, 24, '2024-03-04'),
('U011', 'paper', 1.8, 36, '2024-03-04'),
('U014', 'plastic', 2.0, 40, '2024-03-04'),
('U018', 'paper', 1.5, 30, '2024-03-04');

-- ============================================
-- INSERT LAST SEMESTER DATA (Sep-Dec 2023)
-- ============================================

-- September 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 2.5, 50, '2023-09-10'), ('U029', 'paper', 2.0, 40, '2023-09-15'), -- Fixed: integers to strings
('U010', 'glass', 1.5, 30, '2023-09-20'), ('U014', 'metal', 1.2, 24, '2023-09-25'), -- Fixed: integers to strings
('U015', 'plastic', 3.0, 60, '2023-09-30'); -- Fixed: integer to string

-- October 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 2.8, 56, '2023-10-05'), ('U029', 'paper', 2.5, 50, '2023-10-10'), -- Fixed: integers to strings
('U010', 'glass', 1.8, 36, '2023-10-15'), ('U011', 'metal', 1.0, 20, '2023-10-20'), -- Fixed: integers to strings
('U012', 'plastic', 2.2, 44, '2023-10-25'), ('U013', 'paper', 3.0, 60, '2023-10-30'); -- Fixed: integers to strings

-- November 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 3.0, 60, '2023-11-05'), ('U006', 'paper', 2.5, 50, '2023-11-10'), -- Fixed: integers to strings
('U010', 'glass', 1.8, 36, '2023-11-15'), ('U011', 'metal', 1.2, 24, '2023-11-20'), -- Fixed: integers to strings
('U014', 'plastic', 2.0, 40, '2023-11-25'), ('U029', 'paper', 3.5, 70, '2023-11-30'); -- Fixed: integers to strings

-- December 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 2.5, 50, '2023-12-05'), ('U006', 'paper', 1.8, 36, '2023-12-10'), -- Fixed: integers to strings
('U010', 'glass', 1.5, 30, '2023-12-15'), ('U011', 'metal', 1.0, 20, '2023-12-20'), -- Fixed: integers to strings
('U012', 'plastic', 2.8, 56, '2023-12-25'), ('U013', 'paper', 2.2, 44, '2023-12-30'); -- Fixed: integers to strings

-- ============================================
-- INSERT 6 MONTHS DATA (Sep 2023 - Mar 2024)
-- ============================================

INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- More data for other User to create realistic trends
('U024', 'plastic', 2.5, 50, '2023-10-10'), ('U026', 'paper', 2.0, 40, '2023-10-15'), -- Fixed: integers to strings
('U027', 'glass', 1.5, 30, '2023-10-20'), ('U028', 'metal', 1.2, 24, '2023-10-25'), -- Fixed: integers to strings
('U030', 'plastic', 3.0, 60, '2023-11-01'), ('U031', 'paper', 2.5, 50, '2023-11-05'), -- Fixed: integers to strings
('U032', 'glass', 1.8, 36, '2023-11-10'), ('U033', 'metal', 1.0, 20, '2023-11-15'), -- Fixed: integers to strings
('U034', 'plastic', 2.2, 44, '2023-11-20'), ('U035', 'paper', 3.0, 60, '2023-11-25'), -- Fixed: integers to strings
('U036', 'glass', 2.0, 40, '2023-12-01'), ('U037', 'metal', 1.5, 30, '2023-12-05'), -- Fixed: integers to strings
('U038', 'plastic', 2.8, 56, '2023-12-10'), ('U039', 'paper', 2.2, 44, '2023-12-15'), -- Fixed: integers to strings
('U040', 'glass', 1.5, 30, '2023-12-20'), ('U041', 'metal', 1.2, 24, '2023-12-25'), -- Fixed: integers to strings
('U042', 'plastic', 3.5, 70, '2024-01-05'), ('U043', 'paper', 2.8, 56, '2024-01-10'), -- Fixed: integers to strings
('U044', 'glass', 2.2, 44, '2024-01-15'), ('U045', 'metal', 1.8, 36, '2024-01-20'); -- Fixed: integers to strings

-- Module 1 Queries
SELECT '=== DATABASE SUMMARY ===' as message;

SELECT 'Total Users' as metric, COUNT(*) as value FROM User
UNION ALL
SELECT 'Total Transactions', COUNT(*) FROM recycling_transactions
UNION ALL
SELECT 'Unique Faculties', COUNT(DISTINCT faculty) FROM Student; -- Fixed: FROM User to FROM Student

SELECT '=== FACULTY DISTRIBUTION ===' as message;
SELECT faculty, COUNT(*) as students FROM Student GROUP BY faculty ORDER BY students DESC;

SELECT '=== CURRENT SEMESTER OVERVIEW (Jan 1 - Mar 10, 2024) ===' as message;
SELECT 
    s.faculty,
    COUNT(DISTINCT s.studentID) as participants,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity),1) as total_kg
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID -- Fixed: JOIN users u ON rt.user_id = u.id to JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY s.faculty
ORDER BY total_points DESC;

-- Continue with the rest of your code...

-- Last Semester Overview (Sep - Dec 2023)
SELECT '=== LAST SEMESTER OVERVIEW (Sep - Dec 2023) ===' as message;
SELECT 
    s.faculty,
    COUNT(DISTINCT s.studentID) as participants,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity),1) as total_kg
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2023-09-01' AND '2023-12-31'
GROUP BY s.faculty
ORDER BY total_points DESC;

-- 6 Months Overview (Sep 2023 - Mar 2024)
SELECT '=== 6 MONTHS OVERVIEW (Sep 2023 - Mar 2024) ===' as message;
SELECT 
    s.faculty,
    COUNT(DISTINCT s.studentID) as participants,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity),1) as total_kg
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2023-09-01' AND '2024-03-10'
GROUP BY s.faculty
ORDER BY total_points DESC;

-- Weekly Trend Current Semester
SELECT '=== WEEKLY TREND CURRENT SEMESTER ===' as message;
SELECT 
    WEEK(rt.transaction_date,1) as week_number,
    COUNT(DISTINCT rt.user_id) as weekly_participants,
    SUM(rt.points_earned) as weekly_points,
    ROUND(SUM(rt.quantity),1) as weekly_kg
FROM recycling_transactions rt
WHERE rt.transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY WEEK(rt.transaction_date,1)
ORDER BY week_number;

-- Top Performing Faculties
SELECT '=== TOP PERFORMING FACULTIES ===' as message;
SELECT 
    s.faculty,
    ROUND(AVG(rt.points_earned), 0) as avg_points_per_student,
    MAX(rt.points_earned) as max_points,
    MIN(rt.points_earned) as min_points
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY s.faculty
ORDER BY avg_points_per_student DESC;

-- Material Breakdown Current Semester
SELECT '=== MATERIAL BREAKDOWN (Current Semester) ===' as message;
SELECT 
    material_type,
    COUNT(*) as transactions,
    SUM(points_earned) as total_points,
    ROUND(SUM(quantity),1) as total_kg,
    ROUND(AVG(points_earned), 0) as avg_points_per_transaction
FROM recycling_transactions
WHERE transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY material_type
ORDER BY total_points DESC;

-- 1. Top Performers Leaderboard (Last 6 Weeks)
SELECT 
    RANK() OVER (ORDER BY SUM(rt.points_earned) DESC) AS rank_position,
    u.fullName as name,
    s.faculty,
    COUNT(*) AS items_recycled,
    SUM(rt.points_earned) AS total_points,
    ROUND(SUM(rt.quantity), 1) AS total_kg
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
GROUP BY u.userID, u.fullName, s.faculty
ORDER BY total_points DESC
LIMIT 10;

-- 2. Faculty Average Comparison
SELECT 
    faculty_stats.faculty,
    COUNT(DISTINCT faculty_stats.user_id) AS students,
    ROUND(AVG(faculty_stats.total_points), 0) AS avg_points_per_student,
    ROUND(AVG(faculty_stats.total_items), 0) AS avg_items_per_student
FROM (
    SELECT 
        s.faculty,
        rt.user_id,
        SUM(rt.points_earned) AS total_points,
        COUNT(*) AS total_items
    FROM recycling_transactions rt
    JOIN User u ON rt.user_id = u.userID
    JOIN Student s ON u.userID = s.userID
    WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY s.faculty, rt.user_id
) AS faculty_stats
GROUP BY faculty_stats.faculty
ORDER BY avg_points_per_student DESC;

-- 3. Campus Average
SELECT 
    'Campus Average' AS comparison,
    ROUND(AVG(total_points), 0) AS avg_points,
    ROUND(AVG(total_items), 0) AS avg_items,
    COUNT(*) AS total_students
FROM (
    SELECT 
        rt.user_id,
        SUM(rt.points_earned) AS total_points,
        COUNT(*) AS total_items
    FROM recycling_transactions rt
    WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY rt.user_id
) AS campus_stats;

-- 4. User Rank Calculation (for user 'U022' - Ali bin Ahmad)
WITH ranked_users AS (
    SELECT 
        rt.user_id,
        RANK() OVER (ORDER BY SUM(rt.points_earned) DESC) AS rank_position,
        SUM(rt.points_earned) AS total_points,
        COUNT(*) AS total_items,
        COUNT(*) OVER () AS total_students
    FROM recycling_transactions rt
    WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY rt.user_id
)
SELECT 
    rank_position,
    total_points,
    total_items,
    total_students,
    ROUND(((total_students - rank_position) / total_students) * 100, 0) AS percentile
FROM ranked_users
WHERE user_id = 'U022'; -- User ID for Ali bin Ahmad

-- ============================================
-- ENHANCE DATA FOR BETTER RANKING
-- ============================================

-- 1. Add more varied points data to ensure "Points to Next" is never 0
UPDATE recycling_transactions 
SET points_earned = points_earned + FLOOR(RAND() * 10) + 5
WHERE user_id IN ('U022', 'U010', 'U029', 'U025', 'U014', 'U015', 'U016');

-- 2. Create gaps in points to ensure rank differences
-- Add some high-scoring transactions for top performers
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- User U006 (Ahmad Kamal) - currently has fewer points
('U006', 'plastic', 5.0, 100, '2024-03-08'),
('U006', 'paper', 4.5, 90, '2024-03-09'),
-- User U011 (Chin Mei Ling)
('U011', 'glass', 3.2, 64, '2024-03-07'),
('U011', 'metal', 2.8, 56, '2024-03-08'),
-- User U012 (David Tan)
('U012', 'plastic', 4.8, 96, '2024-03-09'),
('U012', 'paper', 3.7, 74, '2024-03-10');

-- 4. Create realistic point gaps for ranking
-- Add transactions to create proper point differences
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Top performers get extra points
('U029', 'plastic', 6.5, 130, '2024-03-09'),
('U025', 'paper', 5.8, 116, '2024-03-10'),
-- Middle tier gets moderate points
('U010', 'glass', 4.2, 84, '2024-03-08'),
('U014', 'metal', 3.5, 70, '2024-03-09'),
-- Lower tier gets fewer points
('U015', 'plastic', 2.8, 56, '2024-03-07'),
('U016', 'paper', 2.0, 40, '2024-03-08');

-- 5. Verify points to next calculation
WITH ranked_users AS (
    SELECT 
        user_id,
        SUM(points_earned) AS total_points,
        RANK() OVER (ORDER BY SUM(points_earned) DESC) AS rank_position
    FROM recycling_transactions
    WHERE transaction_date >= '2024-01-01'
    GROUP BY user_id
),
user_rank AS (
    SELECT rank_position, total_points AS user_points
    FROM ranked_users WHERE user_id = 'U022' -- Ali bin Ahmad
),
next_rank AS (
    SELECT MIN(total_points) AS next_points
    FROM ranked_users 
    WHERE total_points > (SELECT user_points FROM user_rank)
)
SELECT 
    (SELECT rank_position FROM user_rank) AS user_rank,
    (SELECT next_points FROM next_rank) AS next_rank_points,
    (SELECT user_points FROM user_rank) AS user_points,
    COALESCE(
        (SELECT next_points FROM next_rank) - (SELECT user_points FROM user_rank),
        100
    ) AS points_to_next;

-- ============================================
-- ENHANCED DATA FOR MARCH 4-10, 2024
-- ============================================

-- Check existing data for this period
SELECT 'Existing data for March 4-10' as message;
SELECT 
    transaction_date,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(points_earned) as total_points
FROM recycling_transactions
WHERE transaction_date BETWEEN '2024-03-04' AND '2024-03-10'
GROUP BY transaction_date
ORDER BY transaction_date;

-- Add comprehensive additional data for each day of the week
-- Monday, March 4 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Additional FKE users
('U029', 'plastic', 1.5, 30, '2024-03-04'),
('U025', 'metal', 0.8, 16, '2024-03-04'),
-- Additional FS users
('U010', 'glass', 1.2, 24, '2024-03-04'),
('U011', 'paper', 1.8, 36, '2024-03-04'),
-- Additional users from other faculties
('U014', 'plastic', 2.0, 40, '2024-03-04'),
('U018', 'paper', 1.5, 30, '2024-03-04');

-- Tuesday, March 5 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Additional data for user U022 (Ali bin Ahmad)
('U022', 'metal', 0.7, 14, '2024-03-05'),
-- FKE faculty
('U029', 'paper', 2.2, 44, '2024-03-05'),
('U025', 'glass', 1.3, 26, '2024-03-05'),
-- FS faculty
('U010', 'plastic', 1.8, 36, '2024-03-05'),
('U012', 'metal', 0.9, 18, '2024-03-05'),
-- Others
('U015', 'paper', 2.5, 50, '2024-03-05');

-- Wednesday, March 6 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- User U022 additional
('U022', 'paper', 1.8, 36, '2024-03-06'),
-- FKE
('U029', 'plastic', 2.5, 50, '2024-03-06'),
('U025', 'metal', 1.1, 22, '2024-03-06'),
-- FS
('U010', 'glass', 1.6, 32, '2024-03-06'),
('U011', 'plastic', 2.0, 40, '2024-03-06'),
-- More diversity
('U018', 'paper', 2.8, 56, '2024-03-06'),
('U016', 'plastic', 2.2, 44, '2024-03-06');

-- Thursday, March 7 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'plastic', 1.5, 30, '2024-03-07'),
('U029', 'glass', 1.8, 36, '2024-03-07'),
('U025', 'paper', 2.3, 46, '2024-03-07'),
('U010', 'metal', 1.0, 20, '2024-03-07'),
('U011', 'plastic', 2.5, 50, '2024-03-07'),
('U014', 'paper', 1.8, 36, '2024-03-07'),
('U017', 'glass', 1.5, 30, '2024-03-07');

-- Friday, March 8 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'glass', 1.2, 24, '2024-03-08'),
('U029', 'metal', 0.9, 18, '2024-03-08'),
('U025', 'plastic', 2.8, 56, '2024-03-08'),
('U010', 'paper', 2.2, 44, '2024-03-08'),
('U012', 'glass', 1.5, 30, '2024-03-08'),
('U018', 'metal', 1.3, 26, '2024-03-08'),
('U019', 'plastic', 2.0, 40, '2024-03-08');

-- Saturday, March 9 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'metal', 0.8, 16, '2024-03-09'),
('U029', 'plastic', 2.3, 46, '2024-03-09'),
('U025', 'paper', 1.9, 38, '2024-03-09'),
('U010', 'glass', 1.4, 28, '2024-03-09'),
('U013', 'plastic', 2.5, 50, '2024-03-09'),
('U020', 'paper', 2.2, 44, '2024-03-09'),
('U021', 'glass', 1.6, 32, '2024-03-09');

-- Sunday, March 10 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
('U022', 'glass', 1.3, 26, '2024-03-10'),
('U029', 'paper', 2.0, 40, '2024-03-10'),
('U025', 'plastic', 2.2, 44, '2024-03-10'),
('U010', 'metal', 0.7, 14, '2024-03-10'),
('U014', 'paper', 1.8, 36, '2024-03-10'),
('U016', 'glass', 1.2, 24, '2024-03-10'),
('U023', 'plastic', 2.5, 50, '2024-03-10');

-- Add faculty comparison data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- FK (Computing) faculty
('U031', 'plastic', 2.8, 56, '2024-03-04'),
('U031', 'paper', 2.0, 40, '2024-03-07'),
('U032', 'glass', 1.5, 30, '2024-03-05'),
('U032', 'metal', 1.2, 24, '2024-03-09'),
-- FKM (Management) faculty
('U036', 'plastic', 2.0, 40, '2024-03-04'),
('U036', 'paper', 1.8, 36, '2024-03-08'),
('U037', 'glass', 1.3, 26, '2024-03-06'),
('U037', 'metal', 1.0, 20, '2024-03-10');

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

SELECT 'Enhanced data summary for March 4-10' as message;
SELECT 
    DAYNAME(rt.transaction_date) as day,
    COUNT(DISTINCT rt.user_id) as unique_users,
    COUNT(*) as total_transactions,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity), 1) as total_kg
FROM recycling_transactions rt
WHERE rt.transaction_date BETWEEN '2024-03-04' AND '2024-03-10'
GROUP BY DAYNAME(rt.transaction_date), DAYOFWEEK(rt.transaction_date)
ORDER BY DAYOFWEEK(rt.transaction_date);

SELECT 'Faculty participation for March 4-10' as message;
SELECT 
    s.faculty,
    COUNT(DISTINCT rt.user_id) as participating_students,
    COUNT(*) as total_transactions,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity), 1) as total_kg
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2024-03-04' AND '2024-03-10'
GROUP BY s.faculty
ORDER BY total_points DESC;

-- ============================================
-- FINAL DATABASE SUMMARY
-- ============================================

SELECT '=== FINAL DATABASE SUMMARY ===' as message;

SELECT 'Total Users' as metric, COUNT(*) as value FROM User
UNION ALL
SELECT 'Total Students', COUNT(*) FROM Student
UNION ALL
SELECT 'Total Admins', COUNT(*) FROM Admin
UNION ALL
SELECT 'Total Recycling Transactions', COUNT(*) FROM recycling_transactions
UNION ALL
SELECT 'Total Events', COUNT(*) FROM Event
UNION ALL
SELECT 'Total Event Participants', COUNT(*) FROM Participation;

SELECT '✅ All additional queries and data enhancements completed!' as Message;

-- ============================================
-- INSERT EVENTS (Module 2 Data)
-- ============================================

INSERT INTO Event (eventTitle, eventDescription, eventCategory, eventStartDate, eventEndDate, rewardPoints, UTMMeritPoints, status, createdBy) VALUES
('Earth Day Recycling Drive 2025', 'Annual campus-wide recycling collection event', 'Recycling Drive', '2025-04-22', '2025-04-24', 50, 5, 'Completed', 'ADM001'),
('Plastic-Free Campus Campaign', 'Reduce single-use plastics initiative', 'Clean-Up Campaign', '2025-03-01', '2025-03-15', 100, 10, 'Completed', 'ADM002'),
('E-Waste Collection Week', 'Electronic waste collection event', 'Recycling Drive', '2025-05-15', '2025-05-22', 75, 8, 'Completed', 'ADM001'),
('Sustainability Awareness Talk', 'Educational session on sustainability', 'Awareness Talk', '2025-06-10', '2025-06-10', 25, 3, 'Completed', 'ADM003'),
('Green Week 2025', 'Environmental activities week', 'Clean-Up Campaign', '2025-09-01', '2025-09-07', 50, 15, 'Upcoming', 'ADM002'),
('Paper Recycling Challenge', 'Departmental paper collection competition', 'Recycling Drive', '2025-07-01', '2025-07-15', 30, 20, 'Ongoing', 'ADM004'),
('Climate Action Workshop', 'Carbon footprint workshop', 'Awareness Talk', '2025-05-05', '2025-05-05', 30, 3, 'Completed', 'ADM003'),
('Zero Waste Campus Initiative', 'Waste minimization program', 'Clean-Up Campaign', '2025-08-01', '2025-08-15', 50, 18, 'Upcoming', 'ADM001'),
('Tree Planting Day 2025', 'Campus tree planting activity', 'Environment', '2025-02-14', '2025-02-14', 50, 8, 'Completed', 'ADM002'),
('Water Conservation Campaign', 'Save water awareness campaign', 'Conservation', '2025-01-15', '2025-01-25', 40, 12, 'Completed', 'ADM003'),
('Energy Saving Challenge', 'Reduce electricity consumption', 'Conservation', '2025-04-01', '2025-04-15', 60, 15, 'Completed', 'ADM001'),
('Community Garden Project', 'Establish community garden on campus', 'Environment', '2025-03-15', '2025-03-30', 80, 20, 'Completed', 'ADM004'),
('Campus Bike Week 2025', 'Promote cycling as sustainable campus transport', 'Sustainable Transport', '2025-03-10', '2025-03-16', 80, 8, 'Completed', 'ADM001'),
('Electric Vehicle Awareness Day', 'Showcase EV benefits and campus charging stations', 'Sustainable Transport', '2025-05-20', '2025-05-20', 60, 6, 'Completed', 'ADM002'),
('Walk-to-Campus Challenge', 'Encourage walking to campus for one week', 'Sustainable Transport', '2025-06-01', '2025-06-07', 70, 12, 'Completed', 'ADM003');

-- ============================================
-- INSERT PARTICIPATION RECORDS
-- ============================================

-- Event 1: Earth Day Recycling Drive - CORRECTED
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23BU0001', 1, 'Completed', 50, 5, 'ADM001'),
('A23BU0002', 1, 'Completed', 50, 5, 'ADM001'),
('A23BU0003', 1, 'Completed', 50, 5, 'ADM001'),
('A23EN0004', 1, 'Completed', 50, 5, 'ADM001'),
('A23EN0001', 1, 'Completed', 50, 5, 'ADM001'),
('A23SH0002', 1, 'Completed', 50, 5, 'ADM001'),  
('A23SH0003', 1, 'Completed', 50, 5, 'ADM001'),
('A23SH0001', 1, 'Completed', 50, 5, 'ADM001'),
('A23ED0001', 1, 'Completed', 50, 5, 'ADM001');


-- Event 2: Plastic-Free Campus Campaign
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0003', 2, 'Completed', 100, 10, 'ADM002'),
('A23EN0004', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0003', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0004', 2, 'Completed', 100, 10, 'ADM002'),
('A23SH0001', 2, 'Completed', 100, 10, 'ADM002'),
('A23SH0002', 2, 'Completed', 100, 10, 'ADM002'),
('A23ED0001', 2, 'Completed', 100, 10, 'ADM002'),
('A23SP0001', 2, 'Completed', 100, 10, 'ADM002');

-- Event 3: E-Waste Collection Week
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0005', 3, 'Completed', 75, 8, 'ADM001'),
('A23EN0006', 3, 'Completed', 75, 8, 'ADM001'),
('A23CS0005', 3, 'Completed', 75, 8, 'ADM001'),
('A23CP0003', 3, 'Completed', 75, 8, 'ADM001'),
('A23CP0004', 3, 'Completed', 75, 8, 'ADM001'),
('A23KT0002', 3, 'Completed', 75, 8, 'ADM001');

-- Event 4: Sustainability Awareness Talk
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0001', 4, 'Completed', 25, 3, 'ADM003'),
('A23EN0007', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0006', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0007', 4, 'Completed', 25, 3, 'ADM003'),
('A23BU0003', 4, 'Completed', 25, 3, 'ADM003'),
('A23KT0003', 4, 'Completed', 25, 3, 'ADM003'),
('A23KT0004', 4, 'Completed', 25, 3, 'ADM003'),
('A23CP0005', 4, 'Completed', 25, 3, 'ADM003'),
('A23MG0002', 4, 'Completed', 25, 3, 'ADM003'),
('A23MG0003', 4, 'Completed', 25, 3, 'ADM003');



-- Event 6: Paper Recycling Challenge (Ongoing)
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0002', 6, 'Attended', 30, 20, 'ADM004'),
('A23EN0008', 6, 'Attended', 30, 20, 'ADM004'),
('A23CS0002', 6, 'Attended', 30, 20, 'ADM004'),
('A23CS0005', 6, 'Attended', 30, 20, 'ADM004'),
('A23BU0004', 6, 'Attended', 30, 20, 'ADM004'),
('A23BU0005', 6, 'Attended', 30, 20, 'ADM004'),
('A23CP0001', 6, 'Attended', 30, 20, 'ADM004'),
('A23MG0004', 6, 'Attended', 30, 20, 'ADM004');

-- Event 7: Climate Action Workshop
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0003', 7, 'Completed', 30, 3, 'ADM003'),
('A23EN0005', 7, 'Completed', 30, 3, 'ADM003'),
('A23CS0001', 7, 'Completed', 30, 3, 'ADM003'),
('A23CS0003', 7, 'Completed', 30, 3, 'ADM003'),
('A23SH0003', 7, 'Completed', 30, 3, 'ADM003'),
('A23SH0004', 7, 'Completed', 30, 3, 'ADM003'),
('A23ED0002', 7, 'Completed', 30, 3, 'ADM003'),
('A23ED0003', 7, 'Completed', 30, 3, 'ADM003');

-- Event 9: Tree Planting Day
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0001', 9, 'Completed', 50, 8, 'ADM002'),
('A23EN0004', 9, 'Completed', 50, 8, 'ADM002'),
('A23CS0002', 9, 'Completed', 50, 8, 'ADM002'),
('A23CS0004', 9, 'Completed', 50, 8, 'ADM002'),
('A23BU0001', 9, 'Completed', 50, 8, 'ADM002'),
('A23BU0003', 9, 'Completed', 50, 8, 'ADM002'),
('A23ED0004', 9, 'Completed', 50, 8, 'ADM002');

-- Event 10: Water Conservation Campaign
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0002', 10, 'Completed', 40, 12, 'ADM003'),
('A23EN0006', 10, 'Completed', 40, 12, 'ADM003'),
('A23CS0001', 10, 'Completed', 40, 12, 'ADM003'),
('A23CS0005', 10, 'Completed', 40, 12, 'ADM003'),
('A23KT0005', 10, 'Completed', 40, 12, 'ADM003'),
('A23CP0002', 10, 'Completed', 40, 12, 'ADM003'),
('A23CP0004', 10, 'Completed', 40, 12, 'ADM003'),
('A23MD0001', 10, 'Completed', 40, 12, 'ADM003');

-- Event 11: Energy Saving Challenge
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0001', 11, 'Completed', 60, 15, 'ADM001'),
('A23EN0003', 11, 'Completed', 60, 15, 'ADM001'),
('A23EN0005', 11, 'Completed', 60, 15, 'ADM001'),
('A23EN0007', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0001', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0003', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0005', 11, 'Completed', 60, 15, 'ADM001'),
('A23KT0001', 11, 'Completed', 60, 15, 'ADM001'),
('A23KT0003', 11, 'Completed', 60, 15, 'ADM001'),
('A23CP0003', 11, 'Completed', 60, 15, 'ADM001');

-- Event 12: Community Garden Project
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0003', 12, 'Completed', 80, 20, 'ADM004'),
('A23MG0002', 12, 'Completed', 80, 20, 'ADM004'),
('A23SH0001', 12, 'Completed', 80, 20, 'ADM004'),
('A23ED0003', 12, 'Completed', 80, 20, 'ADM004');

-- Event 13: Campus Bike Week
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0001', 13, 'Completed', 80, 8, 'ADM001'),
('A23EN0002', 13, 'Completed', 80, 8, 'ADM001'),
('A23EN0004', 13, 'Completed', 80, 8, 'ADM001'),
('A23CS0002', 13, 'Completed', 80, 8, 'ADM001'),
('A23CS0006', 13, 'Completed', 80, 8, 'ADM001'),
('A23CP0001', 13, 'Completed', 80, 8, 'ADM001'),
('A23CP0005', 13, 'Completed', 80, 8, 'ADM001'),
('A23MG0003', 13, 'Completed', 80, 8, 'ADM001'),
('A23MG0005', 13, 'Completed', 80, 8, 'ADM001');

-- Event 14: Electric Vehicle Awareness Day
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0003', 14, 'Completed', 60, 6, 'ADM002'),
('A23EN0005', 14, 'Completed', 60, 6, 'ADM002'),
('A23EN0008', 14, 'Completed', 60, 6, 'ADM002'),
('A23KT0002', 14, 'Completed', 60, 6, 'ADM002'),
('A23KT0004', 14, 'Completed', 60, 6, 'ADM002'),
('A23CP0002', 14, 'Completed', 60, 6, 'ADM002'),
('A23CP0004', 14, 'Completed', 60, 6, 'ADM002'),
('A23CS0003', 14, 'Completed', 60, 6, 'ADM002'),
('A23MG0001', 14, 'Completed', 60, 6, 'ADM002');

-- Event 15: Walk-to-Campus Challenge
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23EN0001', 15, 'Completed', 70, 12, 'ADM003'),
('A23EN0002', 15, 'Completed', 70, 12, 'ADM003'),
('A23EN0006', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0001', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0004', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0007', 15, 'Completed', 70, 12, 'ADM003'),
('A23BU0003', 15, 'Completed', 70, 12, 'ADM003'),
('A23BU0004', 15, 'Completed', 70, 12, 'ADM003'),
('A23KT0001', 15, 'Completed', 70, 12, 'ADM003'),
('A23KT0003', 15, 'Completed', 70, 12, 'ADM003'),
('A23CP0002', 15, 'Completed', 70, 12, 'ADM003'),
('A23CP0005', 15, 'Completed', 70, 12, 'ADM003'),
('A23MG0002', 15, 'Completed', 70, 12, 'ADM003'),
('A23MG0004', 15, 'Completed', 70, 12, 'ADM003'),
('A23SH0002', 15, 'Completed', 70, 12, 'ADM003'),
('A23ED0001', 15, 'Completed', 70, 12, 'ADM003'),
('A23SP0001', 15, 'Completed', 70, 12, 'ADM003'),
('A23SP0003', 15, 'Completed', 70, 12, 'ADM003');

-- ============================================
-- UPDATE STUDENT POINTS FROM PARTICIPATION
-- ============================================

-- Create temporary table for calculated points
CREATE TEMPORARY TABLE IF NOT EXISTS TempStudentPoints (
    studentID VARCHAR(20) PRIMARY KEY,
    calculatedPoints INT DEFAULT 0,
    calculatedMerits INT DEFAULT 0
);

-- Insert calculated points into temporary table
INSERT INTO TempStudentPoints (studentID, calculatedPoints, calculatedMerits)
SELECT 
    p.studentID,
    COALESCE(SUM(p.rewardPointsEarned), 0) as totalPoints,
    COALESCE(SUM(p.meritPointsAwarded), 0) as totalMerits
FROM Participation p
WHERE p.participationStatus = 'Completed'
GROUP BY p.studentID;

-- Update Student table using the temporary table
UPDATE Student s
INNER JOIN TempStudentPoints tsp ON s.studentID = tsp.studentID
SET s.totalPoints = tsp.calculatedPoints,
    s.totalMerits = tsp.calculatedMerits
WHERE s.studentID = tsp.studentID;

-- Drop temporary table
DROP TEMPORARY TABLE IF EXISTS TempStudentPoints;

-- ============================================
-- INSERT CAMPAIGN ANALYTICS
-- ============================================

INSERT INTO CampaignAnalytics (eventID, participants, pointsCollected, goalPercent, averagePoints, snapshotDate) VALUES
(1, 10, 500, 100.00, 50.00, '2025-04-25'),
(2, 8, 800, 100.00, 100.00, '2025-03-16'),
(3, 6, 450, 100.00, 75.00, '2025-05-23'),
(4, 10, 250, 100.00, 25.00, '2025-06-11'),
(5, 0, 0, 0.00, 0.00, '2025-09-01'),
(6, 5, 1000, 100.00, 30.00, CURDATE()),
(7, 6, 180, 100.00, 30.00, '2025-05-06'),
(8, 0, 0, 0.00, 0.00, '2025-08-01'),
(9, 5, 400, 100.00, 50.00, '2025-02-15'),
(10, 5, 600, 100.00, 40.00, '2025-01-26'),
(11, 7, 1050, 100.00, 60.00, '2025-04-16'),
(12, 5, 1000, 100.00, 80.00, '2025-03-31'),
(13, 5, 400, 100.00, 80.00, '2025-03-17'),
(14, 5, 300, 100.00, 60.00, '2025-05-21'),
(15, 6, 720, 100.00, 70.00, '2025-06-08');

-- ============================================
-- INSERT ANALYTICS REPORTS
-- ============================================

INSERT INTO AnalyticsReport (reportTitle, reportType, createdBy, reportConfig, reportData, downloadCount) VALUES
('Earth Day 2025 Performance Report', 'Single campaign', 'ADM001', 
 '{"eventID": 1, "metrics": ["participants", "pointsCollected", "goalPercent"]}',
 '{"summary": "Achieved 100% target with 10 participants", "insights": ["Excellent participation rate"]}', 15),
('Semester 1 2025 Comparative Analysis', 'Comparative analysis', 'ADM003',
 '{"events": [1,2,3,4,7,9,10,11,12,13,14,15], "comparisonMetrics": ["goalPercent", "averagePoints"]}',
 '{"ranking": [2,1,3,4], "bestPractice": "All events achieved 100% target"}', 8),
('UTM ReMerit Semester Summary Report 2025', 'Semester Summary', 'ADM001',
 '{"semester": "2025-1", "includeAllEvents": true}',
 '{"totalEvents": 15, "completedEvents": 12, "totalParticipants": 82, "totalPoints": 6600}', 23);

-- ============================================
-- CREATE VIEWS
-- ============================================

CREATE OR REPLACE VIEW DashboardSummary AS
SELECT 
    COUNT(DISTINCT e.eventID) as totalCampaigns,
    SUM(CASE WHEN e.status = 'Completed' THEN 1 ELSE 0 END) as completedCampaigns,
    SUM(CASE WHEN e.status = 'Ongoing' THEN 1 ELSE 0 END) as ongoingCampaigns,
    SUM(CASE WHEN e.status = 'Upcoming' THEN 1 ELSE 0 END) as upcomingCampaigns,
    COALESCE(SUM(ca.participants), 0) as totalParticipants,
    COALESCE(SUM(ca.pointsCollected), 0) as totalPointsCollected,
    COALESCE(AVG(ca.goalPercent), 0) as avgGoalAchievement,
    COALESCE(AVG(ca.averagePoints), 0) as avgPointsPerParticipant
FROM Event e
LEFT JOIN CampaignAnalytics ca ON e.eventID = ca.eventID;

CREATE OR REPLACE VIEW CampaignDetails AS
SELECT 
    e.eventID,
    e.eventTitle,
    e.eventDescription,
    e.eventCategory,
    e.eventStartDate,
    e.eventEndDate,
    e.rewardPoints,
    e.UTMMeritPoints,
    e.status,
    e.createdBy,
    ca.participants,
    ca.pointsCollected,
    ca.goalPercent,
    ca.averagePoints,
    ca.snapshotDate,
    ca.calculatedAt,
    (SELECT COUNT(*) FROM Participation p WHERE p.eventID = e.eventID) as totalRegistrations,
    (SELECT COUNT(*) FROM Participation p WHERE p.eventID = e.eventID AND p.participationStatus = 'Completed') as completedParticipants,
    u.fullName as createdByName
FROM Event e
LEFT JOIN CampaignAnalytics ca ON e.eventID = ca.eventID
LEFT JOIN Admin a ON e.createdBy = a.adminID
LEFT JOIN User u ON a.userID = u.userID;

DROP VIEW IF EXISTS CategoryPerformance;
CREATE OR REPLACE VIEW CategoryPerformance AS
SELECT 
    e.eventCategory,
    COUNT(DISTINCT e.eventID) as totalCampaigns,
    COUNT(DISTINCT CASE WHEN e.status = 'Completed' THEN e.eventID END) as completedCampaigns,
    COALESCE(SUM(ca.participants), 0) as totalParticipants,
    COALESCE(SUM(ca.pointsCollected), 0) as totalPointsCollected,
    COALESCE(AVG(ca.goalPercent), 0) as avgGoalAchievement,
    COALESCE(AVG(ca.averagePoints), 0) as avgPointsPerParticipant,
    COALESCE(MIN(ca.goalPercent), 0) as minGoalAchievement,
    COALESCE(MAX(ca.goalPercent), 0) as maxGoalAchievement
FROM Event e
LEFT JOIN CampaignAnalytics ca ON e.eventID = ca.eventID
WHERE e.eventCategory IS NOT NULL
GROUP BY e.eventCategory;

CREATE OR REPLACE VIEW TopPerformingCampaigns AS
SELECT 
    e.eventID,
    e.eventTitle,
    e.eventCategory,
    e.eventStartDate,
    e.eventEndDate,
    ca.participants,
    ca.pointsCollected,
    ca.goalPercent,
    ca.averagePoints,
    RANK() OVER (ORDER BY ca.goalPercent DESC) as performanceRank,
    CASE 
        WHEN ca.goalPercent >= 90 THEN 'Excellent'
        WHEN ca.goalPercent >= 70 THEN 'Good'
        WHEN ca.goalPercent >= 50 THEN 'Average'
        ELSE 'Needs Improvement'
    END as performanceCategory
FROM Event e
JOIN CampaignAnalytics ca ON e.eventID = ca.eventID
WHERE e.status = 'Completed'
ORDER BY ca.goalPercent DESC;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER //
CREATE TRIGGER trg_update_analytics_after_participation
AFTER UPDATE ON Participation
FOR EACH ROW
BEGIN
    IF NEW.participationStatus = 'Completed' AND OLD.participationStatus != 'Completed' THEN
        UPDATE CampaignAnalytics ca
        SET 
            participants = (
                SELECT COUNT(*) 
                FROM Participation 
                WHERE eventID = NEW.eventID 
                AND participationStatus = 'Completed'
            ),
            pointsCollected = (
                SELECT SUM(rewardPointsEarned) 
                FROM Participation 
                WHERE eventID = NEW.eventID 
                AND participationStatus = 'Completed'
            ),
            averagePoints = (
                SELECT AVG(rewardPointsEarned) 
                FROM Participation 
                WHERE eventID = NEW.eventID 
                AND participationStatus = 'Completed'
                AND rewardPointsEarned > 0
            ),
            goalPercent = (
                SELECT (SUM(rewardPointsEarned) / (COUNT(*) * (
                    SELECT rewardPoints FROM Event WHERE eventID = NEW.eventID
                ))) * 100
                FROM Participation 
                WHERE eventID = NEW.eventID 
                AND participationStatus = 'Completed'
            ),
            calculatedAt = NOW(),
            snapshotDate = CURDATE()
        WHERE ca.eventID = NEW.eventID;
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER trg_save_completion_snapshot
AFTER UPDATE ON Event
FOR EACH ROW
BEGIN
    IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
        INSERT INTO CampaignAnalyticsSnapshot (
            eventID, participants, pointsCollected, 
            goalPercent, averagePoints, snapshotDate, snapshotType
        )
        SELECT 
            ca.eventID, ca.participants, ca.pointsCollected,
            ca.goalPercent, ca.averagePoints, CURDATE(), 'Completion'
        FROM CampaignAnalytics ca
        WHERE ca.eventID = NEW.eventID;
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER trg_create_analytics_on_event_insert
AFTER INSERT ON Event
FOR EACH ROW
BEGIN
    INSERT INTO CampaignAnalytics (eventID, snapshotDate)
    VALUES (NEW.eventID, CURDATE());
END //
DELIMITER ;

-- ============================================
-- TEST QUERIES
-- ============================================

SELECT '=== Database Statistics ===' as Message;
SELECT CONCAT('Total Users: ', COUNT(*)) as stats FROM User;
SELECT CONCAT('Total Students: ', COUNT(*)) as stats FROM Student;
SELECT CONCAT('Total Admins: ', COUNT(*)) as stats FROM Admin;
SELECT CONCAT('Total Events: ', COUNT(*)) as stats FROM Event;
SELECT CONCAT('Completed Events: ', COUNT(*)) as stats FROM Event WHERE status = 'Completed';
SELECT CONCAT('Total Participation Records: ', COUNT(*)) as stats FROM Participation;
SELECT CONCAT('Total Points Awarded: ', SUM(totalPoints)) as stats FROM Student;
SELECT CONCAT('Total Analytics Records: ', COUNT(*)) as stats FROM CampaignAnalytics;

SELECT '=== Dashboard Summary ===' as Message;
SELECT * FROM DashboardSummary;

SELECT '=== Top 5 Campaigns ===' as Message;
SELECT * FROM TopPerformingCampaigns LIMIT 5;

SELECT '=== Category Performance ===' as Message;
SELECT * FROM CategoryPerformance ORDER BY avgGoalAchievement DESC;

-- ============================================
-- ADDITIONAL TABLES FOR LEADERBOARD & REWARD MODULE
-- ============================================

-- Conversion History Table
CREATE TABLE IF NOT EXISTS conversion_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    reward_points INT NOT NULL,
    merit_points DECIMAL(10,2) NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP NULL,
    rejection_reason TEXT,
    processed_by VARCHAR(20),
    conversion_rate INT DEFAULT 100,
    
    FOREIGN KEY (student_id) REFERENCES Student(studentID) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES Admin(adminID) ON DELETE SET NULL,
    
    INDEX idx_conversion_status (status),
    INDEX idx_conversion_date (request_date),
    INDEX idx_conversion_student (student_id),
    INDEX idx_conversion_processed_date (processed_date)
);

-- Merit Transactions Table
CREATE TABLE IF NOT EXISTS merit_transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    transaction_type ENUM('Event Reward', 'Conversion Approval', 'Manual Adjustment'),
    reward_points INT DEFAULT 0,
    merit_points DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES Student(studentID) ON DELETE CASCADE,
    
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_student (student_id),
    INDEX idx_transaction_type (transaction_type)
);

-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, value, description) VALUES
('conversion_rate', '100', 'Reward Points needed for 1 Merit Point'),
('min_conversion', '100', 'Minimum Reward Points for conversion'),
('auto_approval_threshold', 'disabled', 'Auto-approval feature status'),
('leaderboard_reset_day', 'sunday', 'Day of week for leaderboard reset'),
('week_start_day', 'monday', 'Start day of the week for calculations')
ON DUPLICATE KEY UPDATE 
    value = VALUES(value),
    updated_at = CURRENT_TIMESTAMP;

-- Sample conversion history data
INSERT INTO conversion_history (student_id, reward_points, merit_points, status, request_date, processed_date, rejection_reason) VALUES
-- Approved conversions
('A23EN0001', 250, 2.5, 'Approved', '2024-01-20 10:30:00', '2024-01-20 14:45:00', NULL),
('A23CS0006', 100, 1.0, 'Approved', '2024-01-18 09:15:00', '2024-01-18 11:20:00', NULL),

-- Rejected conversions
('A23SH0001', 150, 1.5, 'Rejected', '2024-01-15 13:45:00', '2024-01-15 16:30:00', 'Insufficient activity proof'),

-- Pending conversions (for testing)
('A23EN0001', 150, 1.5, 'Pending', '2024-01-25 09:00:00', NULL, NULL),
('A23CS0006', 200, 2.0, 'Pending', '2024-01-25 10:30:00', NULL, NULL);

-- Update student points based on participation (run this to calculate initial points)
UPDATE Student s
SET s.totalPoints = (
    SELECT COALESCE(SUM(p.rewardPointsEarned), 0)
    FROM Participation p
    WHERE p.studentID = s.studentID
        AND p.participationStatus = 'Completed'
),
s.totalMerits = (
    SELECT COALESCE(SUM(p.meritPointsAwarded), 0)
    FROM Participation p
    WHERE p.studentID = s.studentID
        AND p.participationStatus = 'Completed'
)
WHERE s.studentID IN (
    SELECT DISTINCT studentID 
    FROM Participation 
    WHERE participationStatus = 'Completed'
);

-- new recycling transaction for testing leaderboard & reward updates
-- ============================================
-- COMPREHENSIVE DATA INSERTION FOR UTM REMERIT
-- ============================================

USE utm_remerit;

-- Disable foreign key checks for easier insertion
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- 1. FIRST, UPDATE EXISTING STUDENT POINTS
-- ============================================

-- Update student points based on participation
UPDATE Student s
SET s.totalPoints = (
    SELECT COALESCE(SUM(p.rewardPointsEarned), 0)
    FROM Participation p
    WHERE p.studentID = s.studentID
        AND p.participationStatus = 'Completed'
),
s.totalMerits = (
    SELECT COALESCE(SUM(p.meritPointsAwarded), 0)
    FROM Participation p
    WHERE p.studentID = s.studentID
        AND p.participationStatus = 'Completed'
);

-- Check results
SELECT 'Student points updated' as Status, COUNT(*) as Students FROM Student WHERE totalPoints > 0;

-- ============================================
-- 2. INSERT SYSTEM SETTINGS IF NOT EXISTS
-- ============================================

INSERT IGNORE INTO system_settings (setting_key, value, description) VALUES
('conversion_rate', '100', 'Reward Points needed for 1 Merit Point'),
('min_conversion', '100', 'Minimum Reward Points for conversion'),
('auto_approval_threshold', 'disabled', 'Auto-approval feature status'),
('leaderboard_reset_day', 'sunday', 'Day of week for leaderboard reset'),
('week_start_day', 'monday', 'Start day of the week for calculations');

-- ============================================
-- 3. INSERT COMPREHENSIVE CONVERSION HISTORY
-- ============================================

-- Clear existing conversion history
DELETE FROM conversion_history;

-- Insert comprehensive conversion history data
INSERT INTO conversion_history (student_id, reward_points, merit_points, status, request_date, processed_date, rejection_reason) VALUES
-- ========== APPROVED CONVERSIONS ==========
('A23EN0001', 250, 2.5, 'Approved', '2024-01-20 10:30:00', '2024-01-20 14:45:00', NULL),
('A23CS0006', 100, 1.0, 'Approved', '2024-01-18 09:15:00', '2024-01-18 11:20:00', NULL),
('A23CS0001', 300, 3.0, 'Approved', '2024-01-22 13:20:00', '2024-01-22 16:30:00', NULL),
('A23EN0004', 150, 1.5, 'Approved', '2024-01-19 14:10:00', '2024-01-19 17:25:00', NULL),
('A23CS0002', 200, 2.0, 'Approved', '2024-01-17 11:45:00', '2024-01-17 15:10:00', NULL),
('A23BU0001', 100, 1.0, 'Approved', '2024-01-16 09:30:00', '2024-01-16 12:45:00', NULL),
('A23KT0001', 250, 2.5, 'Approved', '2024-01-21 15:20:00', '2024-01-21 18:35:00', NULL),
('A23SH0001', 150, 1.5, 'Approved', '2024-01-23 10:15:00', '2024-01-23 13:40:00', NULL),
('A23ED0001', 100, 1.0, 'Approved', '2024-01-24 08:45:00', '2024-01-24 11:55:00', NULL),
('A23SP0001', 200, 2.0, 'Approved', '2024-01-25 16:30:00', '2024-01-25 19:45:00', NULL),

-- ========== REJECTED CONVERSIONS ==========
('A23SH0001', 150, 1.5, 'Rejected', '2024-01-15 13:45:00', '2024-01-15 16:30:00', 'Insufficient activity proof'),
('A23CS0003', 100, 1.0, 'Rejected', '2024-01-14 10:20:00', '2024-01-14 13:15:00', 'Suspected duplicate submission'),
('A23EN0002', 200, 2.0, 'Rejected', '2024-01-13 14:35:00', '2024-01-13 17:20:00', 'Incomplete documentation'),
('A23BU0002', 150, 1.5, 'Rejected', '2024-01-12 11:10:00', '2024-01-12 14:05:00', 'Activity outside validity period'),
('A23KT0002', 100, 1.0, 'Rejected', '2024-01-11 09:25:00', '2024-01-11 12:30:00', 'Insufficient evidence provided'),

-- ========== PENDING CONVERSIONS ==========
('A23EN0001', 150, 1.5, 'Pending', '2024-01-25 09:00:00', NULL, NULL),
('A23CS0006', 200, 2.0, 'Pending', '2024-01-25 10:30:00', NULL, NULL),
('A23CS0001', 100, 1.0, 'Pending', '2024-01-25 11:45:00', NULL, NULL),
('A23EN0004', 250, 2.5, 'Pending', '2024-01-25 13:20:00', NULL, NULL),
('A23CS0002', 150, 1.5, 'Pending', '2024-01-25 14:35:00', NULL, NULL),
('A23BU0001', 200, 2.0, 'Pending', '2024-01-26 08:15:00', NULL, NULL),
('A23KT0001', 100, 1.0, 'Pending', '2024-01-26 09:40:00', NULL, NULL),
('A23SH0001', 300, 3.0, 'Pending', '2024-01-26 11:25:00', NULL, NULL);

-- ============================================
-- 4. INSERT MERIT TRANSACTIONS
-- ============================================

-- Clear existing merit transactions
DELETE FROM merit_transactions;

-- Insert merit transactions for all students
INSERT INTO merit_transactions (student_id, transaction_type, reward_points, merit_points, description) VALUES
-- Event-based transactions
('A23EN0001', 'Event Reward', 50, 5, 'Earth Day Recycling Drive 2025'),
('A23EN0001', 'Event Reward', 100, 10, 'Plastic-Free Campus Campaign'),
('A23EN0001', 'Event Reward', 50, 8, 'Tree Planting Day 2025'),
('A23EN0001', 'Event Reward', 60, 15, 'Energy Saving Challenge'),
('A23EN0001', 'Event Reward', 80, 8, 'Campus Bike Week 2025'),
('A23EN0001', 'Event Reward', 70, 12, 'Walk-to-Campus Challenge'),

('A23CS0006', 'Event Reward', 100, 10, 'Plastic-Free Campus Campaign'),
('A23CS0006', 'Event Reward', 25, 3, 'Sustainability Awareness Talk'),
('A23CS0006', 'Event Reward', 60, 15, 'Energy Saving Challenge'),
('A23CS0006', 'Event Reward', 80, 8, 'Campus Bike Week 2025'),

('A23CS0001', 'Event Reward', 50, 5, 'Earth Day Recycling Drive 2025'),
('A23CS0001', 'Event Reward', 30, 3, 'Climate Action Workshop'),
('A23CS0001', 'Event Reward', 40, 12, 'Water Conservation Campaign'),
('A23CS0001', 'Event Reward', 60, 15, 'Energy Saving Challenge'),
('A23CS0001', 'Event Reward', 70, 12, 'Walk-to-Campus Challenge'),

('A23EN0004', 'Event Reward', 50, 5, 'Earth Day Recycling Drive 2025'),
('A23EN0004', 'Event Reward', 50, 8, 'Tree Planting Day 2025'),
('A23EN0004', 'Event Reward', 80, 8, 'Campus Bike Week 2025'),

-- Conversion-based transactions
('A23EN0001', 'Conversion Approval', 250, 2.5, 'Conversion request #1'),
('A23EN0001', 'Conversion Approval', 150, 1.5, 'Conversion request #2'),

('A23CS0006', 'Conversion Approval', 100, 1.0, 'Conversion request #1'),
('A23CS0006', 'Conversion Approval', 200, 2.0, 'Conversion request #2'),

('A23CS0001', 'Conversion Approval', 300, 3.0, 'Conversion request #1'),
('A23CS0001', 'Conversion Approval', 100, 1.0, 'Conversion request #2'),

('A23EN0004', 'Conversion Approval', 150, 1.5, 'Conversion request #1'),
('A23EN0004', 'Conversion Approval', 250, 2.5, 'Conversion request #2');

-- ============================================
-- 5. UPDATE STUDENT POINTS FROM ALL SOURCES
-- ============================================

-- Create temporary table to calculate total points
CREATE TEMPORARY TABLE IF NOT EXISTS student_total_points AS
SELECT 
    s.studentID,
    -- Event points
    COALESCE(SUM(p.rewardPointsEarned), 0) as event_points,
    COALESCE(SUM(p.meritPointsAwarded), 0) as event_merits,
    -- Conversion merit points (approved only)
    COALESCE(SUM(CASE WHEN ch.status = 'Approved' THEN ch.merit_points ELSE 0 END), 0) as conversion_merits
FROM Student s
LEFT JOIN Participation p ON s.studentID = p.studentID AND p.participationStatus = 'Completed'
LEFT JOIN conversion_history ch ON s.studentID = ch.student_id AND ch.status = 'Approved'
GROUP BY s.studentID;

-- Update student table
UPDATE Student s
JOIN student_total_points stp ON s.studentID = stp.studentID
SET 
    s.totalPoints = stp.event_points,
    s.totalMerits = stp.event_merits + stp.conversion_merits;

-- Drop temporary table
DROP TEMPORARY TABLE IF EXISTS student_total_points;

-- ============================================
-- 6. ADD ADDITIONAL RECYCLING TRANSACTIONS
-- ============================================

-- Add more recycling transactions for current week
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Current week (March 11-17, 2024) - High activity for leaderboard
('U022', 'plastic', 5.5, 110, '2024-03-11'),
('U022', 'paper', 4.2, 84, '2024-03-11'),
('U022', 'glass', 3.8, 76, '2024-03-12'),
('U022', 'metal', 2.5, 50, '2024-03-12'),
('U022', 'plastic', 6.2, 124, '2024-03-13'),
('U022', 'paper', 5.0, 100, '2024-03-13'),

('U010', 'plastic', 4.5, 90, '2024-03-11'),
('U010', 'paper', 3.8, 76, '2024-03-12'),
('U010', 'glass', 2.5, 50, '2024-03-13'),
('U010', 'metal', 1.8, 36, '2024-03-14'),

('U011', 'plastic', 3.8, 76, '2024-03-11'),
('U011', 'paper', 4.2, 84, '2024-03-12'),
('U011', 'glass', 2.8, 56, '2024-03-13'),

('U012', 'plastic', 4.2, 84, '2024-03-11'),
('U012', 'paper', 3.5, 70, '2024-03-12'),
('U012', 'glass', 3.0, 60, '2024-03-13'),

('U006', 'plastic', 5.0, 100, '2024-03-11'),
('U006', 'paper', 4.5, 90, '2024-03-12'),
('U006', 'glass', 3.2, 64, '2024-03-13'),

('U014', 'plastic', 3.5, 70, '2024-03-11'),
('U014', 'paper', 2.8, 56, '2024-03-12'),
('U014', 'glass', 2.2, 44, '2024-03-13'),

('U015', 'plastic', 2.8, 56, '2024-03-11'),
('U015', 'paper', 3.2, 64, '2024-03-12'),

('U016', 'plastic', 3.0, 60, '2024-03-11'),
('U016', 'paper', 2.5, 50, '2024-03-12'),

('U017', 'plastic', 2.5, 50, '2024-03-11'),
('U017', 'paper', 2.0, 40, '2024-03-12'),

('U018', 'plastic', 2.0, 40, '2024-03-11'),
('U018', 'paper', 1.8, 36, '2024-03-12'),

('U019', 'plastic', 1.8, 36, '2024-03-11'),
('U019', 'paper', 1.5, 30, '2024-03-12'),

('U020', 'plastic', 1.5, 30, '2024-03-11'),
('U020', 'paper', 1.2, 24, '2024-03-12'),

('U021', 'plastic', 1.2, 24, '2024-03-11'),
('U021', 'paper', 1.0, 20, '2024-03-12');

-- ============================================
-- 7. UPDATE STUDENT POINTS WITH RECYCLING DATA
-- ============================================

-- Create temporary table for recycling points
CREATE TEMPORARY TABLE IF NOT EXISTS recycling_points AS
SELECT 
    u.userID,
    COALESCE(SUM(rt.points_earned), 0) as recycling_points
FROM User u
LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id
WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY u.userID;

-- Update student points with recycling points
UPDATE Student s
JOIN User u ON s.userID = u.userID
JOIN recycling_points rp ON u.userID = rp.userID
SET s.totalPoints = s.totalPoints + rp.recycling_points;

-- Drop temporary table
DROP TEMPORARY TABLE IF EXISTS recycling_points;

-- ============================================
-- 8. CREATE VIEWS FOR EASIER QUERIES
-- ============================================

-- View for weekly leaderboard
CREATE OR REPLACE VIEW weekly_leaderboard AS
SELECT 
    u.fullName as student_name,
    s.studentID,
    s.faculty,
    COALESCE(SUM(
        CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
        THEN rt.points_earned ELSE 0 END
    ), 0) as weekly_points,
    s.totalPoints as total_points,
    s.totalMerits as total_merits,
    RANK() OVER (ORDER BY COALESCE(SUM(
        CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
        THEN rt.points_earned ELSE 0 END
    ), 0) DESC) as weekly_rank
FROM User u
JOIN Student s ON u.userID = s.userID
LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id
WHERE u.role = 'student'
GROUP BY u.userID, u.fullName, s.studentID, s.faculty, s.totalPoints, s.totalMerits
ORDER BY weekly_points DESC;

-- View for user conversion summary
CREATE OR REPLACE VIEW user_conversion_summary AS
SELECT 
    s.studentID,
    u.fullName as student_name,
    u.utmID,
    COUNT(*) as total_conversions,
    SUM(CASE WHEN ch.status = 'Approved' THEN 1 ELSE 0 END) as approved_conversions,
    SUM(CASE WHEN ch.status = 'Rejected' THEN 1 ELSE 0 END) as rejected_conversions,
    SUM(CASE WHEN ch.status = 'Pending' THEN 1 ELSE 0 END) as pending_conversions,
    SUM(CASE WHEN ch.status = 'Approved' THEN ch.reward_points ELSE 0 END) as total_reward_points_converted,
    SUM(CASE WHEN ch.status = 'Approved' THEN ch.merit_points ELSE 0 END) as total_merit_points_earned,
    MAX(ch.request_date) as last_conversion_date
FROM Student s
JOIN User u ON s.userID = u.userID
LEFT JOIN conversion_history ch ON s.studentID = ch.student_id
GROUP BY s.studentID, u.fullName, u.utmID;

-- View for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard_summary AS
SELECT 
    COUNT(DISTINCT CASE WHEN ch.status = 'Pending' THEN ch.id END) as pending_conversions,
    COUNT(DISTINCT CASE WHEN ch.status = 'Approved' THEN ch.id END) as approved_conversions,
    COUNT(DISTINCT CASE WHEN ch.status = 'Rejected' THEN ch.id END) as rejected_conversions,
    COALESCE(SUM(CASE WHEN ch.status = 'Pending' THEN ch.reward_points ELSE 0 END), 0) as pending_reward_points,
    COALESCE(SUM(CASE WHEN ch.status = 'Pending' THEN ch.merit_points ELSE 0 END), 0) as pending_merit_points,
    (SELECT value FROM system_settings WHERE setting_key = 'conversion_rate') as current_conversion_rate
FROM conversion_history ch;

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

SELECT '=== DATABASE VERIFICATION ===' as message;

-- Check student points
SELECT '--- Top 10 Students by Total Points ---' as message;
SELECT 
    RANK() OVER (ORDER BY totalPoints DESC) as rank,
    u.fullName as student_name,
    s.studentID,
    s.faculty,
    s.totalPoints,
    s.totalMerits
FROM Student s
JOIN User u ON s.userID = u.userID
ORDER BY s.totalPoints DESC
LIMIT 10;

-- Check weekly leaderboard
SELECT '--- Weekly Leaderboard (Top 10) ---' as message;
SELECT 
    weekly_rank as rank,
    student_name,
    studentID,
    faculty,
    weekly_points,
    total_points
FROM weekly_leaderboard
WHERE weekly_rank <= 10
ORDER BY weekly_rank;

-- Check conversion status
SELECT '--- Conversion Statistics ---' as message;
SELECT 
    status,
    COUNT(*) as count,
    SUM(reward_points) as total_reward_points,
    SUM(merit_points) as total_merit_points
FROM conversion_history
GROUP BY status
ORDER BY FIELD(status, 'Pending', 'Approved', 'Rejected');

-- Check system settings
SELECT '--- System Settings ---' as message;
SELECT setting_key, value, description 
FROM system_settings 
ORDER BY setting_key;

-- Check admin dashboard summary
SELECT '--- Admin Dashboard Summary ---' as message;
SELECT * FROM admin_dashboard_summary;

-- Check individual user for testing (Ali bin Ahmad)
SELECT '--- User: Ali bin Ahmad (A23EN0001) ---' as message;
SELECT 
    u.fullName,
    u.utmID,
    s.faculty,
    s.totalPoints as total_reward_points,
    s.totalMerits as total_merit_points,
    (SELECT weekly_points FROM weekly_leaderboard WHERE studentID = s.studentID) as weekly_points,
    (SELECT weekly_rank FROM weekly_leaderboard WHERE studentID = s.studentID) as weekly_rank,
    (SELECT COUNT(*) FROM conversion_history WHERE student_id = s.studentID) as total_conversions,
    (SELECT COUNT(*) FROM conversion_history WHERE student_id = s.studentID AND status = 'Pending') as pending_conversions
FROM Student s
JOIN User u ON s.userID = u.userID
WHERE u.utmID = 'A23EN0001';

-- ============================================
-- 10. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Add indexes for better performance
CREATE INDEX idx_user_utmID ON User(utmID);
CREATE INDEX idx_student_userID ON Student(userID);
CREATE INDEX idx_conversion_student_status ON conversion_history(student_id, status);
CREATE INDEX idx_conversion_date_status ON conversion_history(request_date, status);
CREATE INDEX idx_recycling_user_date ON recycling_transactions(user_id, transaction_date);
CREATE INDEX idx_participation_student_status ON Participation(studentID, participationStatus);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- FINAL SUMMARY
-- ============================================

SELECT '✅ DATA INSERTION COMPLETE!' as message;
SELECT CONCAT('Total Students with Points: ', COUNT(*)) as summary FROM Student WHERE totalPoints > 0
UNION ALL
SELECT CONCAT('Total Pending Conversions: ', COUNT(*)) FROM conversion_history WHERE status = 'Pending'
UNION ALL
SELECT CONCAT('Total Approved Conversions: ', COUNT(*)) FROM conversion_history WHERE status = 'Approved'
UNION ALL
SELECT CONCAT('Current Conversion Rate: ', value) FROM system_settings WHERE setting_key = 'conversion_rate';