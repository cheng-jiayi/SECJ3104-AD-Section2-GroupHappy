-- ============================================
-- UTM ReMerit - Complete Database Setup
-- ============================================

-- First, disable safe updates for this session
SET SQL_SAFE_UPDATES = 0;

-- Create Database
DROP DATABASE IF EXISTS utm_remerit;

CREATE DATABASE IF NOT EXISTS utm_remerit
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE utm_remerit;

-- ============================================
-- ALL TABLE 
-- ============================================

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
    accountStatus ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    defaultPassword VARCHAR(100) DEFAULT 'password123',
    lastPasswordChange TIMESTAMP NULL,
    createdDateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP NULL DEFAULT NULL,
    
    INDEX idx_user_role (role),
    INDEX idx_user_email (email),
    INDEX idx_user_username (username),
    INDEX idx_user_utmid (utmID)
);

SELECT '✅ User table created!' as Message;

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

SELECT '✅ Student table created!' as Message;

-- ============================================
-- ADMINS TABLE (extends User)
-- ============================================
CREATE TABLE Admin (
    adminID VARCHAR(20) PRIMARY KEY,
    userID VARCHAR(36) NOT NULL UNIQUE,
    
    CONSTRAINT fk_admin_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    
    INDEX idx_admin_id (adminID)
);

SELECT '✅ Admin table created!' as Message;

-- ============================================
-- MATERIAL TYPE TABLE
-- ============================================
CREATE TABLE MaterialType (
    materialID INT PRIMARY KEY AUTO_INCREMENT,
    materialName VARCHAR(50) NOT NULL UNIQUE,
    materialClass VARCHAR(50) NOT NULL,
    recyclable BOOLEAN DEFAULT TRUE,
    measurementUnit ENUM('units', 'kg') DEFAULT 'units',
    pointsPerUnit INT DEFAULT 0,
    pointsPerKg INT DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SCAN TABLE
-- ============================================
CREATE TABLE Scan (
    scanID INT PRIMARY KEY AUTO_INCREMENT,
    userID VARCHAR(36) NOT NULL,
    totalItems INT DEFAULT 0,
    totalWeight DECIMAL(10,2) DEFAULT 0.00,
    totalPoints INT DEFAULT 0,
    scanMethod ENUM('camera', 'gallery', 'manual', 'ai') DEFAULT 'camera',
    scanAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploadStatus ENUM('pending', 'uploaded', 'failed', 'saved') DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_scan_user (userID),
    INDEX idx_scan_date (scanAt DESC),
    INDEX idx_scan_status (uploadStatus)
);

SELECT '✅ Scan table created!' as Message;

-- ============================================
-- RECYCLING TRANSACTIONS TABLE
-- ============================================
CREATE TABLE recycling_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userID VARCHAR(36) NOT NULL,
    material_type ENUM('plastic', 'paper', 'glass', 'metal') NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    points_earned INT NOT NULL,
    weight DECIMAL(10,2) DEFAULT 0.00,
    scanID INT,
    location VARCHAR(100),
    transaction_date DATE NOT NULL,
    status ENUM('finalized', 'corrected', 'pending') DEFAULT 'finalized',
    scan_method ENUM('camera', 'gallery', 'manual', 'ai') DEFAULT 'camera',
    recyclable BOOLEAN DEFAULT TRUE,
    confidence FLOAT DEFAULT 0.0,
    manual_entry BOOLEAN DEFAULT FALSE,
    ai_detected BOOLEAN DEFAULT TRUE,
    corrected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    FOREIGN KEY (scanID) REFERENCES Scan(scanID) ON DELETE SET NULL,
    
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_user_date (userID, transaction_date),
    INDEX idx_material_type (material_type),
    INDEX idx_scan_method (scan_method),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

SELECT '✅ RecyclingTransaction table created!' as Message;

-- ============================================
-- UPLOADEED IMAGE TABLE
-- ============================================
CREATE TABLE UploadedImage (
    imageID INT PRIMARY KEY AUTO_INCREMENT,
    scanID INT NOT NULL,
    userID VARCHAR(36) NOT NULL,
    imagePath VARCHAR(255) NOT NULL,
    imageType ENUM('scan', 'training', 'verification') DEFAULT 'scan',
    uploadAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    annotationStatus BOOLEAN DEFAULT FALSE,
    aiConfidence FLOAT DEFAULT 0.0,
    aiDetectedClasses JSON,
    FOREIGN KEY (scanID) REFERENCES Scan(scanID) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_image_scan (scanID),
    INDEX idx_image_user (userID),
    INDEX idx_image_date (uploadAt)
);

SELECT '✅ UploadedImage table created!' as Message;

-- ============================================
-- SCAN AUDIT TABLE
-- ============================================
CREATE TABLE ScanAudit (
    auditID INT PRIMARY KEY AUTO_INCREMENT,
    scanID INT NOT NULL,
    userID VARCHAR(36) NOT NULL,
    actionType ENUM('create', 'update', 'delete', 'correct', 'finalize') NOT NULL,
    actionDetails JSON,
    performedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    performedBy VARCHAR(36) NOT NULL,
    FOREIGN KEY (scanID) REFERENCES Scan(scanID) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    FOREIGN KEY (performedBy) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_scan_audit (scanID, performedAt)
);

SELECT '✅ ScanAudit table created!' as Message;

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
    status ENUM('Upcoming', 'Ongoing', 'Completed') NOT NULL,
    createdBy VARCHAR(20),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_event_created_by FOREIGN KEY (createdBy) REFERENCES Admin(adminID) ON DELETE SET NULL,
    CONSTRAINT chk_event_duration CHECK (
        DATEDIFF(eventEndDate, eventStartDate) <= 60 
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

SELECT '✅ Event table created!' as Message;

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

SELECT '✅ Participation table created!' as Message;

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
    CONSTRAINT chk_goal_percent CHECK (goalPercent >= 0 AND goalPercent <= 150),
    CONSTRAINT chk_average_points CHECK (averagePoints >= 0),
    CONSTRAINT chk_participants CHECK (participants >= 0),
    CONSTRAINT chk_points_collected CHECK (pointsCollected >= 0),
    
    INDEX idx_analytics_date (snapshotDate),
    INDEX idx_analytics_goal (goalPercent),
    INDEX idx_analytics_event (eventID)
);

SELECT '✅ CampaignAnalytics table created!' as Message;

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

SELECT '✅ AnalyticsReport table created!' as Message;

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

SELECT '✅ CampaignAnalyticsSnapshot table created!' as Message;

-- ============================================
-- BIN TYPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS Bin_Types (
    bin_type_id INT PRIMARY KEY AUTO_INCREMENT,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_name (type_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ BinTypes table created!' as Message;

-- ============================================
-- STATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS STATIONS (
    station_id INT PRIMARY KEY AUTO_INCREMENT,
    station_name VARCHAR(100) NOT NULL UNIQUE,
    latitude DECIMAL(10,6) NOT NULL,
    longitude DECIMAL(10,6) NOT NULL,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_station_name (station_name),
    INDEX idx_location (latitude, longitude),
    CONSTRAINT chk_station_coordinates CHECK (
        latitude BETWEEN -90 AND 90 AND 
        longitude BETWEEN -180 AND 180
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Stations table created!' as Message;

-- ============================================
-- RECYCLING_BINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS Recycling_Bins (
    bin_id INT PRIMARY KEY AUTO_INCREMENT,
    station_id INT NOT NULL,
    bin_type_id INT NOT NULL,
    bin_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Full', 'Under Maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES STATIONS(station_id) ON DELETE CASCADE,
    FOREIGN KEY (bin_type_id) REFERENCES Bin_Types(bin_type_id) ON DELETE RESTRICT,
    INDEX idx_bin_name (bin_name),
    INDEX idx_status (status),
    INDEX idx_bin_type (bin_type_id),
    INDEX idx_station (station_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ RecyclingBins table created!' as Message;

-- ============================================
-- BIN ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS Bin_Issues (
    issue_id INT PRIMARY KEY AUTO_INCREMENT,
    bin_id INT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    issue_type VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    photo_url VARCHAR(255),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Ignored')),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (bin_id) REFERENCES Recycling_Bins(bin_id) ON DELETE CASCADE,
    INDEX idx_bin_id (bin_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_issue_type (issue_type),
    INDEX idx_reported_at (reported_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ BinIssues table created!' as Message;

-- ============================================
-- ENGAGEMENT THRESHOLD TABLE
-- ============================================
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

SELECT '✅ EngagementThreshold table created!' as Message;

-- ============================================
-- SUSTAINABILITY INSIGHTS TABLE
-- ============================================
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

SELECT '✅ SustainabilityInsights table created!' as Message;

-- ============================================
-- NOTIFICATION TYPE TABLE
-- ============================================
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

-- ============================================
-- NOTIFICATION TABLE
-- ============================================
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

-- ============================================
-- Subsystem 1 Module 2 - Profile
-- ============================================

-- ============================================
-- 1. CREATE TABLES (Only if they don't exist)
-- ============================================

-- Notification Preferences Table (only create if not exists)
CREATE TABLE IF NOT EXISTS UserNotificationSettings (
    userID VARCHAR(36) PRIMARY KEY,
    emailNotifications BOOLEAN DEFAULT TRUE,
    pushNotifications BOOLEAN DEFAULT TRUE,
    recycleReminders BOOLEAN DEFAULT TRUE,
    pointUpdates BOOLEAN DEFAULT TRUE,
    promotionalOffers BOOLEAN DEFAULT FALSE,
    updatedDateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notification_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_notification_user (userID)
);

-- User Sessions Table (only create if not exists)
CREATE TABLE IF NOT EXISTS UserSessions (
    sessionID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userID VARCHAR(36) NOT NULL,
    deviceInfo VARCHAR(500),
    loginTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isActive BOOLEAN DEFAULT TRUE,
    ipAddress VARCHAR(45),
    
    CONSTRAINT fk_session_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_session_user (userID),
    INDEX idx_session_active (isActive),
    INDEX idx_session_time (loginTime)
);

-- Password History Table (only create if not exists)
CREATE TABLE IF NOT EXISTS PasswordHistory (
    historyID INT AUTO_INCREMENT PRIMARY KEY,
    userID VARCHAR(36) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_password_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_password_user (userID),
    INDEX idx_password_changed (changedAt)
);

-- Default Settings Table (only create if not exists)
CREATE TABLE IF NOT EXISTS DefaultSettings (
    settingID INT AUTO_INCREMENT PRIMARY KEY,
    settingKey VARCHAR(50) NOT NULL UNIQUE,
    settingValue TEXT NOT NULL,
    description TEXT,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (settingKey)
);

-- UTMID Format Reference Table (only create if not exists)
CREATE TABLE IF NOT EXISTS UTMIDFormatRules (
    ruleID INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(200),
    exampleName VARCHAR(100),
    exampleUTMID VARCHAR(50),
    exampleEmail VARCHAR(100),
    
    INDEX idx_utm_format_desc (description)
);

SELECT '✅ Profile module tables created (if not exist)!' as Message;

