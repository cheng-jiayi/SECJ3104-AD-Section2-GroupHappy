import axios from 'axios';

const TEST_URLS = [
  'http://10.0.2.2:8081',
];

let currentApiUrl = 'http://10.0.2.2:8081';

export const setApiUrl = (url) => {
  currentApiUrl = url;
};

export const getApiUrl = () => {
  return currentApiUrl;
};

const testConnection = async () => {
  for (const url of TEST_URLS) {
    try {
      console.log(`🔍 Testing connection to: ${url}`);
      const response = await axios.get(`${url}`, { timeout: 5000 });
      console.log(`✅ Successfully connected to: ${url}`);
      setApiUrl(url);
      return url;
    } catch (error) {
      console.log(`❌ Failed to connect to: ${url}`, error.message);
    }
  }
  
  console.log('❌ All connection attempts failed');
  return null;
};

export default testConnection;