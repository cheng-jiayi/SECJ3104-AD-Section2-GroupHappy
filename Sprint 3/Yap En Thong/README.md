# UTM ReMerit: Leaderboard and Reward Module

A React Native mobile application for managing leaderboards, reward points, and merit conversions as part of the UTM ReMerit Campaigns and Events Subsystem.

## 📱 Features

### User Features (UC35-UC37)
- **UC35: View Weekly Leaderboard** - Check rankings and standings with Hall of Fame
- **UC36: Manage Reward Points** - View points, convert to merits, track event participation
- **UC37: Admin Conversions** - Approve/reject merit conversion requests

### Core Modules
1. **Leaderboard System** - Real-time rankings with timer reset countdown
2. **Reward Points Dashboard** - Point tracking and conversion interface
3. **Admin Conversion Management** - Bulk approval/rejection system

## 🛠️ Tech Stack

### Frontend (React Native)
- React Native 0.72+
- React Navigation 6.x
- React Context API for state management
- Axios for API calls

### Backend (Node.js/Express)
- Express.js 4.x
- MySQL2 for database
- CORS & Body Parser middleware
- Nodemon for development

## 📋 Prerequisites

### System Requirements
- Node.js 14+
- npm 6+
- React Native CLI
- Android Studio (for Android emulator)
- MySQL 5.7+ (for full backend functionality)

### Mobile Development Setup
- Java Development Kit (JDK) 11+
- Android SDK
- Android device/emulator with API level 28+

## 🚀 Installation & Setup

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Initialize and install dependencies**
   ```bash
   npm init -y
   npm install express mysql2 cors body-parser dotenv
   npm install nodemon --save-dev
   ```

3. **Configure environment**
   - Copy `.env.example` to `.env` (if exists)
   - Set up database credentials:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=yourpassword
     DB_NAME=utm_remerit
     SERVER_PORT=5000
     ```

4. **Run backend server**
   ```bash
   npm install
   npm run dev
   ```
   Server will start at: `http://localhost:5000`

### Frontend Setup

1. **Navigate to project root**
   ```bash
   cd UTM_ReMerit
   ```

2. **Install dependencies**
   ```bash
   npm install axios
   npm install @react-native-community/slider
   npm install @react-navigation/native @react-navigation/native-stack
   ```

3. **Additional React Native dependencies**
   ```bash
   npx react-native run-android
   # This will install remaining dependencies
   ```

## ▶️ Running the Application

### Option 1: With Real Backend (Recommended)

1. **Start backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start React Native app**
   ```bash
   cd UTM_ReMerit
   
   # For physical device with ADB reverse proxy
   adb reverse tcp:5000 tcp:5000
   
   # For emulator
   # Use localhost:5000 directly
   
   # Clear cache and run
   npx react-native start --reset-cache
   # In another terminal:
   npx react-native run-android
   ```

### Option 2: Demo Mode (No Backend)

The app works with demo data if backend is unavailable:
- Start only the React Native app
- App will automatically use fallback data
- All features work except real-time updates

### Quick Start Script
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: React Native (new window)
cd UTM_ReMerit && adb reverse tcp:5000 tcp:5000
npx react-native run-android
```

## 📱 Application Structure

```
UTM_ReMerit/
├── src/
│   ├── screens/
│   │   ├── LeaderboardScreen.js     # UC35: Weekly rankings
│   │   ├── RewardPointsScreen.js    # UC36: Points management
│   │   └── ManageConversionsScreen.js # UC37: Admin panel
│   ├── context/
│   │   └── AppContext.js           # Global state management
│   └── components/                 # Reusable components
├── backend/
│   ├── server.js                   # Express server
│   ├── routes/
│   │   ├── leaderboardRoutes.js
│   │   ├── rewardRoutes.js
│   │   └── conversionRoutes.js
│   └── database.sql               # Database schema
└── App.js                         # Main application entry
```

## 🔧 Database Setup

1. **Create MySQL database**
   ```sql
   CREATE DATABASE utm_remerit;
   USE utm_remerit;
   ```

2. **Import schema** (see `backend/database/schema.sql`)
   ```sql
   -- Users table
   CREATE TABLE users (
       id INT PRIMARY KEY AUTO_INCREMENT,
       utm_id VARCHAR(20) UNIQUE,
       name VARCHAR(100),
       total_points INT DEFAULT 0,
       merit_points DECIMAL(10,2) DEFAULT 0,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Leaderboard table
   CREATE TABLE weekly_leaderboard (
       id INT PRIMARY KEY AUTO_INCREMENT,
       user_id INT,
       week_number INT,
       weekly_points INT DEFAULT 0,
       rank INT,
       FOREIGN KEY (user_id) REFERENCES users(id)
   );
   
   -- Conversion requests
   CREATE TABLE conversion_requests (
       id INT PRIMARY KEY AUTO_INCREMENT,
       user_id INT,
       reward_points INT,
       merit_points DECIMAL(10,2),
       status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
       request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       processed_date TIMESTAMP NULL,
       reason TEXT,
       FOREIGN KEY (user_id) REFERENCES users(id)
   );
   ```

## ⚙️ Configuration

### Backend Configuration
Edit `backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=utm_remerit
SERVER_PORT=5000
JWT_SECRET=your_jwt_secret_here
```

### App Configuration
- Default conversion rate: 100 RP = 1 MP
- Minimum conversion: 100 RP
- Leaderboard reset: Weekly (configurable)

## 🧪 Testing

### Backend API Endpoints
```
GET    /api/health              # Health check
GET    /api/leaderboard/weekly  # Get weekly leaderboard
GET    /api/rewards/user/:id    # Get user rewards
POST   /api/conversions/request # Submit conversion
PUT    /api/conversions/approve # Admin approval
```

### Test Data
The app includes demo data for testing:
- 10 sample users with points
- Sample conversion requests
- Event participation data

## 🔄 Auto-Refresh Features

The application includes real-time updates:
- **Pull-to-refresh** on all screens
- **Auto-refresh** when screens come into focus
- **Backend connection monitoring**
- **Data synchronization** between admin and user views

## 🚨 Troubleshooting

### Common Issues

1. **Backend connection failed**
   ```
   Solution: Check if backend is running on port 5000
   Command: curl http://localhost:5000/api/health
   ```

2. **ADB reverse proxy error**
   ```
   Solution: Ensure device is connected
   Command: adb devices
   Command: adb reverse tcp:5000 tcp:5000
   ```

3. **React Native cache issues**
   ```
   Solution: Clear cache and rebuild
   Command: npx react-native start --reset-cache
   Command: cd android && ./gradlew clean
   ```

4. **Port already in use**
   ```
   Solution: Kill process on port 5000
   Command (Linux/Mac): lsof -ti:5000 | xargs kill
   Command (Windows): netstat -ano | findstr :5000
   ```

### Error Messages

| Error | Solution |
|-------|----------|
| "Metro server not running" | Run `npx react-native start` |
| "Backend unavailable" | Start backend server first |
| "Device not found" | Connect device or start emulator |
| "Module not found" | Run `npm install` |

## 📊 API Documentation

### Leaderboard Endpoints
```javascript
// Get weekly leaderboard
GET /api/leaderboard/weekly

// Response:
{
  "success": true,
  "data": [
    {
      "utmID": "A23EN0001",
      "name": "Ahmad Ali",
      "weeklyPoints": 450,
      "totalPoints": 5200,
      "rank": 1
    }
  ]
}
```

### Reward Points Endpoints
```javascript
// Get user points
GET /api/rewards/user/:utmID

// Submit conversion request
POST /api/conversions/request
Body: { "utmID": "A23EN0001", "rewardPoints": 100 }
```

## 📱 Screens Overview

### 1. Main Menu
- Module selection
- System status
- Backend connection indicator

### 2. Leaderboard Screen (UC35)
- Hall of Fame (top 3)
- Weekly rankings
- Conversion status
- Timer for weekly reset

### 3. Reward Points Screen (UC36)
- Points dashboard
- Conversion interface
- Event participation tracking
- Conversion history

### 4. Manage Conversions Screen (UC37)
- Pending requests list
- Bulk approval/rejection
- Conversion history
- System settings

## 🔒 Security Notes

- Demo mode uses in-memory data only
- Production requires backend authentication
- Database credentials should be secured
- Use HTTPS in production

## 📈 Performance Optimization

- Image optimization for mobile
- Lazy loading for lists
- Efficient state updates
- Database indexing for queries

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## 📄 License

This project is part of UTM ReMerit System for educational purposes.

## 📞 Support

For issues and questions:
1. Check troubleshooting section
2. Verify backend is running
3. Clear React Native cache
4. Reinstall node_modules if needed

---

**Note**: This is a prototype system. Production deployment requires additional security, error handling, and database optimizations.

**Last Updated**: January 2024
**Version**: 1.0.0
**System**: UTM ReMerit Campaigns & Events Subsystem
