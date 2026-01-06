# UTM ReMerit: Profile Management Module

A React Native mobile application for managing student profiles and account settings as part of the UTM ReMerit System's Profile Management Subsystem.

## 📱 Features

### Profile Management Features (UC23-UC25)
- **UC23: View Profile** - View detailed profile information including personal details, contact information, and academic data
- **UC24: Update Profile Information** - Edit profile details with real-time synchronization
- **UC25: Manage Account Settings** - Configure notification preferences and security settings

### Core Capabilities
- **Student Self-Service** - Students can view and update their own profiles
- **Admin Management** - Administrators can manage all student profiles
- **Real-time Sync** - Changes reflect immediately across all views
- **Role-Based Access Control** - Different permissions for students and admins
- **Image Upload** - Profile picture management with camera/gallery support

## 🛠️ Tech Stack

### Frontend (React Native)
- React Native 0.72+
- React Navigation 6.x
- React Native Image Picker
- Async Storage for local data persistence
- Axios for API communication

### Backend (Node.js/Express)
- Express.js 4.x
- MySQL2 database connector
- CORS & Body Parser middleware
- Stored procedures for complex operations

### Database (MySQL)
- Structured relational database
- Views for complex queries
- Stored procedures for business logic
- Triggers for automated actions

## 📋 Prerequisites

### System Requirements
- Node.js 14+
- npm 6+
- React Native CLI
- MySQL 5.7+
- Android Studio (for Android emulator)

### Mobile Development Setup
- Java Development Kit (JDK) 11+
- Android SDK (API level 28+)
- Android device/emulator
- ADB (Android Debug Bridge)

## 🚀 Installation & Setup

### 1. Database Setup
```sql
-- Navigate to your MySQL directory
mysql -u root -p

-- Create and use the database
DROP DATABASE IF EXISTS utm_remerit;
CREATE DATABASE utm_remerit;
USE utm_remerit;

-- Run the complete database script
-- Copy and paste the entire SQL from utm_remerit.sql
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment (if needed)
# Create .env file with:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=yourpassword
# DB_NAME=utm_remerit

# Start the backend server
npm start
```
Server will run at: http://localhost:5000

### 3. Frontend Setup
```bash
# Navigate to project root
cd UTM_ReMerit

# Install dependencies
npm install

# Install React Native dependencies
npx react-native run-android
# This will install remaining Android dependencies
```

## ▶️ Running the Application

### Option 1: Complete Setup (Recommended)
```bash
# Terminal 1: Start Backend Server
cd backend
npm start

# Terminal 2: Setup ADB Reverse Proxy
cd UTM_ReMerit
adb reverse tcp:5000 tcp:5000

# Terminal 3: Start React Native App
npx react-native start --reset-cache

# Terminal 4: Run on Android (new terminal)
npx react-native run-android
```

### Option 2: Quick Start Script
```bash
# Windows (Command Prompt or PowerShell)
cd backend && start npm start
cd ..\UTM_ReMerit && adb reverse tcp:5000 tcp:5000
npx react-native run-android

# Mac/Linux
cd backend && npm start &
cd ../UTM_ReMerit && adb reverse tcp:5000 tcp:5000
npx react-native run-android
```

### Option 3: Demo Mode (No Backend Required)
The application includes fallback demo data:
- Start only React Native app
- All features work with local data
- Real-time sync simulated locally

## 📱 Application Structure
```
UTM_ReMerit/
├── src/
│   ├── screens/
│   │   ├── StudentProfile.js        # UC23: View Profile
│   │   ├── StudentList.js           # Admin student management
│   │   └── ManageAccountSettings.js # UC25: Account Settings
│   ├── services/
│   │   └── api.js                   # API service with global data store
│   └── components/                  # Reusable UI components
├── backend/
│   ├── server.js                    # Express API server
│   └── database/
│       └── utm_remerit.sql          # Complete database schema
└── App.js                           # Main application entry
```

## 🔧 Database Schema Highlights

### Core Tables
- **User** - User accounts and authentication
- **Student** - Student-specific information
- **Admin** - Administrator accounts
- **UserNotificationSettings** - Notification preferences
- **UserSessions** - Active user sessions
- **PasswordHistory** - Password change tracking

### Views
- **StudentProfileView** - Comprehensive student profile data
- **UserAccountSettings** - Combined user and settings data

### Stored Procedures
- `UpdateNotificationPreferences()` - Update user notification settings
- `LogoutUserFromAllDevices()` - Logout user from all sessions
- `ResetUserSettingsToDefault()` - Reset all user settings

## ⚙️ Configuration

### Backend Configuration
Default configuration in `server.js`:
```javascript
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Empty by default
  database: 'utm_remerit',
  port: 3306
});
```

### App Configuration
Default user IDs:
- Admin: `ADM001`, `ADM002`, `ADM003`
- Main Student: `U022` (Ali bin Raj)

## 🧪 Testing Credentials

### Student Access
- **Student ID:** U022 (Ali bin Raj)
- **Default Password:** password123
- **Matric No:** A23EN0001

### Admin Access
- **Admin ID:** ADM001 (Dr. Sarah Lim)
- **Default Password:** password123
- Can view and manage all student profiles

## 🔄 Real-time Sync Features

### Cross-Screen Synchronization
- Profile updates reflect immediately in all views
- Notification preference changes sync instantly
- Device Event Emitter for real-time communication

### Data Persistence
- AsyncStorage for local data caching
- Global data store for immediate updates
- Fallback to demo data when backend unavailable

## 🚨 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   ```bash
   # Check if backend is running
   curl http://localhost:5000/api/health
   # Should return: {"status":"healthy","database":"connected"}
   ```

2. **ADB Reverse Proxy Error**
   ```bash
   # Check if device is connected
   adb devices
   # List should show your device
   
   # Set up reverse proxy
   adb reverse tcp:5000 tcp:5000
   ```

3. **React Native Cache Issues**
   ```bash
   # Clear cache and rebuild
   npx react-native start --reset-cache
   cd android && ./gradlew clean
   ```

4. **Port Already in Use**
   ```bash
   # Find and kill process on port 5000
   # Windows:
   netstat -ano | findstr :5000
   taskkill /PID [PID] /F
   
   # Mac/Linux:
   lsof -ti:5000 | xargs kill
   ```

5. **MySQL Connection Issues**
   ```sql
   -- Verify MySQL is running
   mysql -u root -p
   
   -- Check if database exists
   SHOW DATABASES;
   USE utm_remerit;
   SHOW TABLES;
   ```

### Error Messages & Solutions

| Error | Solution |
|-------|----------|
| "Database connection failed" | Check MySQL service is running |
| "Metro server not running" | Run `npx react-native start` |
| "Backend unavailable" | Start backend server first |
| "Device not found" | Connect device or start emulator |
| "Module not found" | Run `npm install` |

## 📊 API Documentation

### Profile Management Endpoints

#### UC23: View Profile
```http
GET /api/profile/:userId
```
**Response:**
```json
{
  "userID": "U022",
  "fullName": "Ali bin Ahmad",
  "utmID": "A23EN0001",
  "email": "ali.ahmad@graduate.utm.my",
  "matricNo": "A23EN0001",
  "faculty": "FKE",
  "totalPoints": 1500,
  "totalMerits": 120,
  "totalItemsRecycled": 45,
  "totalWeightRecycled": 67.5
}
```

#### UC24: Update Profile
```http
PUT /api/profile/:userId
```
**Request Body:**
```json
{
  "email": "new.email@graduate.utm.my",
  "contactNumber": "011-23456789",
  "address": "New Address"
}
```

#### UC25: Account Settings
```http
GET /api/account/:userId/settings
PUT /api/account/:userId/notifications
PUT /api/account/:userId/password
POST /api/account/:userId/reset-all
```

## 📱 Screens Overview

### 1. Student Profile Screen (UC23)
- Personal details display
- Contact information
- Academic information
- Account status
- Profile picture with upload capability

### 2. Student List Screen (Admin Only)
- Browse all student profiles
- Search and filter functionality
- Add new students
- Delete student profiles
- Quick navigation to individual profiles

### 3. Account Settings Screen (UC25)
- Change password functionality
- Notification preferences management
- Logout from all devices
- Reset all settings (admin only)
- Current password display (admin only)

## 🔒 Security Features

### Role-Based Access Control
- **Students:** Can only view/edit their own profile
- **Admins:** Can view/edit all profiles and manage settings

### Data Validation
- Email format validation
- Phone number validation
- Matric number format validation
- Password strength requirements

### Session Management
- Track active sessions
- Logout from all devices feature
- Session timeout handling

## 📈 Performance Features

### Optimization Techniques
- Lazy loading for lists
- Image optimization
- Efficient state management
- Database indexing for queries
- AsyncStorage caching

### Real-time Updates
- DeviceEventEmitter for cross-screen communication
- Global data store for immediate updates
- Pull-to-refresh on all screens
- Auto-refresh on screen focus

## 🎯 Use Case Implementation

### UC23: View Profile
- Role-appropriate data display
- Contribution statistics
- Account status indicators
- Member since information

### UC24: Update Profile Information
- Editable fields based on role
- Real-time validation
- Image upload support
- Transaction-based updates

### UC25: Manage Account Settings
- Password change with verification
- Notification preference toggles
- Session management
- Admin override capabilities

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
1. Check troubleshooting section above
2. Verify MySQL and backend are running
3. Clear React Native cache if needed
4. Reinstall node_modules if issues persist

---

**Note:** This is a prototype system. Production deployment requires additional security measures, error handling improvements, and database optimizations.

**Last Updated:** January 2024  
**Version:** 2.0.0  
**System:** UTM ReMerit Profile Management Subsystem  
**Module:** Profile Management (UC23, UC24, UC25)
