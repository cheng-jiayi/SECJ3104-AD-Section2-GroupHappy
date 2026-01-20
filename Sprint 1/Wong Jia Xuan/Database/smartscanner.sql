CREATE TABLE MaterialType (
    materialID INT PRIMARY KEY AUTO_INCREMENT,
    materialName VARCHAR(50) NOT NULL UNIQUE,
    materialClass VARCHAR(50) NOT NULL,
    recyclable BOOLEAN DEFAULT TRUE,
    measurementUnit ENUM('units', 'kg') DEFAULT 'units',
    pointsPerUnit INT DEFAULT 0,
    pointsPerKg INT DEFAULT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO MaterialType (materialName, materialClass, recyclable, measurementUnit, pointsPerUnit, pointsPerKg) VALUES
('paper', 'Paper', TRUE, 'kg', NULL, 5),     
('plastic', 'Plastic', TRUE, 'units', 4, NULL),  
('glass', 'Glass', TRUE, 'units', 5, NULL),     
('metal', 'Metal', TRUE, 'units', 8, NULL); 

CREATE TABLE Scan (
    scanID INT PRIMARY KEY AUTO_INCREMENT,
    userID VARCHAR(36) NOT NULL,
    totalItems INT DEFAULT 0,
    totalWeight DECIMAL(10,2) DEFAULT 0.00,
    totalPoints INT DEFAULT 0,
    scanMethod ENUM('camera', 'gallery', 'manual', 'ai') DEFAULT 'camera',
    scanAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploadStatus ENUM('pending', 'uploaded', 'failed', 'saved') DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_scan_user (userID),
    INDEX idx_scan_date (scanAt DESC),
    INDEX idx_scan_status (uploadStatus)
);

CREATE TABLE recycling_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userID VARCHAR(36) NOT NULL,
    scanID INT NOT NULL,
    materialID INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    points_earned INT NOT NULL,
    weight DECIMAL(10,2) DEFAULT 0.00,
    scanID INT,
    location VARCHAR(100),
    transaction_date DATE NOT NULL,
    confidence FLOAT DEFAULT 0.0,
    manual_entry BOOLEAN DEFAULT FALSE,
    ai_detected BOOLEAN DEFAULT TRUE,
    corrected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    FOREIGN KEY (scanID) REFERENCES Scan(scanID) ON DELETE SET NULL,
    
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_user_date (userID, transaction_date),
    INDEX idx_material_type (material_type),
    INDEX idx_scan_method (scan_method),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

CREATE TABLE UploadedImage (
    imageID INT PRIMARY KEY AUTO_INCREMENT,
    scanID INT NOT NULL,
    userID VARCHAR(36) NOT NULL,
    imagePath VARCHAR(255) NOT NULL,
    imageType ENUM('scan', 'training', 'verification') DEFAULT 'scan',
    uploadAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    annotationStatus BOOLEAN DEFAULT FALSE,
    aiConfidence FLOAT DEFAULT 0.0,
    aiDetectedClasses JSON,
    FOREIGN KEY (scanID) REFERENCES Scan(scanID) ON DELETE CASCADE,
    FOREIGN KEY (userID) REFERENCES User(userID) ON DELETE CASCADE,
    INDEX idx_image_scan (scanID),
    INDEX idx_image_user (userID),
    INDEX idx_image_date (uploadAt)
);
