-- ============================================
-- COMPLETE UTM REMERIT DATABASE WITH COMMUNITY DATA
-- ============================================

-- 1. DROP AND CREATE FRESH DATABASE
DROP DATABASE IF EXISTS utm_remerit;
CREATE DATABASE utm_remerit;
USE utm_remerit;

-- 2. CREATE TABLES
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    faculty ENUM('FABU', 'FS', 'FKT', 'FKE', 'FK', 'FKM', 'FSSH', 'FEST', 'FM', 'SPACE') NOT NULL,
    year_of_study INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recycling_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    material_type ENUM('plastic', 'paper', 'glass', 'metal') NOT NULL,
    quantity DECIMAL(5,2) NOT NULL,
    points_earned INT NOT NULL,
    location VARCHAR(100),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_transaction_date (transaction_date)
);

-- ============================================
-- 3. INSERT USERS FROM ALL FACULTIES
-- ============================================

-- FABU - Built Environment & Surveying
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('A123002', 'Siti Norhaliza', 'FABU', 2),
('B220101', 'Ahmad Kamal', 'FABU', 1),
('B220102', 'Nor Aisyah', 'FABU', 3),
('B220103', 'Lee Wei Han', 'FABU', 2),
('B220104', 'Sarah Johnson', 'FABU', 4);

-- FS - Science
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('A123003', 'Raj Kumar', 'FS', 4),
('S210101', 'Chin Mei Ling', 'FS', 2),
('S210102', 'David Tan', 'FS', 3),
('S210103', 'Nurul Huda', 'FS', 1),
('S210104', 'Michael Wong', 'FS', 4),
('S210105', 'Fatimah Azzahra', 'FS', 2),
('S210106', 'James Lim', 'FS', 3);

-- FKT - Technology
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('A123004', 'Mei Ling', 'FKT', 3),
('T230101', 'Ali Hassan', 'FKT', 1),
('T230102', 'Priya Devi', 'FKT', 2),
('T230103', 'Mohd Zain', 'FKT', 3),
('T230104', 'Siti Aishah', 'FKT', 4);

-- FKE - Engineering
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('A123001', 'Ali bin Ahmad', 'FKE', 3),
('E240101', 'John Smith', 'FKE', 2),
('E240102', 'Maria Rodriguez', 'FKE', 1),
('E240103', 'Wei Chen', 'FKE', 4),
('E240104', 'Anita Desai', 'FKE', 3),
('E240105', 'Robert Kim', 'FKE', 2),
('E240106', 'Sofia Garcia', 'FKE', 1),
('E240107', 'Kenji Tanaka', 'FKE', 3);

-- FK - Computing
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('C250101', 'Zhang Wei', 'FK', 2),
('C250102', 'Aisha Mohammed', 'FK', 1),
('C250103', 'Thomas Lee', 'FK', 3),
('C250104', 'Nora Abdullah', 'FK', 4),
('C250105', 'Kevin Raj', 'FK', 2);

-- FKM - Management
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('A123005', 'Ahmad Firdaus', 'FKM', 2),
('M260101', 'Lisa Wong', 'FKM', 1),
('M260102', 'Carlos Silva', 'FKM', 3),
('M260103', 'Yuki Nakamura', 'FKM', 2),
('M260104', 'Rahman Ali', 'FKM', 4);

-- FSSH - Social Sciences & Humanities
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('H270101', 'Emily Wilson', 'FSSH', 1),
('H270102', 'Abdul Rahman', 'FSSH', 2),
('H270103', 'Chen Li', 'FSSH', 3),
('H270104', 'Siti Aminah', 'FSSH', 4);

-- FEST - Education
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('D280101', 'Sarah Jones', 'FEST', 2),
('D280102', 'Mohammed Ali', 'FEST', 1),
('D280103', 'Priyanka Shah', 'FEST', 3),
('D280104', 'Tanaka Hiroshi', 'FEST', 4);

-- FM - Medicine
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('M290101', 'Dr. Aminah', 'FM', 5),
('M290102', 'Dr. Kumar', 'FM', 4),
('M290103', 'Dr. Lee', 'FM', 6),
('M290104', 'Dr. Garcia', 'FM', 5);

-- SPACE - Space
INSERT INTO users (student_id, name, faculty, year_of_study) VALUES
('S300101', 'Alexei Volkov', 'SPACE', 3),
('S300102', 'Fatima Al-Mansoor', 'SPACE', 2),
('S300103', 'Kenji Sato', 'SPACE', 4),
('S300104', 'Maria Santos', 'SPACE', 1);

-- ============================================
-- 4. INSERT RICH COMMUNITY DATA FOR ALL USERS
-- ============================================

-- Current Semester Data (Jan 2024 - Mar 2024)
-- Week 1: Jan 1-7, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Engineering (FKE) students - High activity
(1, 'plastic', 3.5, 70, '2024-01-02'), (1, 'paper', 2.0, 40, '2024-01-03'),
(8, 'plastic', 2.8, 56, '2024-01-02'), (8, 'metal', 1.2, 24, '2024-01-04'),
(9, 'glass', 1.5, 30, '2024-01-05'), (9, 'paper', 2.5, 50, '2024-01-06'),
-- Science (FS) students
(3, 'plastic', 2.0, 40, '2024-01-01'), (4, 'paper', 1.8, 36, '2024-01-03'),
(5, 'glass', 1.2, 24, '2024-01-04'), (6, 'metal', 0.9, 18, '2024-01-05'),
-- Other faculties
(2, 'plastic', 2.5, 50, '2024-01-02'), (10, 'paper', 3.0, 60, '2024-01-04'),
(15, 'plastic', 1.8, 36, '2024-01-06'), (20, 'glass', 2.0, 40, '2024-01-07');

-- Week 2: Jan 8-14, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 2.8, 56, '2024-01-09'), (1, 'metal', 1.5, 30, '2024-01-10'),
(8, 'paper', 3.2, 64, '2024-01-08'), (9, 'plastic', 2.0, 40, '2024-01-11'),
(3, 'glass', 1.8, 36, '2024-01-12'), (4, 'paper', 2.2, 44, '2024-01-13'),
(5, 'plastic', 3.0, 60, '2024-01-14'), (10, 'metal', 1.0, 20, '2024-01-09'),
(15, 'paper', 2.5, 50, '2024-01-10'), (20, 'plastic', 2.8, 56, '2024-01-12');

-- Week 3: Jan 15-21, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Add more faculty diversity
(11, 'plastic', 2.5, 50, '2024-01-15'), (12, 'paper', 3.0, 60, '2024-01-16'),
(13, 'glass', 1.5, 30, '2024-01-17'), (14, 'metal', 1.2, 24, '2024-01-18'),
(21, 'plastic', 2.0, 40, '2024-01-19'), (22, 'paper', 1.8, 36, '2024-01-20'),
(25, 'glass', 2.2, 44, '2024-01-21'), (30, 'plastic', 3.5, 70, '2024-01-20');

-- Week 4: Jan 22-28, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 4.0, 80, '2024-01-22'), (1, 'paper', 2.8, 56, '2024-01-24'),
(3, 'glass', 2.0, 40, '2024-01-23'), (8, 'metal', 1.8, 36, '2024-01-25'),
(16, 'plastic', 3.2, 64, '2024-01-26'), (17, 'paper', 2.5, 50, '2024-01-27'),
(28, 'glass', 1.5, 30, '2024-01-28'), (35, 'plastic', 2.8, 56, '2024-01-28');

-- Week 5: Jan 29 - Feb 4, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 2.0, 40, '2024-01-29'), (1, 'paper', 1.5, 30, '2024-01-30'),
(8, 'plastic', 2.8, 56, '2024-01-31'), (9, 'glass', 1.0, 20, '2024-02-01'),
(3, 'metal', 0.8, 16, '2024-02-02'), (4, 'paper', 2.2, 44, '2024-02-03'),
(5, 'plastic', 3.0, 60, '2024-02-04'), (10, 'paper', 2.0, 40, '2024-02-04');

-- Week 6: Feb 5-11, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 2.0, 40, '2024-02-05'), (1, 'paper', 1.5, 30, '2024-02-06'),
(8, 'plastic', 2.8, 56, '2024-02-07'), (9, 'glass', 1.0, 20, '2024-02-08'),
(3, 'metal', 0.8, 16, '2024-02-09'), (4, 'plastic', 1.8, 36, '2024-02-10'),
(5, 'paper', 2.5, 50, '2024-02-11'), (11, 'glass', 1.5, 30, '2024-02-11');

-- Week 7: Feb 12-18, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 3.5, 70, '2024-02-12'), (1, 'paper', 2.8, 56, '2024-02-13'),
(8, 'metal', 1.0, 20, '2024-02-14'), (9, 'plastic', 2.3, 46, '2024-02-15'),
(3, 'glass', 1.5, 30, '2024-02-16'), (4, 'paper', 2.0, 40, '2024-02-17'),
(5, 'plastic', 2.7, 54, '2024-02-18'), (12, 'metal', 1.2, 24, '2024-02-18');

-- Week 8: Feb 19-25, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'metal', 1.2, 24, '2024-02-19'), (1, 'plastic', 2.7, 54, '2024-02-20'),
(8, 'paper', 2.2, 44, '2024-02-21'), (9, 'plastic', 2.0, 40, '2024-02-22'),
(3, 'glass', 1.8, 36, '2024-02-23'), (4, 'metal', 0.8, 16, '2024-02-24'),
(5, 'paper', 3.0, 60, '2024-02-25'), (13, 'plastic', 2.5, 50, '2024-02-25');

-- Week 9: Feb 26 - Mar 3, 2024
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 2.5, 50, '2024-02-26'), (1, 'paper', 1.8, 36, '2024-02-27'),
(8, 'glass', 2.2, 44, '2024-02-28'), (9, 'plastic', 3.0, 60, '2024-02-29'),
(3, 'metal', 1.5, 30, '2024-03-01'), (4, 'paper', 2.5, 50, '2024-03-02'),
(5, 'plastic', 2.8, 56, '2024-03-03'), (14, 'paper', 1.8, 36, '2024-03-03');

-- Week 10: Mar 4-10, 2024 (Current Week)
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Monday
(1, 'plastic', 3.2, 64, '2024-03-04'), (1, 'paper', 2.5, 50, '2024-03-04'),
(2, 'plastic', 2.5, 50, '2024-03-04'), (3, 'paper', 2.0, 40, '2024-03-04'),
-- Tuesday
(1, 'plastic', 2.8, 56, '2024-03-05'), (1, 'glass', 1.5, 30, '2024-03-05'),
(8, 'plastic', 3.0, 60, '2024-03-05'), (9, 'paper', 2.2, 44, '2024-03-05'),
-- Wednesday
(1, 'metal', 0.9, 18, '2024-03-06'), (1, 'plastic', 1.8, 36, '2024-03-06'),
(4, 'glass', 1.5, 30, '2024-03-06'), (5, 'plastic', 2.0, 40, '2024-03-06'),
-- Thursday
(1, 'paper', 3.0, 60, '2024-03-07'), (1, 'glass', 2.0, 40, '2024-03-07'),
(6, 'metal', 1.0, 20, '2024-03-07'), (7, 'plastic', 2.5, 50, '2024-03-07'),
-- Friday
(1, 'plastic', 4.0, 80, '2024-03-08'), (1, 'metal', 1.2, 24, '2024-03-08'),
(10, 'paper', 3.2, 64, '2024-03-08'), (11, 'glass', 1.8, 36, '2024-03-08'),
-- Saturday
(1, 'paper', 2.2, 44, '2024-03-09'), (12, 'plastic', 3.5, 70, '2024-03-09'),
(13, 'paper', 2.0, 40, '2024-03-09'), (14, 'metal', 1.5, 30, '2024-03-09'),
-- Sunday
(1, 'plastic', 3.5, 70, '2024-03-10'), (15, 'glass', 2.5, 50, '2024-03-10'),
(16, 'paper', 3.0, 60, '2024-03-10'), (17, 'plastic', 2.8, 56, '2024-03-10');

-- ============================================
-- 5. INSERT LAST SEMESTER DATA (Sep-Dec 2023)
-- ============================================

-- September 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 2.5, 50, '2023-09-10'), (8, 'paper', 2.0, 40, '2023-09-15'),
(3, 'glass', 1.5, 30, '2023-09-20'), (10, 'metal', 1.2, 24, '2023-09-25'),
(15, 'plastic', 3.0, 60, '2023-09-30');

-- October 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 2.8, 56, '2023-10-05'), (8, 'paper', 2.5, 50, '2023-10-10'),
(3, 'glass', 1.8, 36, '2023-10-15'), (4, 'metal', 1.0, 20, '2023-10-20'),
(5, 'plastic', 2.2, 44, '2023-10-25'), (6, 'paper', 3.0, 60, '2023-10-30');

-- November 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 3.0, 60, '2023-11-05'), (2, 'paper', 2.5, 50, '2023-11-10'),
(3, 'glass', 1.8, 36, '2023-11-15'), (4, 'metal', 1.2, 24, '2023-11-20'),
(7, 'plastic', 2.0, 40, '2023-11-25'), (8, 'paper', 3.5, 70, '2023-11-30');

-- December 2023
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 2.5, 50, '2023-12-05'), (2, 'paper', 1.8, 36, '2023-12-10'),
(3, 'glass', 1.5, 30, '2023-12-15'), (4, 'metal', 1.0, 20, '2023-12-20'),
(5, 'plastic', 2.8, 56, '2023-12-25'), (6, 'paper', 2.2, 44, '2023-12-30');

-- ============================================
-- 6. INSERT 6 MONTHS DATA (Sep 2023 - Mar 2024)
-- ============================================

-- Additional data for 6 months view
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- More data for other users to create realistic trends
(18, 'plastic', 2.5, 50, '2023-10-10'), (19, 'paper', 2.0, 40, '2023-10-15'),
(20, 'glass', 1.5, 30, '2023-10-20'), (21, 'metal', 1.2, 24, '2023-10-25'),
(22, 'plastic', 3.0, 60, '2023-11-01'), (23, 'paper', 2.5, 50, '2023-11-05'),
(24, 'glass', 1.8, 36, '2023-11-10'), (25, 'metal', 1.0, 20, '2023-11-15'),
(26, 'plastic', 2.2, 44, '2023-11-20'), (27, 'paper', 3.0, 60, '2023-11-25'),
(28, 'glass', 2.0, 40, '2023-12-01'), (29, 'metal', 1.5, 30, '2023-12-05'),
(30, 'plastic', 2.8, 56, '2023-12-10'), (31, 'paper', 2.2, 44, '2023-12-15'),
(32, 'glass', 1.5, 30, '2023-12-20'), (33, 'metal', 1.2, 24, '2023-12-25'),
(34, 'plastic', 3.5, 70, '2024-01-05'), (35, 'paper', 2.8, 56, '2024-01-10'),
(36, 'glass', 2.2, 44, '2024-01-15'), (37, 'metal', 1.8, 36, '2024-01-20');

SELECT '=== DATABASE SUMMARY ===' as message;

SELECT 'Total Users' as metric, COUNT(*) as value FROM users
UNION ALL
SELECT 'Total Transactions', COUNT(*) FROM recycling_transactions
UNION ALL
SELECT 'Unique Faculties', COUNT(DISTINCT faculty) FROM users;

SELECT '=== FACULTY DISTRIBUTION ===' as message;
SELECT faculty, COUNT(*) as students FROM users GROUP BY faculty ORDER BY students DESC;

SELECT '=== CURRENT SEMESTER OVERVIEW (Jan 1 - Mar 10, 2024) ===' as message;
SELECT 
    users.faculty,
    COUNT(DISTINCT users.id) as participants,
    SUM(points_earned) as total_points,
    ROUND(SUM(quantity),1) as total_kg
FROM recycling_transactions
JOIN users ON users.id = recycling_transactions.user_id
WHERE transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY users.faculty
ORDER BY total_points DESC;

SELECT '=== LAST SEMESTER OVERVIEW (Sep - Dec 2023) ===' as message;
SELECT 
    users.faculty,
    COUNT(DISTINCT users.id) as participants,
    SUM(points_earned) as total_points,
    ROUND(SUM(quantity),1) as total_kg
FROM recycling_transactions
JOIN users ON users.id = recycling_transactions.user_id
WHERE transaction_date BETWEEN '2023-09-01' AND '2023-12-31'
GROUP BY users.faculty
ORDER BY total_points DESC;

SELECT '=== 6 MONTHS OVERVIEW (Sep 2023 - Mar 2024) ===' as message;
SELECT 
    users.faculty,
    COUNT(DISTINCT users.id) as participants,
    SUM(points_earned) as total_points,
    ROUND(SUM(quantity),1) as total_kg
FROM recycling_transactions
JOIN users ON users.id = recycling_transactions.user_id
WHERE transaction_date BETWEEN '2023-09-01' AND '2024-03-10'
GROUP BY users.faculty
ORDER BY total_points DESC;

SELECT '=== WEEKLY TREND CURRENT SEMESTER ===' as message;
SELECT 
    WEEK(transaction_date,1) as week_number,
    COUNT(DISTINCT user_id) as weekly_participants,
    SUM(points_earned) as weekly_points,
    ROUND(SUM(quantity),1) as weekly_kg
FROM recycling_transactions
WHERE transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY WEEK(transaction_date,1)
ORDER BY week_number;

SELECT '=== TOP PERFORMING FACULTIES ===' as message;
SELECT 
    users.faculty,
    ROUND(AVG(points_earned), 0) as avg_points_per_student,
    MAX(points_earned) as max_points,
    MIN(points_earned) as min_points
FROM recycling_transactions
JOIN users ON users.id = recycling_transactions.user_id
WHERE transaction_date BETWEEN '2024-01-01' AND '2024-03-10'
GROUP BY users.faculty
ORDER BY avg_points_per_student DESC;

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

-- new sprint3
-- Additional queries for Compare Performance
-- Run these after your existing database setup

-- 1. Top Performers Leaderboard (Last 6 Weeks)
SELECT 
    RANK() OVER (ORDER BY SUM(points_earned) DESC) AS rank_position,
    users.name,
    users.faculty,
    COUNT(*) AS items_recycled,
    SUM(points_earned) AS total_points,
    ROUND(SUM(quantity), 1) AS total_kg
FROM recycling_transactions
JOIN users ON users.id = recycling_transactions.user_id
WHERE transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
GROUP BY users.id, users.name, users.faculty
ORDER BY total_points DESC
LIMIT 10;

-- 2. Faculty Average Comparison
SELECT 
    faculty,
    COUNT(DISTINCT user_id) AS students,
    ROUND(AVG(total_points), 0) AS avg_points_per_student,
    ROUND(AVG(total_items), 0) AS avg_items_per_student
FROM (
    SELECT 
        users.faculty,
        recycling_transactions.user_id,
        SUM(points_earned) AS total_points,
        COUNT(*) AS total_items
    FROM recycling_transactions
    JOIN users ON users.id = recycling_transactions.user_id
    WHERE transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY users.faculty, recycling_transactions.user_id
) AS faculty_stats
GROUP BY faculty
ORDER BY avg_points_per_student DESC;

-- 3. Campus Average
SELECT 
    'Campus Average' AS comparison,
    ROUND(AVG(total_points), 0) AS avg_points,
    ROUND(AVG(total_items), 0) AS avg_items,
    COUNT(*) AS total_students
FROM (
    SELECT 
        user_id,
        SUM(points_earned) AS total_points,
        COUNT(*) AS total_items
    FROM recycling_transactions
    WHERE transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY user_id
) AS campus_stats;

-- 4. User Rank Calculation
WITH ranked_users AS (
    SELECT 
        user_id,
        RANK() OVER (ORDER BY SUM(points_earned) DESC) AS rank_position,
        SUM(points_earned) AS total_points,
        COUNT(*) AS total_items,
        COUNT(*) OVER () AS total_students
    FROM recycling_transactions
    WHERE transaction_date BETWEEN '2024-01-29' AND '2024-03-10'
    GROUP BY user_id
)
SELECT 
    rank_position,
    total_points,
    total_items,
    total_students,
    ROUND(((total_students - rank_position) / total_students) * 100, 0) AS percentile
FROM ranked_users
WHERE user_id = 1; -- Replace with current user ID

-- third compare enhance
-- Run this SQL to enhance your database with better data for "Points to Next"

-- 1. Add more varied points data to ensure "Points to Next" is never 0
UPDATE recycling_transactions 
SET points_earned = points_earned + FLOOR(RAND() * 10) + 5
WHERE user_id IN (1, 3, 8, 9, 10, 15, 20);

-- 2. Create gaps in points to ensure rank differences
-- Add some high-scoring transactions for top performers
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- User 2 (currently has fewer points)
(2, 'plastic', 5.0, 100, '2024-03-08'),
(2, 'paper', 4.5, 90, '2024-03-09'),
-- User 4
(4, 'glass', 3.2, 64, '2024-03-07'),
(4, 'metal', 2.8, 56, '2024-03-08'),
-- User 5
(5, 'plastic', 4.8, 96, '2024-03-09'),
(5, 'paper', 3.7, 74, '2024-03-10');

-- 3. Create specific point gaps for better ranking
-- Calculate current points and create gaps
SET @user1_points = (SELECT SUM(points_earned) FROM recycling_transactions WHERE user_id = 1);
SET @user2_points = (SELECT SUM(points_earned) FROM recycling_transactions WHERE user_id = 2);

-- Ensure user 2 has at least 200 points less than user 1
IF @user2_points > (@user1_points - 200) THEN
    INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
    (1, 'plastic', 10.0, 200, '2024-03-10');
END IF;

-- 4. Create realistic point gaps for ranking
-- Add transactions to create proper point differences
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Top performers get extra points
(8, 'plastic', 6.5, 130, '2024-03-09'),
(9, 'paper', 5.8, 116, '2024-03-10'),
-- Middle tier gets moderate points
(3, 'glass', 4.2, 84, '2024-03-08'),
(10, 'metal', 3.5, 70, '2024-03-09'),
-- Lower tier gets fewer points
(15, 'plastic', 2.8, 56, '2024-03-07'),
(20, 'paper', 2.0, 40, '2024-03-08');

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
    FROM ranked_users WHERE user_id = 1
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
-- WITHOUT DELETING EXISTING DATA
-- ============================================

-- Instead of deleting, we'll:
-- 1. Update existing records to be more consistent
-- 2. Add new records to enhance the data
-- 3. Keep all original data intact

-- First, let's see what data we already have for this period
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

-- Now add comprehensive additional data for each day of the week
-- These will complement existing data, not replace it

-- Monday, March 4 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Additional FKE users
(8, 'plastic', 1.5, 30, '2024-03-04'),
(9, 'metal', 0.8, 16, '2024-03-04'),
-- Additional FS users
(3, 'glass', 1.2, 24, '2024-03-04'),
(4, 'paper', 1.8, 36, '2024-03-04'),
-- Additional users from other faculties
(10, 'plastic', 2.0, 40, '2024-03-04'),
(12, 'paper', 1.5, 30, '2024-03-04');

-- Tuesday, March 5 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- Additional data for user 1
(1, 'metal', 0.7, 14, '2024-03-05'),
-- FKE faculty
(8, 'paper', 2.2, 44, '2024-03-05'),
(9, 'glass', 1.3, 26, '2024-03-05'),
-- FS faculty
(3, 'plastic', 1.8, 36, '2024-03-05'),
(5, 'metal', 0.9, 18, '2024-03-05'),
-- Others
(15, 'paper', 2.5, 50, '2024-03-05');

-- Wednesday, March 6 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- User 1 additional
(1, 'paper', 1.8, 36, '2024-03-06'),
-- FKE
(8, 'plastic', 2.5, 50, '2024-03-06'),
(9, 'metal', 1.1, 22, '2024-03-06'),
-- FS
(3, 'glass', 1.6, 32, '2024-03-06'),
(4, 'plastic', 2.0, 40, '2024-03-06'),
-- More diversity
(18, 'paper', 2.8, 56, '2024-03-06'),
(20, 'plastic', 2.2, 44, '2024-03-06');

-- Thursday, March 7 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'plastic', 1.5, 30, '2024-03-07'),
(8, 'glass', 1.8, 36, '2024-03-07'),
(9, 'paper', 2.3, 46, '2024-03-07'),
(3, 'metal', 1.0, 20, '2024-03-07'),
(4, 'plastic', 2.5, 50, '2024-03-07'),
(10, 'paper', 1.8, 36, '2024-03-07'),
(17, 'glass', 1.5, 30, '2024-03-07');

-- Friday, March 8 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'glass', 1.2, 24, '2024-03-08'),
(8, 'metal', 0.9, 18, '2024-03-08'),
(9, 'plastic', 2.8, 56, '2024-03-08'),
(3, 'paper', 2.2, 44, '2024-03-08'),
(5, 'glass', 1.5, 30, '2024-03-08'),
(12, 'metal', 1.3, 26, '2024-03-08'),
(19, 'plastic', 2.0, 40, '2024-03-08');

-- Saturday, March 9 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'metal', 0.8, 16, '2024-03-09'),
(8, 'plastic', 2.3, 46, '2024-03-09'),
(9, 'paper', 1.9, 38, '2024-03-09'),
(3, 'glass', 1.4, 28, '2024-03-09'),
(6, 'plastic', 2.5, 50, '2024-03-09'),
(14, 'paper', 2.2, 44, '2024-03-09'),
(21, 'glass', 1.6, 32, '2024-03-09');

-- Sunday, March 10 - Additional data
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
(1, 'glass', 1.3, 26, '2024-03-10'),
(8, 'paper', 2.0, 40, '2024-03-10'),
(9, 'plastic', 2.2, 44, '2024-03-10'),
(3, 'metal', 0.7, 14, '2024-03-10'),
(7, 'paper', 1.8, 36, '2024-03-10'),
(13, 'glass', 1.2, 24, '2024-03-10'),
(16, 'plastic', 2.5, 50, '2024-03-10');

-- Add faculty comparison data (spread throughout the week)
INSERT INTO recycling_transactions (user_id, material_type, quantity, points_earned, transaction_date) VALUES
-- FK (Computing) faculty
(11, 'plastic', 2.8, 56, '2024-03-04'),
(11, 'paper', 2.0, 40, '2024-03-07'),
(12, 'glass', 1.5, 30, '2024-03-05'),
(12, 'metal', 1.2, 24, '2024-03-09'),
-- FKM (Management) faculty
(25, 'plastic', 2.0, 40, '2024-03-04'),
(25, 'paper', 1.8, 36, '2024-03-08'),
(26, 'glass', 1.3, 26, '2024-03-06'),
(26, 'metal', 1.0, 20, '2024-03-10');

-- Verify the enhanced data
SELECT 'Enhanced data summary for March 4-10' as message;
SELECT 
    DAYNAME(transaction_date) as day,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_transactions,
    SUM(points_earned) as total_points,
    ROUND(SUM(quantity), 1) as total_kg
FROM recycling_transactions
WHERE transaction_date BETWEEN '2024-03-04' AND '2024-03-10'
GROUP BY DAYNAME(transaction_date), DAYOFWEEK(transaction_date)
ORDER BY DAYOFWEEK(transaction_date);

-- Show faculty participation for comparison
SELECT 'Faculty participation for March 4-10' as message;
SELECT 
    u.faculty,
    COUNT(DISTINCT rt.user_id) as participating_students,
    COUNT(*) as total_transactions,
    SUM(rt.points_earned) as total_points,
    ROUND(SUM(rt.quantity), 1) as total_kg
FROM recycling_transactions rt
JOIN users u ON rt.user_id = u.id
WHERE rt.transaction_date BETWEEN '2024-03-04' AND '2024-03-10'
GROUP BY u.faculty
ORDER BY total_points DESC;
