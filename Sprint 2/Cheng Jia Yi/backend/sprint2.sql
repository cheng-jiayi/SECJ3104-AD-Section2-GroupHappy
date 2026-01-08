-- =========================
-- TABLE: users
-- =========================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'student') NOT NULL
);

-- =========================
-- TABLE: event
-- =========================
CREATE TABLE `event` (
    eventID INT AUTO_INCREMENT PRIMARY KEY,
    eventTitle VARCHAR(255) NOT NULL,
    eventDescription TEXT,
    eventCategory VARCHAR(100),
    eventStartDate DATE,
    eventEndDate DATE,
    rewardPoints INT,
    UTMMeritPoints INT,
    eventImageURL VARCHAR(500),
    status ENUM('Upcoming', 'Ongoing', 'Completed') NOT NULL,
    createdBy INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (createdBy) REFERENCES users(id)
);

-- =========================
-- TABLE: participation
-- =========================
CREATE TABLE participation (
    participationID INT AUTO_INCREMENT PRIMARY KEY,
    studentID INT NOT NULL,
    eventID INT NOT NULL,
    registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    participationStatus ENUM('Registered', 'Attended', 'Completed', 'Cancelled') NOT NULL,
    rewardPointsEarned INT DEFAULT 0,
    meritPointsAwarded INT DEFAULT 0,
    attendanceVerifiedBy INT NULL,
    verificationDate TIMESTAMP NULL,

    FOREIGN KEY (studentID) REFERENCES users(id),
    FOREIGN KEY (eventID) REFERENCES `event`(eventID),
    FOREIGN KEY (attendanceVerifiedBy) REFERENCES users(id)
);

-- =========================
-- INSERT DATA: event
-- =========================
INSERT INTO `event` (
    eventID,
    eventTitle,
    eventDescription,
    eventCategory,
    eventStartDate,
    eventEndDate,
    rewardPoints,
    UTMMeritPoints,
    eventImageURL,
    status,
    createdBy,
    createdAt,
    updatedAt
) VALUES
(4, 'Campus Clean-Up',
 'Join us in cleaning our campus compound.',
 'Volunteer',
 '2026-02-15',
 '2026-02-15',
 10,
 2,
 'https://picsum.photos/400/200?random=1',
 'Upcoming',
 NULL,
 '2025-12-16 21:23:19',
 '2025-12-16 21:23:19'),

(5, 'Blood Donation Drive',
 'Donate blood and save lives.',
 'Health',
 '2026-03-01',
 '2026-03-01',
 20,
 5,
 'https://picsum.photos/400/200?random=2',
 'Upcoming',
 NULL,
 '2025-12-16 21:23:19',
 '2025-12-16 21:23:19'),

(6, 'UTM Run 2026',
 'A 5KM charity run inside UTM campus.',
 'Sports',
 '2026-03-15',
 '2026-03-15',
 50,
 10,
 'https://picsum.photos/400/250?random=3',
 'Upcoming',
 NULL,
 '2025-12-16 21:23:19',
 '2025-12-16 21:23:19');
