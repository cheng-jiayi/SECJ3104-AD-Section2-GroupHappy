import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { 
  apiCall, 
  API_ENDPOINTS, 
  ConversionRateEmitter, 
  ConversionRateManager,
  ConversionUpdateEmitter,
  registerScreenRefresh,
  calculateTimeUntilReset
} from '../config/api';

function ManageConversionsScreen() {
  const [activeTab, setActiveTab] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [newConversionRate, setNewConversionRate] = useState('');
  const [modalConversionRate, setModalConversionRate] = useState(''); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const [pendingConversions, setPendingConversions] = useState([]);
  const [adminConversionHistory, setAdminConversionHistory] = useState([]);
  const [conversionRate, setConversionRate] = useState(100);
  
  const getMeritPoints = (conversion) => {
    const meritPoints = conversion.meritPoints || conversion.merit_points || 0;
    return parseFloat(meritPoints) || 0;
  };

  const getRewardPoints = (conversion) => {
    const rewardPoints = conversion.rewardPoints || conversion.reward_points || 0;
    return parseInt(rewardPoints) || 0;
  };

  const loadConversionRateFromServer = async () => {
    try {
      const settingsResponse = await apiCall(API_ENDPOINTS.CONVERSIONS.SETTINGS);
      if (settingsResponse.success) {
        let rate = 100; // Default
        
        if (settingsResponse.data.conversion_rate) {
          rate = parseInt(settingsResponse.data.conversion_rate.value || settingsResponse.data.conversion_rate) || 100;
        } else if (settingsResponse.data.conversionRate) {
          rate = parseInt(settingsResponse.data.conversionRate) || 100;
        }
        
        console.log('📊 Loaded conversion rate from server:', rate);
        
        setConversionRate(rate);
        setNewConversionRate(rate.toString());
        
        await ConversionRateManager.setRate(rate);
        
        return rate;
      }
    } catch (error) {
      console.error('Error loading conversion rate:', error);
      const cachedRate = ConversionRateManager.getRate();
      setConversionRate(cachedRate);
      setNewConversionRate(cachedRate.toString());
      return cachedRate;
    }
  };

  const loadData = async () => {
    if (settingsModalVisible) return;
    
    if (isRefreshingData) return;
    
    setIsRefreshingData(true);
    setRefreshing(true);
    
    try {
      const pendingResponse = await apiCall(API_ENDPOINTS.CONVERSIONS.PENDING);
      if (pendingResponse.success) {
        const pendingWithSelection = pendingResponse.data.map(item => ({
          ...item,
          selected: false,
          meritPoints: item.meritPoints || item.merit_points || 0,
          rewardPoints: item.rewardPoints || item.reward_points || 0,
          studentName: item.studentName || 'Unknown Student',
          studentId: item.studentId || item.studentID || 'N/A',
          requestDate: item.requestDate || 'Unknown Date',
          status: item.status || 'Pending'
        }));
        setPendingConversions(pendingWithSelection);
      }
      
      const historyResponse = await apiCall(API_ENDPOINTS.CONVERSIONS.HISTORY);
      if (historyResponse.success) {
        const formattedHistory = historyResponse.data.map(item => ({
          ...item,
          meritPoints: item.meritPoints || item.merit_points || 0,
          rewardPoints: item.rewardPoints || item.reward_points || 0,
          studentName: item.studentName || 'Unknown Student',
          studentId: item.studentId || item.studentID || 'N/A',
          date: item.date || item.processed_date || 'Unknown Date',
          reason: item.reason || item.rejection_reason || null
        }));
        setAdminConversionHistory(formattedHistory);
      }

      if (!settingsModalVisible) {
        await loadConversionRateFromServer();
      }
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      Alert.alert('Connection Error', 'Unable to load data from server. Please try again.');
    } finally {
      setIsRefreshingData(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    
    const unsubscribe = ConversionRateEmitter.subscribe((newRate) => {
      console.log('🔄 ManageConversionsScreen: Rate update received:', newRate);
      
      if (!settingsModalVisible) {
        setConversionRate(newRate);
        setNewConversionRate(newRate.toString());
        
        loadConversionRateFromServer();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [settingsModalVisible]); 

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 ManageConversionsScreen: Screen focused, reloading data...');
      if (!settingsModalVisible) {
        loadData();
      }
    }, [settingsModalVisible])
  );

  const onRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    loadData();
  };

  const forceRefreshRate = async () => {
    console.log('🔄 Forcing refresh of conversion rate...');
    await loadConversionRateFromServer();
  };

  const handleOpenSettingsModal = () => {
    setModalConversionRate(conversionRate.toString());
    setSettingsModalVisible(true);
  };

  const selectedCount = pendingConversions.filter(c => c.selected).length;
  const totalRewardPoints = pendingConversions
    .filter(c => c.selected)
    .reduce((sum, c) => sum + getRewardPoints(c), 0);
  const totalMeritPoints = pendingConversions
    .filter(c => c.selected)
    .reduce((sum, c) => sum + getMeritPoints(c), 0);

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
    const conversionIds = selectedConversions.map(c => c.id);
    const affectedStudentIds = selectedConversions.map(c => c.studentId || c.student_id);
    
    try {
        console.log('🔄 Approving conversions...');
        const response = await apiCall(API_ENDPOINTS.CONVERSIONS.APPROVE, 'POST', {
            conversionIds
        });
        
        if (response.success) {
            if (global.notifyConversionUpdate) {
                global.notifyConversionUpdate('approval', {
                    studentIds: affectedStudentIds,
                    timestamp: new Date().toISOString()
                });
            }
            
            ConversionUpdateEmitter.emit('approval', {
                studentIds: affectedStudentIds,
                timestamp: new Date().toISOString()
            });
            
            Alert.alert(
                '✅ Success',
                `Conversions approved for ${selectedCount} student(s).\n` +
                `• ${totalRewardPoints} Reward Points deducted\n` +
                `• ${totalMeritPoints.toFixed(1)} UTM Merit Points awarded\n` +
                `• Screens will refresh automatically`,
                [{ 
                    text: 'OK', 
                    onPress: async () => {
                        await loadData();
                        
                        setPendingConversions(prev => 
                            prev.map(c => ({ ...c, selected: false }))
                        );
                        
                        setActiveTab('history');
                    }
                }]
            );
        } else {
            Alert.alert('Error', response.message || 'Failed to approve conversions');
        }
    } catch (error) {
        console.error('❌ Approve error:', error);
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
    const conversionIds = selectedConversions.map(c => c.id);

    Alert.alert(
      'Reject Conversions',
      `Reject conversion requests for ${selectedConversions.length} students?\nReason: ${reason}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            setRejectionModalVisible(false);
            
            try {
              const response = await apiCall(API_ENDPOINTS.CONVERSIONS.REJECT, 'POST', {
                conversionIds,
                reason
              });
              
              if (response.success) {
                Alert.alert(
                  'Rejected',
                  `Conversions rejected. Students notified with reason: ${reason}`,
                  [{ 
                    text: 'OK',
                    onPress: () => {
                      setActiveTab('history');
                      loadData(); 
                    }
                  }]
                );
              } else {
                Alert.alert('Error', response.message || 'Failed to reject conversions');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reject conversions: ' + error.message);
            }
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

  const handleSaveSettings = async () => {
    const rate = parseInt(modalConversionRate);
    if (isNaN(rate) || rate < 1) {
      Alert.alert('Invalid Rate', 'Please enter a valid conversion rate (minimum 1).');
      return;
    }

    setIsProcessing(true);
    
    try {
      const response = await apiCall(API_ENDPOINTS.CONVERSIONS.UPDATE_RATE, 'PUT', {
        rate: rate,
        adminId: 'ADM001'
      });
      
      if (response.success) {
        setConversionRate(rate);
        setNewConversionRate(rate.toString());
        
        await ConversionRateManager.setRate(rate);
        
        setSettingsModalVisible(false);
        setModalConversionRate(''); 
        
        Alert.alert(
          '✅ Success',
          `Conversion rate updated to:\n` +
          `• ${rate} RP = 1 Merit Point\n` +
          `• Minimum conversion: ${rate} RP`,
          [{ 
            text: 'OK',
            onPress: () => {
              loadData();
            }
          }]
        );
        
        ConversionRateEmitter.emit(rate);
        
      } else {
        Alert.alert('Error', response.message || 'Failed to update conversion rate');
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      Alert.alert('Error', `Failed to update conversion rate: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderPendingTab = () => (
    <View>
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
          pendingConversions.map((conversion, index) => {
            const meritPoints = getMeritPoints(conversion);
            const rewardPoints = getRewardPoints(conversion);
            
            return (
              <TouchableOpacity 
                key={conversion.id || `pending-${index}`}
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
                      <Text style={styles.rewardPoints}>{rewardPoints} RP</Text>
                      <Text style={styles.arrow}>→</Text>
                      <Text style={styles.meritPoints}>{meritPoints.toFixed(1)} MP</Text>
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
            );
          })
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
        adminConversionHistory.map((item, index) => {
          const meritPoints = getMeritPoints(item);
          const rewardPoints = getRewardPoints(item);
          
          return (
            <View key={item.id || `history-${index}`} style={[
              styles.historyCard,
              { borderLeftColor: getStatusColor(item.status) }
            ]}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyStudentName}>{item.studentName}</Text>
                  <Text style={styles.historyStudentId}>{item.studentId}</Text>
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
                  {rewardPoints} RP → {meritPoints.toFixed(1)} MP
                </Text>
                <Text style={styles.historyDate}>{item.date}</Text>
              </View>
              
              {item.reason && (
                <Text style={styles.rejectionReason}>Reason: {item.reason}</Text>
              )}
            </View>
          );
        })
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
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsTitle}>System Settings</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={forceRefreshRate}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Current Conversion Rate</Text>
          <View style={styles.rateDisplay}>
            <Text style={styles.rateValue}>{conversionRate}</Text>
            <Text style={styles.rateUnit}>Reward Points = 1 Merit Point</Text>
          </View>
          <TouchableOpacity 
            style={styles.updateRateButton}
            onPress={handleOpenSettingsModal}
          >
            <Text style={styles.updateRateButtonText}>Update Conversion Rate</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Minimum Conversion</Text>
          <Text style={styles.settingValue}>{conversionRate} Reward Points</Text>
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto-Approval Threshold</Text>
          <Text style={styles.settingValue}>Disabled</Text>
        </View>
        
        <View style={styles.noteBox}>
          <Text style={styles.noteBoxTitle}>Note:</Text>
          <Text style={styles.noteBoxText}>
            • Changes apply to future conversions only{'\n'}
            • Existing requests use their original rate{'\n'}
            • Refresh if rate doesn't update immediately
          </Text>
        </View>
      </View>
    </View>
  );

  if (refreshing && pendingConversions.length === 0 && adminConversionHistory.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading admin data...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Admin Header */}
        <View style={styles.adminHeader}>
          <Text style={styles.adminTitle}>Admin Dashboard</Text>
          <Text style={styles.adminSubtitle}>Merit Conversions Management</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin View</Text>
          </View>
        </View>
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending ({pendingConversions.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
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
        onRequestClose={() => {
          setSettingsModalVisible(false);
          setModalConversionRate(''); 
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Conversion Rate</Text>
            
            <View style={styles.currentRateDisplay}>
              <Text style={styles.currentRateLabel}>Current Rate:</Text>
              <Text style={styles.currentRateValue}>{conversionRate} RP = 1 MP</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                New Rate (Reward Points per Merit Point):
              </Text>
              <TextInput
                style={styles.rateInput}
                value={modalConversionRate}
                onChangeText={(text) => {
                  // Only allow numbers
                  const numericValue = text.replace(/[^0-9]/g, '');
                  setModalConversionRate(numericValue);
                }}
                keyboardType="number-pad"
                placeholder={`Enter new rate (current: ${conversionRate})`}
                autoFocus={true}
              />
              <Text style={styles.inputHelp}>
                Minimum: 1, Recommended: 50-200
              </Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setSettingsModalVisible(false);
                  setModalConversionRate('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleSaveSettings}
                disabled={isProcessing || !modalConversionRate || parseInt(modalConversionRate) === conversionRate}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveModalButtonText}>
                    {!modalConversionRate || parseInt(modalConversionRate) === conversionRate ? 'No Change' : 'Save Changes'}
                  </Text>
                )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
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
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  refreshButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
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
  currentRateDisplay: {
    backgroundColor: '#F5F9F5',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentRateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  currentRateValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
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