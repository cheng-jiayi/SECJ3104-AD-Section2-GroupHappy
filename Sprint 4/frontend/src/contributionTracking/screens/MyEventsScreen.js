import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

export default function MyEventsScreen({ route, navigation }) {
  const { user } = route.params;

  // 🔑 FIXED: 使用与 EventListScreen 相同的逻辑获取 studentID
  const getStudentID = () => {
    // 按优先级获取 studentID
    const id = user?.studentID || user?.matricNo || user?.utmID || user?.username || user?.id;
    console.log('🔍 MyEventsScreen - User fields:', {
      studentID: user?.studentID,
      matricNo: user?.matricNo,
      utmID: user?.utmID,
      username: user?.username,
      id: user?.id,
      fullName: user?.fullName,
      role: user?.role
    });
    console.log('✅ MyEventsScreen - Selected studentID:', id);
    return id ? String(id) : null;
  };

  const studentID = getStudentID();

  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [categories, setCategories] = useState(['All', 'Registered', 'Completed']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPointsMap, setCurrentPointsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ================== FETCH DATA ==================
  const fetchData = async () => {
    if (!studentID) {
      Alert.alert('Error', 'Student ID not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`📡 Fetching data for studentID: ${studentID}`);

      // 并行获取事件和注册信息
      const [eventsRes, regRes] = await Promise.all([
        axios.get('http://10.0.2.2:3000/events', { timeout: 10000 }),
        axios.get(`http://10.0.2.2:3000/participation/student/${studentID}`, { timeout: 10000 })
      ]);

      console.log(`✅ Loaded ${eventsRes.data.length} events`);
      console.log(`✅ Loaded ${regRes.data.length} registrations`);

      setEvents(eventsRes.data);

      // 创建注册状态映射
      const regMap = {};
      regRes.data.forEach(r => {
        if (r && r.eventID !== undefined) {
          regMap[String(r.eventID)] = r.participationStatus || 'Registered';
        }
      });
      
      console.log('🗺️ Registration map:', regMap);
      setRegistrations(regMap);

      // 获取每个事件的当前积分
      const pointsMap = {};
      for (const eventID of Object.keys(regMap)) {
        try {
          const res = await axios.get(
            `http://10.0.2.2:3000/participation/points/${studentID}/${eventID}`,
            { timeout: 5000 }
          );
          pointsMap[eventID] = Number(res.data.currentPoints) || 0;
          console.log(`📊 Event ${eventID}: ${pointsMap[eventID]} points`);
        } catch (error) {
          console.warn(`⚠️ Failed to fetch points for event ${eventID}:`, error.message);
          pointsMap[eventID] = 0;
        }
      }
      setCurrentPointsMap(pointsMap);

    } catch (err) {
      console.error('❌ Fetch data error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      if (err.response?.status === 404) {
        Alert.alert('No Registrations', 'You are not registered for any events yet.');
      } else {
        Alert.alert('Error', 'Failed to fetch your events');
      }
      
      // 设置空数据
      setEvents([]);
      setRegistrations({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ================== SCREEN FOCUS ==================
  // In the screen focus effect, check for refresh flag
  useFocusEffect(
      useCallback(() => {
          console.log('🔄 MyEventsScreen focused');
          
          // Check if we should refresh (coming from SmartScanner)
          const shouldRefresh = route.params?.shouldRefresh;
          
          if (shouldRefresh) {
              console.log('🔄 Refreshing data after contribution');
              fetchData();
              // Clear the flag
              navigation.setParams({ shouldRefresh: false });
          } else {
              fetchData();
          }
          
          return () => {
              console.log('👋 MyEventsScreen unfocused');
          };
      }, [studentID, route.params?.shouldRefresh])
  );

  // Also update the navigation to SmartScanner to include event data
  <TouchableOpacity
      style={styles.contributionButton}
        onPress={() => navigation.navigate('AddContribution', { 
      user: { ...user, studentID }, 
      event: item 
  })}
  >
      <Text style={styles.buttonText}>Add Contribution</Text>
  </TouchableOpacity>

  // ================== MANUAL REFRESH ==================
  const handleRefresh = async () => {
    console.log('🔁 Manual refresh');
    setRefreshing(true);
    await fetchData();
  };

  // ================== FILTER EVENTS ==================
  const filteredEvents = events.filter(event => {
    if (!event || !event.eventID) return false;
    
    const eventKey = String(event.eventID);
    const status = registrations[eventKey];
    
    if (!status) return false;
    
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Registered') return status === 'Registered';
    if (selectedCategory === 'Completed') return status === 'Completed';
    
    return false;
  });

// ================== COMPLETE EVENT ==================
const handleCompleteEvent = async (event) => {
  if (!event || !event.eventID) {
    Alert.alert('Error', 'Invalid event data');
    return;
  }

  // Use the already computed studentID instead of calling getStudentID() again
  if (!studentID) {
    Alert.alert('Error', 'Student ID not found. Please log in again.');
    return;
  }

  const eventKey = String(event.eventID);
  const currentPoints = currentPointsMap[eventKey] || 0;
  const requiredPoints = event.rewardPoints || 0;

  console.log('🔍 Complete Event - Details:', {
    studentID: studentID,
    eventID: event.eventID,
    eventTitle: event.eventTitle,
    currentPoints,
    requiredPoints,
    hasEnoughPoints: currentPoints >= requiredPoints
  });

  // First check if points are met
  if (currentPoints < requiredPoints) {
    Alert.alert(
      'Not Enough Points',
      `You need ${requiredPoints - currentPoints} more points to complete this event.\n\n` +
      `Current: ${currentPoints}\n` +
      `Required: ${requiredPoints}`
    );
    return;
  }

  // Optional: Check diagnostic endpoint first
  try {
    const diagnostic = await axios.get(
      `http://10.0.2.2:3000/debug/constraint/${studentID}/${event.eventID}`
    );
    console.log('🔍 Diagnostic check:', diagnostic.data);
  } catch (diagError) {
    console.log('⚠️ Diagnostic check failed:', diagError.message);
  }

  Alert.alert(
    'Complete Event',
    `Are you sure you want to complete "${event.eventTitle}"?\n\n` +
    `✓ Points: ${currentPoints} / ${requiredPoints} (Met!)\n` +
    `✓ Merit Points to earn: ${event.UTMMeritPoints || 0}`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete Event',
        onPress: async () => {
          try {
            console.log('🚀 Sending completion request...', {
              studentID: studentID,
              eventID: event.eventID
            });
            
            // Try the regular endpoint first
            const response = await axios.post('http://10.0.2.2:3000/participation/complete', {
              studentID: studentID,
              eventID: event.eventID
            }, {
              timeout: 10000,
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log('✅ Completion response:', response.data);
            
            Alert.alert(
              'Success! 🎉', 
              response.data.message,
              [
                { 
                  text: 'OK', 
                  onPress: () => {
                    // Refresh data to show updated points
                    fetchData();
                    
                    // Navigate back to dashboard to see updated merit points
                    if (response.data.newTotalMerits !== undefined) {
                      // You can optionally show a more detailed alert
                      Alert.alert(
                        'Merit Points Updated',
                        `You now have:\n• ${response.data.newTotalPoints} reward points\n• ${response.data.newTotalMerits} merit points`,
                        [{ text: 'OK' }]
                      );
                    }
                  }
                }
              ]
            );
            
            // Refresh data immediately
            await fetchData();
            
          } catch (error) {
            console.error('❌ Complete event error:', {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              requestData: {
                studentID: studentID,
                eventID: event.eventID
              }
            });
            
            let errorMessage = 'Failed to complete event';
            let errorDetails = '';
            
            if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
              if (error.response.data.debug) {
                errorDetails = `\n\nDebug: ${JSON.stringify(error.response.data.debug)}`;
              }
            } else if (error.message.includes('Network Error')) {
              errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message.includes('timeout')) {
              errorMessage = 'Request timeout. Please try again.';
            }
            
            // If regular endpoint fails, try workaround
            if (error.response?.status === 400) {
              Alert.alert(
                'Constraint Issue',
                `${errorMessage}\n\nWould you like to try the workaround method?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Try Workaround',
                    onPress: async () => {
                      try {
                        const workaroundResponse = await axios.post('http://10.0.2.2:3000/participation/complete-workaround', {
                          studentID: studentID,
                          eventID: event.eventID
                        });
                        
                        Alert.alert(
                          'Workaround Success',
                          workaroundResponse.data.message
                        );
                        await fetchData();
                      } catch (workaroundError) {
                        Alert.alert('Workaround Failed', workaroundError.response?.data?.message || workaroundError.message);
                      }
                    }
                  }
                ]
              );
            } else {
              Alert.alert('Error', errorMessage + errorDetails);
            }
          }
        }
      }
    ]
  );
};

  // ================== RENDER ITEM ==================
  const renderItem = ({ item }) => {
    if (!item || !item.eventID) return null;
    
    const eventKey = String(item.eventID);
    const status = registrations[eventKey] || 'Registered';
    const currentPoints = currentPointsMap[eventKey] || 0;
    const isCompleted = status === 'Completed';
    const isRegistered = status === 'Registered';
    
    console.log(`🎨 Rendering event ${eventKey}: status=${status}, points=${currentPoints}`);

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return 'TBD';
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    };
    
    const displayDate = item.eventStartDate && item.eventEndDate 
      ? `${formatDate(item.eventStartDate)} - ${formatDate(item.eventEndDate)}`
      : 'Date not set';

    return (
      <View style={[
        styles.eventCard, 
        isCompleted ? styles.completedCard : styles.registeredCard
      ]}>
        {item.eventImageURL && (
          <Image 
            source={{ uri: item.eventImageURL }} 
            style={styles.eventImage} 
            resizeMode="cover"
          />
        )}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.eventTitle}</Text>
          <View style={styles.statusContainer}>
            <View 
              style={[
                styles.statusDot,
                isCompleted ? styles.statusDotCompleted : styles.statusDotRegistered
              ]} 
            />
            <Text style={[
              styles.statusBadge, 
              isCompleted ? styles.completedBadge : styles.registeredBadge
            ]}>
              {isCompleted ? 'Completed' : 'Registered'}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>{item.eventDescription}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Category:</Text>
          <Text style={styles.value}>{item.eventCategory || 'General'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{displayDate}</Text>
        </View>
        
        <View style={styles.pointsContainer}>
          <View style={styles.pointsItem}>
            <Text style={styles.pointsLabel}>Required Points:</Text>
            <Text style={styles.pointsValue}>{item.rewardPoints || 0}</Text>
          </View>
          <View style={styles.pointsItem}>
            <Text style={styles.pointsLabel}>Current Points:</Text>
            <Text style={[
              styles.pointsValue,
              currentPoints >= (item.rewardPoints || 0) ? styles.pointsMet : styles.pointsNotMet
            ]}>
              {currentPoints}
            </Text>
          </View>
          <View style={styles.pointsItem}>
            <Text style={styles.pointsLabel}>Merit Points:</Text>
            <Text style={styles.pointsValue}>{item.UTMMeritPoints || 0}</Text>
          </View>
        </View>

        {/* 进度条 */}
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar,
              { 
                width: `${Math.min(100, (currentPoints / (item.rewardPoints || 1)) * 100)}%`,
                backgroundColor: currentPoints >= (item.rewardPoints || 0) ? '#4CAF50' : '#FF9800'
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          Progress: {currentPoints} / {item.rewardPoints || 0} points
        </Text>

        {/* 按钮 */}
        <View style={styles.buttonContainer}>
          {isRegistered && (
            <TouchableOpacity
              style={styles.contributionButton}
              onPress={() => navigation.navigate('AddContributionScreen', { 
                user: { ...user, studentID }, 
                event: item 
              })}
            >
              <Text style={styles.buttonText}>Add Contribution</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.progressButton}
            onPress={() => {
              const progress = (currentPoints / (item.rewardPoints || 1)) * 100;
              Alert.alert(
                'Progress Details',
                `Points: ${currentPoints} / ${item.rewardPoints || 0}\n` +
                `Progress: ${progress.toFixed(1)}%\n` +
                `Merit Points: ${item.UTMMeritPoints || 0}\n` +
                `Status: ${status}`,
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.buttonText}>View Progress</Text>
          </TouchableOpacity>
          
          {isRegistered && currentPoints >= (item.rewardPoints || 0) && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteEvent(item)}
            >
              <Text style={styles.buttonText}>Complete Event</Text>
            </TouchableOpacity>
          )}
          
          {isRegistered && currentPoints < (item.rewardPoints || 0) && (
            <Text style={styles.needMoreText}>
              Need {item.rewardPoints - currentPoints} more points to complete
            </Text>
          )}
        </View>
      </View>
    );
  };

  // ================== LOADING STATE ==================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your events...</Text>
      </SafeAreaView>
    );
  }

  // ================== MAIN UI ==================
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Events</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshText}>⟳ Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Total Events: {events.length} | 
          Registered: {Object.values(registrations).filter(s => s === 'Registered').length} |
          Completed: {Object.values(registrations).filter(s => s === 'Completed').length}
        </Text>
      </View>

      {/* Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.filterButton,
              selectedCategory === cat && styles.filterButtonActive
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === cat && styles.filterButtonTextActive
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={item => `my-event-${item.eventID}`}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Events Found</Text>
            <Text style={styles.emptyText}>
              {selectedCategory === 'All' 
                ? "You haven't registered for any events yet."
                : `You don't have any ${selectedCategory.toLowerCase()} events.`}
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('EventListScreen', { user })}
            >
              <Text style={styles.emptyButtonText}>Browse Events</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ================== STYLES ==================
const styles = StyleSheet.create({
  container: { 
    padding: 16,
    paddingBottom: 100 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  refreshText: {
    color: 'white',
    fontWeight: '600',
  },

  // Stats
  statsBar: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    alignItems: 'center',
  },
  statsText: {
    color: '#1976d2',
    fontWeight: '600',
    fontSize: 14,
  },

  // Filter
  filterContainer: {
    paddingVertical: 10,
    maxHeight: 50,
    backgroundColor: '#f5f5f5',
  },
  filterContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ddd',
    marginRight: 10,
    height: 36,
    justifyContent: 'center'
  },
  filterButtonActive: { 
    backgroundColor: '#4CAF50' 
  },
  filterButtonText: { 
    color: '#000',
    fontSize: 14,
  },
  filterButtonTextActive: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },

  // Event Card
  eventCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registeredCard: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  completedCard: {
    backgroundColor: '#D9EAF3',
    borderColor: '#2196F3',
  },
  eventImage: { 
    width: '100%', 
    height: 150, 
    borderRadius: 6,
    marginBottom: 12 
  },

  // Title Row
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    flex: 1,
    color: '#333'
  },
  
  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotRegistered: {
    backgroundColor: '#4CAF50',
  },
  statusDotCompleted: {
    backgroundColor: '#2196F3',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center'
  },
  registeredBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
  },
  completedBadge: {
    backgroundColor: '#2196F3',
    color: '#fff',
  },

  // Description
  description: { 
    fontSize: 14, 
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
    width: 80,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },

  // Points Container
  pointsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 12,
  },
  pointsItem: {
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pointsMet: {
    color: '#4CAF50',
  },
  pointsNotMet: {
    color: '#FF9800',
  },

  // Progress Bar
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },

  // Button Container
  buttonContainer: {
    marginTop: 12,
  },
  contributionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  progressButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#f57c00',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  needMoreText: {
    textAlign: 'center',
    color: '#f44336',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});