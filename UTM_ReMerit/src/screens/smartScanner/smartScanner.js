import React from 'react';
import { View, Text, StyleSheet, Button, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SmartScannerScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Scanner</Text>
      <Text style={styles.subtitle}>Camera Preview</Text>
      
      {/* Camera placeholder */}
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.placeholderText}>📷 Camera will appear here</Text>
        <Text style={styles.placeholderSubtext}>
          Real-time object detection for:{'\n'}
          • Glass{'\n'}
          • Metal{'\n'} 
          • Paper{'\n'}
          • Plastic{'\n'}
          • Non-Recyclable{'\n'}
          • Tyre
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Capture Image"
          onPress={() => alert('Camera functionality coming soon!')}
          color="#4CAF50"
        />
        <View style={styles.spacer} />
        <Button
          title="Back to Home"
          onPress={() => navigation.goBack()}
          color="#FF5722"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  spacer: {
    height: 10,
  },
});