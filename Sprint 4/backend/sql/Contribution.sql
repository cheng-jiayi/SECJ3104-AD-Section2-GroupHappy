USE utm_remerit;

-- ============================================
-- TABLE: Contribution
-- ============================================
CREATE TABLE contribution (
    contributionID INT AUTO_INCREMENT PRIMARY KEY,
    studentID VARCHAR(20) NOT NULL,
    eventID INT NOT NULL,
    recyclingTransactionID INT NOT NULL,
    stationID INT NOT NULL,
    pointsEarned INT DEFAULT 0,
    contributionDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_contrib_student FOREIGN KEY (studentID) REFERENCES Student(studentID) ON DELETE CASCADE,
    CONSTRAINT fk_contrib_event FOREIGN KEY (eventID) REFERENCES Event(eventID) ON DELETE CASCADE,
    CONSTRAINT fk_contrib_recycling FOREIGN KEY (recyclingTransactionID) REFERENCES recycling_transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_contrib_station FOREIGN KEY (stationID) REFERENCES STATIONS(station_id) ON DELETE CASCADE,

    INDEX idx_contrib_student (studentID),
    INDEX idx_contrib_event (eventID),
    INDEX idx_contrib_recycling (recyclingTransactionID),
    INDEX idx_contrib_station (stationID),
    INDEX idx_contrib_date (contributionDate)
);

SELECT * FROM contribution;