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
  RefreshControl,
  Animated,
  ActivityIndicator,
  Dimensions
} from 'react-native';

import { 
  apiCall, 
  API_ENDPOINTS, 
  calculateTimeUntilReset, 
  ConversionRateEmitter,
  ConversionRateManager,
  ConversionUpdateEmitter,
  registerScreenRefresh
} from '../config/api';

const { width } = Dimensions.get('window');
const DEMO_USER_ID = 'A23CS0001'; 

function LeaderboardScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const [weeklyData, setWeeklyData] = useState([]);
  const [hallOfFame, setHallOfFame] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [conversionRate, setConversionRate] = useState(100);
  const [timeLeft, setTimeLeft] = useState(calculateTimeUntilReset());
  const [showFallbackWarning, setShowFallbackWarning] = useState(false);

  const loadData = async () => {
  setRefreshing(true);
  setLoading(true);
  
  try {
    console.log('📥 Loading leaderboard data...');
    
    const weeklyResponse = await apiCall(API_ENDPOINTS.LEADERBOARD.WEEKLY);
    if (weeklyResponse.success) {
      console.log(`✅ Weekly data: ${weeklyResponse.data.length} records`);
      
      if (weeklyResponse.data.length > 0) {
        console.log('Sample data:', {
          name: weeklyResponse.data[0].name,
          weeklyPoints: weeklyResponse.data[0].weeklyPoints,
          totalPoints: weeklyResponse.data[0].totalPoints,
          studentID: weeklyResponse.data[0].studentID
        });
      }
      
      setWeeklyData(weeklyResponse.data || []);
      setShowFallbackWarning(weeklyResponse.usingFallback || false);
    } else {
      console.error('Weekly API error:', weeklyResponse.message);
      Alert.alert('Error', weeklyResponse.message || 'Failed to load leaderboard');
    }
        
        const hallResponse = await apiCall(API_ENDPOINTS.LEADERBOARD.HALL_OF_FAME);
        if (hallResponse.success) {
            console.log(`✅ Hall of fame: ${hallResponse.data.length} records`);
            setHallOfFame(hallResponse.data || []);
        } else {
            console.log('⚠️ Hall of fame load failed, using empty array');
            setHallOfFame([]);
        }
        
        const userResponse = await apiCall(API_ENDPOINTS.LEADERBOARD.CURRENT_USER(DEMO_USER_ID));
        if (userResponse.success) {
            console.log(`✅ User stats loaded for ${DEMO_USER_ID}`);
            setUserStats(userResponse.data);
        } else {
            console.log('⚠️ User stats load failed, using default');
            setUserStats({
                fullName: 'John Doe',
                studentID: DEMO_USER_ID,
                totalPoints: 0,
                totalMerits: 0,
                weeklyPoints: 0,
                rank: 0,
                weeklyTransactions: 0,
                weeklyWeight: 0,
                totalItemsRecycled: 0,
                totalWeightRecycled: 0,
                faculty: 'Computer Science'
            });
        }
        
        const currentRate = ConversionRateManager.getRate();
        console.log('📊 Using conversion rate:', currentRate);
        setConversionRate(currentRate);
        
        setTimeLeft(calculateTimeUntilReset());
        
    } catch (error) {
        console.error('❌ Load data error:', error);
        Alert.alert('Connection Error', 'Unable to load data from server. Please try again.');
    } finally {
        setRefreshing(false);
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    const timer = setInterval(() => {
        setTimeLeft(calculateTimeUntilReset());
    }, 1000);
    
    const rateUnsubscribe = ConversionRateEmitter.subscribe((newRate) => {
        console.log('🔄 LeaderboardScreen: Rate updated to:', newRate);
        setConversionRate(newRate);
        loadData();
    });
    
    const conversionUnsubscribe = ConversionUpdateEmitter.subscribe((updateType, data) => {
        console.log('🔄 LeaderboardScreen: Conversion update received:', updateType);
        
        if (updateType === 'approval' || updateType === 'rejection' || updateType === 'all') {
            console.log('🔄 Refreshing leaderboard due to conversion update');
            loadData();
        }
    });
    
    const refreshUnsubscribe = global.registerRefreshCallback?.(() => {
        console.log('🔄 LeaderboardScreen: Global refresh triggered');
        loadData();
    });
    
    return () => {
        clearInterval(timer);
        rateUnsubscribe?.();
        conversionUnsubscribe?.();
        refreshUnsubscribe?.();
    };
  }, []);

  const onRefresh = async () => {
    await loadData();
  };
  
  const handleConvertToMerit = () => {
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

    navigation.navigate('RewardPoints');
  };
  
  const getMedalColor = (rank) => {
    switch(rank) {
      case 1: return '#FFD700'; 
      case 2: return '#C0C0C0'; 
      case 3: return '#CD7F32'; 
      default: return '#4CAF50'; 
    }
  };
  
  const getMedalIcon = (rank) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };
  
  const getRankTextStyle = (rank) => {
    if (rank <= 3) {
      return styles.topRankText;
    }
    return styles.rankText;
  };

  const getConversionInfo = () => {
    if (!userStats) return { canConvert: false, neededPoints: 0 };
    
    const totalPoints = userStats.totalPoints || 0;
    const canConvert = totalPoints >= conversionRate;
    const neededPoints = Math.max(0, conversionRate - totalPoints);
    
    return { canConvert, neededPoints, totalPoints };
  };
  
  const conversionInfo = getConversionInfo();

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
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
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Weekly Rankings</Text>
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Resets in:</Text>
            <Text style={styles.timer}>
              {timeLeft.days}d {timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
            </Text>
          </View>
          <Text style={styles.headerSubtitle}>Earn points by recycling and participating in events</Text>
        </View>
        
        {/* Hall of Fame - Top 3 */}
        {hallOfFame.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏆 Hall of Fame</Text>
            <Text style={styles.sectionSubtitle}>All-Time Top Scorers</Text>
            
            <View style={styles.topThreeContainer}>
              {hallOfFame.slice(0, 3).map((player, index) => (
                <View 
                  key={player.studentID || index} 
                  style={[
                    styles.topThreeCard,
                    { borderColor: getMedalColor(player.rank) }
                  ]}
                >
                  <View style={[styles.rankBadge, { backgroundColor: getMedalColor(player.rank) + '20' }]}>
                    <Text style={styles.rankIcon}>{getMedalIcon(player.rank)}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerFaculty}>{player.faculty}</Text>
                    <Text style={styles.playerPoints}>Weekly: {player.weeklyPoints || 0} RP</Text>
                    <Text style={styles.totalPoints}>Total: {player.totalPoints || 0} RP</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Weekly Leaderboard List */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>📊 Weekly Leaderboard</Text>
            {showFallbackWarning && (
              <View style={styles.fallbackWarning}>
                <Text style={styles.fallbackWarningText}>⚠️ Using fallback data</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>Rankings based on this week's activity</Text>
          
          {weeklyData.length > 0 ? (
            weeklyData.map((item, index) => (
              <View 
                key={item.studentID || index} 
                style={[
                  styles.leaderboardRow,
                  item.isCurrentUser && styles.currentUserRow
                ]}
              >
                <View style={styles.rankContainer}>
                  <Text style={getRankTextStyle(item.rank)}>
                    {item.rank <= 3 ? getMedalIcon(item.rank) : `#${item.rank}`}
                  </Text>
                </View>
                
                <View style={styles.userInfoContainer}>
                  <Text style={[
                    styles.userName,
                    item.isCurrentUser && styles.currentUserName
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={styles.userFaculty}>{item.faculty}</Text>
                  {item.isCurrentUser && (
                    <Text style={styles.youLabel}>(That's you!)</Text>
                  )}
                </View>
                
                <View style={styles.pointsContainer}>
                  <Text style={styles.pointsValue}>{item.weeklyPoints || 0}</Text>
                  <Text style={styles.pointsLabel}>RP</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📊</Text>
              <Text style={styles.emptyStateTitle}>No Leaderboard Data</Text>
              <Text style={styles.emptyStateText}>
                Leaderboard data will appear once students start earning points this week.
              </Text>
            </View>
          )}
        </View>
        
        {/* Your Conversion Status */}
        <View style={styles.conversionSection}>
          <Text style={styles.sectionTitle}>💎 Your Conversion Status</Text>
          
          <View style={styles.conversionCard}>
            <View style={styles.conversionInfo}>
              <View style={styles.pointsDisplay}>
                <Text style={styles.availablePoints}>
                  {conversionInfo.totalPoints}
                </Text>
                <Text style={styles.pointsLabelLarge}>Total Reward Points</Text>
                <View style={styles.meritPointsContainer}>
                  <Text style={styles.meritPointsLabel}>Merit Points:</Text>
                  <Text style={styles.meritPointsValue}>
                    {userStats?.totalMerits?.toFixed(2) || '0.00'} MP
                  </Text>
                </View>
              </View>
              
              <View style={styles.conversionRate}>
                <Text style={styles.rateText}>
                  {conversionRate} RP = 1 Merit Point
                </Text>
                <Text style={styles.minConversionText}>
                  Min: {conversionRate} RP per conversion
                </Text>
                {!conversionInfo.canConvert && (
                  <Text style={styles.needMoreText}>
                    Need {conversionInfo.neededPoints} more points
                  </Text>
                )}
              </View>
            </View>
            
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity 
                style={[
                  styles.convertButton,
                  !conversionInfo.canConvert && styles.disabledButton
                ]}
                onPress={handleConvertToMerit}
                disabled={!conversionInfo.canConvert}
              >
                <Text style={styles.convertButtonText}>
                  {conversionInfo.canConvert 
                    ? 'Convert to Merit Points' 
                    : `Need ${conversionRate} points`}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats?.weeklyPoints || 0}</Text>
                <Text style={styles.statLabel}>Weekly Points</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>#{userStats?.rank || '--'}</Text>
                <Text style={styles.statLabel}>Your Rank</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats?.totalMerits?.toFixed(1) || '0.0'}</Text>
                <Text style={styles.statLabel}>Merit Points</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How to Earn Points</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>♻️</Text>
            <Text style={styles.infoText}>Recycle materials using the app</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoText}>Participate in campus events</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🏆</Text>
            <Text style={styles.infoText}>Complete recycling challenges</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>💎</Text>
            <Text style={styles.infoText}>Convert points to merit points</Text>
          </View>
        </View>
      </ScrollView>
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
  headerCard: {
    backgroundColor: '#2E7D32',
    padding: 24,
    paddingTop: 32,
    marginBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8F5E8',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'System',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  timerLabel: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 6,
    fontFamily: 'System',
  },
  timer: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    fontFamily: 'System',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fallbackWarning: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  fallbackWarningText: {
    fontSize: 12,
    color: '#856404',
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    fontFamily: 'System',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'System',
  },
  topThreeContainer: {
    marginTop: 8,
  },
  topThreeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankIcon: {
    fontSize: 28,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    fontFamily: 'System',
  },
  playerFaculty: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontFamily: 'System',
  },
  playerPoints: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    fontFamily: 'System',
  },
  totalPoints: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontFamily: 'System',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  currentUserRow: {
    backgroundColor: '#E8F5E8',
    borderRadius: 10,
    marginVertical: 2,
    borderBottomWidth: 0,
  },
  rankContainer: {
    width: 48,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'System',
  },
  topRankText: {
    fontSize: 24,
    fontFamily: 'System',
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    fontFamily: 'System',
  },
  currentUserName: {
    fontWeight: 'bold',
    color: '#2E7D32',
    fontFamily: 'System',
  },
  userFaculty: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontFamily: 'System',
  },
  youLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 2,
    fontFamily: 'System',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 4,
    fontFamily: 'System',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System',
  },
  conversionSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conversionCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
  },
  conversionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pointsDisplay: {
    alignItems: 'flex-start',
    flex: 1,
  },
  availablePoints: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2196F3',
    fontFamily: 'System',
  },
  pointsLabelLarge: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: 'System',
  },
  meritPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  meritPointsLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    fontFamily: 'System',
  },
  meritPointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'System',
  },
  conversionRate: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 140,
  },
  rateText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'System',
  },
  minConversionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'System',
  },
  needMoreText: {
    fontSize: 11,
    color: '#F44336',
    fontStyle: 'italic',
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
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
    fontFamily: 'System',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 32,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'System',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    fontFamily: 'System',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    fontFamily: 'System',
  },
});

export default LeaderboardScreen;