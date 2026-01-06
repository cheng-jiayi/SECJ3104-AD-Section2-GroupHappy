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
-- CREATE SAMPLE ADMIN USERS (if not exists)
-- ============================================

-- First insert the admin users into User table
INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address) VALUES
('U001', 'sarah_admin', 'hashed_pass1', 'Dr. Sarah Lim', 'ADM001', 'sarah.lim@utm.my', 'admin', '012-3456789', 'Faculty of Computing'),
('U002', 'ahmad_admin', 'hashed_pass2', 'Ahmad Faiz', 'ADM002', 'ahmad.faiz@utm.my', 'admin', '012-3456790', 'Faculty of Engineering'),
('U003', 'priya_admin', 'hashed_pass3', 'Priya Sharma', 'ADM003', 'priya.sharma@utm.my', 'admin', '012-3456791', 'Faculty of Science'),
('U004', 'wei_admin', 'hashed_pass4', 'Wei Chen', 'ADM004', 'wei.chen@utm.my', 'admin', '012-3456792', 'Faculty of Built Environment');
-- Then insert into Admin table
INSERT IGNORE INTO Admin (adminID, userID) VALUES
('ADM001', 'U001'),
('ADM002', 'U002'),
('ADM003', 'U003'),
('ADM004', 'U004');


INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address) VALUES
('U005','john123','hashed_pass5','John Doe','A23CS0001','doe.john@utm.my','student','013-3456792', 'Faculty of Built Environment');
-- ============================================
-- Auto-generate Students for UTM ReMerit
-- ============================================

-- ============================================
-- Auto-generate Students for UTM ReMerit (FIXED VERSION)
-- ============================================

DELIMITER $$

DROP PROCEDURE IF EXISTS GenerateStudents$$

CREATE PROCEDURE GenerateStudents(IN total_students INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE faculty VARCHAR(10);
    DECLARE yearOfStudy INT;
    DECLARE username VARCHAR(50);
    DECLARE fullName VARCHAR(100);
    DECLARE utmID VARCHAR(20);
    DECLARE email VARCHAR(255);
    DECLARE userID VARCHAR(36);
    DECLARE faculty_prefix VARCHAR(2);
    DECLARE faculty_counter INT DEFAULT 0;
    
    -- Temporary table to track faculty counts
    CREATE TEMPORARY TABLE IF NOT EXISTS FacultyCounts (
        faculty_code VARCHAR(10) PRIMARY KEY,
        counter INT DEFAULT 0
    );
    
    -- Initialize faculty counters
    INSERT IGNORE INTO FacultyCounts (faculty_code) VALUES 
        ('FABU'), ('FS'), ('FKT'), ('FKE'), ('FK'), ('FKM'), ('FSSH'), ('FEST'), ('FM'), ('SPACE');
    
    -- Clear existing students (optional)
    -- DELETE FROM Student;
    -- DELETE FROM User WHERE role = 'student';

    WHILE i <= total_students DO
        -- Get random faculty
        SET faculty = ELT(FLOOR(1 + (RAND() * 10)), 'FABU','FS','FKT','FKE','FK','FKM','FSSH','FEST','FM','SPACE');
        SET yearOfStudy = FLOOR(1 + (RAND() * 5));
        SET username = CONCAT('student', LPAD(i, 3, '0'));
        SET fullName = CONCAT('Student ', LPAD(i, 3, '0'));
        
        -- Get faculty prefix mapping (for consistent student IDs)
        SET faculty_prefix = CASE faculty
            WHEN 'FABU' THEN 'BU'
            WHEN 'FS' THEN 'SC'
            WHEN 'FKT' THEN 'KT'
            WHEN 'FKE' THEN 'EN'
            WHEN 'FK' THEN 'CS'
            WHEN 'FKM' THEN 'KM'
            WHEN 'FSSH' THEN 'SH'
            WHEN 'FEST' THEN 'ED'
            WHEN 'FM' THEN 'MD'
            WHEN 'SPACE' THEN 'SP'
            ELSE 'XX'
        END;
        
        -- Get and increment faculty counter
        SELECT counter INTO faculty_counter FROM FacultyCounts WHERE faculty_code = faculty;
        SET faculty_counter = faculty_counter + 1;
        UPDATE FacultyCounts SET counter = faculty_counter WHERE faculty_code = faculty;
        
        -- Create student ID with consistent pattern
        SET utmID = CONCAT('A23', faculty_prefix, LPAD(faculty_counter, 4, '0'));
        SET email = CONCAT('student', LPAD(i, 3, '0'), '@graduate.utm.my');
        SET userID = UUID();

        -- Insert user
        INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role)
        VALUES (userID, username, 'hashed_password', fullName, utmID, email, 'student');

        -- Insert student
        INSERT IGNORE INTO Student (studentID, userID, faculty, yearOfStudy, totalPoints, totalMerits)
        VALUES (utmID, userID, faculty, yearOfStudy, 0, 0);

        SET i = i + 1;
    END WHILE;
    
    -- Drop temporary table
    DROP TEMPORARY TABLE IF EXISTS FacultyCounts;
END$$

DELIMITER ;

-- ============================================
-- CREATE SPECIFIC STUDENTS FOR PARTICIPATION TESTING
-- ============================================

-- First, let's create specific students that match your Participation inserts
INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role) VALUES
(UUID(), 'student_bu001', 'hashed_password', 'Student BU001', 'A23BU0001', 'student_bu001@graduate.utm.my', 'student'),
(UUID(), 'student_bu002', 'hashed_password', 'Student BU002', 'A23BU0002', 'student_bu002@graduate.utm.my', 'student'),
(UUID(), 'student_bu003', 'hashed_password', 'Student BU003', 'A23BU0003', 'student_bu003@graduate.utm.my', 'student'),
(UUID(), 'student_en001', 'hashed_password', 'Student EN001', 'A23EN0001', 'student_en001@graduate.utm.my', 'student'),
(UUID(), 'student_en002', 'hashed_password', 'Student EN002', 'A23EN0002', 'student_en002@graduate.utm.my', 'student'),
(UUID(), 'student_en003', 'hashed_password', 'Student EN003', 'A23EN0003', 'student_en003@graduate.utm.my', 'student'),
(UUID(), 'student_en004', 'hashed_password', 'Student EN004', 'A23EN0004', 'student_en004@graduate.utm.my', 'student'),
(UUID(), 'student_en005', 'hashed_password', 'Student EN005', 'A23EN0005', 'student_en005@graduate.utm.my', 'student'),
(UUID(), 'student_en006', 'hashed_password', 'Student EN006', 'A23EN0006', 'student_en006@graduate.utm.my', 'student'),
(UUID(), 'student_en007', 'hashed_password', 'Student EN007', 'A23EN0007', 'student_en007@graduate.utm.my', 'student'),
(UUID(), 'student_en008', 'hashed_password', 'Student EN008', 'A23EN0008', 'student_en008@graduate.utm.my', 'student'),
(UUID(), 'student_cs001', 'hashed_password', 'Student CS001', 'A23CS0001', 'student_cs001@graduate.utm.my', 'student'),
(UUID(), 'student_cs002', 'hashed_password', 'Student CS002', 'A23CS0002', 'student_cs002@graduate.utm.my', 'student'),
(UUID(), 'student_cs003', 'hashed_password', 'Student CS003', 'A23CS0003', 'student_cs003@graduate.utm.my', 'student'),
(UUID(), 'student_cs004', 'hashed_password', 'Student CS004', 'A23CS0004', 'student_cs004@graduate.utm.my', 'student'),
(UUID(), 'student_cs005', 'hashed_password', 'Student CS005', 'A23CS0005', 'student_cs005@graduate.utm.my', 'student'),
(UUID(), 'student_cs006', 'hashed_password', 'Student CS006', 'A23CS0006', 'student_cs006@graduate.utm.my', 'student'),
(UUID(), 'student_cs007', 'hashed_password', 'Student CS007', 'A23CS0007', 'student_cs007@graduate.utm.my', 'student'),
(UUID(), 'student_sh001', 'hashed_password', 'Student SH001', 'A23SH0001', 'student_sh001@graduate.utm.my', 'student'),
(UUID(), 'student_sh002', 'hashed_password', 'Student SH002', 'A23SH0002', 'student_sh002@graduate.utm.my', 'student'),
(UUID(), 'student_sh003', 'hashed_password', 'Student SH003', 'A23SH0003', 'student_sh003@graduate.utm.my', 'student'),
(UUID(), 'student_sh004', 'hashed_password', 'Student SH004', 'A23SH0004', 'student_sh004@graduate.utm.my', 'student'),
(UUID(), 'student_ed001', 'hashed_password', 'Student ED001', 'A23ED0001', 'student_ed001@graduate.utm.my', 'student'),
(UUID(), 'student_ed002', 'hashed_password', 'Student ED002', 'A23ED0002', 'student_ed002@graduate.utm.my', 'student'),
(UUID(), 'student_ed003', 'hashed_password', 'Student ED003', 'A23ED0003', 'student_ed003@graduate.utm.my', 'student'),
(UUID(), 'student_ed004', 'hashed_password', 'Student ED004', 'A23ED0004', 'student_ed004@graduate.utm.my', 'student'),
(UUID(), 'student_kt001', 'hashed_password', 'Student KT001', 'A23KT0001', 'student_kt001@graduate.utm.my', 'student'),
(UUID(), 'student_kt002', 'hashed_password', 'Student KT002', 'A23KT0002', 'student_kt002@graduate.utm.my', 'student'),
(UUID(), 'student_kt003', 'hashed_password', 'Student KT003', 'A23KT0003', 'student_kt003@graduate.utm.my', 'student'),
(UUID(), 'student_kt004', 'hashed_password', 'Student KT004', 'A23KT0004', 'student_kt004@graduate.utm.my', 'student'),
(UUID(), 'student_kt005', 'hashed_password', 'Student KT005', 'A23KT0005', 'student_kt005@graduate.utm.my', 'student'),
(UUID(), 'student_cp001', 'hashed_password', 'Student CP001', 'A23CP0001', 'student_cp001@graduate.utm.my', 'student'),
(UUID(), 'student_cp002', 'hashed_password', 'Student CP002', 'A23CP0002', 'student_cp002@graduate.utm.my', 'student'),
(UUID(), 'student_cp003', 'hashed_password', 'Student CP003', 'A23CP0003', 'student_cp003@graduate.utm.my', 'student'),
(UUID(), 'student_cp004', 'hashed_password', 'Student CP004', 'A23CP0004', 'student_cp004@graduate.utm.my', 'student'),
(UUID(), 'student_cp005', 'hashed_password', 'Student CP005', 'A23CP0005', 'student_cp005@graduate.utm.my', 'student'),
(UUID(), 'student_mg001', 'hashed_password', 'Student MG001', 'A23MG0001', 'student_mg001@graduate.utm.my', 'student'),
(UUID(), 'student_mg002', 'hashed_password', 'Student MG002', 'A23MG0002', 'student_mg002@graduate.utm.my', 'student'),
(UUID(), 'student_mg003', 'hashed_password', 'Student MG003', 'A23MG0003', 'student_mg003@graduate.utm.my', 'student'),
(UUID(), 'student_mg004', 'hashed_password', 'Student MG004', 'A23MG0004', 'student_mg004@graduate.utm.my', 'student'),
(UUID(), 'student_mg005', 'hashed_password', 'Student MG005', 'A23MG0005', 'student_mg005@graduate.utm.my', 'student'),
(UUID(), 'student_md001', 'hashed_password', 'Student MD001', 'A23MD0001', 'student_md001@graduate.utm.my', 'student'),
(UUID(), 'student_sp001', 'hashed_password', 'Student SP001', 'A23SP0001', 'student_sp001@graduate.utm.my', 'student'),
(UUID(), 'student_sp002', 'hashed_password', 'Student SP002', 'A23SP0002', 'student_sp002@graduate.utm.my', 'student'),
(UUID(), 'student_sp003', 'hashed_password', 'Student SP003', 'A23SP0003', 'student_sp003@graduate.utm.my', 'student');

-- Insert corresponding Student records
INSERT IGNORE INTO Student (studentID, userID, faculty, yearOfStudy, totalPoints, totalMerits)
SELECT 
    u.utmID,
    u.userID,
    CASE 
        WHEN u.utmID LIKE 'A23BU%' THEN 'FABU'
        WHEN u.utmID LIKE 'A23EN%' THEN 'FKE'
        WHEN u.utmID LIKE 'A23CS%' THEN 'FK'
        WHEN u.utmID LIKE 'A23SH%' THEN 'FSSH'
        WHEN u.utmID LIKE 'A23ED%' THEN 'FEST'
        WHEN u.utmID LIKE 'A23KT%' THEN 'FKT'
        WHEN u.utmID LIKE 'A23CP%' THEN 'FKM'
        WHEN u.utmID LIKE 'A23MG%' THEN 'FM'
        WHEN u.utmID LIKE 'A23MD%' THEN 'FM'
        WHEN u.utmID LIKE 'A23SP%' THEN 'SPACE'
        ELSE 'FABU'
    END as faculty,
    FLOOR(1 + (RAND() * 5)) as yearOfStudy,
    0, 0
FROM User u 
WHERE u.role = 'student' 
AND u.utmID IN (
    'A23BU0001', 'A23BU0002', 'A23BU0003', 'A23BU0004', 'A23BU0005',
    'A23EN0001', 'A23EN0002', 'A23EN0003', 'A23EN0004', 'A23EN0005', 
    'A23EN0006', 'A23EN0007', 'A23EN0008',
    'A23CS0001', 'A23CS0002', 'A23CS0003', 'A23CS0004', 'A23CS0005',
    'A23CS0006', 'A23CS0007',
    'A23SH0001', 'A23SH0002', 'A23SH0003', 'A23SH0004',
    'A23ED0001', 'A23ED0002', 'A23ED0003', 'A23ED0004',
    'A23KT0001', 'A23KT0002', 'A23KT0003', 'A23KT0004', 'A23KT0005',
    'A23CP0001', 'A23CP0002', 'A23CP0003', 'A23CP0004', 'A23CP0005',
    'A23MG0001', 'A23MG0002', 'A23MG0003', 'A23MG0004', 'A23MG0005',
    'A23MD0001',
    'A23SP0001', 'A23SP0002', 'A23SP0003'
);

-- Now generate the rest of the students
CALL GenerateStudents(300); -- This will generate additional 300 students




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
-- SHIFT EXISTING TRANSACTIONS TO RECENT MONTHS
-- ============================================

-- 1️⃣ Create backup first
CREATE TABLE IF NOT EXISTS recycling_transactions_backup AS
SELECT * FROM recycling_transactions;

-- 2️⃣ Delete previously shifted future data (optional, if rerunning)
DELETE FROM recycling_transactions
WHERE transaction_date >= '2025-01-01';

-- 3️⃣ Compute date intervals for shifting
-- We'll use today's date as reference
-- Today: CURDATE()

-- 3 months before
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date)
SELECT user_id, material_type, quantity, points_earned,
       DATE_ADD(transaction_date, INTERVAL 23 MONTH) -- Shift Jan 2024 -> Dec 2025
FROM recycling_transactions_backup
WHERE transaction_date BETWEEN '2024-01-01' AND '2024-03-31';

-- 6 months before
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date)
SELECT user_id, material_type, quantity, points_earned,
       DATE_ADD(transaction_date, INTERVAL 23 MONTH) -- Shift Mar 2024 -> Feb 2026
FROM recycling_transactions_backup
WHERE transaction_date BETWEEN '2024-04-01' AND '2024-06-30';

-- 9 months before
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date)
SELECT user_id, material_type, quantity, points_earned,
       DATE_ADD(transaction_date, INTERVAL 23 MONTH) -- Shift Jul 2024 -> Jun 2026
FROM recycling_transactions_backup
WHERE transaction_date BETWEEN '2024-07-01' AND '2024-09-30';

-- 12 months before
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date)
SELECT user_id, material_type, quantity, points_earned,
       DATE_ADD(transaction_date, INTERVAL 23 MONTH) -- Shift Oct 2024 -> Sep 2026
FROM recycling_transactions_backup
WHERE transaction_date BETWEEN '2024-10-01' AND '2024-12-31';

-- 4️⃣ Verify new transactions
SELECT 
    MIN(transaction_date) as earliest_date,
    MAX(transaction_date) as latest_date,
    COUNT(*) as total_transactions
FROM recycling_transactions;

-- 5️⃣ Optional: Weekly summary for trend verification
SELECT 
    WEEK(transaction_date,1) as week_number,
    COUNT(DISTINCT user_id) as weekly_participants,
    SUM(points_earned) as weekly_points,
    ROUND(SUM(quantity),1) as weekly_kg
FROM recycling_transactions
WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY WEEK(transaction_date,1)
ORDER BY week_number;

DELIMITER $$

DROP PROCEDURE IF EXISTS generate_realistic_transactions$$

CREATE PROCEDURE generate_realistic_transactions()
BEGIN
    DECLARE v_studentID VARCHAR(36);
    DECLARE v_faculty ENUM('FABU','FS','FKT','FKE','FK','FKM','FSSH','FEST','FM','SPACE');
    DECLARE v_month DATE;
    DECLARE v_quantity DECIMAL(5,2);
    DECLARE v_points INT;
    DECLARE v_i INT;
    DECLARE v_num INT;
    DECLARE done INT DEFAULT 0;

    DECLARE cur CURSOR FOR SELECT userID, faculty FROM Student;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_studentID, v_faculty;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET v_month = '2025-01-01';
        month_loop: LOOP
            IF v_month > '2026-01-01' THEN
                LEAVE month_loop;
            END IF;

            IF RAND() < 0.15 THEN
                SET v_num = 1 + FLOOR(RAND()*5);  
                SET v_i = 1;

                WHILE v_i <= v_num DO
                    -- 每笔交易随机重量
                    SET v_quantity = ROUND(
                        CASE v_faculty
                            WHEN 'FABU' THEN 1 + RAND()*4
                            WHEN 'FS' THEN 0.5 + RAND()*3
                            WHEN 'FKT' THEN 1 + RAND()*2
                            WHEN 'FKE' THEN 0.5 + RAND()*2
                            WHEN 'FK' THEN 0.5 + RAND()*3
                            WHEN 'FKM' THEN 1 + RAND()*3
                            WHEN 'FSSH' THEN 0.5 + RAND()*2
                            WHEN 'FEST' THEN 0.5 + RAND()*3
                            WHEN 'FM' THEN 1 + RAND()*4
                            WHEN 'SPACE' THEN 0.5 + RAND()*3
                            ELSE 1 + RAND()*2
                        END, 1
                    );

                    -- 每笔交易积分
                    SET v_points = ROUND(v_quantity * (5 + FLOOR(RAND()*6)));

                    -- 插入交易，随机日期在本月内
                    INSERT INTO recycling_transactions (
                        user_id,
                        material_type,
                        quantity,
                        points_earned,
                        transaction_date
                    )
                    VALUES (
                        v_studentID,
                        ELT(FLOOR(1 + RAND()*4), 'plastic','paper','glass','metal'),
                        v_quantity,
                        v_points,
                        DATE_ADD(v_month, INTERVAL FLOOR(RAND()*DAY(LAST_DAY(v_month))) DAY)
                    );

                    SET v_i = v_i + 1;
                END WHILE;
            END IF;

            -- 下个月
            SET v_month = DATE_ADD(v_month, INTERVAL 1 MONTH);
        END LOOP;

    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;

-- 执行生成
CALL generate_realistic_transactions();

-- 删除过程
DROP PROCEDURE generate_realistic_transactions;

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
-- UTM ReMerit - Recycling Trend Analysis (Complete)
-- ============================================

-- 1️⃣ View: Historical Recycling Trends
CREATE OR REPLACE VIEW RecyclingTrends AS
SELECT 
    DATE_FORMAT(rt.transaction_date, '%Y-%m') AS month_year,
    s.faculty,
    COUNT(DISTINCT rt.user_id) AS unique_users,
    COUNT(*) AS total_transactions,
    SUM(rt.points_earned) AS total_points,
    ROUND(SUM(rt.quantity), 2) AS total_kg,
    ROUND(AVG(IFNULL(rt.points_earned,0)), 2) AS avg_points_per_transaction
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
GROUP BY DATE_FORMAT(rt.transaction_date, '%Y-%m'), s.faculty
ORDER BY month_year, s.faculty;


-- 2️⃣ Function: Moving Average for Trend Prediction
DELIMITER //
CREATE FUNCTION CalculateMovingAverage(
    faculty_param VARCHAR(20),
    months_back INT
) RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE avg_points DECIMAL(10,2);

    SELECT ROUND(AVG(total_points),2) INTO avg_points
    FROM RecyclingTrends
    WHERE faculty = faculty_param
      AND month_year >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL months_back MONTH), '%Y-%m')
      AND month_year < DATE_FORMAT(CURDATE(), '%Y-%m');

    RETURN COALESCE(avg_points, 0);
END //
DELIMITER ;


-- 3️⃣ View: Monthly Faculty Participation
CREATE OR REPLACE VIEW MonthlyFacultyParticipation AS
SELECT
    DATE_FORMAT(rt.transaction_date, '%Y-%m') AS month_year,
    s.faculty,
    COUNT(DISTINCT rt.user_id) AS participating_students,
    COUNT(DISTINCT s.userID) AS total_students,
    COUNT(*) AS total_transactions,
    ROUND(SUM(rt.quantity),1) AS total_kg,
    ROUND(
        COUNT(DISTINCT rt.user_id) * 100.0 / COUNT(DISTINCT s.userID),
        2
    ) AS participation_percentage
FROM recycling_transactions rt
JOIN User u ON rt.user_id = u.userID
JOIN Student s ON u.userID = s.userID
GROUP BY month_year, s.faculty
ORDER BY month_year, s.faculty;



-- 4️⃣ Procedure: Predict Next Month Trend
DELIMITER //
CREATE PROCEDURE PredictMonthlyTrend(IN faculty_param VARCHAR(20))
BEGIN
    DECLARE last_month_rate DECIMAL(5,2);
    DECLARE three_month_avg DECIMAL(5,2);
    DECLARE six_month_avg DECIMAL(5,2);
    DECLARE predicted_rate DECIMAL(5,2);
    DECLARE current_month VARCHAR(7);
    DECLARE next_month VARCHAR(7);

    SET current_month = DATE_FORMAT(CURDATE(), '%Y-%m');
    SET next_month = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y-%m');

    SELECT participation_rate_percent INTO last_month_rate
    FROM MonthlyFacultyParticipation
    WHERE faculty = faculty_param
      AND month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m');

    SELECT AVG(participation_rate_percent) INTO three_month_avg
    FROM MonthlyFacultyParticipation
    WHERE faculty = faculty_param
      AND month_year >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 3 MONTH), '%Y-%m')
      AND month_year < DATE_FORMAT(CURDATE(), '%Y-%m');

    SELECT AVG(participation_rate_percent) INTO six_month_avg
    FROM MonthlyFacultyParticipation
    WHERE faculty = faculty_param
      AND month_year >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 MONTH), '%Y-%m')
      AND month_year < DATE_FORMAT(CURDATE(), '%Y-%m');

    SET predicted_rate = ROUND(
        (COALESCE(last_month_rate, three_month_avg, 0) * 0.6) + 
        (COALESCE(three_month_avg, 0) * 0.3) + 
        (COALESCE(six_month_avg, 0) * 0.1), 
        2
    );

    IF predicted_rate <= 0 THEN
        SET predicted_rate = ROUND(
            COALESCE(three_month_avg, 5.0) * 0.8 + 
            COALESCE(six_month_avg, 5.0) * 0.2, 
            2
        );
    END IF;

    SELECT 
        faculty_param AS faculty,
        current_month AS current_month,
        next_month AS predicted_month,
        COALESCE(last_month_rate,0) AS last_month_rate,
        COALESCE(three_month_avg,0) AS three_month_avg_rate,
        COALESCE(six_month_avg,0) AS six_month_avg_rate,
        predicted_rate AS predicted_participation_rate,
        CASE 
            WHEN predicted_rate >= 50 THEN 'High Participation Expected'
            WHEN predicted_rate >= 30 THEN 'Moderate Participation Expected'
            WHEN predicted_rate >= 10 THEN 'Low Participation Expected'
            ELSE 'Very Low Participation Expected'
        END AS participation_level,
        CASE 
            WHEN predicted_rate > COALESCE(three_month_avg,predicted_rate) * 1.2 THEN 'Increasing Trend'
            WHEN predicted_rate < COALESCE(three_month_avg,predicted_rate) * 0.8 THEN 'Decreasing Trend'
            ELSE 'Stable Trend'
        END AS trend_direction
    FROM dual;

END //
DELIMITER ;


-- 5️⃣ Procedure: Detect Low Participation
DELIMITER //
CREATE PROCEDURE DetectLowMonthlyParticipation(IN target_month VARCHAR(7))
BEGIN
    DECLARE campus_avg DECIMAL(5,2);

    SELECT AVG(participation_rate_percent) INTO campus_avg
    FROM MonthlyFacultyParticipation
    WHERE month_year = target_month;

    SELECT 
        mfp.faculty,
        mfp.month_year,
        mfp.participating_students,
        mfp.total_students,
        mfp.participation_rate_percent,
        ROUND(campus_avg,2) AS campus_avg_participation,
        ROUND(mfp.participation_rate_percent - campus_avg,2) AS diff_from_avg,
        CASE 
            WHEN mfp.participation_rate_percent = 0 THEN 'CRITICAL - No Participation'
            WHEN mfp.participation_rate_percent < campus_avg * 0.5 THEN 'HIGH - Very Low Participation'
            WHEN mfp.participation_rate_percent < campus_avg * 0.7 THEN 'MEDIUM - Low Participation'
            WHEN mfp.participation_rate_percent < campus_avg THEN 'LOW - Below Average'
            ELSE 'SATISFACTORY - At or Above Average'
        END AS alert_level,
        CASE 
            WHEN mfp.participation_rate_percent = 0 THEN 'Implement immediate intervention strategies'
            WHEN mfp.participation_rate_percent < campus_avg * 0.5 THEN 'Launch targeted campaign with incentives'
            WHEN mfp.participation_rate_percent < campus_avg * 0.7 THEN 'Increase awareness activities'
            WHEN mfp.participation_rate_percent < campus_avg THEN 'Monitor and provide gentle reminders'
            ELSE 'Maintain current engagement strategies'
        END AS recommended_action
    FROM MonthlyFacultyParticipation mfp
    WHERE mfp.month_year = target_month
    ORDER BY 
        CASE 
            WHEN mfp.participation_rate_percent = 0 THEN 1
            WHEN mfp.participation_rate_percent < campus_avg * 0.5 THEN 2
            WHEN mfp.participation_rate_percent < campus_avg * 0.7 THEN 3
            WHEN mfp.participation_rate_percent < campus_avg THEN 4
            ELSE 5
        END,
        mfp.participation_rate_percent ASC;

END //
DELIMITER ;


-- 6️⃣ View: Monthly Trend Analysis
CREATE OR REPLACE VIEW MonthlyTrendAnalysis AS
WITH MonthlyData AS (
    SELECT 
        faculty,
        month_year,
        participation_percentage,
        LAG(participation_percentage,1) OVER (PARTITION BY faculty ORDER BY month_year) AS prev_month_rate,
        LAG(participation_percentage,2) OVER (PARTITION BY faculty ORDER BY month_year) AS prev_2month_rate,
        participating_students,
        total_transactions,
        total_kg
    FROM MonthlyFacultyParticipation
)
SELECT 
    faculty,
    month_year,
    participation_percentage,
    prev_month_rate,
    prev_2month_rate,
    participating_students,
    total_transactions,
    total_kg,
    ROUND(
        (participation_percentage - COALESCE(prev_month_rate, participation_percentage)) /
        NULLIF(COALESCE(prev_month_rate, participation_percentage), 1) * 100, 2
    ) AS month_over_month_change_percent,
    ROUND(
        (participation_percentage - COALESCE(prev_2month_rate, participation_percentage)) /
        NULLIF(COALESCE(prev_2month_rate, participation_percentage), 1) * 100, 2
    ) AS three_month_trend_percent,
    CASE 
        WHEN participation_percentage = 0 THEN 'No Activity'
        WHEN participation_percentage - COALESCE(prev_month_rate,0) > 10 THEN 'Strong Growth'
        WHEN participation_percentage - COALESCE(prev_month_rate,0) > 5 THEN 'Moderate Growth'
        WHEN participation_percentage - COALESCE(prev_month_rate,0) > 0 THEN 'Slight Growth'
        WHEN participation_percentage - COALESCE(prev_month_rate,0) = 0 THEN 'Stable'
        WHEN participation_percentage - COALESCE(prev_month_rate,0) > -5 THEN 'Slight Decline'
        WHEN participation_percentage - COALESCE(prev_month_rate,0) > -10 THEN 'Moderate Decline'
        ELSE 'Sharp Decline'
    END AS trend_category
FROM MonthlyData
ORDER BY faculty, month_year DESC;



-- 7️⃣ View: Monthly Participation Heatmap
CREATE OR REPLACE VIEW MonthlyParticipationHeatmap AS
SELECT 
    faculty,

    MAX(CASE 
        WHEN month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH),'%Y-%m')
        THEN participation_percentage 
    END) AS last_month,

    MAX(CASE 
        WHEN month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 2 MONTH),'%Y-%m')
        THEN participation_percentage 
    END) AS month_2_ago,

    MAX(CASE 
        WHEN month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 3 MONTH),'%Y-%m')
        THEN participation_percentage 
    END) AS month_3_ago,

    MAX(CASE 
        WHEN month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 4 MONTH),'%Y-%m')
        THEN participation_percentage 
    END) AS month_4_ago,

    MAX(CASE 
        WHEN month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 5 MONTH),'%Y-%m')
        THEN participation_percentage 
    END) AS month_5_ago,

    MAX(CASE 
        WHEN month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 MONTH),'%Y-%m')
        THEN participation_percentage 
    END) AS month_6_ago,

    ROUND(AVG(participation_percentage),2) AS six_month_avg,

    ROUND(
        (
            MAX(CASE 
                WHEN month_year = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH),'%Y-%m')
                THEN participation_percentage 
            END)
            - AVG(participation_percentage)
        ) / NULLIF(AVG(participation_percentage),1) * 100,
        2
    ) AS last_month_vs_avg_percent

FROM MonthlyFacultyParticipation
WHERE month_year >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 MONTH),'%Y-%m')
GROUP BY faculty
ORDER BY six_month_avg DESC;



-- 8️⃣ View: Faculty Trend Prediction
CREATE OR REPLACE VIEW FacultyTrendPrediction AS
SELECT 
    rt.faculty,
    rt.month_year,
    rt.total_points AS actual_points,
    LAG(rt.total_points,1) OVER (PARTITION BY rt.faculty ORDER BY rt.month_year) AS previous_month,
    ROUND(
        (rt.total_points - COALESCE(LAG(rt.total_points,1) OVER (PARTITION BY rt.faculty ORDER BY rt.month_year), rt.total_points)) /
        NULLIF(COALESCE(LAG(rt.total_points,1) OVER (PARTITION BY rt.faculty ORDER BY rt.month_year),1),1) * 100, 2
    ) AS monthly_growth_percent,
    ROUND(AVG(rt.total_points) OVER (PARTITION BY rt.faculty ORDER BY rt.month_year ROWS BETWEEN 2 PRECEDING AND CURRENT ROW),2) AS three_month_moving_avg
FROM RecyclingTrends rt
ORDER BY rt.faculty, rt.month_year;


-- 9️⃣ View: Material Type Trend Analysis
CREATE OR REPLACE VIEW MaterialTrendAnalysis AS
SELECT 
    material_type,
    DATE_FORMAT(transaction_date,'%Y-%m') AS month_year,
    COUNT(*) AS transaction_count,
    SUM(points_earned) AS total_points,
    ROUND(SUM(quantity),2) AS total_kg,
    ROUND(AVG(IFNULL(points_earned,0)),2) AS avg_points_per_transaction,
    RANK() OVER (PARTITION BY DATE_FORMAT(transaction_date,'%Y-%m') ORDER BY SUM(points_earned) DESC) AS rank_by_points
FROM recycling_transactions
GROUP BY material_type, DATE_FORMAT(transaction_date,'%Y-%m')
ORDER BY month_year, rank_by_points;

-- Check if recycling_transactions has data
SELECT COUNT(*) as total_transactions, 
       SUM(points_earned) as total_points,
       MIN(transaction_date) as earliest_date,
       MAX(transaction_date) as latest_date
FROM recycling_transactions;

-- Check specific faculty data
SELECT s.faculty, COUNT(rt.id) as transactions, SUM(rt.points_earned) as points
FROM Student s
JOIN User u ON s.userID = u.userID
LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id
GROUP BY s.faculty;


-- ============================================
-- UC30: DETECT LOW ENGAGEMENT AREAS
-- ============================================

-- 1. Create engagement threshold configuration table
CREATE TABLE EngagementThreshold (
    threshold_id INT AUTO_INCREMENT PRIMARY KEY,
    faculty VARCHAR(10) NOT NULL,
    min_participants INT NOT NULL,
    min_points_per_student DECIMAL(10,2) NOT NULL,
    min_transactions_per_student DECIMAL(5,2) NOT NULL,
    effective_date DATE DEFAULT (CURDATE()),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Insert more realistic thresholds for each faculty
INSERT INTO EngagementThreshold (faculty, min_participants, min_points_per_student, min_transactions_per_student) VALUES
('FABU', 18, 45.00, 1.5),
('FS', 12, 50.00, 1.5),
('FKT', 12, 40.00, 1.2),
('FKE', 18, 55.00, 2.0),
('FK', 14, 45.00, 1.5),
('FKM', 12, 40.00, 1.2),
('FSSH', 10, 35.00, 1.0),
('FEST', 8, 30.00, 0.8),
('FM', 8, 30.00, 0.8),
('SPACE', 8, 30.00, 0.8);

-- 2. View for current semester engagement metrics
-- Create CurrentSemesterEngagement view if it doesn't exist
CREATE OR REPLACE VIEW CurrentSemesterEngagement AS
SELECT 
    s.faculty,
    COUNT(DISTINCT s.studentID) AS total_students,  -- all students
    COUNT(DISTINCT rt.user_id) AS active_recyclers, -- students who actually recycled
    ROUND(
        COUNT(DISTINCT rt.user_id) * 100.0 / COUNT(DISTINCT s.studentID),
        2
    ) AS participation_rate_percent,
    COALESCE(SUM(rt.points_earned), 0) AS total_points,
    COALESCE(SUM(rt.quantity), 0) AS total_kg,
    ROUND(
        COALESCE(SUM(rt.points_earned) / NULLIF(COUNT(DISTINCT rt.user_id), 0), 0),
        2
    ) AS avg_points_per_active_student,
    ROUND(
        COALESCE(COUNT(rt.id) / NULLIF(COUNT(DISTINCT rt.user_id), 1), 0),
        2
    ) AS avg_transactions_per_active_student
FROM Student s
LEFT JOIN User u ON s.userID = u.userID
LEFT JOIN recycling_transactions rt 
       ON u.userID = rt.user_id 
       AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)  -- keep date filter in JOIN
GROUP BY s.faculty
ORDER BY s.faculty;


-- Create CampusZoneEngagement view
-- CREATE OR REPLACE VIEW CampusZoneEngagement AS
-- SELECT 
--     CASE 
--         WHEN s.faculty IN ('FKE','FK','FKT') THEN 'Engineering Zone'
--         WHEN s.faculty IN ('FS','FKM') THEN 'Science Zone'
--         WHEN s.faculty IN ('FABU','FSSH') THEN 'Arts & Social Sciences Zone'
--         WHEN s.faculty IN ('FEST','SPACE') THEN 'Education Zone'
--         WHEN s.faculty = 'FM' THEN 'Medical Zone'
--         ELSE 'Other Zones'
--     END as campus_zone,
--     COUNT(DISTINCT s.studentID) as total_students,
--     COUNT(DISTINCT rt.user_id) as active_recyclers,
--     ROUND(COALESCE(COUNT(DISTINCT rt.user_id) * 100.0 / NULLIF(COUNT(DISTINCT s.studentID), 0), 0), 2) as zone_participation_rate
-- FROM Student s
-- LEFT JOIN User u ON s.userID = u.userID
-- LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id 
--     AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
-- GROUP BY campus_zone;


-- 3. Procedure to detect low engagement areas
DELIMITER //
CREATE PROCEDURE DetectLowEngagementAreas(IN semester_start DATE, IN semester_end DATE)
BEGIN
    SELECT 
        cse.faculty,
        cse.total_students,
        cse.active_recyclers,
        cse.participation_rate_percent,
        cse.total_points,
        cse.avg_points_per_active_student,
        cse.avg_transactions_per_active_student,
        et.min_participants as threshold_min_participants,
        et.min_points_per_student as threshold_min_points,
        et.min_transactions_per_student as threshold_min_transactions,
        CASE 
            WHEN cse.active_recyclers < et.min_participants THEN 'CRITICAL - Low Participation'
            WHEN cse.avg_points_per_active_student < et.min_points_per_student THEN 'WARNING - Low Points/Student'
            WHEN cse.avg_transactions_per_active_student < et.min_transactions_per_student THEN 'WARNING - Low Activity Frequency'
            ELSE 'SATISFACTORY'
        END as engagement_status,
        CASE 
            WHEN cse.active_recyclers < et.min_participants THEN CONCAT('Increase participants from ', cse.active_recyclers, ' to at least ', et.min_participants)
            WHEN cse.avg_points_per_active_student < et.min_points_per_student THEN CONCAT('Improve points per student from ', ROUND(cse.avg_points_per_active_student, 2), ' to at least ', et.min_points_per_student)
            WHEN cse.avg_transactions_per_active_student < et.min_transactions_per_student THEN CONCAT('Increase transaction frequency from ', ROUND(cse.avg_transactions_per_active_student, 2), ' to at least ', et.min_transactions_per_student)
            ELSE 'Meeting all engagement thresholds'
        END as improvement_recommendation
    FROM CurrentSemesterEngagement cse
    JOIN EngagementThreshold et ON cse.faculty = et.faculty
    WHERE et.is_active = TRUE
    ORDER BY 
        CASE 
            WHEN cse.active_recyclers < et.min_participants THEN 1
            WHEN cse.avg_points_per_active_student < et.min_points_per_student THEN 2
            WHEN cse.avg_transactions_per_active_student < et.min_transactions_per_student THEN 3
            ELSE 4
        END,
        cse.participation_rate_percent ASC;
END //
DELIMITER ;

-- 4. View for trend-based engagement analysis
CREATE OR REPLACE VIEW EngagementTrendAnalysis AS
WITH MonthlyEngagement AS (
    SELECT 
        s.faculty,
        DATE_FORMAT(rt.transaction_date, '%Y-%m') as month_year,
        COUNT(DISTINCT rt.user_id) as monthly_active_recyclers,
        COUNT(DISTINCT s.studentID) as total_faculty_students,
        ROUND((COUNT(DISTINCT rt.user_id) / COUNT(DISTINCT s.studentID)) * 100, 2) as monthly_participation_rate,
        SUM(rt.points_earned) as monthly_points
    FROM Student s
    JOIN User u ON s.userID = u.userID
    LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id
    WHERE rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY s.faculty, DATE_FORMAT(rt.transaction_date, '%Y-%m')
)
SELECT 
    faculty,
    month_year,
    monthly_active_recyclers,
    monthly_participation_rate,
    monthly_points,
    LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) as previous_month_rate,
    ROUND(monthly_participation_rate - LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year), 2) as participation_change,
    CASE 
        WHEN monthly_participation_rate - LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) < -5 THEN 'DECLINING RAPIDLY'
        WHEN monthly_participation_rate - LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) < 0 THEN 'SLIGHT DECLINE'
        WHEN monthly_participation_rate - LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) > 5 THEN 'IMPROVING RAPIDLY'
        WHEN monthly_participation_rate - LAG(monthly_participation_rate, 1) OVER (PARTITION BY faculty ORDER BY month_year) > 0 THEN 'SLIGHT IMPROVEMENT'
        ELSE 'STABLE'
    END as trend_status
FROM MonthlyEngagement
ORDER BY faculty, month_year DESC;

-- 5. Zone-based engagement analysis (assuming campus zones based on faculty location)
CREATE OR REPLACE VIEW CampusZoneEngagement AS
SELECT 
    CASE 
        WHEN s.faculty IN ('FKE','FK','FKT') THEN 'Electrical, Chemical & Energy Engineering Zone'
		WHEN s.faculty IN ('FS','FKM') THEN 'Mechanics & Applied Sciences Zone'
		WHEN s.faculty IN ('FABU','FSSH') THEN 'Environment, Society & Design Zone'
		WHEN s.faculty IN ('FEST','SPACE') THEN 'Education Zone'
		WHEN s.faculty = 'FM' THEN 'Management Zone'
        ELSE 'Other Zones'
    END as campus_zone,
    COUNT(DISTINCT s.studentID) as total_students,
    COUNT(DISTINCT rt.user_id) as active_recyclers,
    ROUND((COUNT(DISTINCT rt.user_id) / COUNT(DISTINCT s.studentID)) * 100, 2) as zone_participation_rate,
    COALESCE(SUM(rt.points_earned), 0) as total_zone_points,
    COALESCE(COUNT(rt.id), 0) as total_zone_transactions,
    ROUND(AVG(DATEDIFF(CURDATE(), rt.transaction_date)), 0) as avg_days_since_last_activity
FROM Student s
LEFT JOIN User u ON s.userID = u.userID
LEFT JOIN recycling_transactions rt ON u.userID = rt.user_id 
    AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY campus_zone
ORDER BY zone_participation_rate ASC;


-- ============================================
-- UC31: GENERATE SUSTAINABILITY INSIGHTS & RECOMMENDATIONS
-- ============================================

-- 1. Create insights configuration table
CREATE TABLE IF NOT EXISTS SustainabilityInsightsConfig (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    insight_type ENUM('PARTICIPATION', 'PERFORMANCE', 'TREND', 'COMPARISON') NOT NULL,
    insight_condition TEXT NOT NULL,
    insight_message TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    priority INT DEFAULT 3, -- 1: High, 2: Medium, 3: Low
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample insight configurations
INSERT INTO SustainabilityInsightsConfig (insight_type, insight_condition, insight_message, recommendation, priority) VALUES
('PARTICIPATION', 'participation_rate < 30', 'Low overall participation rate detected', 'Launch targeted awareness campaigns in low-engagement areas', 1),
('PARTICIPATION', 'active_recyclers < min_threshold', 'Critical low participation in specific faculty', 'Implement faculty-specific incentives and competitions', 1),
('PERFORMANCE', 'avg_points_per_student < 50', 'Below average points per student', 'Increase point rewards for high-impact recycling materials', 2),
('TREND', 'monthly_growth < -10', 'Sharp decline in recycling activity', 'Investigate and address potential barriers to recycling', 1),
('TREND', 'monthly_growth > 20', 'Rapid growth in recycling activity', 'Recognize and reward high-performing areas', 3),
('COMPARISON', 'zone_participation_rate < campus_average', 'Zone performing below campus average', 'Deploy additional recycling bins and awareness materials', 2),
('PERFORMANCE', 'material_diversity < 3', 'Limited variety of materials being recycled', 'Educate on full range of recyclable materials', 2);

-- 2. Procedure to generate comprehensive sustainability insights
DELIMITER //

CREATE PROCEDURE GenerateSustainabilityInsights()
BEGIN
    -- Declare variables
    DECLARE campus_avg_participation DECIMAL(5,2) DEFAULT 0;
    DECLARE campus_avg_points DECIMAL(10,2) DEFAULT 0;
    DECLARE total_recycled_kg DECIMAL(10,2) DEFAULT 0;
    
    -- Calculate campus averages safely
    SELECT 
        COALESCE(AVG(participation_rate_percent), 0),
        COALESCE(AVG(avg_points_per_active_student), 0),
        COALESCE(SUM(total_kg), 0)
    INTO campus_avg_participation, campus_avg_points, total_recycled_kg
    FROM CurrentSemesterEngagement;

    -- Create temporary table for insights
    CREATE TEMPORARY TABLE IF NOT EXISTS TempInsights (
        insight_id INT AUTO_INCREMENT PRIMARY KEY,
        insight_category VARCHAR(50),
        insight_title VARCHAR(200),
        insight_description TEXT,
        recommendation TEXT,
        priority_level VARCHAR(20),
        affected_area VARCHAR(100)
    );

    -- =========================
    -- Insight 1: Overall Campus Performance
    -- =========================
    INSERT INTO TempInsights (insight_category, insight_title, insight_description, recommendation, priority_level, affected_area)
    SELECT 
        'Campus Performance',
        CONCAT('Overall Campus Recycling Performance: ', ROUND(campus_avg_participation, 1), '% Participation'),
        CONCAT('Current semester shows ', ROUND(campus_avg_participation, 1), '% participation rate with average ', ROUND(campus_avg_points, 0), ' points per active student.'),
        CASE 
            WHEN campus_avg_participation < 40 THEN 'Implement campus-wide recycling awareness week with bonus points'
            WHEN campus_avg_participation < 60 THEN 'Launch inter-faculty recycling competition'
            ELSE 'Maintain current initiatives and focus on sustaining engagement'
        END,
        CASE 
            WHEN campus_avg_participation < 40 THEN 'High'
            WHEN campus_avg_participation < 60 THEN 'Medium'
            ELSE 'Low'
        END,
        'Entire Campus'
    FROM dual;

    -- =========================
    -- Insight 2: Low Engagement Faculties
    -- =========================
    INSERT INTO TempInsights (insight_category, insight_title, insight_description, recommendation, priority_level, affected_area)
    SELECT 
        'Low Engagement',
        CONCAT('Low Engagement Detected: ', faculty),
        CONCAT('Faculty participation rate: ', COALESCE(participation_rate_percent, 0), '% (Below campus average of ', ROUND(campus_avg_participation, 1), '%)'),
        CONCAT('1. Deploy additional recycling bins in ', faculty, ' buildings
2. Organize faculty-specific recycling workshops
3. Appoint student recycling ambassadors
4. Offer exclusive rewards for ', faculty, ' students'),
        'High',
        faculty
    FROM CurrentSemesterEngagement
    WHERE COALESCE(participation_rate_percent, 0) < campus_avg_participation * 0.8;

    -- =========================
    -- Insight 3: Material Diversity
    -- =========================
    INSERT INTO TempInsights (insight_category, insight_title, insight_description, recommendation, priority_level, affected_area)
    SELECT 
        'Material Diversity',
        'Limited Material Type Recycling',
        CONCAT('Top material: ', top_material.material_type, ' (', ROUND(top_material.percentage_of_total, 1), '% of all recycling)'),
        CONCAT('1. Promote recycling of underutilized materials: ', underused_materials.underused_list, '
2. Offer bonus points for diverse material recycling
3. Educate on proper sorting of all materials'),
        'Medium',
        'Campus-wide'
    FROM (
        SELECT 
            material_type,
            ROUND((COUNT(*) * 100.0 / GREATEST((SELECT COUNT(*) FROM recycling_transactions),1)), 1) as percentage_of_total
        FROM recycling_transactions
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        GROUP BY material_type
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) AS top_material
    CROSS JOIN (
        SELECT COALESCE(GROUP_CONCAT(material_type SEPARATOR ', '), '') AS underused_list
        FROM (
            SELECT material_type 
            FROM recycling_transactions 
            GROUP BY material_type 
            ORDER BY COUNT(*) ASC 
            LIMIT 2
        ) AS sub_underused
    ) AS underused_materials;

    -- =========================
    -- Insight 4: Campaign-Driven Engagement
    -- =========================
    INSERT INTO TempInsights (insight_category, insight_title, insight_description, recommendation, priority_level, affected_area)
    SELECT 
        'Campaign Analysis',
        'Campaign-Driven Engagement Patterns',
        CONCAT('Events contributed ', COALESCE(ROUND((SELECT SUM(pointsCollected) FROM CampaignAnalytics WHERE goalPercent >= 100) / GREATEST((SELECT SUM(total_points) FROM CurrentSemesterEngagement),1) * 100, 0), 0), '% of total recycling points'),
        CONCAT('1. Schedule more ', 
               COALESCE((SELECT eventCategory FROM Event GROUP BY eventCategory ORDER BY COUNT(*) DESC LIMIT 1), 'general'), 
               ' type events
2. Align event timing with academic calendar
3. Increase promotion 2 weeks before events'),
        'Medium',
        'Event Management'
    FROM dual
    WHERE EXISTS (SELECT 1 FROM CampaignAnalytics WHERE goalPercent >= 100);

    -- =========================
    -- Insight 5: Temporal Patterns
    -- =========================
    INSERT INTO TempInsights (insight_category, insight_title, insight_description, recommendation, priority_level, affected_area)
    SELECT 
        'Temporal Analysis',
        'Weekly Recycling Patterns',
        CONCAT('Peak day: ', UPPER(peak_day), ' (', peak_day_activity, '% higher than average)'),
        CONCAT('1. Schedule collection drives on ', peak_day, 's
2. Offer time-based bonuses on low-activity days
3. Adjust bin collection schedule based on patterns'),
        'Low',
        'Operations'
    FROM (
        SELECT 
            DAYNAME(transaction_date) AS peak_day,
            ROUND((COUNT(*) * 100.0 / GREATEST(AVG_daily,1)) - 100, 0) AS peak_day_activity
        FROM recycling_transactions rt
        CROSS JOIN (
            SELECT COUNT(*) / GREATEST(COUNT(DISTINCT transaction_date),1) AS AVG_daily
            FROM recycling_transactions 
            WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ) AS avg_calc
        WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DAYNAME(transaction_date)
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) AS pattern_analysis;

    -- =========================
    -- Return all insights ordered by priority
    -- =========================
    SELECT * FROM TempInsights
    ORDER BY 
        CASE priority_level
            WHEN 'High' THEN 1
            WHEN 'Medium' THEN 2
            WHEN 'Low' THEN 3
            ELSE 4
        END,
        insight_category;

    -- Drop temporary table
    DROP TEMPORARY TABLE IF EXISTS TempInsights;

END //

DELIMITER ;


-- 3. View for strategic recommendations summary
CREATE OR REPLACE VIEW StrategicRecommendations AS
WITH FacultyPerformance AS (
    SELECT 
        faculty,
        participation_rate_percent,
        avg_points_per_active_student,
        RANK() OVER (ORDER BY participation_rate_percent DESC) as participation_rank,
        RANK() OVER (ORDER BY avg_points_per_active_student DESC) as points_rank
    FROM CurrentSemesterEngagement
),
MaterialAnalysis AS (
    SELECT 
        material_type,
        COUNT(*) as transaction_count,
        SUM(points_earned) as total_points,
        ROUND(SUM(quantity), 2) as total_kg,
        RANK() OVER (ORDER BY COUNT(*) DESC) as popularity_rank
    FROM recycling_transactions
    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    GROUP BY material_type
)
SELECT
    'Resource Allocation' as category,
    CONCAT('Increase resources for ', 
           (SELECT faculty FROM FacultyPerformance WHERE participation_rank = (SELECT MAX(participation_rank) FROM FacultyPerformance)),
           ' (Lowest participation)') as recommendation,
    'High' as priority
FROM dual
UNION ALL
SELECT 
    'Incentive Strategy',
    CONCAT('Focus on promoting ', 
           (SELECT material_type FROM MaterialAnalysis WHERE popularity_rank = (SELECT MAX(popularity_rank) FROM MaterialAnalysis)),
           ' recycling with bonus points'),
    'Medium'
FROM dual
UNION ALL
SELECT 
    'Infrastructure Planning',
    CONCAT('Deploy additional recycling stations in ', 
           (SELECT GROUP_CONCAT(faculty SEPARATOR ', ') 
            FROM FacultyPerformance 
            WHERE participation_rate_percent < 40),
           ' areas'),
    'High'
FROM dual
UNION ALL
SELECT 
    'Campaign Planning',
    CONCAT('Schedule next major campaign in ', 
           MONTHNAME(DATE_ADD(CURDATE(), INTERVAL 1 MONTH)),
           ' based on historical trends'),
    'Medium'
FROM dual
UNION ALL
SELECT 
    'Sustainability Goals',
    CONCAT('Aim to increase campus-wide participation to ', 
           ROUND((SELECT AVG(participation_rate_percent) FROM CurrentSemesterEngagement) * 1.2, 0),
           '% by next semester'),
    'High'
FROM dual;

-- 4. Procedure for generating customized recommendations
DELIMITER //
CREATE PROCEDURE GenerateCustomRecommendations(IN focus_area VARCHAR(50))
BEGIN
    CASE focus_area
        WHEN 'PARTICIPATION' THEN
            -- Focus on increasing participation
            SELECT 
                'Participation Enhancement' as focus_area,
                faculty,
                participation_rate_percent,
                CONCAT('Target: Increase to ', ROUND(participation_rate_percent * 1.3, 0), '%') as target,
                CONCAT('1. Launch ', faculty, '-specific challenges
2. Appoint recycling ambassadors
3. Regular awareness sessions
4. Faculty newsletter features') as action_plan
            FROM CurrentSemesterEngagement
            WHERE participation_rate_percent < 50
            ORDER BY participation_rate_percent ASC;
            
        WHEN 'PERFORMANCE' THEN
            -- Focus on improving performance
            SELECT 
                'Performance Improvement' as focus_area,
                faculty,
                avg_points_per_active_student,
                CONCAT('Target: ', ROUND(avg_points_per_active_student * 1.4, 0), ' points/student') as target,
                CONCAT('1. Bonus points for consistent recycling
2. Monthly performance recognition
3. Quality-based rewards
4. Skill-building workshops') as action_plan
            FROM CurrentSemesterEngagement
            WHERE avg_points_per_active_student < 75
            ORDER BY avg_points_per_active_student ASC;
            
        WHEN 'DIVERSITY' THEN
            -- Focus on material diversity
            SELECT 
                'Material Diversity' as focus_area,
                material_type,
                ROUND(percentage, 1) as current_percentage,
                CONCAT('Target: ', ROUND(percentage * 0.8, 1), '% reduction in dominance') as target,
                CONCAT('1. Promote ', 
                      (SELECT material_type FROM recycling_transactions 
                       GROUP BY material_type ORDER BY COUNT(*) ASC LIMIT 1),
                      ' recycling
2. Educational materials on all recyclables
3. Diversity bonus points
4. Material-specific collection days') as action_plan
            FROM (
                SELECT 
                    material_type,
                    (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM recycling_transactions)) as percentage
                FROM recycling_transactions
                GROUP BY material_type
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) as dominant_material;
            
        WHEN 'INFRASTRUCTURE' THEN
            -- Focus on infrastructure improvements
            SELECT 
                'Infrastructure Optimization' as focus_area,
                campus_zone,
                zone_participation_rate,
                CONCAT('Target: ', ROUND(zone_participation_rate * 1.25, 0), '% zone participation') as target,
                CONCAT('1. Additional bins in ', campus_zone, '
2. Improved signage
3. Regular maintenance schedule
4. Accessibility improvements') as action_plan
            FROM CampusZoneEngagement
            WHERE zone_participation_rate < 40
            ORDER BY zone_participation_rate ASC;
            
        ELSE
            -- Default: General recommendations
            SELECT * FROM StrategicRecommendations WHERE priority = 'High';
    END CASE;
END //
DELIMITER ;

-- 5. View for executive dashboard metrics
CREATE OR REPLACE VIEW ExecutiveSustainabilityDashboard AS
SELECT 
    'Campus Participation Rate' as metric,
    CONCAT(ROUND(AVG(participation_rate_percent), 1), '%') as value,
    CASE 
        WHEN AVG(participation_rate_percent) < 40 THEN 'Needs Immediate Attention'
        WHEN AVG(participation_rate_percent) < 60 THEN 'Requires Improvement'
        ELSE 'Satisfactory'
    END as status
FROM CurrentSemesterEngagement
UNION ALL
SELECT 
    'Total Recycled (Kg)',
    FORMAT(ROUND(SUM(total_kg), 0), 0),
    CASE 
        WHEN SUM(total_kg) < 500 THEN 'Below Target'
        WHEN SUM(total_kg) < 1000 THEN 'On Track'
        ELSE 'Exceeding Target'
    END
FROM (
    SELECT ROUND(SUM(quantity), 2) as total_kg
    FROM recycling_transactions
    WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
) as kg_summary
UNION ALL
SELECT 
    'Active Recycling Students',
    CONCAT(SUM(active_recyclers), '/', SUM(total_students)),
    CONCAT(ROUND((SUM(active_recyclers) * 100.0 / SUM(total_students)), 1), '% Active')
FROM CurrentSemesterEngagement
UNION ALL
SELECT 
    'Low Engagement Areas',
    (SELECT COUNT(*) FROM CurrentSemesterEngagement WHERE participation_rate_percent < 40),
    CASE 
        WHEN (SELECT COUNT(*) FROM CurrentSemesterEngagement WHERE participation_rate_percent < 40) > 3 THEN 'Multiple Areas Need Attention'
        WHEN (SELECT COUNT(*) FROM CurrentSemesterEngagement WHERE participation_rate_percent < 40) > 0 THEN 'Some Areas Need Attention'
        ELSE 'All Areas Performing Well'
    END
FROM dual
UNION ALL
SELECT 
    'Campaign Success Rate',
    CONCAT(ROUND((SELECT COUNT(*) FROM CampaignAnalytics WHERE goalPercent >= 100) * 100.0 / 
           (SELECT COUNT(*) FROM CampaignAnalytics), 0), '%'),
    CASE 
        WHEN (SELECT COUNT(*) FROM CampaignAnalytics WHERE goalPercent >= 100) * 100.0 / 
             (SELECT COUNT(*) FROM CampaignAnalytics) < 70 THEN 'Needs Review'
        ELSE 'Successful'
    END
FROM dual;

USE utm_remerit;

-- NotificationType Table
CREATE TABLE IF NOT EXISTS NotificationType (
    typeID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    typeName VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    icon VARCHAR(50),
    color VARCHAR(20),
    isActive BOOLEAN DEFAULT TRUE,
    createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_notification_type_name (typeName),
    INDEX idx_notification_type_active (isActive)
);

SELECT '✅ NotificationType table created!' as Message;

-- Create Notification table WITHOUT foreign keys first
CREATE TABLE IF NOT EXISTS Notification (
    notificationID VARCHAR(50) PRIMARY KEY,
    userID VARCHAR(36) NOT NULL,
    typeID VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON,
    isRead BOOLEAN DEFAULT FALSE,
    createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    readDate TIMESTAMP NULL
);

SELECT '✅ Notification table created (no FKs)!' as Message;

-- Add indexes separately
ALTER TABLE Notification 
ADD INDEX idx_notification_user (userID),
ADD INDEX idx_notification_type (typeID),
ADD INDEX idx_notification_read (isRead),
ADD INDEX idx_notification_created (createdDate),
ADD INDEX idx_notification_user_read (userID, isRead);

SELECT '✅ Indexes added to Notification table!' as Message;

-- Create UserLayoutPreference table
CREATE TABLE IF NOT EXISTS UserLayoutPreference (
    preferenceID INT AUTO_INCREMENT PRIMARY KEY,
    userID VARCHAR(36) NOT NULL,
    layoutConfig JSON,
    widgetOrder JSON,
    theme VARCHAR(20) DEFAULT 'light',
    fontSize VARCHAR(20) DEFAULT 'medium',
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SELECT '✅ UserLayoutPreference table created!' as Message;

-- Add unique constraint
ALTER TABLE UserLayoutPreference 
ADD UNIQUE INDEX idx_user_unique (userID);

SELECT '✅ Unique constraint added to UserLayoutPreference!' as Message;

-- Try adding foreign key to User table
ALTER TABLE Notification 
ADD CONSTRAINT fk_notification_user 
FOREIGN KEY (userID) REFERENCES User(userID) 
ON DELETE CASCADE;

SELECT '✅ Foreign key to User table added!' as Message;

-- Try adding foreign key to NotificationType table
ALTER TABLE Notification 
ADD CONSTRAINT fk_notification_type 
FOREIGN KEY (typeID) REFERENCES NotificationType(typeID) 
ON DELETE CASCADE;

SELECT '✅ Foreign key to NotificationType table added!' as Message;

-- Insert or update notification types
INSERT INTO NotificationType (typeID, typeName, description, icon, color) VALUES
('TYPE001', 'system', 'System notifications', 'bell', 'blue'),
('TYPE002', 'event', 'Event-related notifications', 'calendar', 'green'),
('TYPE003', 'report', 'Report-related notifications', 'file-text', 'orange'),
('TYPE004', 'user', 'User-related notifications', 'users', 'purple'),
('TYPE005', 'campaign', 'Campaign analytics notifications', 'trending-up', 'red')
ON DUPLICATE KEY UPDATE 
    typeName = VALUES(typeName),
    description = VALUES(description);

SELECT '✅ Notification types inserted/updated!' as Message;
SELECT * FROM NotificationType;

-- Insert sample notifications for admin user (U001)
INSERT INTO Notification (notificationID, userID, typeID, title, message, isRead, createdDate) VALUES
('NOTIF001', 'U001', 'TYPE001', 'Welcome to UTM ReMerit Admin', 'Your admin account has been successfully activated.', FALSE, NOW() - INTERVAL 2 DAY),
('NOTIF002', 'U001', 'TYPE002', 'New Event Registration', '5 new students have registered for "Plastic-Free Campus Campaign".', FALSE, NOW() - INTERVAL 1 DAY),
('NOTIF003', 'U001', 'TYPE003', 'Monthly Report Generated', 'January 2025 monthly report has been automatically generated.', FALSE, NOW() - INTERVAL 12 HOUR),
('NOTIF004', 'U001', 'TYPE004', 'New Admin Account Created', 'New admin account has been created for Dr. Ahmad.', TRUE, NOW() - INTERVAL 3 DAY),
('NOTIF005', 'U001', 'TYPE005', 'Campaign Target Achieved', '"Earth Day Recycling Drive 2025" has reached 100% of its goal!', FALSE, NOW() - INTERVAL 6 HOUR)
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    message = VALUES(message);

SELECT '✅ Sample notifications inserted!' as Message;
SELECT COUNT(*) as total_notifications FROM Notification;
