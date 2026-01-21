import axios from 'axios';

// Use 10.0.2.2 reverse
const API_BASE_URL = 'http://10.0.2.2:8081/api';

export const apiService = {
    getPerformanceData: async (userId, filters = {}) => {
        try {
            console.log(`📡 Fetching from: ${API_BASE_URL}/performance/${userId}`);
            
            const response = await axios.get(`${API_BASE_URL}/performance/${userId}`, {
                params: {
                    period: filters.period || '6weeks',
                    material: filters.material || 'all'
                }
            });
            
            console.log('✅ Database data received:', {
                items: response.data.data.summary.total_items,
                points: response.data.data.summary.total_points,
                using_sample: response.data.using_sample
            });
            
            return response.data;
            
        } catch (error) {
            console.error('❌ API Error:', error.message);
            
            // Fallback sample data
            return {
                success: true,
                data: {
                    summary: {
                        total_items: 147,
                        total_points: 2940,
                        total_kg: 73.5,
                        avg_per_week: 25,
                        best_week_points: 34,
                        best_week_number: 6
                    },
                    weeklyTrend: [
                        { week_number: 1, weekly_points: 20, weekly_kg: 5.0, items_recycled: 4 },
                        { week_number: 2, weekly_points: 28, weekly_kg: 7.0, items_recycled: 6 },
                        { week_number: 3, weekly_points: 34, weekly_kg: 8.5, items_recycled: 7 },
                        { week_number: 4, weekly_points: 30, weekly_kg: 7.5, items_recycled: 6 },
                        { week_number: 5, weekly_points: 25, weekly_kg: 6.0, items_recycled: 5 },
                        { week_number: 6, weekly_points: 27, weekly_kg: 6.5, items_recycled: 5 }
                    ],
                    materialBreakdown: [
                        { material_type: 'plastic', total_points: 1200, total_kg: 30.0, item_count: 60 },
                        { material_type: 'paper', total_points: 900, total_kg: 22.5, item_count: 45 },
                        { material_type: 'glass', total_points: 500, total_kg: 12.5, item_count: 25 },
                        { material_type: 'metal', total_points: 340, total_kg: 8.5, item_count: 17 }
                    ]
                },
                using_sample: true
            };
        }
    },

    getPerformanceData: async (userId, filters = {}) => {
        try {
            console.log(`📡 Fetching from: ${API_BASE_URL}/performance/${userId}`);
            
            const response = await axios.get(`${API_BASE_URL}/performance/${userId}`, {
                params: {
                    period: filters.period || '6weeks',
                    material: filters.material || 'all'
                }
            });
            
            console.log('✅ Database data received:', {
                items: response.data.data.summary.total_items,
                points: response.data.data.summary.total_points,
                using_sample: response.data.using_sample
            });
            
            return response.data;
            
        } catch (error) {
            //console.error('❌ Performance API Error:', error.message);
            
            // Fallback sample data
            return {
                success: true,
                data: {
                    summary: {
                        total_items: 147,
                        total_points: 2940,
                        total_kg: 73.5,
                        avg_per_week: 25,
                        best_week_points: 34,
                        best_week_number: 6
                    },
                    weeklyTrend: [
                        { week_number: 1, weekly_points: 20, weekly_kg: 5.0, items_recycled: 4 },
                        { week_number: 2, weekly_points: 28, weekly_kg: 7.0, items_recycled: 6 },
                        { week_number: 3, weekly_points: 34, weekly_kg: 8.5, items_recycled: 7 },
                        { week_number: 4, weekly_points: 30, weekly_kg: 7.5, items_recycled: 6 },
                        { week_number: 5, weekly_points: 25, weekly_kg: 6.0, items_recycled: 5 },
                        { week_number: 6, weekly_points: 27, weekly_kg: 6.5, items_recycled: 5 }
                    ],
                    materialBreakdown: [
                        { material_type: 'plastic', total_points: 1200, total_kg: 30.0, item_count: 60 },
                        { material_type: 'paper', total_points: 900, total_kg: 22.5, item_count: 45 },
                        { material_type: 'glass', total_points: 500, total_kg: 12.5, item_count: 25 },
                        { material_type: 'metal', total_points: 340, total_kg: 8.5, item_count: 17 }
                    ]
                },
                using_sample: true
            };
        }
    },

    // Enhanced Community Overview API
    getCommunityOverview: async (filters = {}) => {
        try {
            console.log('📡 Fetching community overview with filters:', filters);
            
            const response = await axios.get(`$3000/community-overview`, {
                params: {
                    semester: filters.semester || 'current',
                    faculty: filters.faculty || 'all'
                },
                timeout: 10000 // 10 second timeout
            });
            
            if (response.data && response.data.success) {
                console.log('✅ Community data received:', {
                    participants: response.data.data.summary.participants,
                    points: response.data.data.summary.total_points,
                    faculties: response.data.data.facultyBreakdown?.length || 0
                });
                return response.data;
            } else {
                throw new Error('Invalid response format');
            }
            
        } catch (error) {
            //console.error('❌ Community API Error:', error.message);
            
            // Generate fallback sample data based on filters
            return {
                success: true,
                using_sample: true,
                data: generateSampleCommunityData(filters.semester || 'current', filters.faculty || 'all')
            };
        }
    },
    
    getComparePerformance: async (userId, filters = {}) => {
        try {
            console.log(`📡 Fetching compare data for user: ${userId}`);
            
            const response = await axios.get(`${API_BASE_URL}/compare-performance/${userId}`, {
                params: {
                    period: filters.period || '6weeks',
                    comparison: filters.comparison || 'faculty'
                }
            });
            
            console.log('✅ Compare data received:', {
                rank: response.data.data.rank,
                points: response.data.data.performanceSummary.yourPoints
            });
            
            return response.data;
            
        } catch (error) {
            //console.error('❌ Compare Performance API Error:', error.message);
            
            // Enhanced fallback sample data with realistic values
            const period = filters.period || '6weeks';
            const comparison = filters.comparison || 'faculty';
            
            // Generate dynamic data based on period
            const periodData = {
                'week': {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    userTrend: [85, 92, 78, 105, 120, 65, 95],
                    comparisonTrend: [65, 70, 62, 80, 85, 55, 75],
                    pointsMultiplier: 1
                },
                '4weeks': {
                    labels: ['W1', 'W2', 'W3', 'W4'],
                    userTrend: [240, 280, 320, 300],
                    comparisonTrend: [180, 200, 220, 210],
                    pointsMultiplier: 0.4
                },
                '6weeks': {
                    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
                    userTrend: [350, 420, 480, 400, 450, 500],
                    comparisonTrend: [280, 320, 350, 310, 330, 380],
                    pointsMultiplier: 0.6
                }
            };
            
            const data = periodData[period] || periodData['6weeks'];
            const userPoints = Math.round(4500 * data.pointsMultiplier);
            
            return {
                success: true,
                using_sample: true,
                data: {
                    rank: Math.floor(Math.random() * 20) + 1,
                    totalStudents: 94,
                    percentile: Math.floor(Math.random() * 20) + 75,
                    pointsToNext: Math.max(50, Math.floor(Math.random() * 200) + 100),
                    avgComparison: Math.floor(Math.random() * 30) + 10,
                    performanceSummary: {
                        yourPoints: userPoints,
                        yourItems: Math.round(userPoints / 20),
                        yourKg: Math.round(userPoints / 40)
                    },
                    trendData: {
                        labels: data.labels,
                        userTrend: data.userTrend,
                        comparisonTrend: data.comparisonTrend,
                        comparisonType: comparison
                    },
                    diamondTier: [
                        { 
                            rank: 1, 
                            initial: "S", 
                            name: "Sarah Chen", 
                            items: Math.round(423 * data.pointsMultiplier), 
                            points: Math.round(8450 * data.pointsMultiplier) 
                        },
                        { 
                            rank: 2, 
                            initial: "A", 
                            name: "Ahmed Hassan", 
                            items: Math.round(406 * data.pointsMultiplier), 
                            points: Math.round(8120 * data.pointsMultiplier) 
                        },
                        { 
                            rank: 3, 
                            initial: "E", 
                            name: "Emily Rodriguez", 
                            items: Math.round(395 * data.pointsMultiplier), 
                            points: Math.round(7890 * data.pointsMultiplier) 
                        },
                    ]
                }
            };
        }
    }

    /*
    getComparePerformance: async (userId, filters = {}) => {
        try {
            console.log(`📡 Fetching compare data for user: ${userId}`);
            
            const response = await axios.get(`${API_BASE_URL}/compare-performance/${userId}`, {
                params: {
                    period: filters.period || '6weeks',
                    comparison: filters.comparison || 'faculty'
                }
            });
            
            console.log('✅ Compare data received:', {
                rank: response.data.data.rank,
                points: response.data.data.performanceSummary.yourPoints
            });
            
            return response.data;
            
        } catch (error) {
            console.error('❌ Compare Performance API Error:', error.message);
            
            // Fallback sample data
            return {
                success: true,
                using_sample: true,
                data: {
                    rank: 10,
                    totalStudents: 94,
                    percentile: 89,
                    pointsToNext: 220,
                    avgComparison: 12,
                    performanceSummary: {
                        yourPoints: 4500,
                        yourItems: 225,
                        yourKg: 112.5
                    },
                    comparisonData: null,
                    diamondTier: [
                        { rank: 1, initial: "S", name: "Sarah Chen", items: 423, points: 8450 },
                        { rank: 2, initial: "A", name: "Ahmed Hassan", items: 406, points: 8120 },
                        { rank: 3, initial: "E", name: "Emily Rodriguez", items: 395, points: 7890 },
                    ]
                }
            };
        }
    } */
};

// Enhanced sample data generator for community overview
const generateSampleCommunityData = (semester, faculty) => {
    // Base data for different semesters
    const semesterData = {
        'current': {
            summary: { 
                total_kg: 1250.5, 
                participants: 850, 
                total_points: 62525,
                total_transactions: 4250,
                avg_points_per_user: 74
            },
            weeklyTrend: Array.from({length: 10}, (_, i) => ({ 
                week: i + 1, 
                points: Math.floor(Math.random() * 3000) + 7000,
                participants: Math.floor(Math.random() * 50) + 100
            })),
            facultyBreakdown: generateFacultyBreakdown('current', faculty),
            materialBreakdown: [
                { material: 'plastic', points: 25000, total_kg: 500, transactions: 1250 },
                { material: 'paper', points: 20000, total_kg: 400, transactions: 1000 },
                { material: 'glass', points: 12000, total_kg: 240, transactions: 600 },
                { material: 'metal', points: 5525, total_kg: 110.5, transactions: 276 }
            ],
            topPerformers: [
                { name: 'Ali bin Ahmad', faculty: 'FKE', points: 2450, total_kg: 61.2 },
                { name: 'Siti Norhaliza', faculty: 'FABU', points: 1980, total_kg: 49.5 },
                { name: 'Raj Kumar', faculty: 'FS', points: 1850, total_kg: 46.3 },
                { name: 'Mei Ling', faculty: 'FKT', points: 1620, total_kg: 40.5 },
                { name: 'Ahmad Firdaus', faculty: 'FKM', points: 1480, total_kg: 37.0 }
            ]
        },
        'last': {
            summary: { 
                total_kg: 980.2, 
                participants: 720, 
                total_points: 49010,
                total_transactions: 3400,
                avg_points_per_user: 68
            },
            weeklyTrend: Array.from({length: 16}, (_, i) => ({ 
                week: i + 1, 
                points: Math.floor(Math.random() * 2000) + 5000,
                participants: Math.floor(Math.random() * 40) + 80
            })),
            facultyBreakdown: generateFacultyBreakdown('last', faculty),
            materialBreakdown: [
                { material: 'plastic', points: 19500, total_kg: 390, transactions: 975 },
                { material: 'paper', points: 16000, total_kg: 320, transactions: 800 },
                { material: 'glass', points: 9000, total_kg: 180, transactions: 450 },
                { material: 'metal', points: 4510, total_kg: 90.2, transactions: 225 }
            ],
            topPerformers: [
                { name: 'Ali bin Ahmad', faculty: 'FKE', points: 2100, total_kg: 52.5 },
                { name: 'Siti Norhaliza', faculty: 'FABU', points: 1750, total_kg: 43.8 },
                { name: 'Raj Kumar', faculty: 'FS', points: 1620, total_kg: 40.5 },
                { name: 'Mei Ling', faculty: 'FKT', points: 1480, total_kg: 37.0 },
                { name: 'Ahmad Firdaus', faculty: 'FKM', points: 1350, total_kg: 33.8 }
            ]
        },
        '6months': {
            summary: { 
                total_kg: 2450.8, 
                participants: 920, 
                total_points: 122540,
                total_transactions: 6127,
                avg_points_per_user: 133
            },
            weeklyTrend: Array.from({length: 24}, (_, i) => ({ 
                week: i + 1, 
                points: Math.floor(Math.random() * 4000) + 8000,
                participants: Math.floor(Math.random() * 60) + 120
            })),
            facultyBreakdown: generateFacultyBreakdown('6months', faculty),
            materialBreakdown: [
                { material: 'plastic', points: 49000, total_kg: 980, transactions: 2450 },
                { material: 'paper', points: 40000, total_kg: 800, transactions: 2000 },
                { material: 'glass', points: 24000, total_kg: 480, transactions: 1200 },
                { material: 'metal', points: 9540, total_kg: 190.8, transactions: 477 }
            ],
            topPerformers: [
                { name: 'Ali bin Ahmad', faculty: 'FKE', points: 4850, total_kg: 121.2 },
                { name: 'Siti Norhaliza', faculty: 'FABU', points: 3980, total_kg: 99.5 },
                { name: 'Raj Kumar', faculty: 'FS', points: 3850, total_kg: 96.3 },
                { name: 'Mei Ling', faculty: 'FKT', points: 3620, total_kg: 90.5 },
                { name: 'Ahmad Firdaus', faculty: 'FKM', points: 3480, total_kg: 87.0 }
            ]
        }
    };

    return semesterData[semester] || semesterData['current'];
};

// Helper to generate faculty breakdown based on filters
const generateFacultyBreakdown = (semester, faculty) => {
    const baseData = {
        'current': [
            { faculty: 'FKE', points: 18500, participants: 125, total_kg: 370 },
            { faculty: 'FS', points: 15200, participants: 110, total_kg: 304 },
            { faculty: 'FABU', points: 9800, participants: 85, total_kg: 196 },
            { faculty: 'FKT', points: 8900, participants: 75, total_kg: 178 },
            { faculty: 'FK', points: 7500, participants: 70, total_kg: 150 },
            { faculty: 'FKM', points: 6500, participants: 65, total_kg: 130 },
            { faculty: 'FSSH', points: 5200, participants: 55, total_kg: 104 },
            { faculty: 'FEST', points: 4800, participants: 50, total_kg: 96 },
            { faculty: 'FM', points: 4200, participants: 45, total_kg: 84 },
            { faculty: 'SPACE', points: 3500, participants: 40, total_kg: 70 }
        ],
        'last': [
            { faculty: 'FKE', points: 14500, participants: 100, total_kg: 290 },
            { faculty: 'FS', points: 12000, participants: 90, total_kg: 240 },
            { faculty: 'FABU', points: 7800, participants: 70, total_kg: 156 },
            { faculty: 'FKT', points: 6500, participants: 60, total_kg: 130 },
            { faculty: 'FK', points: 5800, participants: 55, total_kg: 116 },
            { faculty: 'FKM', points: 5200, participants: 50, total_kg: 104 },
            { faculty: 'FSSH', points: 4500, participants: 45, total_kg: 90 },
            { faculty: 'FEST', points: 3800, participants: 40, total_kg: 76 },
            { faculty: 'FM', points: 3200, participants: 35, total_kg: 64 },
            { faculty: 'SPACE', points: 2800, participants: 30, total_kg: 56 }
        ],
        '6months': [
            { faculty: 'FKE', points: 36500, participants: 150, total_kg: 730 },
            { faculty: 'FS', points: 29800, participants: 130, total_kg: 596 },
            { faculty: 'FABU', points: 19800, participants: 100, total_kg: 396 },
            { faculty: 'FKT', points: 17500, participants: 90, total_kg: 350 },
            { faculty: 'FK', points: 15200, participants: 85, total_kg: 304 },
            { faculty: 'FKM', points: 12800, participants: 80, total_kg: 256 },
            { faculty: 'FSSH', points: 10500, participants: 70, total_kg: 210 },
            { faculty: 'FEST', points: 9200, participants: 65, total_kg: 184 },
            { faculty: 'FM', points: 7800, participants: 60, total_kg: 156 },
            { faculty: 'SPACE', points: 6500, participants: 55, total_kg: 130 }
        ]
    };

    const data = baseData[semester] || baseData['current'];
    
    // If specific faculty selected, return only that faculty
    if (faculty !== 'all') {
        const facultyData = data.find(f => f.faculty === faculty);
        return facultyData ? [facultyData] : [];
    }
    
    return data;
};



export const DEMO_USER_ID = 1;