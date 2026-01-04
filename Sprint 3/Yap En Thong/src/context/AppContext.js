import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { apiCall, API_ENDPOINTS } from '../config/api';

const AppContext = createContext();

// Demo user (replace with actual login)
const DEMO_USER = {
    utmID: 'A23EN0001', // Ali bin Ahmad
    fullName: 'Ali bin Ahmad',
    role: 'student',
    isAdmin: false,
    studentID: 'A23EN0001'
};

export const AppProvider = ({ children }) => {
    const [conversionRate, setConversionRate] = useState(100);
    const [userPoints, setUserPoints] = useState(850); // Single source of truth for user points
    const [userMeritPoints, setUserMeritPoints] = useState(12.5);
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [rewardData, setRewardData] = useState(null);
    
    // Add event listeners for real-time updates
    const [dataVersion, setDataVersion] = useState(0);
    
    // DEMO DATA - Consistent with your PDF screenshots
    const [demoData, setDemoData] = useState({
        // Current user data (Ali bin Ahmad)
        currentUser: {
            utmID: 'A23EN0001',
            name: 'Ali bin Ahmad',
            weeklyPoints: 450,
            totalPoints: 5200,
            rank: 1,
            isCurrentUser: true
        },
        
        // Weekly leaderboard data (matches PDF)
        weeklyLeaderboard: [
            { utmID: 'A23EN0001', name: 'Ahmad Ali', weeklyPoints: 450, totalPoints: 5200, rank: 1, isCurrentUser: true },
            { utmID: 'A23CS0006', name: 'Siti Sarah', weeklyPoints: 420, totalPoints: 4900, rank: 2, isCurrentUser: false },
            { utmID: 'A23CS0001', name: 'Raj Kumar', weeklyPoints: 330, totalPoints: 4500, rank: 3, isCurrentUser: false },
            { utmID: 'A23EN0004', name: 'Wei Chen', weeklyPoints: 350, totalPoints: 4200, rank: 4, isCurrentUser: false },
            { utmID: 'A23CS0002', name: 'Fatimah Zahra', weeklyPoints: 320, totalPoints: 4000, rank: 5, isCurrentUser: false },
            { utmID: 'A23CS0003', name: 'James Wilson', weeklyPoints: 295, totalPoints: 3800, rank: 6, isCurrentUser: false },
            { utmID: 'DEMOUSER', name: 'Demo User', weeklyPoints: 280, totalPoints: 3600, rank: 7, isCurrentUser: false, isDemo: true },
            { utmID: 'A23BU0001', name: 'Priya Sharma', weeklyPoints: 250, totalPoints: 3400, rank: 8, isCurrentUser: false },
            { utmID: 'A23KT0001', name: 'David Lee', weeklyPoints: 230, totalPoints: 3200, rank: 9, isCurrentUser: false },
            { utmID: 'A23SH0001', name: 'Aina Sofea', weeklyPoints: 210, totalPoints: 3000, rank: 10, isCurrentUser: false }
        ],
        
        // Hall of Fame (matches PDF)
        hallOfFame: [
            { utmID: 'A23EN0001', name: 'Ahmad Ali', weeklyPoints: 450, totalPoints: 5200, rank: 1 },
            { utmID: 'A23CS0006', name: 'Siti Sarah', weeklyPoints: 420, totalPoints: 4900, rank: 2 },
            { utmID: 'A23CS0001', name: 'Raj Kumar', weeklyPoints: 330, totalPoints: 4500, rank: 3 }
        ],
        
        // User conversion history (matches PDF) - For STUDENT view
        userConversionHistory: [
            { id: 1, rewardPoints: 250, meritPoints: 2.5, status: 'Approved', date: '2024-01-20', reason: null },
            { id: 2, rewardPoints: 100, meritPoints: 1.0, status: 'Approved', date: '2024-01-18', reason: null },
            { id: 3, rewardPoints: 150, meritPoints: 1.5, status: 'Rejected', date: '2024-01-15', reason: 'Insufficient activity proof' }
        ],
        
        // SHARED PENDING CONVERSIONS - For both STUDENT and ADMIN views
        pendingConversions: [
            { 
                id: 4, 
                studentName: 'Ali bin Ahmad', 
                studentId: 'A23EN0001', 
                rewardPoints: 150, 
                meritPoints: 1.5, 
                status: 'Pending', 
                requestDate: '2024-01-25',
                submittedDate: '2024-01-25',
                selected: false 
            },
            { 
                id: 5, 
                studentName: 'Ali bin Ahmad', 
                studentId: 'A23EN0001', 
                rewardPoints: 200, 
                meritPoints: 2.0, 
                status: 'Pending', 
                requestDate: '2024-01-25',
                submittedDate: '2024-01-25',
                selected: false 
            }
        ],
        
        // Admin conversion history (matches PDF) - For ADMIN view
        adminConversionHistory: [
            { 
                id: 1, 
                studentName: 'Fatimah Zahra', 
                studentId: 'A23CS0451', 
                rewardPoints: 250, 
                meritPoints: 2.5, 
                status: 'Approved', 
                date: '2024-01-20' 
            },
            { 
                id: 2, 
                studentName: 'James Wilson', 
                studentId: 'A23CS0452', 
                rewardPoints: 100, 
                meritPoints: 1.0, 
                status: 'Approved', 
                date: '2024-01-18' 
            },
            { 
                id: 3, 
                studentName: 'Priya Sharma', 
                studentId: 'A23CS0453', 
                rewardPoints: 150, 
                meritPoints: 1.5, 
                status: 'Rejected', 
                date: '2024-01-15',
                reason: 'Insufficient activity proof'
            }
        ]
    });

    // Function to notify all screens of data changes
    const notifyDataChange = useCallback(() => {
        setDataVersion(prev => prev + 1);
        console.log('📢 Data changed, notifying screens...');
    }, []);

    // Initialize with demo data immediately
    useEffect(() => {
        console.log('📊 Initializing with demo data...');
        setUserPoints(850); // Set initial points to 850 (consistent with PDF)
        setUserMeritPoints(12.5);
        setConversionRate(100);
        setIsConnected(false); // Default to demo mode
    }, []);

    // Calculate current user merit points from history
    const calculateUserMeritPoints = useCallback(() => {
        const approvedConversions = demoData.userConversionHistory.filter(
            conv => conv.status === 'Approved'
        );
        const totalMerits = approvedConversions.reduce((sum, conv) => sum + conv.meritPoints, 0);
        return totalMerits;
    }, [demoData.userConversionHistory]);

    // Update user merit points when data changes
    useEffect(() => {
        const newMeritPoints = calculateUserMeritPoints();
        if (newMeritPoints !== userMeritPoints) {
            console.log('Updating user merit points:', newMeritPoints);
            setUserMeritPoints(newMeritPoints);
        }
    }, [demoData.userConversionHistory, calculateUserMeritPoints, userMeritPoints]);

    const testAPIConnection = async () => {
        try {
            const result = await apiCall(API_ENDPOINTS.SYSTEM.HEALTH);
            setIsConnected(true);
            console.log('✅ API Connection:', result);
            return true;
        } catch (error) {
            setIsConnected(false);
            console.warn('⚠️ API Offline - Using demo data');
            return false;
        }
    };

    // Function to add new pending conversion
    const addPendingConversion = useCallback((conversion) => {
        const newConversion = {
            id: demoData.pendingConversions.length + 1,
            ...conversion,
            requestDate: new Date().toISOString().split('T')[0],
            submittedDate: new Date().toISOString().split('T')[0],
            selected: false
        };
        
        setDemoData(prev => ({
            ...prev,
            pendingConversions: [...prev.pendingConversions, newConversion]
        }));
        
        notifyDataChange(); // Notify screens of change
        return newConversion;
    }, [demoData.pendingConversions, notifyDataChange]);

    // Function to submit conversion request (ADD THIS FUNCTION)
    const submitConversionRequest = useCallback(async (rewardPoints) => {
        try {
            if (isConnected) {
                const result = await apiCall(API_ENDPOINTS.REWARDS.CONVERT, 'POST', {
                    rewardPoints
                });
                return result;
            } else {
                // Demo mode: Create pending conversion and deduct points immediately
                const meritPoints = rewardPoints / conversionRate;
                
                const newConversion = {
                    id: demoData.pendingConversions.length + 1,
                    studentName: DEMO_USER.fullName,
                    studentId: DEMO_USER.utmID,
                    rewardPoints: rewardPoints,
                    meritPoints: meritPoints,
                    status: 'Pending',
                    requestDate: new Date().toISOString().split('T')[0],
                    submittedDate: new Date().toISOString().split('T')[0],
                    selected: false
                };
                
                // IMPORTANT: Deduct points from userPoints immediately
                setUserPoints(prev => {
                    const newPoints = prev - rewardPoints;
                    console.log(`Deducting ${rewardPoints} points. New total: ${newPoints}`);
                    return newPoints;
                });
                
                // Add to pending conversions
                setDemoData(prev => ({
                    ...prev,
                    pendingConversions: [...prev.pendingConversions, newConversion]
                }));
                
                notifyDataChange();
                return { success: true, conversion: newConversion };
            }
        } catch (error) {
            console.error('Error submitting conversion:', error);
            throw error;
        }
    }, [isConnected, conversionRate, demoData.pendingConversions, notifyDataChange]);

    
    // Update getUserPendingConversions function:
    const getUserPendingConversions = useCallback(() => {
        // Return only conversions for the current user
        return demoData.pendingConversions
            .filter(conv => conv.studentId === DEMO_USER.utmID)
            .map(conv => ({
                id: conv.id,
                rewardPoints: conv.rewardPoints,
                meritPoints: conv.meritPoints,
                status: conv.status,
                submittedDate: conv.submittedDate
            }));
    }, [demoData.pendingConversions]);

    // Update getUserConversionHistory function:
    const getUserConversionHistory = useCallback(() => {
        // Return user's history + any approved/rejected from pending
        const userHistory = demoData.userConversionHistory || [];
        
        // Check if any pending conversions have been processed
        const processedFromPending = demoData.adminConversionHistory
            .filter(conv => conv.studentId === DEMO_USER.utmID)
            .map(conv => ({
                id: conv.id,
                rewardPoints: conv.rewardPoints,
                meritPoints: conv.meritPoints,
                status: conv.status,
                date: conv.date,
                reason: conv.reason
            }));
        
        return [...userHistory, ...processedFromPending];
    }, [demoData.userConversionHistory, demoData.adminConversionHistory]);

    // Update getAllPendingConversions function:
    const getAllPendingConversions = useCallback(() => {
        return demoData.pendingConversions;
    }, [demoData.pendingConversions]);

    // Update getAllAdminHistory function:
    const getAllAdminHistory = useCallback(() => {
        return demoData.adminConversionHistory;
    }, [demoData.adminConversionHistory]);

    // Update approveConversions function:
    const approveConversions = useCallback(async (conversions) => {
        try {
            if (isConnected) {
                const conversionIds = conversions.map(c => c.id);
                const result = await apiCall(API_ENDPOINTS.CONVERSIONS.APPROVE, 'POST', {
                    conversionIds
                });
                return result;
            } else {
                // Demo mode: Update local state
                conversions.forEach(conv => {
                    // Move from pending to history
                    const approvedConv = {
                        ...conv,
                        status: 'Approved',
                        date: new Date().toISOString().split('T')[0]
                    };
                    
                    // Update user merit points if it's the current user
                    if (conv.studentId === DEMO_USER.utmID) {
                        setUserMeritPoints(prev => {
                            const newMerits = prev + conv.meritPoints;
                            console.log(`Adding ${conv.meritPoints} merit points. New total: ${newMerits}`);
                            return newMerits;
                        });
                    }
                    
                    // Update demo data
                    setDemoData(prev => ({
                        ...prev,
                        pendingConversions: prev.pendingConversions.filter(c => c.id !== conv.id),
                        adminConversionHistory: [approvedConv, ...prev.adminConversionHistory]
                    }));
                });
                
                // IMPORTANT: Points were already deducted when conversion was submitted
                // So we don't change userPoints here
                
                notifyDataChange(); // Notify screens of change
                return { success: true, message: 'Demo approval successful' };
            }
        } catch (error) {
            console.error('Error approving conversions:', error);
            throw error;
        }
    }, [isConnected, notifyDataChange]);

    // Update rejectConversions function:
    const rejectConversions = useCallback(async (conversions, reason) => {
        try {
            if (isConnected) {
                const conversionIds = conversions.map(c => c.id);
                const result = await apiCall(API_ENDPOINTS.CONVERSIONS.REJECT, 'POST', {
                    conversionIds,
                    reason
                });
                return result;
            } else {
                // Demo mode: Update local state
                conversions.forEach(conv => {
                    // Move from pending to history
                    const rejectedConv = {
                        ...conv,
                        status: 'Rejected',
                        date: new Date().toISOString().split('T')[0],
                        reason: reason
                    };
                    
                    // Refund points to user
                    if (conv.studentId === DEMO_USER.utmID) {
                        setUserPoints(prev => {
                            const newPoints = prev + conv.rewardPoints;
                            console.log(`Refunding ${conv.rewardPoints} points. New total: ${newPoints}`);
                            return newPoints;
                        });
                    }
                    
                    // Update demo data
                    setDemoData(prev => ({
                        ...prev,
                        pendingConversions: prev.pendingConversions.filter(c => c.id !== conv.id),
                        adminConversionHistory: [rejectedConv, ...prev.adminConversionHistory]
                    }));
                });
                
                notifyDataChange(); // Notify screens of change
                return { success: true, message: 'Demo rejection successful' };
            }
        } catch (error) {
            console.error('Error rejecting conversions:', error);
            throw error;
        }
    }, [isConnected, notifyDataChange]);

    const contextValue = {
        // State
        conversionRate,
        userPoints,
        setUserPoints,
        userMeritPoints,
        setUserMeritPoints,
        loading,
        isConnected,
        leaderboardData,
        rewardData,
        
        // Real-time update trigger
        dataVersion,
        
        // User data
        currentUser: DEMO_USER,
        
        // API Functions
        submitConversionRequest,
        
        // Admin Functions
        approveConversions,
        rejectConversions,
        updateConversionRate: (rate) => {
            setConversionRate(rate);
            notifyDataChange();
        },
        
        // Local Data Functions (for demo/offline)
        getUserConversionHistory,
        getUserPendingConversions,
        getAllPendingConversions,
        getAllAdminHistory,
        
        // Force refresh function
        refreshData: notifyDataChange
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
};