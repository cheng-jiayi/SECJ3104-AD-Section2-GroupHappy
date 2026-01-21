import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions, Alert,
  RefreshControl, Modal
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const API_BASE_URL = 'http://10.0.2.2:5000';

export default function CampaignAnalyticsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [itemsToShow, setItemsToShow] = useState(5);
  const [statusFilter, setStatusFilter] = useState('All');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const summaryResponse = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
      const summaryData = await summaryResponse.json();
      
      const campaignsResponse = await fetch(`${API_BASE_URL}/api/campaigns`);
      const campaignsData = await campaignsResponse.json();
      
      if (summaryData.success && campaignsData.success) {
        const safeSummary = {
          totalCampaigns: parseInt(summaryData.summary?.totalCampaigns) || 0,
          totalParticipants: parseInt(summaryData.summary?.totalParticipants) || 0,
          totalPointsCollected: parseInt(summaryData.summary?.totalPointsCollected) || 0,
          avgGoalAchievement: parseFloat(summaryData.summary?.avgGoalAchievement) || 0,
        };
        
        setDashboardData({
          summary: safeSummary,
          statusDistribution: summaryData.statusDistribution || [],
          topCampaigns: summaryData.topCampaigns || []
        });
        
        const allCampaigns = campaignsData.campaigns || [];
        setCampaigns(allCampaigns);
        setFilteredCampaigns(allCampaigns);
      } else {
        throw new Error('Invalid data format from server');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(
        'Error',
        'Failed to load campaign data. Please check your connection and try again.',
        [
          { 
            text: 'Try Again', 
            onPress: () => loadDashboardData() 
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (statusFilter === 'All') {
      setFilteredCampaigns(campaigns);
    } else {
      setFilteredCampaigns(campaigns.filter(c => c.status === statusFilter));
    }
    setItemsToShow(5);
  }, [statusFilter, campaigns]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleCompare = () => {
    if (selectedCampaigns.length < 2) {
      Alert.alert('Select Campaigns', 'Please select at least 2 campaigns to compare');
      return;
    }
    
    // Get unique campaign IDs
    const uniqueIds = [...new Set(selectedCampaigns.map(c => c.eventID))];
    
    if (uniqueIds.length < 2) {
      Alert.alert('Duplicate Campaigns', 'Please select different campaigns to compare');
      return;
    }
    
    setCompareModalVisible(false);
    navigation.navigate('CampaignComparison', { 
      campaignIds: uniqueIds
    });
  };

  const toggleCampaignSelection = (campaign) => {
    const isSelected = selectedCampaigns.find(c => c.eventID === campaign.eventID);
    
    if (isSelected) {
      setSelectedCampaigns(selectedCampaigns.filter(c => c.eventID !== campaign.eventID));
    } else {
      if (selectedCampaigns.length < 4) {
        setSelectedCampaigns([...selectedCampaigns, campaign]);
      } else {
        Alert.alert('Limit Reached', 'You can compare up to 4 campaigns at once.');
      }
    }
  };

  const handleLoadMore = () => {
    setItemsToShow(prev => prev + 5);
  };

  const handleShowLess = () => {
    setItemsToShow(5);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#4CAF50';
      case 'Ongoing': return '#2196F3';
      case 'Upcoming': return '#FF9800';
      default: return '#666';
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading Campaign Analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determine if we should show Top Campaigns
  const showTopCampaigns = statusFilter === 'All' || statusFilter === 'Completed';
  const completedCampaignsCount = campaigns.filter(c => c.status === 'Completed').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards - Same style as Details */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>📊</Text>
                <Text style={styles.statLabel}>Total Campaigns</Text>
              </View>
              <Text style={styles.statValue}>{dashboardData?.summary?.totalCampaigns || 0}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>👥</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
              <Text style={styles.statValue}>{dashboardData?.summary?.totalParticipants || 0}</Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statIcon}>🏆</Text>
                <Text style={styles.statLabel}>Points Collected</Text>
              </View>
              <Text style={styles.statValue}>
                {(dashboardData?.summary?.totalPointsCollected || 0).toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.goalStatIcon}>🎯</Text>
                <Text style={styles.statLabel}>Avg Goal</Text>
              </View>
              <Text style={styles.statValue}>
                {dashboardData?.summary?.avgGoalAchievement ? 
                  parseFloat(dashboardData.summary.avgGoalAchievement).toFixed(1) : '0.0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Filter Card - Status in ONE ROW */}
        <View style={styles.detailsCard}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>Campaign Status</Text>
          </View>
          <Text style={styles.filterHint}>Tap status to filter campaigns</Text>
          
          <View style={styles.statusRow}>
            {/* All Status Option */}
            <TouchableOpacity 
              style={styles.statusChip}
              onPress={() => handleStatusFilter('All')}
              activeOpacity={0.7}
            >
              <View style={[
                styles.statusChipContent,
                statusFilter === 'All' && styles.statusChipActive
              ]}>
                <View style={[styles.statusDot, { backgroundColor: '#9E9E9E' }]} />
                <Text style={[
                  styles.statusChipText,
                  statusFilter === 'All' && styles.statusChipTextActive
                ]}>All</Text>
                <Text style={styles.statusCount}>{campaigns.length}</Text>
              </View>
            </TouchableOpacity>
            
            {/* Status Options in ONE ROW */}
            {dashboardData?.statusDistribution?.map((item, index) => (
              <TouchableOpacity 
                key={`status-${item.status}-${index}`}
                style={styles.statusChip}
                onPress={() => handleStatusFilter(item.status)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.statusChipContent,
                  statusFilter === item.status && styles.statusChipActive,
                  { borderColor: getStatusColor(item.status) }
                ]}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(item.status) }
                  ]} />
                  <Text style={[
                    styles.statusChipText,
                    statusFilter === item.status && styles.statusChipTextActive
                  ]}>{item.status}</Text>
                  <Text style={styles.statusCount}>{item.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Top Campaigns Card - Only show for All or Completed */}
        {showTopCampaigns && dashboardData?.topCampaigns?.length > 0 && (
          <View style={styles.detailsCard}>
            <View style={styles.cardTitle2Container}>
              <Text style={styles.cardTitle}>Top Performing Campaigns</Text>
            </View>
            
            {dashboardData?.topCampaigns?.map((campaign, index) => (
              <TouchableOpacity 
                key={`top-${campaign.eventID || index}`}
                style={styles.campaignCard}
                onPress={() => navigation.navigate('CampaignDetail', { campaignId: campaign.eventID })}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                
                <View style={styles.campaignInfo}>
                  <Text style={styles.campaignTitle} numberOfLines={2}>
                    {campaign.eventTitle}
                  </Text>
                  
                  <View style={styles.campaignStats}>
                    <View style={styles.campaignStatItem}>
                      <Text style={styles.campaignStatIcon}>👥</Text>
                      <Text style={styles.campaignStatValue}>{campaign.participants}</Text>
                      <Text style={styles.campaignStatLabel}>Participants</Text>
                    </View>
                    
                    <View style={styles.campaignStatItem}>
                      <Text style={styles.campaignStatIcon}>🏆</Text>
                      <Text style={styles.campaignStatValue}>
                        {campaign.pointsCollected?.toLocaleString()}
                      </Text>
                      <Text style={styles.campaignStatLabel}>Points</Text>
                    </View>
                    
                    <View style={styles.campaignStatItem}>
                      <Text style={styles.campaignStatIcon}>🎯</Text>
                      <Text style={[styles.campaignStatValue, styles.highlight]}>
                        {campaign.goalPercent}%
                      </Text>
                      <Text style={styles.campaignStatLabel}>Goal</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Campaign List Card */}
        <View style={styles.detailsCard}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>
              {statusFilter === 'All' ? 'All Campaigns' : `${statusFilter} Campaigns`}
            </Text>
            <Text style={styles.campaignCount}>({filteredCampaigns.length})</Text>
          </View>
          
          {/* Active Filter Display */}
          {statusFilter !== 'All' && (
            <View style={styles.activeFilterContainer}>
              <View style={[styles.activeFilterTag, { backgroundColor: getStatusColor(statusFilter) }]}>
                <Text style={styles.activeFilterTagText}>
                  Showing: {statusFilter} campaigns
                </Text>
                <TouchableOpacity 
                  style={styles.clearFilterButton}
                  onPress={() => handleStatusFilter('All')}
                >
                  <Text style={styles.clearFilterIcon}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {filteredCampaigns.slice(0, itemsToShow).map((campaign, index) => (
            <View key={`campaign-${campaign.eventID}-${index}`} style={styles.campaignItem}>
              <View style={styles.campaignItemInfo}>
                <Text style={styles.campaignItemTitle}>{campaign.eventTitle}</Text>
                
                <View style={styles.campaignItemMeta}>
                  <View style={styles.campaignItemCategory}>
                    <Text style={styles.campaignItemCategoryText}>{campaign.eventCategory}</Text>
                  </View>
                  
                  <View style={[
                    styles.campaignItemStatus,
                    { backgroundColor: getStatusColor(campaign.status) }
                  ]}>
                    <Text style={styles.campaignItemStatusText}>{campaign.status}</Text>
                  </View>
                </View>
                
                <View style={styles.campaignItemStats}>
                  <View style={styles.campaignItemStat}>
                    <Text style={styles.campaignItemStatIcon}>👥</Text>
                    <Text style={styles.campaignItemStatValue}>{campaign.participants}</Text>
                  </View>
                  
                  <View style={styles.campaignItemStat}>
                    <Text style={styles.campaignItemStatIcon}>🎯</Text>
                    <Text style={styles.campaignItemStatValue}>{campaign.goalPercent}%</Text>
                  </View>
                  
                  <View style={styles.campaignItemStat}>
                    <Text style={styles.campaignItemStatIcon}>🗓️</Text>
                    <Text style={styles.campaignItemStatValue}>
                      {formatDate(campaign.eventStartDate)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.viewDetailButton}
                onPress={() => navigation.navigate('CampaignDetail', { campaignId: campaign.eventID })}
              >
                <Text style={styles.viewDetailText}>View</Text>
                <Text style={styles.viewDetailArrow}>›</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {/* Load More / Show Less Buttons */}
          {filteredCampaigns.length > 5 && (
            <View style={styles.loadButtonsContainer}>
              {itemsToShow < filteredCampaigns.length ? (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={handleLoadMore}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreIcon}>↧</Text>
                  <Text style={styles.loadMoreText}>
                    Load More ({filteredCampaigns.length - itemsToShow} remaining)
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.showLessButton}
                  onPress={handleShowLess}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showLessIcon}>↥</Text>
                  <Text style={styles.showLessText}>
                    Show Less (Showing all {filteredCampaigns.length} campaigns)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {filteredCampaigns.length === 0 && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsIcon}>📭</Text>
              <Text style={styles.noResultsTitle}>No campaigns found</Text>
              <Text style={styles.noResultsText}>
                There are no {statusFilter.toLowerCase()} campaigns at the moment.
              </Text>
              <TouchableOpacity 
                style={styles.resetFilterButton}
                onPress={() => handleStatusFilter('All')}
              >
                <Text style={styles.resetFilterText}>View All Campaigns</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons*/}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.reportButton]}
            onPress={() => navigation.navigate('GenerateReport', {
              reportType: 'Semester Summary',
              sourceScreen: 'CampaignAnalytics',
            })}
          >
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionButtonText}>Generate Semester Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.compareActionButton]}
            onPress={() => setCompareModalVisible(true)}
          >
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionButtonText}>Compare Campaigns</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Total Campaigns: {campaigns.length} • Last Updated: {new Date().toLocaleDateString()}
          </Text>
          <Text style={styles.appName}>UTM ReMerit • Analytics Dashboard</Text>
        </View>
      </ScrollView>

      {/* Compare Modal - Only shows completed campaigns */}
      <Modal 
        visible={compareModalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={() => setCompareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle}>Compare Campaigns</Text>
                <Text style={styles.completedCountText}>
                  ({completedCampaignsCount} completed)
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setCompareModalVisible(false)}
              >
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>Select 2-4 COMPLETED campaigns to compare:</Text>
                            
              <ScrollView style={styles.compareList} showsVerticalScrollIndicator={false}>
              {/* Completed campaigns badge */}
              <View style={styles.completedBadge}>
                <View style={[styles.completedDot, { backgroundColor: getStatusColor('Completed') }]} />
                <Text style={styles.completedBadgeText}>Only Completed campaigns are available for comparison</Text>
              </View>
                {/* Filter to show only completed campaigns */}
                {campaigns
                  .filter(campaign => campaign.status === 'Completed')
                  .map((campaign, index) => (
                    <TouchableOpacity
                      key={`compare-item-${campaign.eventID}-${index}`}
                      style={[
                        styles.compareItem,
                        selectedCampaigns.find(c => c.eventID === campaign.eventID) && styles.compareItemSelected
                      ]}
                      onPress={() => toggleCampaignSelection(campaign)}
                    >
                      <View style={styles.compareItemContent}>
                        <Text style={styles.compareItemTitle}>{campaign.eventTitle}</Text>
                        <View style={styles.compareItemDetails}>
                          <View style={styles.compareItemCategory}>
                            <Text style={styles.compareItemCategoryText}>{campaign.eventCategory}</Text>
                          </View>
                          <View style={[
                            styles.compareItemStatus,
                            { backgroundColor: getStatusColor(campaign.status) }
                          ]}>
                            <Text style={styles.compareItemStatusText}>{campaign.status}</Text>
                          </View>
                        </View>
                        <View style={styles.compareItemStats}>
                          <Text style={styles.compareItemStat}>👥 {campaign.participants}</Text>
                          <Text style={styles.compareItemStat}>🎯 {campaign.goalPercent}%</Text>
                          <Text style={styles.compareItemStat}>🏆 {campaign.pointsCollected?.toLocaleString()}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.compareCheckbox}>
                        {selectedCampaigns.find(c => c.eventID === campaign.eventID) ? (
                          <View style={styles.checkboxChecked}>
                            <Text style={styles.checkboxIcon}>✓</Text>
                          </View>
                        ) : (
                          <View style={styles.checkboxUnchecked} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                
                {/* Show message if no completed campaigns */}
                {completedCampaignsCount === 0 && (
                  <View style={styles.noCompletedContainer}>
                    <Text style={styles.noCompletedIcon}>📊</Text>
                    <Text style={styles.noCompletedTitle}>No Completed Campaigns</Text>
                    <Text style={styles.noCompletedText}>
                      There are no completed campaigns available for comparison yet.
                      {"\n"}Campaigns must be completed to enable comparison.
                    </Text>
                  </View>
                )}
              </ScrollView>
              
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedCount}>
                  Selected: {selectedCampaigns.length} campaign{selectedCampaigns.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setSelectedCampaigns([]);
                  setCompareModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.confirmButton,
                  (selectedCampaigns.length < 2 || completedCampaignsCount === 0) && styles.disabledButton
                ]}
                onPress={handleCompare}
                disabled={selectedCampaigns.length < 2 || completedCampaignsCount === 0}
              >
                <Text style={styles.confirmButtonText}>
                  Compare ({selectedCampaigns.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 16,
    fontWeight: '500'
  },

  // Scroll View
  scrollView: { 
    flex: 1,
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
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle2Container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A5F7A',
    lineHeight: 24,
  },
  filterHint: {
    fontSize: 14,
    color: '#78909C',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap',
    marginHorizontal: -8,
  },
  statusChip: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  statusChipContent: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 3,
    paddingTop: 12,
    borderRadius: 12,
    backgroundColor: '#F8FDFF',
    height: 100, 
  },
  statusChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  statusDot: {
    width: 30,
    height: 30,
    borderRadius: 16,
    marginBottom: 6,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5D6D7E',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusChipTextActive: {
    color: '#2E7D32',
  },
  statusCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A5F7A',
    textAlign: 'center',
  },
  
  // Top Campaigns
  campaignCard: {
    flexDirection: 'row',
    alignItems: 'top',
    backgroundColor: '#F9FDFF',
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A5F7A',
    paddingTop: 6,
    marginBottom: 10,
    lineHeight: 20,
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  campaignStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  campaignStatIcon: {
    fontSize: 18,
    marginBottom: 8,
    color: '#5D6D7E',
  },
  campaignStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A5F7A',
    lineHeight: 20,
  },
  highlight: {
    color: '#2E7D32',
  },
  campaignStatLabel: {
    fontSize: 13,
    color: '#5D6D7E',
    marginTop: 2,
  },
  
  // Campaign List
  campaignCount: {
    fontSize: 16,   
    color: '#5D6D7E',   
    fontWeight: '500',   
  },
  activeFilterContainer: {
    marginTop: 6,
    marginBottom: 0,
  },
  activeFilterTag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activeFilterTagText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '500',
    marginRight: 12,
  },
  clearFilterButton: {
    padding: 4,
  },
  clearFilterIcon: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  campaignItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
  },
  campaignItemInfo: {
    flex: 1,
  },
  campaignItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A5F7A',
    marginBottom: 8,
  },
  campaignItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  campaignItemCategory: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  campaignItemCategoryText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  campaignItemStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  campaignItemStatusText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '500',
  },
  campaignItemStats: {
    flexDirection: 'row',
  },
  campaignItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  campaignItemStatIcon: {
    fontSize: 13,
    marginRight: 4,
    color: '#5D6D7E',
  },
  campaignItemStatValue: {
    fontSize: 14,
    marginTop: 1,
    color: '#5D6D7E',
    fontWeight: '500',
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewDetailText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  viewDetailArrow: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Load More / Show Less Buttons
  loadButtonsContainer: {
    marginTop: 16,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FDFF',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0F2F1',
    borderStyle: 'dashed',
  },
  loadMoreIcon: {
    fontSize: 20,
    color: '#2196F3',
    marginRight: 10,
    lineHeight: 20, 
    marginTop: 2,
  },
  loadMoreText: {
    fontSize: 15,
    color: '#2196F3',
    fontWeight: '600',
    lineHeight: 20, 
  },
  showLessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  showLessIcon: {
    fontSize: 20,
    color: '#2E7D32',
    marginRight: 10,
    lineHeight: 20, 
    marginTop: 2,
  },
  showLessText: {
    fontSize: 15,
    color: '#2E7D32',
    fontWeight: '600',
    lineHeight: 20, 
  },
  
  // No Results
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#B0BEC5',
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#78909C',
    textAlign: 'center',
    marginBottom: 20,
  },
  resetFilterButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetFilterText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Action Buttons
  actionsContainer: {
    marginHorizontal: 18,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reportButton: {
    backgroundColor: '#2E7D32',
  },
  compareActionButton: {
    backgroundColor: '#2196F3',
  },
  actionIcon: {
    fontSize: 20,
    color: 'white',
    marginRight: 8,
    lineHeight: 20,
  },
  actionButtonText: {
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
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2F1',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1A5F7A',
  },
  completedCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseIcon: {
    fontSize: 18,
    color: '#5D6D7E',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#1A5F7A',
    marginBottom: 14,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  completedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  completedBadgeText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
    flex: 1,
  },
  compareList: {
    maxHeight: 350,
  },
  compareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#F8FDFF',
    borderWidth: 1,
    borderColor: '#E0F2F1',
  },
  compareItemSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  compareItemContent: {
    flex: 1,
  },
  compareItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A5F7A',
    marginBottom: 6,
  },
  compareItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compareItemCategory: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  compareItemCategoryText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  compareItemStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compareItemStatusText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '500',
  },
  compareItemStats: {
    flexDirection: 'row',
  },
  compareItemStat: {
    fontSize: 13,
    color: '#5D6D7E',
    marginRight: 16,
  },
  compareCheckbox: {
    marginLeft: 12,
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B0BEC5',
  },
  checkboxIcon: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    paddingBottom: 1,
  },
  selectedInfo: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0F2F1',
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A5F7A',
    textAlign: 'center',
    marginBottom: 4,
  },
  selectedHint: {
    fontSize: 13,
    color: '#78909C',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noCompletedContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noCompletedIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: '#B0BEC5',
  },
  noCompletedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 8,
  },
  noCompletedText: {
    fontSize: 14,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0F2F1',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#5D6D7E',
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
  },
  disabledButton: {
    backgroundColor: '#B0BEC5',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
});