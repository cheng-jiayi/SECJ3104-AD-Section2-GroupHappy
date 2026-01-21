import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { apiCall, API_ENDPOINTS, ConversionRateEmitter, ConversionRateManager, registerScreenRefresh, ConversionUpdateEmitter } from '../config/api';

const { width } = Dimensions.get('window');
const DEMO_USER_ID = 'A23CS0001'; 

function RewardPointsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [conversionModalVisible, setConversionModalVisible] = useState(false);
  const [conversionAmount, setConversionAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const [userData, setUserData] = useState({
    userPoints: {
      totalRewardPoints: 0,
      utmMeritPoints: 0
    },
    conversionRate: 100,
    minConversion: 100,
    ongoingEvents: [],
    completedEvents: [],
    conversionHistory: [],
    pendingConversions: []
  });

useEffect(() => {
    loadData();
    
    const rateUnsubscribe = ConversionRateEmitter.subscribe((newRate) => {
        console.log('🔄 RewardPointsScreen: Rate updated to:', newRate);
        
        setUserData(prev => ({
            ...prev,
            conversionRate: newRate,
            minConversion: newRate
        }));
        
        loadData();
    });
    
    const conversionUnsubscribe = ConversionUpdateEmitter.subscribe((updateType, data) => {
        console.log('🔄 RewardPointsScreen: Conversion update received:', updateType);
        
        if (data && data.studentIds && data.studentIds.includes(DEMO_USER_ID)) {
            console.log('🔄 This update affects current user, refreshing...');
            loadData();
        } else if (updateType === 'all') {
            loadData();
        }
    });
    
    const refreshUnsubscribe = global.registerRefreshCallback?.(() => {
        console.log('🔄 RewardPointsScreen: Global refresh triggered');
        loadData();
    });
    
    return () => {
        rateUnsubscribe();
        conversionUnsubscribe();
        refreshUnsubscribe?.();
    };
}, []);

const loadData = async (force = false) => {
    if (refreshing && !force) return;
    
    setRefreshing(true);
    if (force) setLoading(true);
    
    try {
        console.log('💰 Loading reward data for:', DEMO_USER_ID);
        
        const response = await apiCall(API_ENDPOINTS.REWARDS.USER_DATA(DEMO_USER_ID));
        
        if (response.success) {
            console.log('✅ Reward data loaded successfully');
            
            const currentRate = ConversionRateEmitter.getCurrentRate();
            
            setUserData({
                userPoints: response.data?.userPoints || { totalRewardPoints: 0, utmMeritPoints: 0 },
                conversionRate: currentRate,
                minConversion: currentRate,
                ongoingEvents: response.data?.ongoingEvents || [],
                completedEvents: response.data?.completedEvents || [],
                conversionHistory: response.data?.conversionHistory || [],
                pendingConversions: response.data?.pendingConversions || []
            });
        } else {
            console.error('❌ API Error:', response.message);
        }
    } catch (error) {
        console.error('❌ Load data error:', error);
    } finally {
        setRefreshing(false);
        setLoading(false);
    }
};

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const totalRewardPoints = userData.userPoints?.totalRewardPoints || 0;
  const utmMeritPoints = userData.userPoints?.utmMeritPoints || 0;
  const conversionRate = userData.conversionRate || 100;
  const minConversion = userData.minConversion || 100;
  const maxConversion = Math.max(totalRewardPoints, minConversion);

  const calculateMeritPoints = (rewardPoints) => {
    return (rewardPoints / conversionRate).toFixed(1);
  };

  const handleConvertPoints = () => {
    if (totalRewardPoints < minConversion) {
      Alert.alert(
        'Insufficient Points',
        `You need at least ${minConversion} points to convert.\nCurrent points: ${totalRewardPoints}`
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
    
    const initialAmount = Math.max(minConversion, Math.min(500, totalRewardPoints));
    setConversionAmount(initialAmount);
    setCustomAmount(initialAmount.toString());
    setConversionModalVisible(true);
  };

  const submitConversion = async () => {
    let amountToConvert = conversionAmount;
    
    if (amountToConvert < minConversion) {
      Alert.alert('Minimum Not Met', `Minimum conversion is ${minConversion} Reward Points.`);
      return;
    }

    if (amountToConvert > totalRewardPoints) {
      Alert.alert('Insufficient Points', `You only have ${totalRewardPoints} points available.`);
      return;
    }

    setIsConverting(true);
    
    try {
      const response = await apiCall(API_ENDPOINTS.REWARDS.CONVERT, 'POST', {
        studentID: DEMO_USER_ID,
        rewardPoints: amountToConvert
      });
      
      if (response.success) {
        setConversionModalVisible(false);
        setCustomAmount('');
        
        Alert.alert(
          '✅ Conversion Submitted',
          `Conversion of ${amountToConvert} Reward Points submitted for admin approval.\n` +
          `You will receive ${calculateMeritPoints(amountToConvert)} Merit Points if approved.`,
          [{ 
            text: 'OK',
            onPress: () => {
              setActiveTab('dashboard');
              loadData();
            }
          }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit conversion');
      }
    } catch (error) {
      console.error('❌ Submit conversion error:', error);
      Alert.alert('Error', 'Failed to submit conversion request');
    } finally {
      setIsConverting(false);
    }
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
    const roundedValue = Math.round(value);
    setConversionAmount(roundedValue);
    setCustomAmount(roundedValue.toString());
  };

  const handleQuickSelect = (amount) => {
    setConversionAmount(amount);
    setCustomAmount(amount.toString());
  };

  const renderDashboard = () => (
    <View>
      {/* Points Summary */}
      <View style={styles.pointsSummary}>
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Total Reward Points</Text>
          <Text style={styles.rewardPoints}>{totalRewardPoints}</Text>
          <Text style={styles.pointsSubtext}>Available for conversion</Text>
        </View>
        
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>UTM Merit Points</Text>
          <Text style={styles.meritPoints}>{utmMeritPoints.toFixed(1)}</Text>
          <Text style={styles.pointsSubtext}>Earned from conversions</Text>
        </View>
      </View>
      
      {/* Pending Conversions */}
      {userData.pendingConversions?.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.sectionTitle}>⏳ Pending Conversions</Text>
          {userData.pendingConversions.map((conversion, index) => (
            <View key={conversion.id || `pending-${index}`} style={styles.pendingConversionCard}>
              <View style={styles.pendingConversionInfo}>
                <Text style={styles.pendingConversionAmount}>
                  {conversion.rewardPoints || 0} RP → {parseFloat(conversion.meritPoints || 0).toFixed(1)} MP
                </Text>
                <Text style={styles.pendingConversionDate}>
                  Submitted: {conversion.submittedDate || 'N/A'}
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
              totalRewardPoints < minConversion && styles.disabledButton
            ]}
            onPress={handleConvertPoints}
            disabled={totalRewardPoints < minConversion}
          >
            <Text style={styles.convertButtonText}>Convert Points</Text>
          </TouchableOpacity>
        </Animated.View>
        
        {totalRewardPoints < minConversion && (
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
            <Text style={styles.statNumber}>{userData.ongoingEvents?.length || 0}</Text>
            <Text style={styles.statLabel}>Ongoing Events</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userData.completedEvents?.length || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userData.conversionHistory?.length || 0}</Text>
            <Text style={styles.statLabel}>Conversions</Text>
          </View>
        </View>
        <View style={styles.conversionStats}>
          <View style={styles.conversionStatItem}>
            <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.conversionStatText}>
              Approved: {(userData.conversionHistory?.filter(c => c.status === 'Approved') || []).length}
            </Text>
          </View>
          <View style={styles.conversionStatItem}>
            <View style={[styles.statDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.conversionStatText}>
              Pending: {userData.pendingConversions?.length || 0}
            </Text>
          </View>
          <View style={styles.conversionStatItem}>
            <View style={[styles.statDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.conversionStatText}>
              Rejected: {(userData.conversionHistory?.filter(c => c.status === 'Rejected') || []).length}
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
      {userData.ongoingEvents?.length > 0 ? (
        userData.ongoingEvents.map((event, index) => (
          <View key={event.id || `ongoing-${index}`} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventName}>{event.name || 'Unnamed Event'}</Text>
              <Text style={styles.eventPoints}>{(event.earned || 0)}/{(event.target || 0)} RP</Text>
            </View>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((event.progress || 0) * 100, 100)}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(Math.min((event.progress || 0) * 100, 100))}% Complete
              </Text>
            </View>
            
            <Text style={styles.eventTarget}>
              Target: {event.target || 0} Reward Points
            </Text>
          </View>
        ))
      ) : (
        <Text style={styles.emptyStateText}>No ongoing events</Text>
      )}
      
      {/* Completed Events */}
      <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Completed Events</Text>
      {userData.completedEvents?.length > 0 ? (
        userData.completedEvents.map((event, index) => (
          <View key={event.id || `completed-${index}`} style={styles.completedEventCard}>
            <View style={styles.completedEventInfo}>
              <Text style={styles.completedEventName}>{event.name || 'Unnamed Event'}</Text>
              <Text style={styles.completedEventDate}>{event.date || 'N/A'}</Text>
            </View>
            <View style={styles.completedEventPoints}>
              <Text style={styles.earnedPoints}>+{event.points || 0} RP</Text>
              <Text style={styles.earnedLabel}>Earned</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyStateText}>No completed events</Text>
      )}
    </View>
  );

  const renderConversionHistory = () => (
    <View>
      <Text style={styles.sectionTitle}>Conversion History</Text>
      
      {userData.conversionHistory?.length > 0 ? (
        userData.conversionHistory.map((conversion, index) => (
          <View key={conversion.id || `history-${index}`} style={[
            styles.conversionCard,
            conversion.status === 'Approved' ? styles.approvedConversionCard : 
            conversion.status === 'Rejected' ? styles.rejectedConversionCard : null
          ]}>
            <View style={styles.conversionInfo}>
              <View>
                <Text style={styles.conversionDate}>{conversion.date || 'N/A'}</Text>
                <Text style={styles.conversionAmount}>
                  {conversion.rewardPoints || 0} RP → {parseFloat(conversion.meritPoints || 0).toFixed(1)} MP
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                conversion.status === 'Approved' ? styles.statusApproved : 
                conversion.status === 'Rejected' ? styles.statusRejected : null
              ]}>
                <Text style={styles.statusText}>{conversion.status || 'Unknown'}</Text>
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading reward data...</Text>
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
            onRefresh={loadData}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'dashboard' && styles.activeTab]}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text style={[styles.tabText, activeTab === 'dashboard' && styles.activeTabText]}>
              Dashboard
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
              My Events
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History ({userData.conversionHistory?.length || 0})
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
                  Available: {totalRewardPoints} Reward Points
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
                    {[100, 250, 500, 1000, maxConversion].map(amount => {
                      if (amount <= maxConversion) {
                        return (
                          <TouchableOpacity
                            key={`quick-${amount}`}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F9F5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontFamily: 'System',
  },
  activeTabText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  pointsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pointsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'System',
  },
  rewardPoints: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'System',
  },
  meritPoints: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
    fontFamily: 'System',
  },
  pointsSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontFamily: 'System',
  },
  pendingSection: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
    fontFamily: 'System',
  },
  pendingConversionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pendingConversionInfo: {
    flex: 1,
  },
  pendingConversionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'System',
  },
  pendingConversionDate: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'System',
  },
  pendingStatusBadge: {
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
    fontFamily: 'System',
  },
  pendingNote: {
    fontSize: 14,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'System',
  },
  conversionInfoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conversionRate: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'System',
  },
  minConversionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    fontFamily: 'System',
  },
  convertButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  insufficientPointsText: {
    marginTop: 12,
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System',
  },
  conversionStats: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  conversionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  conversionStatText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'System',
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    fontFamily: 'System',
  },
  eventPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'System',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    fontFamily: 'System',
  },
  eventTarget: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  completedEventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedEventInfo: {
    flex: 1,
  },
  completedEventName: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'System',
  },
  completedEventDate: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'System',
  },
  completedEventPoints: {
    alignItems: 'center',
  },
  earnedPoints: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'System',
  },
  earnedLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontFamily: 'System',
  },
  conversionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rejectedConversionCard: {
    borderLeftColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  conversionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  conversionDate: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
    fontFamily: 'System',
  },
  conversionAmount: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    fontFamily: 'System',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusApproved: {
    backgroundColor: '#E8F5E8',
  },
  statusRejected: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'System',
  },
  rejectionReason: {
    fontSize: 13,
    color: '#F44336',
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 4,
    fontFamily: 'System',
  },
  approvedNote: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 8,
    paddingLeft: 4,
    fontFamily: 'System',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 56,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 20,
    fontFamily: 'System',
  },
  startConvertingButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
  },
  startConvertingButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'System',
  },
  importantNote: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  importantNoteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
    fontFamily: 'System',
  },
  importantNoteText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: 'System',
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
    borderRadius: 20,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: 'System',
  },
  modalContent: {
    marginBottom: 24,
  },
  availablePointsText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
    fontFamily: 'System',
  },
  customAmountContainer: {
    marginBottom: 24,
  },
  customAmountLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontFamily: 'System',
  },
  customAmountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontFamily: 'System',
  },
  customAmountUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
    fontWeight: '500',
    fontFamily: 'System',
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'System',
  },
  slider: {
    height: 40,
  },
  sliderMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderMinMaxText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System',
  },
  quickAmounts: {
    marginBottom: 24,
  },
  quickAmountsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'System',
  },
  quickAmountButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  quickAmountButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickAmountButtonActive: {
    backgroundColor: '#4CAF50',
  },
  quickAmountButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    fontFamily: 'System',
  },
  quickAmountButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'System',
  },
  conversionResult: {
    backgroundColor: '#F5F9F5',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  resultTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'System',
  },
  resultPoints: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
    fontFamily: 'System',
  },
  resultFormula: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default RewardPointsScreen; 