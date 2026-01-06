import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>UTM ReMerit App</Text>
      <Text style={styles.subtitle}>Sustainability Event Management</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Admin Dashboard" 
          onPress={() => navigation.navigate('AdminDashboard')} 
          color="#4CAF50"
        />
        <View style={styles.spacer} />
        <Button 
          title="View Events (Student)" 
          onPress={() => navigation.navigate('EventList')} 
          color="#2196F3"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2E7D32',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#4CAF50',
    textAlign: 'center',
  },
  buttonContainer: { 
    width: '80%' 
  },
  spacer: { 
    height: 15 
  }
});