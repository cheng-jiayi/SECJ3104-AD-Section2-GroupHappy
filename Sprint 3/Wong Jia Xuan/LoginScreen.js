import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';

export default function LoginScreen({ navigation, onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://localhost:3000'; 

  const handleLogin = async () => {
    // Basic validation
    if (!username.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Sending login request to:', `${API_BASE_URL}/login`);
      const res = await axios.post(`${API_BASE_URL}/login`, {
        username: username.trim(),
        password: password.trim()
      }, {
        timeout: 10000, // 10 second timeout
      });

      console.log('Login response received:', res.data);

      if (res.data.success) {
        const userData = res.data.user;
        console.log('Login successful, user role:', userData.role);
        
        // Call parent's onLogin handler
        if (onLogin) {
          const result = await onLogin(username.trim(), password.trim());
          if (result && result.success) {
            // Login successful - App.js will handle navigation
            console.log('Parent onLogin handled successfully');
            // Clear form
            setUsername('');
            setPassword('');
            return;
          } else {
            // Parent onLogin failed
            Alert.alert('Login Failed', result?.message || 'Login failed');
          }
        } else {
          // Fallback navigation if onLogin is not provided
          if (userData.role === 'admin') {
            navigation.replace('AdminHome', { user: userData });
          } else {
            navigation.replace('StudentHome', { user: userData });
          }
        }

      } else {
        Alert.alert('Login Failed', res.data.message || 'Invalid credentials');
      }

    } catch (err) {
      console.error('Login error details:', err);
      
      if (err.code === 'ECONNABORTED') {
        Alert.alert(
          'Connection Timeout', 
          'Server is not responding. Please check if Flask server is running.'
        );
      } else if (err.message.includes('Network Error')) {
        Alert.alert(
          'Connection Error', 
          `Cannot connect to server at ${API_BASE_URL}\n\nMake sure:\n1. Flask server is running\n2. Using correct API URL`
        );
      } else if (err.response) {
        // Request made and server responded with error
        Alert.alert(
          'Login Failed', 
          err.response?.data?.message || `Error: ${err.response.status}`
        );
      } else if (err.request) {
        // Request made but no response
        Alert.alert(
          'Connection Error', 
          'Server is not responding. Please check if Flask server is running.'
        );
      } else {
        // Other errors
        Alert.alert('Error', 'An unexpected error occurred: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Test function for quick login (development only)
  const testLogin = async (testUsername, testPassword) => {
    setUsername(testUsername);
    setPassword(testPassword);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>♻️</Text>
        <Text style={styles.appTitle}>UTM ReMerit</Text>
        <Text style={styles.appSubtitle}>Recycle for Merit • Sustain for Future</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>User Login</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput 
            placeholder="Enter your username" 
            placeholderTextColor="#666"
            style={styles.input} 
            value={username} 
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput 
            placeholder="Enter your password" 
            placeholderTextColor="#666"
            style={styles.input} 
            secureTextEntry 
            value={password} 
            onChangeText={setPassword}
            editable={!loading}
          />
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.loginButtonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        {/* Test buttons for development */}
        <View style={styles.testButtonsContainer}>
          <Text style={styles.testTitle}>Test Accounts:</Text>
          <View style={styles.testButtonRow}>
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#1976D2' }]}
              onPress={() => testLogin('sarah_admin', 'hashed_pass1')}
              disabled={loading}
            >
              <Text style={styles.testButtonText}>Admin</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.testButton, { backgroundColor: '#388E3C' }]}
              onPress={() => testLogin('john123', 'hashed_pass5')}
              disabled={loading}
            >
              <Text style={styles.testButtonText}>Student</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Registration')}
            style={styles.registerButton}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>Register Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    fontSize: 60,
    marginBottom: 5,
  },
  appTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold',
    textAlign: 'center', 
    marginBottom: 15, 
    color: '#333' 
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: { 
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#81C784',
    opacity: 0.7,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButtonsContainer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  testTitle: {
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
    fontSize: 14,
  },
  testButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  testButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  registerText: {
    color: '#666',
    marginRight: 5,
    fontSize: 14,
  },
  registerButton: {
    padding: 5,
  },
  registerButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
