-- ============================================
-- Subsystem 2 Module 2 Data (EVENT)
-- ============================================

INSERT INTO Event (eventTitle, eventDescription, eventCategory, eventStartDate, eventEndDate, rewardPoints, UTMMeritPoints, eventImageURL, status, createdBy) VALUES
('Earth Day Recycling Drive 2025', 'Annual campus-wide recycling collection event', 'Environment', '2025-04-22', '2025-04-24', 50, 5, 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop', 'Completed', 'ADM001'),
('Plastic-Free Campus Campaign', 'Reduce single-use plastics initiative', 'Environment', '2025-03-01', '2025-03-15', 100, 10, 'https://images.unsplash.com/photo-1558640476-437a2d943b85?w=800&auto=format&fit=crop', 'Completed', 'ADM002'),
('E-Waste Collection Week', 'Electronic waste collection event', 'Environment', '2025-05-15', '2025-05-22', 75, 8, 'https://images.unsplash.com/photo-1584974292709-7d269a9b3c01?w=800&auto=format&fit=crop', 'Completed', 'ADM001'),
('Sustainability Awareness Talk', 'Educational session on sustainability', 'Conservation', '2025-06-10', '2025-06-10', 25, 3, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop', 'Completed', 'ADM003'),
('Green Week 2025', 'Environmental activities week', 'Environment', '2025-09-01', '2025-09-07', 50, 15, 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=800&auto=format&fit=crop', 'Upcoming', 'ADM002'),
('Paper Recycling Challenge', 'Departmental paper collection competition', 'Environment', '2025-07-01', '2025-07-15', 30, 20, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&auto=format&fit=crop', 'Ongoing', 'ADM004'),
('Climate Action Workshop', 'Carbon footprint workshop', 'Environment', '2025-05-05', '2025-05-05', 30, 3, 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop', 'Completed', 'ADM003'),
('Zero Waste Campus Initiative', 'Waste minimization program', 'Environment', '2025-08-01', '2025-08-15', 50, 18, 'https://images.unsplash.com/photo-1528190336454-13cd56b45b5a?w=800&auto=format&fit=crop', 'Upcoming', 'ADM001'),
('Tree Planting Day 2025', 'Campus tree planting activity', 'Environment', '2025-02-14', '2025-02-14', 50, 8, 'https://images.unsplash.com/photo-1599003037886-f8b50bc2901b?w=800&auto=format&fit=crop', 'Completed', 'ADM002'),
('Water Conservation Campaign', 'Save water awareness campaign', 'Conservation', '2025-01-15', '2025-01-25', 40, 12, 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&auto=format&fit=crop', 'Completed', 'ADM003'),
('Energy Saving Challenge', 'Reduce electricity consumption', 'Conservation', '2025-04-01', '2025-04-15', 60, 15, 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop', 'Completed', 'ADM001'),
('Community Garden Project', 'Establish community garden on campus', 'Environment', '2025-03-15', '2025-03-30', 80, 20, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&auto=format&fit=crop', 'Completed', 'ADM004'),
('Campus Bike Week 2025', 'Promote cycling as sustainable campus transport', 'Environment', '2025-03-10', '2025-03-16', 80, 8, 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=800&auto=format&fit=crop', 'Completed', 'ADM001'),
('Electric Vehicle Awareness Day', 'Showcase EV benefits and campus charging stations', 'Environment', '2025-05-20', '2025-05-20', 60, 6, 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&auto=format&fit=crop', 'Completed', 'ADM002'),
('Walk-to-Campus Challenge', 'Encourage walking to campus for one week', 'Sport', '2025-06-01', '2025-06-07', 70, 12, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop', 'Completed', 'ADM003'),
('Campus Clean-Up', 'Join us in cleaning our campus compound.', 'Volunteer', '2026-02-15', '2026-02-15', 10, 2, 'https://picsum.photos/400/200?random=1', 'Upcoming', 'ADM001'), 
('Blood Donation Drive', 'Donate blood and save lives.', 'Health', '2026-03-01', '2026-03-01', 20, 5, 'https://picsum.photos/400/200?random=2', 'Upcoming', 'ADM002'), 
('UTM Run 2026', 'A 5KM charity run inside UTM campus.', 'Sports', '2026-03-15', '2026-03-15', 50, 10, 'https://picsum.photos/400/250?random=3', 'Upcoming', 'ADM001');

-- Check the current max Event ID
SELECT MAX(eventID) as max_id FROM Event;

-- Assuming the max is 15 from your existing data, we'll start new events from 16
SET @next_event_id = (SELECT COALESCE(MAX(eventID), 0) + 1 FROM Event);
SELECT @next_event_id;

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

SELECT * FROM participation;

SELECT * FROM recycling_transactions;

SELECT * FROM Event;