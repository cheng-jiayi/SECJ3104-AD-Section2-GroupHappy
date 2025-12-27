## UTM ReMerit - Installation & Setup

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- React Native CLI
- MySQL Database
- Java JDK 11+ (for Android)
- Android Studio & SDK (for Android)

### Backend Setup (Server) INSIDE terminal cd UTM_ReMerit/backend, you can straight npm install dependency, later cd.., remember to gradlew clean later on
1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install express mysql2 cors
   ```

3. **Setup MySQL Database**:
   - Run the SQL script in `database_setup.sql` to create database and tables
   - Update `server.js` with your MySQL credentials if needed

4. **Start the server**:
   ```bash
   node server.js
   ```
   Server runs on: `http://localhost:5000`

### Frontend Setup (React Native App)
1. **Navigate to project root**:
   ```bash
   cd UTM_ReMerit
   ```

2. **Install required dependencies**:
   ```bash
   # Charts and data visualization
   npm install react-native-chart-kit
   npm install react-native-svg
   
   # API communication
   npm install axios
   
   # Icons and UI components
   npm install react-native-vector-icons
   npx react-native link react-native-vector-icons
   
   # Navigation
   npm install @react-navigation/native
   npm install @react-navigation/stack
   npm install react-native-screens react-native-safe-area-context
   ```

3. **Clean Gradle cache (CRITICAL for Android)**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

4. **Install iOS dependencies (if on macOS)**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

5. **Start the app**:
   ```bash
   # For Android
   npx react-native run-android
   
   # For iOS
   npx react-native run-ios
   ```

### Port Forwarding (For Android Emulator)
Since the React Native app runs on the emulator and the server runs on localhost, you need to forward the port:

```bash
adb reverse tcp:5000 tcp:5000
```

### Common Issues & Fixes

#### **Android Build Issues**
```bash
# 1. Clean build
cd android
./gradlew clean

# 2. Clear cache
cd ..
npx react-native start --reset-cache

# 3. Rebuild
npx react-native run-android
```

#### **iOS Build Issues**
```bash
cd ios
pod deintegrate
pod install
cd ..
npx react-native run-ios
```

### Project Structure
```
UTM_ReMerit/
├── src/
│   ├── screens/          # App screens
│   ├── services/         # API services
│   └── media/           # Images and assets
├── android/             # Android build files
├── ios/                 # iOS build files
├── server/
│   ├── server.js        # Express API server
│   └── database_setup.sql
└── package.json
```

### Quick Start Commands
```bash
# Complete setup sequence
cd UTM_ReMerit
npm install
cd android && ./gradlew clean && cd ..
adb reverse tcp:5000 tcp:5000

# In separate terminal - start backend
cd server
npm install
node server.js

# In first terminal - start app
npx react-native run-android
```

### Notes
- Always run `./gradlew clean` after installing new dependencies
- Default API endpoint: `http://localhost:5000/api`
- Default demo user ID: `1` (Ali bin Ahmad from FKE faculty)
- If you see "unable to load script" error, run metro bundler manually:
  ```bash
  npx react-native start
  ```

### Development Tips
1. **Hot Reloading**: Enable in emulator with `Ctrl+M` → "Enable Hot Reloading"
2. **Debugging**: `Ctrl+M` → "Debug" opens Chrome DevTools
3. **Database Reset**: Re-run SQL script if data gets corrupted
4. **Server Restart**: Restart server after modifying `server.js`
