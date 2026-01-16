CREATE TABLE IF NOT EXISTS NotificationType (
    typeID VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    typeName VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    icon VARCHAR(50),
    color VARCHAR(20),
    isActive BOOLEAN DEFAULT TRUE,
    createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_notification_type_name (typeName),
    INDEX idx_notification_type_active (isActive)
);

CREATE TABLE IF NOT EXISTS Notification (
    notificationID VARCHAR(50) PRIMARY KEY,
    userID VARCHAR(36) NOT NULL,
    typeID VARCHAR(36) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON,
    isRead BOOLEAN DEFAULT FALSE,
    createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    readDate TIMESTAMP NULL
);

ALTER TABLE Notification 
ADD INDEX idx_notification_user (userID),
ADD INDEX idx_notification_type (typeID),
ADD INDEX idx_notification_read (isRead),
ADD INDEX idx_notification_created (createdDate),
ADD INDEX idx_notification_user_read (userID, isRead);

INSERT INTO NotificationType (typeID, typeName, description, icon, color) VALUES
('TYPE001', 'system', 'System notifications', 'bell', 'blue'),
('TYPE002', 'event', 'Event-related notifications', 'calendar', 'green'),
('TYPE003', 'report', 'Report-related notifications', 'file-text', 'orange'),
('TYPE004', 'user', 'User-related notifications', 'users', 'purple'),
('TYPE005', 'campaign', 'Campaign analytics notifications', 'trending-up', 'red')
ON DUPLICATE KEY UPDATE 
    typeName = VALUES(typeName),
    description = VALUES(description);

INSERT INTO Notification (notificationID, userID, typeID, title, message, isRead, createdDate) VALUES
('NOTIF001', 'U001', 'TYPE001', 'Welcome to UTM ReMerit Admin', 'Your admin account has been successfully activated.', FALSE, NOW() - INTERVAL 2 DAY),
('NOTIF002', 'U001', 'TYPE002', 'New Event Registration', '5 new students have registered for "Plastic-Free Campus Campaign".', FALSE, NOW() - INTERVAL 1 DAY),
('NOTIF003', 'U001', 'TYPE003', 'Monthly Report Generated', 'January 2025 monthly report has been automatically generated.', FALSE, NOW() - INTERVAL 12 HOUR),
('NOTIF004', 'U001', 'TYPE004', 'New Admin Account Created', 'New admin account has been created for Dr. Ahmad.', TRUE, NOW() - INTERVAL 3 DAY),
('NOTIF005', 'U001', 'TYPE005', 'Campaign Target Achieved', '"Earth Day Recycling Drive 2025" has reached 100% of its goal!', FALSE, NOW() - INTERVAL 6 HOUR)
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    message = VALUES(message);

ALTER TABLE Notification 
ADD COLUMN eventID INT NULL AFTER typeID,
ADD COLUMN reportID INT NULL AFTER eventID,
ADD COLUMN action VARCHAR(50) NULL AFTER metadata,
ADD COLUMN expiresAt TIMESTAMP NULL AFTER readDate,
ADD INDEX idx_notification_event (eventID),
ADD INDEX idx_notification_report (reportID),
ADD INDEX idx_notification_action (action),
ADD CONSTRAINT fk_notification_event FOREIGN KEY (eventID) REFERENCES Event(eventID) ON DELETE CASCADE,
ADD CONSTRAINT fk_notification_report FOREIGN KEY (reportID) REFERENCES AnalyticsReport(reportID) ON DELETE CASCADE;
