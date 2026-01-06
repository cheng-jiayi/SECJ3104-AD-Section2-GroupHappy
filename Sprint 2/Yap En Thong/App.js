import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Button, 
  StatusBar, 
  SafeAreaView, 
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your screens
import StudentProfile from './src/screens/StudentProfile';
import StudentList from './src/screens/StudentList';
import ManageAccountSettings from './src/screens/ManageAccountSettings';

const Stack = createNativeStackNavigator();
const API_URL = 'http://localhost:5000/api';

function RoleSelectionScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true);
  const [databaseStatus, setDatabaseStatus] = useState({
    connected: false,
    totalStudents: 0,
    backendStatus: 'Checking...',
    lastChecked: null
  });
  const [refreshing, setRefreshing] = useState(false);

  // Fetch database status on component mount
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    setIsLoading(true);
    try {
      // Check backend health
      const healthResponse = await axios.get(`${API_URL}/health`, {
        timeout: 5000
      });
      
      if (healthResponse.data.status === 'healthy') {
        // Get total students count
        const studentsResponse = await axios.get(`${API_URL}/students`, {
          timeout: 5000
        });
        
        const studentsCount = Array.isArray(studentsResponse.data) 
          ? studentsResponse.data.length 
          : 0;
        
        setDatabaseStatus({
          connected: true,
          totalStudents: studentsCount,
          backendStatus: 'Connected ✅',
          lastChecked: new Date().toLocaleTimeString()
        });
        
        // Save to AsyncStorage for faster loading next time
        await AsyncStorage.setItem('lastDatabaseCheck', JSON.stringify({
          ...databaseStatus,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error('Database connection error:', error);
      
      // Try to load cached data
      try {
        const cachedData = await AsyncStorage.getItem('lastDatabaseCheck');
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          // Use cached data if it's less than 5 minutes old
          if (Date.now() - parsedData.timestamp < 5 * 60 * 1000) {
            setDatabaseStatus({
              ...parsedData,
              backendStatus: 'Cached Data (Offline)'
            });
          } else {
            throw new Error('Cache expired');
          }
        } else {
          throw new Error('No cached data');
        }
      } catch (cacheError) {
        // Fallback to static demo data
        setDatabaseStatus({
          connected: false,
          totalStudents: 6,
          backendStatus: 'Demo Mode (Backend Unavailable)',
          lastChecked: new Date().toLocaleTimeString()
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkDatabaseStatus();
    setRefreshing(false);
  };

  const testDatabaseConnection = async () => {
    Alert.alert(
      'Testing Connection',
      'Checking database connection...',
      [{ text: 'OK' }]
    );
    await checkDatabaseStatus();
  };

  const getStatusColor = () => {
    return databaseStatus.connected ? '#4CAF50' : '#FF9800';
  };

  const getStatusIcon = () => {
    return databaseStatus.connected ? '✅' : '⚠️';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#2E7D32" barStyle="light-content" />
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>UTM ReMerit</Text>
          <Text style={styles.appSubtitle}>Green Campus Initiative</Text>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>Profile Management Module</Text>
          <Text style={styles.subtitle}>Select Your Role</Text>
          
          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <Button
                title="👨‍🎓 Student View"
                color="#4CAF50"
                onPress={() => navigation.navigate('StudentProfile', {
                  studentId: 'U022',
                  isAdminView: false,
                  studentName: 'Ali bin Ahmad'
                })}
              />
              <Text style={styles.buttonDescription}>
                View & edit your own profile
              </Text>
            </View>
            
            <View style={styles.spacer} />
            
            <View style={styles.buttonWrapper}>
              <Button
                title="👨‍💼 Admin View"
                color="#2196F3"
                onPress={() => navigation.navigate('StudentList')}
              />
              <Text style={styles.buttonDescription}>
                Manage all student profiles
              </Text>
            </View>
          </View>
          
          {/* Database Status Card */}
          <View style={styles.databaseInfo}>
            <View style={styles.databaseHeader}>
              <Text style={styles.infoTitle}>📊 Database Status</Text>
              <TouchableOpacity onPress={testDatabaseConnection}>
                <Text style={styles.refreshButton}>🔄 Refresh</Text>
              </TouchableOpacity>
            </View>
            
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingText}>Checking database connection...</Text>
              </View>
            ) : (
              <>
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Connection:</Text>
                  <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                    {getStatusIcon()} {databaseStatus.backendStatus}
                  </Text>
                </View>
                
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Database:</Text>
                  <Text style={styles.statusValue}>utm_remerit</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Total Students:</Text>
                  <Text style={[styles.statusValue, styles.studentCount]}>
                    {databaseStatus.totalStudents}
                  </Text>
                </View>
                
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Backend URL:</Text>
                  <Text style={styles.statusValue}>http://localhost:5000</Text>
                </View>
                
                <View style={styles.statusRow}>
                  <Text style={styles.statusLabel}>Last Checked:</Text>
                  <Text style={styles.statusValue}>
                    {databaseStatus.lastChecked || 'Never'}
                  </Text>
                </View>
                
                {!databaseStatus.connected && (
                  <View style={styles.warningContainer}>
                    <Text style={styles.warningText}>
                      ⚠️ Running in demo mode. Some features may be limited.
                    </Text>
                    <Text style={styles.warningSubtext}>
                      Make sure backend server is running on port 5000
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#4CAF50' },
          headerTintColor: '#fff',
          headerTitleStyle: { 
            fontWeight: 'bold',
            fontSize: 18
          },
          headerBackTitle: 'Back',
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen
          name="Role Selection"
          component={RoleSelectionScreen}
          options={{ 
            title: 'UTM ReMerit',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="StudentProfile"
          component={StudentProfile}
          options={({ route }) => ({ 
            title: route.params?.isAdminView ? 'Student Profile' : 'My Profile'
          })}
        />
        <Stack.Screen
          name="StudentList"
          component={StudentList}
          options={{ 
            title: 'Student Management'
          }}
        />
        <Stack.Screen
          name="ManageAccountSettings"
          component={ManageAccountSettings}
          options={({ route }) => ({ 
            title: route.params?.isAdminView ? 'Manage User Account' : 'Account Settings'
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#2E7D32',
    paddingVertical: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#C8E6C9',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#4CAF50',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    marginBottom: 30,
  },
  buttonWrapper: {
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  spacer: {
    height: 8,
  },
  databaseInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  databaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  refreshButton: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
  },
  studentCount: {
    fontWeight: 'bold',
    color: '#2196F3',
    fontSize: 16,
  },
  warningContainer: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#666',
  },
});