import axios from 'axios';

// For Android emulator, use 10.0.2.2 instead of localhost
const API_BASE_URL = 'http://10.0.2.2:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Get nearby bins from database
export const getNearbyBins = async (latitude, longitude, radius = 2) => {
  try {
    const response = await api.get('/bins/nearby', {
      params: { latitude, longitude, radius }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nearby bins:', error);
    throw error;
  }
};

// Filter bins by type
export const filterBinsByType = async (binType, latitude = null, longitude = null) => {
  try {
    const params = { bin_type: binType };
    if (latitude && longitude) {
      params.latitude = latitude;
      params.longitude = longitude;
    }
    const response = await api.get('/bins/filter', { params });
    return response.data;
  } catch (error) {
    console.error('Error filtering bins:', error);
    throw error;
  }
};

// Report bin issue
export const reportBinIssue = async (issueData) => {
  try {
    const response = await api.post('/issues/report', issueData);
    return response.data;
  } catch (error) {
    console.error('Error reporting issue:', error);
    throw error;
  }
};

// Get all bin types
export const getBinTypes = async () => {
  try {
    const response = await api.get('/bins/types');
    return response.data;
  } catch (error) {
    console.error('Error fetching bin types:', error);
    throw error;
  }
};

// Get bin details
export const getBinDetails = async (binId) => {
  try {
    const response = await api.get(`/bins/${binId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching bin details:', error);
    throw error;
  }
};

export default api;