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
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useAppContext } from '../context/AppContext';
import { useFocusEffect } from '@react-navigation/native';

function RewardPointsScreen({ navigation }) {
  const { 
    conversionRate, 
    userPoints, 
    submitConversionRequest,
    getUserConversionHistory,
    getUserPendingConversions,
    userMeritPoints,
    dataVersion,
    refreshData
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [conversionAmount, setConversionAmount] = useState(100);
  const [isConverting, setIsConverting] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [customAmount, setCustomAmount] = useState('');
  const [showRefreshNotification, setShowRefreshNotification] = useState(false);
  
  // Local state for auto-refresh
  const [localUserHistory, setLocalUserHistory] = useState([]);
  const [localPendingConversions, setLocalPendingConversions] = useState([]);
  const [localUserMeritPoints, setLocalUserMeritPoints] = useState(userMeritPoints);
  const [localTotalPoints, setLocalTotalPoints] = useState(userPoints);

  const minConversion = 100;
  const maxConversion = localTotalPoints;
  
  const sampleData = {
    totalRewardPoints: localTotalPoints,
    utmMeritPoints: localUserMeritPoints,
    conversionRate: conversionRate,
    minConversion: minConversion,
    
    ongoingEvents: [
      { id: 1, name: 'Green Campus Week', progress: 0.75, target: 200, earned: 150 },
      { id: 2, name: 'E-Waste Collection', progress: 0.4, target: 150, earned: 60 },
      { id: 3, name: 'Plastic-Free Challenge', progress: 0.9, target: 100, earned: 90 },
    ],
    
    completedEvents: [
      { id: 4, name: 'Paper Recycling Drive', points: 120, date: '2024-01-15' },
      { id: 5, name: 'Energy Saving Month', points: 80, date: '2023-12-10' },
      { id: 6, name: 'Tree Planting Day', points: 50, date: '2023-11-05' },
    ],
  };

  // Function to load and update all data
  const loadUserData = useCallback(() => {
    console.log('🔄 Loading user data...');
    setShowRefreshNotification(true);
    
    try {
      const history = getUserConversionHistory() || [];
      const pending = getUserPendingConversions() || [];
      
      console.log('History count:', history.length);
      console.log('Pending count:', pending.length);
      
      // Calculate total merit points from approved conversions
      const approvedMerits = history
        .filter(conv => conv.status === 'Approved')
        .reduce((sum, conv) => sum + parseFloat(conv.meritPoints || 0), 0);
      
      // Start with base merit points (12.5 from demo) and add approved
      const baseMerits = 12.5;
      const totalMerits = baseMerits + approvedMerits;
      
      setLocalUserHistory(history);
      setLocalPendingConversions(pending);
      setLocalUserMeritPoints(totalMerits);
      
      // Use userPoints from context
      setLocalTotalPoints(userPoints);
      
      console.log('Updated merit points:', totalMerits);
      console.log('Updated total points from context:', userPoints);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback to default values
      setLocalUserHistory([]);
      setLocalPendingConversions([]);
      setLocalUserMeritPoints(12.5);
      setLocalTotalPoints(userPoints);
    }
    
    // Hide notification after 1 second
    setTimeout(() => setShowRefreshNotification(false), 1000);
  }, [getUserConversionHistory, getUserPendingConversions, userMeritPoints, userPoints]);

  // Load data on mount, when dataVersion changes, and when screen focuses
  useEffect(() => {
    loadUserData();
  }, [loadUserData, dataVersion]);

  // Also refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🎯 Reward screen focused, refreshing data...');
      loadUserData();
      return () => {
        console.log('🎯 Reward screen unfocused');
      };
    }, [loadUserData])
  );

  const totalConversions = localUserHistory.length + localPendingConversions.length;

  const calculateMeritPoints = (rewardPoints) => {
    return (rewardPoints / conversionRate).toFixed(1);
  };

  const handleConvertPoints = () => {
    if (localTotalPoints < minConversion) {
      Alert.alert(
        'Insufficient Points',
        `You need at least ${minConversion} points to convert.\nCurrent points: ${localTotalPoints}`
      );
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
    
    // Set initial amount to minimum or 100 if points are low
    const initialAmount = Math.max(minConversion, Math.min(100, localTotalPoints));
    setConversionAmount(initialAmount);
    setCustomAmount(initialAmount.toString());
    setConversionModalVisible(true);
  };

  const submitConversion = () => {
    let amountToConvert = conversionAmount;
    
    // Validate amount
    if (amountToConvert < minConversion) {
      Alert.alert(
        'Minimum Not Met',
        `Minimum conversion is ${minConversion} Reward Points.`
      );
      return;
    }

    if (amountToConvert > localTotalPoints) {
      Alert.alert(
        'Insufficient Points',
        `You only have ${localTotalPoints} points available.`
      );
      return;
    }

    setIsConverting(true);
    
    setTimeout(() => {
      // Submit conversion request
      submitConversionRequest(amountToConvert);
      
      setIsConverting(false);
      setConversionModalVisible(false);
      setCustomAmount('');
      
      // Force immediate refresh
      setTimeout(() => {
        loadUserData();
        refreshData(); // Notify other screens
      }, 300);
      
      Alert.alert(
        '✓ Conversion Submitted',
        `Conversion of ${amountToConvert} Reward Points submitted for admin approval.\n` +
        `You will receive ${calculateMeritPoints(amountToConvert)} Merit Points if approved.\n\n` +
        `Your request is now pending admin review.`,
        [{ 
          text: 'OK',
          onPress: () => {
            setActiveTab('dashboard');
          }
        }]
      );
    }, 1000);
  };

  const handleCustomAmountChange = (text) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    
    if (numericValue) {
      const amount = parseInt(numericValue);
      if (amount >= minConversion && amount <= maxConversion) {
        setConversionAmount(amount);
      }
    }
  };

  const handleSliderChange = (value) => {
    setConversionAmount(Math.round(value));
    setCustomAmount(Math.round(value).toString());
  };

  const handleQuickSelect = (amount) => {
    setConversionAmount(amount);
    setCustomAmount(amount.toString());
  };

  const renderDashboard = () => (
    <View>
      {/* Refresh Notification */}
      {showRefreshNotification && (
        <View style={styles.refreshNotification}>
          <Text style={styles.refreshNotificationText}>🔄 Updating data...</Text>
        </View>
      )}
      
      {/* Points Summary */}
      <View style={styles.pointsSummary}>
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Total Reward Points</Text>
          <Text style={styles.rewardPoints}>{localTotalPoints}</Text>
          <Text style={styles.pointsSubtext}>Available for conversion</Text>
        </View>
        
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>UTM Merit Points</Text>
          <Text style={styles.meritPoints}>{localUserMeritPoints.toFixed(1)}</Text>
          <Text style={styles.pointsSubtext}>Earned from conversions</Text>
        </View>
      </View>
      
      {/* Pending Conversions (if any) */}
      {localPendingConversions.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>⏳ Pending Conversions</Text>
          {localPendingConversions.map(conversion => (
            <View key={conversion.id} style={styles.pendingConversionCard}>
              <View style={styles.pendingConversionInfo}>
                <Text style={styles.pendingConversionAmount}>
                  {conversion.rewardPoints} RP → {conversion.meritPoints.toFixed(1)} MP
                </Text>
                <Text style={styles.pendingConversionDate}>
                  Submitted: {conversion.submittedDate || conversion.requestDate}
                </Text>
              </View>
              <View style={styles.pendingStatusBadge}>
                <Text style={styles.pendingStatusText}>Pending</Text>
              </View>
            </View>
          ))}
          <Text style={styles.pendingNote}>
            ⏳ Waiting for admin approval. Check back later!
          </Text>
        </View>
      )}
      
      {/* Conversion Info */}
      <View style={styles.conversionInfoCard}>
        <Text style={styles.sectionTitle}>Conversion Rate</Text>
        <Text style={styles.conversionRate}>
          {conversionRate} Reward Points = 1 UTM Merit Point
        </Text>
        <Text style={styles.minConversionText}>
          Minimum conversion: {minConversion} points
        </Text>
        
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            style={[
              styles.convertButton,
              localTotalPoints < minConversion && styles.disabledButton
            ]}
            onPress={handleConvertPoints}
            disabled={localTotalPoints < minConversion}
          >
            <Text style={styles.convertButtonText}>Convert Points</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {localTotalPoints < minConversion && (
          <Text style={styles.insufficientPointsText}>
            You need at least {minConversion} points to convert.
          </Text>
        )}
      </View>
      
      {/* Quick Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sampleData.ongoingEvents.length}</Text>
            <Text style={styles.statLabel}>Ongoing Events</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{sampleData.completedEvents.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalConversions}</Text>
            <Text style={styles.statLabel}>All Conversions</Text>
          </View>
        </View>
        <View style={styles.conversionStats}>
          <View style={styles.conversionStatItem}>
            <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.conversionStatText}>
              Approved: {localUserHistory.filter(c => c.status === 'Approved').length}
            </Text>
          </View>
          <View style={styles.conversionStatItem}>
            <View style={[styles.statDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.conversionStatText}>
              Pending: {localPendingConversions.length}
            </Text>
          </View>
          <View style={styles.conversionStatItem}>
            <View style={[styles.statDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.conversionStatText}>
              Rejected: {localUserHistory.filter(c => c.status === 'Rejected').length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderMyEvents = () => (
    <View>
      {/* Ongoing Events */}
      <Text style={styles.sectionTitle}>Ongoing Events</Text>
      {sampleData.ongoingEvents.map(event => (
        <View key={event.id} style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventPoints}>{event.earned}/{event.target} RP</Text>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${event.progress * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(event.progress * 100)}% Complete
            </Text>
          </View>
          
          <Text style={styles.eventTarget}>
            Target: {event.target} Reward Points
          </Text>
        </View>
      ))}
      
      {/* Completed Events */}
      <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Completed Events</Text>
      {sampleData.completedEvents.map(event => (
        <View key={event.id} style={styles.completedEventCard}>
          <View style={styles.completedEventInfo}>
            <Text style={styles.completedEventName}>{event.name}</Text>
            <Text style={styles.completedEventDate}>{event.date}</Text>
          </View>
          <View style={styles.completedEventPoints}>
            <Text style={styles.earnedPoints}>+{event.points} RP</Text>
            <Text style={styles.earnedLabel}>Earned</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderConversionHistory = () => (
    <View>
      <Text style={styles.sectionTitle}>Conversion History</Text>
      <Text style={styles.historySubtitle}>
        Showing only approved and rejected conversions
      </Text>
      
      {localUserHistory.length > 0 ? (
        localUserHistory.map(conversion => (
          <View key={conversion.id} style={[
            styles.conversionCard,
            conversion.status === 'Approved' ? styles.approvedConversionCard : 
            conversion.status === 'Rejected' ? styles.rejectedConversionCard : null
          ]}>
            <View style={styles.conversionInfo}>
              <View>
                <Text style={styles.conversionDate}>{conversion.date}</Text>
                <Text style={styles.conversionAmount}>
                  {conversion.rewardPoints} RP → {conversion.meritPoints} MP
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                conversion.status === 'Approved' ? styles.statusApproved : 
                conversion.status === 'Rejected' ? styles.statusRejected :
                conversion.status === 'Pending' ? styles.statusPending : null
              ]}>
                <Text style={styles.statusText}>{conversion.status}</Text>
              </View>
            </View>
            
            {conversion.reason && (
              <Text style={styles.rejectionReason}>Reason: {conversion.reason}</Text>
            )}
            
            {conversion.status === 'Approved' && (
              <Text style={styles.approvedNote}>
                ✅ Merit points added to your account
              </Text>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateTitle}>No Conversion History</Text>
          <Text style={styles.emptyStateText}>
            You haven't made any conversion requests yet.
          </Text>
          <TouchableOpacity 
            style={styles.startConvertingButton}
            onPress={handleConvertPoints}
          >
            <Text style={styles.startConvertingButtonText}>Start Converting Points</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
      
      <ScrollView style={styles.container}>
        {/* Refresh Notification at top */}
        {showRefreshNotification && (
          <View style={styles.refreshNotification}>
            <Text style={styles.refreshNotificationText}>🔄 Updating data...</Text>
          </View>
        )}
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
            onPress={() => {
              setActiveTab('dashboard');
              loadUserData();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => {
              setActiveTab('events');
              loadUserData();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
              My Events
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => {
              setActiveTab('history');
              loadUserData();
            }}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History ({localUserHistory.length})
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Content based on active tab */}
        <View style={styles.content}>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'events' && renderMyEvents()}
          {activeTab === 'history' && renderConversionHistory()}
        </View>
        
      </ScrollView>
      
      {/* Conversion Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={conversionModalVisible}
        onRequestClose={() => {
          setConversionModalVisible(false);
          setCustomAmount('');
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollViewContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Convert Points to Merit</Text>
              
              <View style={styles.modalContent}>
                <Text style={styles.availablePointsText}>
                  Available: {localTotalPoints} Reward Points
                </Text>
                
                {/* Custom Amount Input */}
                <View style={styles.customAmountContainer}>
                  <Text style={styles.customAmountLabel}>Enter Amount:</Text>
                  <View style={styles.customAmountInputWrapper}>
                    <TextInput
                      style={styles.customAmountInput}
                      value={customAmount}
                      onChangeText={handleCustomAmountChange}
                      keyboardType="numeric"
                      placeholder="Enter amount"
                      maxLength={6}
                    />
                    <Text style={styles.customAmountUnit}>RP</Text>
                  </View>
                </View>
                
                {/* Slider Container */}
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>
                    Select Amount: {conversionAmount} RP
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={minConversion}
                    maximumValue={maxConversion}
                    value={conversionAmount}
                    onValueChange={handleSliderChange}
                    step={10}
                    minimumTrackTintColor="#4CAF50"
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor="#4CAF50"
                  />
                  <View style={styles.sliderMinMax}>
                    <Text style={styles.sliderMinMaxText}>Min: {minConversion} RP</Text>
                    <Text style={styles.sliderMinMaxText}>Max: {maxConversion} RP</Text>
                  </View>
                </View>
                
                {/* Quick Amount Buttons */}
                <View style={styles.quickAmounts}>
                  <Text style={styles.quickAmountsLabel}>Quick Select:</Text>
                  <View style={styles.quickAmountButtons}>
                    {[100, 200, 300, 500, maxConversion].map(amount => {
                      if (amount <= maxConversion) {
                        return (
                          <TouchableOpacity
                            key={amount}
                            style={[
                              styles.quickAmountButton,
                              conversionAmount === amount && styles.quickAmountButtonActive
                            ]}
                            onPress={() => handleQuickSelect(amount)}
                          >
                            <Text style={[
                              styles.quickAmountButtonText,
                              conversionAmount === amount && styles.quickAmountButtonTextActive
                            ]}>
                              {amount === maxConversion ? 'Max' : amount}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                      return null;
                    })}
                  </View>
                </View>
                
                {/* Conversion Result */}
                <View style={styles.conversionResult}>
                  <Text style={styles.resultTitle}>You will receive:</Text>
                  <Text style={styles.resultPoints}>
                    {calculateMeritPoints(conversionAmount)} UTM Merit Points
                  </Text>
                  <Text style={styles.resultFormula}>
                    ({conversionAmount} RP ÷ {conversionRate} = {calculateMeritPoints(conversionAmount)} MP)
                  </Text>
                </View>
                
                {/* Important Note */}
                <View style={styles.importantNote}>
                  <Text style={styles.importantNoteTitle}>⚠️ Important:</Text>
                  <Text style={styles.importantNoteText}>
                    • Conversion requests require admin approval{'\n'}
                    • Pending conversions appear in Dashboard, not History{'\n'}
                    • Once approved/rejected, they will appear in History{'\n'}
                    • Rejected conversions return your Reward Points
                  </Text>
                </View>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setConversionModalVisible(false);
                    setCustomAmount('');
                  }}
                  disabled={isConverting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={submitConversion}
                  disabled={isConverting || conversionAmount < minConversion}
                >
                  {isConverting ? (
                    <Text style={styles.submitButtonText}>Processing...</Text>
                  ) : (
                    <Text style={styles.submitButtonText}>Submit for Approval</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 10,
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
  pointsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pointsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  rewardPoints: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  meritPoints: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  pointsSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  pendingSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pendingConversionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  pendingConversionInfo: {
    flex: 1,
  },
  pendingConversionAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  pendingConversionDate: {
    fontSize: 12,
    color: '#666',
  },
  pendingStatusBadge: {
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pendingStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  pendingNote: {
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  conversionInfoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15,
  },
  conversionRate: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 10,
  },
  minConversionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  convertButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  insufficientPointsText: {
    marginTop: 10,
    fontSize: 13,
    color: '#F44336',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  conversionStats: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  conversionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  conversionStatText: {
    fontSize: 13,
    color: '#666',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  eventPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'right',
  },
  eventTarget: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  completedEventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  completedEventInfo: {
    flex: 1,
  },
  completedEventName: {
    fontSize: 15,
    color: '#333',
    marginBottom: 5,
  },
  completedEventDate: {
    fontSize: 12,
    color: '#888',
  },
  completedEventPoints: {
    alignItems: 'center',
  },
  earnedPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  earnedLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  historySubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  conversionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  rejectedConversionCard: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  conversionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  conversionDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 5,
  },
  conversionAmount: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#E8F5E8',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusRejected: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  rejectionReason: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic',
    marginTop: 5,
    paddingLeft: 5,
  },
  approvedNote: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
    paddingLeft: 5,
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
    marginBottom: 20,
  },
  startConvertingButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  startConvertingButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  importantNote: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  importantNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 5,
  },
  importantNoteText: {
    fontSize: 12,
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
  modalScrollView: {
    width: '100%',
    maxHeight: '80%',
  },
  modalScrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: 25,
  },
  availablePointsText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  customAmountContainer: {
    marginBottom: 20,
  },
  customAmountLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  customAmountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#F9F9F9',
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  customAmountUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
    fontWeight: '500',
  },
  sliderContainer: {
    marginBottom: 25,
  },
  sliderLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  slider: {
    height: 40,
  },
  sliderMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderMinMaxText: {
    fontSize: 12,
    color: '#666',
  },
  quickAmounts: {
    marginVertical: 20,
  },
  quickAmountsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  quickAmountButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickAmountButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    marginBottom: 10,
  },
  quickAmountButtonActive: {
    backgroundColor: '#4CAF50',
  },
  quickAmountButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quickAmountButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  conversionResult: {
    backgroundColor: '#F5F9F5',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  resultTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  resultPoints: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  resultFormula: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RewardPointsScreen;