-- ============================================
-- 2. INSERT DEFAULT SETTINGS (Only if not exist)
-- ============================================

INSERT IGNORE INTO DefaultSettings (settingKey, settingValue, description) VALUES
('DEFAULT_PASSWORD', 'password123', 'Default password for new users'),
('MIN_PASSWORD_LENGTH', '8', 'Minimum password length'),
('SESSION_TIMEOUT', '30', 'Session timeout in minutes'),
('MAX_LOGIN_ATTEMPTS', '5', 'Max failed login attempts'),
('UTMID_GENERATION_RULE', 'firstname.lastname', 'UTMID generation format'),
('EMAIL_DOMAIN_STUDENT', 'graduate.utm.my', 'Email domain for students'),
('EMAIL_DOMAIN_ADMIN', 'utm.my', 'Email domain for admin/staff');

-- Insert UTMID format examples (only if not exist)
INSERT IGNORE INTO UTMIDFormatRules (description, exampleName, exampleUTMID, exampleEmail) VALUES
('Full name with middle name', 'Ali bin Raj', 'ali.raj', 'ali.raj@graduate.utm.my'),
('Single name (no surname)', 'Muhammad', 'muhammad', 'muhammad@graduate.utm.my'),
('Two-part name', 'Tan Wei Ling', 'tan.weiling', 'tan.weiling@graduate.utm.my'),
('Three-part name', 'Ahmad Firdaus bin Ismail', 'ahmad.firdaus', 'ahmad.firdaus@graduate.utm.my'),
('Name with "bin"/"binti"', 'Siti Aishah binti Mohd', 'siti.aishah', 'siti.aishah@graduate.utm.my');

SELECT '✅ Default settings inserted (if not exist)!' as Message;

-- ============================================
-- 3. UPDATE DEMO USERS (Using IGNORE to avoid conflicts)
-- ============================================

-- Note: These users may already exist, so we use IGNORE
-- Insert or update Users with proper UTMID format
INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address) VALUES
-- Main demo student (Ali bin Raj) - using different ID to avoid conflict
('U100', 'ali.raj001', 'hashed_password_1', 'Ali bin Raj', 'ali.raj.test', 'ali.raj.test@graduate.utm.my', 'student', '010-8201396', 'L12a, KTHO, UTM SKUDAI'),

-- Additional students with various name formats
('U101', 'raj.kumar003', 'hashed_password_2', 'Raj Kumar a/l Maniam', 'raj.kumar.test', 'raj.kumar.test@graduate.utm.my', 'student', '011-23456789', 'Block C, Kolej 2, UTM'),
('U102', 'siti.test002', 'hashed_password_3', 'Siti Norhaliza binti Mohd', 'siti.test002', 'siti.test002@graduate.utm.my', 'student', '012-3456789', 'Block A, UTM Residence'),
('U103', 'kenji.test107', 'hashed_password_4', 'Kenji Tanaka', 'kenji.test107', 'kenji.test107@graduate.utm.my', 'student', '013-4567890', 'International House, UTM'),
('U104', 'michael.test104', 'hashed_password_5', 'Michael Wong Chen Lee', 'michael.test104', 'michael.test104@graduate.utm.my', 'student', '014-5678901', 'Taman Universiti, Skudai'),
('U105', 'ahmad.test005', 'hashed_password_6', 'Ahmad Firdaus bin Abdullah', 'ahmad.test005', 'ahmad.test005@graduate.utm.my', 'student', '015-6789012', 'Kolej 9, UTM'),
('U106', 'muhammad.test001', 'hashed_password_7', 'Muhammad Test', 'muhammad.test', 'muhammad.test@graduate.utm.my', 'student', '016-7890123', 'Kolej 3, UTM'),
('U107', 'fatimah.test008', 'hashed_password_8', 'Fatimah Aziz binte Rahman', 'fatimah.test008', 'fatimah.test008@graduate.utm.my', 'student', '017-8901234', 'Kolej 5, UTM'),
('U108', 'john.test009', 'hashed_password_9', 'John Smith Test', 'john.test009', 'john.test009@graduate.utm.my', 'student', '018-9012345', 'International House, UTM'),
('U109', 'lee.test010', 'hashed_password_10', 'Lee Siew Chin Test', 'lee.test010', 'lee.test010@graduate.utm.my', 'student', '019-0123456', 'Kolej 12, UTM');

-- Insert Student records for new users (if they don't exist)
INSERT IGNORE INTO Student (studentID, userID, faculty, yearOfStudy, totalPoints, totalMerits, totalItemsRecycled, totalWeightRecycled) VALUES
('A23TEST001', 'U100', 'FKE', 3, 1500, 120, 45, 67.5),
('A23TEST002', 'U101', 'FK', 4, 850, 65, 28, 42.0),
('A23TEST003', 'U102', 'FABU', 2, 620, 45, 22, 33.0),
('A23TEST004', 'U103', 'FKE', 3, 1100, 85, 35, 52.5),
('A23TEST005', 'U104', 'FK', 4, 720, 55, 25, 37.5),
('A23TEST006', 'U105', 'FKM', 2, 930, 70, 32, 48.0),
('A23TEST007', 'U106', 'FK', 1, 250, 15, 10, 15.0),
('A23TEST008', 'U107', 'FKE', 2, 480, 35, 18, 27.0),
('A23TEST009', 'U108', 'FK', 3, 890, 68, 30, 45.0),
('A23TEST010', 'U109', 'FKM', 4, 1120, 92, 40, 60.0);

SELECT '✅ Test users created (if not exist)!' as Message;

-- ============================================
-- 4. INSERT NOTIFICATION PREFERENCES (Only for new users)
-- ============================================

INSERT IGNORE INTO UserNotificationSettings (userID, emailNotifications, pushNotifications, recycleReminders, pointUpdates, promotionalOffers) VALUES
('U100', 1, 1, 1, 1, 0),
('U101', 1, 1, 1, 1, 0),
('U102', 1, 1, 1, 1, 0),
('U103', 1, 1, 1, 1, 0),
('U104', 1, 1, 1, 1, 1),
('U105', 1, 1, 1, 1, 0),
('U106', 1, 1, 1, 1, 0),
('U107', 1, 0, 1, 1, 0),
('U108', 1, 1, 0, 1, 1),
('U109', 0, 1, 1, 1, 0);

-- Also add notification settings for existing admin users if they don't have them
INSERT IGNORE INTO UserNotificationSettings (userID, emailNotifications, pushNotifications, recycleReminders, pointUpdates, promotionalOffers) 
SELECT u.userID, 1, 1, 0, 0, 0
FROM User u
WHERE u.role = 'admin' 
AND u.userID NOT IN (SELECT userID FROM UserNotificationSettings);

SELECT '✅ Notification preferences set for test users!' as Message;

-- ============================================
-- 5. INSERT SAMPLE SESSIONS (For new users only)
-- ============================================

INSERT IGNORE INTO UserSessions (sessionID, userID, deviceInfo, ipAddress) VALUES
(UUID(), 'U100', 'Android Phone - Samsung Galaxy S23', '192.168.1.101'),
(UUID(), 'U100', 'Windows PC - Chrome Browser', '192.168.1.102'),
(UUID(), 'U101', 'iPhone 14 - Safari Browser', '192.168.1.103'),
(UUID(), 'U102', 'Android Tablet - Samsung Tab S8', '192.168.1.104'),
(UUID(), 'U103', 'MacBook Pro - Safari Browser', '192.168.1.105'),
(UUID(), 'U104', 'Windows Laptop - Firefox Browser', '192.168.1.106'),
(UUID(), 'U105', 'iPad - Safari Browser', '192.168.1.107');

SELECT '✅ Sample sessions created for test users!' as Message;

-- ============================================
-- 6. CREATE OR REPLACE VIEWS
-- ============================================

-- Drop views if they exist, then recreate
DROP VIEW IF EXISTS UserAccountSettings;
DROP VIEW IF EXISTS StudentProfileView;

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
    u.accountStatus,
    u.createdDateTime as accountCreated
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
    (SELECT COUNT(*) FROM UserSessions WHERE userID = u.userID AND isActive = TRUE) as activeSessions,
    u.lastLogin,
    u.createdDateTime as accountCreated
FROM User u
LEFT JOIN Student s ON u.userID = s.userID
WHERE u.role = 'student';

SELECT '✅ Views created/replaced!' as Message;

-- ============================================
-- 7. CREATE OR REPLACE STORED PROCEDURES
-- ============================================

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
    DECLARE user_exists INT;
    
    -- Check if user exists
    SELECT COUNT(*) INTO user_exists FROM User WHERE userID = p_userID;
    
    IF user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;
    
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
    DECLARE user_exists INT;
    DECLARE sessions_terminated INT;
    
    -- Check if user exists
    SELECT COUNT(*) INTO user_exists FROM User WHERE userID = p_userID;
    
    IF user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;
    
    -- Log out all active sessions
    UPDATE UserSessions 
    SET isActive = FALSE 
    WHERE userID = p_userID AND isActive = TRUE;
    
    SET sessions_terminated = ROW_COUNT();
    
    SELECT CONCAT(sessions_terminated, ' active session(s) terminated') as message;
END$$

-- Fixed Procedure to reset all settings to default
CREATE PROCEDURE ResetUserSettingsToDefault(IN p_userID VARCHAR(36))
BEGIN
    DECLARE user_exists INT;
    DECLARE default_password VARCHAR(100);
    
    -- Check if user exists
    SELECT COUNT(*) INTO user_exists FROM User WHERE userID = p_userID;
    
    IF user_exists = 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'User does not exist';
    END IF;
    
    -- Get default password
    SELECT settingValue INTO default_password 
    FROM DefaultSettings 
    WHERE settingKey = 'DEFAULT_PASSWORD'
    LIMIT 1;
    
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
    SET password = default_password,
        lastPasswordChange = CURRENT_TIMESTAMP
    WHERE userID = p_userID;
    
    -- Log out from all devices
    UPDATE UserSessions 
    SET isActive = FALSE 
    WHERE userID = p_userID AND isActive = TRUE;
    
    -- Record password change in history
    INSERT INTO PasswordHistory (userID, passwordHash)
    VALUES (p_userID, default_password);
    
    SELECT 'All user settings have been reset to default values' as message;
END$$

DELIMITER ;

SELECT '✅ Stored procedures created/replaced!' as Message;

-- ============================================
-- 8. CREATE OR REPLACE TRIGGER
-- ============================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS CreateDefaultNotifications;

DELIMITER $$

CREATE TRIGGER CreateDefaultNotifications
AFTER INSERT ON User
FOR EACH ROW
BEGIN
    -- Create default notification settings for new users
    INSERT INTO UserNotificationSettings (userID) VALUES (NEW.userID);
    
    -- Also add to PasswordHistory if it's a new account
    INSERT INTO PasswordHistory (userID, passwordHash)
    VALUES (NEW.userID, NEW.password);
END$$

DELIMITER ;

SELECT '✅ Trigger created/replaced!' as Message;

-- ============================================
-- 9. TEST THE PROCEDURES WITH TEST USER
-- ============================================

-- Test the procedures with our test user
CALL UpdateNotificationPreferences('U100', 1, 0, 1, 0, 1);
CALL LogoutUserFromAllDevices('U100');
CALL ResetUserSettingsToDefault('U100');

SELECT '✅ Test procedures executed!' as Message;

-- ============================================
-- 10. VERIFICATION QUERIES
-- ============================================

SELECT '=== PROFILE MODULE DATABASE SETUP COMPLETE ===' as Message;
SELECT ' ' as Spacer;

SELECT 'USER SUMMARY (TEST USERS):' as Title;
SELECT 
    role,
    COUNT(*) as count
FROM User 
WHERE userID IN ('U100', 'U101', 'U102', 'U103', 'U104', 'U105', 'U106', 'U107', 'U108', 'U109')
GROUP BY role;

SELECT ' ' as Spacer;

SELECT 'NOTIFICATION SETTINGS FOR TEST USER U100:' as Title;
SELECT 
    u.fullName,
    u.email,
    uns.emailNotifications as email_notif,
    uns.pushNotifications as push_notif,
    uns.recycleReminders as recycle_remind,
    uns.pointUpdates as point_updates,
    uns.promotionalOffers as promo_offers,
    uns.updatedDateTime as last_updated
FROM User u
LEFT JOIN UserNotificationSettings uns ON u.userID = uns.userID
WHERE u.userID = 'U100';

SELECT ' ' as Spacer;

SELECT 'ACTIVE SESSIONS FOR TEST USER U100:' as Title;
SELECT 
    sessionID,
    deviceInfo,
    loginTime,
    lastActivity,
    ipAddress
FROM UserSessions 
WHERE userID = 'U100' AND isActive = TRUE;

SELECT ' ' as Spacer;

SELECT 'VIEW DATA SAMPLE:' as Title;
SELECT 
    fullName,
    email,
    faculty,
    totalPoints,
    activeSessions
FROM StudentProfileView 
WHERE userID = 'U100';

SELECT ' ' as Spacer;

SELECT '✅ PROFILE MANAGEMENT MODULE READY!' as Final_Message;
SELECT 'UC23 (View Profile), UC24 (Update Profile), UC25 (Account Settings) - All Supported' as Note;
SELECT 'Test User: U100 (Ali bin Raj)' as Test_User_Info;