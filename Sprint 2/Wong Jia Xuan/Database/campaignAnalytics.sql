-- Event Table
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

-- Participation Table
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

-- CampaignAnalytics Table
CREATE TABLE CampaignAnalytics (
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

-- AnalyticsReport Table
CREATE TABLE AnalyticsReport (
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

-- CampaignAnalyticsSnapshot Table
CREATE TABLE CampaignAnalyticsSnapshot (
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

-- ================================================
-- INSERT DATA
-- ================================================

-- Insert Users
INSERT INTO User (userID, username, password, fullName, email, role) VALUES
('U001', 'sarah_admin', 'hashed_pass1', 'Dr. Sarah Lim', 'sarah.lim@utm.my', 'admin'),
('U002', 'ahmad_admin', 'hashed_pass2', 'Ahmad Faiz', 'ahmad.faiz@utm.my', 'admin'),
('U003', 'priya_admin', 'hashed_pass3', 'Priya Sharma', 'priya.sharma@utm.my', 'admin'),
('U004', 'wei_admin', 'hashed_pass4', 'Wei Chen', 'wei.chen@utm.my', 'admin'),
('U005', 'john123', 'hashed_pass5', 'John Doe', 'john.doe@graduate.utm.my', 'student'),
('U006', 'jane456', 'hashed_pass6', 'Jane Smith', 'jane.smith@graduate.utm.my', 'student'),
('U007', 'ali789', 'hashed_pass7', 'Ali Ahmad', 'ali.ahmad@graduate.utm.my', 'student'),
('U008', 'siti012', 'hashed_pass8', 'Siti Fatimah', 'siti.fatimah@graduate.utm.my', 'student'),
('U009', 'michael001', 'hashed_pass9', 'Michael Tan', 'michael.tan@graduate.utm.my', 'student'),
('U010', 'sophia002', 'hashed_pass10', 'Sophia Lee', 'sophia.lee@graduate.utm.my', 'student'),
('U011', 'ravi003', 'hashed_pass11', 'Ravi Kumar', 'ravi.kumar@graduate.utm.my', 'student'),
('U012', 'mei004', 'hashed_pass12', 'Mei Ling', 'mei.ling@graduate.utm.my', 'student'),
('U013', 'hakim005', 'hashed_pass13', 'Hakim Abdullah', 'hakim.abdullah@graduate.utm.my', 'student'),
('U014', 'chloe006', 'hashed_pass14', 'Chloe Wong', 'chloe.wong@graduate.utm.my', 'student'),
('U015', 'arif007', 'hashed_pass15', 'Arif bin Hassan', 'arif.hassan@graduate.utm.my', 'student'),
('U016', 'fatimah008', 'hashed_pass16', 'Fatimah Zahra', 'fatimah.zahra@graduate.utm.my', 'student'),
('U017', 'james009', 'hashed_pass17', 'James Wilson', 'james.wilson@graduate.utm.my', 'student'),
('U018', 'anis010', 'hashed_pass18', 'Anis Farhana', 'anis.farhana@graduate.utm.my', 'student'),
('U019', 'kenji011', 'hashed_pass19', 'Kenji Tanaka', 'kenji.tanaka@graduate.utm.my', 'student'),
('U020', 'aisha012', 'hashed_pass20', 'Aisha Rahman', 'aisha.rahman@graduate.utm.my', 'student'),
('U021', 'david013', 'hashed_pass21', 'David Chen', 'david.chen@graduate.utm.my', 'student'),
('U022', 'zara014', 'hashed_pass22', 'Zara Mohamed', 'zara.mohamed@graduate.utm.my', 'student'),
('U023', 'ryan015', 'hashed_pass23', 'Ryan Lim', 'ryan.lim@graduate.utm.my', 'student'),
('U024', 'sara016', 'hashed_pass24', 'Sara Ibrahim', 'sara.ibrahim@graduate.utm.my', 'student');

-- Insert Admins
INSERT INTO Admin (adminID, userID) VALUES
('ADM001', 'U001'),
('ADM002', 'U002'),
('ADM003', 'U003'),
('ADM004', 'U004');

-- Insert Students
INSERT INTO Student (studentID, userID, totalPoints, totalMerits) VALUES
('A23CS0001', 'U005', 0, 0),
('A23CS0002', 'U006', 0, 0),
('A23CS0003', 'U007', 0, 0),
('A23CS0004', 'U008', 0, 0),
('A23CS0005', 'U009', 0, 0),
('A23CS0006', 'U010', 0, 0),
('A23CS0007', 'U011', 0, 0),
('A23CS0008', 'U012', 0, 0),
('A23CS0009', 'U013', 0, 0),
('A23CS0010', 'U014', 0, 0),
('A23CS0011', 'U015', 0, 0),
('A23CS0012', 'U016', 0, 0),
('A23CS0013', 'U017', 0, 0),
('A23CS0014', 'U018', 0, 0),
('A23CS0015', 'U019', 0, 0),
('A23CS0016', 'U020', 0, 0),
('A23CS0017', 'U021', 0, 0),
('A23CS0018', 'U022', 0, 0),
('A23CS0019', 'U023', 0, 0),
('A23CS0020', 'U024', 0, 0);

-- Insert Events
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

-- Insert Participation Records
-- Event 1: Earth Day Recycling Drive
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0002', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0003', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0004', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0005', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0006', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0007', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0008', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0009', 1, 'Completed', 50, 5, 'ADM001'),
('A23CS0010', 1, 'Completed', 50, 5, 'ADM001');

-- Event 2: Plastic-Free Campus Campaign
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0002', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0003', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0004', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0005', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0006', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0007', 2, 'Completed', 100, 10, 'ADM002'),
('A23CS0008', 2, 'Completed', 100, 10, 'ADM002');

-- Event 3: E-Waste Collection Week
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0003', 3, 'Completed', 75, 8, 'ADM001'),
('A23CS0004', 3, 'Completed', 75, 8, 'ADM001'),
('A23CS0005', 3, 'Completed', 75, 8, 'ADM001'),
('A23CS0006', 3, 'Completed', 75, 8, 'ADM001'),
('A23CS0007', 3, 'Completed', 75, 8, 'ADM001'),
('A23CS0008', 3, 'Completed', 75, 8, 'ADM001');

-- Event 4: Sustainability Awareness Talk
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0002', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0003', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0004', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0005', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0006', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0007', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0008', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0009', 4, 'Completed', 25, 3, 'ADM003'),
('A23CS0010', 4, 'Completed', 25, 3, 'ADM003');

-- Event 6: Paper Recycling Challenge (Ongoing)
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0002', 6, 'Attended', 30, 20, 'ADM004'),
('A23CS0003', 6, 'Attended', 30, 20, 'ADM004'),
('A23CS0005', 6, 'Attended', 30, 20, 'ADM004'),
('A23CS0007', 6, 'Attended', 30, 20, 'ADM004'),
('A23CS0009', 6, 'Attended', 30, 20, 'ADM004');

-- Event 7: Climate Action Workshop
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 7, 'Completed', 30, 3, 'ADM003'),
('A23CS0002', 7, 'Completed', 30, 3, 'ADM003'),
('A23CS0004', 7, 'Completed', 30, 3, 'ADM003'),
('A23CS0006', 7, 'Completed', 30, 3, 'ADM003'),
('A23CS0008', 7, 'Completed', 30, 3, 'ADM003'),
('A23CS0010', 7, 'Completed', 30, 3, 'ADM003');

-- Event 9: Tree Planting Day
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 9, 'Completed', 50, 8, 'ADM002'),
('A23CS0003', 9, 'Completed', 50, 8, 'ADM002'),
('A23CS0005', 9, 'Completed', 50, 8, 'ADM002'),
('A23CS0007', 9, 'Completed', 50, 8, 'ADM002'),
('A23CS0009', 9, 'Completed', 50, 8, 'ADM002');

-- Event 10: Water Conservation Campaign
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0002', 10, 'Completed', 40, 12, 'ADM003'),
('A23CS0004', 10, 'Completed', 40, 12, 'ADM003'),
('A23CS0006', 10, 'Completed', 40, 12, 'ADM003'),
('A23CS0008', 10, 'Completed', 40, 12, 'ADM003'),
('A23CS0010', 10, 'Completed', 40, 12, 'ADM003');

-- Event 11: Energy Saving Challenge
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0002', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0003', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0004', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0005', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0006', 11, 'Completed', 60, 15, 'ADM001'),
('A23CS0007', 11, 'Completed', 60, 15, 'ADM001');

-- Event 12: Community Garden Project
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0003', 12, 'Completed', 80, 20, 'ADM004'),
('A23CS0006', 12, 'Completed', 80, 20, 'ADM004'),
('A23CS0009', 12, 'Completed', 80, 20, 'ADM004'),
('A23CS0012', 12, 'Completed', 80, 20, 'ADM004'),
('A23CS0015', 12, 'Completed', 80, 20, 'ADM004');

-- Event 13: Campus Bike Week
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 13, 'Completed', 80, 8, 'ADM001'),
('A23CS0002', 13, 'Completed', 80, 8, 'ADM001'),
('A23CS0003', 13, 'Completed', 80, 8, 'ADM001'),
('A23CS0004', 13, 'Completed', 80, 8, 'ADM001'),
('A23CS0005', 13, 'Completed', 80, 8, 'ADM001');

-- Event 14: Electric Vehicle Awareness Day
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0003', 14, 'Completed', 60, 6, 'ADM002'),
('A23CS0005', 14, 'Completed', 60, 6, 'ADM002'),
('A23CS0007', 14, 'Completed', 60, 6, 'ADM002'),
('A23CS0009', 14, 'Completed', 60, 6, 'ADM002'),
('A23CS0011', 14, 'Completed', 60, 6, 'ADM002');

-- Event 15: Walk-to-Campus Challenge
INSERT INTO Participation (studentID, eventID, participationStatus, rewardPointsEarned, meritPointsAwarded, attendanceVerifiedBy) VALUES
('A23CS0001', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0002', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0003', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0004', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0005', 15, 'Completed', 70, 12, 'ADM003'),
('A23CS0006', 15, 'Completed', 70, 12, 'ADM003');


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

-- ================================================
-- Insert Campaign Analytics
-- ================================================

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

-- Insert Analytics Reports
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

-- ================================================
-- VIEWS
-- ================================================

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

-- ================================================
-- TRIGGERS
-- ================================================

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

-- ================================================
-- TEST QUERIES
-- ================================================

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

-- Re-enable safe updates
SET SQL_SAFE_UPDATES = 1;

SELECT '✅ Database setup completed successfully!' as Message;
