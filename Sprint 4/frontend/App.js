import React, { useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  ActivityIndicator,
  View,
  StyleSheet,
  Text,
  Alert,
  LogBox,
  Button,
  TouchableOpacity
} from 'react-native';
import axios from 'axios';

// Subsystem 1 Module 1 - User Management Screens
import LoginScreen from './src/userManagement/LoginScreen';
import RegistrationScreen from './src/userManagement/RegistrationScreen';

// Subsystem 1 Module 2 - Profile Management Screens
import StudentList from './src/profileManagement/screens/StudentList';
import StudentProfile from './src/profileManagement/screens/StudentProfile';
import ManageAccountSettings from './src/profileManagement/screens/ManageAccountSettings';

// Subsystem 1 Module 3 - Home Screens
import AdminHomeScreen from './src/homepageManagement/adminHomeScreen';
import StudentHomeScreen from './src/homepageManagement/studentHomeScreen';

// Subsystem 2 Module 1 - Event Management Screens
import EventList from './src/eventManagement/screens/EventList';
import EditEventScreen from './src/eventManagement/screens/EditEvent';
import EventFormScreen from './src/eventManagement/screens/EventForm';

// Subsystem 2 Module 2 - Event Registration Screens
import EventListScreen from './src/eventRegistration/screens/eventListScreen';

// Subsystem 2 Module 3 - Performance Screens (View Performance) 
import LeaderBoardScreen from './src/leaderboardAndReward/screens/LeaderboardScreen';
import RewardPointsScreen from './src/leaderboardAndReward/screens/RewardPointsScreen';
import ManageConversionsScreen from './src/leaderboardAndReward/screens/ManageConversionsScreen';

// Subsystem 3 Module 1 - Smart Scanner
import SmartScannerScreen from './src/smartScanner/smartScanner';

// Subsystem 3 Module 2 - EcoMap Screens
import EcoMapScreen from './src/Ecomap/screens/EcoMapScreen';
import ReportScreen from './src/Ecomap/screens/ReportScreen';
import FilterScreen from './src/Ecomap/screens/FilterScreen';

// Subsystem 3 Module 3 - Contribution Tracking Screens
import AddContributionScreen from './src/contributionTracking/screens/AddContributionScreen';
import MyEventsScreen from './src/contributionTracking/screens/MyEventsScreen';

//  Subsystem 4 Module 1 - Recycling Aanalytics Screens
import MyPerformanceScreen from './src/RecyclingAnalytics/screens/MyPerformanceScreen';
import CommunityOverviewScreen from './src/RecyclingAnalytics/screens/CommunityOverviewScreen';
import ComparePerformanceScreen from './src/RecyclingAnalytics/screens/ComparePerformanceScreen';
import RecyclingAnalyticsTabNavigator from './src/RecyclingAnalytics/screens/RecyclingAnalyticsTabNavigator';

// Subsystem 4 Module 2 - Campaign Analytics
import CampaignAnalytics from './src/campaignAnalytics/campaignAnalytics';
import CampaignComparisonScreen from './src/campaignAnalytics/campaignComparison';
import GenerateReportScreen from './src/campaignAnalytics/generateReport';
import CampaignDetailScreen from './src/campaignAnalytics/campaignDetail';

// Subsystem 4 Module 3 - Decision Making Module Screens
import ModuleDashboard from './src/DecisionMaking/screens/ModuleDashboard';
import PredictTrends from './src/DecisionMaking/screens/PredictTrends';
import EngagementAnalysis from './src/DecisionMaking/screens/EngagementAnalysis';
import SustainabilityInsights from './src/DecisionMaking/screens/SustainabilityInsights';


const Stack = createNativeStackNavigator();

// Create a navigation reference
export const navigationRef = React.createRef();

const App = () => {
  const [user, setUser] = useState(null);

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            setUser(null);
            // Navigate to Login page
            navigationRef.current?.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  // Custom logout button component with emoji
  const LogoutButton = () => (
    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
      <Text style={styles.logoutText}>🚪</Text>
    </TouchableOpacity>
  );

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Login"
        // Remove global headerShown: false to see headers
      >
        {/* Auth Screens - No header or custom header */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegistrationScreen} 
          options={{ 
            title: 'Register',
            headerBackTitle: 'Back'
          }}
        />

        {/* Home Screens */}
        <Stack.Screen 
          name="AdminHome"
          component={AdminHomeScreen}
          options={{
            title: 'Admin Dashboard',
            headerRight: () => <LogoutButton />,
            headerBackVisible: false, // Prevent going back to login
          }}
        />
        <Stack.Screen
          name="StudentHome"
          component={StudentHomeScreen}
          options={{
            title: 'Student Dashboard',
            headerRight: () => <LogoutButton />,
            headerBackVisible: false, // Prevent going back to login
          }}
        />

        {/* Profile Management Screens */}
        <Stack.Screen 
          name="StudentList" 
          component={StudentList} 
          options={{ 
            title: 'Student List',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="StudentProfile" 
          component={StudentProfile} 
          options={{ 
            title: 'Student Profile',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="ManageAccountSettings" 
          component={ManageAccountSettings} 
          options={{ 
            title: 'Account Settings',
            headerBackTitle: 'Back'
          }}
        />

        {/* Event Registration Screens */}
        <Stack.Screen 
          name="EventListScreen" 
          component={EventListScreen} 
          options={{ 
            title: 'Events',
            headerBackTitle: 'Back'
          }}
        />

        {/* Event Management Screens */}
        <Stack.Screen 
          name="EventList" 
          component={EventList} 
          options={{ 
            title: 'Manage Events',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="EditEvent" 
          component={EditEventScreen} 
          options={{ 
            title: 'Edit Event',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="EventForm" 
          component={EventFormScreen} 
          options={{ 
            title: 'Create Event',
            headerBackTitle: 'Back'
          }}
        />

        {/* Leaderboard and Reward Screens */}
        <Stack.Screen 
          name="Leaderboard" 
          component={LeaderBoardScreen} 
          options={{ 
            title: 'Leaderboard',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="RewardPoints" 
          component={RewardPointsScreen} 
          options={{ 
            title: 'Reward Points',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="ManageConversion" 
          component={ManageConversionsScreen} 
          options={{ 
            title: 'Manage Conversions',
            headerBackTitle: 'Back'
          }}
        />

        {/* Smart Scanner Screen */}
        <Stack.Screen 
          name="SmartScanner" 
          component={SmartScannerScreen} 
          options={{ 
            title: 'Smart Scanner',
            headerBackTitle: 'Back'
          }}
        />

        {/* EcoMap Screens */}
        <Stack.Screen 
          name="EcoMap" 
          component={EcoMapScreen} 
          options={{ 
            title: 'Eco Map',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="Report" 
          component={ReportScreen} 
          options={{ 
            title: 'Report',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="Filter" 
          component={FilterScreen} 
          options={{ 
            title: 'Filter',
            headerBackTitle: 'Back'
          }}
        />

        {/* Contribution Tracking Screens */}
        <Stack.Screen 
          name="AddContributionScreen" 
          component={AddContributionScreen} 
          options={{ 
            title: 'Add Contribution',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="MyEvents" 
          component={MyEventsScreen} 
          options={{ 
            title: 'My Events',
            headerBackTitle: 'Back'
          }}
        />

        {/* Recycling Analytics Screens */}
        <Stack.Screen 
          name="MyPerformance" 
          component={MyPerformanceScreen} 
          options={{ 
            title: 'My Performance',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="CommunityOverview" 
          component={CommunityOverviewScreen} 
          options={{ 
            title: 'Community Overview',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="ComparePerformance" 
          component={ComparePerformanceScreen} 
          options={{ 
            title: 'Compare Performance',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="RecyclingAnalytics" 
          component={RecyclingAnalyticsTabNavigator} 
          options={{ 
            headerShown: false, 
            headerBackTitleVisible: false 
          }}
        />

        {/* Campaign Analytics Screens */}
        <Stack.Screen 
          name="CampaignAnalytics" 
          component={CampaignAnalytics} 
          options={{ 
            title: 'Campaign Analytics',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="CampaignComparison" 
          component={CampaignComparisonScreen} 
          options={{ 
            title: 'Campaign Comparison',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="GenerateReport" 
          component={GenerateReportScreen} 
          options={{ 
            title: 'Generate Report',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="CampaignDetail" 
          component={CampaignDetailScreen} 
          options={{ 
            title: 'Campaign Details',
            headerBackTitle: 'Back'
          }}
        />

        {/* Decision Making Module Screens */}
        <Stack.Screen 
          name="ModuleDashboard" 
          component={ModuleDashboard} 
          options={{ 
            title: 'Analytics Dashboard',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="PredictTrends" 
          component={PredictTrends} 
          options={{ 
            title: 'Predict Trends',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="EngagementAnalysis" 
          component={EngagementAnalysis} 
          options={{ 
            title: 'Engagement Analysis',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen 
          name="SustainabilityInsights" 
          component={SustainabilityInsights} 
          options={{ 
            title: 'Sustainability Insights',
            headerBackTitle: 'Back'
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  logoutButton: {
    marginRight: 15,
    padding: 5,
  },
  logoutText: {
    fontSize: 24,
  },
});