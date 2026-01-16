import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// API Configuration
const NODE_API_BASE_URL = 'http://localhost:3000';
const FLASK_API_BASE_URL = 'http://localhost:5000';
// const API_BASE_URL = 'http://10.0.2.2:5000';

const StudentHomeScreen = ({ route, ...props }) => {
  const navigation = useNavigation();
  
  // Get user from props (passed from App.js)
  const user = props.user || route.params?.user;
  
  console.log('🔍 StudentHomeScreen - User data:', {
    hasUser: !!user,
    userId: user?.userID,
    username: user?.username,
    role: user?.role,
    fullName: user?.fullName,
    studentID: user?.studentID
  });
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  
  // User data states
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    currentRank: 'Bronze',
    nextRank: 'Silver',
    pointsToNextRank: 100,
    totalRecycling: 0,
    streakDays: 0,
    weeklyGoal: 5,
    weeklyProgress: 0,
    monthlyPoints: 0,
    monthlyGoal: 500,
    totalMerits: 0,
    totalWeightRecycled: 0,
  });
  
  const [weeklyChartData, setWeeklyChartData] = useState([]);
  const [categoryChartData, setCategoryChartData] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Time-based activity suggestion
  const [timeBasedSuggestion, setTimeBasedSuggestion] = useState({
    title: '',
    message: '',
    icon: '♻️',
    color: '#4CAF50'
  });
  
  // Layout Personalization States
  const [layoutModalVisible, setLayoutModalVisible] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState({
    showWelcomeCard: true,
    showTimeSuggestion: true,
    showQuickActions: true,
    showUserStats: true,
    showProgressChart: true,
    showLeaderboard: true,
    showUpcomingEvents: true,
    showRecentActivities: true,
    showNotifications: true,
  });
  const [savingLayout, setSavingLayout] = useState(false);
  
  // Notification Modal State
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  // ============ TIME-BASED ACTIVITY SUGGESTION ============
  
  const getTimeBasedSuggestion = useCallback(() => {
    const currentHour = new Date().getHours();
    let suggestion;
    
    if (currentHour >= 6 && currentHour < 12) {
      // Morning (6:00 AM - 11:59 AM)
      suggestion = {
        title: 'Morning Recycling',
        message: 'Start your day with sustainable habits. Morning recycling earns bonus points!',
        icon: '🌅',
        color: '#FF9500',
        bgColor: '#FFF4E6', // Light orange background
        action: 'Start Now',
        timePeriod: 'morning'
      };
    } else if (currentHour >= 12 && currentHour < 18) {
      // Afternoon (12:00 PM - 5:59 PM)
      suggestion = {
        title: 'Afternoon Recycling',
        message: 'Perfect time to recycle between classes. Keep campus clean and earn rewards.',
        icon: '☀️',
        color: '#007AFF',
        bgColor: '#E6F2FF', // Light blue background
        action: 'Recycle Now',
        timePeriod: 'afternoon'
      };
    } else {
      // Evening (6:00 PM - 11:59 PM)
      suggestion = {
        title: 'Evening Recycling',
        message: 'Final chance to recycle today. Drop off items before facilities close.',
        icon: '🌙',
        color: '#5856D6',
        bgColor: '#F0E6FF', // Light purple background
        action: 'Recycle Now',
        timePeriod: 'evening'
      };
    }
    
    setTimeBasedSuggestion(suggestion);
    return suggestion;
  }, []);

  // ============ API CALL FUNCTIONS ============

  const fetchDashboardData = async () => {
    if (!user) {
      console.log('❌ No user data available, skipping fetch');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setConnectionError(false);
      console.log('📊 Fetching dashboard data for student:', user.fullName);

      // Get time-based suggestion
      getTimeBasedSuggestion();
      
      // ============ FIXED: Fetch user statistics ============
      try {
        console.log(`📡 Fetching stats for userID: ${user.userID}`);
        const statsResponse = await fetch(`${FLASK_API_BASE_URL}/api/students/${user.userID}/stats`);
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('📊 Stats API Response:', statsData);
          
          if (statsData.success && statsData.stats) {
            // Ensure all numeric values are properly set
            const safeStats = {
              totalPoints: parseInt(statsData.stats.totalPoints) || 0,
              totalMerits: parseInt(statsData.stats.totalMerits) || 0,
              currentRank: statsData.stats.currentRank || 'Bronze',
              nextRank: statsData.stats.nextRank || 'Silver',
              pointsToNextRank: parseInt(statsData.stats.pointsToNextRank) || 100,
              totalRecycling: parseInt(statsData.stats.totalRecycling) || 0,
              streakDays: parseInt(statsData.stats.streakDays) || 0,
              weeklyGoal: parseInt(statsData.stats.weeklyGoal) || 5,
              weeklyProgress: parseInt(statsData.stats.weeklyProgress) || 0,
              monthlyPoints: parseInt(statsData.stats.monthlyPoints) || 0,
              monthlyGoal: parseInt(statsData.stats.monthlyGoal) || 500,
              totalWeightRecycled: parseFloat(statsData.stats.totalWeight) || 0,
            };
            
            setUserStats(safeStats);
            console.log('✅ User stats loaded:', safeStats);
          } else {
            // If API returns success: false, use fallback data
            console.log('⚠️ Stats API returned success: false');
            await fetchUserProfileForStats();
          }
        } else {
          console.log(`⚠️ Stats API returned status: ${statsResponse.status}`);
          await fetchUserProfileForStats();
        }
      } catch (error) {
        console.log('⚠️ Error fetching student stats:', error.message);
        // Try to get stats from user profile
        await fetchUserProfileForStats();
      }
      
      // ============ FIXED: Fetch user profile for stats (fallback) ============
      async function fetchUserProfileForStats() {
        try {
          console.log('🔄 Trying to fetch user profile for stats...');
          const profileResponse = await fetch(`${FLASK_API_BASE_URL}/api/user/profile/${user.userID}`);
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('👤 Profile API Response:', profileData);
            
            if (profileData.success && profileData.user) {
              const userData = profileData.user;
              
              // Calculate rank based on totalPoints
              const totalPoints = parseInt(userData.totalPoints) || 0;
              let currentRank, nextRank, pointsToNextRank;
              
              if (totalPoints >= 2000) {
                currentRank = 'Gold';
                nextRank = 'Platinum';
                pointsToNextRank = Math.max(0, 3000 - totalPoints);
              } else if (totalPoints >= 1000) {
                currentRank = 'Silver';
                nextRank = 'Gold';
                pointsToNextRank = Math.max(0, 2000 - totalPoints);
              } else {
                currentRank = 'Bronze';
                nextRank = 'Silver';
                pointsToNextRank = Math.max(0, 1000 - totalPoints);
              }
              
              const fallbackStats = {
                totalPoints: totalPoints,
                totalMerits: parseInt(userData.totalMerits) || 0,
                currentRank: currentRank,
                nextRank: nextRank,
                pointsToNextRank: pointsToNextRank,
                totalRecycling: parseInt(userData.totalItemsRecycled) || 0,
                totalWeightRecycled: parseFloat(userData.totalWeightRecycled) || 0,
                streakDays: 0,
                weeklyGoal: 5,
                weeklyProgress: 0,
                monthlyPoints: totalPoints,
                monthlyGoal: 500,
              };
              
              setUserStats(fallbackStats);
              console.log('✅ Fallback stats from profile:', fallbackStats);
            }
          }
        } catch (profileError) {
          console.log('⚠️ Error fetching profile:', profileError.message);
          
          // Use mock data as last resort
          const mockStats = {
            totalPoints: 0,
            totalMerits: 0,
            currentRank: 'Bronze',
            nextRank: 'Silver',
            pointsToNextRank: 100,
            totalRecycling: 0,
            totalWeightRecycled: 0,
            streakDays: 0,
            weeklyGoal: 5,
            weeklyProgress: 0,
            monthlyPoints: 0,
            monthlyGoal: 500,
          };
          
          setUserStats(mockStats);
          console.log('🔄 Using mock stats');
        }
      }
      
      // Fetch weekly chart data
      try {
        const chartResponse = await fetch(`${FLASK_API_BASE_URL}/api/students/${user.userID}/weekly-stats`);
        
        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          if (chartData.success) {
            setWeeklyChartData(chartData.data || []);
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching weekly stats:', error.message);
        setWeeklyChartData([
          { day: 'Mon', points: 50 },
          { day: 'Tue', points: 75 },
          { day: 'Wed', points: 100 },
          { day: 'Thu', points: 65 },
          { day: 'Fri', points: 120 },
          { day: 'Sat', points: 90 },
          { day: 'Sun', points: 40 },
        ]);
      }
      
      // Fetch category distribution
      try {
        const categoryResponse = await fetch(`${FLASK_API_BASE_URL}/api/students/${user.userID}/category-stats`);
        
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json();
          if (categoryData.success) {
            setCategoryChartData(categoryData.data || []);
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching category stats:', error.message);
        setCategoryChartData([
          { name: 'Plastic', amount: 15, color: '#4CAF50', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          { name: 'Paper', amount: 20, color: '#2196F3', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          { name: 'Glass', amount: 8, color: '#FF9800', legendFontColor: '#7F7F7F', legendFontSize: 12 },
          { name: 'Metal', amount: 12, color: '#F44336', legendFontColor: '#7F7F7F', legendFontSize: 12 },
        ]);
      }
      
      // Fetch upcoming events
      try {
        const eventsResponse = await fetch(`${NODE_API_BASE_URL}/api/events/upcoming`);
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          if (eventsData.success && eventsData.events) {
            setUpcomingEvents(eventsData.events.slice(0, 5));
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching upcoming events:', error.message);
        setUpcomingEvents([
          {
            eventID: 1,
            eventTitle: 'Plastic Recycling Drive',
            eventCategory: 'Recycling Drive',
            eventStartDate: new Date(Date.now() + 86400000).toISOString(),
            location: 'Student Center',
            rewardPoints: 50,
            registered: true
          },
          {
            eventID: 2,
            eventTitle: 'E-Waste Collection',
            eventCategory: 'E-Waste',
            eventStartDate: new Date(Date.now() + 172800000).toISOString(),
            location: 'Library',
            rewardPoints: 100,
            registered: false
          }
        ]);
      }
      
      // Fetch leaderboard
      try {
        const leaderboardResponse = await fetch(`${NODE_API_BASE_URL}/api/students/leaderboard/top-10`);
        
        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          console.log('🏆 Leaderboard API Response:', leaderboardData);
          
          if (leaderboardData.success && leaderboardData.leaderboard) {
            setLeaderboard(leaderboardData.leaderboard);
            console.log('✅ Leaderboard set:', leaderboardData.leaderboard.length, 'players');
          } else {
            console.log('⚠️ Leaderboard API returned no data, using fallback');
            setLeaderboard([
              { rank: 1, name: 'John Doe', points: 180, studentID: 'A23CS0001' },
              { rank: 2, name: 'Jane Smith', points: 175, studentID: 'A23CS0002' },
              { rank: 3, name: 'Ali Ahmad', points: 125, studentID: 'A23CS0003' }
            ]);
          }
        } else {
          console.log('⚠️ Leaderboard API failed, using fallback');
          setLeaderboard([
            { rank: 1, name: 'John Doe', points: 180, studentID: 'A23CS0001' },
            { rank: 2, name: 'Jane Smith', points: 175, studentID: 'A23CS0002' }
          ]);
        }
      } catch (error) {
        console.log('⚠️ Error fetching leaderboard:', error.message);
        setLeaderboard([
          { rank: 1, name: 'John Doe', points: 180, studentID: 'A23CS0001' },
          { rank: 2, name: 'Jane Smith', points: 175, studentID: 'A23CS0002' }
        ]);
      }
      
      // Fetch recent activities - SIMPLE FIX
      try {
        const activitiesResponse = await fetch(`${FLASK_API_BASE_URL}/api/students/${user.userID}/activities`);
        
        if (activitiesResponse.ok) {
          const activitiesData = await activitiesResponse.json();
          console.log('📅 Activities API Response:', activitiesData);
          
          if (activitiesData.success && activitiesData.activities) {
            // Use data directly from API
            const activitiesFromAPI = activitiesData.activities.map(activity => {
              return {
                ...activity,
                // Ensure formattedDate exists
                formattedDate: activity.formattedDate || (activity.timestamp ? 
                  new Date(activity.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Recently')
              };
            });
            
            setRecentActivities(activitiesFromAPI.slice(0, 3));
            console.log('✅ Activities set:', activitiesFromAPI.length, 'items');
          }
        } else {
          console.log('⚠️ Activities API failed, using fallback');
          // Use simple fallback
          setRecentActivities([
            {
              id: 1,
              type: 'event',
              description: 'Participated in Earth Day Recycling Drive 2025',
              points: 50,
              formattedDate: 'Apr 24, 2025'
            },
            {
              id: 2,
              type: 'event',
              description: 'Participated in Plastic-Free Campus Campaign',
              points: 100,
              formattedDate: 'Mar 15, 2025'
            }
          ]);
        }
      } catch (error) {
        console.log('⚠️ Error fetching activities:', error.message);
        setRecentActivities([
          {
            id: 1,
            type: 'event',
            description: 'Participated in Earth Day Recycling Drive 2025',
            points: 50,
            formattedDate: 'Apr 24, 2025'
          }
        ]);
      }
      
      // Fetch notifications
      try {
        const notifResponse = await fetch(`${FLASK_API_BASE_URL}/api/notifications?userID=${user.userID}&limit=10`);
        
        if (notifResponse.ok) {
          const notifData = await notifResponse.json();
          if (notifData.success) {
            const sortedNotifications = (notifData.notifications || []).sort((a, b) => {
              if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
              return new Date(b.createdDate) - new Date(a.createdDate);
            });
            
            setNotifications(sortedNotifications);
            setUnreadNotifications(notifData.unreadCount || 0);
            console.log('✅ Notifications loaded:', sortedNotifications.length);
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching notifications:', error.message);
        setNotifications([
          {
            notificationID: 'NOTIF001',
            title: 'Welcome to UTM ReMerit',
            message: 'Start recycling to earn points and rewards!',
            typeName: 'system',
            isRead: false,
            createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ]);
        setUnreadNotifications(1);
      }

      // Fetch layout preferences
      try {
        const layoutResponse = await fetch(`${FLASK_API_BASE_URL}/api/userpreferencelayout/${user.userID}`);
        
        if (layoutResponse.ok) {
          const layoutData = await layoutResponse.json();
          
          if (layoutData.success && layoutData.preferences) {
            const preferences = layoutData.preferences;
            
            // Parse the JSON string if it's stored as a string
            let layoutConfigData;
            
            if (typeof preferences.layoutConfig === 'string') {
              try {
                layoutConfigData = JSON.parse(preferences.layoutConfig);
              } catch (parseError) {
                console.log('Error parsing layoutConfig:', parseError);
                layoutConfigData = {};
              }
            } else {
              layoutConfigData = preferences.layoutConfig || {};
            }
            
            // Update state with fetched preferences
            setLayoutConfig({
              ...layoutConfig,
              ...layoutConfigData
            });
            
            console.log('✅ Layout preferences loaded from database:', layoutConfigData);
          } else {
            console.log('ℹ️ No saved layout preferences found, using defaults');
          }
        } else if (layoutResponse.status === 404) {
          console.log('ℹ️ No layout preferences found for user, using defaults');
        }
      } catch (error) {
        console.log('⚠️ Error fetching layout preferences:', error.message);
      }

    } catch (error) {
      console.error('❌ Error in fetchDashboardData:', error);
      setConnectionError(true);
    } finally {
      setLoading(false);
      console.log('✅ Dashboard data fetch complete');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      // Update local state immediately
      setNotifications(prev => {
        const newNotifications = prev.map(notif => 
          notif.notificationID === notificationId 
            ? { ...notif, isRead: true } 
            : notif
        );
        
        return newNotifications.sort((a, b) => {
          if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
          return new Date(b.createdDate) - new Date(a.createdDate);
        });
      });
      
      setUnreadNotifications(prev => Math.max(0, prev - 1));

      // Send API request
      await fetch(`${FLASK_API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    
    try {
      // Update local state immediately
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadNotifications(0);
      
      // Send API request
      const response = await fetch(`${FLASK_API_BASE_URL}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID: user.userID }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'All notifications marked as read');
      }
    } catch (error) {
      console.error('❌ Error marking notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Find the notification before deleting
      const notificationToDelete = notifications.find(n => n.notificationID === notificationId);
      
      // Update local state immediately
      setNotifications(prev => 
        prev.filter(notif => notif.notificationID !== notificationId)
      );
      
      // If notification was unread, decrease count
      if (notificationToDelete && !notificationToDelete.isRead) {
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      }

      // Send API request
      await fetch(`${FLASK_API_BASE_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
    }
  };

  const saveLayoutChanges = async (newLayoutConfig) => {
    if (!user) return;
    
    try {
      setSavingLayout(true);
      
      // Prepare layout data
      const layoutData = {
        userID: user.userID,
        layoutConfig: newLayoutConfig,
        widgetOrder: [],
        theme: 'light',
        fontSize: 'medium',
      };
      
      console.log('💾 Saving layout preferences:', layoutData);
      
      // Save to server
      const response = await fetch(`${FLASK_API_BASE_URL}/api/userpreferencelayout/${user.userID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutData),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Update local state
          setLayoutConfig(newLayoutConfig);
          
          // Close modal
          setLayoutModalVisible(false);
          
          // Show success message
          Alert.alert('Success', 'Layout preferences saved successfully!');
          console.log('✅ Layout preferences saved to database');
        } else {
          Alert.alert('Error', data.error || 'Failed to save preferences');
        }
      } else {
        Alert.alert('Error', 'Server error occurred. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving layout preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Check server connection.');
    } finally {
      setSavingLayout(false);
    }
  };

  // ============ NAVIGATION FUNCTIONS ============

  const navigateToRecyclingTracker = () => {
    navigation.navigate('RecyclingTracker', { user });
  };

  const navigateToSmartScanner = () => {
    navigation.navigate('SmartScanner', { user });
  };

  const navigateToEcoMap = () => {
    navigation.navigate('EcoMap', { user });
  };

  const navigateToRegisterEvent = () => {
    navigation.navigate('EventListScreen', { user });
  }

  const navigateToLeaderboard = () => {
    navigation.navigate('Leaderboard', { user });
  };

  const navigateToTrackContributions = () => {
    navigation.navigate('MyEvents', { user });
  };

  const navigateToViewPerformance = () => {
    navigation.navigate('RecyclingAnalytics', { user });
  };

  const navigateToCommunityOverview = () => {
    navigation.navigate('RecyclingAnalytics', { user });
  };

  const navigateToComparePerformance = () => {
    navigation.navigate('ComparePerformanceScreen', { user });
  }

  // Find the navigateToProfile function and update it:
  const navigateToProfile = () => {
    // Pass the current user object
    navigation.navigate('StudentProfile', { 
      user: user,  // Pass the complete user object
      studentId: user.userID,  // Also pass the ID separately
      studentName: user.fullName
    });
  };

  const navigateToEventDetail = (eventId) => {
    navigation.navigate('CampaignDetail', { campaignId: eventId, user });
  };

  // ============ DATA FETCHING ============

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    console.log('🔄 useEffect - User changed:', !!user);
    if (user) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      console.log('🎯 useFocusEffect - User exists:', !!user);
      if (user) {
        fetchDashboardData();
      }
    }, [user])
  );

  // ============ HELPER FUNCTIONS ============

  const getRankColor = (rank) => {
    switch(rank?.toLowerCase()) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#4CAF50';
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'recycling': return '♻️';
      case 'event': return '📅';
      case 'reward': return '🏆';
      case 'achievement': return '⭐';
      default: return '🔔';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'system': return '⚙️';
      case 'event': return '📅';
      case 'achievement': return '⭐';
      case 'reminder': return '⏰';
      case 'reward': return '🎁';
      default: return '🔔';
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // ============ MODAL COMPONENTS ============

  const NotificationModal = () => {
    const unreadNotificationsList = notifications.filter(n => !n.isRead);
    const readNotificationsList = notifications.filter(n => n.isRead);

    const renderNotificationItem = ({ item }) => (
      <View style={[
        styles.notificationItem,
        !item.isRead && styles.unreadNotificationItem
      ]}>
        <View style={styles.notificationItemHeader}>
          <Text style={styles.notificationIcon}>
            {getNotificationIcon(item.typeName || item.type)}
          </Text>
          <View style={styles.notificationTitleContainer}>
            <Text style={[
              styles.notificationTitle,
              !item.isRead && styles.unreadNotificationTitle,
            ]}>
              {item.title}
            </Text>
            <Text style={styles.notificationTime}>
              {item.createdDate ? new Date(item.createdDate).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              }) : 'Just now'}
            </Text>
          </View>
          {!item.isRead && (
            <View style={styles.unreadDot} />
          )}
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <View style={styles.notificationActions}>
          {!item.isRead && (
            <TouchableOpacity 
              onPress={() => markNotificationAsRead(item.notificationID)}
              style={styles.markReadButton}
            >
              <Text style={styles.markReadText}>Mark as read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            onPress={() => deleteNotification(item.notificationID)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={notificationModalVisible}
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.notificationModalOverlay}>
          <View style={styles.notificationModalContent}>
            <View style={styles.notificationModalHeader}>
              <Text style={styles.notificationModalTitle}>
                🔔 Notifications ({notifications.length})
              </Text>
              <TouchableOpacity 
                onPress={() => setNotificationModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.notificationModalActions}>
              <TouchableOpacity 
                onPress={markAllNotificationsAsRead}
                style={styles.markAllButton}
                disabled={unreadNotifications === 0}
              >
                <Text style={[
                  styles.markAllText,
                  unreadNotifications === 0 && styles.disabledText
                ]}>Mark all as read</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={fetchDashboardData}
                style={styles.refreshNotifButton}
              >
                <Text style={styles.refreshNotifText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.noNotifications}>
                <Text style={styles.noNotificationsIcon}>📭</Text>
                <Text style={styles.noNotificationsText}>No notifications</Text>
                <Text style={styles.noNotificationsSubtext}>You're all caught up!</Text>
              </View>
            ) : (
              <ScrollView style={styles.notificationScrollView}>
                {unreadNotificationsList.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>Unread ({unreadNotificationsList.length})</Text>
                    </View>
                    {unreadNotificationsList.map((item, index) => (
                      <View key={item.notificationID || index}>
                        {renderNotificationItem({ item })}
                      </View>
                    ))}
                  </>
                )}

                {readNotificationsList.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>Read ({readNotificationsList.length})</Text>
                    </View>
                    {readNotificationsList.map((item, index) => (
                      <View key={item.notificationID || index}>
                        {renderNotificationItem({ item })}
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const LayoutConfigurationModal = () => {
    const [localTempConfig, setLocalTempConfig] = useState(layoutConfig);
    
    const widgetList = [
      { key: 'showWelcomeCard', name: 'Welcome Card', icon: '👋' },
      { key: 'showTimeSuggestion', name: 'Time-Based Suggestion', icon: '⏰' },
      { key: 'showQuickActions', name: 'Quick Actions', icon: '🚀' },
      { key: 'showUserStats', name: 'User Statistics', icon: '📊' },
      { key: 'showProgressChart', name: 'Progress Chart', icon: '📈' },
      { key: 'showLeaderboard', name: 'Leaderboard', icon: '🏆' },
      { key: 'showUpcomingEvents', name: 'Upcoming Events', icon: '📅' },
      { key: 'showRecentActivities', name: 'Recent Activities', icon: '📜' },
      { key: 'showNotifications', name: 'Notifications', icon: '🔔' },
    ];

    useEffect(() => {
      if (layoutModalVisible) {
        setLocalTempConfig(layoutConfig);
      }
    }, [layoutModalVisible, layoutConfig]);

    const handleToggleWidget = (widgetKey) => {
      setLocalTempConfig(prev => ({
        ...prev,
        [widgetKey]: !prev[widgetKey]
      }));
    };

    const handleSave = () => {
      saveLayoutChanges(localTempConfig);
    };

    const handleReset = () => {
      const defaultConfig = {
        showWelcomeCard: true,
        showTimeSuggestion: true,
        showQuickActions: true,
        showUserStats: true,
        showProgressChart: true,
        showLeaderboard: true,
        showUpcomingEvents: true,
        showRecentActivities: true,
        showNotifications: true,
      };
      setLocalTempConfig(defaultConfig);
    };

    const handleCancel = () => {
      setLayoutModalVisible(false);
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={layoutModalVisible}
        onRequestClose={handleCancel}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Dashboard Layout Settings</Text>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {savingLayout ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#1A5F7A" />
                <Text style={styles.modalLoadingText}>Saving preferences...</Text>
              </View>
            ) : (
              <>
                <ScrollView 
                  style={styles.modalBody} 
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.sectionTitle}>Widget Visibility</Text>
                  <Text style={styles.sectionDescription}>
                    Toggle widgets on/off to customize your dashboard
                  </Text>
                  
                  <View style={styles.widgetOrderList}>
                    {widgetList.map((widget) => (
                      <View key={widget.key} style={styles.widgetOrderItem}>
                        <View style={styles.widgetOrderItemContent}>
                          <View style={styles.widgetOrderLeft}>
                            <Text style={styles.widgetOrderIcon}>
                              {widget.icon}
                            </Text>
                            <Text style={styles.widgetOrderName}>
                              {widget.name}
                            </Text>
                          </View>
                          
                          <View style={styles.widgetOrderRight}>
                            <Switch
                              value={localTempConfig[widget.key]}
                              onValueChange={() => handleToggleWidget(widget.key)}
                              trackColor={{ false: '#ddd', true: '#4CAF50' }}
                              thumbColor="#fff"
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  
                  <View style={styles.statsInfo}>
                    <Text style={styles.statsText}>
                      Enabled: {Object.values(localTempConfig).filter(v => v).length} of {widgetList.length} widgets
                    </Text>
                    <Text style={styles.statsNote}>
                      Changes will be applied after clicking "Save & Apply"
                    </Text>
                  </View>
                </ScrollView>
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleCancel}
                    disabled={savingLayout}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.resetButton]}
                    onPress={handleReset}
                    disabled={savingLayout}
                  >
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSave}
                    disabled={savingLayout}
                  >
                    <Text style={styles.saveButtonText}>
                      {savingLayout ? 'Saving...' : 'Save & Apply'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ============ RENDER LOADING ============

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading user data...</Text>
          <Text style={styles.loadingSubtext}>Please wait or try logging in again</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
          <Text style={styles.loadingSubtext}>Welcome, {user.fullName}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ============ RENDER HEADER ============

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View>
          <Text style={styles.greeting}>Hello, nice to meet you.
          </Text>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userRole}>Student • {user.studentID}</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={navigateToProfile}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => setNotificationModalVisible(true)}
        >
          <Text style={styles.notificationIcon}>🔔</Text>
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.layoutButton}
          onPress={() => setLayoutModalVisible(true)}
        >
          <Text style={styles.layoutIcon}>🎨</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ============ RENDER MAIN CONTENT ============

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      {renderHeader()}

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        {layoutConfig.showWelcomeCard && (
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>UTM ReMerit Student Dashboard</Text>
              <Text style={styles.welcomeSubtitle}>
                Welcome, {user.fullName}. 
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Start recycling to earn points and rewards!
              </Text>
              <Text style={styles.welcomeDate}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <View style={styles.streakContainer}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakText}>{userStats.streakDays} day streak</Text>
              </View>
            </View>
            <View style={styles.welcomeIcon}>
              <Text style={styles.recycleIcon}>♻️</Text>
            </View>
          </View>
        )}

        {/* Time-Based Activity Suggestion */}
        {layoutConfig.showTimeSuggestion && (
          <View style={[styles.suggestionCard, { 
            backgroundColor: timeBasedSuggestion.bgColor, // Background color
            borderLeftColor: timeBasedSuggestion.color, // Border matches title color
            shadowColor: '#000',
          }]}>
            <View style={[styles.suggestionIconContainer, { 
              backgroundColor: timeBasedSuggestion.color + '20'
            }]}>
              <Text style={[styles.suggestionIcon, { 
                color: timeBasedSuggestion.color 
              }]}>
                {timeBasedSuggestion.icon}
              </Text>
            </View>
            
            <View style={styles.suggestionContent}>
              <Text style={[styles.suggestionTitle, { 
                color: timeBasedSuggestion.color  // Same color as border
              }]}>
                {timeBasedSuggestion.title}
              </Text>
              <Text style={styles.suggestionMessage}>
                {timeBasedSuggestion.message}
              </Text>
              <TouchableOpacity 
                style={[styles.suggestionButton, { 
                  backgroundColor: timeBasedSuggestion.color  // Same color as border and title
                }]}
                onPress={navigateToRecyclingTracker}
              >
                <Text style={styles.suggestionButtonText}>
                  {timeBasedSuggestion.action} →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Actions - Updated to 5 buttons as requested */}
        {layoutConfig.showQuickActions && (
          <View style={styles.quickActions}>
            {/* Smart Scanner Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.recycleButton]}
              onPress={navigateToSmartScanner}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Text style={[styles.actionIcon, { color: '#4CAF50' }]}>♻️</Text>
              </View>
              <Text style={styles.actionButtonText}>Smart Scanner</Text>
            </TouchableOpacity>

            {/* Eco Map Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.mapButton]}
              onPress={navigateToEcoMap}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#f5ebe8ff' }]}>
                <Text style={[styles.actionIcon, { color: '#FFEBEE' }]}>📍</Text>
              </View>
              <Text style={styles.actionButtonText}>Eco Map</Text>
            </TouchableOpacity>

            {/* Register for Event */}
            <TouchableOpacity
              style={[styles.actionButton, styles.eventsButton]}
              onPress={navigateToRegisterEvent}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Text style={[styles.actionIcon, { color: '#2196F3' }]}>📝</Text>
              </View>
              <Text style={styles.actionButtonText}>Register for Event</Text>
            </TouchableOpacity>

            {/* View Leaderboard */}
            <TouchableOpacity
              style={[styles.actionButton, styles.leaderboardButton]}
              onPress={navigateToLeaderboard}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <Text style={[styles.actionIcon, { color: '#9C27B0' }]}>🏆</Text>
              </View>
              <Text style={styles.actionButtonText}>View Leaderboard</Text>
            </TouchableOpacity>

            {/* Track Recycling Contributions */}
            <TouchableOpacity
              style={[styles.actionButton, styles.trackButton]}
              onPress={navigateToTrackContributions}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Text style={[styles.actionIcon, { color: '#FF9800' }]}>📊</Text>
              </View>
              <Text style={styles.actionButtonText}>Track Contributions</Text>
            </TouchableOpacity>

            {/* View Recycling Performance */}
            <TouchableOpacity
              style={[styles.actionButton, styles.performanceButton]}
              onPress={navigateToViewPerformance}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#E8EAF6' }]}>
                <Text style={[styles.actionIcon, { color: '#3F51B5' }]}>📈</Text>
              </View>
              <Text style={styles.actionButtonText}>View Performance</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* User Stats - TWO ROW LAYOUT */}
        {layoutConfig.showUserStats && (
          <View style={[styles.card, styles.statsCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>📊</Text>
              <Text style={styles.cardTitle}>Your Stats</Text>
              <TouchableOpacity 
                onPress={fetchDashboardData}
                style={styles.refreshButton}
              >
                <Text style={styles.refreshButtonText}>↻</Text>
              </TouchableOpacity>
            </View>
            
            {/* Two Row Stats Layout */}
            <View style={styles.twoRowStatsContainer}>
              {/* First Row - 3 items */}
              <View style={styles.twoRowStatsRow}>
                <View style={styles.twoRowStatItem}>
                  <Text style={styles.twoRowStatValue}>{userStats.totalPoints}</Text>
                  <Text style={styles.twoRowStatLabel}>Total Points</Text>
                  {userStats.totalPoints === 0 && (
                    <Text style={styles.zeroPointsNote}>Start recycling!</Text>
                  )}
                </View>
                
                <View style={styles.twoRowStatDivider} />
                
                <View style={styles.twoRowStatItem}>
                  <Text style={styles.twoRowStatValue}>{userStats.totalMerits}</Text>
                  <Text style={styles.twoRowStatLabel}>UTM Merits</Text>
                  {userStats.totalMerits === 0 && (
                    <Text style={styles.zeroPointsNote}>Join events!</Text>
                  )}
                </View>
                
                <View style={styles.twoRowStatDivider} />
                
                <View style={styles.twoRowStatItem}>
                  <View style={[styles.rankBadge, { backgroundColor: getRankColor(userStats.currentRank) }]}>
                    <Text style={styles.rankText}>{userStats.currentRank}</Text>
                  </View>
                  <Text style={styles.twoRowStatLabel}>Current Rank</Text>
                </View>
              </View>
              
              {/* Second Row - 3 items */}
              <View style={styles.twoRowStatsRow}>
                <View style={styles.twoRowStatItem}>
                  <Text style={styles.twoRowStatValue}>{userStats.totalRecycling}</Text>
                  <Text style={styles.twoRowStatLabel}>Items Recycled</Text>
                </View>
                
                <View style={styles.twoRowStatDivider} />
                
                <View style={styles.twoRowStatItem}>
                  <Text style={styles.twoRowStatValue}>{userStats.totalWeightRecycled.toFixed(1)}</Text>
                  <Text style={styles.twoRowStatLabel}>Weight (kg)</Text>
                </View>
                
                <View style={styles.twoRowStatDivider} />
                
                <View style={styles.twoRowStatItem}>
                  <Text style={styles.twoRowStatValue}>{userStats.streakDays}</Text>
                  <Text style={styles.twoRowStatLabel}>Day Streak</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Monthly Goal</Text>
                <Text style={styles.progressValue}>{userStats.monthlyPoints}/{userStats.monthlyGoal} points</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((userStats.monthlyPoints / userStats.monthlyGoal) * 100, 100)}%`,
                    backgroundColor: getRankColor(userStats.currentRank)
                  }
                ]} />
              </View>
              <Text style={styles.progressNote}>
                {userStats.pointsToNextRank} points needed for {userStats.nextRank}
              </Text>
            </View>
          </View>
        )}

        {/* Weekly Progress Chart */}
        {layoutConfig.showProgressChart && weeklyChartData.length > 0 && (
          <View style={[styles.card, styles.chartCard]}>
            <View style={[styles.cardHeader, styles.compactCardHeader]}>
              <Text style={styles.cardHeaderIcon}>📈</Text>
              <Text style={styles.cardTitle}>Weekly Progress</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                {weeklyChartData.map((item, index) => (
                  <View key={index} style={styles.chartBarContainer}>
                    <View style={styles.chartBarWrapper}>
                      <View 
                        style={[
                          styles.chartBar, 
                          { height: Math.min((item.points / 150) * 100, 100) }
                        ]} 
                      />
                    </View>
                    <Text style={styles.chartLabel}>{item.day}</Text>
                    <Text style={styles.chartValue}>{item.points}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Upcoming Events */}
        {layoutConfig.showUpcomingEvents && upcomingEvents.length > 0 && (
          <View style={[styles.card, styles.eventsCard]}>
            <View style={[styles.cardHeader, styles.compactCardHeader]}>
              <Text style={styles.cardHeaderIcon}>📅</Text>
              <Text style={styles.cardTitle}>Upcoming Events</Text>
              <TouchableOpacity onPress={navigateToRegisterEvent}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.eventsList}>
              {upcomingEvents.slice(0, 3).map((event, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.eventItem}
                  onPress={() => navigateToEventDetail(event.eventID)}
                >
                  <View style={styles.eventDate}>
                    <Text style={styles.eventDay}>
                      {new Date(event.eventStartDate).getDate()}
                    </Text>
                    <Text style={styles.eventMonth}>
                      {new Date(event.eventStartDate).toLocaleString('default', { month: 'short' })}
                    </Text>
                  </View>
                  
                  <View style={styles.eventDetails}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {event.eventTitle}
                    </Text>
                    <Text style={styles.eventCategory}>{event.eventCategory}</Text>
                    <View style={styles.eventFooter}>
                      <Text style={styles.eventLocation}>{event.location || 'Campus'}</Text>
                      <Text style={styles.eventPoints}>{event.rewardPoints} points</Text>
                    </View>
                  </View>
                  
                  {event.registered ? (
                    <View style={styles.registeredBadge}>
                      <Text style={styles.registeredText}>Registered</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.registerButton}
                      onPress={() => navigateToRegisterEvent()}
                    >
                      <Text style={styles.registerText}>Register</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Recent Activities */}
        {layoutConfig.showRecentActivities && recentActivities.length > 0 && (
          <View style={[styles.card, styles.activitiesCard]}>
            <View style={[styles.cardHeader, styles.compactCardHeader]}>
              <Text style={styles.cardHeaderIcon}>📜</Text>
              <Text style={styles.cardTitle}>Recent Activities</Text>
            </View>
            
            <View style={styles.activitiesList}>
              {recentActivities.slice(0, 3).map((activity, index) => (
                <View key={index} style={styles.activityItem}>
                  <View style={styles.activityIconContainer}>
                    <Text style={styles.activityIcon}>
                      {getActivityIcon(activity.type)}
                    </Text>
                  </View>
                  
                  <View style={styles.activityContent}>
                    <Text style={styles.activityDescription}>
                      {activity.description}
                    </Text>
                    <View style={styles.activityFooter}>
                      <Text style={styles.activityTimestamp}>
                        {activity.formattedDate || 
                         (activity.timestamp ? formatEventDate(activity.timestamp) : 'Recently')}
                      </Text>
                      {activity.points > 0 && (
                        <Text style={styles.activityPoints}>
                          +{activity.points} points
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notifications Preview */}
        {layoutConfig.showNotifications && notifications.length > 0 && (
          <View style={[styles.card, styles.notificationsCard]}>
            <View style={[styles.cardHeader, styles.compactCardHeader]}>
              <Text style={styles.cardHeaderIcon}>🔔</Text>
              <Text style={styles.cardTitle}>Recent Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationModalVisible(true)}>
                <Text style={styles.viewAllText}>
                  View All ({unreadNotifications} unread)
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.notificationsList}>
              {notifications.slice(0, 2).map((notification, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.notificationPreviewItem}
                  onPress={() => setNotificationModalVisible(true)}
                >
                  <Text style={styles.notificationPreviewIcon}>
                    {getNotificationIcon(notification.typeName || notification.type)}
                  </Text>
                  
                  <View style={styles.notificationPreviewContent}>
                    <Text style={styles.notificationPreviewTitle} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationPreviewMessage} numberOfLines={1}>
                      {notification.message}
                    </Text>
                  </View>
                  
                  {!notification.isRead && (
                    <View style={styles.unreadPreviewDot} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            UTM ReMerit Student Dashboard
          </Text>
          <Text style={styles.footerSubtext}>
            Make every day a recycling day • Last sync: {new Date().toLocaleTimeString()}
          </Text>
          {connectionError && (
            <Text style={styles.errorText}>
              ⚠️ Some data may not be up to date
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <NotificationModal />
      <LayoutConfigurationModal />
    </SafeAreaView>
  );
};

// ============ STYLES ============

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 18,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A5F7A',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    marginRight: 8,
  },
  profileIcon: {
    fontSize: 20,
    color: '#666',
  },
  notificationButton: {
    position: 'relative',
    marginRight: 8,
    padding: 4,
  },
  notificationIcon: {
    fontSize: 24,
    color: '#666',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: 4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  layoutButton: {
    marginRight: 8,
  },
  layoutIcon: {
    fontSize: 22,
    color: '#666',
  },
  refreshButton: {
    padding: 4,
  },
  refreshButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A5F7A',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  welcomeDate: {
    fontSize: 12,
    color: '#999',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  streakIcon: {
    fontSize: 15,
    marginRight: 5,
  },
  streakText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '500',
  },
  welcomeIcon: {
    marginRight: 4,
  },
  recycleIcon: {
    fontSize: 50,
  },
  suggestionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: '#f8f8f8',
  },
  suggestionIcon: {
    fontSize: 26,
    fontWeight: '600',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1D1D1F',
  },
  suggestionMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 14,
    lineHeight: 20,
  },
  suggestionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    width: (width - 25) / 2.2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  recycleButton: {
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
  },
  mapButton: {
    borderTopWidth: 4,
    borderTopColor: '#ff0c30ff',
  },
  eventsButton: {
    borderTopWidth: 4,
    borderTopColor: '#2196F3',
  },
  leaderboardButton: {
    borderTopWidth: 4,
    borderTopColor: '#9C27B0',
  },
  trackButton: {
    borderTopWidth: 4,
    borderTopColor: '#FF9800',
  },
  performanceButton: {
    borderTopWidth: 4,
    borderTopColor: '#3F51B5',
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
  },
  // ============ CARD STYLES ============
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  chartCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  leaderboardCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  eventsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  activitiesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#795548',
  },
  notificationsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#607D8B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCardHeader: {
  },
  cardHeaderIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
    color: '#333',
  },
  viewAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  twoRowStatsContainer: {
    marginBottom: 20,
  },
  twoRowStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  twoRowStatItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  twoRowStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  twoRowStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A5F7A',
    marginBottom: 4,
  },
  twoRowStatLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  zeroPointsNote: {
    fontSize: 9,
    color: '#FF9800',
    marginTop: 2,
    fontStyle: 'italic',
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  rankText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  progressValue: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  chartBarContainer: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  chartBarWrapper: {
    height: 100,
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  chartLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  chartValue: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  eventsList: {
    marginTop: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  eventDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  eventDay: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  eventMonth: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  eventDetails: {
    flex: 1,
    paddingRight: 20,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 0,
    lineHeight: 18,
  },
  eventCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventLocation: {
    fontSize: 13,
    color: '#999',
  },
  eventPoints: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  registeredBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  registeredText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  registerButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  registerText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  // ============ ACTIVITIES STYLES ============
  activitiesList: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 18,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  activityPoints: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  // ============ NOTIFICATIONS STYLES ============
  notificationsList: {
    marginTop: 8,
  },
  notificationPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationPreviewIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 30,
  },
  notificationPreviewContent: {
    flex: 1,
  },
  notificationPreviewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  notificationPreviewMessage: {
    fontSize: 12,
    color: '#666',
  },
  unreadPreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  // ============ FOOTER ============
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#999',
  },
  errorText: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 4,
  },
  // ============ NOTIFICATION MODAL STYLES ============
  notificationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  notificationModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    paddingBottom: 20,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  notificationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
    color: '#666',
  },
  notificationModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  markAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledText: {
    color: '#999',
  },
  refreshNotifButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
  },
  refreshNotifText: {
    color: '#666',
    fontSize: 14,
  },
  noNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  noNotificationsIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  noNotificationsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  noNotificationsSubtext: {
    fontSize: 14,
    color: '#999',
  },
  notificationScrollView: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderRadius: 6,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  unreadNotificationItem: {
    borderColor: '#2196F3',
    backgroundColor: '#F0F8FF',
  },
  notificationItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  notificationTitleContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  unreadNotificationTitle: {
    fontWeight: 'bold',
    color: '#1A5F7A',
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  markReadButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    marginRight: 8,
  },
  markReadText: {
    color: '#4CAF50',
    fontSize: 12,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  deleteText: {
    color: '#F44336',
    fontSize: 12,
  },
  // ============ LAYOUT MODAL STYLES ============
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalLoading: {
    alignItems: 'center',
    padding: 40,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resetButton: {
    backgroundColor: '#FFE0E0',
  },
  saveButton: {
    backgroundColor: '#1A5F7A',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#F44336',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  widgetOrderList: {
    marginBottom: 20,
  },
  widgetOrderItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  widgetOrderItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetOrderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  widgetOrderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  widgetOrderName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  widgetOrderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsInfo: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginTop: 10,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  statsNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default StudentHomeScreen;
