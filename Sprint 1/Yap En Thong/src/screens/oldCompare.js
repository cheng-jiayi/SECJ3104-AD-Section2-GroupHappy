import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { apiService, DEMO_USER_ID } from '../../services/api';

// Filter options
const timeOptions = ['Last Week', 'Last 4 Weeks', 'Last 6 Weeks', 'All Time'];
const comparisonOptions = ['Faculty Average', 'Top Performers', 'Campus Average'];

const timeFilterMap = {
  'Last Week': 'week',
  'Last 4 Weeks': '4weeks',
  'Last 6 Weeks': '6weeks',
  'All Time': 'all'
};

const comparisonFilterMap = {
  'Faculty Average': 'faculty',
  'Top Performers': 'top',
  'Campus Average': 'campus'
};

export default function ComparePerformanceScreen() {
  const navigation = useNavigation();
  const [timeFilter, setTimeFilter] = useState('Last 6 Weeks');
  const [comparisonFilter, setComparisonFilter] = useState('Faculty Average');
  const [loading, setLoading] = useState(true);
  const [compareData, setCompareData] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    loadData();
  }, [timeFilter, comparisonFilter]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      const filters = {
        period: timeFilterMap[timeFilter],
        comparison: comparisonFilterMap[comparisonFilter]
      };
      
      console.log('Loading compare data with filters:', filters);
      
      const result = await apiService.getComparePerformance(DEMO_USER_ID, filters);
      
      if (result.success && result.data) {
        setCompareData(result.data);
        setApiConnected(!result.using_sample);
        
        // Prepare chart data
        prepareChartData(result.data);
        
        console.log('Compare data loaded:', {
          rank: result.data.rank,
          percentile: result.data.percentile,
          points: result.data.performanceSummary.yourPoints
        });
      }
    } catch (error) {
      console.error('Error loading compare data:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (data) => {
    if (comparisonFilter === 'Top Performers' && data.comparisonData) {
      // Bar chart for top performers comparison
      const labels = data.comparisonData.slice(0, 5).map(user => 
        user.name.split(' ')[0]
      );
      const points = data.comparisonData.slice(0, 5).map(user => user.points);
      
      // Add current user if not in top 5
      const userIndex = labels.findIndex(label => label === "Ali");
      if (userIndex === -1) {
        labels.push("You");
        points.push(data.performanceSummary.yourPoints);
      }

      setChartData({
        type: 'bar',
        labels,
        datasets: [{
          data: points
        }]
      });
    } else {
      // Line chart for trend comparison
      const labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
      const userData = [45, 52, 67, 58, 62, 75]; // Sample user data
      const averageData = [30, 35, 42, 38, 45, 50]; // Sample average data
      
      setChartData({
        type: 'line',
        labels,
        datasets: [
          { data: userData, color: () => '#2E7D32', label: 'Your Performance' },
          { data: averageData, color: () => '#4CAF50', label: `${comparisonFilter}` }
        ]
      });
    }
  };

  if (loading || !compareData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading comparison data...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - 40;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: apiConnected ? '#4CAF50' : '#FF9800' }]}>
        <Text style={styles.statusText}>
          {apiConnected ? '✅ Connected to Database' : '⚠️ Using Sample Data'}
        </Text>
      </View>

      {/* Header with two icon buttons */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Compare Performance</Text>
        
        <View style={styles.headerIcons}>
          {/* My Performance Button */}
          <TouchableOpacity onPress={() => navigation.navigate('MyPerformance')}>
            <Image
              source={require('../../media/profits.png')}
              style={styles.headerIconImage}
            />
          </TouchableOpacity>

          {/* Community Overview Button */}
          <TouchableOpacity onPress={() => navigation.navigate('CommunityOverview')}>
            <Image
              source={require('../../media/community.png')}
              style={styles.headerIconImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Time Period:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
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

        <Text style={styles.filterLabel}>Compare With:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {comparisonOptions.map(option => (
              <TouchableOpacity
                key={option}
                style={[styles.filterButton, comparisonFilter === option && styles.filterButtonActive]}
                onPress={() => setComparisonFilter(option)}
              >
                <Text style={[styles.filterButtonText, comparisonFilter === option && styles.filterButtonTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Rank</Text>
          <Text style={styles.summaryValue}>#{compareData.rank}</Text>
          <Text style={styles.summarySub}>Out of {compareData.totalStudents} students</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Top Percentile</Text>
          <Text style={styles.summaryValue}>{compareData.percentile}%</Text>
          <Text style={styles.summarySub}>You're ahead of this many</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Points to Next</Text>
          <Text style={styles.summaryValue}>{compareData.pointsToNext}</Text>
          <Text style={styles.summarySub}>Keep recycling!</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>vs Average</Text>
          <Text style={styles.summaryValue}>+{compareData.avgComparison}%</Text>
          <Text style={styles.summarySub}>Above community average</Text>
        </View>
      </View>

      {/* Notification Box */}
      <View style={styles.notifBox}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
          You're Only {compareData.pointsToNext} Points Away!
        </Text>
        <Text style={{ marginTop: 5, color: '#555' }}>
          That's about {Math.ceil(compareData.pointsToNext / 20)} more items to reach rank #{compareData.rank - 1}.
        </Text>
        <View style={styles.notifBtn}>
          <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>Leaderboard resets in 3 days</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>
          {comparisonFilter === 'Top Performers' ? '🏆 Top Performers Comparison' : '📈 Performance Trend'}
        </Text>
        
        {chartData && chartData.type === 'bar' ? (
          <BarChart
            data={chartData}
            width={screenWidth}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f8faf8',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: () => '#2E7D32',
              labelColor: () => '#333',
              style: { borderRadius: 16 },
              barPercentage: 0.6,
            }}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            fromZero={true}
          />
        ) : chartData && chartData.type === 'line' ? (
          <LineChart
            data={chartData}
            width={screenWidth}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f8faf8',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: () => '#2E7D32',
              labelColor: () => '#333',
              style: { borderRadius: 16 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
              },
            }}
            bezier
            style={styles.chart}
            fromZero={true}
            withShadow={false}
          />
        ) : (
          <View style={styles.noData}>
            <Text>No chart data available</Text>
          </View>
        )}
        
        <Text style={styles.chartSubtitle}>
          {comparisonFilter === 'Top Performers' 
            ? 'Comparison with top 5 performers' 
            : 'Your performance vs community average'}
        </Text>
      </View>

      {/* Summary Footer */}
      <View style={styles.summaryFooter}>
        <Text style={styles.summaryFooterText}>
          Performance Summary: You're performing {compareData.avgComparison}% better than the {comparisonFilter.toLowerCase()} 
          with {compareData.performanceSummary.yourPoints.toLocaleString()} points and {compareData.performanceSummary.yourItems} items recycled.
        </Text>
      </View>

      {/* Diamond Tier */}
      <Text style={styles.sectionTitle}>Diamond Tier 🏅</Text>
      <View style={styles.tierContainer}>
        {compareData.diamondTier.map(user => (
          <View key={user.rank} style={styles.tierCard}>
            <Text style={styles.tierRank}>{user.rank}</Text>
            <View style={styles.tierAvatar}>
              <Text style={{ fontWeight: 'bold', color: '#2E7D32', fontSize: 18 }}>
                {user.initial}
              </Text>
            </View>
            <View style={styles.tierInfo}>
              <Text style={styles.tierName}>{user.name}</Text>
              <Text style={styles.tierItems}>{user.items} items recycled</Text>
              <Text style={styles.tierPoints}>{user.points.toLocaleString()} points</Text>
            </View>
            {user.rank === 1 && (
              <View style={styles.crownBadge}>
                <Text style={{ fontSize: 20 }}>👑</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Debug Info (Optional) */}
      <View style={styles.debugCard}>
        <Text style={styles.debugTitle}>Debug Info</Text>
        <Text>Filter: {timeFilter} | {comparisonFilter}</Text>
        <Text>Data from: {apiConnected ? 'Database' : 'Sample'}</Text>
        <Text>User ID: {DEMO_USER_ID}</Text>
        <Text>Points: {compareData.performanceSummary.yourPoints}</Text>
        <Text>Items: {compareData.performanceSummary.yourItems}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8faf8', 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faf8'
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16
  },
  statusBar: {
    padding: 10,
    alignItems: 'center'
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  headerContainer: {
    backgroundColor: '#2E7D32',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  headerText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 22 
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  headerIconImage: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
    tintColor: 'white'
  },
  filtersContainer: {
    paddingHorizontal: 15,
    marginBottom: 15
  },
  filterLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    color: '#333'
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 15
  },
  filterButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center'
  },
  filterButtonActive: {
    backgroundColor: '#2E7D32'
  },
  filterButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500'
  },
  filterButtonTextActive: {
    color: 'white'
  },
  summaryRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15,
    marginBottom: 15
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: { 
    fontSize: 14, 
    color: '#666',
    fontWeight: '500'
  },
  summaryValue: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginVertical: 8,
    color: '#2E7D32'
  },
  summarySub: { 
    fontSize: 12, 
    color: '#777'
  },
  notifBox: {
    marginHorizontal: 15,
    marginTop: 10,
    padding: 20,
    backgroundColor: '#fff7e6',
    borderLeftWidth: 6,
    borderLeftColor: '#ffb84d',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notifBtn: {
    marginTop: 10,
    backgroundColor: '#ffc045',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  chartBox: {
    marginHorizontal: 15,
    marginTop: 25,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2E7D32'
  },
  chart: {
    borderRadius: 12,
    marginVertical: 8
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10
  },
  noData: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  summaryFooter: {
    marginHorizontal: 15,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryFooterText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22
  },
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginTop: 35,
    marginHorizontal: 15,
    marginBottom: 15,
    color: '#2E7D32'
  },
  tierContainer: { 
    marginHorizontal: 15,
    marginBottom: 30
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative'
  },
  tierRank: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2E7D32', 
    width: 40,
    textAlign: 'center'
  },
  tierAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f3ea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32'
  },
  tierInfo: { 
    flex: 1,
    marginLeft: 15
  },
  tierName: { 
    fontWeight: 'bold', 
    fontSize: 16,
    color: '#333'
  },
  tierItems: { 
    fontSize: 14, 
    color: '#666',
    marginTop: 2
  },
  tierPoints: { 
    fontSize: 14, 
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2
  },
  crownBadge: {
    position: 'absolute',
    top: -10,
    right: 15
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
  }
});
