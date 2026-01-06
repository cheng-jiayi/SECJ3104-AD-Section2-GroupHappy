import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { engagementAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ChartComponent from '../components/ChartComponent';
import { formatNumber, formatPercentage } from '../utils/helpers';

const EngagementAnalysis = ({ navigation }) => {
  const [engagementData, setEngagementData] = useState([]);
  const [lowEngagement, setLowEngagement] = useState([]);
  const [campusZones, setCampusZones] = useState([]);
  const [loading, setLoading] = useState({
    overview: true,
    lowEngagement: false,
    zones: false,
  });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState('overview');

  const fetchAllData = async () => {
    try {
      setLoading({ 
        overview: true, 
        lowEngagement: true, 
        zones: true 
      });
      setError(null);
      
      const [overviewRes, lowEngagementRes, zonesRes] = await Promise.all([
        engagementAPI.getEngagementOverview(),
        engagementAPI.detectLowEngagement(),
        engagementAPI.getCampusZoneEngagement()
      ]);

      if (overviewRes.data.success) setEngagementData(overviewRes.data.data);
      if (lowEngagementRes.data.success) setLowEngagement(lowEngagementRes.data.data);
      if (zonesRes.data.success) setCampusZones(zonesRes.data.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading({ 
        overview: false, 
        lowEngagement: false, 
        zones: false 
      });
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const getEngagementStatus = (rate) => {
    if (rate >= 70) return { label: 'Excellent', color: '#4CAF50' };
    if (rate >= 50) return { label: 'Good', color: '#FF9800' };
    if (rate >= 30) return { label: 'Fair', color: '#FF5722' };
    return { label: 'Poor', color: '#D32F2F' };
  };

  const prepareOverviewChartData = () => {
    const labels = engagementData.map(item => item.faculty);
    const values = engagementData.map(item => item.participation_rate_percent);
    
    return {
      labels: labels.slice(0, 8),
      values: values.slice(0, 8),
    };
  };

  const prepareZoneChartData = () => {
    const labels = campusZones.map(zone => zone.campus_zone);
    const values = campusZones.map(zone => zone.zone_participation_rate);
    
    return {
      labels,
      values,
    };
  };

  const classifyFacultyPerformance = (faculty) => {
    const rate = faculty.participation_rate_percent;

    if (rate >= 80) return 'EXCELLENT';
    if (rate >= 65) return 'GOOD';
    if (rate >= 45) return 'WARNING';
    return 'CRITICAL';
  };


  const getCriticalAreas = () => {
    return lowEngagement.filter(area => area.engagement_status === 'CRITICAL');
  };

  const getWarningAreas = () => {
    return lowEngagement.filter(area => area.engagement_status === 'WARNING');
  };

  const getTopPerformingFaculties = () => {
    return engagementData
      .filter(e => e.participation_rate_percent >= 70)
      .slice(0, 3);
  };

  const getAverageParticipation = () => {
    if (engagementData.length === 0) return 0;
    const total = engagementData.reduce((sum, item) => sum + item.participation_rate_percent, 0);
    return total / engagementData.length;
  };

  const getPerformanceBasedRecommendations = () => {
    const recommendations = [];

    const criticalFaculties = engagementData.filter(
      f => classifyFacultyPerformance(f) === 'CRITICAL'
    );

    const warningFaculties = engagementData.filter(
      f => classifyFacultyPerformance(f) === 'WARNING'
    );

    const excellentFaculties = engagementData.filter(
      f => classifyFacultyPerformance(f) === 'EXCELLENT'
    );

    /* ===============================
      1️⃣ Targeted Interventions
      =============================== */
    if (criticalFaculties.length > 0) {
      recommendations.push({
        title: 'Targeted Interventions',
        description: `Deploy intensive interventions for ${criticalFaculties.length} underperforming faculties`,
        icon: 'target',
        color: '#D32F2F',
        details: criticalFaculties.map(f => `• ${f.faculty}: ${formatPercentage(f.participation_rate_percent)}`)
      });
    } else if (warningFaculties.length > 0) {
      recommendations.push({
        title: 'Preventive Interventions',
        description: `Early corrective actions for ${warningFaculties.length} faculties at risk`,
        icon: 'shield-alert',
        color: '#FF9800',
        details: warningFaculties.map(f => `• ${f.faculty}`)
      });
    }

    /* ===============================
      2️⃣ Continuous Monitoring
      =============================== */
    if (criticalFaculties.length >= 3) {
      recommendations.push({
        title: 'Daily Monitoring Required',
        description: 'High-risk engagement levels detected campus-wide',
        icon: 'chart-line',
        color: '#D32F2F',
      });
    } else if (warningFaculties.length > 0) {
      recommendations.push({
        title: 'Weekly Monitoring',
        description: 'Track engagement trends and flag early declines',
        icon: 'chart-bar',
        color: '#FF9800',
      });
    } else {
      recommendations.push({
        title: 'Monthly Monitoring',
        description: 'Stable engagement allows standard review cycles',
        icon: 'calendar-check',
        color: '#4CAF50',
      });
    }

    /* ===============================
      3️⃣ Stakeholder Engagement
      =============================== */
    if (criticalFaculties.length > 0) {
      recommendations.push({
        title: 'Stakeholder Escalation',
        description: 'Immediate meetings with Deans & Student Affairs required',
        icon: 'account-group',
        color: '#D32F2F',
      });
    } else if (warningFaculties.length > 0) {
      recommendations.push({
        title: 'Faculty-level Engagement',
        description: 'Engage faculty coordinators and sustainability reps',
        icon: 'account-supervisor',
        color: '#FF9800',
      });
    } else {
      recommendations.push({
        title: 'Strategic Alignment',
        description: 'Quarterly reviews with sustainability leadership',
        icon: 'handshake',
        color: '#4CAF50',
      });
    }

    /* ===============================
      4️⃣ Performance Incentives
      =============================== */
    if (excellentFaculties.length > 0) {
      recommendations.push({
        title: 'Performance Incentives',
        description: `Reward ${excellentFaculties.length} high-performing faculties`,
        icon: 'trophy',
        color: '#4CAF50',
        details: excellentFaculties.map(f => `• ${f.faculty}`)
      });
    } else {
      recommendations.push({
        title: 'Motivation Campaign',
        description: 'Introduce campus-wide challenges and reward schemes',
        icon: 'gift',
        color: '#9C27B0',
      });
    }

    return recommendations;
  };


  const getCriticalAreasSuggestions = (area) => {
    const suggestions = [];

    const rate = area.participation_rate;
    const gap = rate - area.campus_avg_participation;

    /* 1️⃣ 极低参与率 */
    if (rate < 20) {
      suggestions.push('Immediate task force deployment');
      suggestions.push('Mandatory recycling awareness sessions');
      suggestions.push('Temporary incentive boost for participation');
    }

    /* 2️⃣ 明显低于校园平均 */
    if (gap < -25) {
      suggestions.push('Emergency meeting with faculty dean');
      suggestions.push('Install additional recycling stations');
    } else if (gap < -15) {
      suggestions.push('Targeted student ambassador program');
      suggestions.push('Faculty-specific recycling targets');
    }

    /* 3️⃣ 学生规模影响 */
    if (area.total_students > 3000) {
      suggestions.push('Decentralize recycling leadership by departments');
      suggestions.push('Segment campaigns by year of study');
    }

    /* 4️⃣ 行为改善型建议（长期） */
    suggestions.push('Monthly performance feedback reports');
    suggestions.push('Benchmark against top-performing faculties');

    return suggestions;
  };


  if (loading.overview && !refreshing) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAllData} />;

  const recommendations = getPerformanceBasedRecommendations();

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
           <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Engagement Analysis</Text>
          <View style={styles.headerRight} />
      </View>

      {/* View Selector */}
      <View style={styles.viewSelectorContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.viewSelector}
        >
          <TouchableOpacity 
            style={[styles.viewButton, selectedView === 'overview' && styles.viewButtonActive]}
            onPress={() => setSelectedView('overview')}
            activeOpacity={0.7}
          >
            <View style={[styles.viewIcon, selectedView === 'overview' && styles.viewIconActive]}>
              <Icon name="view-dashboard" size={20} color={selectedView === 'overview' ? '#fff' : '#666'} />
            </View>
            <Text style={[styles.viewButtonText, selectedView === 'overview' && styles.viewButtonTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.viewButton, selectedView === 'critical' && styles.viewButtonActive]}
            onPress={() => setSelectedView('critical')}
            activeOpacity={0.7}
          >
            <View style={[styles.viewIcon, selectedView === 'critical' && styles.viewIconActive]}>
              <Icon name="alert" size={20} color={selectedView === 'critical' ? '#fff' : '#666'} />
            </View>
            <Text style={[styles.viewButtonText, selectedView === 'critical' && styles.viewButtonTextActive]}>
              Critical Areas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.viewButton, selectedView === 'zones' && styles.viewButtonActive]}
            onPress={() => setSelectedView('zones')}
            activeOpacity={0.7}
          >
            <View style={[styles.viewIcon, selectedView === 'zones' && styles.viewIconActive]}>
              <Icon name="map-marker-radius" size={20} color={selectedView === 'zones' ? '#fff' : '#666'} />
            </View>
            <Text style={[styles.viewButtonText, selectedView === 'zones' && styles.viewButtonTextActive]}>
              Campus Zones
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <>
          {/* Summary Cards */}
          <View style={styles.summaryCards}>
            <View style={[styles.summaryCard, styles.summaryCardCritical]}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleContainer}>
                  <Icon name="alert" size={20} color="#D32F2F" style={styles.summaryIcon} />
                  <Text style={styles.summaryTitle}>Critical Areas</Text>
                </View>
                <View style={styles.criticalCount}>
                  <Text style={styles.countText}>{getCriticalAreas().length}</Text>
                </View>
              </View>
              <Text style={styles.summarySubtitle}>Need immediate intervention</Text>
              {getCriticalAreas().slice(0, 3).map((area, index) => (
                <View key={index} style={styles.facultyItem}>
                  <View style={styles.facultyInfo}>
                    <Icon name="school" size={16} color="#D32F2F" style={styles.facultyIcon} />
                    <Text style={styles.facultyName}>{area.faculty}</Text>
                  </View>
                  <Text style={[styles.facultyRate, { color: '#D32F2F' }]}>
                    {formatPercentage(area.participation_rate)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.summaryCard, styles.summaryCardExcellent]}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryTitleContainer}>
                  <Icon name="trophy" size={19} color="#4CAF50" style={styles.summaryIcon} />
                  <Text style={styles.summaryTitle}>Top{'\n'}Performers</Text>
                </View>
                <View style={styles.excellentCount}>
                  <Text style={styles.countText}>
                    {engagementData.filter(e => e.participation_rate_percent >= 70).length}
                  </Text>
                </View>
              </View>
              <Text style={styles.summarySubtitle}>Excellent participation</Text>
              {engagementData
                .filter(e => e.participation_rate_percent >= 70)
                .slice(0, 3)
                .map((area, index) => (
                  <View key={index} style={styles.facultyItem}>
                    <View style={styles.facultyInfo}>
                      <Icon name="school" size={16} color="#4CAF50" style={styles.facultyIcon} />
                      <Text style={styles.facultyName}>{area.faculty}</Text>
                    </View>
                    <Text style={[styles.facultyRate, { color: '#4CAF50' }]}>
                      {formatPercentage(area.participation_rate_percent)}
                    </Text>
                  </View>
                ))}
            </View>
          </View>

          {/* Engagement Chart */}
          <View style={[styles.chartContainer, styles.cardElevated]}>
            <View style={styles.chartHeader}>
              <Icon name="chart-bar" size={24} color="#2E7D32" />
              <Text style={styles.chartTitle}>Faculty Engagement Overview</Text>
            </View>
            {loading.overview ? (
              <View style={styles.chartLoading}>
                <LoadingSpinner size="small" />
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.chartScrollContent}
              >
                <ChartComponent 
                  type="bar" 
                  data={prepareOverviewChartData()}
                  height={300}
                  width={Math.max(prepareOverviewChartData().labels.length * 60, 400)}
                />
              </ScrollView>
            )}
          </View>

          {/* Engagement Table */}
          <View style={[styles.tableContainer, styles.cardElevated]}>
            <View style={styles.tableHeader}>
              <Icon name="table" size={24} color="#333" />
              <Text style={styles.tableTitle}>Detailed Faculty Engagement</Text>
            </View>
            {engagementData.map((item, index) => {
              const status = getEngagementStatus(item.participation_rate_percent);
              return (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.facultyCell}>
                    <Text style={styles.facultyCode}>{item.faculty}</Text>
                    <Text style={styles.facultyStats}>
                      {formatNumber(item.active_recyclers)} active recyclers
                    </Text>
                  </View>
                  <View style={styles.rateCell}>
                    <View style={styles.rateBarContainer}>
                      <View 
                        style={[
                          styles.rateBar, 
                          { 
                            width: `${Math.min(item.participation_rate_percent, 100)}%`,
                            backgroundColor: status.color 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.rateText}>
                      {formatPercentage(item.participation_rate_percent)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                    <Text style={styles.statusText}>{status.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Performance-based Recommendations */}
          <View style={[styles.recommendationsContainer, styles.cardElevated]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: '#FF9800' }]}>
                <Icon name="lightbulb-on" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Smart Recommendations</Text>
                <Text style={styles.sectionSubtitle}>
                  Based on current performance: {formatPercentage(getAverageParticipation())} average
                </Text>
              </View>
            </View>
            
            <View style={styles.recommendationsGrid}>
              {recommendations.map((rec, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.recommendationCard,
                    { borderColor: `${rec.color}20` } // 20 = 12% opacity
                  ]}
                >
                  <View style={[styles.recommendationIcon, { backgroundColor: `${rec.color}10` }]}>
                    <Icon name={rec.icon} size={28} color={rec.color} />
                  </View>
                  <Text style={[styles.recommendationTitle, { color: rec.color }]}>
                    {rec.title}
                  </Text>
                  <Text style={styles.recommendationText}>
                    {rec.description}
                  </Text>
                  <View style={styles.recommendationFooter}>
                    <Icon name="trending-up" size={12} color={rec.color} />
                    <Text style={[styles.recommendationPriority, { color: rec.color }]}>
                      {index === 0 ? 'High Priority' : index === 1 ? 'Medium Priority' : 'Standard'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            
            {/* Summary Stats */}
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Icon name="chart-line" size={16} color="#2E7D32" />
                <Text style={styles.statText}>Average: {formatPercentage(getAverageParticipation())}</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="alert" size={16} color="#D32F2F" />
                <Text style={styles.statText}>Critical: {getCriticalAreas().length}</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="trending-up" size={16} color="#4CAF50" />
                <Text style={styles.statText}>Top: {getTopPerformingFaculties().length}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Critical Areas View */}
      {selectedView === 'critical' && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#D32F2F' }]}>
              <Icon name="alert-circle" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Critical Engagement Areas</Text>
              <Text style={styles.sectionSubtitle}>Areas requiring immediate attention</Text>
            </View>
          </View>
          
          {getCriticalAreas().length === 0 ? (
            <View style={[styles.noCriticalContainer, styles.cardElevated]}>
              <View style={styles.successIcon}>
                <Icon name="check-circle" size={48} color="#4CAF50" />
              </View>
              <Text style={styles.noCriticalTitle}>No Critical Areas Detected</Text>
              <Text style={styles.noCriticalText}>
                All faculties are meeting minimum engagement thresholds.
              </Text>
            </View>
          ) : (
            <>
              {getCriticalAreas().map((area, index) => {
                const suggestions = getCriticalAreasSuggestions(area);
                return (
                  <View key={index} style={[styles.criticalAreaCard, styles.cardElevated]}>
                    <View style={styles.criticalAreaHeader}>
                      <View style={styles.facultyHeader}>
                        <Icon name="school" size={20} color="#D32F2F" style={styles.areaIcon} />
                        <Text style={styles.areaFaculty}>{area.faculty}</Text>
                      </View>
                      <View style={styles.criticalTag}>
                        <Icon name="alert" size={12} color="#fff" style={styles.tagIcon} />
                        <Text style={styles.criticalTagText}>CRITICAL</Text>
                      </View>
                    </View>
                    
                    <View style={styles.areaMetrics}>
                      <View style={styles.areaMetric}>
                        <Text style={styles.metricLabel}>Participation Rate</Text>
                        <Text style={[styles.metricValue, { color: '#D32F2F' }]}>
                          {formatPercentage(area.participation_rate)}
                        </Text>
                      </View>
                      
                      <View style={styles.separator} />
                      
                      <View style={styles.areaMetric}>
                        <Text style={styles.metricLabel}>Campus Average</Text>
                        <Text style={styles.metricValue}>
                          {formatPercentage(area.campus_avg_participation)}
                        </Text>
                      </View>
                      
                      <View style={styles.separator} />
                      
                      <View style={styles.areaMetric}>
                        <Text style={styles.metricLabel}>Gap</Text>
                        <Text style={[styles.metricValue, { color: '#D32F2F' }]}>
                          {formatPercentage(area.participation_rate - area.campus_avg_participation)}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.areaDescription}>{area.status_description}</Text>
                    
                    <View style={styles.actionPlan}>
                      <View style={styles.actionPlanHeader}>
                        <Icon name="rocket-launch" size={18} color="#D32F2F" />
                        <Text style={styles.actionPlanTitle}>Targeted Action Plan</Text>
                      </View>
                      <View style={styles.actionItems}>
                        {suggestions.slice(0, 3).map((suggestion, idx) => (
                          <View key={idx} style={styles.actionItem}>
                            <View style={[styles.actionIcon, { backgroundColor: 'rgba(211, 47, 47, 0.1)' }]}>
                              <Icon name="check-circle" size={18} color="#D32F2F" />
                            </View>
                            <Text style={styles.actionText}>{suggestion}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.additionalInfo}>
                        <Icon name="information" size={14} color="#666" />
                        <Text style={styles.additionalInfoText}>
                          Based on {formatNumber(area.total_students)} students • Gap: {formatPercentage(area.participation_rate - area.campus_avg_participation)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}

      {/* Campus Zones View */}
      {selectedView === 'zones' && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: '#2196F3' }]}>
              <Icon name="map" size={24} color="#fff" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Campus Zone Analysis</Text>
              <Text style={styles.sectionSubtitle}>Participation by campus zones</Text>
            </View>
          </View>
          
          {loading.zones ? (
            <LoadingSpinner size="small" />
          ) : (
            <>
              <View style={styles.zonesGrid}>
                {campusZones.map((zone, index) => {
                  const status = getEngagementStatus(zone.zone_participation_rate);
                  return (
                    <View key={index} style={[styles.zoneCard, styles.cardElevated]}>
                      <View style={styles.zoneHeader}>
                        <View style={styles.zoneInfo}>
                          <Icon name="map-marker" size={18} color="#2196F3" style={styles.zoneIcon} />
                          <Text style={styles.zoneName}>{zone.campus_zone}</Text>
                        </View>
                        <View style={[styles.zoneStatus, { backgroundColor: status.color }]}>
                          <Text style={styles.zoneStatusText}>{status.label}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.zoneMetrics}>
                        <View style={styles.zoneMetric}>
                          <Text style={styles.zoneMetricLabel}>Participation</Text>
                          <Text style={[styles.zoneMetricValue, { color: status.color }]}>
                            {formatPercentage(zone.zone_participation_rate)}
                          </Text>
                        </View>
                        
                        <View style={styles.zoneMetric}>
                          <Text style={styles.zoneMetricLabel}>Active Recyclers</Text>
                          <Text style={styles.zoneMetricValue}>
                            {formatNumber(zone.active_recyclers)}
                          </Text>
                        </View>
                        
                        <View style={styles.zoneMetric}>
                          <Text style={styles.zoneMetricLabel}>Total Points</Text>
                          <Text style={styles.zoneMetricValue}>
                            {formatNumber(zone.total_zone_points)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
              
              <View style={[styles.zoneChartContainer, styles.cardElevated]}>
                <View style={styles.chartHeader}>
                  <Icon name="chart-line" size={24} color="#2196F3" />
                  <Text style={styles.chartTitle}>Zone Comparison</Text>
                </View>
                {loading.zones ? (
                  <View style={styles.chartLoading}>
                    <LoadingSpinner size="small" />
                  </View>
                ) : (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true}
                    contentContainerStyle={styles.chartScrollContent}
                  >
                    <ChartComponent 
                      type="bar" 
                      data={prepareZoneChartData()}
                      height={250}
                      width={Math.max(prepareZoneChartData().labels.length * 70, 400)} // Dynamic width
                    />
                  </ScrollView>
                )}
              </View>
            </>
          )}
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
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  viewSelectorContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  viewSelector: {
    flexDirection: 'row',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    minWidth: 110,
  },
  viewButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  viewIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  viewIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  viewButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 6,
    borderRadius: 18,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryCardCritical: {
    borderTopWidth: 4,
    borderTopColor: '#D32F2F',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.1)',
  },
  summaryCardExcellent: {
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2, // Take available space
  },
  summaryIcon: {
    marginRight: 15,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    flexShrink: 1, 
  },
  criticalCount: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingHorizontal: 10, // Reduced from 12
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
    marginLeft: 8, // Add some margin from title
  },
  excellentCount: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },
  summarySubtitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
  },
  facultyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  facultyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  facultyIcon: {
    marginRight: 8,
  },
  facultyName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  facultyRate: {
    fontSize: 16,
    fontWeight: '800',
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  chartScrollContent: {
    paddingRight: 20, // Add some padding on the right
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  chartLoading: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  facultyCell: {
    flex: 2,
  },
  facultyCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  facultyStats: {
    fontSize: 12,
    color: '#888',
  },
  rateCell: {
    flex: 2,
    alignItems: 'center',
  },
  rateBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  rateBar: {
    height: '100%',
    borderRadius: 4,
  },
  rateText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '800',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  noCriticalContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  successIcon: {
    marginBottom: 16,
  },
  noCriticalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  noCriticalText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  criticalAreaCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.1)',
  },
  criticalAreaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  facultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  areaIcon: {
    marginRight: 10,
  },
  areaFaculty: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D32F2F',
  },
  criticalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 10,
  },
  tagIcon: {
    marginRight: 4,
  },
  criticalTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  areaMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  areaMetric: {
    alignItems: 'center',
    flex: 1,
  },
  separator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(211, 47, 47, 0.2)',
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
  },
  areaDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionPlan: {
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.1)',
  },
  actionPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionPlanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D32F2F',
    marginLeft: 8,
  },
  actionItems: {},
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  zoneCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  zoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  zoneIcon: {
    marginRight: 8,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  zoneStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  zoneStatusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '800',
  },
  zoneMetrics: {
    marginTop: 8,
  },
  zoneMetric: {
    marginBottom: 8,
  },
  zoneMetricLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
    fontWeight: '600',
  },
  zoneMetricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
  },
  zoneChartContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  recommendationsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  recommendationsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recommendationCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  recommendationCard1: {
    borderColor: 'rgba(46, 125, 50, 0.1)',
  },
  recommendationCard2: {
    borderColor: 'rgba(33, 150, 243, 0.1)',
  },
  recommendationCard3: {
    borderColor: 'rgba(255, 152, 0, 0.1)',
  },
  recommendationCard4: {
    borderColor: 'rgba(156, 39, 176, 0.1)',
  },
  recommendationIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  recommendationText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Add these new styles:
  additionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(211, 47, 47, 0.2)',
  },
  additionalInfoText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  recommendationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  recommendationPriority: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default EngagementAnalysis;