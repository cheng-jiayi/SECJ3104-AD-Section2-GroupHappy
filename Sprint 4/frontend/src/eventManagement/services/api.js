// frontend\src\eventManagement\services\api.js
import axios from 'axios';

// For Android emulator, use 10.0.2.2
const getApiUrl = () => {
  return 'http://10.0.2.2:3000'; // Default for Android emulator
};

// Create axios instance
const createApi = () => {
  const API_URL = getApiUrl();
  console.log('🌐 Using API URL:', API_URL);
  
  return axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// GET all events - FIXED: Remove the test connection part
export const getEvents = async () => {
  try {
    const api = createApi();
    console.log('🔄 Fetching events from:', `${getApiUrl()}/events`);
    
    // Just get events, no test connection
    const response = await api.get('/events');
    console.log(`✅ Fetched ${response.data.length} events`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      throw new Error(`Server error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received');
      throw new Error('Cannot connect to server. Make sure backend is running on port 3000.');
    } else {
      throw new Error('Network error. Please check connection.');
    }
  }
};

// CREATE event - FIXED: Use correct endpoint
// In your api.js file
export const createEvent = async (eventData) => {
    console.log('📤 Creating event:', {
        title: eventData.eventTitle,
        hasImage: !!eventData.eventImageBase64,
        imageLength: eventData.eventImageBase64 ? eventData.eventImageBase64.length : 0
    });
    
    try {
        // Try different endpoints
        const endpoints = [
            'http://10.0.2.2:3000/events/create',
            'http://10.0.2.2:3000/events',
            'http://10.0.2.2:3000/api/events/create'
        ];
        
        let lastError;
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔗 Trying endpoint: ${endpoint}`);
                const response = await axios.post(endpoint, eventData, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                });
                
                console.log(`✅ Success with endpoint: ${endpoint}`, response.data);
                return response.data;
            } catch (error) {
                lastError = error;
                console.log(`❌ Failed with ${endpoint}:`, error.message);
            }
        }
        
        // If all endpoints failed
        throw lastError;
        
    } catch (error) {
        console.error('❌ Event creation error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });
        
        if (error.response?.data?.error) {
            throw new Error(error.response.data.error);
        } else if (error.response?.data?.message) {
            throw new Error(error.response.data.message);
        }
        throw error;
    }
};

// UPDATE event - FIXED: Use correct endpoint
export const updateEvent = async (id, eventData) => {
  try {
    const api = createApi();
    console.log(`🔄 Updating event ${id}:`, eventData);
    
    const response = await api.put(`/events/update/${id}`, eventData);
    console.log('✅ Update event response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating event:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to update event');
    } else {
      throw new Error('Network error. Please check server connection.');
    }
  }
};

// DELETE event - FIXED: Use correct endpoint
export const deleteEvent = async (id) => {
  try {
    const api = createApi();
    console.log(`🔄 Deleting event ${id}`);
    
    const response = await api.delete(`/events/delete/${id}`);
    console.log('✅ Delete event response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to delete event');
    } else {
      throw new Error('Network error. Please check server connection.');
    }
  }
};

// Test connection - FIXED: Use /health endpoint instead of root
export const testConnection = async () => {
  try {
    const api = createApi();
    const response = await api.get('/health');
    console.log('✅ Connection test successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    throw error;
  }
};