import React, { useEffect, useState } from 'react';
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
  TouchableOpacity
} from 'react-native';
import axios from 'axios';

export default function EventListScreen({ route }) {
  const { user } = route.params;
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState([]);

  // Fetch events and categories
  const fetchEvents = async () => {
    try {
      const res = await axios.get('http://10.0.2.2:3000/events');
      setEvents(res.data);

      const uniqueCats = Array.from(new Set(res.data.map(e => e.eventCategory)));
      setCategories(['All', ...uniqueCats]);
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch events');
    }
  };

  // Fetch student registrations
  const fetchRegistrations = async () => {
    try {
      const res = await axios.get(
        `http://10.0.2.2:3000/participation/student/${user.id}`
      );
      setRegistrations(res.data.map(r => r.eventID));
    } catch (err) {
      Alert.alert('Error', 'Failed to fetch your registrations');
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchRegistrations();
  }, []);

  // Confirm and register
  const handleRegister = (eventID) => {
    Alert.alert(
      'Confirm Registration',
      'Are you sure you want to register for this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: async () => {
            try {
              await axios.post('http://10.0.2.2:3000/participation/register', {
                studentID: user.id,
                eventID
              });
              Alert.alert('Success', 'Registration Successful');
              setRegistrations(prev => [...prev, eventID]);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Registration failed');
            }
          } 
        }
      ]
    );
  };

  // Confirm and cancel registration
  const handleCancel = (eventID) => {
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel your registration?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: async () => {
            try {
              await axios.post('http://10.0.2.2:3000/participation/cancel', {
                studentID: user.id,
                eventID
              });
              Alert.alert('Success', 'Registration Cancelled');
              setRegistrations(prev => prev.filter(id => id !== eventID));
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || 'Cancel failed');
            }
          } 
        }
      ]
    );
  };

  // Filter events by category
  const filteredEvents =
    selectedCategory === 'All'
      ? events
      : events.filter(e => e.eventCategory === selectedCategory);

  const renderItem = ({ item }) => {
    const isRegistered = registrations.includes(item.eventID);
    const start = new Date(item.eventStartDate);
    const end = new Date(item.eventEndDate);
    const today = new Date();

    const formatDate = (date) => {
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return date.toLocaleDateString(undefined, options);
    };

    const diffStart = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    const diffEnd = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    const countdown =
      diffStart > 0
        ? `Starts in ${diffStart} day${diffStart > 1 ? 's' : ''}`
        : diffEnd > 0
        ? `Ends in ${diffEnd} day${diffEnd > 1 ? 's' : ''}`
        : 'Event Completed';

    const displayDate = `${formatDate(start)} - ${formatDate(end)}`;

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
          {isRegistered && <Text style={styles.registeredBadge}>Registered</Text>}
        </View>

        <Text style={styles.text}>{item.eventDescription}</Text>
        <Text style={styles.text}>Category: {item.eventCategory}</Text>
        <Text style={styles.text}>Date: {displayDate}</Text>
        <Text style={styles.countdown}>{countdown}</Text>
        <Text style={styles.text}>
          Reward Points: {item.rewardPoints} | Merit Points: {item.UTMMeritPoints}
        </Text>

        {isRegistered ? (
          <Button
            title="Cancel Registration"
            onPress={() => handleCancel(item.eventID)}
            color="#f44336"
          />
        ) : (
          <Button
            title="Register"
            onPress={() => handleRegister(item.eventID)}
            color="#4CAF50"
          />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={{ alignItems: 'center' }}
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

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.eventID.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        ListEmptyComponent={
          <Text style={styles.noEvent}>No events found</Text>
        }
        showsVerticalScrollIndicator={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    paddingBottom: 100,
  },

  filterContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    maxHeight: 50,
  },

  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ddd',
    marginRight: 10,
    justifyContent: 'center',
    height: 35,
  },

  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },

  filterButtonText: {
    color: '#000',
  },

  filterButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },

  eventCard: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 6,
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },

  eventImage: {
    width: '100%',
    height: 150,
    borderRadius: 6,
    marginBottom: 10,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },

  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },

  registeredBadge: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    marginLeft: 10,
  },

  text: {
    fontSize: 16,
    color: '#000',
    marginBottom: 3,
  },

  countdown: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    fontStyle: 'italic',
  },

  noEvent: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#555',
  },
});