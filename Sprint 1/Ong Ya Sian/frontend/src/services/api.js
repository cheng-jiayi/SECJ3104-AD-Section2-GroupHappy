import axios from 'axios';
import { getApiUrl } from './connectionTest';

const createApi = () => {
  const API_URL = getApiUrl();
  console.log('🌐 Using API URL:', API_URL);
  
  return axios.create({
    baseURL: API_URL,
    timeout: 10000,
  });
};

export const getEvents = async () => {
  try {
    const api = createApi();
    console.log('🔄 Fetching events from:', `${getApiUrl()}/events`);
    const response = await api.get('/events');
    console.log(`✅ Fetched ${response.data.length} events`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    throw new Error('Failed to fetch events. Please check server connection.');
  }
};

export const createEvent = async (eventData) => {
  try {
    const api = createApi();
    console.log('🔄 Creating event data:', eventData);
    
    const config = {};
    
    // For FormData, don't set Content-Type header (let browser set it with boundary)
    if (!(eventData instanceof FormData)) {
      // For JSON, set the Content-Type header
      config.headers = {
        'Content-Type': 'application/json',
      };
      console.log('📤 Sending as JSON');
    } else {
      console.log('📤 Sending as FormData');
    }
    
    const response = await api.post('/events/create', eventData, config);
    console.log('✅ Create event response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating event:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to create event');
    } else if (error.request) {
      throw new Error(`Network error. Cannot reach server at ${getApiUrl()}`);
    } else {
      throw new Error('Network error. Please check server connection.');
    }
  }
};

export const updateEvent = async (id, eventData) => {
  try {
    const api = createApi();
    console.log(`🔄 Updating event ${id}:`, eventData);
    
    const config = {};
    
    if (!(eventData instanceof FormData)) {
      config.headers = {
        'Content-Type': 'application/json',
      };
      console.log('📤 Sending as JSON');
    } else {
      console.log('📤 Sending as FormData');
    }
    
    const response = await api.put(`/events/update/${id}`, eventData, config);
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
