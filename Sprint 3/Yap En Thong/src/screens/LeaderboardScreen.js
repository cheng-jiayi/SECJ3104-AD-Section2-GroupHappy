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
  ActivityIndicator
} from 'react-native';
import { useAppContext } from '../context/AppContext';

function LeaderboardScreen({ navigation }) {
  const { 
    conversionRate, 
    userPoints,
    currentUser
  } = useAppContext();
  
  const [refreshing, setRefreshing] = useState(false);
  const [timeLeft, setTimeLeft] = useState('3 days 12:45:30');
  const [scaleAnim] = useState(new Animated.Value(1));
  const [weeklyData, setWeeklyData] = useState([]);
  const [hallOfFame, setHallOfFame] = useState([]);
  
  // Load data on mount
  useEffect(() => {
    loadData();
    startTimer();
  }, []);

  const loadData = async () => {
    try {
      // Use demo data that matches your PDF
      const demoWeeklyData = [
        { utmID: 'A23EN0001', name: 'Ahmad Ali', weeklyPoints: 450, totalPoints: 5200, rank: 1, isCurrentUser: true },
        { utmID: 'A23CS0006', name: 'Siti Sarah', weeklyPoints: 420, totalPoints: 4900, rank: 2, isCurrentUser: false },
        { utmID: 'A23CS0001', name: 'Raj Kumar', weeklyPoints: 330, totalPoints: 4500, rank: 3, isCurrentUser: false },
        { utmID: 'A23EN0004', name: 'Wei Chen', weeklyPoints: 350, totalPoints: 4200, rank: 4, isCurrentUser: false },
        { utmID: 'A23CS0002', name: 'Fatimah Zahra', weeklyPoints: 320, totalPoints: 4000, rank: 5, isCurrentUser: false },
        { utmID: 'A23CS0003', name: 'James Wilson', weeklyPoints: 295, totalPoints: 3800, rank: 6, isCurrentUser: false },
        { utmID: 'DEMOUSER', name: 'Demo User', weeklyPoints: 280, totalPoints: 3600, rank: 7, isCurrentUser: false, isDemo: true },
        { utmID: 'A23BU0001', name: 'Priya Sharma', weeklyPoints: 250, totalPoints: 3400, rank: 8, isCurrentUser: false },
        { utmID: 'A23KT0001', name: 'David Lee', weeklyPoints: 230, totalPoints: 3200, rank: 9, isCurrentUser: false },
        { utmID: 'A23SH0001', name: 'Aina Sofea', weeklyPoints: 210, totalPoints: 3000, rank: 10, isCurrentUser: false }
      ];
      
      const demoHallOfFame = [
        { utmID: 'A23EN0001', name: 'Ahmad Ali', weeklyPoints: 450, totalPoints: 5200, rank: 1 },
        { utmID: 'A23CS0006', name: 'Siti Sarah', weeklyPoints: 420, totalPoints: 4900, rank: 2 },
        { utmID: 'A23CS0001', name: 'Raj Kumar', weeklyPoints: 330, totalPoints: 4500, rank: 3 }
      ];
      
      setWeeklyData(demoWeeklyData);
      setHallOfFame(demoHallOfFame);
      
    } catch (error) {
      console.error('Error loading data:', error);
      // Use fallback demo data
      setWeeklyData(getSampleWeeklyData());
      setHallOfFame(getSampleHallOfFame());
    }
  };

  const startTimer = () => {
    // Timer simulation for UI
    const timer = setInterval(() => {
      const days = 3;
      const hours = 12;
      const minutes = 45;
      const seconds = Math.floor(Math.random() * 60);
      setTimeLeft(`${days} days ${hours}:${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(timer);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
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

    navigation.navigate('RewardPointsScreen');
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
      default: return `${rank}`;
    }
  };

  // Helper for sample data (fallback)
  const getSampleWeeklyData = () => [
    { utmID: 'A23EN0001', name: 'Ali bin Ahmad', weeklyPoints: 450, totalPoints: 5200, rank: 1, isCurrentUser: true },
    { utmID: 'A23CS0006', name: 'Fatimah Azzahra', weeklyPoints: 420, totalPoints: 4900, rank: 2, isCurrentUser: false },
    { utmID: 'A23CS0001', name: 'Raj Kumar', weeklyPoints: 380, totalPoints: 4650, rank: 3, isCurrentUser: false },
    { utmID: 'A23EN0004', name: 'Wei Chen', weeklyPoints: 350, totalPoints: 4200, rank: 4, isCurrentUser: false },
    { utmID: 'A23CS0002', name: 'Chin Mei Ling', weeklyPoints: 320, totalPoints: 4000, rank: 5, isCurrentUser: false },
    { utmID: 'A23CS0003', name: 'David Tan', weeklyPoints: 295, totalPoints: 3800, rank: 6, isCurrentUser: false },
    { utmID: 'A23EN0002', name: 'John Smith', weeklyPoints: 280, totalPoints: 3600, rank: 7, isCurrentUser: false },
    { utmID: 'A23BU0001', name: 'Siti Norhaliza', weeklyPoints: 250, totalPoints: 3400, rank: 8, isCurrentUser: false },
    { utmID: 'A23KT0001', name: 'Mei Ling', weeklyPoints: 230, totalPoints: 3200, rank: 9, isCurrentUser: false },
    { utmID: 'A23SH0001', name: 'Emily Wilson', weeklyPoints: 210, totalPoints: 3000, rank: 10, isCurrentUser: false }
  ];

  const getSampleHallOfFame = () => [
    { utmID: 'A23EN0001', name: 'Ali bin Ahmad', weeklyPoints: 450, totalPoints: 5200, rank: 1 },
    { utmID: 'A23CS0006', name: 'Fatimah Azzahra', weeklyPoints: 420, totalPoints: 4900, rank: 2 },
    { utmID: 'A23CS0001', name: 'Raj Kumar', weeklyPoints: 380, totalPoints: 4650, rank: 3 }
  ];

  if (refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Refreshing...</Text>
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
        {/* Weekly Rankings Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Weekly Rankings</Text>
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Resets in:</Text>
            <Text style={styles.timer}>{timeLeft}</Text>
          </View>
        </View>
        
        {/* Hall of Fame - Top 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 Hall of Fame</Text>
          <Text style={styles.sectionSubtitle}>All-Time Top Scorers</Text>
          
          <View style={styles.topThreeContainer}>
            {(hallOfFame.length > 0 ? hallOfFame : getSampleHallOfFame()).map((player) => (
              <View 
                key={player.utmID} 
                style={[
                  styles.topThreeCard,
                  { borderColor: getMedalColor(player.rank) }
                ]}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankIcon}>{getMedalIcon(player.rank)}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.pointsText}>Weekly: {player.weeklyPoints} RP</Text>
                  <Text style={styles.totalPointsText}>Total: {player.totalPoints} RP</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* Weekly Leaderboard List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Weekly Leaderboard</Text>
          
          {(weeklyData.length > 0 ? weeklyData : getSampleWeeklyData()).map((item) => (
            <View 
              key={item.utmID} 
              style={[
                styles.leaderboardRow,
                item.utmID === currentUser.utmID && styles.currentUserRow
              ]}
            >
              <View style={styles.rankContainer}>
                <Text style={[
                  styles.rankText,
                  item.rank <= 3 && styles.topRankText
                ]}>
                  {item.rank <= 3 ? getMedalIcon(item.rank) : `#${item.rank}`}
                </Text>
              </View>
              
              <View style={styles.userInfoContainer}>
                <Text style={[
                  styles.userName,
                  item.utmID === currentUser.utmID && styles.currentUserName
                ]}>
                  {item.name}
                </Text>
                {item.utmID === currentUser.utmID && (
                  <Text style={styles.youLabel}>(That's you!)</Text>
                )}
              </View>
              
              <View style={styles.pointsContainer}>
                <Text style={styles.pointsValue}>{item.weeklyPoints}</Text>
                <Text style={styles.pointsLabel}>RP</Text>
              </View>
            </View>
          ))}
        </View>
        
        {/* Your Conversion Status */}
        <View style={styles.conversionSection}>
          <Text style={styles.sectionTitle}>💎 Your Conversion Status</Text>
          
          <View style={styles.conversionCard}>
            <View style={styles.conversionInfo}>
              <View style={styles.pointsDisplay}>
                <Text style={styles.availablePoints}>
                  {userPoints}
                </Text>
                <Text style={styles.pointsLabelLarge}>Reward Points Available</Text>
              </View>
              
              <View style={styles.conversionRate}>
                <Text style={styles.rateText}>
                  {conversionRate} RP = 1 Merit Point
                </Text>
              </View>
            </View>
            
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              {userPoints >= 100 ? (
                <TouchableOpacity 
                  style={styles.convertButton}
                  onPress={handleConvertToMerit}
                >
                  <Text style={styles.convertButtonText}>Convert to Merit</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.disabledConvertButton}>
                  <Text style={styles.disabledConvertButtonText}>
                    Need 100 points to convert
                  </Text>
                </View>
              )}
            </Animated.View>
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#4CAF50',
    padding: 20,
    marginBottom: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: '#E8F5E8',
    marginBottom: 5,
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  topThreeContainer: {
    marginTop: 10,
  },
  topThreeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
  },
  rankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankIcon: {
    fontSize: 24,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  totalPointsText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  currentUserRow: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    marginVertical: 2,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  topRankText: {
    fontSize: 20,
  },
  userInfoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    fontSize: 16,
    color: '#333',
  },
  currentUserName: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  youLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 2,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 4,
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  conversionSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 20,
  },
  conversionCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 20,
    marginTop: 10,
  },
  conversionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsDisplay: {
    alignItems: 'center',
  },
  availablePoints: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  pointsLabelLarge: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  conversionRate: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rateText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
  },
  convertButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledConvertButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledConvertButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default LeaderboardScreen;