import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { analyticsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ChartComponent from '../components/ChartComponent';
import { formatNumber } from '../utils/helpers';

// ============================================
// HELPER FUNCTIONS FOR DYNAMIC INSIGHTS
// ============================================

const getGrowthPatternInsight = (faculty, historicalData, prediction) => {
  if (!historicalData || historicalData.length < 2) {
    return {
      icon: 'chart-line',
      color: '#666666',
      title: 'Growth Analysis',
      text: 'Not enough data to analyze growth. Generate prediction to see insights.',
      recommendation: 'Click "Generate Prediction" button to start analysis'
    };
  }

  // Compute growth rate over selected period
  const latest = historicalData[0].total_points || 0;
  const oldest = historicalData[historicalData.length - 1].total_points || 0;
  const growthRate = ((latest - oldest) / (oldest || 1)) * 100;

  let trendLevel = 'Stable';
  let color = '#FF9800';
  let icon = 'trending-neutral';
  if (growthRate > 20) { trendLevel = 'Strong Growth'; color = '#2E7D32'; icon = 'trending-up'; }
  else if (growthRate > 5) { trendLevel = 'Moderate Growth'; color = '#4CAF50'; icon = 'trending-up'; }
  else if (growthRate < -10) { trendLevel = 'Sharp Decline'; color = '#D32F2F'; icon = 'trending-down'; }
  else if (growthRate < -5) { trendLevel = 'Moderate Decline'; color = '#F44336'; icon = 'trending-down'; }

  const participationRate = prediction?.participation_rate_percent || 0;

  return {
    icon,
    color,
    title: trendLevel,
    text: `${faculty} shows a ${trendLevel.toLowerCase()} trend (${growthRate.toFixed(1)}% change over ${historicalData.length} months).`,
    recommendation: growthRate > 0
      ? participationRate > 60 ? 'Increase targets by 15-20% next month' : 'Maintain momentum with targeted campaigns'
      : 'Investigate barriers and implement awareness or incentives'
  };
};

const getSeasonalInsight = (faculty, historicalData) => {
  if (!historicalData || historicalData.length === 0) return {
    icon: 'calendar-blank',
    color: '#FF9800',
    title: 'Seasonal Factors',
    text: 'No historical data to detect seasonal trends.',
    recommendation: 'Collect more data to analyze seasonal patterns'
  };

  const currentMonth = new Date().getMonth() + 1;
  const monthlyAvg = {};

  // Compute average points per month across historical data
  historicalData.forEach(item => {
    const month = parseInt(item.month_year.split('-')[1]);
    monthlyAvg[month] = (monthlyAvg[month] || []);
    monthlyAvg[month].push(item.total_points || 0);
  });

  const avgCurrentMonth = (monthlyAvg[currentMonth] || [0]).reduce((a, b) => a + b, 0) / ((monthlyAvg[currentMonth]?.length) || 1);
  const overallAvg = historicalData.reduce((a, b) => a + (b.total_points || 0), 0) / historicalData.length;

  let seasonText = '';
  let icon = 'calendar-blank';
  let color = '#FF9800';

  if (avgCurrentMonth > overallAvg * 1.1) {
    seasonText = `Current month is a PEAK season for ${faculty}. Expect higher participation than average.`;
    icon = 'calendar-star';
    color = '#2196F3';
  } else if (avgCurrentMonth < overallAvg * 0.9) {
    seasonText = `Current month is a LOW season for ${faculty}. Participation may be lower than average.`;
    icon = 'calendar-remove';
    color = '#F44336';
  } else {
    seasonText = `Current month shows typical participation for ${faculty}.`;
    icon = 'calendar-blank';
    color = '#FF9800';
  }

  return {
    icon,
    color,
    title: 'Seasonal Trends',
    text: seasonText,
    recommendation: avgCurrentMonth > overallAvg
      ? 'Capitalize on peak participation with special campaigns'
      : 'Boost engagement with promotions or events this month'
  };
};

const getMaterialFocusInsight = (historicalData) => {
  if (!historicalData || historicalData.length === 0) return {
    icon: 'recycle',
    color: '#4CAF50',
    title: 'Material Focus',
    text: 'No data to determine material usage patterns.',
    recommendation: 'Collect more material-level data'
  };

  // Use total_points or total_kg as proxy
  const latest = historicalData[0];
  const totalPoints = latest.total_points || 0;
  const totalKg = latest.total_kg || 0;

  return {
    icon: 'recycle',
    color: '#4CAF50',
    title: 'Material Focus',
    text: `Latest data: ${totalPoints} points, ${totalKg} kg recycled. Detailed material breakdown not available.`,
    recommendation: 'Collect material-level data to track trends per material'
  };
};

const getPredictionConfidence = (historicalData, prediction) => {
  if (!historicalData || historicalData.length < 2) return {
    icon: 'chart-line',
    color: '#FFC107',
    title: 'Prediction Confidence',
    text: 'Insufficient data to determine prediction confidence.',
    recommendation: 'Generate more data points for reliable prediction'
  };

  const points = historicalData.map(d => d.total_points || 0);
  const avgPoints = points.reduce((a, b) => a + b, 0) / points.length;
  const variance = points.reduce((sum, p) => sum + Math.pow(p - avgPoints, 2), 0) / points.length;

  let confidence = 80 - (variance / (avgPoints || 1)) * 50;
  confidence = Math.max(55, Math.min(95, Math.round(confidence)));

  const confidenceLevel = confidence >= 85 ? 'HIGH'
                        : confidence >= 75 ? 'MEDIUM-HIGH'
                        : confidence >= 65 ? 'MODERATE'
                        : 'LOW';
  const color = confidence >= 85 ? '#4CAF50'
              : confidence >= 75 ? '#8BC34A'
              : confidence >= 65 ? '#FFC107'
              : '#F44336';
  const icon = confidence >= 75 ? 'chart-box' : 'chart-line';

  return {
    icon,
    color,
    title: 'Prediction Confidence',
    text: `${confidenceLevel} confidence (${confidence}%) based on historical data variability.`,
    recommendation: confidence >= 80
      ? 'Prediction is reliable for planning.'
      : 'Use prediction cautiously and monitor results'
  };
};

const getEngagementStrategyInsight = (faculty, historicalData, prediction) => {
  if (!historicalData || historicalData.length === 0) {
    return {
      icon: 'lightbulb-on',
      color: '#9C27B0',
      title: 'Engagement Strategy',
      text: 'Not enough data to provide engagement strategy.',
      recommendation: 'Generate prediction and collect participation data first.'
    };
  }

  // Latest month data
  const latest = historicalData[0];
  const participationRate = latest?.participation_rate_percent || 0;
  const avgPoints = latest?.avg_points_per_transaction || 0;
  const totalStudents = latest?.unique_users || 0;

  // Compute trend over last 3 months if possible
  let trend = 'stable';
  if (historicalData.length >= 3) {
    const lastThree = historicalData.slice(0, 3).map(d => d.participation_rate_percent || 0);
    const avgLastThree = lastThree.reduce((a,b)=>a+b,0)/lastThree.length;
    trend = participationRate > avgLastThree + 5 ? 'upward' 
          : participationRate < avgLastThree - 5 ? 'downward' 
          : 'stable';
  }

  // Determine engagement level
  let level = 'medium';
  if (participationRate >= 60) level = 'high';
  else if (participationRate <= 30) level = 'low';

  // Assign icon and color
  const levelConfig = {
    high: { icon: 'trophy-award', color: '#FFC107', title: 'High Engagement' },
    medium: { icon: 'chart-line-variant', color: '#2196F3', title: 'Moderate Engagement' },
    low: { icon: 'alert-decagram', color: '#F44336', title: 'Needs Attention' }
  };

  const config = levelConfig[level];

  // Generate actionable recommendations dynamically
  const recommendations = [];
  if (level === 'high') {
    recommendations.push('Showcase faculty as a sustainability model');
    recommendations.push('Invite top participants to lead inter-faculty workshops');
    if (trend === 'upward') recommendations.push('Increase recycling challenges to maintain momentum');
  } else if (level === 'medium') {
    recommendations.push('Introduce targeted challenges or incentives');
    recommendations.push('Assign student ambassadors to motivate peers');
    if (trend === 'downward') recommendations.push('Run awareness campaigns to counteract drop');
  } else { // low
    recommendations.push('Deploy additional recycling infrastructure');
    recommendations.push('Hold urgent faculty meetings to identify barriers');
    recommendations.push('Launch bonus points program or competitions');
  }

  return {
    icon: config.icon,
    color: config.color,
    title: config.title,
    text: `${faculty} has ${participationRate.toFixed(1)}% participation. Average points per user: ${avgPoints.toFixed(1)}. Trend over last months: ${trend}.`,
    recommendation: recommendations[0], // main actionable item
    actions: recommendations
  };
};

// ============================================
// MAIN COMPONENT
// ============================================

const PredictTrends = ({ navigation }) => {
  const [trendsData, setTrendsData] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState('FKE');
  const [months, setMonths] = useState(6);
  const [loading, setLoading] = useState({
    trends: false,
    prediction: false,
  });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const faculties = [
    'FKE', 'FS', 'FABU', 'FKT', 'FK', 'FKM', 'FSSH', 'FEST', 'FM', 'SPACE'
  ];

  const fetchTrends = async () => {
    try {
      setLoading(prev => ({ ...prev, trends: true }));
      const response = await analyticsAPI.getRecyclingTrends(selectedFaculty, months);
      
      if (response.data.success) {
        const sanitizedData = response.data.data.map(item => ({
          ...item,
          unique_users: Number(item.unique_users) || 0,
          total_transactions: Number(item.total_transactions) || 0,
          total_points: Number(item.total_points) || 0,
          total_kg: Number(item.total_kg) || 0,
          avg_points_per_transaction: Number(item.avg_points_per_transaction) || 0,
          participation_rate_percent: Number(item.participation_percentage) || 0,
        }));

        setTrendsData(sanitizedData);
        setError(null);
      } else {
        throw new Error(response.data.message || 'Failed to fetch trends');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching trends:', err);
    } finally {
      setLoading(prev => ({ ...prev, trends: false }));
      setRefreshing(false);
    }
  };

  const fetchPrediction = async (latestTrendsData) => {
    try {
      setLoading(prev => ({ ...prev, prediction: true }));

      const response = await analyticsAPI.predictTrends(selectedFaculty);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to generate prediction');
      }

      const pred = response.data.data;

      // ✅ 计算上个月的 month string
      const today = new Date();
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthStr = lastMonthDate.toISOString().slice(0, 7); // YYYY-MM

      // ✅ 用刚 fetch 回来的 trends 数据查找 last month
      const lastMonthData = latestTrendsData.find(d => d.month_year === lastMonthStr);
      const lastMonthPoints = lastMonthData?.total_points ?? 0;

      const safeNumber = (val) => {
        const num = Number(val);
        return Number.isFinite(num) ? num : 0;
      };

      const predictionData = {
        faculty: pred.faculty || selectedFaculty,
        last_month_actual: lastMonthPoints,             // 上个月的点数
        last_month_label: lastMonthStr,                // 可选：显示月份
        three_month_average: safeNumber(pred.three_month_average ?? 0),
        predicted_points_next_month: safeNumber(pred.predicted_points_next_month ?? 0),
        trend_analysis: pred.trend_analysis ?? 'Stable Trend',
        confidence: safeNumber(pred.confidence) || 80,
      };

      setPrediction(predictionData);
      setError(null);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching prediction:', err);
    } finally {
      setLoading(prev => ({ ...prev, prediction: false }));
    }
  };


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrends();
  }, [selectedFaculty, months]);

  const handleGeneratePrediction = async () => {
    setError(null);

    try {
      // ✅ 先 fetch trends
      setLoading(prev => ({ ...prev, trends: true }));
      const response = await analyticsAPI.getRecyclingTrends(selectedFaculty, months);

      if (!response.data.success) throw new Error(response.data.message || 'Failed to fetch trends');

      const sanitizedData = response.data.data.map(item => ({
        ...item,
        unique_users: Number(item.unique_users) || 0,
        total_transactions: Number(item.total_transactions) || 0,
        total_points: Number(item.total_points) || 0,
        total_kg: Number(item.total_kg) || 0,
        avg_points_per_transaction: Number(item.avg_points_per_transaction) || 0,
        participation_rate_percent: Number(item.participation_percentage) || 0,
      }));

      setTrendsData(sanitizedData);

      // ✅ 直接用最新 trends 数据去 fetch prediction
      await fetchPrediction(sanitizedData);

    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, trends: false }));
      setRefreshing(false);
    }
  };

  const handleFacultyChange = (faculty) => {
    setSelectedFaculty(faculty);
    setPrediction(null);
  };

  const handleMonthsChange = (value) => {
    setMonths(value);
    setPrediction(null);
  };

  const prepareTrendsChartData = () => {
    if (trendsData.length === 0) {
      return {
        labels: ['No Data'],
        values: [0]
      };
    }

    // Filter and sort data for selected faculty
    const facultyData = trendsData
      .filter(item => item.faculty === selectedFaculty)
      .sort((a, b) => a.month_year.localeCompare(b.month_year));

    if (facultyData.length === 0) {
      return {
        labels: ['No Data'],
        values: [0]
      };
    }

    const labels = facultyData.map(item => {
      const [year, month] = item.month_year.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month) - 1]} '${year.slice(2)}`;
    });

    const values = facultyData.map(item => item.total_points || 0);

    return {
      labels,
      values,
    };
  };

  const prepareHistoricalData = () => {
    if (trendsData.length === 0) return [];
    
    return trendsData
      .filter(item => item.faculty === selectedFaculty)
      .sort((a, b) => b.month_year.localeCompare(a.month_year))
      .slice(0, months);
  };

  const getCurrentParticipationRate = () => {
    if (trendsData.length === 0) return 0;
    const latestData = trendsData
      .filter(item => item.faculty === selectedFaculty)
      .sort((a, b) => b.month_year.localeCompare(a.month_year))[0];
    
    return latestData?.participation_rate_percent || 0;
  };

  const getDataPointsCount = () => {
    return trendsData.filter(item => item.faculty === selectedFaculty).length;
  };

  const getTrendStability = () => {
    const facultyData = trendsData.filter(item => item.faculty === selectedFaculty);
    if (facultyData.length < 3) return 'insufficient';
    
    const points = facultyData.map(item => item.total_points).filter(p => p > 0);
    if (points.length < 2) return 'insufficient';
    
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    const variance = points.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / points.length;
    
    return variance < (avg * 0.1) ? 'stable' : variance > (avg * 0.3) ? 'volatile' : 'moderate';
  };

  // Initial data fetch
  if (error && !trendsData.length) {
    return <ErrorMessage message={error} onRetry={fetchTrends} />;
  }

  const chartData = prepareTrendsChartData();
  const historicalData = prepareHistoricalData();
  const participationRate = getCurrentParticipationRate();
  const dataPoints = getDataPointsCount();
  const trendStability = getTrendStability();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#2E7D32']}
          tintColor="#2E7D32"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trend Prediction & Analysis</Text>
        <View style={styles.headerRight} />
      </View> */}

      {/* Controls Section */}
      <View style={styles.controlsContainer}>
        <Text style={styles.sectionTitle}>Analysis Parameters</Text>
        
        <Text style={styles.controlLabel}>Select Faculty</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.facultyScroll}
          contentContainerStyle={styles.facultyScrollContent}
        >
          {faculties.map(faculty => (
            <TouchableOpacity
              key={faculty}
              style={[
                styles.facultyButton,
                selectedFaculty === faculty && styles.facultyButtonActive
              ]}
              onPress={() => handleFacultyChange(faculty)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.facultyButtonText,
                selectedFaculty === faculty && styles.facultyButtonTextActive
              ]}>
                {faculty}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.controlLabel}>Analysis Period</Text>
        <View style={styles.timeContainer}>
          {[3, 6, 9, 12].map(month => (
            <TouchableOpacity
              key={month}
              style={[
                styles.timeButton,
                months === month && styles.timeButtonActive
              ]}
              onPress={() => handleMonthsChange(month)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.timeButtonText,
                months === month && styles.timeButtonTextActive
              ]}>
                {month}M
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[
            styles.predictButton,
            (loading.trends || loading.prediction) && styles.predictButtonDisabled
          ]}
          onPress={handleGeneratePrediction}
          disabled={loading.trends || loading.prediction}
          activeOpacity={0.8}
        >
          {loading.prediction ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="crystal-ball" size={22} color="#fff" />
          )}
          <Text style={styles.predictButtonText}>
            {loading.prediction ? 'Generating...' : 'Generate Prediction'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Prediction Result Card */}
      {prediction && (
        <View style={styles.predictionCard}>
          <View style={styles.predictionHeader}>
            <View style={styles.predictionTitleContainer}>
              <Icon name="chart-line" size={20} color="#2E7D32" />
              <Text style={styles.predictionTitle}>
                Prediction for {prediction.faculty}
              </Text>
            </View>
            <View style={[
              styles.trendTag,
              prediction.trend_analysis?.includes('Growth') && styles.trendTagPositive,
              prediction.trend_analysis?.includes('Decline') && styles.trendTagNegative,
              prediction.trend_analysis?.includes('Stable') && styles.trendTagNeutral,
            ]}>
              <Text style={styles.trendTagText}>
                {prediction.trend_analysis || 'Analyzing...'}
              </Text>
            </View>
          </View>
          
          <View style={styles.predictionMetrics}>
            <View style={styles.predictionMetric}>
              <Text style={styles.metricLabel}>Last Month</Text>
              <Text style={styles.metricValue}>
                {formatNumber(prediction.last_month_actual)}
              </Text>
              <Text style={styles.metricUnit}>points</Text>
            </View>
            
            <View style={styles.predictionMetric}>
              <Text style={styles.metricLabel}>3-Month Avg</Text>
              <Text style={styles.metricValue}>
                {formatNumber(prediction.three_month_average)}
              </Text>
              <Text style={styles.metricUnit}>points</Text>
            </View>
            
            <View style={styles.predictionMetric}>
              <Text style={styles.metricLabel}>Next Month</Text>
              <Text style={[styles.metricValue, styles.metricValueHighlight]}>
                {formatNumber(prediction.predicted_points_next_month)}
              </Text>
              <Text style={styles.metricUnit}>points</Text>
            </View>
          </View>
          
          <View style={styles.confidenceBadge}>
            <Icon name="shield-check" size={16} color="#4CAF50" />
            <Text style={styles.confidenceText}>
              Confidence: {prediction.confidence || 80}%
            </Text>
          </View>
        </View>
      )}

      {/* Chart Section */}
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            Historical Trend: {selectedFaculty}
          </Text>
          <Text style={styles.chartSubtitle}>
            {months}-month analysis • {dataPoints} data points
          </Text>
        </View>
        
        {loading.trends ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Loading trend data...</Text>
          </View>
        ) : chartData.values.some(v => v > 0) ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartScrollContent}
          >
            <ChartComponent 
              type="line" 
              data={chartData}
              height={250}
              width={Math.max(chartData.labels.length * 60, Dimensions.get('window').width - 32)}
              color="#2E7D32"
            />
          </ScrollView>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="chart-line" size={48} color="#ccc" />
            <Text style={styles.noDataText}>No trend data available</Text>
            <Text style={styles.noDataSubtext}>Generate prediction to see historical trends</Text>
          </View>
        )}
      </View>

      {/* Historical Data Table */}
      {historicalData.length > 0 && (
        <View style={styles.dataTableContainer}>
          <Text style={styles.sectionTitle}>Historical Data ({selectedFaculty})</Text>
          <View style={styles.dataTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell, styles.tableCellMonth]}>Month</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Users</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell]}>Points</Text>
            </View>
            {historicalData.map((item, index) => (
              <View 
                key={index} 
                style={[
                  styles.tableRow,
                  index === 0 && styles.tableRowLatest
                ]}
              >
                <Text style={[styles.tableCell, styles.tableCellMonth]}>
                  {item.month_year}
                </Text>
                <Text style={styles.tableCell}>
                  {formatNumber(item.unique_users)}
                </Text>
                <Text style={styles.tableCell}>
                  {formatNumber(item.total_points)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Dynamic Insights Section */}
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Trend Analysis Insights</Text>
        <Text style={styles.insightsSubtitle}>
          Context-aware analysis for {selectedFaculty}
        </Text>

        {/* Prepare insights once to avoid repeated calls */}
        {(() => {
          const growthInsight = getGrowthPatternInsight(selectedFaculty, historicalData, prediction);
          const seasonalInsight = getSeasonalInsight(selectedFaculty, historicalData);
          const materialInsight = getMaterialFocusInsight(historicalData);
          const confidenceInsight = getPredictionConfidence(historicalData, prediction);
          const engagementInsight = getEngagementStrategyInsight(selectedFaculty, historicalData, prediction);

          return (
            <View style={styles.insightsGrid}>
              {/* Growth Patterns */}
              <View style={styles.insightBox}>
                <Icon name={growthInsight.icon} size={28} color={growthInsight.color} />
                <Text style={styles.insightBoxTitle}>{growthInsight.title}</Text>
                <Text style={styles.insightBoxText}>{growthInsight.text}</Text>
                <Text style={styles.insightRecommendation}>💡 {growthInsight.recommendation}</Text>
              </View>

              {/* Seasonal Factors */}
              <View style={styles.insightBox}>
                <Icon name={seasonalInsight.icon} size={28} color={seasonalInsight.color} />
                <Text style={styles.insightBoxTitle}>{seasonalInsight.title}</Text>
                <Text style={styles.insightBoxText}>{seasonalInsight.text}</Text>
                <Text style={styles.insightRecommendation}>📅 {seasonalInsight.recommendation}</Text>
              </View>

              {/* Material Focus */}
              <View style={styles.insightBox}>
                <Icon name={materialInsight.icon} size={28} color={materialInsight.color} />
                <Text style={styles.insightBoxTitle}>{materialInsight.title}</Text>
                <Text style={styles.insightBoxText}>{materialInsight.text}</Text>
                <Text style={styles.insightRecommendation}>♻️ {materialInsight.recommendation}</Text>
              </View>

              {/* Prediction Confidence */}
              <View style={styles.insightBox}>
                <Icon name={confidenceInsight.icon} size={28} color={confidenceInsight.color} />
                <Text style={styles.insightBoxTitle}>{confidenceInsight.title}</Text>
                <Text style={styles.insightBoxText}>{confidenceInsight.text}</Text>
                <Text style={styles.insightRecommendation}>🎯 {confidenceInsight.recommendation}</Text>
              </View>
            </View>
          );
        })()}
      </View>


    </ScrollView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    paddingVertical: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 32,
  },
  controlsContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 1,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    marginTop: 12,
  },
  facultyScroll: {
    marginHorizontal: -4,
  },
  facultyScrollContent: {
    paddingHorizontal: 4,
  },
  facultyButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fafafa',
    minWidth: 70,
    alignItems: 'center',
  },
  facultyButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  facultyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  facultyButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  timeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  timeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  timeButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    elevation: 2,
  },
  predictButtonDisabled: {
    backgroundColor: '#81C784',
    opacity: 0.8,
  },
  predictButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  predictionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  predictionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,              // 文字超长时收缩，不挤到右边
    marginRight: 8,
  },
  predictionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,

  },
  trendTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    flexShrink: 0,  
  },
  trendTagPositive: {
    backgroundColor: '#E8F5E9',
  },
  trendTagNegative: {
    backgroundColor: '#FFEBEE',
  },
  trendTagNeutral: {
    backgroundColor: '#FFF3E0',
  },
  trendTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
  },
  predictionMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  predictionMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333',
    marginBottom: 2,
  },
  metricValueHighlight: {
    color: '#2E7D32',
    fontSize: 26,
  },
  metricUnit: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    color: '#33691E',
    fontWeight: '600',
    marginLeft: 6,
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#777',
    marginTop: 4,
  },
  chartLoading: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  chartScrollContent: {
    paddingRight: 20,
  },
  noDataContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 4,
  },
  dataTableContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  dataTable: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  tableRowLatest: {
    backgroundColor: '#F1F8E9',
  },
  tableCell: {
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#444',
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
  },
  tableCellMonth: {
    flex: 1.5,
    textAlign: 'left',
    paddingLeft: 16,
  },
  tableHeaderCell: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 13,
  },
  insightsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 24,
  },
  insightsSubtitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightBox: {
    width: '48%',
    backgroundColor: '#fafafa',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  insightBoxFull: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderColor: '#e0e0e0',
  },
  insightBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  insightBoxText: {
    fontSize: 12.5,
    color: '#555',
    lineHeight: 18,
    marginBottom: 10,
  },
  insightRecommendation: {
    fontSize: 11.5,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 6,
    lineHeight: 16,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  engagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  engagementTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  participationBadge: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '700',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 6,
  },
  footerNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default PredictTrends;