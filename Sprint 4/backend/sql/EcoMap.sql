-- ============================================
-- SUBSYSTEM 3 MODULE 2 (EcoMAP)
-- ============================================

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS GetBinsByStatus;
DROP PROCEDURE IF EXISTS GetIssuesFiltered;
DROP PROCEDURE IF EXISTS GetBinStatistics;
DROP PROCEDURE IF EXISTS GetNearbyBins;
DROP PROCEDURE IF EXISTS UpdateBinStatus;
DROP PROCEDURE IF EXISTS ReportBinIssue;
DROP PROCEDURE IF EXISTS FindStationsWithBinTypes;
DROP PROCEDURE IF EXISTS FindStationsWithMultipleTypes;
DROP PROCEDURE IF EXISTS AddNewStation;
DROP PROCEDURE IF EXISTS AddBinToStation;
DROP TRIGGER IF EXISTS update_resolved_at;

-- Create the trigger first
DELIMITER //
CREATE TRIGGER update_resolved_at
BEFORE UPDATE ON Bin_Issues
FOR EACH ROW
BEGIN
    IF NEW.status = 'Resolved' AND OLD.status != 'Resolved' THEN
        SET NEW.resolved_at = CURRENT_TIMESTAMP;
    ELSEIF NEW.status != 'Resolved' THEN
        SET NEW.resolved_at = NULL;
    END IF;
END;
//
DELIMITER ;

-- Insert bin types
INSERT IGNORE INTO Bin_Types (type_name, description) VALUES
    ('Plastic', 'All types of plastic containers and packaging'),
    ('Paper', 'Newspapers, magazines, cardboard, office paper'),
    ('Glass', 'Glass bottles and jars of any color'),
    ('Metal', 'Aluminum cans, tin cans, metal containers'),
    ('E-Waste', 'Electronic waste and batteries'),
    ('Organic', 'Compostable food and garden waste'),
    ('Mixed', 'General mixed recycling');

-- Insert Stations
INSERT IGNORE INTO STATIONS (station_name, latitude, longitude, description) VALUES
    ('Student Center Main Entrance', 1.564145, 103.638011, 'Main student center with multiple recycling bins'),
    ('University Library', 1.559500, 103.636800, 'Main library building entrance'),
    ('Science Building', 1.562000, 103.637000, 'Science faculty building'),
    ('Main Cafeteria', 1.563200, 103.638800, 'Central cafeteria and food court'),
    ('Sports Complex', 1.565000, 103.636000, 'Sports and recreation center'),
    ('Engineering Block', 1.561500, 103.639200, 'Engineering faculty building'),
    ('KK2 Dormitory', 1.564500, 103.637800, 'Residential college 2'),
    ('Sultan Ismail Mosque', 1.560000, 103.640000, 'University mosque');

-- Insert Recycling Bins (now referencing station_id)
-- Station 1: Student Center Main Entrance
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (1, 1, 'Student Center - Plastic Bin', 'Active'),
    (1, 2, 'Student Center - Paper Bin', 'Active'),
    (1, 3, 'Student Center - Glass Bin', 'Full'),
    (1, 4, 'Student Center - Metal Bin', 'Active'),
    (1, 7, 'Student Center - Mixed Bin', 'Active');

-- Station 2: University Library
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (2, 1, 'Library - Plastic Bin', 'Active'),
    (2, 2, 'Library - Paper Bin', 'Active'),
    (2, 5, 'Library - E-Waste Bin', 'Active'),
    (2, 7, 'Library - Mixed Bin', 'Under Maintenance');

-- Station 3: Science Building
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (3, 1, 'Science Building - Plastic Bin', 'Active'),
    (3, 2, 'Science Building - Paper Bin', 'Active'),
    (3, 3, 'Science Building - Glass Bin', 'Active'),
    (3, 5, 'Science Building - E-Waste Bin', 'Active');

-- Station 4: Main Cafeteria
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (4, 1, 'Cafeteria - Plastic Bin', 'Active'),
    (4, 2, 'Cafeteria - Paper Bin', 'Active'),
    (4, 6, 'Cafeteria - Organic Bin', 'Full'),
    (4, 7, 'Cafeteria - Mixed Bin', 'Active');

-- Station 5: Sports Complex
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (5, 1, 'Sports Complex - Plastic Bin', 'Active'),
    (5, 7, 'Sports Complex - Mixed Bin', 'Active');

-- Station 6: Engineering Block
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (6, 1, 'Engineering Block - Plastic Bin', 'Active'),
    (6, 2, 'Engineering Block - Paper Bin', 'Active'),
    (6, 5, 'Engineering Block - E-Waste Bin', 'Active'),
    (6, 7, 'Engineering Block - Mixed Bin', 'Active');

-- Station 7: KK2 Dormitory
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (7, 1, 'KK2 Dormitory - Plastic Bin', 'Active'),
    (7, 2, 'KK2 Dormitory - Paper Bin', 'Active'),
    (7, 7, 'KK2 Dormitory - Mixed Bin', 'Active');

-- Station 8: Sultan Ismail Mosque
INSERT IGNORE INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) VALUES
    (8, 1, 'Mosque - Plastic Bin', 'Active'),
    (8, 2, 'Mosque - Paper Bin', 'Active'),
    (8, 7, 'Mosque - Mixed Bin', 'Active');

-- Insert sample bin issues
INSERT IGNORE INTO Bin_Issues (bin_id, user_id, issue_type, description, photo_url, status, reported_at) VALUES
    (3, 'STU001', 'Full', 'Glass bin at Student Center is overflowing with bottles', NULL, 'Pending', NOW() - INTERVAL 2 HOUR),
    (14, 'STU002', 'Damaged', 'Organic bin at Cafeteria has broken lid', NULL, 'Pending', NOW() - INTERVAL 5 HOUR),
    (7, 'STU003', 'Misplaced', 'Mixed bin at Library moved from its original position', NULL, 'Resolved', NOW() - INTERVAL 1 DAY),
    (10, 'STU004', 'Full', 'Paper bin at Science Building completely full', NULL, 'Pending', NOW() - INTERVAL 3 HOUR),
    (4, 'STU005', 'Damaged', 'Signage missing from Metal bin at Student Center', NULL, 'Ignored', NOW() - INTERVAL 2 DAY);

-- ========== UPDATED STORED PROCEDURES ==========

-- Procedure to get bins by status (updated to join with stations)
DELIMITER //
CREATE PROCEDURE GetBinsByStatus(IN p_status_filter VARCHAR(20))
BEGIN
    SELECT 
        rb.bin_id,
        rb.bin_name,
        bt.type_name,
        s.station_name,
        s.latitude,
        s.longitude,
        s.description as station_description,
        rb.status,
        rb.created_at,
        rb.updated_at
    FROM Recycling_Bins rb
    JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
    JOIN STATIONS s ON rb.station_id = s.station_id
    WHERE 
        p_status_filter = 'All' COLLATE utf8mb4_unicode_ci 
        OR rb.status = p_status_filter COLLATE utf8mb4_unicode_ci
    ORDER BY s.station_name, bt.type_name;
END //
DELIMITER ;

-- Procedure for admins to filter issues (updated to include station info)
DELIMITER //
CREATE PROCEDURE GetIssuesFiltered(
    IN p_issue_status_filter VARCHAR(20),
    IN p_issue_type_filter VARCHAR(50),
    IN p_station_id_filter INT,
    IN p_days_back INT
)
BEGIN
    DECLARE cutoff_date TIMESTAMP;
    
    IF p_days_back IS NOT NULL AND p_days_back > 0 THEN
        SET cutoff_date = DATE_SUB(NOW(), INTERVAL p_days_back DAY);
    ELSE
        SET cutoff_date = '1970-01-01';
    END IF;
    
    SELECT 
        bi.issue_id,
        bi.bin_id,
        rb.bin_name,
        bt.type_name,
        s.station_name,
        s.latitude,
        s.longitude,
        s.description as station_description,
        bi.user_id,
        bi.issue_type,
        bi.description AS issue_description,
        bi.photo_url,
        bi.status,
        bi.reported_at,
        bi.resolved_at,
        TIMESTAMPDIFF(HOUR, bi.reported_at, NOW()) AS hours_pending
    FROM Bin_Issues bi
    JOIN Recycling_Bins rb ON bi.bin_id = rb.bin_id
    JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
    JOIN STATIONS s ON rb.station_id = s.station_id
    WHERE 
        (p_issue_status_filter IS NULL OR bi.status = p_issue_status_filter COLLATE utf8mb4_unicode_ci)
        AND (p_issue_type_filter IS NULL OR bi.issue_type = p_issue_type_filter COLLATE utf8mb4_unicode_ci)
        AND (p_station_id_filter IS NULL OR s.station_id = p_station_id_filter)
        AND bi.reported_at >= cutoff_date
    ORDER BY bi.reported_at DESC;
END //
DELIMITER ;

-- Procedure to get bin statistics for dashboard (updated)
DELIMITER //
CREATE PROCEDURE GetBinStatistics()
BEGIN
    -- Total bins by status
    SELECT 
        status,
        COUNT(*) as count
    FROM Recycling_Bins
    GROUP BY status;
    
    -- Total stations
    SELECT 
        'Stations' as type,
        COUNT(*) as count
    FROM STATIONS;
    
    -- Issues by status
    SELECT 
        status,
        COUNT(*) as count
    FROM Bin_Issues
    GROUP BY status;
    
    -- Issues by type
    SELECT 
        issue_type,
        COUNT(*) as count
    FROM Bin_Issues
    WHERE status = 'Pending'
    GROUP BY issue_type;
END //
DELIMITER ;

-- Procedure to get nearby bins (updated to use stations table)
DELIMITER //
CREATE PROCEDURE GetNearbyBins(
    IN p_latitude DECIMAL(10,6),
    IN p_longitude DECIMAL(10,6),
    IN p_radius_km DECIMAL(5,2),
    IN p_status_filter VARCHAR(20)
)
BEGIN
    SELECT 
        s.station_id,
        s.station_name,
        rb.bin_id,
        rb.bin_name,
        bt.type_name,
        s.latitude,
        s.longitude,
        s.description as station_description,
        rb.status,
        -- Calculate distance in kilometers
        6371 * ACOS(
            COS(RADIANS(p_latitude)) * COS(RADIANS(s.latitude)) *
            COS(RADIANS(s.longitude) - RADIANS(p_longitude)) +
            SIN(RADIANS(p_latitude)) * SIN(RADIANS(s.latitude))
        ) AS distance_km,
        -- Count bins at this station
        (SELECT COUNT(*) FROM Recycling_Bins WHERE station_id = s.station_id) as bins_at_station
    FROM STATIONS s
    JOIN Recycling_Bins rb ON s.station_id = rb.station_id
    JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
    WHERE 
        (p_status_filter = 'All' COLLATE utf8mb4_unicode_ci OR rb.status = p_status_filter COLLATE utf8mb4_unicode_ci)
        -- Approximate filter for performance (1 degree ≈ 111km)
        AND s.latitude BETWEEN p_latitude - (p_radius_km / 111.0) 
                          AND p_latitude + (p_radius_km / 111.0)
        AND s.longitude BETWEEN p_longitude - (p_radius_km / (111.0 * COS(RADIANS(p_latitude))))
                           AND p_longitude + (p_radius_km / (111.0 * COS(RADIANS(p_latitude))))
    HAVING distance_km <= p_radius_km
    ORDER BY distance_km, s.station_name, bt.type_name;
END //
DELIMITER ;

-- Updated FindStationsWithMultipleTypes procedure
DELIMITER //
CREATE PROCEDURE FindStationsWithMultipleTypes(
    IN p_latitude DECIMAL(10,6),
    IN p_longitude DECIMAL(10,6),
    IN p_bin_type1 VARCHAR(50),
    IN p_bin_type2 VARCHAR(50),
    IN p_radius_km DECIMAL(6,2)
)
BEGIN
    -- Find stations that have BOTH types
    WITH StationCandidates AS (
        SELECT 
            s.station_id,
            s.station_name
        FROM STATIONS s
        JOIN Recycling_Bins rb ON s.station_id = rb.station_id
        JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
        WHERE bt.type_name IN (p_bin_type1, p_bin_type2)
        GROUP BY s.station_id, s.station_name
        HAVING COUNT(DISTINCT bt.type_name) = 2
    )
    -- Get detailed information for these stations
    SELECT 
        s.station_id,
        s.station_name,
        s.latitude,
        s.longitude,
        s.description,
        COUNT(DISTINCT rb.bin_id) as total_bins,
        GROUP_CONCAT(DISTINCT bt.type_name ORDER BY bt.type_name) as available_types,
        
        -- Calculate distance
        6371 * ACOS(
            COS(RADIANS(p_latitude)) * COS(RADIANS(s.latitude)) *
            COS(RADIANS(s.longitude) - RADIANS(p_longitude)) +
            SIN(RADIANS(p_latitude)) * SIN(RADIANS(s.latitude))
        ) as distance_km,
        
        -- List specific bins with status
        GROUP_CONCAT(
            DISTINCT CONCAT(rb.bin_name, ' (', bt.type_name, ' - ', rb.status, ')')
            ORDER BY bt.type_name SEPARATOR ' | '
        ) as bin_details,
        
        -- Status summary
        GROUP_CONCAT(DISTINCT rb.status ORDER BY rb.status) as status_summary
        
    FROM STATIONS s
    JOIN Recycling_Bins rb ON s.station_id = rb.station_id
    JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
    WHERE s.station_id IN (SELECT station_id FROM StationCandidates)
    GROUP BY s.station_id, s.station_name, s.latitude, s.longitude, s.description
    HAVING 
        -- Station must be within radius
        6371 * ACOS(
            COS(RADIANS(p_latitude)) * COS(RADIANS(s.latitude)) *
            COS(RADIANS(s.longitude) - RADIANS(p_longitude)) +
            SIN(RADIANS(p_latitude)) * SIN(RADIANS(s.latitude))
        ) <= p_radius_km
    ORDER BY distance_km;
END //
DELIMITER ;

-- Updated FindStationsWithBinTypes procedure
DELIMITER //
CREATE PROCEDURE FindStationsWithBinTypes(
    IN p_latitude DECIMAL(10,6),
    IN p_longitude DECIMAL(10,6),
    IN p_bin_types TEXT,  -- Comma-separated list: 'Plastic,Paper'
    IN p_radius_km DECIMAL(6,2)
)
BEGIN
    -- Count how many types were requested
    SET @type_count = LENGTH(p_bin_types) - LENGTH(REPLACE(p_bin_types, ',', '')) + 1;
    
    -- Find stations that have ALL requested types
    SELECT 
        s.station_id,
        s.station_name,
        s.latitude,
        s.longitude,
        s.description as station_description,
        COUNT(DISTINCT rb.bin_id) as total_bins_at_station,
        GROUP_CONCAT(DISTINCT bt.type_name ORDER BY bt.type_name) as available_bin_types,
        
        -- Calculate distance
        6371 * ACOS(
            COS(RADIANS(p_latitude)) * COS(RADIANS(s.latitude)) *
            COS(RADIANS(s.longitude) - RADIANS(p_longitude)) +
            SIN(RADIANS(p_latitude)) * SIN(RADIANS(s.latitude))
        ) as distance_km,
        
        -- List specific bins with status
        GROUP_CONCAT(
            DISTINCT CONCAT(rb.bin_name, ' (', bt.type_name, ' - ', rb.status, ')')
            ORDER BY bt.type_name SEPARATOR ' | '
        ) as bin_details,
        
        -- Status summary
        GROUP_CONCAT(DISTINCT rb.status ORDER BY rb.status) as status_summary
        
    FROM STATIONS s
    JOIN Recycling_Bins rb ON s.station_id = rb.station_id
    JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
    WHERE FIND_IN_SET(bt.type_name, p_bin_types) > 0
    GROUP BY s.station_id, s.station_name, s.latitude, s.longitude, s.description
    HAVING 
        COUNT(DISTINCT bt.type_name) = @type_count
        AND 
        -- Station must be within radius
        6371 * ACOS(
            COS(RADIANS(p_latitude)) * COS(RADIANS(s.latitude)) *
            COS(RADIANS(s.longitude) - RADIANS(p_longitude)) +
            SIN(RADIANS(p_latitude)) * SIN(RADIANS(s.latitude))
        ) <= p_radius_km
    ORDER BY distance_km;
END //
DELIMITER ;

-- New procedure to add a station
DELIMITER //
CREATE PROCEDURE AddNewStation(
    IN p_station_name VARCHAR(100),
    IN p_latitude DECIMAL(10,6),
    IN p_longitude DECIMAL(10,6),
    IN p_description VARCHAR(255),
    OUT p_station_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_station_exists INT;

    -- Check if station already exists at this location
    SELECT COUNT(*) INTO v_station_exists 
    FROM STATIONS 
    WHERE station_name = p_station_name COLLATE utf8mb4_unicode_ci
       OR (latitude = p_latitude AND longitude = p_longitude);

    IF v_station_exists > 0 THEN
        SET p_message = 'Error: Station already exists at this location or with this name';
        SET p_station_id = NULL;
    ELSEIF p_latitude NOT BETWEEN -90 AND 90 OR p_longitude NOT BETWEEN -180 AND 180 THEN
        SET p_message = 'Error: Invalid coordinates';
        SET p_station_id = NULL;
    ELSE
        -- Insert the new station
        INSERT INTO STATIONS (station_name, latitude, longitude, description) 
        VALUES (p_station_name, p_latitude, p_longitude, p_description);
        
        SET p_station_id = LAST_INSERT_ID();
        SET p_message = CONCAT('Success: Station "', p_station_name, '" added successfully');
    END IF;
END //
DELIMITER ;

-- New procedure to add a bin to a station
DELIMITER //
CREATE PROCEDURE AddBinToStation(
    IN p_station_id INT,
    IN p_bin_type_id INT,
    IN p_bin_name VARCHAR(100),
    IN p_status VARCHAR(20),
    OUT p_bin_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_station_exists INT;
    DECLARE v_bin_type_exists INT;

    -- Check if station exists
    SELECT COUNT(*) INTO v_station_exists 
    FROM STATIONS 
    WHERE station_id = p_station_id;

    -- Check if bin type exists
    SELECT COUNT(*) INTO v_bin_type_exists 
    FROM Bin_Types 
    WHERE bin_type_id = p_bin_type_id;

    IF v_station_exists = 0 THEN
        SET p_message = 'Error: Station not found';
        SET p_bin_id = NULL;
    ELSEIF v_bin_type_exists = 0 THEN
        SET p_message = 'Error: Bin type not found';
        SET p_bin_id = NULL;
    ELSEIF p_status NOT IN ('Active', 'Full', 'Under Maintenance') THEN
        SET p_message = 'Error: Invalid status';
        SET p_bin_id = NULL;
    ELSE
        -- Insert the new bin
        INSERT INTO Recycling_Bins (station_id, bin_type_id, bin_name, status) 
        VALUES (p_station_id, p_bin_type_id, p_bin_name, p_status);
        
        SET p_bin_id = LAST_INSERT_ID();
        SET p_message = CONCAT('Success: Bin "', p_bin_name, '" added to station');
    END IF;
END //
DELIMITER ;

-- Procedure to update bin status (unchanged)
DELIMITER //
CREATE PROCEDURE UpdateBinStatus(
    IN p_bin_id INT,
    IN p_new_status VARCHAR(20),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_current_status VARCHAR(20);
    
    -- Get current status
    SELECT status INTO v_current_status 
    FROM Recycling_Bins 
    WHERE bin_id = p_bin_id;
    
    -- Check if bin exists
    IF v_current_status IS NULL THEN
        SET p_message = 'Error: Bin not found';
    -- Check if status is valid
    ELSEIF p_new_status NOT IN ('Active', 'Full', 'Under Maintenance') THEN
        SET p_message = 'Error: Invalid status';
    -- Check if status is actually changing
    ELSEIF v_current_status = p_new_status COLLATE utf8mb4_unicode_ci THEN
        SET p_message = 'Warning: Status is already set to this value';
        -- Still update updated_at timestamp
        UPDATE Recycling_Bins 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE bin_id = p_bin_id;
    ELSE
        -- Update the status
        UPDATE Recycling_Bins 
        SET status = p_new_status COLLATE utf8mb4_unicode_ci, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE bin_id = p_bin_id;
        
        SET p_message = CONCAT('Success: Bin status updated from ', 
                              v_current_status, ' to ', p_new_status);
    END IF;
END //
DELIMITER ;

-- Procedure to report bin issue (unchanged)
DELIMITER //
CREATE PROCEDURE ReportBinIssue(
    IN p_bin_id INT,
    IN p_user_id VARCHAR(100),
    IN p_issue_type VARCHAR(50),
    IN p_description VARCHAR(255),
    IN p_photo_url VARCHAR(255),
    OUT p_issue_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_bin_exists INT;

    -- Check if bin exists
    SELECT COUNT(*) INTO v_bin_exists 
    FROM Recycling_Bins 
    WHERE bin_id = p_bin_id;

    IF v_bin_exists = 0 THEN
        SET p_message = 'Error: Bin not found';
        SET p_issue_id = NULL;
    ELSE
        -- Insert the new issue
        INSERT INTO Bin_Issues (
            bin_id, 
            user_id, 
            issue_type, 
            description, 
            photo_url, 
            status, 
            reported_at
        ) VALUES (
            p_bin_id,
            p_user_id COLLATE utf8mb4_unicode_ci,
            p_issue_type COLLATE utf8mb4_unicode_ci,
            p_description COLLATE utf8mb4_unicode_ci,
            p_photo_url COLLATE utf8mb4_unicode_ci,
            'Pending',
            CURRENT_TIMESTAMP
        );

        SET p_issue_id = LAST_INSERT_ID();
        SET p_message = 'Success: Issue reported successfully';
    END IF;
END //
DELIMITER ;

-- Drop existing views if they exist
DROP VIEW IF EXISTS All_Bins_With_Types;
DROP VIEW IF EXISTS Recent_Issues;
DROP VIEW IF EXISTS Recycling_Stations;
DROP VIEW IF EXISTS Station_Details;

-- Create updated views
CREATE OR REPLACE VIEW All_Bins_With_Types AS
SELECT 
    rb.bin_id,
    rb.bin_name,
    bt.type_name,
    s.station_id,
    s.station_name,
    s.latitude,
    s.longitude,
    s.description as station_description,
    rb.status,
    rb.created_at,
    rb.updated_at
FROM Recycling_Bins rb
JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
JOIN STATIONS s ON rb.station_id = s.station_id;

-- View for recent issues (updated)
CREATE OR REPLACE VIEW Recent_Issues AS
SELECT 
    bi.*,
    rb.bin_name,
    bt.type_name,
    s.station_name,
    s.latitude,
    s.longitude
FROM Bin_Issues bi
JOIN Recycling_Bins rb ON bi.bin_id = rb.bin_id
JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
JOIN STATIONS s ON rb.station_id = s.station_id
WHERE bi.reported_at >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- View for station details (new)
CREATE OR REPLACE VIEW Station_Details AS
SELECT 
    s.station_id,
    s.station_name,
    s.latitude,
    s.longitude,
    s.description,
    s.created_at,
    COUNT(rb.bin_id) as total_bins,
    GROUP_CONCAT(DISTINCT bt.type_name ORDER BY bt.type_name SEPARATOR ', ') as available_types,
    SUM(CASE WHEN rb.status = 'Active' THEN 1 ELSE 0 END) as active_bins,
    SUM(CASE WHEN rb.status = 'Full' THEN 1 ELSE 0 END) as full_bins,
    SUM(CASE WHEN rb.status = 'Under Maintenance' THEN 1 ELSE 0 END) as maintenance_bins
FROM STATIONS s
LEFT JOIN Recycling_Bins rb ON s.station_id = rb.station_id
LEFT JOIN Bin_Types bt ON rb.bin_type_id = bt.bin_type_id
GROUP BY s.station_id, s.station_name, s.latitude, s.longitude, s.description, s.created_at;

-- View for recycling stations (simplified)
CREATE OR REPLACE VIEW Recycling_Stations AS
SELECT 
    station_id,
    station_name,
    latitude,
    longitude,
    description,
    created_at
FROM STATIONS
ORDER BY station_name;

-- ========== TEST THE UPDATED FUNCTIONALITY ==========

-- Test 1: Get all stations with details
SELECT * FROM Station_Details;

-- Test 2: Find stations with Plastic AND Paper near your location
CALL FindStationsWithMultipleTypes(1.564145, 103.638011, 'Plastic', 'Paper', 1.0);

-- Test 3: Find stations with Plastic, Paper AND Glass
CALL FindStationsWithBinTypes(1.564145, 103.638011, 'Plastic,Paper,Glass', 1.0);

-- Test 4: Get bins by status
CALL GetBinsByStatus('All');

-- Test 5: Get nearby bins
CALL GetNearbyBins(1.564145, 103.638011, 0.5, 'All');

-- Test 6: Test new procedures
SET @station_id = 0;
SET @msg = '';
CALL AddNewStation('Test Station', 1.567000, 103.641000, 'Test description', @station_id, @msg);
SELECT @station_id, @msg;

-- Test 7: Add bin to station
SET @bin_id = 0;
SET @msg = '';
CALL AddBinToStation(1, 1, 'Test Plastic Bin', 'Active', @bin_id, @msg);
SELECT @bin_id, @msg;

-- Test 8: Update bin status
CALL UpdateBinStatus(1, 'Full', @msg);
SELECT @msg;

-- Test 9: Report bin issue
CALL ReportBinIssue(1, 'STU006', 'Full', 'Test issue description', NULL, @issue_id, @msg);
SELECT @issue_id, @msg;

-- Test 10: Show all bins with types and station info
SELECT 
    station_name,
    bin_name,
    type_name,
    status,
    CONCAT(latitude, ', ', longitude) as coordinates
FROM All_Bins_With_Types
ORDER BY station_name, type_name;

-- Test 11: Show recent issues with station info
SELECT * FROM Recent_Issues ORDER BY reported_at DESC;

-- Test 12: Show all recycling stations
SELECT * FROM Recycling_Stations;

-- Show bins near your location with station info
SELECT 
    station_name,
    bin_name,
    type_name,
    status,
    ROUND(6371 * ACOS(
        COS(RADIANS(1.564145)) * COS(RADIANS(latitude)) *
        COS(RADIANS(longitude) - RADIANS(103.638011)) +
        SIN(RADIANS(1.564145)) * SIN(RADIANS(latitude))
    ) * 1000, 0) AS distance_meters
FROM All_Bins_With_Types
HAVING distance_meters <= 500
ORDER BY distance_meters;

-- Test bin statistics
CALL GetBinStatistics();

SELECT * FROM BIN_ISSUES;