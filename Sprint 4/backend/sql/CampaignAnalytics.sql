-- ============================================
-- SUBSYSTEM 4 MODULE 2 : CAMPAIGN ANALYTICS
-- ============================================

-- ============================================
-- INSERT CAMPAIGN ANALYTICS
-- ============================================
INSERT IGNORE INTO CampaignAnalytics (eventID, participants, pointsCollected, goalPercent, averagePoints, snapshotDate) VALUES
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

DROP TRIGGER IF EXISTS trg_update_analytics_after_participation;

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