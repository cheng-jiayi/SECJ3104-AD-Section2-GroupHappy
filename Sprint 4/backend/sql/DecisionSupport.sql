-- ============================================
-- SUBSYSTEM 4 MODULE 3 (DECISION SUPPORT)
-- ============================================

-- 1. View: Historical Recycling Trends
CREATE OR REPLACE VIEW RecyclingTrends AS
SELECT 
    DATE_FORMAT(rt.transaction_date, '%Y-%m') AS month_year,
    s.faculty,
    COUNT(DISTINCT rt.userID) AS unique_users,
    COUNT(*) AS total_transactions,
    SUM(rt.points_earned) AS total_points,
    ROUND(SUM(rt.quantity), 2) AS total_kg,
    ROUND(AVG(IFNULL(rt.points_earned,0)), 2) AS avg_points_per_transaction
FROM recycling_transactions rt
JOIN User u ON rt.userID = u.userID
JOIN Student s ON u.userID = s.userID
GROUP BY DATE_FORMAT(rt.transaction_date, '%Y-%m'), s.faculty
ORDER BY month_year, s.faculty;


-- 2️. Function: Moving Average for Trend Prediction
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


-- 3️. View: Monthly Faculty Participation
CREATE OR REPLACE VIEW MonthlyFacultyParticipation AS
SELECT
    DATE_FORMAT(rt.transaction_date, '%Y-%m') AS month_year,
    s.faculty,
    COUNT(DISTINCT rt.userID) AS participating_students,
    COUNT(DISTINCT s.userID) AS total_students,
    COUNT(*) AS total_transactions,
    ROUND(SUM(rt.quantity),1) AS total_kg,
    ROUND(
        COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.userID),
        2
    ) AS participation_percentage
FROM recycling_transactions rt
JOIN User u ON rt.userID = u.userID
JOIN Student s ON u.userID = s.userID
GROUP BY month_year, s.faculty
ORDER BY month_year, s.faculty;



-- 4️. Procedure: Predict Next Month Trend
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


-- 5️. Procedure: Detect Low Participation
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


-- 6. View: Monthly Trend Analysis
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



-- 7️. View: Monthly Participation Heatmap
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



-- 8️. View: Faculty Trend Prediction
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
LEFT JOIN recycling_transactions rt ON u.userID = rt.userID
GROUP BY s.faculty;


-- ============================================
-- UC30: DETECT LOW ENGAGEMENT AREAS
-- ============================================

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
    COUNT(DISTINCT rt.userID) AS active_recyclers, -- students who actually recycled
    ROUND(
        COUNT(DISTINCT rt.userID) * 100.0 / COUNT(DISTINCT s.studentID),
        2
    ) AS participation_rate_percent,
    COALESCE(SUM(rt.points_earned), 0) AS total_points,
    COALESCE(SUM(rt.quantity), 0) AS total_kg,
    ROUND(
        COALESCE(SUM(rt.points_earned) / NULLIF(COUNT(DISTINCT rt.userID), 0), 0),
        2
    ) AS avg_points_per_active_student,
    ROUND(
        COALESCE(COUNT(rt.id) / NULLIF(COUNT(DISTINCT rt.userID), 1), 0),
        2
    ) AS avg_transactions_per_active_student
FROM Student s
LEFT JOIN User u ON s.userID = u.userID
LEFT JOIN recycling_transactions rt 
       ON u.userID = rt.userID 
       AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)  -- keep date filter in JOIN
GROUP BY s.faculty
ORDER BY s.faculty;

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
        COUNT(DISTINCT rt.userID) as monthly_active_recyclers,
        COUNT(DISTINCT s.studentID) as total_faculty_students,
        ROUND((COUNT(DISTINCT rt.userID) / COUNT(DISTINCT s.studentID)) * 100, 2) as monthly_participation_rate,
        SUM(rt.points_earned) as monthly_points
    FROM Student s
    JOIN User u ON s.userID = u.userID
    LEFT JOIN recycling_transactions rt ON u.userID = rt.userID
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
    COUNT(DISTINCT rt.userID) as active_recyclers,
    ROUND((COUNT(DISTINCT rt.userID) / COUNT(DISTINCT s.studentID)) * 100, 2) as zone_participation_rate,
    COALESCE(SUM(rt.points_earned), 0) as total_zone_points,
    COALESCE(COUNT(rt.id), 0) as total_zone_transactions,
    ROUND(AVG(DATEDIFF(CURDATE(), rt.transaction_date)), 0) as avg_days_since_last_activity
FROM Student s
LEFT JOIN User u ON s.userID = u.userID
LEFT JOIN recycling_transactions rt ON u.userID = rt.userID 
    AND rt.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY campus_zone
ORDER BY zone_participation_rate ASC;


-- ============================================
-- UC31: GENERATE SUSTAINABILITY INSIGHTS & RECOMMENDATIONS
-- ============================================

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