-- ============================================
-- UTM REMERIT - COMPLETE DATABASE SETUP v2.2
-- Profile Management Module (UC23, UC24, UC25)
-- ============================================

SET SQL_SAFE_UPDATES = 0;
DROP DATABASE IF EXISTS utm_remerit;
CREATE DATABASE utm_remerit;
USE utm_remerit;

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- User Table
CREATE TABLE User (
    userID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    utmID VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
    contactNumber VARCHAR(20),
    address VARCHAR(500),
    profilePicture VARCHAR(500),
    accountStatus ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    defaultPassword VARCHAR(100) DEFAULT 'password123',
    lastPasswordChange TIMESTAMP NULL,
    createdDateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastLogin TIMESTAMP NULL,
    
    INDEX idx_user_role (role),
    INDEX idx_user_email (email),
    INDEX idx_user_utmid (utmID)
);

-- Student Table
CREATE TABLE Student (
    studentID VARCHAR(20) PRIMARY KEY,
    userID VARCHAR(36) NOT NULL UNIQUE,
    faculty VARCHAR(50) NOT NULL,
    yearOfStudy INT DEFAULT 1,
    totalPoints INT DEFAULT 0,
    totalMerits INT DEFAULT 0,
    totalItemsRecycled INT DEFAULT 0,
    totalWeightRecycled DECIMAL(10,2) DEFAULT 0.00,
    
    CONSTRAINT fk_student_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    
    INDEX idx_student_faculty (faculty)
);

-- Admin Table
CREATE TABLE Admin (
    adminID VARCHAR(20) PRIMARY KEY,
    userID VARCHAR(36) NOT NULL UNIQUE,
    
    CONSTRAINT fk_admin_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE
);

-- Notification Preferences Table
CREATE TABLE UserNotificationSettings (
    userID VARCHAR(36) PRIMARY KEY,
    emailNotifications BOOLEAN DEFAULT TRUE,
    pushNotifications BOOLEAN DEFAULT TRUE,
    recycleReminders BOOLEAN DEFAULT TRUE,
    pointUpdates BOOLEAN DEFAULT TRUE,
    promotionalOffers BOOLEAN DEFAULT FALSE,
    updatedDateTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notification_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE
);

-- User Sessions Table
CREATE TABLE UserSessions (
    sessionID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    userID VARCHAR(36) NOT NULL,
    deviceInfo VARCHAR(500),
    loginTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastActivity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isActive BOOLEAN DEFAULT TRUE,
    ipAddress VARCHAR(45),
    
    CONSTRAINT fk_session_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_session_user (userID)
);

-- Password History Table
CREATE TABLE PasswordHistory (
    historyID INT AUTO_INCREMENT PRIMARY KEY,
    userID VARCHAR(36) NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    changedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_password_user FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE
);

-- Default Settings Table
CREATE TABLE DefaultSettings (
    settingID INT AUTO_INCREMENT PRIMARY KEY,
    settingKey VARCHAR(50) NOT NULL UNIQUE,
    settingValue TEXT NOT NULL,
    description TEXT,
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- UTMID Format Reference Table
CREATE TABLE UTMIDFormatRules (
    ruleID INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(200),
    exampleName VARCHAR(100),
    exampleUTMID VARCHAR(50),
    exampleEmail VARCHAR(100)
);

-- ============================================
-- 2. INSERT DEFAULT SETTINGS
-- ============================================

INSERT INTO DefaultSettings (settingKey, settingValue, description) VALUES
('DEFAULT_PASSWORD', 'password123', 'Default password for new users'),
('MIN_PASSWORD_LENGTH', '8', 'Minimum password length'),
('SESSION_TIMEOUT', '30', 'Session timeout in minutes'),
('MAX_LOGIN_ATTEMPTS', '5', 'Max failed login attempts'),
('UTMID_GENERATION_RULE', 'firstname.lastname', 'UTMID generation format'),
('EMAIL_DOMAIN_STUDENT', 'graduate.utm.my', 'Email domain for students'),
('EMAIL_DOMAIN_ADMIN', 'utm.my', 'Email domain for admin/staff');

-- Insert UTMID format examples
INSERT INTO UTMIDFormatRules (description, exampleName, exampleUTMID, exampleEmail) VALUES
('Full name with middle name', 'Ali bin Raj', 'ali.raj', 'ali.raj@graduate.utm.my'),
('Single name (no surname)', 'Muhammad', 'muhammad', 'muhammad@graduate.utm.my'),
('Two-part name', 'Tan Wei Ling', 'tan.weiling', 'tan.weiling@graduate.utm.my'),
('Three-part name', 'Ahmad Firdaus bin Ismail', 'ahmad.firdaus', 'ahmad.firdaus@graduate.utm.my'),
('Name with "bin"/"binti"', 'Siti Aishah binti Mohd', 'siti.aishah', 'siti.aishah@graduate.utm.my');

-- ============================================
-- 3. INSERT DEMO USERS WITH PROPER UTMID FORMAT
-- ============================================

-- Insert Admins (using professional naming format)
INSERT INTO User (userID, username, password, fullName, utmID, email, role) VALUES
('ADM001', 'admin1', 'password123', 'Dr. Sarah Lim', 'sarah.lim', 'sarah.lim@utm.my', 'admin'),
('ADM002', 'admin2', 'password123', 'Ahmad Faiz bin Ismail', 'ahmad.faiz', 'ahmad.faiz@utm.my', 'admin'),
('ADM003', 'admin3', 'password123', 'Prof. Tan Wei Ling', 'tan.weiling', 'tan.weiling@utm.my', 'admin');

-- Insert Students with proper UTMID format
INSERT INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address) VALUES
-- Main demo student (Ali bin Raj)
('U022', 'ali.raj001', 'password123', 'Ali bin Raj', 'ali.raj', 'ali.raj@graduate.utm.my', 'student', '010-8201396', 'L12a, KTHO, UTM SKUDAI'),

-- Additional students with various name formats
('U010', 'raj.kumar003', 'password123', 'Raj Kumar a/l Maniam', 'raj.kumar', 'raj.kumar@graduate.utm.my', 'student', '011-23456789', 'Block C, Kolej 2, UTM'),
('U005', 'siti.norhaliza002', 'password123', 'Siti Norhaliza binti Mohd', 'siti.norhaliza', 'siti.norhaliza@graduate.utm.my', 'student', '012-3456789', 'Block A, UTM Residence'),
('U029', 'kenji.tanaka107', 'password123', 'Kenji Tanaka', 'kenji.tanaka', 'kenji.tanaka@graduate.utm.my', 'student', '013-4567890', 'International House, UTM'),
('U014', 'michael.wong104', 'password123', 'Michael Wong Chen Lee', 'michael.wong', 'michael.wong@graduate.utm.my', 'student', '014-5678901', 'Taman Universiti, Skudai'),
('U035', 'ahmad.firdaus005', 'password123', 'Ahmad Firdaus bin Abdullah', 'ahmad.firdaus', 'ahmad.firdaus@graduate.utm.my', 'student', '015-6789012', 'Kolej 9, UTM'),
('U036', 'muhammad001', 'password123', 'Muhammad', 'muhammad', 'muhammad@graduate.utm.my', 'student', '016-7890123', 'Kolej 3, UTM'),
('U037', 'fatimah.aziz008', 'password123', 'Fatimah Aziz binte Rahman', 'fatimah.aziz', 'fatimah.aziz@graduate.utm.my', 'student', '017-8901234', 'Kolej 5, UTM'),
('U038', 'john.smith009', 'password123', 'John Smith', 'john.smith', 'john.smith@graduate.utm.my', 'student', '018-9012345', 'International House, UTM'),
('U039', 'lee.siewchin010', 'password123', 'Lee Siew Chin', 'lee.siewchin', 'lee.siewchin@graduate.utm.my', 'student', '019-0123456', 'Kolej 12, UTM');

-- Insert Admin records
INSERT INTO Admin (adminID, userID) VALUES
('ADM001', 'ADM001'),
('ADM002', 'ADM002'),
('ADM003', 'ADM003');

-- Insert Student records
INSERT INTO Student (studentID, userID, faculty, yearOfStudy, totalPoints, totalMerits, totalItemsRecycled, totalWeightRecycled) VALUES
('A23EN0001', 'U022', 'FKE', 3, 1500, 120, 45, 67.5),
('A23CS0001', 'U010', 'FC', 4, 850, 65, 28, 42.0),
('A23BU0001', 'U005', 'FABU', 2, 620, 45, 22, 33.0),
('A23EN0008', 'U029', 'FKE', 3, 1100, 85, 35, 52.5),
('A23CS0005', 'U014', 'FC', 4, 720, 55, 25, 37.5),
('A23MG0001', 'U035', 'FKM', 2, 930, 70, 32, 48.0),
('A23CS0006', 'U036', 'FC', 1, 250, 15, 10, 15.0),
('A23EN0009', 'U037', 'FKE', 2, 480, 35, 18, 27.0),
('A23IS0001', 'U038', 'FSKM', 3, 890, 68, 30, 45.0),
('A23MG0002', 'U039', 'FKM', 4, 1120, 92, 40, 60.0);

-- ============================================
-- 4. INSERT NOTIFICATION PREFERENCES
-- ============================================

INSERT INTO UserNotificationSettings (userID, emailNotifications, pushNotifications, recycleReminders, pointUpdates, promotionalOffers) VALUES
('U022', 1, 1, 1, 1, 0),
('U010', 1, 1, 1, 1, 0),
('U005', 1, 1, 1, 1, 0),
('U029', 1, 1, 1, 1, 0),
('U014', 1, 1, 1, 1, 1),
('U035', 1, 1, 1, 1, 0),
('U036', 1, 1, 1, 1, 0),
('U037', 1, 0, 1, 1, 0),
('U038', 1, 1, 0, 1, 1),
('U039', 0, 1, 1, 1, 0),
('ADM001', 1, 1, 0, 0, 0),
('ADM002', 1, 1, 0, 0, 0),
('ADM003', 1, 0, 0, 0, 0);

-- ============================================
-- 5. INSERT SAMPLE SESSIONS
-- ============================================

INSERT INTO UserSessions (userID, deviceInfo, ipAddress) VALUES
('U022', 'Android Phone - Samsung Galaxy S23', '192.168.1.101'),
('U022', 'Windows PC - Chrome Browser', '192.168.1.102'),
('U010', 'iPhone 14 - Safari Browser', '192.168.1.103'),
('U005', 'Android Tablet - Samsung Tab S8', '192.168.1.104'),
('U029', 'MacBook Pro - Safari Browser', '192.168.1.105'),
('U014', 'Windows Laptop - Firefox Browser', '192.168.1.106'),
('U035', 'iPad - Safari Browser', '192.168.1.107'),
('ADM001', 'Admin Desktop - Chrome Browser', '192.168.1.108');

-- ============================================
-- 6. CREATE VIEWS
-- ============================================

CREATE VIEW UserAccountSettings AS
SELECT 
    u.userID,
    u.username,
    u.fullName,
    u.email,
    u.role,
    DATE_FORMAT(u.createdDateTime, '%Y') as memberSince,
    uns.emailNotifications,
    uns.pushNotifications,
    uns.recycleReminders,
    uns.pointUpdates,
    uns.promotionalOffers,
    uns.updatedDateTime as preferencesUpdated,
    (SELECT COUNT(*) FROM UserSessions WHERE userID = u.userID AND isActive = TRUE) as activeSessions,
    u.lastLogin,
    u.password as currentPassword,
    u.defaultPassword
FROM User u
LEFT JOIN UserNotificationSettings uns ON u.userID = uns.userID;

CREATE VIEW StudentProfileView AS
SELECT 
    u.userID,
    u.fullName,
    u.utmID,
    u.email,
    u.role,
    u.contactNumber,
    u.address,
    u.profilePicture,
    u.accountStatus,
    DATE_FORMAT(u.createdDateTime, '%Y') as memberSince,
    s.studentID as matricNo,
    s.faculty,
    s.yearOfStudy,
    s.totalPoints,
    s.totalMerits,
    s.totalItemsRecycled,
    s.totalWeightRecycled,
    (SELECT COUNT(*) FROM UserSessions WHERE userID = u.userID AND isActive = TRUE) as activeSessions
FROM User u
LEFT JOIN Student s ON u.userID = s.userID
WHERE u.role = 'student';

-- ============================================
-- 7. CREATE STORED PROCEDURES (FIXED VERSIONS)
-- ============================================

DELIMITER $$

-- Procedure to update notification preferences
CREATE PROCEDURE UpdateNotificationPreferences(
    IN p_userID VARCHAR(36),
    IN p_emailNotifications BOOLEAN,
    IN p_pushNotifications BOOLEAN,
    IN p_recycleReminders BOOLEAN,
    IN p_pointUpdates BOOLEAN,
    IN p_promotionalOffers BOOLEAN
)
BEGIN
    INSERT INTO UserNotificationSettings (
        userID, 
        emailNotifications, 
        pushNotifications, 
        recycleReminders, 
        pointUpdates, 
        promotionalOffers
    ) VALUES (
        p_userID, 
        p_emailNotifications, 
        p_pushNotifications,
        p_recycleReminders, 
        p_pointUpdates, 
        p_promotionalOffers
    )
    ON DUPLICATE KEY UPDATE
        emailNotifications = p_emailNotifications,
        pushNotifications = p_pushNotifications,
        recycleReminders = p_recycleReminders,
        pointUpdates = p_pointUpdates,
        promotionalOffers = p_promotionalOffers,
        updatedDateTime = CURRENT_TIMESTAMP;
    
    SELECT 'Notification preferences updated successfully' as message;
END$$

-- Procedure to logout user from all devices
CREATE PROCEDURE LogoutUserFromAllDevices(IN p_userID VARCHAR(36))
BEGIN
    UPDATE UserSessions 
    SET isActive = FALSE 
    WHERE userID = p_userID AND isActive = TRUE;
    
    SELECT CONCAT(ROW_COUNT(), ' active sessions terminated') as message;
END$$

-- Procedure to reset all settings to default
CREATE PROCEDURE ResetUserSettingsToDefault(IN p_userID VARCHAR(36))
BEGIN
    -- Reset notification preferences
    UPDATE UserNotificationSettings 
    SET 
        emailNotifications = TRUE,
        pushNotifications = TRUE,
        recycleReminders = TRUE,
        pointUpdates = TRUE,
        promotionalOffers = FALSE,
        updatedDateTime = CURRENT_TIMESTAMP
    WHERE userID = p_userID;
    
    -- Reset password to default
    UPDATE User 
    SET password = (SELECT settingValue FROM DefaultSettings WHERE settingKey = 'DEFAULT_PASSWORD')
    WHERE userID = p_userID;
    
    -- Log out from all devices
    UPDATE UserSessions 
    SET isActive = FALSE 
    WHERE userID = p_userID AND isActive = TRUE;
    
    SELECT 'All user settings have been reset to default values' as message;
END$$

DELIMITER ;

-- ============================================
-- 8. CREATE TRIGGERS
-- ============================================

DELIMITER $$

CREATE TRIGGER CreateDefaultNotifications
AFTER INSERT ON User
FOR EACH ROW
BEGIN
    INSERT INTO UserNotificationSettings (userID) VALUES (NEW.userID);
END$$

DELIMITER ;

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

SELECT '=== DATABASE SETUP COMPLETE ===' as Message;
SELECT ' ' as Spacer;

SELECT 'USER SUMMARY:' as Title;
SELECT 
    role,
    COUNT(*) as count,
    GROUP_CONCAT(utmID ORDER BY fullName LIMIT 3) as sample_utmids
FROM User 
GROUP BY role;

SELECT ' ' as Spacer;

SELECT 'NOTIFICATION SETTINGS:' as Title;
SELECT 
    u.fullName,
    uns.emailNotifications,
    uns.pushNotifications,
    uns.recycleReminders,
    uns.pointUpdates,
    uns.promotionalOffers
FROM User u
JOIN UserNotificationSettings uns ON u.userID = uns.userID
WHERE u.userID = 'U022';

SELECT ' ' as Spacer;

SELECT '✅ PROFILE MANAGEMENT MODULE DATABASE READY!' as Final_Message;
SELECT 'UC23 (View Profile), UC24 (Update Profile), UC25 (Account Settings) - All Supported' as Note;

-- new

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS UpdateNotificationPreferences;
DROP PROCEDURE IF EXISTS LogoutUserFromAllDevices;
DROP PROCEDURE IF EXISTS ResetUserSettingsToDefault;

DELIMITER $$

-- Fixed Procedure to update notification preferences
CREATE PROCEDURE UpdateNotificationPreferences(
    IN p_userID VARCHAR(36),
    IN p_emailNotifications BOOLEAN,
    IN p_pushNotifications BOOLEAN,
    IN p_recycleReminders BOOLEAN,
    IN p_pointUpdates BOOLEAN,
    IN p_promotionalOffers BOOLEAN
)
BEGIN
    INSERT INTO UserNotificationSettings (
        userID, 
        emailNotifications, 
        pushNotifications, 
        recycleReminders, 
        pointUpdates, 
        promotionalOffers,
        updatedDateTime
    ) VALUES (
        p_userID, 
        p_emailNotifications, 
        p_pushNotifications,
        p_recycleReminders, 
        p_pointUpdates, 
        p_promotionalOffers,
        CURRENT_TIMESTAMP
    )
    ON DUPLICATE KEY UPDATE
        emailNotifications = p_emailNotifications,
        pushNotifications = p_pushNotifications,
        recycleReminders = p_recycleReminders,
        pointUpdates = p_pointUpdates,
        promotionalOffers = p_promotionalOffers,
        updatedDateTime = CURRENT_TIMESTAMP;
    
    SELECT 'Notification preferences updated successfully' as message;
END$$

-- Fixed Procedure to logout user from all devices
CREATE PROCEDURE LogoutUserFromAllDevices(IN p_userID VARCHAR(36))
BEGIN
    UPDATE UserSessions 
    SET isActive = FALSE 
    WHERE userID = p_userID AND isActive = TRUE;
    
    SELECT CONCAT(ROW_COUNT(), ' active sessions terminated') as sessionsTerminated;
END$$

-- Fixed Procedure to reset all settings to default
CREATE PROCEDURE ResetUserSettingsToDefault(IN p_userID VARCHAR(36))
BEGIN
    -- Reset notification preferences
    INSERT INTO UserNotificationSettings (
        userID, 
        emailNotifications, 
        pushNotifications, 
        recycleReminders, 
        pointUpdates, 
        promotionalOffers,
        updatedDateTime
    ) VALUES (
        p_userID, 
        TRUE, 
        TRUE,
        TRUE, 
        TRUE, 
        FALSE,
        CURRENT_TIMESTAMP
    )
    ON DUPLICATE KEY UPDATE
        emailNotifications = TRUE,
        pushNotifications = TRUE,
        recycleReminders = TRUE,
        pointUpdates = TRUE,
        promotionalOffers = FALSE,
        updatedDateTime = CURRENT_TIMESTAMP;
    
    -- Reset password to default
    UPDATE User 
    SET password = (
        SELECT settingValue 
        FROM DefaultSettings 
        WHERE settingKey = 'DEFAULT_PASSWORD'
        LIMIT 1
    )
    WHERE userID = p_userID;
    
    -- Log out from all devices
    UPDATE UserSessions 
    SET isActive = FALSE 
    WHERE userID = p_userID AND isActive = TRUE;
    
    SELECT 'All user settings have been reset to default values' as message;
END$$

DELIMITER ;

-- Test the procedures
CALL UpdateNotificationPreferences('U022', 1, 0, 1, 0, 1);
CALL LogoutUserFromAllDevices('U022');
CALL ResetUserSettingsToDefault('U022');

-- Verify the changes
SELECT 
    u.fullName,
    uns.emailNotifications,
    uns.pushNotifications,
    uns.recycleReminders,
    uns.pointUpdates,
    uns.promotionalOffers,
    uns.updatedDateTime
FROM User u
JOIN UserNotificationSettings uns ON u.userID = uns.userID
WHERE u.userID = 'U022';
