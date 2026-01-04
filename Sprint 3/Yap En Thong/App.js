import React, { useState, useEffect } from 'react';
import { 
  Alert, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  RefreshControl 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from './src/context/AppContext';

// Import Leaderboard Module Screens
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import RewardPointsScreen from './src/screens/RewardPointsScreen';
import ManageConversionsScreen from './src/screens/ManageConversionsScreen';

const Stack = createNativeStackNavigator();

function MainMenuScreen({ navigation }) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh action
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>UTM ReMerit</Text>
          <Text style={styles.subtitle}>Leaderboard & Reward Module</Text>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.moduleTitle}>Campaigns & Events Subsystem</Text>
          <Text style={styles.moduleDesc}>Leaderboard and Reward Management</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => navigation.navigate('LeaderboardScreen')}
            >
              <Text style={styles.buttonIcon}>🏆</Text>
              <Text style={styles.buttonTitle}>View Leaderboard</Text>
              <Text style={styles.buttonDesc}>UC35: Check weekly rankings and standings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={() => navigation.navigate('RewardPointsScreen')}
            >
              <Text style={styles.buttonIcon}>⭐</Text>
              <Text style={styles.buttonTitle}>My Reward Points</Text>
              <Text style={styles.buttonDesc}>UC36: View points & conversion status</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.button}
              onPress={() => navigation.navigate('ManageConversionsScreen')}
            >
              <Text style={styles.buttonIcon}>📊</Text>
              <Text style={styles.buttonTitle}>Manage Conversions</Text>
              <Text style={styles.buttonDesc}>UC37: Admin - Approve merit conversions</Text>
            </TouchableOpacity>
          </View>          
          
          {/* System Status */}
          <View style={styles.systemSection}>
            <Text style={styles.systemTitle}>🔧 System Status</Text>
            <View style={styles.systemStatus}>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.statusText}>Leaderboard: Online</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.statusText}>Reward System: Online</Text>
              </View>
              <View style={styles.statusItem}>
                <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.statusText}>Conversion Module: Online</Text>
              </View>
            </View>
          </View>
          
          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Version 1.0.0 • UTM ReMerit System
            </Text>
            <Text style={styles.footerNote}>
              Pull down to refresh • Tap any module to explore
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [navigationReady, setNavigationReady] = useState(false);

  const checkBackendConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://localhost:5000/api/health', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Backend connection error:', error.message);
      return false;
    }
  };

  useEffect(() => {
    const initApp = async () => {
      const isConnected = await checkBackendConnection();
      setBackendStatus(isConnected ? 'connected' : 'disconnected');
      
      if (!isConnected) {
        Alert.alert(
          'Backend Unavailable',
          'Using demo data. Start backend server for real data.\n\nTo start backend:\n1. cd backend\n2. npm run dev',
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ Backend connected successfully');
      }
    };
    
    initApp();
    
    // Optional: Check every 30 seconds
    const interval = setInterval(() => {
      checkBackendConnection().then(isConnected => {
        setBackendStatus(isConnected ? 'connected' : 'disconnected');
      });
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <AppProvider>
      <NavigationContainer 
        onReady={() => setNavigationReady(true)}
      >
        {backendStatus === 'checking' && (
          <SafeAreaView style={styles.loadingContainer}>
            <View style={styles.loadingContent}>
              <Text style={styles.loadingText}>Checking backend connection...</Text>
            </View>
          </SafeAreaView>
        )}
        
        <Stack.Navigator
          initialRouteName="MainMenu"
          screenOptions={{
            headerStyle: { 
              backgroundColor: '#4CAF50',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#fff',
            headerTitleStyle: { 
              fontWeight: 'bold',
              fontSize: 18,
            },
            headerBackTitleVisible: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="MainMenu"
            component={MainMenuScreen}
            options={{ 
              title: 'UTM ReMerit',
              headerShown: false
            }}
          />
          <Stack.Screen
            name="LeaderboardScreen"
            component={LeaderboardScreen}
            options={{ 
              title: 'Weekly Leaderboard',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="RewardPointsScreen"
            component={RewardPointsScreen}
            options={{ 
              title: 'Reward Dashboard',
              headerBackTitle: 'Back'
            }}
          />
          <Stack.Screen
            name="ManageConversionsScreen"
            component={ManageConversionsScreen}
            options={{ 
              title: 'Manage Conversions',
              headerBackTitle: 'Back'
            }}
          />
        </Stack.Navigator>
        
        {/* Connection Status Indicator */}
        {backendStatus !== 'checking' && (
          <View style={[
            styles.statusIndicator,
            { backgroundColor: backendStatus === 'connected' ? '#4CAF50' : '#FF9800' }
          ]}>
            <Text style={styles.statusText}>
              {backendStatus === 'connected' ? '✅ Backend Connected' : '⚠️ Using Demo Data'}
            </Text>
          </View>
        )}
      </NavigationContainer>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9F5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F9F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8F5E8',
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  moduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
    textAlign: 'center',
    marginTop: 20,
  },
  moduleDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
    textAlign: 'center',
  },
  buttonDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  systemSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  systemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 15,
  },
  systemStatus: {
    marginTop: 5,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  footerNote: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});