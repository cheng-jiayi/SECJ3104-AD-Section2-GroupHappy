-- ============================================
-- SUBSYSTEM 1 (USER MANAGEMENT SUBSYSTEM)
-- ============================================

-- ============================================
-- CREATE SAMPLE USERS (if not exists)
-- ============================================

-- First insert the admin users into User table
INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address) VALUES
('U001', 'sarah_admin', 'hashed_pass1', 'Dr. Sarah Lim', 'ADM001', 'sarah.lim@utm.my', 'admin', '012-3456789', 'Faculty of Computing'),
('U002', 'ahmad_admin', 'hashed_pass2', 'Ahmad Faiz', 'ADM002', 'ahmad.faiz@utm.my', 'admin', '012-3456790', 'Faculty of Engineering'),
('U003', 'priya_admin', 'hashed_pass3', 'Priya Sharma', 'ADM003', 'priya.sharma@utm.my', 'admin', '012-3456791', 'Faculty of Science'),
('U004', 'wei_admin', 'hashed_pass4', 'Wei Chen', 'ADM004', 'wei.chen@utm.my', 'admin', '012-3456792', 'Faculty of Built Environment');
-- Then insert into Admin table
INSERT IGNORE INTO Admin (adminID, userID) VALUES
('ADM001', 'U001'),
('ADM002', 'U002'),
('ADM003', 'U003'),
('ADM004', 'U004');


INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role, contactNumber, address) VALUES
('U005','john123','hashed_pass5','John Doe','A23CS0001','doe.john@utm.my','student','013-3456792', 'Faculty of Built Environment');

-- ============================================
-- Auto-generate Students for UTM ReMerit (FIXED VERSION)
-- ============================================

DELIMITER $$

DROP PROCEDURE IF EXISTS GenerateStudents$$

CREATE PROCEDURE GenerateStudents(IN total_students INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE faculty VARCHAR(10);
    DECLARE yearOfStudy INT;
    DECLARE username VARCHAR(50);
    DECLARE fullName VARCHAR(100);
    DECLARE utmID VARCHAR(20);
    DECLARE email VARCHAR(255);
    DECLARE userID VARCHAR(36);
    DECLARE faculty_prefix VARCHAR(2);
    DECLARE faculty_counter INT DEFAULT 0;
    
    -- Temporary table to track faculty counts
    CREATE TEMPORARY TABLE IF NOT EXISTS FacultyCounts (
        faculty_code VARCHAR(10) PRIMARY KEY,
        counter INT DEFAULT 0
    );
    
    -- Initialize faculty counters
    INSERT IGNORE INTO FacultyCounts (faculty_code) VALUES 
        ('FABU'), ('FS'), ('FKT'), ('FKE'), ('FK'), ('FKM'), ('FSSH'), ('FEST'), ('FM'), ('SPACE');
    
    -- Clear existing students (optional)
    -- DELETE FROM Student;
    -- DELETE FROM User WHERE role = 'student';

    WHILE i <= total_students DO
        -- Get random faculty
        SET faculty = ELT(FLOOR(1 + (RAND() * 10)), 'FABU','FS','FKT','FKE','FK','FKM','FSSH','FEST','FM','SPACE');
        SET yearOfStudy = FLOOR(1 + (RAND() * 5));
        SET username = CONCAT('student', LPAD(i, 3, '0'));
        SET fullName = CONCAT('Student ', LPAD(i, 3, '0'));
        
        -- Get faculty prefix mapping (for consistent student IDs)
        SET faculty_prefix = CASE faculty
            WHEN 'FABU' THEN 'BU'
            WHEN 'FS' THEN 'SC'
            WHEN 'FKT' THEN 'KT'
            WHEN 'FKE' THEN 'EN'
            WHEN 'FK' THEN 'CS'
            WHEN 'FKM' THEN 'KM'
            WHEN 'FSSH' THEN 'SH'
            WHEN 'FEST' THEN 'ED'
            WHEN 'FM' THEN 'MD'
            WHEN 'SPACE' THEN 'SP'
            ELSE 'XX'
        END;
        
        -- Get and increment faculty counter
        SELECT counter INTO faculty_counter FROM FacultyCounts WHERE faculty_code = faculty;
        SET faculty_counter = faculty_counter + 1;
        UPDATE FacultyCounts SET counter = faculty_counter WHERE faculty_code = faculty;
        
        -- Create student ID with consistent pattern
        SET utmID = CONCAT('A23', faculty_prefix, LPAD(faculty_counter, 4, '0'));
        SET email = CONCAT('student', LPAD(i, 3, '0'), '@graduate.utm.my');
        SET userID = UUID();

        -- Insert user
        INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role)
        VALUES (userID, username, 'hashed_password', fullName, utmID, email, 'student');

        -- Insert student
        INSERT IGNORE INTO Student (studentID, userID, faculty, yearOfStudy, totalPoints, totalMerits)
        VALUES (utmID, userID, faculty, yearOfStudy, 0, 0);

        SET i = i + 1;
    END WHILE;
    
    -- Drop temporary table
    DROP TEMPORARY TABLE IF EXISTS FacultyCounts;
END$$

DELIMITER ;

-- ============================================
-- CREATE SPECIFIC STUDENTS FOR PARTICIPATION TESTING
-- ============================================

-- First, let's create specific students that match your Participation inserts
INSERT IGNORE INTO User (userID, username, password, fullName, utmID, email, role) VALUES
(UUID(), 'student_bu001', 'hashed_password', 'Student BU001', 'A23BU0001', 'student_bu001@graduate.utm.my', 'student'),
(UUID(), 'student_bu002', 'hashed_password', 'Student BU002', 'A23BU0002', 'student_bu002@graduate.utm.my', 'student'),
(UUID(), 'student_bu003', 'hashed_password', 'Student BU003', 'A23BU0003', 'student_bu003@graduate.utm.my', 'student'),
(UUID(), 'student_en001', 'hashed_password', 'Student EN001', 'A23EN0001', 'student_en001@graduate.utm.my', 'student'),
(UUID(), 'student_en002', 'hashed_password', 'Student EN002', 'A23EN0002', 'student_en002@graduate.utm.my', 'student'),
(UUID(), 'student_en003', 'hashed_password', 'Student EN003', 'A23EN0003', 'student_en003@graduate.utm.my', 'student'),
(UUID(), 'student_en004', 'hashed_password', 'Student EN004', 'A23EN0004', 'student_en004@graduate.utm.my', 'student'),
(UUID(), 'student_en005', 'hashed_password', 'Student EN005', 'A23EN0005', 'student_en005@graduate.utm.my', 'student'),
(UUID(), 'student_en006', 'hashed_password', 'Student EN006', 'A23EN0006', 'student_en006@graduate.utm.my', 'student'),
(UUID(), 'student_en007', 'hashed_password', 'Student EN007', 'A23EN0007', 'student_en007@graduate.utm.my', 'student'),
(UUID(), 'student_en008', 'hashed_password', 'Student EN008', 'A23EN0008', 'student_en008@graduate.utm.my', 'student'),
(UUID(), 'student_cs001', 'hashed_password', 'Student CS001', 'A23CS0001', 'student_cs001@graduate.utm.my', 'student'),
(UUID(), 'student_cs002', 'hashed_password', 'Student CS002', 'A23CS0002', 'student_cs002@graduate.utm.my', 'student'),
(UUID(), 'student_cs003', 'hashed_password', 'Student CS003', 'A23CS0003', 'student_cs003@graduate.utm.my', 'student'),
(UUID(), 'student_cs004', 'hashed_password', 'Student CS004', 'A23CS0004', 'student_cs004@graduate.utm.my', 'student'),
(UUID(), 'student_cs005', 'hashed_password', 'Student CS005', 'A23CS0005', 'student_cs005@graduate.utm.my', 'student'),
(UUID(), 'student_cs006', 'hashed_password', 'Student CS006', 'A23CS0006', 'student_cs006@graduate.utm.my', 'student'),
(UUID(), 'student_cs007', 'hashed_password', 'Student CS007', 'A23CS0007', 'student_cs007@graduate.utm.my', 'student'),
(UUID(), 'student_sh001', 'hashed_password', 'Student SH001', 'A23SH0001', 'student_sh001@graduate.utm.my', 'student'),
(UUID(), 'student_sh002', 'hashed_password', 'Student SH002', 'A23SH0002', 'student_sh002@graduate.utm.my', 'student'),
(UUID(), 'student_sh003', 'hashed_password', 'Student SH003', 'A23SH0003', 'student_sh003@graduate.utm.my', 'student'),
(UUID(), 'student_sh004', 'hashed_password', 'Student SH004', 'A23SH0004', 'student_sh004@graduate.utm.my', 'student'),
(UUID(), 'student_ed001', 'hashed_password', 'Student ED001', 'A23ED0001', 'student_ed001@graduate.utm.my', 'student'),
(UUID(), 'student_ed002', 'hashed_password', 'Student ED002', 'A23ED0002', 'student_ed002@graduate.utm.my', 'student'),
(UUID(), 'student_ed003', 'hashed_password', 'Student ED003', 'A23ED0003', 'student_ed003@graduate.utm.my', 'student'),
(UUID(), 'student_ed004', 'hashed_password', 'Student ED004', 'A23ED0004', 'student_ed004@graduate.utm.my', 'student'),
(UUID(), 'student_kt001', 'hashed_password', 'Student KT001', 'A23KT0001', 'student_kt001@graduate.utm.my', 'student'),
(UUID(), 'student_kt002', 'hashed_password', 'Student KT002', 'A23KT0002', 'student_kt002@graduate.utm.my', 'student'),
(UUID(), 'student_kt003', 'hashed_password', 'Student KT003', 'A23KT0003', 'student_kt003@graduate.utm.my', 'student'),
(UUID(), 'student_kt004', 'hashed_password', 'Student KT004', 'A23KT0004', 'student_kt004@graduate.utm.my', 'student'),
(UUID(), 'student_kt005', 'hashed_password', 'Student KT005', 'A23KT0005', 'student_kt005@graduate.utm.my', 'student'),
(UUID(), 'student_cp001', 'hashed_password', 'Student CP001', 'A23CP0001', 'student_cp001@graduate.utm.my', 'student'),
(UUID(), 'student_cp002', 'hashed_password', 'Student CP002', 'A23CP0002', 'student_cp002@graduate.utm.my', 'student'),
(UUID(), 'student_cp003', 'hashed_password', 'Student CP003', 'A23CP0003', 'student_cp003@graduate.utm.my', 'student'),
(UUID(), 'student_cp004', 'hashed_password', 'Student CP004', 'A23CP0004', 'student_cp004@graduate.utm.my', 'student'),
(UUID(), 'student_cp005', 'hashed_password', 'Student CP005', 'A23CP0005', 'student_cp005@graduate.utm.my', 'student'),
(UUID(), 'student_mg001', 'hashed_password', 'Student MG001', 'A23MG0001', 'student_mg001@graduate.utm.my', 'student'),
(UUID(), 'student_mg002', 'hashed_password', 'Student MG002', 'A23MG0002', 'student_mg002@graduate.utm.my', 'student'),
(UUID(), 'student_mg003', 'hashed_password', 'Student MG003', 'A23MG0003', 'student_mg003@graduate.utm.my', 'student'),
(UUID(), 'student_mg004', 'hashed_password', 'Student MG004', 'A23MG0004', 'student_mg004@graduate.utm.my', 'student'),
(UUID(), 'student_mg005', 'hashed_password', 'Student MG005', 'A23MG0005', 'student_mg005@graduate.utm.my', 'student'),
(UUID(), 'student_md001', 'hashed_password', 'Student MD001', 'A23MD0001', 'student_md001@graduate.utm.my', 'student'),
(UUID(), 'student_sp001', 'hashed_password', 'Student SP001', 'A23SP0001', 'student_sp001@graduate.utm.my', 'student'),
(UUID(), 'student_sp002', 'hashed_password', 'Student SP002', 'A23SP0002', 'student_sp002@graduate.utm.my', 'student'),
(UUID(), 'student_sp003', 'hashed_password', 'Student SP003', 'A23SP0003', 'student_sp003@graduate.utm.my', 'student');

-- Insert corresponding Student records
INSERT IGNORE INTO Student (studentID, userID, faculty, yearOfStudy, totalPoints, totalMerits)
SELECT 
    u.utmID,
    u.userID,
    CASE 
        WHEN u.utmID LIKE 'A23BU%' THEN 'FABU'
        WHEN u.utmID LIKE 'A23EN%' THEN 'FKE'
        WHEN u.utmID LIKE 'A23CS%' THEN 'FK'
        WHEN u.utmID LIKE 'A23SH%' THEN 'FSSH'
        WHEN u.utmID LIKE 'A23ED%' THEN 'FEST'
        WHEN u.utmID LIKE 'A23KT%' THEN 'FKT'
        WHEN u.utmID LIKE 'A23CP%' THEN 'FKM'
        WHEN u.utmID LIKE 'A23MG%' THEN 'FM'
        WHEN u.utmID LIKE 'A23MD%' THEN 'FM'
        WHEN u.utmID LIKE 'A23SP%' THEN 'SPACE'
        ELSE 'FABU'
    END as faculty,
    FLOOR(1 + (RAND() * 5)) as yearOfStudy,
    0, 0
FROM User u 
WHERE u.role = 'student' 
AND u.utmID IN (
    'A23BU0001', 'A23BU0002', 'A23BU0003', 'A23BU0004', 'A23BU0005',
    'A23EN0001', 'A23EN0002', 'A23EN0003', 'A23EN0004', 'A23EN0005', 
    'A23EN0006', 'A23EN0007', 'A23EN0008',
    'A23CS0001', 'A23CS0002', 'A23CS0003', 'A23CS0004', 'A23CS0005',
    'A23CS0006', 'A23CS0007',
    'A23SH0001', 'A23SH0002', 'A23SH0003', 'A23SH0004',
    'A23ED0001', 'A23ED0002', 'A23ED0003', 'A23ED0004',
    'A23KT0001', 'A23KT0002', 'A23KT0003', 'A23KT0004', 'A23KT0005',
    'A23CP0001', 'A23CP0002', 'A23CP0003', 'A23CP0004', 'A23CP0005',
    'A23MG0001', 'A23MG0002', 'A23MG0003', 'A23MG0004', 'A23MG0005',
    'A23MD0001',
    'A23SP0001', 'A23SP0002', 'A23SP0003'
);

-- Now generate the rest of the students
CALL GenerateStudents(300); -- This will generate additional 300 students

SELECT * FROM Student;

SELECT * FROM User;



