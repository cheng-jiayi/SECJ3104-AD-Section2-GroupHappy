-- ============================================
-- LEADERBOARD & REWARD MODULE - FINAL CLEAN VERSION
-- ============================================

USE utm_remerit;

-- ============================================
-- 0. FIX SYSTEM SETTINGS TABLE (ALLOW NULL FOR SYSTEM ENTRIES)
-- ============================================

-- Drop existing system_settings if exists
DROP TABLE IF EXISTS system_settings;

-- Create system_settings table
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO system_settings (setting_key, value, description) VALUES
('conversion_rate', '100', 'Reward Points needed for 1 Merit Point'),
('min_conversion', '100', 'Minimum Reward Points for conversion'),
('auto_approval_threshold', 'disabled', 'Auto-approval feature status'),
('leaderboard_reset_day', 'sunday', 'Day of week for leaderboard reset'),
('week_start_day', 'monday', 'Start day of the week for calculations'),
('max_weekly_conversions', '3', 'Maximum conversion requests per week per student'),
('merit_point_name', 'UTM Merit Point', 'Name of the merit point system'),
('recycling_point_value', '20', 'Points earned per kg of recycling'),
('event_participation_points', '50', 'Points for event participation'),
('admin_email', 'admin@utm.edu.my', 'Admin email for notifications'),
('system_name', 'UTM ReMerit', 'System name'),
('version', '2.0.0', 'System version'),
('maintenance_mode', 'false', 'System maintenance status'),
('notification_enabled', 'true', 'Enable/disable notifications');

-- ============================================
-- 1. FIX CONVERSION HISTORY TABLE (ALLOW NULL FOR SYSTEM ENTRIES)
-- ============================================

-- Drop existing conversion_history if exists
DROP TABLE IF EXISTS conversion_history;

-- Create conversion_history table with NULL allowed for student_id
CREATE TABLE conversion_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NULL, -- CHANGED: ALLOW NULL for system entries
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

-- ============================================
-- 2. CREATE MERIT TRANSACTIONS TABLE
-- ============================================

-- Drop existing merit_transactions if exists
DROP TABLE IF EXISTS merit_transactions;

-- Create merit_transactions table
CREATE TABLE merit_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) NOT NULL,
    transaction_type VARCHAR(50),
    reward_points INT DEFAULT 0,
    merit_points DECIMAL(10,2) DEFAULT 0,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Student(studentID) ON DELETE CASCADE,
    INDEX idx_merit_student (student_id),
    INDEX idx_merit_date (transaction_date)
);

-- ============================================
-- 3. RESET AND UPDATE SAMPLE STUDENTS DATA
-- ============================================

-- Reset all student points first
UPDATE Student SET 
    totalPoints = 0,
    totalMerits = 0,
    totalItemsRecycled = 0,
    totalWeightRecycled = 0;

-- Update John Doe and sample students with fresh data
UPDATE Student 
SET totalPoints = 360, totalMerits = 12.5  -- CHANGED: 368 to 360
WHERE studentID = 'A23CS0001';

UPDATE Student SET 
    totalPoints = 1200, totalMerits = 10.0
WHERE studentID = 'A23EN0001';

UPDATE Student SET 
    totalPoints = 1800, totalMerits = 15.0
WHERE studentID = 'A23BU0001';

UPDATE Student SET 
    totalPoints = 900, totalMerits = 8.5
WHERE studentID = 'A23CS0002';

UPDATE Student SET 
    totalPoints = 750, totalMerits = 7.0
WHERE studentID = 'A23KT0001';

UPDATE Student SET 
    totalPoints = 1100, totalMerits = 9.5
WHERE studentID = 'A23SH0001';

UPDATE Student SET 
    totalPoints = 850, totalMerits = 7.5
WHERE studentID = 'A23EN0002';

UPDATE Student SET 
    totalPoints = 950, totalMerits = 8.0
WHERE studentID = 'A23BU0002';

UPDATE Student SET 
    totalPoints = 1300, totalMerits = 11.0
WHERE studentID = 'A23CS0003';

-- ============================================
-- 4. ADD FRESH RECYCLING TRANSACTIONS
-- ============================================

-- Clear old recycling transactions
DELETE FROM recycling_transactions WHERE userID IN (
    SELECT userID FROM User WHERE utmID IN (
        'A23CS0001', 'A23EN0001', 'A23BU0001', 'A23CS0002', 
        'A23KT0001', 'A23SH0001', 'A23EN0002', 'A23BU0002', 'A23CS0003'
    )
);

-- Add fresh recycling transactions for sample students (last 7 days)
-- John Doe (A23CS0001) - Adjusted to 360 points total (was 636)
INSERT INTO recycling_transactions (userID, material_type, quantity, points_earned, transaction_date, status) VALUES
-- John Doe - 360 points total
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'plastic', 2.0, 40, CURDATE() - INTERVAL 1 DAY, 'finalized'),     -- 40 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'paper', 1.5, 30, CURDATE() - INTERVAL 2 DAY, 'finalized'),       -- 30 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'glass', 1.0, 20, CURDATE() - INTERVAL 3 DAY, 'finalized'),       -- 20 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'metal', 0.5, 10, CURDATE() - INTERVAL 4 DAY, 'finalized'),       -- 10 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'plastic', 3.0, 60, CURDATE() - INTERVAL 5 DAY, 'finalized'),     -- 60 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'paper', 2.0, 40, CURDATE() - INTERVAL 6 DAY, 'finalized'),       -- 40 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'glass', 1.5, 30, CURDATE() - INTERVAL 7 DAY, 'finalized'),       -- 30 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'plastic', 2.5, 50, CURDATE() - INTERVAL 8 DAY, 'finalized'),     -- 50 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'paper', 1.0, 20, CURDATE() - INTERVAL 9 DAY, 'finalized'),       -- 20 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'metal', 0.6, 12, CURDATE() - INTERVAL 10 DAY, 'finalized'),      -- 12 points
((SELECT userID FROM User WHERE utmID = 'A23CS0001'), 'plastic', 2.0, 40, CURDATE() - INTERVAL 11 DAY, 'finalized'),    -- 40 points

-- Other sample students (unchanged)
((SELECT userID FROM User WHERE utmID = 'A23EN0001'), 'plastic', 4.5, 90, CURDATE() - INTERVAL 1 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23EN0001'), 'paper', 3.2, 64, CURDATE() - INTERVAL 2 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23BU0001'), 'paper', 6.2, 124, CURDATE() - INTERVAL 1 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23BU0001'), 'glass', 3.1, 62, CURDATE() - INTERVAL 3 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23CS0002'), 'glass', 3.1, 62, CURDATE() - INTERVAL 2 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23CS0002'), 'plastic', 2.8, 56, CURDATE() - INTERVAL 4 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23KT0001'), 'metal', 2.0, 40, CURDATE() - INTERVAL 1 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23KT0001'), 'plastic', 2.5, 50, CURDATE() - INTERVAL 3 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23SH0001'), 'plastic', 4.8, 96, CURDATE() - INTERVAL 2 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23SH0001'), 'paper', 3.5, 70, CURDATE() - INTERVAL 5 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23EN0002'), 'plastic', 3.2, 64, CURDATE() - INTERVAL 1 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23EN0002'), 'glass', 2.1, 42, CURDATE() - INTERVAL 2 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23BU0002'), 'paper', 4.0, 80, CURDATE() - INTERVAL 1 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23BU0002'), 'plastic', 2.8, 56, CURDATE() - INTERVAL 3 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23CS0003'), 'plastic', 5.0, 100, CURDATE() - INTERVAL 1 DAY, 'finalized'),
((SELECT userID FROM User WHERE utmID = 'A23CS0003'), 'metal', 1.5, 30, CURDATE() - INTERVAL 4 DAY, 'finalized');

-- ============================================
-- 5. INSERT FRESH CONVERSION HISTORY DATA
-- ============================================

-- Clear all conversion history
TRUNCATE TABLE conversion_history;

-- Add fresh conversion history for sample students
-- IMPORTANT: Adjust John Doe's conversion history since he now has only 360 points
INSERT INTO conversion_history (student_id, reward_points, merit_points, status, request_date, processed_date, processed_by, conversion_rate) VALUES
-- John Doe - Approved conversions (reduced amounts to match 360 total points)
('A23CS0001', 200, 2.0, 'Approved', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY), 'ADM001', 100),  -- Reduced from 500
('A23CS0001', 100, 1.0, 'Approved', DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY), 'ADM002', 100),  -- Reduced from 300
-- John Doe - Pending conversion (reduced to match available points)
('A23CS0001', 100, 1.0, 'Pending', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, 100),  -- Reduced from 200

-- Other students - Approved conversions
('A23EN0001', 250, 2.5, 'Approved', DATE_SUB(NOW(), INTERVAL 8 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), 'ADM001', 100),
('A23BU0001', 100, 1.0, 'Approved', DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 11 DAY), 'ADM001', 100),
('A23CS0002', 300, 3.0, 'Approved', DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 'ADM002', 100),

-- Other students - Pending conversions (for admin to approve/reject)
('A23EN0001', 150, 1.5, 'Pending', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL, 100),
('A23BU0001', 200, 2.0, 'Pending', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, 100),
('A23CS0002', 100, 1.0, 'Pending', NOW(), NULL, NULL, 100),

-- Other students - Rejected conversions
('A23SH0001', 150, 1.5, 'Rejected', DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 14 DAY), 'ADM001', 100),
('A23KT0001', 100, 1.0, 'Rejected', DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 15 DAY), 'ADM002', 100);

-- ============================================
-- 6. UPDATE STUDENT POINTS FROM ALL SOURCES
-- ============================================

-- Temporary table to calculate total points
CREATE TEMPORARY TABLE IF NOT EXISTS student_total_calc AS
SELECT 
    s.studentID,
    -- Total from recycling transactions
    COALESCE(SUM(rt.points_earned), 0) as recycling_points,
    -- Approved conversion merits (to be added to totalMerits)
    COALESCE(SUM(CASE WHEN ch.status = 'Approved' THEN ch.merit_points ELSE 0 END), 0) as conversion_merits
FROM Student s
JOIN User u ON s.userID = u.userID
LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
LEFT JOIN conversion_history ch ON s.studentID = ch.student_id AND ch.status = 'Approved'
WHERE s.studentID IN (
    'A23CS0001', 'A23EN0001', 'A23BU0001', 'A23CS0002', 'A23KT0001', 
    'A23SH0001', 'A23EN0002', 'A23BU0002', 'A23CS0003'
)
GROUP BY s.studentID;

-- Update student points and merits
UPDATE Student s
JOIN student_total_calc stc ON s.studentID = stc.studentID
SET 
    s.totalPoints = stc.recycling_points,
    s.totalMerits = stc.conversion_merits,
    s.totalItemsRecycled = (
        SELECT COUNT(*) 
        FROM recycling_transactions rt 
        JOIN User u ON rt.userID = u.userID 
        WHERE u.utmID = s.studentID AND rt.status = 'finalized'
    ),
    s.totalWeightRecycled = (
        SELECT COALESCE(SUM(rt.quantity), 0)
        FROM recycling_transactions rt 
        JOIN User u ON rt.userID = u.userID 
        WHERE u.utmID = s.studentID AND rt.status = 'finalized'
    );

-- Drop temporary table
DROP TEMPORARY TABLE IF EXISTS student_total_calc;

-- Manually set John Doe's points to exactly 360
UPDATE Student SET totalPoints = 360 WHERE studentID = 'A23CS0001';

-- ============================================
-- 7. CREATE VIEWS FOR LEADERBOARD MODULE
-- ============================================

-- Drop existing views
DROP VIEW IF EXISTS weekly_leaderboard;
DROP VIEW IF EXISTS hall_of_fame;
DROP VIEW IF EXISTS student_conversion_summary;
DROP VIEW IF EXISTS admin_pending_conversions;
DROP VIEW IF EXISTS admin_conversion_history;
DROP VIEW IF EXISTS student_dashboard;

-- View for weekly leaderboard
CREATE VIEW weekly_leaderboard AS
SELECT 
    u.fullName as name,
    s.studentID,
    s.faculty,
    s.yearOfStudy,
    COALESCE(SUM(
        CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
        THEN rt.points_earned ELSE 0 END
    ), 0) as weeklyPoints,
    s.totalPoints as totalPoints,
    s.totalMerits as totalMerits,
    RANK() OVER (ORDER BY COALESCE(SUM(
        CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
        THEN rt.points_earned ELSE 0 END
    ), 0) DESC) as `rank`,
    COUNT(DISTINCT rt.id) as weeklyTransactions,
    ROUND(COALESCE(SUM(
        CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
        THEN rt.quantity ELSE 0 END
    ), 0), 2) as weeklyWeight
FROM User u
JOIN Student s ON u.userID = s.userID
LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
WHERE u.role = 'student'
GROUP BY u.userID, u.fullName, s.studentID, s.faculty, s.yearOfStudy, s.totalPoints, s.totalMerits
ORDER BY weeklyPoints DESC;

-- View for hall of fame (all-time top)
CREATE VIEW hall_of_fame AS
SELECT 
    u.fullName as name,
    s.studentID,
    s.faculty,
    s.totalPoints as totalPoints,
    s.totalMerits as totalMerits,
    COALESCE(SUM(
        CASE WHEN rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
        THEN rt.points_earned ELSE 0 END
    ), 0) as weeklyPoints,
    RANK() OVER (ORDER BY s.totalPoints DESC) as `rank`,
    s.yearOfStudy,
    COUNT(DISTINCT rt.id) as totalTransactions,
    ROUND(COALESCE(SUM(rt.quantity), 0), 2) as totalWeight
FROM Student s
JOIN User u ON s.userID = u.userID
LEFT JOIN recycling_transactions rt ON u.userID = rt.userID AND rt.status = 'finalized'
WHERE u.role = 'student'
GROUP BY u.userID, u.fullName, s.studentID, s.faculty, s.totalPoints, s.totalMerits, s.yearOfStudy
ORDER BY s.totalPoints DESC;

-- View for admin pending conversions
CREATE VIEW admin_pending_conversions AS
SELECT 
    ch.id,
    ch.student_id,
    u.fullName as student_name,
    s.faculty,
    s.yearOfStudy,
    ch.reward_points,
    ch.merit_points,
    ch.conversion_rate,
    DATE_FORMAT(ch.request_date, '%Y-%m-%d %H:%i') as request_date,
    TIMESTAMPDIFF(HOUR, ch.request_date, NOW()) as hours_pending,
    s.totalPoints as student_total_points,
    s.totalMerits as student_total_merits
FROM conversion_history ch
JOIN Student s ON ch.student_id = s.studentID
JOIN User u ON s.userID = u.userID
WHERE ch.status = 'Pending'
ORDER BY ch.request_date ASC;

-- View for admin conversion history
CREATE VIEW admin_conversion_history AS
SELECT 
    ch.id,
    ch.student_id,
    u.fullName as student_name,
    s.faculty,
    ch.reward_points,
    ch.merit_points,
    ch.status,
    DATE_FORMAT(ch.request_date, '%Y-%m-%d') as request_date,
    DATE_FORMAT(ch.processed_date, '%Y-%m-%d %H:%i') as processed_date,
    ch.rejection_reason,
    ch.processed_by,
    a.adminID as processed_by_id,
    u2.fullName as admin_name,
    TIMESTAMPDIFF(DAY, ch.request_date, ch.processed_date) as days_to_process,
    ch.conversion_rate
FROM conversion_history ch
JOIN Student s ON ch.student_id = s.studentID
JOIN User u ON s.userID = u.userID
LEFT JOIN Admin a ON ch.processed_by = a.adminID
LEFT JOIN User u2 ON a.userID = u2.userID
WHERE ch.status IN ('Approved', 'Rejected')
ORDER BY ch.processed_date DESC;

-- View for student dashboard
CREATE VIEW student_dashboard AS
SELECT 
    s.studentID,
    u.fullName,
    s.faculty,
    s.yearOfStudy,
    s.totalPoints,
    s.totalMerits,
    COALESCE(wl.weeklyPoints, 0) as weeklyPoints,
    COALESCE(wl.rank, 999) as weeklyRank,
    COALESCE(wl.weeklyTransactions, 0) as weeklyTransactions,
    COALESCE(wl.weeklyWeight, 0) as weeklyWeight,
    (SELECT COUNT(*) FROM conversion_history ch WHERE ch.student_id = s.studentID AND ch.status = 'Pending') as pending_conversions,
    (SELECT COUNT(*) FROM conversion_history ch WHERE ch.student_id = s.studentID AND ch.status = 'Approved') as approved_conversions,
    (SELECT COUNT(*) FROM conversion_history ch WHERE ch.student_id = s.studentID AND ch.status = 'Rejected') as rejected_conversions
FROM Student s
JOIN User u ON s.userID = u.userID
LEFT JOIN weekly_leaderboard wl ON s.studentID = wl.studentID
WHERE u.role = 'student';

-- ============================================
-- 8. CREATE STORED PROCEDURES (FIXED VERSION)
-- ============================================

DELIMITER $$

-- Procedure to request conversion (FIXED)
DROP PROCEDURE IF EXISTS RequestConversion$$
CREATE PROCEDURE RequestConversion(
    IN p_student_id VARCHAR(20),
    IN p_reward_points INT
)
BEGIN
    DECLARE v_conversion_rate INT DEFAULT 100;
    DECLARE v_min_conversion INT DEFAULT 100;
    DECLARE v_current_points INT;
    DECLARE v_merit_points DECIMAL(10,2);
    DECLARE v_error_msg VARCHAR(255);
    
    -- Get conversion settings
    SELECT value INTO v_conversion_rate 
    FROM system_settings WHERE setting_key = 'conversion_rate' LIMIT 1;
    
    SELECT value INTO v_min_conversion 
    FROM system_settings WHERE setting_key = 'min_conversion' LIMIT 1;
    
    -- Get student's current points
    SELECT totalPoints INTO v_current_points 
    FROM Student WHERE studentID = p_student_id;
    
    -- Validate request
    IF p_reward_points < v_min_conversion THEN
        SET v_error_msg = CONCAT('Minimum conversion amount is ', v_min_conversion, ' points');
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = v_error_msg;
    ELSEIF p_reward_points > v_current_points THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Insufficient reward points';
    ELSE
        -- Calculate merit points
        SET v_merit_points = ROUND(p_reward_points / v_conversion_rate, 2);
        
        -- Insert conversion request
        INSERT INTO conversion_history (
            student_id, 
            reward_points, 
            merit_points, 
            status, 
            conversion_rate
        ) VALUES (
            p_student_id,
            p_reward_points,
            v_merit_points,
            'Pending',
            v_conversion_rate
        );
        
        -- Deduct reward points immediately
        UPDATE Student 
        SET totalPoints = totalPoints - p_reward_points 
        WHERE studentID = p_student_id;
        
        SELECT LAST_INSERT_ID() as conversion_id, 
               'Conversion request submitted successfully' as message;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- 9. VERIFICATION QUERIES
-- ============================================

SELECT '✅ DATABASE CLEANED AND READY FOR USE' as Message;
SELECT ' ';

SELECT '=== SYSTEM SETTINGS ===' as Message;
SELECT setting_key, value, description FROM system_settings ORDER BY setting_key;

SELECT '=== SAMPLE STUDENTS DATA ===' as Message;
SELECT 
    s.studentID,
    u.fullName,
    s.faculty,
    s.totalPoints as totalRewardPoints,
    s.totalMerits as totalMeritPoints,
    s.totalItemsRecycled,
    s.totalWeightRecycled,
    (SELECT weeklyPoints FROM weekly_leaderboard WHERE studentID = s.studentID) as weeklyPoints,
    (SELECT `rank` FROM weekly_leaderboard WHERE studentID = s.studentID) as weeklyRank 
FROM Student s
JOIN User u ON s.userID = u.userID
WHERE s.studentID LIKE 'A23%'
ORDER BY s.totalPoints DESC;

SELECT '=== CONVERSION STATUS ===' as Message;
SELECT 
    status,
    COUNT(*) as count,
    SUM(reward_points) as total_reward_points,
    SUM(merit_points) as total_merit_points
FROM conversion_history
GROUP BY status WITH ROLLUP;

SELECT '=== PENDING CONVERSIONS (FOR ADMIN) ===' as Message;
SELECT 
    id,
    student_id,
    reward_points,
    merit_points,
    DATE_FORMAT(request_date, '%Y-%m-%d %H:%i') as request_date
FROM conversion_history 
WHERE status = 'Pending'
ORDER BY request_date;

SELECT '=== TEST CONVERSION REQUEST ===' as Message;
-- Test the conversion procedure with 100 points (should work)
CALL RequestConversion('A23CS0001', 100);

SELECT '=== FINAL VERIFICATION ===' as Message;
SELECT 'Database setup complete! All tables, views, and procedures are ready.' as Status;

-- Final verification for John Doe's points
SELECT '=== JOHN DOE FINAL POINTS VERIFICATION ===' as Message;
SELECT 
    studentID,
    fullName,
    totalPoints as availableRewardPoints,
    totalMerits as earnedMeritPoints,
    CONCAT('Can convert up to ', FLOOR(totalPoints/100)*100, ' points to ', FLOOR(totalPoints/100), ' merit points') as conversionPotential,
    CASE 
        WHEN totalPoints >= 300 THEN '✅ Can convert 300 points (3.0 merits)'
        WHEN totalPoints >= 200 THEN '✅ Can convert 200 points (2.0 merits)'
        WHEN totalPoints >= 100 THEN '✅ Can convert 100 points (1.0 merit)'
        ELSE '❌ Cannot convert (needs at least 100 points)'
    END as conversionStatus
FROM Student s
JOIN User u ON s.userID = u.userID
WHERE studentID = 'A23CS0001';