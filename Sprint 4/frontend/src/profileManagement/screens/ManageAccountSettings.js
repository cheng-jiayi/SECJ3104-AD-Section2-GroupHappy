import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, StackActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accountApi, validation } from '../services/api';

// Color Constants
const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  secondary: '#2196F3',
  danger: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#2196F3',
  light: '#F5F9F5',
  white: '#FFFFFF',
  gray: '#666',
  lightGray: '#E0E0E0',
  lightGreen: '#E8F5E8',
  lightBlue: '#E3F2FD',
  lightRed: '#FFEBEE',
  lightYellow: '#FFF3E0'
};

// Constants
const PROFILE_UPDATED_EVENT = 'profileDataUpdated';

function ManageAccountSettings() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // State variables
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  
  // Account settings data
  const [accountSettings, setAccountSettings] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    recycleReminders: true,
    pointUpdates: true,
    promotionalOffers: false,
  });

  // Get parameters
  const studentId = route.params?.studentId || 'U022';
  const isAdminView = route.params?.isAdminView || false;
  const studentName = route.params?.studentName || 'Current User';

  // REAL-TIME SYNC: Listen for profile data updates
  useEffect(() => {
    const handleProfileUpdate = (eventData) => {
      console.log('Profile data updated event received:', eventData);
      if (!eventData || !eventData.userId || eventData.userId === studentId) {
        console.log('Refreshing account settings...');
        loadAccountSettings();
      }
    };

    const subscription = DeviceEventEmitter.addListener(
      PROFILE_UPDATED_EVENT,
      handleProfileUpdate
    );

    return () => {
      subscription.remove();
    };
  }, [studentId]);

  // Load account settings on focus
  useFocusEffect(
    React.useCallback(() => {
      loadAccountSettings();
      return () => {};
    }, [studentId])
  );

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccountSettings();
    setRefreshing(false);
  };

  // Load account settings from backend
  const loadAccountSettings = async () => {
    setIsLoading(true);
    try {
      // Load notification preferences from AsyncStorage
      try {
        const savedPrefs = await AsyncStorage.getItem(`notification_prefs_${studentId}`);
        if (savedPrefs) {
          const parsedPrefs = JSON.parse(savedPrefs);
          console.log('Loaded notification prefs from storage:', parsedPrefs);
          setNotificationSettings(parsedPrefs);
        }
      } catch (storageError) {
        console.error('Error loading from storage:', storageError);
      }
      
      // Load from API
      const notificationData = await accountApi.getNotificationPreferences(studentId);
      console.log('Loaded notification data from API:', notificationData);
      
      const apiSettings = {
        emailNotifications: notificationData.emailNotifications !== undefined ? notificationData.emailNotifications : true,
        pushNotifications: notificationData.pushNotifications !== undefined ? notificationData.pushNotifications : true,
        recycleReminders: notificationData.recycleReminders !== undefined ? notificationData.recycleReminders : true,
        pointUpdates: notificationData.pointUpdates !== undefined ? notificationData.pointUpdates : true,
        promotionalOffers: notificationData.promotionalOffers !== undefined ? notificationData.promotionalOffers : false,
      };
      
      if (JSON.stringify(apiSettings) !== JSON.stringify(notificationSettings)) {
        console.log('API settings differ, updating...');
        setNotificationSettings(apiSettings);
        await AsyncStorage.setItem(`notification_prefs_${studentId}`, JSON.stringify(apiSettings));
      }
      
      // Get user basic info
      const userInfo = await accountApi.getUserBasicInfo(studentId);
      
      // For admin view, get current password separately
      let currentPasswordData = null;
      if (isAdminView) {
        try {
          currentPasswordData = await accountApi.getCurrentPassword(studentId);
        } catch (error) {
          console.error('Error fetching current password:', error);
        }
      }
      
      // Get basic account settings
      let basicSettings = null;
      try {
        basicSettings = await accountApi.getAccountSettings(studentId);
      } catch (error) {
        console.error('Error fetching account settings:', error);
        basicSettings = {};
      }
      
      // Combine all data
      const combinedSettings = {
        ...userInfo,
        ...basicSettings,
        ...notificationData,
        ...(currentPasswordData || {}),
        fullName: studentName || userInfo.fullName || basicSettings.fullName || 'User'
      };
      
      setAccountSettings(combinedSettings);
      
    } catch (error) {
      console.error('Error loading account settings:', error);
      
      // Fallback to demo data
      const fallbackSettings = {
        userID: studentId,
        fullName: studentName,
        email: 'ali.ahmad@graduate.utm.my',
        role: 'student',
        memberSince: '2023',
        emailNotifications: true,
        pushNotifications: true,
        recycleReminders: true,
        pointUpdates: true,
        promotionalOffers: false,
        preferencesUpdated: new Date().toISOString(),
        activeSessions: 2,
        lastLogin: new Date().toISOString(),
        lastDevice: 'Android Phone - Samsung Galaxy S23',
        currentPassword: 'password123',
        defaultPassword: 'password123'
      };
      
      setAccountSettings(fallbackSettings);
      
    } finally {
      setIsLoading(false);
    }
  };

  // Update notification preferences
  const updateNotificationPreferences = async () => {
    setIsUpdating(true);
    try {
      console.log('Saving notification settings:', notificationSettings);
      
      const prefsToSave = {
        ...notificationSettings,
        updatedDateTime: new Date().toISOString()
      };
      await AsyncStorage.setItem(`notification_prefs_${studentId}`, JSON.stringify(prefsToSave));
      
      const result = await accountApi.updateNotificationPreferences(studentId, notificationSettings);
      
      setSuccessMessage('Notification preferences updated successfully!');
      setShowSuccessModal(true);
      
      DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
        userId: studentId,
        updates: notificationSettings
      });
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error updating notifications:', error);
      setErrorMessage('Failed to update notification preferences');
      setShowErrorModal(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!currentPassword.trim() && !isAdminView) {
      setErrorMessage('Please enter your current password');
      setShowErrorModal(true);
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password');
      setShowErrorModal(true);
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long');
      setShowErrorModal(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match');
      setShowErrorModal(true);
      return;
    }

    setIsUpdating(true);
    try {
      if (isAdminView) {
        const result = await accountApi.changePasswordAsAdmin(studentId, newPassword);
        setSuccessMessage('Password updated successfully!');
        
        DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
          userId: studentId,
          passwordUpdated: true
        });
      } else {
        const result = await accountApi.changePassword(studentId, currentPassword, newPassword);
        setSuccessMessage('Password updated successfully!');
        
        DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
          userId: studentId,
          passwordUpdated: true
        });
      }
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error changing password:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to change password');
      setShowErrorModal(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle reset password to default (admin only)
  const handleResetPassword = async () => {
    setIsUpdating(true);
    try {
      const result = await accountApi.resetPasswordToDefault(studentId);
      
      setSuccessMessage('Password reset to default successfully!');
      setShowSuccessModal(true);
      setShowResetModal(false);
      
      DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
        userId: studentId,
        passwordReset: true
      });
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error resetting password:', error);
      setErrorMessage('Failed to reset password');
      setShowErrorModal(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle logout from all devices
  const handleLogoutAll = async () => {
    setIsUpdating(true);
    try {
      // Call logout API
      const result = await accountApi.logoutAllDevices(studentId);
      
      // For admin view: just show success message
      if (isAdminView) {
        setSuccessMessage('User logged out from all devices successfully!');
        setShowSuccessModal(true);
        setShowLogoutModal(false);
        
        DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
          userId: studentId,
          loggedOut: true
        });
        
        setTimeout(() => {
          setShowSuccessModal(false);
        }, 1500);
      } else {
        // For student view: navigate to login screen
        setSuccessMessage('Logged out successfully! Redirecting to login...');
        setShowSuccessModal(true);
        setShowLogoutModal(false);
        
        // Clear any local storage/session data
        try {
          await AsyncStorage.clear(); // Clear all AsyncStorage
        } catch (storageError) {
          console.error('Error clearing storage:', storageError);
        }
        
        setTimeout(() => {
          setShowSuccessModal(false);
          // Navigate to Login screen and reset navigation stack
          navigation.dispatch(
            StackActions.replace('Login')
          );
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error logging out:', error);
      setErrorMessage('Failed to logout from all devices');
      setShowErrorModal(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle reset all settings
  const handleResetAllSettings = async () => {
    setIsUpdating(true);
    try {
      const result = await accountApi.resetAllSettings(studentId);
      
      const defaultSettings = {
        emailNotifications: true,
        pushNotifications: true,
        recycleReminders: true,
        pointUpdates: true,
        promotionalOffers: false,
      };
      setNotificationSettings(defaultSettings);
      
      await AsyncStorage.setItem(`notification_prefs_${studentId}`, JSON.stringify(defaultSettings));
      
      setSuccessMessage('All settings reset to default values!');
      setShowSuccessModal(true);
      setShowResetAllModal(false);
      
      DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
        userId: studentId,
        resetAll: true
      });
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error resetting settings:', error);
      setErrorMessage('Failed to reset settings');
      setShowErrorModal(true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle notification toggle
  const toggleNotification = (setting) => {
    const newSettings = {
      ...notificationSettings,
      [setting]: !notificationSettings[setting]
    };
    console.log('Toggled notification setting:', setting, 'New value:', newSettings[setting]);
    setNotificationSettings(newSettings);
  };

  // Reset notification preferences to default
  const resetNotificationPreferences = () => {
    const defaultSettings = {
      emailNotifications: true,
      pushNotifications: true,
      recycleReminders: true,
      pointUpdates: true,
      promotionalOffers: false,
    };
    console.log('Resetting notification preferences to default');
    setNotificationSettings(defaultSettings);
  };

  // Navigation
  const goBack = () => {
    navigation.goBack();
  };

  // Show loading indicator
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading account settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primaryLight]}
            tintColor={COLORS.primaryLight}
          />
        }
      >
        {/* User Info Banner */}
        <View style={styles.userInfoBanner}>
          <Text style={styles.userName}>
            {accountSettings?.fullName || 'User'}
          </Text>
          <Text style={styles.userEmail}>
            {accountSettings?.email}
          </Text>
          <Text style={styles.userRole}>
            {accountSettings?.role === 'student' ? 'Student' : 'Admin'} • Member since {accountSettings?.memberSince || '2023'}
          </Text>
          <Text style={styles.syncStatus}>
            ✅ Real-time sync enabled • Updates reflect immediately
          </Text>
        </View>

        {/* Current Password Section (Admin View Only) */}
        {isAdminView && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Password</Text>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => setShowResetModal(true)}
                disabled={isUpdating}
              >
                <Text style={styles.resetButtonText}>Reset to Default</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.passwordInfo}>
              <Text style={styles.infoLabel}>User's Current Password:</Text>
              <Text style={styles.passwordValue}>
                {accountSettings?.currentPassword || 'password123'}
              </Text>
              <Text style={styles.defaultPasswordNote}>
                Default password: {accountSettings?.defaultPassword || 'password123'}
              </Text>
            </View>
          </View>
        )}

        {/* Change Password Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isAdminView ? 'Change Password (Admin)' : 'Change Password'}
            </Text>
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setShowChangePassword(!showChangePassword)}
              disabled={isUpdating}
            >
              <Text style={styles.toggleButtonText}>
                {showChangePassword ? 'Cancel' : 'Change'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showChangePassword && (
            <View style={styles.passwordForm}>
              {!isAdminView && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry
                    editable={!isUpdating}
                    placeholderTextColor="#999"
                  />
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry
                  editable={!isUpdating}
                  placeholderTextColor="#999"
                />
                <Text style={styles.passwordHint}>
                  • Must be at least 8 characters long
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry
                    editable={!isUpdating}
                    placeholderTextColor="#999"
                />
              </View>
              
              {isUpdating ? (
                <View style={styles.updatingContainer}>
                  <ActivityIndicator size="small" color={COLORS.primaryLight} />
                  <Text style={styles.updatingText}>Updating password...</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.savePasswordButton}
                  onPress={handlePasswordChange}
                >
                  <Text style={styles.savePasswordButtonText}>
                    {isAdminView ? 'Update User Password' : 'Update Password'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Notification Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <View style={styles.notificationHeaderButtons}>
              <TouchableOpacity 
                style={styles.resetNotificationsButton}
                onPress={resetNotificationPreferences}
                disabled={isUpdating}
              >
                <Text style={styles.resetNotificationsButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveNotificationsButton, isUpdating && styles.saveNotificationsButtonDisabled]}
                onPress={updateNotificationPreferences}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveNotificationsButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.notificationsList}>
            {/* Email Notifications */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>Email Notifications</Text>
                <Text style={styles.notificationDescription}>
                  Receive updates via email
                </Text>
              </View>
              <Switch
                value={notificationSettings.emailNotifications}
                onValueChange={() => toggleNotification('emailNotifications')}
                trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                thumbColor={notificationSettings.emailNotifications ? COLORS.primaryLight : '#f4f3f4'}
                disabled={isUpdating}
              />
            </View>
            
            {/* Push Notifications */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>Push Notifications</Text>
                <Text style={styles.notificationDescription}>
                  Receive push notifications on device
                </Text>
              </View>
              <Switch
                value={notificationSettings.pushNotifications}
                onValueChange={() => toggleNotification('pushNotifications')}
                trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                thumbColor={notificationSettings.pushNotifications ? COLORS.primaryLight : '#f4f3f4'}
                disabled={isUpdating}
              />
            </View>
            
            {/* Recycle Reminders */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>Recycle Reminders</Text>
                <Text style={styles.notificationDescription}>
                  Get reminders to recycle items
                </Text>
              </View>
              <Switch
                value={notificationSettings.recycleReminders}
                onValueChange={() => toggleNotification('recycleReminders')}
                trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                thumbColor={notificationSettings.recycleReminders ? COLORS.primaryLight : '#f4f3f4'}
                disabled={isUpdating}
              />
            </View>
            
            {/* Point Updates */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>Point Updates</Text>
                <Text style={styles.notificationDescription}>
                  Notify when points are added
                </Text>
              </View>
              <Switch
                value={notificationSettings.pointUpdates}
                onValueChange={() => toggleNotification('pointUpdates')}
                trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                thumbColor={notificationSettings.pointUpdates ? COLORS.primaryLight : '#f4f3f4'}
                disabled={isUpdating}
              />
            </View>
            
            {/* Promotional Offers */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>Promotional Offers</Text>
                <Text style={styles.notificationDescription}>
                  Receive special offers and promotions
                </Text>
              </View>
              <Switch
                value={notificationSettings.promotionalOffers}
                onValueChange={() => toggleNotification('promotionalOffers')}
                trackColor={{ false: '#767577', true: COLORS.primaryLight }}
                thumbColor={notificationSettings.promotionalOffers ? COLORS.primaryLight : '#f4f3f4'}
                disabled={isUpdating}
              />
            </View>
          </View>
          
          <Text style={styles.autoSaveNote}>
            ⓘ Notification settings sync in real-time across all screens
          </Text>
        </View>

        {/* Admin Actions Section */}
        {isAdminView && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            
            <TouchableOpacity 
              style={[styles.adminActionButton, styles.logoutUserButton]}
              onPress={() => setShowLogoutModal(true)}
              disabled={isUpdating}
            >
              <Text style={styles.adminActionButtonText}>Log User Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.adminActionButton, styles.resetAllButton]}
              onPress={() => setShowResetAllModal(true)}
              disabled={isUpdating}
            >
              <Text style={styles.adminActionButtonText}>Reset All Settings</Text>
            </TouchableOpacity>
            
            <View style={styles.adminActionsDescription}>
              <Text style={styles.adminActionDescription}>
                • Log Out: Signs user out from all devices (real-time sync)
              </Text>
              <Text style={styles.adminActionDescription}>
                • Reset All: Resets all settings (password & notifications) to default (real-time sync)
              </Text>
            </View>
          </View>
        )}

        {/* Log Out Section (Student View Only) */}
        {!isAdminView && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Actions</Text>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={() => setShowLogoutModal(true)}
              disabled={isUpdating}
            >
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </TouchableOpacity>
            <Text style={styles.logoutHint}>
              This will sign you out from all devices and redirect to login screen
            </Text>
          </View>
        )}

        {/* Database Status Info */}
        <View style={styles.databaseStatus}>
          <Text style={styles.databaseStatusText}>
            ℹ️ Real-time data synchronization enabled
          </Text>
          <Text style={styles.databaseStatusSubtext}>
            Changes made here are reflected immediately in all views (admin & student)
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <Text style={styles.syncNote}>Changes are syncing across all screens</Text>
            <TouchableOpacity 
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showErrorModal}
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.errorModal}>
            <Text style={styles.errorIcon}>❌</Text>
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.errorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmIcon}>⚠️</Text>
            <Text style={styles.confirmTitle}>
              {isAdminView ? 'Log User Out' : 'Confirm Log Out'}
            </Text>
            <Text style={styles.confirmMessage}>
              {isAdminView 
                ? `Are you sure you want to log ${studentName} out?\n\nThis will sign the user out from all devices and they will need to sign in again. Changes sync in real-time.`
                : 'Are you sure you want to log out?\n\nYou will be signed out from all devices and redirected to the login screen.'}
            </Text>
            <View style={styles.confirmButtonContainer}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmActionButton]}
                onPress={handleLogoutAll}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.confirmActionButtonText}>
                    {isAdminView ? 'Log Out User' : 'Log Out'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Confirmation Modal (Admin Only) */}
      {isAdminView && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showResetModal}
          onRequestClose={() => setShowResetModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmIcon}>🔄</Text>
              <Text style={styles.confirmTitle}>Reset Password</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to reset password to default ({accountSettings?.defaultPassword || 'password123'})?
              </Text>
              <Text style={styles.confirmNote}>Changes will sync in real-time</Text>
              <View style={styles.confirmButtonContainer}>
                <TouchableOpacity 
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => setShowResetModal(false)}
                  disabled={isUpdating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmButton, styles.confirmActionButton]}
                  onPress={handleResetPassword}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.confirmActionButtonText}>Reset</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reset All Settings Confirmation Modal (Admin Only) */}
      {isAdminView && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showResetAllModal}
          onRequestClose={() => setShowResetAllModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmIcon}>⚠️</Text>
              <Text style={styles.confirmTitle}>Reset All Settings</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to reset ALL settings to default values?{'\n\n'}This will:{'\n'}• Reset password to default{'\n'}• Reset all notification preferences{'\n'}• Log out from all devices
              </Text>
              <Text style={styles.confirmNote}>All changes sync in real-time across screens</Text>
              <View style={styles.confirmButtonContainer}>
                <TouchableOpacity 
                  style={[styles.confirmButton, styles.cancelButton]}
                  onPress={() => setShowResetAllModal(false)}
                  disabled={isUpdating}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmButton, styles.confirmActionButton]}
                  onPress={handleResetAllSettings}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.confirmActionButtonText}>Reset All</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.primary,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  adminSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  userInfoBanner: {
    backgroundColor: COLORS.primaryLight,
    padding: 20,
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 5,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 12,
    color: '#C8E6C9',
    textAlign: 'center',
  },
  syncStatus: {
    fontSize: 10,
    color: '#E8F5E8',
    marginTop: 5,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  passwordInfo: {
    backgroundColor: COLORS.light,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 5,
  },
  passwordValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 5,
  },
  defaultPasswordNote: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  resetButton: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleButton: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  passwordForm: {
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  passwordHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
    fontStyle: 'italic',
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  updatingText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.gray,
  },
  savePasswordButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  savePasswordButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  notificationHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetNotificationsButton: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  resetNotificationsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  saveNotificationsButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveNotificationsButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  saveNotificationsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsList: {
    marginTop: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  notificationInfo: {
    flex: 1,
    marginRight: 10,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 12,
    color: COLORS.gray,
  },
  autoSaveNote: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 15,
    padding: 8,
    backgroundColor: COLORS.lightYellow,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  adminActionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
  },
  logoutUserButton: {
    backgroundColor: COLORS.danger,
  },
  resetAllButton: {
    backgroundColor: COLORS.warning,
  },
  adminActionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  adminActionsDescription: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  adminActionDescription: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutHint: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  databaseStatus: {
    backgroundColor: COLORS.lightBlue,
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  databaseStatusText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    marginBottom: 5,
    textAlign: 'center',
  },
  databaseStatusSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  successModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  successIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  syncNote: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  successButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  errorIcon: {
    fontSize: 50,
    marginBottom: 15,
    color: COLORS.danger,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  confirmIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.danger,
    marginBottom: 10,
  },
  confirmMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
  },
  confirmNote: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 25,
  },
  confirmButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  confirmActionButton: {
    backgroundColor: COLORS.danger,
  },
  cancelButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmActionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManageAccountSettings;