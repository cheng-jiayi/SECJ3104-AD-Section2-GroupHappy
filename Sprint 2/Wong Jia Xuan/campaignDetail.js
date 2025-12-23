import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  ActivityIndicator, Dimensions, TouchableOpacity,
  Alert, RefreshControl, Share
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// API Base URL - Configure for your production environment
const API_BASE_URL = 'http://localhost:5000'; // Update this to your production API URL

export default function CampaignDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { campaignId } = route.params || { campaignId: 1 };
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState({
    participants: 0,
    pointsCollected: 0,
    goalPercent: 0,
    averagePoints: 0
  });

  useEffect(() => {
    loadCampaignDetails();
  }, [campaignId]);

  const loadCampaignDetails = async () => {
    try {
      setLoading(true);
      
      console.log('Loading campaign details for ID:', campaignId);
      
      const response = await fetch(`${API_BASE_URL}/api/campaigns/${campaignId}`, {
        timeout: 10000 // 10 second timeout for production
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
        updateStats(data.campaign);
      } else {
        throw new Error('Invalid data format from server');
      }
    } catch (error) {
      console.error('Error loading campaign details:', error.message || error);
      Alert.alert(
        'Error',
        'Failed to load campaign details. Please check your connection and try again.',
        [
          { 
            text: 'Try Again', 
            onPress: () => loadCampaignDetails() 
          },
          { 
            text: 'Go Back', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStats = (campaignData) => {
    setStats({
      participants: parseInt(campaignData.participants) || 0,
      pointsCollected: parseInt(campaignData.pointsCollected) || 0,
      goalPercent: parseFloat(campaignData.goalPercent) || 0,
      averagePoints: parseFloat(campaignData.averagePoints) || 0
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCampaignDetails();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this campaign: ${campaign?.eventTitle}\n\n` +
                 `Participants: ${stats.participants}\n` +
                 `Points Collected: ${stats.pointsCollected.toLocaleString()}\n` +
                 `Goal Achievement: ${stats.goalPercent}%\n\n` +
                 `via UTM ReMerit App`,
        title: campaign?.eventTitle
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleGenerateReport = () => {
    Alert.alert(
      'Generate Report',
      'Generate detailed report for this campaign?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate', 
          onPress: () => navigation.navigate('GenerateReport', {
            reportType: 'Single campaign',
            campaignIds: [campaign.eventID],
            sourceScreen: 'CampaignDetail',
            campaignData: campaign // Pass the full campaign data
          })
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#4CAF50';
      case 'Ongoing': return '#2196F3';
      case 'Upcoming': return '#FF9800';
      default: return '#666';
    }
  };

  if (loading && !campaign) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Campaign Details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header with Campaign Name Only */}
      <View style={styles.fixedHeader}>
        <Text style={styles.campaignName} numberOfLines={2}>
          {campaign?.eventTitle || 'Campaign Details'}
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Campaign Banner with Category/Status */}
        <View style={styles.banner}>
          <View style={styles.categoryStatusRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{campaign?.eventCategory || 'General'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign?.status) }]}>
              <Text style={styles.statusText}>{campaign?.status || 'Unknown'}</Text>
            </View>
          </View>
          
          <Text style={styles.campaignDate}>
            {formatDate(campaign?.eventStartDate)} - {formatDate(campaign?.eventEndDate)}
          </Text>
        </View>

        {/* Quick Stats - Modern Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
              <Text style={styles.statValue}>{stats.participants.toLocaleString()}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>🏆</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>
              <Text style={styles.statValue}>{stats.pointsCollected.toLocaleString()}</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.goalStatIcon}>🎯</Text>
                <Text style={styles.statLabel}>Goal</Text>
              </View>
              <Text style={styles.statValue}>{stats.goalPercent}%</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>📊</Text>
                <Text style={styles.statLabel}>AvgPoints/Person</Text>
              </View>
              <Text style={styles.statValue}>{stats.averagePoints}</Text>
            </View>
          </View>
        </View>

        {/* Campaign Details Card - Added more space below title */}
        <View style={styles.detailsCard}>
          <View style={styles.campaignDetailsTitleContainer}>
            <Text style={styles.cardTitle}>Campaign Details</Text>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Text style={styles.detailIcon}>🗓️</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date Range</Text>
              <Text style={styles.detailValue}>
                {formatDate(campaign?.eventStartDate)} - {formatDate(campaign?.eventEndDate)}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Text style={styles.detailIcon}>⭐</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Reward Points</Text>
              <Text style={styles.detailValue}>{campaign?.rewardPoints || 0} points</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Text style={styles.detailIcon}>🎓</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>UTM Merits</Text>
              <Text style={styles.detailValue}>{campaign?.UTMMeritPoints || 0} merits</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Text style={styles.detailIcon}>👨‍💼</Text>
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Created By</Text>
              <Text style={styles.detailValue}>{campaign?.createdByName || 'Administrator'}</Text>
            </View>
          </View>
        </View>

        {/* Description Card */}
        {campaign?.eventDescription && (
          <View style={styles.descriptionCard}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.descriptionIcon}>📝</Text>
              <Text style={styles.cardTitle}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>
              {campaign.eventDescription}
            </Text>
          </View>
        )}

        {/* Performance Analysis Card */}
        <View style={styles.performanceCard}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.performanceIcon}>📈</Text>
            <Text style={styles.cardTitle}>Performance Analysis</Text>
          </View>
          
          {/* Goal Achievement */}
          <View style={styles.performanceItem}>
            <View style={styles.performanceItemHeader}>
              <Text style={styles.performanceTitle}>Goal Achievement</Text>
              <Text style={styles.performancePercent}>{stats.goalPercent}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(stats.goalPercent, 100)}%` }
                ]} 
              />
            </View>
            <Text style={styles.performanceNote}>
              {stats.goalPercent >= 100 ? '🎉 Target exceeded!' : 
               stats.goalPercent >= 90 ? '👍 Excellent performance!' :
               stats.goalPercent >= 75 ? '✅ Good performance' :
               stats.goalPercent >= 50 ? '📈 Moderate performance' :
               '📉 Needs improvement'}
            </Text>
          </View>
          
          {/* Participation */}
          <View style={styles.performanceItem}>
            <View style={styles.performanceItemHeader}>
              <Text style={styles.performanceTitle}>Participation Rate</Text>
              <Text style={styles.performancePercent}>{stats.participants} students</Text>
            </View>
            <Text style={styles.performanceNote}>
              {stats.participants > 200 ? 'Excellent engagement! 👏' : 
               stats.participants > 100 ? 'Good participation level' :
               'Moderate participation'}
            </Text>
          </View>
          
          {/* Efficiency */}
          <View style={styles.performanceItem}>
            <View style={styles.performanceItemHeader}>
              <Text style={styles.performanceTitle}>Points Efficiency</Text>
              <Text style={styles.performancePercent}>{stats.averagePoints} pts/person</Text>
            </View>
            <Text style={styles.performanceNote}>
              {stats.averagePoints > 75 ? 'High efficiency ⚡' : 
               stats.averagePoints > 50 ? 'Good efficiency ✅' :
               'Moderate efficiency'}
            </Text>
          </View>
        </View>

        {/* Insights Card */}
        <View style={styles.insightsCard}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.insightsIcon}>💡</Text>
            <Text style={styles.cardTitle}>Key Insights</Text>
          </View>
          
          <View style={styles.insightItem}>
            <View style={styles.insightIconContainer}>
              <Text style={styles.insightIcon}>🌟</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>
                {stats.goalPercent >= 90 ? 'Outstanding Performance' :
                 stats.goalPercent >= 75 ? 'Strong Performance' :
                 stats.goalPercent >= 50 ? 'Moderate Performance' : 'Needs Improvement'}
              </Text>
              <Text style={styles.insightText}>
                {stats.goalPercent >= 90 ? 
                  'This campaign exceeded expectations with excellent participation and goal achievement.' :
                 stats.goalPercent >= 75 ?
                  'Campaign performed well and met most objectives. Consider expanding scope for next iteration.' :
                 stats.goalPercent >= 50 ?
                  'Moderate success. Review marketing strategy and participation incentives.' :
                  'Below target. Recommended to analyze barriers and improve engagement strategies.'}
              </Text>
            </View>
          </View>
          
          <View style={styles.insightItem}>
            <View style={styles.insightIconContainer}>
              <Text style={styles.insightIcon}>🚀</Text>
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Recommendations</Text>
              <Text style={styles.insightText}>
                • {stats.participants < 100 ? 'Increase promotion through social media' : 'Maintain current promotion channels'}{'\n'}
                • {stats.goalPercent < 80 ? 'Set more realistic targets for next campaign' : 'Challenge with higher targets'}{'\n'}
                • Consider extending duration for better participation{'\n'}
                • Add more reward tiers to encourage engagement
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.reportButton]}
            onPress={handleGenerateReport}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.reportButtonText}>Generate Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.backButton]}
            onPress={() => navigation.navigate('CampaignAnalytics')}
          >
            <Text style={styles.actionIcon}>←</Text>
            <Text style={styles.backButtonText}>All Campaigns</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Campaign ID: {campaignId} • Created: {formatDate(campaign?.createdAt)}
          </Text>
          <Text style={styles.appName}>UTM ReMerit • Sustainability Initiative</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F8FF'
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F0F8FF'
  },
  loadingText: { 
    marginTop: 15, 
    color: '#2E7D32',
    fontSize: 17,
    fontWeight: '500'
  },
  
  // Fixed Header with Campaign Name Only
  fixedHeader: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  campaignName: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1A5F7A',
    textAlign: 'center',
    lineHeight: 30,
  },
  
  // Scroll View
  scrollView: { 
    flex: 1,
  },
  
  // Banner
  banner: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
  },
  categoryStatusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  campaignDate: {
    fontSize: 15,
    color: '#5D6D7E',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Stats Container
  statsContainer: {
    backgroundColor: '#F8FDFF',
    padding: 15,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: 'white',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 19,
    marginRight: 8,
    lineHeight: 22,
  },
  goalStatIcon: {
    fontSize: 20,
    marginRight: 8,
    lineHeight: 24,
    marginTop: -2,
  },
  statLabel: {
    fontSize: 13,
    color: '#5D6D7E',
    fontWeight: '500',
    lineHeight: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A5F7A',
  },
  
  // Cards
  detailsCard: {
    backgroundColor: 'white',
    margin: 18,
    marginTop: 14,
    padding: 22,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  descriptionCard: {
    backgroundColor: 'white',
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 22,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  performanceCard: {
    backgroundColor: 'white',
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 22,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  insightsCard: {
    backgroundColor: 'white',
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 22,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  
  // Card Title with Icon Row
  campaignDetailsTitleContainer: {
    marginBottom: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A5F7A',
    flex: 1,
    lineHeight: 24,
  },
  
  // Icons for card headers
  descriptionIcon: {
    fontSize: 20,
    color: '#2E7D32',
    marginRight: 12,
    marginTop: 1,
    lineHeight: 24,
  },
  performanceIcon: {
    fontSize: 20,
    color: '#2E7D32',
    marginRight: 12,
    marginTop: 1,
    lineHeight: 24,
  },
  insightsIcon: {
    fontSize: 20,
    color: '#2E7D32',
    marginRight: 12,
    marginTop: 1,
    lineHeight: 24,
  },
  
  // Detail Row
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailIcon: {
    fontSize: 20,
    color: '#2E7D32',
    lineHeight: 22,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#5D6D7E',
    marginBottom: 2,
    fontWeight: '500',
    lineHeight: 15,
  },
  detailValue: {
    fontSize: 16,
    color: '#1A5F7A',
    fontWeight: '600',
    lineHeight: 20,
  },
  
  // Description Text
  descriptionText: {
    fontSize: 15,
    color: '#5D6D7E',
    lineHeight: 20,
    textAlign: 'justify',
  },
  
  // Performance Items
  performanceItem: {
    marginBottom: 20,
  },
  performanceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A5F7A',
    flex: 1,
    lineHeight: 20,
  },
  performancePercent: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E7D32',
    lineHeight: 22,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  performanceNote: {
    fontSize: 14,
    color: '#5D6D7E',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  
  // Insight Items
  insightItem: {
    flexDirection: 'row',
    backgroundColor: '#F9FDFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    alignItems: 'flex-start',
  },
  insightIconContainer: {
    marginTop: 1,
  },
  insightIcon: {
    fontSize: 22,
    marginRight: 14,
    color: '#FF9800',
    lineHeight: 24,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A5F7A',
    marginBottom: 6,
    lineHeight: 20,
  },
  insightText: {
    fontSize: 15,
    color: '#5D6D7E',
    lineHeight: 20,
  },
  
  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 18,
    marginBottom: 22,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reportButton: {
    backgroundColor: '#2E7D32',
  },
  backButton: {
    backgroundColor: '#1A5F7A',
  },
  actionIcon: {
    fontSize: 20,
    color: 'white',
    marginRight: 8,
    lineHeight: 20,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    lineHeight: 20,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    lineHeight: 20,
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F8FDFF',
    marginTop: 0,
  },
  footerText: {
    fontSize: 13,
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  appName: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
});
