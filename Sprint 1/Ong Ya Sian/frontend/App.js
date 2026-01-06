import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import EventForm from './src/screens/EventForm';
import EventList from './src/screens//EventList';
import EditEvent from './src/screens/EditEvent';
import testConnection, { setApiUrl, getApiUrl } from './src/services/connectionTest';

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E8' }}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={{ marginTop: 20, color: '#2E7D32', fontSize: 16 }}>Testing server connection...</Text>
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionEstablished, setConnectionEstablished] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🔍 Testing server connection...');
        const workingUrl = await testConnection();
        
        if (workingUrl) {
          setApiUrl(workingUrl);
          setConnectionEstablished(true);
          console.log('✅ App initialized with URL:', workingUrl);
        } else {
          Alert.alert(
            'Connection Error',
            'Cannot connect to backend server. Please make sure your backend is running on http://localhost:3000',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        Alert.alert('Error', 'Failed to initialize app');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!connectionEstablished) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8F5E8', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#f44336', textAlign: 'center', marginBottom: 20 }}>
          ❌ Cannot connect to server
        </Text>
        <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
          Please make sure your backend server is running on http://localhost:3000{'\n\n'}
          Then restart this app.
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#4CAF50',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'UTM ReMerit' }}
        />
        <Stack.Screen 
          name="AdminDashboard" 
          component={AdminDashboard}
          options={{ title: 'Admin Dashboard' }}
        />
        <Stack.Screen 
          name="EventForm" 
          component={EventForm}
          options={{ title: 'Create Event' }}
        />
        <Stack.Screen 
          name="EventList" 
          component={EventList}
          options={{ title: 'All Events' }}
        />
        <Stack.Screen 
          name="EditEvent" 
          component={EditEvent}
          options={{ title: 'Edit Event' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}