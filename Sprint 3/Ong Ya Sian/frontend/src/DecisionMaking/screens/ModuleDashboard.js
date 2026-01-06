import React, { useState, useEffect } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { dashboardAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatNumber, formatPercentage } from '../utils/helpers';

const ModuleDashboard = ({ navigation }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getModuleDashboard();
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading && !refreshing) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchDashboardData} />;

  const { 
    engagement = [], 
    low_engagement = [], 
    insights = [], 
    metrics = [],
    quick_insights = []
  } = dashboardData || {};

  const criticalAreas = low_engagement.filter(area => area.engagement_status === 'CRITICAL');
  const warningAreas = low_engagement.filter(area => area.engagement_status === 'WARNING');

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Icon name="arrow-left" size={24} color="#2E7D32" />
         </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Advanced Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Real-time insights and analytics</Text>
        </View>
        <TouchableOpacity 
          onPress={fetchDashboardData} 
          style={styles.refreshButton}
          activeOpacity={0.7}
        >
          <View style={styles.refreshButtonInner}>
            <Icon name="refresh" size={22} color="#2E7D32" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.statCardElevated]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
            <Icon name="trending-up" size={28} color="#2E7D32" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Overall Participation</Text>
            <Text style={styles.statValue}>
              {metrics.find(m => m.metric === 'Campus Participation Rate')?.value || '0%'}
            </Text>
          </View>
        </View>

        <View style={[styles.statCard, styles.statCardElevated]}>
          <View style={[styles.statIcon, { backgroundColor: 'rgba(211, 47, 47, 0.1)' }]}>
            <Icon name="alert" size={28} color="#D32F2F" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Critical Areas</Text>
            <Text style={[styles.statValue, { color: '#D32F2F' }]}>{criticalAreas.length}</Text>
          </View>
        </View>
      </View>

      {/* Critical Areas */}
      {criticalAreas.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#D32F2F' }]}>
              <Icon name="alert" size={20} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Critical Areas</Text>
          </View>
          {criticalAreas.slice(0, 3).map((area, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.criticalArea, styles.cardShadow]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Engagement')}
            >
              <View style={styles.areaHeader}>
                <View style={styles.areaTitleContainer}>
                  <Icon name="school" size={18} color="#D32F2F" style={styles.facultyIcon} />
                  <Text style={styles.areaTitle}>{area.faculty}</Text>
                </View>
                <View style={styles.criticalBadge}>
                  <Icon name="alert-circle" size={12} color="#fff" style={styles.badgeIcon} />
                  <Text style={styles.criticalBadgeText}>CRITICAL</Text>
                </View>
              </View>
              <Text style={styles.areaMetric}>
                Participation: {formatPercentage(area.participation_rate)}
              </Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${Math.min(area.participation_rate, 100)}%` }
                    ]} 
                  />
                </View>
              </View>
              <Text style={styles.areaDescription}>{area.status_description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Insights */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#FF9800' }]}>
            <Icon name="lightbulb-on" size={20} color="#fff" />
          </View>
          <Text style={styles.sectionTitle}>Quick Insights</Text>
        </View>
        <View style={styles.insightsContainer}>
          {quick_insights.slice(0, 4).map((insight, index) => (
            <View key={index} style={[styles.insightCard, styles.cardShadow]}>
              <View style={styles.insightHeader}>
                <Icon name="star" size={16} color="#FF9800" />
                <Text style={styles.insightTitle}>{insight.insight}</Text>
              </View>
              <Text style={styles.insightValue}>{insight.value}</Text>
              <Text style={styles.insightRecommendation}>{insight.recommendation}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: '#2E7D32' }]}>
            <Icon name="rocket-launch" size={20} color="#fff" />
          </View>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.cardShadow]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PredictTrends')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(46, 125, 50, 0.1)' }]}>
              <Icon name="chart-line" size={28} color="#2E7D32" />
            </View>
            <Text style={styles.actionTitle}>Predict Trends</Text>
            <Text style={styles.actionDescription}>Analyze recycling patterns</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.cardShadow]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EngagementAnalysis')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(211, 47, 47, 0.1)' }]}>
              <Icon name="account-group" size={28} color="#D32F2F" />
            </View>
            <Text style={styles.actionTitle}>Engagement Analysis</Text>
            <Text style={styles.actionDescription}>Detect low engagement areas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.cardShadow]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('SustainabilityInsights')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
              <Icon name="lightbulb-on" size={28} color="#FF9800" />
            </View>
            <Text style={styles.actionTitle}>Generate Insights</Text>
            <Text style={styles.actionDescription}>Get recommendations</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Performing Faculties */}
      {engagement.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#4CAF50' }]}>
              <Icon name="trophy" size={20} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Top Performing Faculties</Text>
          </View>
          <View style={[styles.facultiesContainer, styles.cardShadow]}>
            {engagement
              .sort((a, b) => b.participation_rate_percent - a.participation_rate_percent)
              .slice(0, 5)
              .map((item, index) => (
                <View key={index} style={styles.facultyItem}>
                  <View style={styles.facultyLeft}>
                    <View style={[
                      styles.rankBadge,
                      { 
                        backgroundColor: index === 0 ? '#FFD700' : 
                                       index === 1 ? '#C0C0C0' : 
                                       index === 2 ? '#CD7F32' : '#f0f0f0' 
                      }
                    ]}>
                      <Text style={[
                        styles.rankText,
                        { color: index < 3 ? '#fff' : '#666' }
                      ]}>
                        #{index + 1}
                      </Text>
                    </View>
                    <View style={styles.facultyInfo}>
                      <View style={styles.facultyNameContainer}>
                        <Icon name="school-outline" size={16} color="#666" style={styles.facultyIcon} />
                        <Text style={styles.facultyName}>{item.faculty}</Text>
                      </View>
                      <Text style={styles.facultyStats}>
                        {formatNumber(item.active_recyclers)}/{formatNumber(item.total_students)} students
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.facultyRate, 
                    { 
                      color: item.participation_rate_percent >= 70 ? '#4CAF50' : 
                             item.participation_rate_percent >= 40 ? '#FF9800' : '#D32F2F',
                      fontWeight: '700'
                    }
                  ]}>
                    {formatPercentage(item.participation_rate_percent)}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2E7D32',
    letterSpacing: -0.5,
  },
  backButton: {
    paddingRight: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginHorizontal: 8,
    borderRadius: 16,
    minWidth: 160,
  },
  statCardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  criticalArea: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.1)',
  },
  areaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  facultyIcon: {
    marginRight: 8,
  },
  areaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#D32F2F',
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },
  badgeIcon: {
    marginRight: 4,
  },
  criticalBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  areaMetric: {
    fontSize: 15,
    color: '#666',
    marginBottom: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D32F2F',
    borderRadius: 3,
  },
  areaDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  insightsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  insightCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.1)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FF9800',
    marginBottom: 6,
  },
  insightRecommendation: {
    fontSize: 11,
    color: '#888',
    lineHeight: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '31%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  actionDescription: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },
  facultiesContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  facultyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  facultyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
  },
  facultyInfo: {
    flex: 1,
  },
  facultyNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  facultyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  facultyStats: {
    fontSize: 13,
    color: '#888',
  },
  facultyRate: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default ModuleDashboard;