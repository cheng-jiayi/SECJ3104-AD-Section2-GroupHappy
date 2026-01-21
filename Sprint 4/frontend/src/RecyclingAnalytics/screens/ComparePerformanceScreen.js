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
import { LineChart } from 'react-native-chart-kit';
import { apiService, DEMO_USER_ID } from '../services/api';

const timeOptions = ['Last Week', 'Last 4 Weeks', 'Last 6 Weeks'];
const comparisonOptions = ['Faculty Average', 'Campus Average'];

const timeFilterMap = {
  'Last Week': 'week',
  'Last 4 Weeks': '4weeks',
  'Last 6 Weeks': '6weeks'
};

const comparisonFilterMap = {
  'Faculty Average': 'faculty',
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
        
        prepareChartData(result.data);
        
        console.log('Compare data loaded:', {
          rank: result.data.rank,
          percentile: result.data.percentile,
          points: result.data.performanceSummary.yourPoints,
          trendLabels: result.data.trendData?.labels,
          userTrend: result.data.trendData?.userTrend,
          comparisonTrend: result.data.trendData?.comparisonTrend
        });
      }
    } catch (error) {
      console.error('Error loading compare data:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepareChartData = (data) => {
    if (!data || !data.trendData) {
      setChartData({
        labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
        datasets: [
          { data: [280, 350, 420, 380, 450, 520], color: () => '#2E7D32' },
          { data: [220, 280, 320, 300, 350, 410], color: () => '#4CAF50' }
        ]
      });
      return;
    }

    const { labels, userTrend, comparisonTrend } = data.trendData;
    
    if (!labels || labels.length === 0 || !userTrend || userTrend.length === 0) {
      const fallbackLabels = timeFilter === 'Last Week' 
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        : timeFilter === 'Last 4 Weeks'
        ? ['W1', 'W2', 'W3', 'W4']
        : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
      
      const fallbackUserTrend = timeFilter === 'Last Week'
        ? [85, 92, 78, 105, 120, 65, 95]
        : timeFilter === 'Last 4 Weeks'
        ? [320, 380, 420, 360]
        : [280, 350, 420, 380, 450, 520];
      
      const fallbackComparisonTrend = timeFilter === 'Last Week'
        ? [65, 70, 62, 80, 85, 55, 75]
        : timeFilter === 'Last 4 Weeks'
        ? [250, 290, 310, 280]
        : [220, 280, 320, 300, 350, 410];
      
      setChartData({
        labels: fallbackLabels,
        datasets: [
          { data: fallbackUserTrend, color: () => '#2E7D32' },
          { data: fallbackComparisonTrend, color: () => '#4CAF50' }
        ]
      });
      return;
    }
    
    setChartData({
      labels: labels,
      datasets: [
        { 
          data: userTrend,
          color: () => '#2E7D32',
          strokeWidth: 3
        },
        { 
          data: comparisonTrend,
          color: () => '#4CAF50',
          strokeWidth: 2
        }
      ]
    });
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
      {/* <View style={[styles.statusBar, { backgroundColor: apiConnected ? '#4CAF50' : '#FF9800' }]}>
        <Text style={styles.statusText}>
          {apiConnected ? '✅ Connected to Database' : '⚠️ Using Sample Data'}
        </Text>
      </View> */}

      {/* Header with two icon buttons */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Compare Performance</Text>
        
        <View style={styles.headerIcons}>
          {/* My Performance Button */}
          <TouchableOpacity onPress={() => navigation.navigate('MyPerformance')}>
            <Image
              source={require('../media/profits.png')}
              style={styles.headerIconImage}
            />
          </TouchableOpacity>

          {/* Community Overview Button */}
          <TouchableOpacity onPress={() => navigation.navigate('CommunityOverview')}>
            <Image
              source={require('../media/community.png')}
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
      {compareData.pointsToNext > 0 && (
        <View style={styles.notifBox}>
          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
            You're Only {compareData.pointsToNext} Points Away!
          </Text>
          <Text style={{ marginTop: 5, color: '#555' }}>
            That's about {Math.ceil(compareData.pointsToNext / 20)} more items to reach rank #{Math.max(1, compareData.rank - 1)}.
          </Text>
          <View style={styles.notifBtn}>
            <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>Leaderboard resets in 3 days</Text>
          </View>
        </View>
      )}

      {/* Performance Trend Chart */}
      <View style={styles.chartBox}>
        <Text style={styles.chartTitle}>
          📈 Performance Trend: You vs {comparisonFilter}
        </Text>
        
        {chartData ? (
          <>
            <LineChart
              data={chartData}
              width={screenWidth}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#f8faf8',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: () => '#333',
                labelColor: () => '#333',
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#ffffff'
                },
                propsForLabels: {
                  fontSize: timeFilter === 'Last Week' ? 9 : 10
                },
                propsForBackgroundLines: {
                  strokeDasharray: ''
                }
              }}
              bezier
              style={styles.chart}
              fromZero={true}
              withShadow={false}
              withInnerLines={true}
              withOuterLines={true}
              segments={4}
            />
            
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
                <Text style={styles.legendText}>Your Performance</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>{comparisonFilter}</Text>
              </View>
            </View>
            
            <Text style={styles.chartSubtitle}>
              {timeFilter} • Points shown per {timeFilter === 'Last Week' ? 'day' : 'week'}
            </Text>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No trend data available</Text>
            <Text style={styles.noDataSubtext}>Try selecting a different time period</Text>
          </View>
        )}
      </View>

      {/* Summary Footer */}
      <View style={styles.summaryFooter}>
        <Text style={styles.summaryFooterText}>
          📊 <Text style={{ fontWeight: 'bold' }}>Performance Summary:</Text> You're performing {compareData.avgComparison}% better than the {comparisonFilter.toLowerCase()} 
          with {compareData.performanceSummary.yourPoints.toLocaleString()} points and {compareData.performanceSummary.yourItems} items recycled in the {timeFilter.toLowerCase()}.
        </Text>
      </View>

      {/* Diamond Tier */}
      <Text style={styles.sectionTitle}>🏆 Diamond Tier</Text>
      <View style={styles.tierContainer}>
        {compareData.diamondTier.map(user => (
          <View key={user.rank} style={styles.tierCard}>
            <View style={styles.tierRankContainer}>
              <Text style={styles.tierRank}>#{user.rank}</Text>
              {user.rank === 1 && <Text style={styles.crownIcon}>👑</Text>}
            </View>
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
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>Top {user.rank}</Text>
            </View>
          </View>
        ))}
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
    minWidth: 110,
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
    minHeight: 320
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
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 20
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  legendText: {
    fontSize: 12,
    color: '#666'
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic'
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5
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
  tierRankContainer: {
    width: 40,
    alignItems: 'center'
  },
  tierRank: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2E7D32'
  },
  crownIcon: {
    fontSize: 16,
    marginTop: 2
  },
  tierAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f3ea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
    marginLeft: 10
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
  tierBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E7D32'
  },
  tierBadgeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600'
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