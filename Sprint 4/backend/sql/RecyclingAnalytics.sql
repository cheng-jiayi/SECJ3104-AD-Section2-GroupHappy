-- ============================================
-- SUBSYSTEM 4 MODULE 1 (RECYCLING ANALYTICS)
-- ============================================

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
JOIN User u ON rt.userID = u.userID -- Fixed: JOIN users u ON rt.userID = u.id to JOIN User u ON rt.userID = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY s.faculty
ORDER BY total_points DESC;


-- Last Semester Overview (Sep - Dec 2023)
SELECT '=== LAST SEMESTER OVERVIEW (Sep - Dec 2023) ===' as message;
SELECT 
    s.faculty,
    COUNT(DISTINCT s.studentID) as participants,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity),1) as total_kg
FROM recycling_transactions rt
JOIN User u ON rt.userID = u.userID
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
JOIN User u ON rt.userID = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2023-09-01' AND '2024-03-10'
GROUP BY s.faculty
ORDER BY total_points DESC;

-- Weekly Trend Current Semester
SELECT '=== WEEKLY TREND CURRENT SEMESTER ===' as message;
SELECT 
    WEEK(rt.transaction_date,1) as week_number,
    COUNT(DISTINCT rt.userID) as weekly_participants,
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
JOIN User u ON rt.userID = u.userID
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
JOIN User u ON rt.userID = u.userID
JOIN Student s ON u.userID = s.userID
WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
GROUP BY u.userID, u.fullName, s.faculty
ORDER BY total_points DESC
LIMIT 10;

-- 2. Faculty Average Comparison
SELECT 
    faculty_stats.faculty,
    COUNT(DISTINCT faculty_stats.userID) AS students,
    ROUND(AVG(faculty_stats.total_points), 0) AS avg_points_per_student,
    ROUND(AVG(faculty_stats.total_items), 0) AS avg_items_per_student
FROM (
    SELECT 
        s.faculty,
        rt.userID,
        SUM(rt.points_earned) AS total_points,
        COUNT(*) AS total_items
    FROM recycling_transactions rt
    JOIN User u ON rt.userID = u.userID
    JOIN Student s ON u.userID = s.userID
    WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY s.faculty, rt.userID
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
        rt.userID,
        SUM(rt.points_earned) AS total_points,
        COUNT(*) AS total_items
    FROM recycling_transactions rt
    WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY rt.userID
) AS campus_stats;

-- 4. User Rank Calculation (for user 'U022' - Ali bin Ahmad)
WITH ranked_users AS (
    SELECT 
        rt.userID,
        RANK() OVER (ORDER BY SUM(rt.points_earned) DESC) AS rank_position,
        SUM(rt.points_earned) AS total_points,
        COUNT(*) AS total_items,
        COUNT(*) OVER () AS total_students
    FROM recycling_transactions rt
    WHERE rt.transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY rt.userID
)
SELECT 
    rank_position,
    total_points,
    total_items,
    total_students,
    ROUND(((total_students - rank_position) / total_students) * 100, 0) AS percentile
FROM ranked_users
WHERE userID = 'U022'; -- User ID for Ali bin Ahmad

-- ============================================
-- ENHANCE DATA FOR BETTER RANKING
-- ============================================

-- 1. Add more varied points data to ensure "Points to Next" is never 0
UPDATE recycling_transactions 
SET points_earned = points_earned + FLOOR(RAND() * 10) + 5
WHERE userID IN ('U022', 'U010', 'U029', 'U025', 'U014', 'U015', 'U016');


-- 5. Verify points to next calculation
WITH ranked_users AS (
    SELECT 
        userID,
        SUM(points_earned) AS total_points,
        RANK() OVER (ORDER BY SUM(points_earned) DESC) AS rank_position
    FROM recycling_transactions
    WHERE transaction_date >= '2024-01-01'
    GROUP BY userID
),
user_rank AS (
    SELECT rank_position, total_points AS user_points
    FROM ranked_users WHERE userID = 'U022' -- Ali bin Ahmad
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
    COUNT(DISTINCT userID) as unique_users,
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
    COUNT(DISTINCT rt.userID) as unique_users,
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
    COUNT(DISTINCT rt.userID) as participating_students,
    COUNT(*) as total_transactions,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity), 1) as total_kg
FROM recycling_transactions rt
JOIN User u ON rt.userID = u.userID
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
INSERT INTO recycling_transactions (userID, material_type, quantity, points_earned, transaction_date) 
SELECT rt.userID, rt.material_type, rt.quantity, rt.points_earned,
       DATE_ADD(rt.transaction_date, INTERVAL 23 MONTH) -- Shift Jan 2024 -> Dec 2025
FROM recycling_transactions_backup rt
JOIN User u ON rt.userID = u.userID  -- Only join with existing users
WHERE rt.transaction_date BETWEEN '2024-01-01' AND '2024-03-31';

-- 6 months before
INSERT INTO recycling_transactions (userID, material_type, quantity, points_earned, transaction_date)
SELECT userID, material_type, quantity, points_earned,
       DATE_ADD(transaction_date, INTERVAL 23 MONTH) -- Shift Mar 2024 -> Feb 2026
FROM recycling_transactions_backup
WHERE transaction_date BETWEEN '2024-04-01' AND '2024-06-30';

-- 9 months before
INSERT INTO recycling_transactions (userID, material_type, quantity, points_earned, transaction_date)
SELECT userID, material_type, quantity, points_earned,
       DATE_ADD(transaction_date, INTERVAL 23 MONTH) -- Shift Jul 2024 -> Jun 2026
FROM recycling_transactions_backup
WHERE transaction_date BETWEEN '2024-07-01' AND '2024-09-30';

-- 12 months before
INSERT INTO recycling_transactions (userID, material_type, quantity, points_earned, transaction_date)
SELECT userID, material_type, quantity, points_earned,
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
    COUNT(DISTINCT userID) as weekly_participants,
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

                    SET v_points = ROUND(v_quantity * (5 + FLOOR(RAND()*6)));

                    INSERT INTO recycling_transactions (
                        userID,
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

            SET v_month = DATE_ADD(v_month, INTERVAL 1 MONTH);
        END LOOP;

    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;

CALL generate_realistic_transactions();

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

SELECT * FROM recycling_transactions;