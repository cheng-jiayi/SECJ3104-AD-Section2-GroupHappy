import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Animated,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { useFocusEffect } from '@react-navigation/native';

function ManageConversionsScreen() {
  const { 
    conversionRate, 
    getAllPendingConversions,
    getAllAdminHistory,
    approveConversions, 
    rejectConversions,
    updateConversionRate,
    dataVersion,
    refreshData
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [newConversionRate, setNewConversionRate] = useState(conversionRate.toString());
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingConversions, setPendingConversions] = useState([]);
  const [adminConversionHistory, setAdminConversionHistory] = useState([]);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [showRefreshNotification, setShowRefreshNotification] = useState(false);

  // Function to load all data
  const loadData = useCallback(() => {
    console.log('🔄 Loading admin data...');
    setShowRefreshNotification(true);
    
    try {
      const pending = getAllPendingConversions() || [];
      const history = getAllAdminHistory() || [];
      
      console.log('Pending conversions:', pending.length);
      console.log('Conversion history:', history.length);
      
      setPendingConversions(pending);
      setAdminConversionHistory(history);
    } catch (error) {
      console.error('Error loading admin data:', error);
      // Fallback data
      setPendingConversions([]);
      setAdminConversionHistory([]);
    }
    
    // Hide notification after 1 second
    setTimeout(() => setShowRefreshNotification(false), 1000);
  }, [getAllPendingConversions, getAllAdminHistory]);

  // Load data on mount and when dataVersion changes
  useEffect(() => {
    loadData();
  }, [loadData, dataVersion]);

  // Also refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 Admin screen focused, refreshing data...');
      loadData();
      return () => {
        console.log('🎯 Admin screen unfocused');
      };
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  const selectedCount = pendingConversions.filter(c => c.selected).length;
  const totalRewardPoints = pendingConversions
    .filter(c => c.selected)
    .reduce((sum, c) => sum + c.rewardPoints, 0);
  const totalMeritPoints = pendingConversions
    .filter(c => c.selected)
    .reduce((sum, c) => sum + c.meritPoints, 0);

  const toggleSelection = (id) => {
    setPendingConversions(prev => 
      prev.map(conversion => 
        conversion.id === id 
          ? { ...conversion, selected: !conversion.selected }
          : conversion
      )
    );
  };

  const selectAll = () => {
    const allSelected = pendingConversions.every(c => c.selected);
    setPendingConversions(prev => 
      prev.map(conversion => ({ ...conversion, selected: !allSelected }))
    );
  };

  const handleApproveSelected = () => {
    if (selectedCount === 0) {
      Alert.alert('No Selection', 'Please select at least one conversion request.');
      return;
    }

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Alert.alert(
      'Approve Conversions',
      `Approve conversion of ${totalRewardPoints} Reward Points to ${totalMeritPoints.toFixed(1)} UTM Merit Points for ${selectedCount} students?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Approve', 
          onPress: () => processApproval()
        }
      ]
    );
  };

  const processApproval = async () => {
    setIsProcessing(true);
    
    const selectedConversions = pendingConversions.filter(c => c.selected);
    
    try {
      await approveConversions(selectedConversions);
      
      // Immediately refresh data and notify other screens
      setTimeout(() => {
        loadData();
        refreshData(); // Notify other screens
      }, 300);
      
      Alert.alert(
        '✓ Success',
        `Conversions approved for ${selectedCount} students.\n` +
        `• ${totalRewardPoints} Reward Points deducted\n` +
        `• ${totalMeritPoints.toFixed(1)} UTM Merit Points awarded\n` +
        `• Students notified\n\n` +
        `Data has been updated in real-time.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            setActiveTab('history');
          }
        }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to approve conversions: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSelected = () => {
    if (selectedCount === 0) {
      Alert.alert('No Selection', 'Please select at least one conversion request.');
      return;
    }
    setRejectionModalVisible(true);
  };

  const submitRejection = async (reason) => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please select a rejection reason.');
      return;
    }

    const selectedConversions = pendingConversions.filter(c => c.selected);
    const selectedNames = selectedConversions
      .map(c => c.studentName)
      .join(', ');

    Alert.alert(
      'Reject Conversions',
      `Reject conversion requests for ${selectedNames}?\nReason: ${reason}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            setRejectionModalVisible(false);
            
            try {
              await rejectConversions(selectedConversions, reason);
              
              // Immediately refresh data and notify other screens
              setTimeout(() => {
                loadData();
                refreshData(); // Notify other screens
              }, 300);
              
              Alert.alert(
                'Rejected',
                `Conversions rejected. Students notified with reason: ${reason}\n\n` +
                `Data has been updated in real-time.`,
                [{ 
                  text: 'OK',
                  onPress: () => setActiveTab('history')
                }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to reject conversions: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const handleSaveSettings = () => {
    const rate = parseInt(newConversionRate);
    if (isNaN(rate) || rate < 1) {
      Alert.alert('Invalid Rate', 'Please enter a valid conversion rate (minimum 1).');
      return;
    }

    Alert.alert(
      'Update Conversion Rate',
      `Change conversion rate to ${rate} Reward Points = 1 Merit Point?\n` +
      'Note: This will update the rate across the entire system.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Update', 
          onPress: () => {
            updateConversionRate(rate);
            setSettingsModalVisible(false);
            Alert.alert('✓ Updated', 'Conversion rate updated successfully across all screens.');
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return '#4CAF50';
      case 'Pending': return '#FF9800';
      case 'Rejected': return '#F44336';
      default: return '#666';
    }
  };

  const renderPendingTab = () => (
    <View>
      {/* Refresh Notification */}
      {showRefreshNotification && (
        <View style={styles.refreshNotification}>
          <Text style={styles.refreshNotificationText}>🔄 Updating data...</Text>
        </View>
      )}
      
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={styles.summaryValue}>{pendingConversions.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Selected</Text>
            <Text style={styles.summaryValue}>{selectedCount}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total RP</Text>
            <Text style={styles.summaryValue}>{totalRewardPoints}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total MP</Text>
            <Text style={styles.summaryValue}>{totalMeritPoints.toFixed(1)}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.selectAllButton}
          onPress={selectAll}
        >
          <Text style={styles.selectAllButtonText}>
            {pendingConversions.every(c => c.selected) ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.approveRejectButtons}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleRejectSelected}
              disabled={selectedCount === 0 || isProcessing}
            >
              <Text style={styles.rejectButtonText}>Reject Selected</Text>
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApproveSelected}
              disabled={selectedCount === 0 || isProcessing}
            >
              <Text style={styles.approveButtonText}>
                {isProcessing ? 'Processing...' : 'Approve Selected'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Conversion Requests List */}
      <View style={styles.requestsList}>
        {pendingConversions.length > 0 ? (
          pendingConversions.map(conversion => (
            <TouchableOpacity 
              key={conversion.id}
              style={[
                styles.requestCard,
                conversion.selected && styles.selectedRequestCard
              ]}
              onPress={() => toggleSelection(conversion.id)}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxContainer}>
                <View style={[
                  styles.checkbox,
                  conversion.selected && styles.checkboxSelected
                ]}>
                  {conversion.selected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.requestInfo}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{conversion.studentName}</Text>
                  <Text style={styles.studentId}>{conversion.studentId}</Text>
                </View>
                
                <View style={styles.conversionDetails}>
                  <View style={styles.pointsContainer}>
                    <Text style={styles.rewardPoints}>{conversion.rewardPoints} RP</Text>
                    <Text style={styles.arrow}>→</Text>
                    <Text style={styles.meritPoints}>{conversion.meritPoints.toFixed(1)} MP</Text>
                  </View>
                  
                  <View style={styles.requestMeta}>
                    <Text style={styles.requestDate}>
                      Requested: {conversion.requestDate}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(conversion.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(conversion.status) }]}>
                        {conversion.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>✅</Text>
            <Text style={styles.emptyStateTitle}>No Pending Conversions</Text>
            <Text style={styles.emptyStateText}>
              All conversion requests have been processed.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderHistoryTab = () => (
    <View>
      <Text style={styles.sectionTitle}>Conversion History</Text>
      
      {adminConversionHistory.length > 0 ? (
        adminConversionHistory.map(item => (
          <View key={item.id} style={[
            styles.historyCard,
            { borderLeftColor: getStatusColor(item.status) }
          ]}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyStudentName}>{item.studentName}</Text>
                <Text style={styles.historyStudentId}>{item.studentId || 'N/A'}</Text>
              </View>
              <View style={[
                styles.historyStatusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' }
              ]}>
                <Text style={[styles.historyStatusText, { color: getStatusColor(item.status) }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            
            <View style={styles.historyDetails}>
              <Text style={styles.historyPoints}>
                {item.rewardPoints} RP → {item.meritPoints} MP
              </Text>
              <Text style={styles.historyDate}>{item.date}</Text>
            </View>
            
            {item.reason && (
              <Text style={styles.rejectionReason}>Reason: {item.reason}</Text>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateTitle}>No History Yet</Text>
          <Text style={styles.emptyStateText}>
            No conversion requests have been processed yet.
          </Text>
        </View>
      )}
    </View>
  );

  const renderSettingsTab = () => (
    <View>
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>System Settings</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Current Conversion Rate</Text>
          <View style={styles.rateDisplay}>
            <Text style={styles.rateValue}>{conversionRate}</Text>
            <Text style={styles.rateUnit}>Reward Points = 1 Merit Point</Text>
          </View>
          <TouchableOpacity 
            style={styles.updateRateButton}
            onPress={() => {
              setNewConversionRate(conversionRate.toString());
              setSettingsModalVisible(true);
            }}
          >
            <Text style={styles.updateRateButtonText}>Update Conversion Rate</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Minimum Conversion</Text>
          <Text style={styles.settingValue}>100 Reward Points</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto-Approval Threshold</Text>
          <Text style={styles.settingValue}>Disabled</Text>
        </View>
        
        <View style={styles.noteBox}>
          <Text style={styles.noteBoxTitle}>Note:</Text>
          <Text style={styles.noteBoxText}>
            Changes to conversion rate apply to future conversions only.
            Existing pending requests will use the rate at time of submission.
          </Text>
        </View>
      </View>
      
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Refresh Notification */}
        {showRefreshNotification && (
          <View style={styles.refreshNotification}>
            <Text style={styles.refreshNotificationText}>🔄 Updating data...</Text>
          </View>
        )}
        
        {/* Admin Header */}
        <View style={styles.adminHeader}>
          <Text style={styles.adminTitle}>Admin Dashboard</Text>
          <Text style={styles.adminSubtitle}>Merit Conversions Management</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin View</Text>
          </View>
          
          {/* Add refresh button */}
          <TouchableOpacity 
            style={styles.refreshHeaderButton}
            onPress={onRefresh}
          >
            <Text style={styles.refreshHeaderButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => {
              setActiveTab('pending');
              loadData();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending ({pendingConversions.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => {
              setActiveTab('history');
              loadData();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History ({adminConversionHistory.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
              System Settings
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Content based on active tab */}
        <View style={styles.content}>
          {activeTab === 'pending' && renderPendingTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </View>
        
      </ScrollView>
      
      {/* Rejection Reason Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={rejectionModalVisible}
        onRequestClose={() => setRejectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Rejection Reason</Text>
            
            {['Insufficient activity proof', 'Suspected fraud', 'Other'].map(reason => (
              <TouchableOpacity
                key={reason}
                style={styles.reasonOption}
                onPress={() => submitRejection(reason)}
              >
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.cancelModalButton}
              onPress={() => setRejectionModalVisible(false)}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Conversion Rate</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Reward Points per Merit Point:
              </Text>
              <TextInput
                style={styles.rateInput}
                value={newConversionRate}
                onChangeText={setNewConversionRate}
                keyboardType="numeric"
                placeholder="Enter rate"
                autoFocus={true}
              />
              <Text style={styles.inputHelp}>
                Current rate: {conversionRate} RP = 1 MP
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setSettingsModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleSaveSettings}
              >
                <Text style={styles.saveModalButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F9F5',
  },
  container: {
    flex: 1,
  },
  refreshNotification: {
    backgroundColor: '#4CAF50',
    padding: 10,
    alignItems: 'center',
  },
  refreshNotificationText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  adminHeader: {
    backgroundColor: '#2E7D32',
    padding: 25,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'relative',
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  adminSubtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    marginBottom: 15,
  },
  adminBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  adminBadgeText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
  },
  refreshHeaderButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  refreshHeaderButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 20,
    borderRadius: 10,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#E8F5E8',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  actionButtons: {
    marginBottom: 20,
  },
  selectAllButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  selectAllButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  approveRejectButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  rejectButtonText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  requestsList: {
    marginTop: 10,
  },
  requestCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRequestCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  checkboxContainer: {
    justifyContent: 'center',
    marginRight: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  requestInfo: {
    flex: 1,
  },
  studentInfo: {
    marginBottom: 10,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  studentId: {
    fontSize: 13,
    color: '#666',
  },
  conversionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  arrow: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 8,
  },
  meritPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  requestMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  requestDate: {
    fontSize: 12,
    color: '#888',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyStudentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyStudentId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historyStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyPoints: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 13,
    color: '#888',
  },
  rejectionReason: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic',
    marginTop: 5,
    paddingLeft: 5,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingItem: {
    marginBottom: 25,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  rateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginRight: 8,
  },
  rateUnit: {
    fontSize: 14,
    color: '#666',
  },
  updateRateButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  updateRateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noteBox: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  noteBoxTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5,
  },
  noteBoxText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  systemInfoButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  systemInfoButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    textAlign: 'center',
  },
  reasonOption: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  reasonText: {
    fontSize: 16,
    color: '#333',
  },
  cancelModalButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  rateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    marginBottom: 10,
  },
  inputHelp: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveModalButton: {
    backgroundColor: '#4CAF50',
  },
  saveModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManageConversionsScreen;