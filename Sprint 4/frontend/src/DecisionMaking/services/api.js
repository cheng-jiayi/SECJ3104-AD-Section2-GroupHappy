import axios from 'axios';
import { Platform } from 'react-native';

// Configure base URL based on platform
const getBaseURL = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000/api/module3';
  } else if (Platform.OS === 'ios') {
    // For iOS simulator
    return 'http://10.0.2.2:3000/api/module3';
    // For iOS physical device (replace with your computer's IP)
    // return 'http://192.168.1.100:5003/api/module3';
  }
  return 'http://10.0.2.2:3000/api/module3';
};

const BASE_URL = getBaseURL();

console.log('API Base URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000, // Reduced from 30000 for faster failure detection
  headers: {
    'Content-Type': 'application/json',
    'x-admin-token': 'admin123',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request Timeout:', error.config.url);
      return Promise.reject(new Error('Request timeout. Please check your connection.'));
    }
    
    if (!error.response) {
      console.error('🌐 Network Error: No response from server');
      console.error('Is the backend server running? Check:', BASE_URL);
      return Promise.reject(new Error('Network error. Please check:\n1. Backend server is running\n2. Correct IP address\n3. Network connection'));
    }
    
    const { status, data } = error.response;
    console.error(`❌ API Error ${status}:`, data?.message || 'Unknown error');
    
    let errorMessage = `Server error (${status})`;
    if (data?.message) {
      errorMessage = data.message;
    }
    
    return Promise.reject(new Error(errorMessage));
  }
);

// Test connection function
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error.message);
    throw error;
  }
};

// UC29: Predict Recycling Trends
export const analyticsAPI = {
  getRecyclingTrends: (faculty, months) => 
    api.get('/trends', { params: { faculty, months } }),
  
  predictTrends: (faculty) => 
    api.get(`/trends/predict/${faculty}`),
  
  getMaterialTrends: (months) => 
    api.get('/trends/materials', { params: { months } })
};

// UC30: Detect Low Engagement Areas
export const engagementAPI = {
  getEngagementOverview: () => 
    api.get('/engagement'),
  
  detectLowEngagement: () => 
    api.get('/engagement/low-engagement'),
  
  getEngagementTrends: (months) => 
    api.get('/engagement/trends', { params: { months } }),
  
  getCampusZoneEngagement: () => 
    api.get('/engagement/zones')
};

// UC31: Generate Sustainability Insights & Recommendations
export const insightsAPI = {
  generateInsights: () => 
    api.get('/insights'),
  
  getRecommendations: () => 
    api.get('/recommendations'),
  
  getDashboardMetrics: () => 
    api.get('/dashboard-metrics'),
  
  getQuickInsights: () => 
    api.get('/quick-insights')
};

// Combined dashboard
export const dashboardAPI = {
  getModuleDashboard: () => 
    api.get('/dashboard')
};

// Health check
export const healthAPI = {
  checkHealth: () => 
    api.get('/health')
};

export default api;