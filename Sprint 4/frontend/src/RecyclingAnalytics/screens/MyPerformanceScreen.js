import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { apiService, DEMO_USER_ID } from '../services/api';

const timeOptions = ['Last Week', 'Last 4 Weeks', 'Last 6 Weeks', 'All Time'];
const materialOptions = ['All Materials', 'Plastic', 'Paper', 'Glass', 'Metal'];

const timeFilterMap = {
  'Last Week': 'week',
  'Last 4 Weeks': '4weeks',
  'Last 6 Weeks': '6weeks',
  'All Time': 'all'
};

const materialFilterMap = {
  'All Materials': 'all',
  'Plastic': 'plastic',
  'Paper': 'paper',
  'Glass': 'glass',
  'Metal': 'metal'
};

const CHART_COLORS = {
  plastic: '#4CAF50',
  paper: '#2196F3',
  glass: '#FF9800',
  metal: '#F44336',
  lineChart: '#2E7D32'
};

export default function MyPerformanceScreen() {
  const [timeFilter, setTimeFilter] = useState('Last 6 Weeks');
  const [materialFilter, setMaterialFilter] = useState('All Materials');
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    loadData();
  }, [timeFilter, materialFilter]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      const filters = {
        period: timeFilterMap[timeFilter],
        material: materialFilterMap[materialFilter]
      };
      
      console.log('Loading data with filters:', filters);
      
      const result = await apiService.getPerformanceData(DEMO_USER_ID, filters);
      
      if (result.success && result.data) {
        setPerformanceData(result.data);
        setApiConnected(!result.using_sample);
        
        console.log('Data loaded:', {
          items: result.data.summary.total_items,
          points: result.data.summary.total_points,
          weeklyTrend: result.data.weeklyTrend.map(w => w.weekly_points),
          materials: result.data.materialBreakdown.map(m => `${m.material_type}: ${m.total_points}`)
        });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const prepareLineChartData = () => {
    if (!performanceData || !performanceData.weeklyTrend) {
      return {
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }]
      };
    }
    
    const data = performanceData.weeklyTrend;
    
    const labels = data.map(item => `W${item.week_number}`);
    const points = data.map(item => item.weekly_points || 0);
    
    console.log('Line chart data:', { labels, points });
    
    return {
      labels: labels,
      datasets: [{
        data: points,
        color: () => CHART_COLORS.lineChart,
        strokeWidth: 2
      }]
    };
  };

  const preparePieChartData = () => {
    if (!performanceData || !performanceData.materialBreakdown) {
      return [];
    }
    
    const data = performanceData.materialBreakdown;
    
    const filteredData = data.filter(item => item.total_points > 0);
    
    if (filteredData.length === 0) {
      return [];
    }
    
    const pieData = filteredData.map(item => ({
      name: item.material_type.toUpperCase(),
population: Number(item.total_points),
      color: CHART_COLORS[item.material_type] || '#CCCCCC',
      legendFontColor: '#333',
      legendFontSize: 12
    }));
    
    console.log('Pie chart data:', pieData);
    
    return pieData;
  };

  if (loading || !performanceData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - 40;
  const lineChartData = prepareLineChartData();
  const pieChartData = preparePieChartData();

  const hasPieChartData = pieChartData.length > 0;
  const totalPiePoints = pieChartData.reduce((sum, item) => sum + item.population, 0);

  return (
    <ScrollView style={styles.container}>
      {/* Status Bar */}
      {/* <View style={[styles.statusBar, { backgroundColor: apiConnected ? '#4CAF50' : '#FF9800' }]}>
        <Text style={styles.statusText}>
          {apiConnected ? '✅ Connected to Database' : '⚠️ Using Sample Data'}
        </Text>
      </View> */}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Recycling Performance</Text>
      </View>

      {/* Summary Cards */}
      <Text style={styles.sectionTitle}>Your Summary</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🔄</Text>
          <Text style={styles.cardLabel}>Total Items</Text>
          <Text style={styles.cardValue}>{performanceData.summary.total_items}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🏅</Text>
          <Text style={styles.cardLabel}>Total Points</Text>
          <Text style={styles.cardValue}>{performanceData.summary.total_points.toLocaleString()}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardIcon}>📅</Text>
          <Text style={styles.cardLabel}>Avg Per Week</Text>
          <Text style={styles.cardValue}>{performanceData.summary.avg_per_week}</Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🔥</Text>
          <Text style={styles.cardLabel}>Best Week</Text>
          <Text style={styles.cardValue}>{performanceData.summary.best_week_points}</Text>
          <Text style={styles.cardTrend}>Week {performanceData.summary.best_week_number}</Text>
        </View>
      </View>

      {/* Filters */}
      <Text style={styles.sectionTitle}>Filters</Text>
      
      <Text style={styles.filterLabel}>Time Period:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterContainer}>
          {timeOptions.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.filterButton, timeFilter === option && styles.filterButtonActive]}
              onPress={() => setTimeFilter(option)}
            >
              <Text style={[styles.filterButtonText, timeFilter === option && styles.filterButtonTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      <Text style={styles.filterLabel}>Material:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.filterContainer}>
          {materialOptions.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.filterButton, materialFilter === option && styles.filterButtonActive]}
              onPress={() => setMaterialFilter(option)}
            >
              <Text style={[styles.filterButtonText, materialFilter === option && styles.filterButtonTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Weekly Trend Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📈 Weekly Points Trend</Text>
        {lineChartData.labels.length > 0 ? (
          <LineChart
            data={lineChartData}
            width={screenWidth}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f8faf8',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: () => CHART_COLORS.lineChart,
              labelColor: () => '#333',
              style: { borderRadius: 16 },
              propsForLabels: {
                fontSize: 12
              }
            }}
            bezier
            style={styles.chart}
            fromZero={true}
          />
        ) : (
          <View style={styles.noData}>
            <Text>No trend data available</Text>
          </View>
        )}
      </View>

      {/* Material Breakdown */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Material Breakdown</Text>
        
        {hasPieChartData ? (
          <>
            <PieChart
              data={pieChartData}
              width={screenWidth}
              height={200}
              chartConfig={{
                color: () => '#000',
                decimalPlaces: 0
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              hasLegend={true}
              absolute={false}
            />
            
            {/* Additional Material Details */}
            <View style={styles.materialList}>
              {performanceData.materialBreakdown
                .filter(item => item.total_points > 0)
                .map((item, index) => {
                  const percentage = totalPiePoints > 0 
                    ? Math.round((item.total_points / totalPiePoints) * 100) 
                    : 0;
                  
                  return (
                    <View key={index} style={styles.materialItem}>
                      <View style={[styles.materialDot, { backgroundColor: CHART_COLORS[item.material_type] }]} />
                      <Text style={styles.materialText}>
                        {item.material_type}: {item.total_points} pts ({percentage}%)
                      </Text>
                    </View>
                  );
                })}
            </View>
          </>
        ) : (
          <View style={styles.noData}>
            <Text>No material data available</Text>
            <Text style={styles.noDataSubtitle}>Try selecting a different filter</Text>
          </View>
        )}
      </View>

      {/* Motivation & Achievement Card */}
<View style={styles.achievementCard}>
  <Text style={styles.achievementTitle}>🎉 Keep up the great work!</Text>

  <Text style={styles.achievementSubtitle}>
    You're doing an amazing job contributing to a greener UTM 🌱
  </Text>

  <View style={styles.achievementRow}>
    <Text style={styles.achievementIcon}>🏆</Text>
    <Text style={styles.achievementText}>
      Top <Text style={styles.highlight}>15%</Text> of all recyclers in UTM
    </Text>
  </View>

  <View style={styles.achievementRow}>
    <Text style={styles.achievementIcon}>🔥</Text>
    <Text style={styles.achievementText}>
      <Text style={styles.highlight}>Top Contributor</Text> this period
    </Text>
  </View>

  <View style={styles.achievementRow}>
    <Text style={styles.achievementIcon}>📅</Text>
    <Text style={styles.achievementText}>
      <Text style={styles.highlight}>6-week</Text> recycling streak
    </Text>
  </View>
</View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf8' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  
  statusBar: { padding: 10, alignItems: 'center' },
  statusText: { color: 'white', fontWeight: '600' },
  
  header: { 
    backgroundColor: '#2E7D32', 
    padding: 20, 
    alignItems: 'center' 
  },
  headerTitle: { 
    color: 'white', 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    margin: 15, 
    color: '#2E7D32' 
  },
  
  summaryGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15 
  },
  card: { 
    backgroundColor: 'white', 
    width: '48%', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  cardIcon: { 
    fontSize: 24, 
    marginBottom: 5 
  },
  cardLabel: { 
    color: '#666', 
    fontSize: 14 
  },
  cardValue: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2E7D32', 
    marginVertical: 5 
  },
  cardTrend: { 
    color: '#4CAF50', 
    fontSize: 12 
  },
  
  filterLabel: { 
    fontWeight: 'bold', 
    marginLeft: 15, 
    marginBottom: 5, 
    color: '#333' 
  },
  filterContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 15, 
    marginBottom: 15 
  },
  filterButton: { 
    backgroundColor: '#e9ecef', 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 8 
  },
  filterButtonActive: { 
    backgroundColor: '#2E7D32' 
  },
  filterButtonText: { 
    color: '#495057' 
  },
  filterButtonTextActive: { 
    color: 'white' 
  },
  
  chartCard: { 
    backgroundColor: 'white', 
    margin: 15, 
    padding: 20, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  chartTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginBottom: 15 
  },
  chart: { 
    borderRadius: 12,
    marginVertical: 8
  },
  noData: { 
    height: 150, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  noDataSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 5
  },
  
  materialList: { 
    marginTop: 15 
  },
  materialItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  materialDot: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    marginRight: 10 
  },
  materialText: { 
    fontSize: 14, 
    color: '#555' 
  },
  
  debugCard: {
    backgroundColor: '#f0f0f0',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#666'
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333'
  },
  achievementCard: {
  backgroundColor: '#E8F5E9',
  marginHorizontal: 15,
  marginBottom: 30,
  padding: 20,
  borderRadius: 16,
  borderLeftWidth: 5,
  borderLeftColor: '#2E7D32',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2
},

achievementTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#2E7D32',
  marginBottom: 6
},

achievementSubtitle: {
  fontSize: 14,
  color: '#555',
  marginBottom: 15
},

achievementRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10
},

achievementIcon: {
  fontSize: 20,
  marginRight: 10
},

achievementText: {
  fontSize: 14,
  color: '#333'
},

highlight: {
  fontWeight: 'bold',
  color: '#2E7D32'
}

});