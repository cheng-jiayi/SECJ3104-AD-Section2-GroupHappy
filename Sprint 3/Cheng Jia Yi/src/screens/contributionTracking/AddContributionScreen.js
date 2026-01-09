import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Button,
  TouchableOpacity,
  Alert,
  StyleSheet
} from 'react-native';
import axios from 'axios';

export default function AddContributionScreen({ route, navigation }) {
  const { user, event } = route.params;

  const [scannedItems, setScannedItems] = useState([]);
  const [selectedBin, setSelectedBin] = useState(null);

  // Hardcoded bins
  const bins = [
    { binID: 1, name: 'Bin A', latitude: 3.123456, longitude: 101.123456 },
    { binID: 2, name: 'Bin B', latitude: 3.124000, longitude: 101.124000 },
    { binID: 3, name: 'Bin C', latitude: 3.125000, longitude: 101.125000 }
  ];

  // Points per item
  const POINTS = { Glass: 5, Metal: 8, Paper: 3, Plastic: 4, 'Non-Recyclable': 0, Tyre: 10 };

  // Add scanned item
  const handleScanItem = (type) => {
    const newItem = { id: Date.now(), type, points: POINTS[type] };
    setScannedItems(prev => [...prev, newItem]);
  };

  // Submit contribution to backend
  const handleSubmitContribution = async () => {
    if (!selectedBin) return Alert.alert('Error', 'Select a bin first');
    if (scannedItems.length === 0) return Alert.alert('Error', 'Scan at least one item');

    const totalPoints = scannedItems.reduce((sum, i) => sum + i.points, 0);

    try {
      const res = await axios.post('http://10.0.2.2:3000/contribution/add', {
        studentID: user.id,
        eventID: event.eventID,
        binID: selectedBin.binID,
        pointsEarned: totalPoints,
        itemsScanned: scannedItems
      });

      Alert.alert('Success', res.data.message);

      // Reset
      setScannedItems([]);
      setSelectedBin(null);
      navigation.goBack();
    } catch (err) {
      console.log(err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit contribution');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 15 }}>
      <ScrollView>
        <Text style={styles.title}>{event.eventTitle}</Text>

        {/* Scanned Items */}
        <Text style={styles.subtitle}>Scanned Items</Text>
        {scannedItems.length === 0 ? (
          <Text style={styles.itemText}>No items scanned yet</Text>
        ) : (
          scannedItems.map(item => (
            <Text key={item.id} style={styles.itemText}>
              {item.type} - {item.points} pts
            </Text>
          ))
        )}

        {/* Scan buttons */}
        <Text style={[styles.subtitle, { marginTop: 10 }]}>Add Item:</Text>
        <View style={styles.buttonRow}>
          {Object.keys(POINTS).map(type => (
            <View key={type} style={{ marginRight: 5, marginBottom: 5 }}>
              <Button title={type} onPress={() => handleScanItem(type)} color="#4CAF50" />
            </View>
          ))}
        </View>

        {/* Bin selection */}
        <Text style={[styles.subtitle, { marginTop: 15 }]}>Select Recycling Bin</Text>
        {bins.map(bin => (
          <TouchableOpacity
            key={bin.binID}
            style={[
              styles.binItem,
              selectedBin?.binID === bin.binID && styles.binItemSelected
            ]}
            onPress={() => setSelectedBin(bin)}
          >
            <Text style={styles.binText}>{bin.name}</Text>
          </TouchableOpacity>
        ))}

        {/* Submit / Cancel */}
        <View style={{ marginTop: 20 }}>
          <Button title="Submit Contribution" onPress={handleSubmitContribution} color="#4CAF50" />
          <View style={{ height: 10 }} />
          <Button title="Cancel" onPress={() => navigation.goBack()} color="#f44336" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  itemText: { fontSize: 14, marginBottom: 2 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  binItem: { padding: 10, marginBottom: 5, borderRadius: 5, backgroundColor: '#4CAF50' },
  binItemSelected: { backgroundColor: '#2196F3' },
  binText: { color: '#fff', fontWeight: 'bold' }
});
