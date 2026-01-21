const API_BASE_URL = 'http://10.0.2.2:3000';

export const API_CONFIG = {
    BASE_URL: `${API_BASE_URL}/api`,
    TIMEOUT: 30000,
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

export const API_ENDPOINTS = {
    LEADERBOARD: {
        WEEKLY: '/leaderboard/weekly',
        HALL_OF_FAME: '/leaderboard/hall-of-fame',
        CURRENT_USER: (studentID) => `/leaderboard/current-user/${studentID}`
    },
    REWARDS: {
        USER_DATA: (studentID) => `/rewards/user/${studentID}`,
        CONVERT: '/rewards/convert'
    },
    CONVERSIONS: {
        PENDING: '/conversions/pending',
        HISTORY: '/conversions/history',
        APPROVE: '/conversions/approve',
        APPROVE_SIMPLE: '/conversions/approve-simple',
        REJECT: '/conversions/reject',
        SETTINGS: '/conversions/settings',
        UPDATE_RATE: '/conversions/settings/conversion-rate',
        TEST_UPDATE_RATE: '/conversions/test-update-rate'
    },
    SYSTEM: {
        HEALTH: '/health',
        TEST_DB: '/test-db',
        TEST_JOHN: '/test-john',
        TEST_LEADERBOARD: '/test-leaderboard'
    }
};

const ConversionRateEmitter = {
    listeners: new Set(),
    
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    },
    
    emit(newRate) {
        console.log('🔄 ConversionRateEmitter: Broadcasting new rate:', newRate);
        this.listeners.forEach(callback => {
            try {
                callback(newRate);
            } catch (error) {
                console.error('❌ Error in ConversionRateEmitter callback:', error);
            }
        });
    },
    
    getCurrentRate() {
        return global.conversionRate || 100;
    }
};

const ConversionRateManager = {
    currentRate: 100,
    
    setRate: async (newRate) => {
        try {
            console.log('🔄 ConversionRateManager: Setting new rate:', newRate);
            
            global.conversionRate = parseInt(newRate);
            ConversionRateManager.currentRate = parseInt(newRate);
            
            ConversionRateEmitter.emit(parseInt(newRate));
            
            return true;
        } catch (error) {
            console.error('❌ ConversionRateManager error:', error);
            return false;
        }
    },
    
    getRate: () => {
        return ConversionRateManager.currentRate || global.conversionRate || 100;
    },
    
    subscribe: (callback) => {
        return ConversionRateEmitter.subscribe(callback);
    },
    
    refreshAllScreens: () => {
        console.log('🔄 ConversionRateManager: Refreshing all screens');
        ConversionRateEmitter.emit(ConversionRateManager.getRate());
        
        if (global.refreshCallbacks) {
            global.refreshCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error('❌ Refresh callback error:', error);
                }
            });
        }
    }
};

const ConversionUpdateEmitter = {
    listeners: new Set(),
    
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    },
    
    emit(updateType, data) {
        console.log(`🔄 ConversionUpdateEmitter: ${updateType} update`, data);
        this.listeners.forEach(callback => {
            try {
                callback(updateType, data);
            } catch (error) {
                console.error('❌ Error in ConversionUpdateEmitter callback:', error);
            }
        });
    }
};

const initializeGlobalEvents = () => {
    if (!global.refreshCallbacks) {
        global.refreshCallbacks = new Set();
    }
    
    if (!global.registerRefreshCallback) {
        global.registerRefreshCallback = (callback) => {
            global.refreshCallbacks.add(callback);
            return () => global.refreshCallbacks.delete(callback);
        };
    }
    
    if (!global.forceRefreshAllData) {
        global.forceRefreshAllData = () => {
            console.log('🔄 forceRefreshAllData called');
            ConversionRateManager.refreshAllScreens();
            ConversionUpdateEmitter.emit('all', { timestamp: new Date().toISOString() });
        };
    }
    
    if (!global.conversionRate) {
        global.conversionRate = 100;
    }
    
    if (!global.notifyConversionUpdate) {
        global.notifyConversionUpdate = (updateType, data) => {
            console.log(`🔄 Global conversion update: ${updateType}`);
            ConversionUpdateEmitter.emit(updateType, data);
        };
    }
    
    ConversionRateManager.currentRate = global.conversionRate || 100;
    console.log('🔄 ConversionRateManager initialized with rate:', ConversionRateManager.currentRate);
};

initializeGlobalEvents();

const apiCall = async (endpoint, method = 'GET', data = null, retries = 2) => {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    console.log(`📡 API Call: ${method} ${url}`);
    if (data && method !== 'GET') {
        console.log('📡 Request Data:', JSON.stringify(data));
    }
    
    const options = {
        method,
        headers: API_CONFIG.HEADERS,
        timeout: API_CONFIG.TIMEOUT
    };
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            options.signal = controller.signal;
            
            const response = await fetch(url, options);
            clearTimeout(timeoutId);
            
            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error('❌ JSON parse error:', jsonError);
                result = {
                    success: false,
                    message: 'Invalid response from server',
                    status: response.status
                };
            }
            
            console.log(`📡 Response (${response.status}):`, 
                response.ok ? '✅ Success' : '❌ Error', 
                result.message || '');
            
            return {
                ...result,
                statusCode: response.status,
                success: response.ok && result.success !== false
            };
            
        } catch (error) {
            console.error(`❌ API Error (Attempt ${attempt}/${retries}):`, error.message);
            
            if (attempt === retries) {
                return {
                    success: false,
                    message: `Network error: ${error.message}`,
                    error: error.message,
                    url: url,
                    timestamp: new Date().toISOString()
                };
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
};

const calculateTimeUntilReset = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    let daysUntilSunday = 7 - dayOfWeek;
    
    if (dayOfWeek === 0) {
        if (now.getHours() >= 23 && now.getMinutes() >= 59) {
            daysUntilSunday = 7;
        }
    }
    
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(23, 59, 0, 0);
    
    const diffMs = nextSunday - now;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return {
        days,
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
        timestamp: nextSunday.toISOString()
    };
};

const updateConversionRate = async (newRate, adminId = 'ADM001') => {
    try {
        console.log('🔄 Updating conversion rate to:', newRate);
        
        const response = await apiCall(API_ENDPOINTS.CONVERSIONS.UPDATE_RATE, 'PUT', {
            rate: newRate,
            adminId: adminId
        });
        
        if (response.success) {
            await ConversionRateManager.setRate(parseInt(newRate));
            
            console.log('✅ Conversion rate updated globally');
        }
        
        return response;
        
    } catch (error) {
        console.error('❌ Error updating conversion rate:', error);
        return {
            success: false,
            message: 'Failed to update conversion rate',
            error: error.message
        };
    }
};

const getCurrentConversionRate = async () => {
    try {
        const cachedRate = ConversionRateManager.getRate();
        
        const response = await apiCall(API_ENDPOINTS.CONVERSIONS.SETTINGS);
        
        if (response.success && response.data?.conversion_rate?.value) {
            const serverRate = parseInt(response.data.conversion_rate.value);
            
            if (serverRate !== cachedRate) {
                console.log('🔄 Server rate differs from cache, updating...');
                ConversionRateManager.setRate(serverRate);
                return serverRate;
            }
            
            return cachedRate;
        }
        
        return cachedRate;
        
    } catch (error) {
        console.error('❌ Error getting conversion rate:', error);
        return ConversionRateManager.getRate();
    }
};

const syncConversionRate = async () => {
    try {
        console.log('🔄 Syncing conversion rate across all screens...');
        
        const response = await apiCall(API_ENDPOINTS.CONVERSIONS.SETTINGS);
        
        if (response.success && response.data?.conversion_rate?.value) {
            const serverRate = parseInt(response.data.conversion_rate.value);
            
            await ConversionRateManager.setRate(serverRate);
            
            return serverRate;
        }
        
        return ConversionRateManager.getRate();
        
    } catch (error) {
        console.error('❌ Error syncing conversion rate:', error);
        return ConversionRateManager.getRate();
    }
};

const updateGlobalConversionRate = (newRate) => {
    const rate = parseInt(newRate) || 100;
    
    global.conversionRate = rate;
    ConversionRateManager.setRate(rate);
    
    console.log('🔄 Updated global conversion rate:', rate);
    
    return rate;
};

const testConversionRateUpdate = async (testRate = 150) => {
    try {
        console.log('🧪 Testing conversion rate update...');
        
        const response = await apiCall(API_ENDPOINTS.CONVERSIONS.TEST_UPDATE_RATE);
        
        if (response.success) {
            console.log('🧪 Backend test successful:', response.data);
            
            const localResult = await updateConversionRate(testRate, 'TEST_ADMIN');
            
            return {
                success: true,
                backend: response,
                local: localResult,
                currentRate: ConversionRateManager.getRate()
            };
        }
        
        return {
            success: false,
            message: 'Backend test failed',
            backend: response
        };
        
    } catch (error) {
        console.error('❌ Test error:', error);
        return {
            success: false,
            message: 'Test failed',
            error: error.message
        };
    }
};

const registerScreenRefresh = (screenName, refreshFunction) => {
    if (typeof global.registerRefreshCallback === 'function') {
        const unsubscribe = global.registerRefreshCallback(() => {
            console.log(`🔄 ${screenName}: Global refresh received`);
            refreshFunction();
        });
        
        return unsubscribe;
    }
    
    console.warn(`⚠️ registerRefreshCallback not available for ${screenName}`);
    return () => {};
};

export {
    ConversionRateEmitter,
    ConversionRateManager,
    ConversionUpdateEmitter,
    apiCall,
    calculateTimeUntilReset,
    updateConversionRate,
    getCurrentConversionRate,
    syncConversionRate,
    updateGlobalConversionRate,
    initializeGlobalEvents,
    testConversionRateUpdate,
    registerScreenRefresh
};

export default {
    API_CONFIG,
    API_ENDPOINTS,
    ConversionRateEmitter,
    ConversionRateManager,
    ConversionUpdateEmitter,
    apiCall,
    calculateTimeUntilReset,
    updateConversionRate,
    getCurrentConversionRate,
    syncConversionRate,
    updateGlobalConversionRate,
    initializeGlobalEvents,
    testConversionRateUpdate,
    registerScreenRefresh
};