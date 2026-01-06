<!-- ========================= -->
<!-- Yap En Thong -->
<!-- ========================= -->
<h2>Yap En Thong's Contributions</h2>
<table border="1">
  <tr>
    <th>Sprint</th>
    <th>Module Name</th>
    <th>Frontend</th>
    <th>Backend</th>
    <th>Model</th>
  </tr>

  <tr>
    <td>1</td>
    <td>
      Recycling Analytics Module
      <ul>
        <li>My Recycling Performance</li>
        <li>Community Recycling Overview</li>
        <li>Compare Performance</li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%201/Yap%20En%20Thong/App.js">Recycling Analytics Dashboard</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%201/Yap%20En%20Thong/src/screens/CommunityOverviewScreen.js">Community Overview</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%201/Yap%20En%20Thong/src/screens/MyPerformanceScreen.js">My Performance</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%201/Yap%20En%20Thong/src/screens/ComparePerformanceScreen.js">Compare Performance</a></li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%201/Yap%20En%20Thong/backend/server.js">Server (js)</a></li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%201/Yap%20En%20Thong/backend/database.sql">Database Schema & Queries</a></li>
      </ul>
    </td>
  </tr>

  <tr>
    <td>2</td>
    <td>
      <strong>Profile Management Module</strong>
      <ul>
        <li>UC23: View Profile (Student & Admin)</li>
        <li>UC24: Update Profile Information</li>
        <li>UC25: Manage Account Settings</li>
      </ul>
      <strong>Key Features:</strong>
      <ul>
        <li>Real-time data synchronization</li>
        <li>Role-based access control (Student/Admin)</li>
        <li>Profile picture upload (Camera/Gallery)</li>
        <li>Notification preferences management</li>
        <li>Cross-screen event synchronization</li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%202/Yap%20En%20Thong/UTM_ReMerit/src/screens/StudentProfile.js">Student Profile Screen (UC23)</a>
          <ul>
            <li>Profile view with editable fields</li>
            <li>Real-time edit mode toggling</li>
            <li>Profile image picker integration</li>
            <li>Contribution statistics display</li>
            <li>Role-based field edit permissions</li>
          </ul>
        </li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%202/Yap%20En%20Thong/UTM_ReMerit/src/screens/StudentList.js">Student List Screen (Admin)</a>
          <ul>
            <li>Searchable student directory</li>
            <li>Add new student functionality</li>
            <li>Delete student with confirmation</li>
            <li>Navigation to profile/account settings</li>
            <li>Real-time list updates</li>
          </ul>
        </li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%202/Yap%20En%20Thong/UTM_ReMerit/src/screens/ManageAccountSettings.js">Manage Account Settings Screen (UC25)</a>
          <ul>
            <li>Password change functionality</li>
            <li>Notification preferences toggle</li>
            <li>Logout from all devices</li>
            <li>Admin reset capabilities</li>
            <li>AsyncStorage persistence</li>
          </ul>
        </li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%202/Yap%20En%20Thong/UTM_ReMerit/src/services/api.js">API Service Layer</a>
          <ul>
            <li>Global data store for real-time sync</li>
            <li>Error handling with fallback data</li>
            <li>DeviceEventEmitter integration</li>
            <li>Unified API client</li>
            <li>Validation utilities</li>
          </ul>
        </li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%202/Yap%20En%20Thong/UTM_ReMerit/App.js">Main App Navigation</a>
          <ul>
            <li>Stack navigation setup</li>
            <li>Screen routing configuration</li>
            <li>Role-based navigation flow</li>
          </ul>
        </li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%202/Yap%20En%20Thong/UTM_ReMerit/backend/server.js">Express.js Backend Server</a>
          <ul>
            <li>16 API endpoints for profile management</li>
            <li>Transaction-based updates</li>
            <li>Input validation middleware</li>
            <li>Stored procedure integration</li>
            <li>Error handling with fallback SQL</li>
          </ul>
        </li>
        <li><strong>API Endpoints Implemented:</strong>
          <ul>
            <li>GET /api/profile/:userId - View profile</li>
            <li>PUT /api/profile/:userId - Update profile</li>
            <li>GET /api/students - List all students (Admin)</li>
            <li>POST /api/students - Add new student</li>
            <li>DELETE /api/student/:userId - Delete student</li>
            <li>GET/PUT /api/account/:userId/notifications - Notification preferences</li>
            <li>PUT /api/account/:userId/password - Change password</li>
            <li>POST /api/account/:userId/reset-all - Reset all settings</li>
            <li>GET /api/health - Health check</li>
          </ul>
        </li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%202/Yap%20En%20Thong/UTM_ReMerit/backend/utm_remerit.sql">Complete Database Schema</a>
          <ul>
            <li>7 core tables (User, Student, Admin, etc.)</li>
            <li>2 comprehensive views (StudentProfileView, UserAccountSettings)</li>
            <li>3 stored procedures with fallback logic</li>
            <li>Database triggers for automation</li>
            <li>10+ demo users with realistic data</li>
          </ul>
        </li>
        <li><strong>Database Features:</strong>
          <ul>
            <li>Role-based user management</li>
            <li>Notification preference tracking</li>
            <li>Session management system</li>
            <li>Password history tracking</li>
            <li>UTMID format validation rules</li>
            <li>Default settings configuration</li>
          </ul>
        </li>
        <li><strong>Technical Implementation:</strong>
          <ul>
            <li>CASCADE delete constraints</li>
            <li>Comprehensive indexing</li>
            <li>Data type optimization</li>
            <li>Stored procedure error handling</li>
            <li>View-based data abstraction</li>
          </ul>
        </li>
      </ul>
    </td>
  </tr>
  
  <tr>
    <td>3</td>
    <td>
      Leaderboard and Reward Module (Campaigns & Events Subsystem)
      <ul>
        <li>UC35: View Weekly Leaderboard</li>
        <li>UC36: Manage Reward Points</li>
        <li>UC37: Admin - Approve/Reject Merit Conversions</li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/App.js">Main Application Entry & Navigation</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/src/screens/LeaderboardScreen.js">Leaderboard Screen (UC35)</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/src/screens/RewardPointsScreen.js">Reward Points Screen (UC36)</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/src/screens/ManageConversionsScreen.js">Manage Conversions Screen (UC37)</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/src/context/AppContext.js">Global State Management (Context API)</a></li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/backend/server.js">Express.js REST API Server</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/backend/package.json">Backend Dependencies & Configuration</a></li>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/tree/main/Sprint%203/Yap%20En%20Thong/backend/routes/">API Routes:
          <ul>
            <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/backend/routes/leaderboardRoutes.js">Leaderboard Routes</a></li>
            <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/backend/routes/rewardRoutes.js">Reward Routes</a></li>
            <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/backend/routes/conversionRoutes.js">Conversion Routes</a></li>
          </ul>
        </a></li>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="https://github.com/cheng-jiayi/SECJ3104-AD-Section2-GroupHappy/blob/main/Sprint%203/Yap%20En%20Thong/backend/database.sql">Database Schema for Leaderboard & Reward System</a></li>
      </ul>
    </td>
  </tr>
  
  <tr>
    <td>4</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
  
  <tr>
    <td>5</td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
  </tr>
</table>
