import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { insightsAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ChartComponent from '../components/ChartComponent'; 

const SustainabilityInsights = ({ navigation }) => {
  const [insightsData, setInsightsData] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState([]);
  const [quickInsights, setQuickInsights] = useState([]);
  const [loading, setLoading] = useState({
    insights: false,
    recommendations: false,
    metrics: false,
    quick: false,
  });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // NEW: Separate filters
  const [insightsFilter, setInsightsFilter] = useState('all');
  const [recommendationsFilter, setRecommendationsFilter] = useState('all');

  const [selectedInsight, setSelectedInsight] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading({ insights: true, recommendations: true, metrics: true, quick: true });
      setError(null);

      const [insightsRes, recRes, metricsRes, quickRes] = await Promise.all([
        insightsAPI.generateInsights(),
        insightsAPI.getRecommendations(),
        insightsAPI.getDashboardMetrics(),
        insightsAPI.getQuickInsights()
      ]);

      if (insightsRes.data.success) setInsightsData(insightsRes.data.data);
      if (recRes.data.success) setRecommendations(recRes.data.data);
      if (metricsRes.data.success) setDashboardMetrics(metricsRes.data.data);
      if (quickRes.data.success) setQuickInsights(quickRes.data.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading({ insights: false, recommendations: false, metrics: false, quick: false });
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

  // INSIGHTS
  const filteredInsights = insightsFilter === 'all' 
    ? insightsData 
    : insightsData.filter(insight => insight.priority_level === insightsFilter);

  const priorityCounts = {
    all: insightsData.length,
    high: insightsData.filter(i => i.priority_level === 'High').length,
    medium: insightsData.filter(i => i.priority_level === 'Medium').length,
    low: insightsData.filter(i => i.priority_level === 'Low').length,
  };

  const prepareRecommendationsChartData = () => {
    const priorityGroups = recommendations.reduce((acc, rec) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(priorityGroups).map(([priority, count]) => ({
      name: priority,
      value: count,
    }));
  };

  const handleExportPDF = async () => {
    try {
      const reportData = {
        type: 'insights',
        insightsData: insightsData,
        recommendations: recommendations,
        metrics: {
          totalInsights: insightsData.length,
          highPriority: insightsData.filter(i => i.priority_level === 'High').length,
          recommendations: recommendations.length,
          affectedAreas: new Set(insightsData.map(i => i.affected_area)).size
        },
        highPriorityInsights: insightsData.filter(i => i.priority_level === 'High')
      };
      
      await ReportGenerator.generatePDFReport(reportData, 'insights');
      Alert.alert('Success', 'Insights report generated successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to generate report: ${error.message}`);
    }
  };

  const handleShareInsights = () => {
    Alert.alert('Share Insights', 'Sharing functionality would be implemented here.', [{ text: 'OK' }]);
  };

  const handleInsightPress = (insight) => {
    setSelectedInsight(insight);
    setModalVisible(true);
  };

  if (loading.insights && !refreshing) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAllData} />;

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
           <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
            <Text style={styles.headerTitle}>Engagement Analysis</Text>
            <View style={styles.headerRight} />
      </View>

      {/* Executive Summary */}
      <View style={styles.executiveContainer}>
        <View style={styles.sectionHeader}>
          <Icon name="chart-bar" size={24} color="#2E7D32" />
          <Text style={styles.sectionTitle}>Executive Summary</Text>
        </View>
        
        <View style={styles.metricsGrid}>
          {dashboardMetrics.slice(0, 4).map((metric, index) => (
            <View key={index} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.metric}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={[
                styles.metricStatus,
                metric.status.includes('Attention') && styles.statusAttention,
                metric.status.includes('Improvement') && styles.statusImprovement,
                metric.status.includes('Satisfactory') && styles.statusGood,
              ]}>
                {metric.status}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Insights */}
      <View style={styles.quickInsightsContainer}>
        <View style={styles.sectionHeader}>
          <Icon name="lightning-bolt" size={24} color="#FF9800" />
          <Text style={styles.sectionTitle}>Quick Insights</Text>
        </View>
        
        <View style={styles.quickInsightsGrid}>
          {quickInsights.slice(0, 4).map((insight, index) => (
            <View key={index} style={styles.quickInsightCard}>
              <View style={styles.insightIconContainer}>
                <Icon 
                  name={
                    insight.insight.includes('Top') ? 'trophy' :
                    insight.insight.includes('Most') ? 'chart-bar' :
                    insight.insight.includes('Best') ? 'calendar-star' :
                    'trending-up'
                  } 
                  size={24} 
                  color="#2E7D32" 
                />
              </View>
              <Text style={styles.quickInsightTitle}>{insight.insight}</Text>
              <Text style={styles.quickInsightValue}>{insight.value}</Text>
              <Text style={styles.quickInsightRecommendation}>{insight.recommendation}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* INSIGHTS FILTER */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Priority:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'High', 'Medium', 'Low'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.filterButton,
                insightsFilter === level && styles.filterButtonActive,
                level === 'High' && insightsFilter === 'High' && styles.filterButtonHighActive,
                level === 'Medium' && insightsFilter === 'Medium' && styles.filterButtonMediumActive,
                level === 'Low' && insightsFilter === 'Low' && styles.filterButtonLowActive,
              ]}
              onPress={() => setInsightsFilter(level)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  insightsFilter === level && styles.filterButtonTextActive,
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
                {level !== 'all' && ` (${priorityCounts[level.toLowerCase()]})`}
                {level === 'all' && ` (${insightsData.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* INSIGHTS GRID */}
      <View style={styles.insightsContainer}>
        {filteredInsights.map((insight, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.insightCard,
              insight.priority_level === 'High' && styles.insightCardHigh,
              insight.priority_level === 'Medium' && styles.insightCardMedium,
              insight.priority_level === 'Low' && styles.insightCardLow,
            ]}
            onPress={() => handleInsightPress(insight)}
          >
            <View style={styles.insightHeader}>
              <Text style={styles.insightTitle} numberOfLines={2}>
                {insight.insight_title}
              </Text>
              <View style={[
                styles.priorityTag,
                insight.priority_level === 'High' && styles.priorityTagHigh,
                insight.priority_level === 'Medium' && styles.priorityTagMedium,
                insight.priority_level === 'Low' && styles.priorityTagLow,
              ]}>
                <Text style={styles.priorityTagText}>{insight.priority_level}</Text>
              </View>
            </View>
            <View style={styles.insightMeta}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{insight.insight_category}</Text>
              </View>
              <Text style={styles.affectedArea}>{insight.affected_area}</Text>
            </View>
            <Text style={styles.insightDescription} numberOfLines={3}>{insight.insight_description}</Text>
            <Text style={styles.insightRecommendation} numberOfLines={2}>
              <Text style={styles.recommendationLabel}>Recommendation: </Text>
              {insight.recommendation}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* RECOMMENDATIONS SECTION */}
      <View style={styles.recommendationsMainContainer}>
        <View style={styles.sectionHeader}>
          <Icon name="check-circle" size={24} color="#4CAF50" />
          <Text style={styles.sectionTitle}>Strategic Recommendations</Text>
        </View>

        {/* Recommendations Filter */}
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'High', 'Medium', 'Low'].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.filterButton,
                  recommendationsFilter === level && styles.filterButtonActive,
                  level === 'High' && recommendationsFilter === 'High' && styles.filterButtonHighActive,
                  level === 'Medium' && recommendationsFilter === 'Medium' && styles.filterButtonMediumActive,
                  level === 'Low' && recommendationsFilter === 'Low' && styles.filterButtonLowActive,
                ]}
                onPress={() => setRecommendationsFilter(level)}
              >
                <Text style={[
                  styles.filterButtonText,
                  recommendationsFilter === level && styles.filterButtonTextActive,
                ]}>
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                  {level !== 'all' && ` (${recommendations.filter(r => r.priority === level).length})`}
                  {level === 'all' && ` (${recommendations.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recommendations Chart */}
        <View style={styles.recommendationsChartContainer}>
          {loading.recommendations ? (
            <View style={styles.chartLoading}><LoadingSpinner size="small" /></View>
          ) : (
            <ChartComponent type="pie" data={prepareRecommendationsChartData()} height={250} />
          )}
        </View>

        {/* Recommendations List */}
        <View style={styles.recommendationsList}>
          {recommendations
            .filter(rec => recommendationsFilter === 'all' ? true : rec.priority === recommendationsFilter)
            .map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationHeader}>
                <Text style={styles.recommendationCategory}>{rec.category}</Text>
                <View style={[
                  styles.recommendationPriority,
                  rec.priority === 'High' && styles.recommendationPriorityHigh,
                  rec.priority === 'Medium' && styles.recommendationPriorityMedium,
                  rec.priority === 'Low' && styles.recommendationPriorityLow,
                ]}>
                  <Text style={styles.recommendationPriorityText}>{rec.priority}</Text>
                </View>
              </View>
              <Text style={styles.recommendationText}>{rec.recommendation}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Plan */}
      <View style={styles.actionPlanContainer}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar-check" size={24} color="#2196F3" />
          <Text style={styles.sectionTitle}>30-Day Action Plan</Text>
        </View>
        
        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDateContainer}>
              <Text style={styles.timelineDate}>Week 1</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Immediate Interventions</Text>
              <View style={styles.timelineList}>
                <Text style={styles.timelineListItem}>• Address critical engagement areas</Text>
                <Text style={styles.timelineListItem}>• Deploy additional recycling infrastructure</Text>
                <Text style={styles.timelineListItem}>• Launch targeted awareness campaigns</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineDateContainer}>
              <Text style={styles.timelineDate}>Week 2-3</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Implementation Phase</Text>
              <View style={styles.timelineList}>
                <Text style={styles.timelineListItem}>• Roll out faculty-specific strategies</Text>
                <Text style={styles.timelineListItem}>• Monitor initial impact</Text>
                <Text style={styles.timelineListItem}>• Adjust tactics based on early results</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.timelineItem}>
            <View style={styles.timelineDateContainer}>
              <Text style={styles.timelineDate}>Week 4</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Evaluation & Planning</Text>
              <View style={styles.timelineList}>
                <Text style={styles.timelineListItem}>• Assess month-long performance</Text>
                <Text style={styles.timelineListItem}>• Generate detailed impact report</Text>
                <Text style={styles.timelineListItem}>• Plan for next quarter initiatives</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Export Options
      <View style={styles.exportContainer}>
        <View style={styles.sectionHeader}>
          <Icon name="download" size={24} color="#9C27B0" />
          <Text style={styles.sectionTitle}>Generate Reports</Text>
        </View>
        
        <View style={styles.exportGrid}>
          <TouchableOpacity style={styles.exportOption}>
            <View style={styles.exportIcon}>
              <Icon name="file-chart" size={32} color="#2E7D32" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Executive Summary</Text>
              <Text style={styles.exportDescription}>High-level overview for senior management</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportOption}>
            <View style={styles.exportIcon}>
              <Icon name="file-document" size={32} color="#2196F3" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Detailed Analysis</Text>
              <Text style={styles.exportDescription}>Comprehensive report with all insights</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportOption}>
            <View style={styles.exportIcon}>
              <Icon name="clipboard-list" size={32} color="#FF9800" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Action Plan</Text>
              <Text style={styles.exportDescription}>Step-by-step implementation guide</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportOption}>
            <View style={styles.exportIcon}>
              <Icon name="chart-box" size={32} color="#9C27B0" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Performance Dashboard</Text>
              <Text style={styles.exportDescription}>Interactive dashboard for monitoring</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View> */}

      {/* Insight Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedInsight && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedInsight.insight_title}
                  </Text>
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalMeta}>
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalMetaLabel}>Category:</Text>
                      <Text style={styles.modalMetaValue}>{selectedInsight.insight_category}</Text>
                    </View>
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalMetaLabel}>Priority:</Text>
                      <View style={[
                        styles.modalPriorityBadge,
                        selectedInsight.priority_level === 'High' && styles.modalPriorityBadgeHigh,
                        selectedInsight.priority_level === 'Medium' && styles.modalPriorityBadgeMedium,
                        selectedInsight.priority_level === 'Low' && styles.modalPriorityBadgeLow,
                      ]}>
                        <Text style={styles.modalPriorityText}>{selectedInsight.priority_level}</Text>
                      </View>
                    </View>
                    <View style={styles.modalMetaItem}>
                      <Text style={styles.modalMetaLabel}>Affected Area:</Text>
                      <Text style={styles.modalMetaValue}>{selectedInsight.affected_area}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.modalSectionTitle}>Detailed Analysis</Text>
                  <Text style={styles.modalDescription}>
                    {selectedInsight.insight_description}
                  </Text>
                  
                  <Text style={styles.modalSectionTitle}>Action Plan</Text>
                  <View style={styles.modalActionList}>
                    {selectedInsight.recommendation.split('\n').map((item, idx) => (
                      <Text key={idx} style={styles.modalActionItem}>
                        • {item.trim()}
                      </Text>
                    ))}
                  </View>
                  
                  <Text style={styles.modalSectionTitle}>Expected Impact</Text>
                  <View style={styles.modalImpactGrid}>
                    <View style={styles.modalImpactItem}>
                      <Text style={styles.modalImpactLabel}>Timeframe</Text>
                      <Text style={styles.modalImpactValue}>2-4 weeks</Text>
                    </View>
                    <View style={styles.modalImpactItem}>
                      <Text style={styles.modalImpactLabel}>Resource Required</Text>
                      <Text style={styles.modalImpactValue}>Medium</Text>
                    </View>
                    <View style={styles.modalImpactItem}>
                      <Text style={styles.modalImpactLabel}>Success Probability</Text>
                      <Text style={styles.modalImpactValue}>85%</Text>
                    </View>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2E7D32',
    padding: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    padding: 4,
    marginLeft: 12,
  },
  executiveContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricStatus: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusAttention: {
    backgroundColor: '#FFEBEE',
    color: '#D32F2F',
  },
  statusImprovement: {
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
  },
  statusGood: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  chartContainer: {
    marginTop: 8,
  },
  chartLoading: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickInsightsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  quickInsightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickInsightCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickInsightTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickInsightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickInsightRecommendation: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  filterButtonHigh: {
    borderColor: '#D32F2F',
  },
  filterButtonHighActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  filterButtonMedium: {
    borderColor: '#FF9800',
  },
  filterButtonMediumActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  filterButtonLow: {
    borderColor: '#4CAF50',
  },
  filterButtonLowActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  insightsContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  insightCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightCardHigh: {
    borderLeftColor: '#D32F2F',
  },
  insightCardMedium: {
    borderLeftColor: '#FF9800',
  },
  insightCardLow: {
    borderLeftColor: '#4CAF50',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityTagHigh: {
    backgroundColor: '#FFEBEE',
  },
  priorityTagMedium: {
    backgroundColor: '#FFF3E0',
  },
  priorityTagLow: {
    backgroundColor: '#E8F5E9',
  },
  priorityTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  insightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  affectedArea: {
    fontSize: 12,
    color: '#666',
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  insightRecommendation: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  recommendationLabel: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  recommendationsMainContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  recommendationsChartContainer: {
    marginBottom: 16,
  },
  recommendationsList: {},
  recommendationItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationCategory: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationPriority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendationPriorityHigh: {
    backgroundColor: '#FFEBEE',
  },
  recommendationPriorityMedium: {
    backgroundColor: '#FFF3E0',
  },
  recommendationPriorityLow: {
    backgroundColor: '#E8F5E9',
  },
  recommendationPriorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  recommendationActions: {
    flexDirection: 'row',
  },
  actionButtonSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2E7D32',
    borderRadius: 4,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  actionButtonOutlineText: {
    color: '#2E7D32',
  },
  actionPlanContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  timeline: {
    position: 'relative',
    paddingLeft: 20,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 24,
    flexDirection: 'row',
  },
  timelineDateContainer: {
    width: 70,
  },
  timelineDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  timelineList: {},
  timelineListItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  exportContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  exportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  exportOption: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exportIcon: {
    marginBottom: 8,
  },
  exportContent: {
    alignItems: 'center',
  },
  exportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  exportDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalBody: {
    padding: 16,
  },
  modalMeta: {
    marginBottom: 16,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalMetaLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 100,
  },
  modalMetaValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  modalPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalPriorityBadgeHigh: {
    backgroundColor: '#FFEBEE',
  },
  modalPriorityBadgeMedium: {
    backgroundColor: '#FFF3E0',
  },
  modalPriorityBadgeLow: {
    backgroundColor: '#E8F5E9',
  },
  modalPriorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalActionList: {
    marginBottom: 8,
  },
  modalActionItem: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 4,
  },
  modalImpactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalImpactItem: {
    width: '30%',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalImpactLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalImpactValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    justifyContent: 'space-between',
  },
  modalActionButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalActionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  modalActionButtonTextSecondary: {
    color: '#2E7D32',
  },
});

export default SustainabilityInsights;