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
} from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';

export default function MyEventsScreen({ route, navigation }) {
  const { user } = route.params;

  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [categories, setCategories] = useState(['All', 'Registered', 'Completed']); // Status filter
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPointsMap, setCurrentPointsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [eventsRes, regRes] = await Promise.all([
        axios.get('http://10.0.2.2:3000/events'),
        axios.get(`http://10.0.2.2:3000/participation/student/${user.id}`)
      ]);

      setEvents(eventsRes.data);

      const regMap = {};
      regRes.data.forEach(r => { regMap[r.eventID] = r.participationStatus; });
      setRegistrations(regMap);

      // Fetch current points per event
      const pointsMap = {};
      for (const eventID of Object.keys(regMap)) {
        try {
          const res = await axios.get(`http://10.0.2.2:3000/participation/points/${user.id}/${eventID}`);
          pointsMap[eventID] = Number(res.data.currentPoints) || 0;
        } catch {
          pointsMap[eventID] = 0;
        }
      }
      setCurrentPointsMap(pointsMap);

    } catch (err) {
      Alert.alert('Error', 'Failed to fetch your events');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => { fetchData(); }, [])
  );

  // Filter events based on status
  const filteredEvents = events.filter(e => {
    const status = registrations[e.eventID]; // do NOT default to 'Registered'
    if (!status) return false; // skip unregistered events
    if (selectedCategory === 'All') return true;
    return status === selectedCategory;
  });

  const handleCompleteEvent = async (event) => {
    const eventID = event.eventID;

    try {
      const res = await axios.post('http://10.0.2.2:3000/participation/complete', {
        studentID: user.id,
        eventID
      });
      Alert.alert('Event Completed 🎉', `Merit Points Awarded: ${res.data.meritPointsAwarded}`);
      fetchData();
    } catch (err) {
      Alert.alert('Cannot Complete', err.response?.data?.message || 'Error completing event');
    }
  };

  const renderItem = ({ item }) => {
    const eventID = item.eventID;
    const status = registrations[eventID] || 'Registered';
    const currentPoints = currentPointsMap[eventID] ?? 0;
    const isCompleted = status === 'Completed';

    const start = new Date(item.eventStartDate);
    const end = new Date(item.eventEndDate);
    const formatDate = d =>
      d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const displayDate = `${formatDate(start)} - ${formatDate(end)}`;

    return (
      <View style={[styles.eventCard, isCompleted && styles.completedCard]}>
        {item.eventImageURL && (
          <Image source={{ uri: item.eventImageURL }} style={styles.eventImage} />
        )}

        <View style={styles.titleRow}>
          <Text style={styles.title}>{item.eventTitle}</Text>
          <Text style={[styles.statusBadge, isCompleted ? styles.completedBadge : styles.registeredBadge]}>
            {isCompleted ? 'Completed' : 'Registered'}
          </Text>
        </View>

        <Text style={styles.text}>{item.eventDescription}</Text>
        <Text style={styles.text}>Category: {item.eventCategory}</Text>
        <Text style={styles.text}>Date: {displayDate}</Text>
        <Text style={styles.text}>Required Points: {item.rewardPoints}</Text>
        <Text style={styles.text}>Current Points: {currentPoints}</Text>
        <Text style={styles.text}>Merit Points: {item.UTMMeritPoints}</Text>

        <View style={styles.buttonColumn}>
          {!isCompleted && (
            <>
              <Button
                title="Add Contribution"
                onPress={() => navigation.navigate('AddContribution', { user, event: item })}
                color="#4CAF50"
              />
              <View style={{ height: 6 }} />
            </>
          )}
          <Button
            title="View Progress"
            onPress={() =>
              Alert.alert(
                'Progress',
                `You have ${currentPoints} / ${item.rewardPoints} points.\nMerit Points: ${item.UTMMeritPoints}`
              )
            }
            color="#2196F3"
          />
          <View style={{ height: 6 }} />
          <Button
            title="Complete Event"
            onPress={() => handleCompleteEvent(item)}
            color="#f57c00"
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Loading events...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterButton, selectedCategory === cat && styles.filterButtonActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterButtonText, selectedCategory === cat && styles.filterButtonTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.eventID.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        ListEmptyComponent={<Text style={styles.noEvent}>No events for this filter</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { paddingHorizontal: 10, paddingVertical: 10, maxHeight: 50 },
  filterButton: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: '#ddd', marginRight: 10, justifyContent: 'center', height: 35 },
  filterButtonActive: { backgroundColor: '#4CAF50' },
  filterButtonText: { color: '#000' },
  filterButtonTextActive: { color: '#fff', fontWeight: 'bold' },
  eventCard: { padding: 15, marginBottom: 15, borderRadius: 6, backgroundColor: '#E8F5E8', borderColor: '#4CAF50', borderWidth: 1 },
  completedCard: { backgroundColor: '#D9EAF3' },
  eventImage: { width: '100%', height: 150, borderRadius: 6, marginBottom: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  title: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, color: '#fff', fontSize: 12, textAlign: 'center' },
  registeredBadge: { backgroundColor: '#4CAF50' },
  completedBadge: { backgroundColor: '#2196F3' },
  text: { fontSize: 15, marginBottom: 3 },
  noEvent: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#555' },
  buttonColumn: { marginTop: 10 },
});
