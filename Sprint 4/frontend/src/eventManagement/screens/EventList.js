import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { getEvents, deleteEvent } from '../services/api';

export default function EventList({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load events from backend
  // In EventList.js, replace the loadEvents function:
const loadEvents = async () => {
  try {
    setLoading(true);
    const eventsData = await getEvents();
    
    // Format image URLs properly
    const mappedEvents = eventsData.map(event => ({
      ...event,
      // Format the image URL - convert relative path to absolute URL
      eventImageURL: formatImageUrl(event.eventImageURL)
    }));
    
    console.log('📊 Loaded events:', mappedEvents.length);
    setEvents(mappedEvents);
  } catch (error) {
    console.error('❌ Error loading events:', error);
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

// Add this helper function
const formatImageUrl = (url) => {
  if (!url || url === null || url === 'null') {
    console.log('🖼️ No image URL provided');
    return 'https://via.placeholder.com/400x200?text=No+Image';
  }
  
  console.log('🖼️ Original URL:', url);
  
  // If it's already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a relative path starting with /uploads
  if (url.startsWith('/uploads')) {
    const fullUrl = `http://10.0.2.2:3000${url}`;
    console.log('🖼️ Converted to:', fullUrl);
    return fullUrl;
  }
  
  // If it's just a filename
  const fullUrl = `http://10.0.2.2:3000/uploads/${url}`;
  console.log('🖼️ Converted to:', fullUrl);
  return fullUrl;
};

  useEffect(() => {
    loadEvents();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const confirmDelete = async (eventID) => {
    try {
      setLoading(true);
      await deleteEvent(eventID);
      Alert.alert('Success', 'Event deleted successfully');
      loadEvents();
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleEditEvent = (event) => navigation.navigate('EditEvent', { event });

  const handleDeleteEvent = (event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.eventTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(event.eventID) }
      ]
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // // Normalize image URL to handle external and local paths
  // const normalizeImageURL = (url) => {
  //   if (!url) return null;
  //   if (url.startsWith('http')) return url; // external URL
  //   // local upload URL (React Native Android emulator)
  //   return `http://10.0.2.2:3000${url}`;
  // };
  

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Event Management</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('EventForm')}>
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events found</Text>
            <Text style={styles.emptySubtext}>Create your first event to get started</Text>
            <TouchableOpacity style={styles.emptyCreateButton} onPress={() => navigation.navigate('EventForm')}>
              <Text style={styles.emptyCreateButtonText}>Create First Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map(event => (
            <View key={event.eventID} style={styles.eventCard}>
              {/* Event Image */}
              <Image
                source={{ uri: event.eventImageURL || 'https://via.placeholder.com/400x200?text=No+Image' }}
                style={styles.eventImage}
                resizeMode="cover"
              />

              <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                  <Text style={styles.eventTitle}>{event.eventTitle}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(event.status) }]}>
                    <Text style={styles.statusText}>{event.status || 'Upcoming'}</Text>
                  </View>
                </View>

                <Text style={styles.eventDescription}>{event.eventDescription || 'No description provided'}</Text>

                <View style={styles.eventDetails}>
                  <DetailRow label="Category" value={event.eventCategory || 'General'} />
                  <DetailRow label="Start Date" value={formatDate(event.eventStartDate)} />
                  <DetailRow label="End Date" value={formatDate(event.eventEndDate)} />
                  <DetailRow label="Reward Points" value={event.rewardPoints || 0} />
                  <DetailRow label="UTM Points" value={event.UTMMeritPoints || 0} />
                  <DetailRow label="Created by" value={event.adminName || 'Admin'} />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.button, styles.editButton]} onPress={() => handleEditEvent(event)}>
                    <Text style={styles.buttonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={() => handleDeleteEvent(event)}>
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// Helper components
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'upcoming': return '#FFA000';
    case 'ongoing': return '#4CAF50';
    case 'completed': return '#2196F3';
    default: return '#666';
  }
};

// Styles (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E8' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E8' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, backgroundColor: '#E8F5E8' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
  createButton: { backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  createButtonText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, paddingHorizontal: 20 },
  emptyText: { fontSize: 18, color: '#666', marginBottom: 10, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 },
  emptyCreateButton: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  emptyCreateButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  eventCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3, overflow: 'hidden' },
  eventImage: { width: '100%', height: 160 },
  eventContent: { padding: 16 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  eventTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  statusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  eventDescription: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  eventDetails: { marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, paddingVertical: 2 },
  detailLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  detailValue: { fontSize: 13, color: '#333', fontWeight: '400' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  button: { flex: 1, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  editButton: { backgroundColor: '#2196F3' },
  deleteButton: { backgroundColor: '#f44336' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
