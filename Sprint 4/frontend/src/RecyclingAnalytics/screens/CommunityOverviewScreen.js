import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity 
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { apiService } from '../services/api';

const facultyColors = {
  'FKE': '#4CAF50',     
  'FS': '#2196F3',  
  'FABU': '#FF9800',  
  'FKT': '#9C27B0',    
  'FK': '#607D8B',    
  'FKM': '#795548',   
  'FSSH': '#009688',  
  'FEST': '#F44336', 
  'FM': '#3F51B5',     
  'SPACE': '#E91E63'   
};

const facultyNames = {
  'FKE': 'Engineering',
  'FS': 'Science',
  'FABU': 'Built Environment',
  'FKT': 'Technology', 
  'FK': 'Computing',
  'FKM': 'Management',
  'FSSH': 'Social Sciences',
  'FEST': 'Education',
  'FM': 'Medicine',
  'SPACE': 'Space'
};

const semesterOptions = ['Current', 'Last', '6 Months'];
const facultyOptions = ['All', 'FKE', 'FS', 'FABU', 'FKT', 'FK', 'FKM', 'FSSH', 'FEST', 'FM', 'SPACE'];

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#f8faf8',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: {
    r: '6',
    strokeWidth: '2',
    stroke: '#2E7D32'
  },
  barPercentage: 0.7,
};

const pieChartConfig = {
  color: (opacity = 1, index) => {
    const colors = Object.values(facultyColors);
    return colors[index % colors.length];
  },
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 0,
};

export default function CommunityOverviewScreen() {
  const [loading, setLoading] = useState(true);
  const [communityData, setCommunityData] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('Current');
  const [selectedFaculty, setSelectedFaculty] = useState('All');
  const [chartType, setChartType] = useState('pie'); 

  useEffect(() => {
    loadCommunityData();
  }, [selectedSemester, selectedFaculty]);
const loadCommunityData = async () => {
  setLoading(true);
  try {
    const filters = {
      semester: selectedSemester.toLowerCase(),
      faculty: selectedFaculty === 'All' ? 'all' : selectedFaculty
    };
    
    console.log('📡 Loading community data with filters:', filters);
    
    const result = await apiService.getCommunityOverview(filters);
    
    if (result && result.success && result.data) {
      console.log('✅ Community data loaded:', {
        participants: result.data.summary.participants,
        points: result.data.summary.total_points,
        using_sample: result.using_sample || false
      });
      
      setCommunityData(result.data);
      
      if (result.using_sample) {
        console.log('⚠️ Using sample data - check backend connection');
      } else {
        console.log('✅ Using real database data');
      }
      
    } else {
      console.warn('❌ Invalid data format received');
      setCommunityData(getSampleData(filters.faculty, filters.semester));
    }
  } catch (error) {
    console.error('❌ Error loading community data:', error.message);
    setCommunityData(getSampleData(selectedFaculty, selectedSemester.toLowerCase()));
  } finally {
    setLoading(false);
  }
};
  const getSampleData = (faculty, semester) => {
    const baseData = {
      'current': {
        summary: { total_kg: 1250.5, participants: 850, total_points: 62525 },
        weeklyTrend: Array.from({length: 10}, (_, i) => ({ 
          week: i + 1, 
          points: Math.floor(Math.random() * 3000) + 7000 
        })),
        facultyBreakdown: [
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
        ]
      },
      'last': {
        summary: { total_kg: 980.2, participants: 720, total_points: 49010 },
        weeklyTrend: Array.from({length: 16}, (_, i) => ({ 
          week: i + 1, 
          points: Math.floor(Math.random() * 2000) + 5000 
        })),
        facultyBreakdown: [
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
        ]
      },
      '6months': {
        summary: { total_kg: 2450.8, participants: 920, total_points: 122540 },
        weeklyTrend: Array.from({length: 24}, (_, i) => ({ 
          week: i + 1, 
          points: Math.floor(Math.random() * 4000) + 8000 
        })),
        facultyBreakdown: [
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
      }
    };

    const data = baseData[semester] || baseData['current'];
    
    if (faculty !== 'all' && faculty !== 'All') {
      const facultyData = data.facultyBreakdown.find(f => f.faculty === faculty);
      return {
        ...data,
        facultyBreakdown: facultyData ? [facultyData] : [],
        summary: {
          ...data.summary,
          participants: facultyData?.participants || 0,
          total_points: facultyData?.points || 0,
          total_kg: facultyData?.total_kg || 0
        }
      };
    }
    
    return data;
  };

  const handleFilterChange = (type, value) => {
    if (type === 'semester') {
      setSelectedSemester(value);
    } else if (type === 'faculty') {
      setSelectedFaculty(value);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading community data...</Text>
      </View>
    );
  }

  if (!communityData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#666' }}>Failed to load community data.</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - 40;

  const weeklyChartData = {
    labels: communityData.weeklyTrend?.map((w, i) => `W${i + 1}`) || ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
    datasets: [{
      data: communityData.weeklyTrend?.map(w => Number(w.points || 0)) || [0, 0, 0, 0, 0, 0],
    }]
  };

  const facultyBreakdownData = communityData.facultyBreakdown || [];
  
  const pieChartData = facultyBreakdownData.length > 0
    ? facultyBreakdownData.map((f, index) => ({
        name: f.faculty,
        population: Number(f.points || 0),
        color: facultyColors[f.faculty] || '#CCCCCC',
        legendFontColor: '#333',
        legendFontSize: 11
      }))
    : [{ name: 'No Data', population: 1, color: '#BDBDBD' }];

  const barChartData = {
    labels: facultyBreakdownData.map(f => f.faculty),
    datasets: [{
      data: facultyBreakdownData.map(f => Number(f.points || 0))
    }]
  };

  const totalFacultyPoints = facultyBreakdownData.reduce((sum, f) => sum + (f.points || 0), 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* API Status Indicator */}
    {communityData && (
      <View style={[
        styles.apiStatus, 
        { backgroundColor: communityData.using_sample ? '#FF9800' : '#4CAF50' }
      ]}>
        <Text style={styles.apiStatusText}>
          {communityData.using_sample 
            ? '⚠️ Using Sample Data (Backend Offline)' 
            : '✅ Connected to Database'}
        </Text>
      </View>
    )}


      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌍 Community Overview</Text>
      </View>

      {/* Filters Section */}
      <View style={styles.filtersCard}>
        <Text style={styles.sectionTitle}>📊 Filters</Text>
        
        <Text style={styles.filterLabel}>Time Period:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {semesterOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.filterChip, selectedSemester === option && styles.filterChipActive]}
                onPress={() => handleFilterChange('semester', option)}
              >
                <Text style={[styles.filterChipText, selectedSemester === option && styles.filterChipTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.filterLabel}>Faculty:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {facultyOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.filterChip, selectedFaculty === option && styles.filterChipActive]}
                onPress={() => handleFilterChange('faculty', option)}
              >
                <Text style={[styles.filterChipText, selectedFaculty === option && styles.filterChipTextActive]}>
                  {option === 'All' ? 'All' : option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={styles.summaryIcon}>♻️</Text>
          <Text style={styles.summaryValue}>{communityData.summary.total_kg?.toFixed(1) || 0} kg</Text>
          <Text style={styles.summaryLabel}>Waste Recycled</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={styles.summaryIcon}>👥</Text>
          <Text style={styles.summaryValue}>{communityData.summary.participants || 0}</Text>
          <Text style={styles.summaryLabel}>Participants</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: '#FFF8E1' }]}>
          <Text style={styles.summaryIcon}>🏅</Text>
          <Text style={styles.summaryValue}>{(communityData.summary.total_points || 0).toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total Points</Text>
        </View>
        
        <View style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
          <Text style={styles.summaryIcon}>📈</Text>
          <Text style={styles.summaryValue}>
            {communityData.summary.participants > 0 
              ? Math.round(communityData.summary.total_points / communityData.summary.participants) 
              : 0}
          </Text>
          <Text style={styles.summaryLabel}>Avg Points/User</Text>
        </View>
      </View>

      {/* Weekly Trend Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>📈 Weekly Recycling Trend</Text>
          <Text style={styles.chartSubtitle}>
            {selectedSemester} Semester • {selectedFaculty === 'All' ? 'All Faculties' : selectedFaculty}
          </Text>
        </View>
        
        {weeklyChartData.datasets[0].data.some(val => val > 0) ? (
          <LineChart
            data={weeklyChartData}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            fromZero
            style={styles.chart}
            segments={5}
          />
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>No trend data available</Text>
            <Text style={styles.noDataSubtext}>Try selecting different filters</Text>
          </View>
        )}
      </View>

      {/* Faculty Breakdown */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartTitle}>🏛️ Faculty Performance</Text>
            <Text style={styles.chartSubtitle}>Points Distribution Across Faculties</Text>
          </View>
          <View style={styles.chartTypeToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, chartType === 'pie' && styles.toggleButtonActive]}
              onPress={() => setChartType('pie')}
            >
              <Text style={[styles.toggleButtonText, chartType === 'pie' && styles.toggleButtonTextActive]}>
                Pie
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, chartType === 'bar' && styles.toggleButtonActive]}
              onPress={() => setChartType('bar')}
            >
              <Text style={[styles.toggleButtonText, chartType === 'bar' && styles.toggleButtonTextActive]}>
                Bar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {facultyBreakdownData.length > 0 ? (
          <>
            {chartType === 'pie' ? (
              <PieChart
                data={pieChartData}
                width={screenWidth}
                height={200}
                chartConfig={pieChartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                hasLegend={selectedFaculty === 'All'}
                absolute={false}
              />
            ) : (
              <BarChart
                data={barChartData}
                width={screenWidth}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  barPercentage: 0.6,
                  decimalPlaces: 0,
                }}
                showValuesOnTopOfBars
                fromZero
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
              />
            )}

            {/* Faculty List Details */}
            <View style={styles.facultyDetails}>
              <Text style={styles.detailsTitle}>Faculty Breakdown</Text>
              {facultyBreakdownData.map((faculty, idx) => {
                const percentage = totalFacultyPoints > 0 
                  ? Math.round((faculty.points / totalFacultyPoints) * 100) 
                  : 0;
                return (
                  <View key={idx} style={styles.facultyRow}>
                    <View style={styles.facultyInfo}>
                      <View style={[styles.facultyColor, { backgroundColor: facultyColors[faculty.faculty] || '#CCCCCC' }]} />
                      <View style={styles.facultyTextContainer}>
                        <Text style={styles.facultyName}>
                          {facultyNames[faculty.faculty] || faculty.faculty}
                        </Text>
                        <Text style={styles.facultyStats}>
                          {faculty.participants || 0} participants • {faculty.total_kg || 0} kg
                        </Text>
                      </View>
                    </View>
                    <View style={styles.facultyPoints}>
                      <Text style={styles.pointsValue}>{faculty.points.toLocaleString()}</Text>
                      <Text style={styles.pointsPercent}>({percentage}%)</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.noData}>
            <Text style={styles.noDataText}>No faculty data available</Text>
            <Text style={styles.noDataSubtext}>Select "All" in faculty filter to see breakdown</Text>
          </View>
        )}
      </View>

      {/* Community Impact */}
      <View style={styles.impactCard}>
        <Text style={styles.impactTitle}>🌟 Community Impact</Text>
        
        <View style={styles.impactGrid}>
          <View style={styles.impactItem}>
            <Text style={styles.impactIcon}>🌱</Text>
            <Text style={styles.impactValue}>850+</Text>
            <Text style={styles.impactLabel}>Active Recyclers</Text>
          </View>
          
          <View style={styles.impactItem}>
            <Text style={styles.impactIcon}>🌳</Text>
            <Text style={styles.impactValue}>1.2T+</Text>
            <Text style={styles.impactLabel}>Waste Diverted</Text>
          </View>
          
          <View style={styles.impactItem}>
            <Text style={styles.impactIcon}>♻️</Text>
            <Text style={styles.impactValue}>62K+</Text>
            <Text style={styles.impactLabel}>Total Points</Text>
          </View>
          
          <View style={styles.impactItem}>
            <Text style={styles.impactIcon}>🏆</Text>
            <Text style={styles.impactValue}>10</Text>
            <Text style={styles.impactLabel}>Faculties Engaged</Text>
          </View>
        </View>
        
        <Text style={styles.impactMessage}>
          Together, we're making UTM a greener campus! Every contribution counts towards our sustainability goals. 🌿
        </Text>
        
        <View style={styles.leaderboard}>
          <Text style={styles.leaderboardTitle}>🏆 Top 3 Faculties ({selectedSemester})</Text>
          {facultyBreakdownData.slice(0, 3).map((faculty, idx) => (
            <View key={idx} style={styles.leaderboardRow}>
              <View style={styles.rankContainer}>
                <Text style={styles.rank}>{idx + 1}</Text>
              </View>
              <Text style={styles.leaderboardFaculty}>
                {facultyNames[faculty.faculty] || faculty.faculty}
              </Text>
              <Text style={styles.leaderboardPoints}>{faculty.points.toLocaleString()} pts</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf8' },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f8faf8'
  },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },

  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },

  filtersCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 5,
  },
  filterRow: {
    flexDirection: 'row',
    paddingBottom: 5,
  },
  filterChip: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 70,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  summaryCard: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  chartCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  chartTypeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: '#2E7D32',
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: 'white',
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8,
  },

  facultyDetails: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  facultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  facultyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  facultyColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  facultyTextContainer: {
    flex: 1,
  },
  facultyName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  facultyStats: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  facultyPoints: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pointsPercent: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },

  noData: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginVertical: 10,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#999',
  },

  impactCard: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9800',
  },
  impactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 15,
    textAlign: 'center',
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  impactItem: {
    width: '48%',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 10,
    marginBottom: 10,
  },
  impactIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 2,
  },
  impactLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  impactMessage: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 15,
    lineHeight: 20,
  },
  
  leaderboard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rank: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  leaderboardFaculty: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  leaderboardPoints: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  apiStatus: {
  paddingVertical: 8,
  paddingHorizontal: 15,
  alignItems: 'center',
},
apiStatusText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 12,
},
});