import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Local development - connect to your local backend
const BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==================== UTILITY FUNCTIONS ====================

export const validation = {
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  validatePhone: (phone) => {
    const phoneRegex = /^[0-9+\-\s()]{8,}$/;
    return phoneRegex.test(phone);
  },
  
  validateMatric: (matric) => {
    const matricRegex = /^A\d{2}[A-Z]{2}\d{4}$/;
    return matricRegex.test(matric);
  }
};

// ==================== ERROR HANDLER ====================

const handleApiError = (error, context, fallbackData = null) => {
  console.error(`Error in ${context}:`, error.message);
  if (fallbackData !== null) {
    return fallbackData;
  }
  throw error;
};

// ==================== GLOBAL DATA STORE ====================

// Global store for real-time sync across screens
let globalProfileData = [];
let globalAccountSettings = [];
let globalStudents = [];

// Initialize with default data
const initializeGlobalData = () => {
  globalProfileData = [
    {
      userID: 'U022',
      fullName: 'Ali bin Ahmad',
      utmID: 'A23EN0001',
      email: 'ali.ahmad@graduate.utm.my',
      role: 'student',
      contactNumber: '010-8201396',
      address: 'L12a, KTHO, UTM SKUDAI',
      matricNo: 'A23EN0001',
      faculty: 'FKE',
      totalPoints: 1500,
      totalMerits: 120,
      totalItemsRecycled: 45,
      totalWeightRecycled: 67.5,
      memberSince: '2023',
      accountStatus: 'active',
      activeSessions: 2
    }
  ];

  globalAccountSettings = [
    {
      userID: 'U022',
      fullName: 'Ali bin Ahmad',
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
    }
  ];

  globalStudents = [
    {
      userID: 'U022',
      fullName: 'Ali bin Ahmad',
      utmID: 'A23EN0001',
      email: 'ali.ahmad@graduate.utm.my',
      matricNo: 'A23EN0001',
      faculty: 'FKE',
      totalPoints: 1500,
      totalMerits: 120,
      totalItemsRecycled: 45,
      totalWeightRecycled: 67.5,
      contactNumber: '010-8201396',
      address: 'L12a, KTHO, UTM SKUDAI',
      accountStatus: 'active',
      activeSessions: 2,
      memberSince: '2023'
    }
  ];
};

// Initialize on load
initializeGlobalData();

// ==================== GLOBAL SYNC FUNCTIONS ====================

// Update global data store
const updateGlobalProfileData = (userId, updates) => {
  console.log('Updating global profile data for user:', userId, updates);
  
  // Update globalProfileData
  const profileIndex = globalProfileData.findIndex(p => p.userID === userId);
  if (profileIndex > -1) {
    globalProfileData[profileIndex] = { ...globalProfileData[profileIndex], ...updates };
  } else {
    globalProfileData.push({ userID: userId, ...updates });
  }
  
  // Update globalAccountSettings
  const settingsIndex = globalAccountSettings.findIndex(s => s.userID === userId);
  if (settingsIndex > -1) {
    globalAccountSettings[settingsIndex] = { ...globalAccountSettings[settingsIndex], ...updates };
  } else {
    globalAccountSettings.push({ userID: userId, ...updates });
  }
  
  // Update globalStudents
  const studentIndex = globalStudents.findIndex(s => s.userID === userId);
  if (studentIndex > -1) {
    globalStudents[studentIndex] = { ...globalStudents[studentIndex], ...updates };
  } else {
    globalStudents.push({ userID: userId, ...updates });
  }
  
  console.log('Global data updated successfully');
};

// Get fresh data from global store
const getGlobalProfileData = (userId) => {
  return globalProfileData.find(p => p.userID === userId);
};

const getGlobalAccountSettings = (userId) => {
  return globalAccountSettings.find(s => s.userID === userId);
};

const getGlobalStudents = () => {
  return [...globalStudents];
};

// ==================== PROFILE API ====================

export const profileApi = {
  getProfile: async (userId) => {
    try {
      const response = await api.get(`/profile/${userId}`);
      
      if (response.data) {
        updateGlobalProfileData(userId, response.data);
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error, 'fetching profile', getGlobalProfileData(userId));
    }
  },

  updateProfile: async (userId, updates) => {
    try {
      console.log('Updating profile for user:', userId, updates);
      
      const response = await api.put(`/profile/${userId}`, updates);
      
      updateGlobalProfileData(userId, updates);
      
      console.log('Profile updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile in backend:', error);
      
      updateGlobalProfileData(userId, updates);
      
      return {
        success: true,
        message: 'Profile updated locally (backend unavailable)',
        updatedFields: updates
      };
    }
  },
};

// ==================== ACCOUNT SETTINGS API ====================

export const accountApi = {
  getAccountSettings: async (userId) => {
    try {
      const response = await api.get(`/account/${userId}/settings`);
      
      if (response.data) {
        updateGlobalProfileData(userId, response.data);
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error, 'fetching account settings', getGlobalAccountSettings(userId));
    }
  },

  getCurrentPassword: async (userId) => {
    try {
      const response = await api.get(`/account/${userId}/current-password`);
      return response.data;
    } catch (error) {
      const globalData = getGlobalAccountSettings(userId);
      return globalData ? {
        currentPassword: globalData.currentPassword || 'password123',
        defaultPassword: globalData.defaultPassword || 'password123'
      } : {
        currentPassword: 'password123',
        defaultPassword: 'password123'
      };
    }
  },

  getNotificationPreferences: async (userId) => {
    try {
      const storedPrefs = await AsyncStorage.getItem(`notification_prefs_${userId}`);
      if (storedPrefs) {
        return JSON.parse(storedPrefs);
      }
      
      const response = await api.get(`/account/${userId}/notifications`);
      
      if (response.data) {
        await AsyncStorage.setItem(`notification_prefs_${userId}`, JSON.stringify(response.data));
      }
      
      return response.data;
    } catch (error) {
      const globalData = getGlobalAccountSettings(userId);
      const defaultPrefs = {
        emailNotifications: true,
        pushNotifications: true,
        recycleReminders: true,
        pointUpdates: true,
        promotionalOffers: false,
        updatedDateTime: new Date().toISOString()
      };
      
      return globalData ? {
        emailNotifications: globalData.emailNotifications || true,
        pushNotifications: globalData.pushNotifications || true,
        recycleReminders: globalData.recycleReminders || true,
        pointUpdates: globalData.pointUpdates || true,
        promotionalOffers: globalData.promotionalOffers || false,
        updatedDateTime: new Date().toISOString()
      } : defaultPrefs;
    }
  },

  getUserBasicInfo: async (userId) => {
    try {
      const response = await api.get(`/account/${userId}/basic-info`);
      return response.data;
    } catch (error) {
      const globalData = getGlobalAccountSettings(userId);
      return globalData ? {
        userID: globalData.userID,
        fullName: globalData.fullName,
        email: globalData.email,
        role: globalData.role,
        memberSince: globalData.memberSince,
        lastLogin: globalData.lastLogin
      } : {
        userID: userId,
        fullName: 'Unknown User',
        email: 'unknown@graduate.utm.my',
        role: 'student',
        memberSince: '2023',
        lastLogin: new Date().toISOString()
      };
    }
  },

  updateNotificationPreferences: async (userId, preferences) => {
    try {
      console.log('Updating notification preferences:', userId, preferences);
      
      const prefsToSave = {
        ...preferences,
        updatedDateTime: new Date().toISOString()
      };
      await AsyncStorage.setItem(`notification_prefs_${userId}`, JSON.stringify(prefsToSave));
      
      const response = await api.put(`/account/${userId}/notifications`, prefsToSave);
      
      updateGlobalProfileData(userId, prefsToSave);
      
      return response.data;
    } catch (error) {
      const prefsToSave = {
        ...preferences,
        updatedDateTime: new Date().toISOString()
      };
      await AsyncStorage.setItem(`notification_prefs_${userId}`, JSON.stringify(prefsToSave));
      updateGlobalProfileData(userId, prefsToSave);
      
      return {
        success: true,
        message: 'Notification preferences saved locally',
        savedAt: new Date().toISOString()
      };
    }
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      const response = await api.put(`/account/${userId}/password`, {
        currentPassword,
        newPassword,
        isAdminAction: false
      });
      
      updateGlobalProfileData(userId, { currentPassword: newPassword });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  changePasswordAsAdmin: async (userId, newPassword) => {
    try {
      const response = await api.put(`/account/${userId}/password`, {
        newPassword,
        isAdminAction: true
      });
      
      updateGlobalProfileData(userId, { currentPassword: newPassword });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resetPasswordToDefault: async (userId) => {
    try {
      const response = await api.post(`/account/${userId}/reset-password`);
      
      updateGlobalProfileData(userId, { currentPassword: 'password123' });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  logoutAllDevices: async (userId) => {
    try {
      const response = await api.post(`/account/${userId}/logout-all`);
      
      updateGlobalProfileData(userId, { activeSessions: 0 });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resetAllSettings: async (userId) => {
    try {
      const response = await api.post(`/account/${userId}/reset-all`);
      
      await AsyncStorage.removeItem(`notification_prefs_${userId}`);
      
      const resetData = {
        currentPassword: 'password123',
        emailNotifications: true,
        pushNotifications: true,
        recycleReminders: true,
        pointUpdates: true,
        promotionalOffers: false,
        activeSessions: 0
      };
      updateGlobalProfileData(userId, resetData);
      
      return response.data;
    } catch (error) {
      await AsyncStorage.removeItem(`notification_prefs_${userId}`);
      const resetData = {
        currentPassword: 'password123',
        emailNotifications: true,
        pushNotifications: true,
        recycleReminders: true,
        pointUpdates: true,
        promotionalOffers: false,
        activeSessions: 0
      };
      updateGlobalProfileData(userId, resetData);
      
      return {
        success: true,
        message: 'Settings reset locally',
        resetAt: new Date().toISOString()
      };
    }
  },
};

// ==================== STUDENT MANAGEMENT API ====================

export const studentApi = {
  getAllStudents: async () => {
    try {
      const response = await api.get('/students');
      
      if (response.data && Array.isArray(response.data)) {
        globalStudents = [...response.data];
        
        response.data.forEach(student => {
          const existingProfile = globalProfileData.find(p => p.userID === student.userID);
          if (!existingProfile) {
            globalProfileData.push({ ...student });
          }
        });
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error, 'fetching all students', getGlobalStudents());
    }
  },

  addNewStudent: async (studentData) => {
    try {
      const response = await api.post('/students', studentData);
      
      const newStudent = {
        userID: response.data.userID || 'U' + Date.now().toString().slice(-6),
        ...studentData,
        totalPoints: 0,
        totalItemsRecycled: 0,
        totalWeightRecycled: 0,
        accountStatus: 'active',
        activeSessions: 0,
        memberSince: '2023'
      };
      
      globalStudents.push(newStudent);
      globalProfileData.push(newStudent);
      globalAccountSettings.push({
        userID: newStudent.userID,
        fullName: studentData.fullName,
        email: studentData.email,
        role: 'student',
        memberSince: '2023',
        emailNotifications: true,
        pushNotifications: true,
        recycleReminders: true,
        pointUpdates: true,
        promotionalOffers: false,
        preferencesUpdated: new Date().toISOString(),
        activeSessions: 0,
        lastLogin: new Date().toISOString(),
        lastDevice: 'New Device',
        currentPassword: 'password123',
        defaultPassword: 'password123'
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteStudent: async (userId) => {
    try {
      const response = await api.delete(`/student/${userId}`);
      
      globalStudents = globalStudents.filter(s => s.userID !== userId);
      globalProfileData = globalProfileData.filter(p => p.userID !== userId);
      globalAccountSettings = globalAccountSettings.filter(s => s.userID !== userId);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Health check function
export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Backend is not reachable:', error);
    return { status: 'unreachable', error: error.message };
  }
};

// Export global data access functions
export { 
  globalProfileData, 
  globalAccountSettings, 
  globalStudents, 
  updateGlobalProfileData,
  getGlobalProfileData,
  getGlobalAccountSettings,
  getGlobalStudents
};

export default api;