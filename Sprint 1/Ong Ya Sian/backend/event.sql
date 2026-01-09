CREATE DATABASE IF NOT EXISTS EventApp;
USE EventApp;

CREATE TABLE Administrator (
    adminID INT AUTO_INCREMENT PRIMARY KEY,
    adminName VARCHAR(255) NOT NULL,
    adminEmail VARCHAR(255) NOT NULL UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Administrator (adminName, adminEmail) 
VALUES ('Admin One', 'admin1@utm.my'),
       ('Admin Two', 'admin2@utm.my');

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
    createdBy INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES Administrator(adminID)
);

INSERT INTO Event (
    eventTitle, eventDescription, eventCategory, eventStartDate, eventEndDate, rewardPoints, UTMMeritPoints, createdBy
) VALUES (
    'Campus Clean-Up', 'A cleanup drive to improve campus environment.', 'Clean-Up', '2025-12-01', '2025-12-10', 50, 5, 1
), (
    'Recycling Workshop', 'Learn how to recycle effectively.', 'Workshop', '2025-12-15', '2025-12-15', 30, 3, 1
);


SHOW TABLES;


SELECT * FROM Administrator;
SELECT * FROM Event;
