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

export default function EventListScreen({ route }) {
  const { user } = route.params;

  // 🔑 FIXED: 优先使用studentID，然后matricNo，确保是字符串
  const getStudentID = () => {
    // 按优先级获取studentID
    const id = user?.studentID || user?.matricNo || user?.utmID || user?.username;
    console.log('🔍 Available user fields:', {
      studentID: user?.studentID,
      matricNo: user?.matricNo,
      utmID: user?.utmID,
      username: user?.username,
      fullName: user?.fullName,
      role: user?.role
    });
    console.log('✅ Selected studentID:', id);
    return id ? String(id) : null; // 确保返回字符串
  };

  const studentID = getStudentID();

  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ================== TEST CONNECTION ==================
  const testConnection = async () => {
    try {
      const response = await axios.get('http://10.0.2.2:3000/health', { timeout: 5000 });
      console.log('✅ Server connection OK:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Server connection failed:', error.message);
      Alert.alert('Connection Error', 'Cannot connect to server. Please make sure server is running.');
      return false;
    }
  };

  // ================== FETCH EVENTS ==================
  const fetchEvents = async () => {
    try {
      console.log('📡 Fetching events...');
      const response = await axios.get('http://10.0.2.2:3000/events', { timeout: 10000 });
      
      console.log(`✅ Loaded ${response.data.length} events`);
      setEvents(response.data);

      // Extract unique categories
      const uniqueCats = Array.from(
        new Set(response.data.map(e => e.eventCategory))
      ).filter(cat => cat && cat.trim() !== '');
      
      setCategories(['All', ...uniqueCats]);
      
    } catch (error) {
      console.error('❌ Error fetching events:', error.message);
      Alert.alert('Error', 'Failed to load events');
    }
  };

  // ================== FETCH REGISTRATIONS ==================
  const fetchRegistrations = async () => {
    console.log('🔄 START fetchRegistrations');
    
    if (!studentID) {
      console.error('❌ No studentID available');
      Alert.alert('Error', 'Student ID not found');
      return;
    }

    try {
      const url = `http://10.0.2.2:3000/participation/student/${studentID}`;
      console.log(`📡 Fetching from: ${url}`);
      
      const response = await axios.get(url, { timeout: 10000 });
      
      console.log('📊 Raw response:', response.data);
      console.log('Is array?', Array.isArray(response.data));
      
      let registrationsArray = [];
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        registrationsArray = response.data;
      } else if (response.data && Array.isArray(response.data.registrations)) {
        registrationsArray = response.data.registrations;
      } else if (response.data && typeof response.data === 'object') {
        // Convert object values to array
        registrationsArray = Object.values(response.data);
      }
      
      console.log(`📋 Processing ${registrationsArray.length} registrations`);
      
      // Create new registration map
      const newRegMap = {};
      let registeredCount = 0;
      
      registrationsArray.forEach((item, index) => {
        if (item && item.eventID !== undefined) {
          // Convert eventID to string for consistent key comparison
          const eventKey = String(item.eventID);
          const status = item.participationStatus || 'Registered';
          
          newRegMap[eventKey] = status;
          
          if (status === 'Registered') {
            registeredCount++;
          }
          
          console.log(`  ${index + 1}. Event ${eventKey}: ${status}`);
        }
      });
      
      console.log(`✅ Created registration map with ${Object.keys(newRegMap).length} entries`);
      console.log(`   Registered events: ${registeredCount}`);
      console.log('🗺️ Registration map keys:', Object.keys(newRegMap));
      
      // Force state update
      setRegistrations(newRegMap);
      
    } catch (error) {
      console.error('❌ Error fetching registrations:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Set empty map on error
      setRegistrations({});
    }
    
    console.log('🏁 END fetchRegistrations');
  };

  // ================== SCREEN FOCUS REFRESH ==================
  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadData = async () => {
        try {
          setLoading(true);
          
          // Test connection first
          const isConnected = await testConnection();
          if (!isConnected) {
            setLoading(false);
            return;
          }
          
          // Load data in parallel
          await Promise.all([
            fetchEvents(),
            fetchRegistrations()
          ]);
          
          console.log('✅ All data loaded successfully');
          
        } catch (error) {
          console.error('❌ Error loading data:', error);
        } finally {
          if (mounted) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      };

      loadData();

      return () => {
        mounted = false;
      };
    }, [studentID])
  );

  // ================== REGISTER FOR EVENT ==================
  const handleRegister = (eventID) => {
    console.log(`🔵 Register button clicked for event: ${eventID}`);
    console.log(`Current local status: ${registrations[eventID] || 'Not Registered'}`);
    
    Alert.alert(
      'Confirm Registration',
      'Are you sure you want to register for this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Immediately update local state
              console.log(`🔄 Updating local state to Registered for event ${eventID}`);
              setRegistrations(prev => ({
                ...prev,
                [eventID]: 'Registered'
              }));
              
              // Send to server
              const payload = {
                studentID: String(studentID),
                eventID: Number(eventID)
              };
              
              console.log('📤 Sending to server:', payload);
              
              const response = await axios.post(
                'http://10.0.2.2:3000/participation/register',
                payload,
                { timeout: 10000 }
              );
              
              console.log('✅ Server response:', response.data);
              
              // Re-fetch to sync with server
              await fetchRegistrations();
              
              Alert.alert('Success', 'Registration successful!');
              
            } catch (error) {
              console.error('❌ Registration error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
              });
              
              if (error.response?.data?.message?.includes('Already registered')) {
                // Server says already registered, update local state
                console.log('⚠️ Server says already registered, updating local state');
                setRegistrations(prev => ({
                  ...prev,
                  [eventID]: 'Registered'
                }));
                
                Alert.alert(
                  'Already Registered',
                  'You are already registered for this event.'
                );
              } else {
                // Other error, revert local state
                console.log('🔄 Reverting local state for event', eventID);
                setRegistrations(prev => {
                  const newState = { ...prev };
                  delete newState[eventID];
                  return newState;
                });
                
                Alert.alert(
                  'Error',
                  error.response?.data?.message || 'Registration failed'
                );
              }
            }
          }
        }
      ]
    );
  };

  // ================== CANCEL REGISTRATION ==================
  const handleCancel = (eventID) => {
    console.log(`🔴 Cancel button clicked for event: ${eventID}`);
    
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel your registration?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              // Immediately update local state
              console.log(`🔄 Updating local state to Not Registered for event ${eventID}`);
              setRegistrations(prev => {
                const newState = { ...prev };
                delete newState[eventID];
                return newState;
              });
              
              // Send to server
              const payload = {
                studentID: String(studentID),
                eventID: Number(eventID)
              };
              
              console.log('📤 Sending cancel to server:', payload);
              
              const response = await axios.post(
                'http://10.0.2.2:3000/participation/cancel',
                payload,
                { timeout: 10000 }
              );
              
              console.log('✅ Server response:', response.data);
              
              // Re-fetch to sync with server
              await fetchRegistrations();
              
              Alert.alert('Success', 'Registration cancelled');
              
            } catch (error) {
              console.error('❌ Cancel error:', error.response?.data || error.message);
              
              // Revert local state on error
              setRegistrations(prev => ({
                ...prev,
                [eventID]: 'Registered'
              }));
              
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Cancel failed'
              );
            }
          }
        }
      ]
    );
  };

  // ================== FILTER EVENTS ==================
  const filteredEvents = events
    .filter(e => registrations[e.eventID] !== 'Completed')
    .filter(
      e =>
        selectedCategory === 'All' ||
        e.eventCategory === selectedCategory
    );

  // ================== RENDER ITEM ==================
  const renderItem = ({ item }) => {
    if (!item || !item.eventID) return null;

    // Use string for eventID to match registration keys
    const eventKey = String(item.eventID);
    const status = registrations[eventKey];
    const isRegistered = status === 'Registered';
    
    console.log(`🎯 Rendering event ${eventKey}: "${item.eventTitle}"`);
    console.log(`   Status: ${status || 'Not Registered'}, isRegistered: ${isRegistered}`);

    return (
      <View style={styles.eventCard}>
        {item.eventImageURL && (
          <Image
            source={{ uri: item.eventImageURL }}
            style={styles.eventImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.eventTitle}</Text>
          
          {/* Status indicator */}
          <View style={styles.statusContainer}>
            <View 
              style={[
                styles.statusDot,
                isRegistered ? styles.statusDotRegistered : styles.statusDotNotRegistered
              ]} 
            />
            {isRegistered ? (
              <Text style={styles.registeredBadge}>Registered ✓</Text>
            ) : (
              <Text style={styles.notRegisteredBadge}>Not Registered</Text>
            )}
          </View>
        </View>

        <Text style={styles.description}>{item.eventDescription}</Text>
        <Text style={styles.category}>Category: {item.eventCategory}</Text>
        <Text style={styles.points}>
          Reward Points: {item.rewardPoints} | Merit Points: {item.UTMMeritPoints}
        </Text>

        {/* Detailed status */}
        <Text style={styles.statusDetail}>
          Registration Status: {status || 'Not Registered'}
        </Text>

        {/* Button */}
        <View style={styles.buttonContainer}>
          {isRegistered ? (
            <Button
              title="Cancel Registration"
              color="#f44336"
              onPress={() => handleCancel(eventKey)}
            />
          ) : (
            <Button
              title="Register Now"
              color="#4CAF50"
              onPress={() => handleRegister(eventKey)}
            />
          )}
        </View>
      </View>
    );
  };

  // ================== MANUAL REFRESH ==================
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    setRefreshing(true);
    await Promise.all([
      fetchEvents(),
      fetchRegistrations()
    ]);
    setRefreshing(false);
  };

  // ================== LOADING STATE ==================
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </SafeAreaView>
    );
  }

  // ================== MAIN UI ==================
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Events</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshText}>⟳ Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          Events: {events.length} | 
          Registered: {Object.values(registrations).filter(s => s === 'Registered').length} |
          Filter: {selectedCategory}
        </Text>
      </View>

      {/* Category filter */}
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

      {/* Events list */}
      <FlatList
        data={filteredEvents}
        keyExtractor={item => `event-${item.eventID}`}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events found</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={handleRefresh}
            >
              <Text style={styles.emptyButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={true}
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
  headerButtons: {
    flexDirection: 'row',
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

  // Stats bar
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

  // Event card
  eventCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventImage: { 
    width: '100%', 
    height: 150, 
    borderRadius: 6,
    marginBottom: 12 
  },
  
  // Title row
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
  
  // Status container
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
  statusDotNotRegistered: {
    backgroundColor: '#FF9800',
  },
  registeredBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600'
  },
  notRegisteredBadge: {
    backgroundColor: '#FF9800',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600'
  },
  
  // Text styles
  description: { 
    fontSize: 14, 
    color: '#666',
    marginBottom: 8,
    lineHeight: 20
  },
  category: { 
    fontSize: 14, 
    color: '#2196F3',
    marginBottom: 4,
    fontWeight: '500'
  },
  points: { 
    fontSize: 14, 
    color: '#333',
    marginBottom: 8,
    fontWeight: '500'
  },
  statusDetail: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  
  // Button container
  buttonContainer: {
    marginTop: 8,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});