-- ============================================
-- SUBSYSTEM 1 MODULE 3 (HOMEPAGE)
-- ============================================

-- Add indexes separately
ALTER TABLE Notification 
ADD INDEX idx_notification_user (userID),
ADD INDEX idx_notification_type (typeID),
ADD INDEX idx_notification_read (isRead),
ADD INDEX idx_notification_created (createdDate),
ADD INDEX idx_notification_user_read (userID, isRead);

SELECT '✅ Indexes added to Notification table!' as Message;

-- Create UserLayoutPreference table
CREATE TABLE IF NOT EXISTS UserLayoutPreference (
    preferenceID INT AUTO_INCREMENT PRIMARY KEY,
    userID VARCHAR(36) NOT NULL UNIQUE, 
    layoutConfig JSON NOT NULL, 
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_userID (userID) 
);


SELECT '✅ UserLayoutPreference table created!' as Message;

-- Add unique constraint
ALTER TABLE UserLayoutPreference 
ADD UNIQUE INDEX idx_user_unique (userID);

SELECT '✅ Unique constraint added to UserLayoutPreference!' as Message;

-- Try adding foreign key to User table
ALTER TABLE Notification 
ADD CONSTRAINT fk_notify_user 
FOREIGN KEY (userID) REFERENCES User(userID) 
ON DELETE CASCADE;

SELECT '✅ Foreign key to User table added!' as Message;

-- Try adding foreign key to NotificationType table
ALTER TABLE Notification 
ADD CONSTRAINT fk_notification_type 
FOREIGN KEY (typeID) REFERENCES NotificationType(typeID) 
ON DELETE CASCADE;

SELECT '✅ Foreign key to NotificationType table added!' as Message;

-- Insert or update notification types
INSERT INTO NotificationType (typeID, typeName, description, icon, color) VALUES
('TYPE001', 'system', 'System notifications', 'bell', 'blue'),
('TYPE002', 'event', 'Event-related notifications', 'calendar', 'green'),
('TYPE003', 'report', 'Report-related notifications', 'file-text', 'orange'),
('TYPE004', 'user', 'User-related notifications', 'users', 'purple'),
('TYPE005', 'campaign', 'Campaign analytics notifications', 'trending-up', 'red')
ON DUPLICATE KEY UPDATE 
    typeName = VALUES(typeName),
    description = VALUES(description);

SELECT '✅ Notification types inserted/updated!' as Message;
SELECT * FROM NotificationType;

-- Insert sample notifications for admin user (U001)
INSERT INTO Notification (notificationID, userID, typeID, title, message, isRead, createdDate) VALUES
('NOTIF001', 'U001', 'TYPE001', 'Welcome to UTM ReMerit Admin', 'Your admin account has been successfully activated.', FALSE, NOW() - INTERVAL 2 DAY),
('NOTIF002', 'U001', 'TYPE002', 'New Event Registration', '5 new students have registered for "Plastic-Free Campus Campaign".', FALSE, NOW() - INTERVAL 1 DAY),
('NOTIF003', 'U001', 'TYPE003', 'Monthly Report Generated', 'January 2025 monthly report has been automatically generated.', FALSE, NOW() - INTERVAL 12 HOUR),
('NOTIF004', 'U001', 'TYPE004', 'New Admin Account Created', 'New admin account has been created for Dr. Ahmad.', TRUE, NOW() - INTERVAL 3 DAY),
('NOTIF005', 'U001', 'TYPE005', 'Campaign Target Achieved', '"Earth Day Recycling Drive 2025" has reached 100% of its goal!', FALSE, NOW() - INTERVAL 6 HOUR)
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    message = VALUES(message);

SELECT '✅ Sample notifications inserted!' as Message;
SELECT COUNT(*) as total_notifications FROM Notification;

