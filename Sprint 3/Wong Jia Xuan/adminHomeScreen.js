import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  StatusBar,
  ActivityIndicator,
  Switch,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// API Configuration - Use the same as App.js
const NODE_API_BASE_URL = 'http://localhost:3000';
const FLASK_API_BASE_URL = 'http://localhost:5000';

const AdminHomeScreen = ({ route, ...props }) => {
  const navigation = useNavigation();
  
  // Get user from props (passed from App.js)
  const user = props.user || route.params?.user;
  
  console.log('🔍 AdminHomeScreen - User data:', {
    hasUser: !!user,
    userId: user?.userID,
    username: user?.username,
    role: user?.role,
    fullName: user?.fullName
  });
  
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [categoryPerformance, setCategoryPerformance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  
  // Layout Personalization States
  const [layoutModalVisible, setLayoutModalVisible] = useState(false);
  const [layoutConfig, setLayoutConfig] = useState({
    showWelcomeCard: true,
    showQuickActions: true,
    showCategoryPerformance: true,
    showUpcomingEvents: true,
    showNotifications: true,
  });
  const [savingLayout, setSavingLayout] = useState(false);

  // Notification Modal State
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

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
      console.log('📊 Fetching dashboard data for admin:', user.fullName);

      // Fetch upcoming events
      try {
        const eventsResponse = await fetch(`${NODE_API_BASE_URL}/api/events/upcoming`, { 
          timeout: 10000 
        });
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          if (eventsData.success && eventsData.events) {
            setUpcomingEvents(eventsData.events);
            console.log('✅ Upcoming events loaded');
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching upcoming events:', error.message);
      }

      // Fetch category performance
      try {
        const categoryResponse = await fetch(`${FLASK_API_BASE_URL}/api/campaigns/category-performance`, { 
          timeout: 10000 
        });
        
        if (categoryResponse.ok) {
          const categoryData = await categoryResponse.json();
          console.log('📊 Category performance response:', JSON.stringify(categoryData, null, 2));
          
          if (categoryData.success && categoryData.performance) {
            setCategoryPerformance(categoryData.performance);
            console.log('✅ Category performance loaded');
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching category performance:', error.message);
        // Set default category performance
        setCategoryPerformance([
          {
            eventCategory: 'Recycling Drive',
            totalCampaigns: 3,
            completedCampaigns: 3,
            totalParticipants: 21,
            totalPointsCollected: 1950,
            avgGoalPercent: 100.0,
            avgPointsPerParticipant: 92.86
          },
          {
            eventCategory: 'Clean-Up Campaign',
            totalCampaigns: 3,
            completedCampaigns: 3,
            totalParticipants: 13,
            totalPointsCollected: 1300,
            avgGoalPercent: 100.0,
            avgPointsPerParticipant: 100.0
          }
        ]);
      }

      // Fetch notifications
      try {
        const notifResponse = await fetch(`${FLASK_API_BASE_URL}/api/notifications?userID=${user.userID}&limit=10`, {
          timeout: 10000
        });
        
        if (notifResponse.ok) {
          const notifData = await notifResponse.json();
          if (notifData.success) {
            const sortedNotifications = (notifData.notifications || []).sort((a, b) => {
              if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
              return new Date(b.createdDate) - new Date(a.createdDate);
            });
            
            setNotifications(sortedNotifications);
            setUnreadNotifications(notifData.unreadCount || 0);
            console.log('✅ Notifications loaded');
          }
        }
      } catch (error) {
        console.log('⚠️ Error fetching notifications:', error.message);
        // Set default notifications
        setNotifications([
          {
            notificationID: 'NOTIF001',
            title: 'Welcome to UTM ReMerit Admin',
            message: 'Your admin account has been successfully activated.',
            typeName: 'system',
            isRead: false,
            createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ]);
        setUnreadNotifications(1);
      }

      // Fetch layout preferences
      try {
        const layoutResponse = await fetch(`${FLASK_API_BASE_URL}/api/userpreferencelayout/${user.userID}`, {
          timeout: 10000
        });
        
        if (layoutResponse.ok) {
          const layoutData = await layoutResponse.json();
          console.log('📊 Layout preferences response:', JSON.stringify(layoutData, null, 2));
          
          if (layoutData.success && layoutData.preferences) {
            const preferences = layoutData.preferences;
            
            // Parse the JSON string if it's stored as a string
            let layoutConfigData;
            
            if (typeof preferences.layoutConfig === 'string') {
              layoutConfigData = JSON.parse(preferences.layoutConfig);
            } else {
              layoutConfigData = preferences.layoutConfig || {};
            }
            
            // Update state with fetched preferences
            setLayoutConfig(layoutConfigData);
            
            console.log('✅ Layout preferences loaded from database:', {
              layoutConfig: layoutConfigData,
            });
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
        timeout: 10000,
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
        timeout: 10000,
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
        timeout: 10000,
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
        widgetOrder: [], // Empty since we removed widget ordering
        theme: 'light', // Fixed theme
        fontSize: 'medium',
      };
      
      console.log('💾 Saving layout preferences:', layoutData);
      
      // Save to server - userpreferencelayout table
      const response = await fetch(`${FLASK_API_BASE_URL}/api/userpreferencelayout/${user.userID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutData),
        timeout: 10000,
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('💾 Save response:', data);
        
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
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        Alert.alert('Error', 'Server error occurred. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving layout preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Check server connection.');
    } finally {
      setSavingLayout(false);
    }
  };

  // Navigation functions
  const navigateToCreateEvent = () => {
    navigation.navigate('EventList', { user });
  };

  const navigateToCampaignAnalytics = () => {
    navigation.navigate('CampaignAnalytics', { user });
  };

  const navigateToDecisionMaking = () => {
    navigation.navigate('ModuleDashboard', { user });
  };

  const navigateToReportManagement = () => {
    navigation.navigate('GenerateReport', { user });
  };

  const navigateToProfile = () => {
    navigation.navigate('StudentList', { user });
  };

  const navigateToCampaignDetail = (campaignId) => {
    navigation.navigate('CampaignDetail', { 
      campaignId,
      user 
    });
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'system': return '⚙️';
      case 'event': return '📅';
      case 'report': return '📊';
      case 'user': return '👤';
      case 'campaign': return '📈';
      default: return '🔔';
    }
  };

  const getWidgetName = (widgetKey) => {
    const names = {
      showWelcomeCard: 'Welcome Card',
      showQuickActions: 'Quick Actions',
      showCategoryPerformance: 'Category Performance',
      showUpcomingEvents: 'Upcoming Events',
      showNotifications: 'Notifications',
    };
    return names[widgetKey] || widgetKey;
  };

  const getWidgetIcon = (widgetKey) => {
    const icons = {
      showWelcomeCard: '👋',
      showQuickActions: '🚀',
      showCategoryPerformance: '📈',
      showUpcomingEvents: '📅',
      showNotifications: '🔔',
    };
    return icons[widgetKey] || '📦';
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

  // Layout Configuration Modal
  const LayoutConfigurationModal = () => {
    const [localTempConfig, setLocalTempConfig] = useState(layoutConfig);
    const widgetList = useRef([
      { key: 'showWelcomeCard', name: 'Welcome Card', icon: '👋' },
      { key: 'showQuickActions', name: 'Quick Actions', icon: '🚀' },
      { key: 'showCategoryPerformance', name: 'Category Performance', icon: '📈' },
      { key: 'showUpcomingEvents', name: 'Upcoming Events', icon: '📅' },
      { key: 'showNotifications', name: 'Notifications', icon: '🔔' },
    ]);

    // Update local state when modal opens or layoutConfig changes
    useEffect(() => {
      if (layoutModalVisible) {
        setLocalTempConfig(layoutConfig);
      }
    }, [layoutModalVisible, layoutConfig]);

    const handleToggleWidget = (widgetKey) => {
      console.log(`Toggling ${widgetKey} from ${localTempConfig[widgetKey]} to ${!localTempConfig[widgetKey]}`);
      setLocalTempConfig(prev => ({
        ...prev,
        [widgetKey]: !prev[widgetKey]
      }));
    };

    const handleSave = () => {
      console.log('Saving layout config:', localTempConfig);
      saveLayoutChanges(localTempConfig);
    };

    const handleReset = () => {
      const defaultConfig = {
        showWelcomeCard: true,
        showQuickActions: true,
        showCategoryPerformance: true,
        showUpcomingEvents: true,
        showNotifications: true,
      };
      console.log('Resetting to default:', defaultConfig);
      setLocalTempConfig(defaultConfig);
    };

    const handleCancel = () => {
      console.log('Cancelling changes');
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
                    {widgetList.current.map((widget) => (
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
    console.log('❌ No user data - showing loading screen');
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
    console.log('⏳ Loading dashboard data...');
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

  console.log('✅ Dashboard ready to render for user:', user.fullName);
  console.log('📊 Current layout config:', layoutConfig);

  // ============ RENDER HEADER ============

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userRole}>{user.role} • {user.adminID || user.studentID}</Text>
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
              <Text style={styles.welcomeTitle}>UTM ReMerit Admin Dashboard</Text>
              <Text style={styles.welcomeSubtitle}>
                Welcome, {user.fullName}.
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Manage campaigns, users and analytics.
              </Text>
              <Text style={styles.welcomeDate}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <View style={styles.welcomeIcon}>
              <Text style={styles.recycleIcon}>♻️</Text>
            </View>
          </View>
        )}

        {/* Quick Actions - Only 4 buttons */}
        {layoutConfig.showQuickActions && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.createEventButton]}
              onPress={navigateToCreateEvent}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.actionIcon}>➕</Text>
              </View>
              <Text style={styles.actionButtonText}>Create Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.campaignAnalyticsButton]}
              onPress={navigateToCampaignAnalytics}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#2196F3' }]}>
                <Text style={styles.actionIcon}>📈</Text>
              </View>
              <Text style={styles.actionButtonText}>Campaign Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.userManagementButton]}
              onPress={navigateToDecisionMaking }
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#FF9800' }]}>
                <Text style={styles.actionIcon}>👥</Text>
              </View>
              <Text style={styles.actionButtonText}>Decision Making Helpers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.reportManagementButton]}
              onPress={navigateToReportManagement}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#9C27B0' }]}>
                <Text style={styles.actionIcon}>📋</Text>
              </View>
              <Text style={styles.actionButtonText}>Report Management</Text>
            </TouchableOpacity>
          </View>
        )}
      
        {/* Category Performance */}
        {layoutConfig.showCategoryPerformance && categoryPerformance.length > 0 && (
          <View key="categoryPerformance" style={[styles.card, styles.categoryPerformanceCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>📈</Text>
              <Text style={styles.cardTitle}>Category Performance</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CampaignAnalytics', { user })}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.categoryList}>
              {categoryPerformance.slice(0, 3).map((category, index) => {
                // Safely get values
                const goalPercent = category.avgGoalPercent || category.avgGoalAchievement || 0;
                const participants = category.totalParticipants || 0;
                
                return (
                  <View key={index} style={styles.categoryItem}>
                    <View style={styles.categoryLeft}>
                      <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(index) }]}>
                        <Text style={styles.categoryIconText}>
                          {getCategoryIcon(category.eventCategory)}
                        </Text>
                      </View>
                      <View style={styles.categoryInfo}>
                        <Text style={styles.categoryName}>{category.eventCategory || 'Unknown'}</Text>
                        <Text style={styles.categoryMeta}>
                          {category.totalCampaigns || 0} campaigns
                        </Text>
                      </View>
                    </View>
                    <View style={styles.categoryRight}>
                      <Text style={styles.categoryGoal}>
                        {typeof goalPercent === 'number' ? goalPercent.toFixed(1) : '0.0'}%
                      </Text>
                      <Text style={styles.categoryParticipants}>
                        {participants} participants
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Upcoming Events */}
        {layoutConfig.showUpcomingEvents && upcomingEvents.length > 0 && (
          <View key="upcomingEvents" style={[styles.card, styles.eventsCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>📅</Text>
              <Text style={styles.cardTitle}>Upcoming Events</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CampaignAnalytics', { user })}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.eventsList}>
              {upcomingEvents.slice(0, 3).map((event, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.eventItem}
                  onPress={() => navigateToCampaignDetail(event.eventID)}
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
                    <Text style={styles.eventPoints}>{event.rewardPoints} points</Text>
                  </View>
                  <Text style={styles.chevronIcon}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notifications Preview */}
        {layoutConfig.showNotifications && notifications.length > 0 && (
          <View key="notifications" style={[styles.card, styles.notificationsCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>🔔</Text>
              <Text style={styles.cardTitle}>Recent Notifications</Text>
              <TouchableOpacity onPress={() => setNotificationModalVisible(true)}>
                <Text style={styles.viewAllText}>
                  View All ({unreadNotifications} unread)
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.notificationsList}>
              {notifications.slice(0, 3).map((notification, index) => (
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
            UTM ReMerit Admin Dashboard
          </Text>
          <Text style={styles.footerSubtext}>
            Connected to database • Last sync: {new Date().toLocaleTimeString()}
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

// ============ HELPER FUNCTIONS ============

const getCategoryColor = (index) => {
  const colors = ['#FF9800', '#2196F3', '#4CAF50', '#9C27B0', '#795548'];
  return colors[index % colors.length];
};

const getCategoryIcon = (category) => {
  switch (category?.toLowerCase()) {
    case 'recycling drive': return '♻️';
    case 'clean-up campaign': return '🧹';
    case 'awareness talk': return '🗣️';
    case 'sustainable transport': return '🚲';
    case 'conservation': return '🌿';
    default: return '📋';
  }
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
  welcomeIcon: {
    marginRight: 6,
  },
  recycleIcon: {
    fontSize: 50,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createEventButton: {
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
  },
  campaignAnalyticsButton: {
    borderTopWidth: 4,
    borderTopColor: '#2196F3',
  },
  userManagementButton: {
    borderTopWidth: 4,
    borderTopColor: '#FF9800',
  },
  reportManagementButton: {
    borderTopWidth: 4,
    borderTopColor: '#9C27B0',
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
    marginBottom: 4,
    fontSize: 26,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#1A5F7A',
  },
  categoryPerformanceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  eventsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notificationsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
    color: '#333',
  },
  refreshButton: {
    padding: 4,
  },
  refreshIcon: {
    fontSize: 20,
    color: '#1A5F7A',
  },
  viewAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: (width - 64) / 2,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconText: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  categoryList: {},
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryIconText: {
    fontSize: 16,
    color: '#fff',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  categoryMeta: {
    fontSize: 12,
    color: '#666',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryGoal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A5F7A',
    marginBottom: 2,
  },
  categoryParticipants: {
    fontSize: 12,
    color: '#666',
  },
  eventsList: {},
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
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
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  eventCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  eventPoints: {
    fontSize: 11,
    color: '#FF9800',
  },
  chevronIcon: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  notificationsList: {},
  notificationPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  notificationPreviewIcon: {
    fontSize: 20,
    marginRight: 12,
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
  // Notification Modal Styles
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
  // Layout Modal Styles
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
});

export default AdminHomeScreen;
