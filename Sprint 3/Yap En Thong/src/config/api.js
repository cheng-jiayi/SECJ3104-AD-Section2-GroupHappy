const API_CONFIG = {
    BASE_URL: 'http://localhost:5000/api', // Change to your computer's IP
    TIMEOUT: 10000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

export const API_ENDPOINTS = {
    LEADERBOARD: {
        WEEKLY: '/leaderboard/weekly',
        HALL_OF_FAME: '/leaderboard/hall-of-fame',
        CURRENT_USER: (utmID) => `/leaderboard/current-user/${utmID}`
    },
    REWARDS: {
        USER_DATA: (utmID) => `/rewards/user/${utmID}`,
        CONVERT: '/rewards/convert'
    },
    CONVERSIONS: {
        PENDING: '/conversions/pending',
        HISTORY: '/conversions/history',
        APPROVE: '/conversions/approve',
        REJECT: '/conversions/reject',
        SETTINGS: '/conversions/settings',
        UPDATE_RATE: '/conversions/settings/conversion-rate'
    },
    SYSTEM: {
        HEALTH: '/health',
        TEST: '/test'
    }
};

// Helper function for API calls
export const apiCall = async (endpoint, method = 'GET', data = null) => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const options = {
        method,
        headers: API_CONFIG.HEADERS,
        timeout: API_CONFIG.TIMEOUT
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        console.log(`📡 API Call: ${method} ${url}`);
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('❌ API Error:', error.message);
        throw error;
    }
};

export default API_CONFIG;