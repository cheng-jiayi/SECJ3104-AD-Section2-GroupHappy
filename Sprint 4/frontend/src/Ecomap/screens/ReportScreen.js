import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.0.2.2:3000';

const ReportScreen = ({ navigation, route }) => {
  const [bin, setBin] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [userID, setUserID] = useState(null);
  const [userData, setUserData] = useState(null); // Add for storing full user data

  const issueTypes = [
    { id: 1, name: 'Full', icon: 'alert-circle', color: '#F44336' },
    { id: 2, name: 'Damaged', icon: 'wrench', color: '#FF9800' },
    { id: 3, name: 'Misplaced', icon: 'map-marker-off', color: '#9C27B0' },
    { id: 4, name: 'Inaccessible', icon: 'block-helper', color: '#607D8B' },
    { id: 5, name: 'Other', icon: 'alert', color: '#795548' },
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
        console.log('Loading user data from AsyncStorage...');
        
        // Try different keys based on what your app uses
        const storedUserID = await AsyncStorage.getItem('userID');
        const storedUserData = await AsyncStorage.getItem('userData');
        const currentUser = await AsyncStorage.getItem('currentUser');
        const loggedInUser = await AsyncStorage.getItem('loggedInUser');
        
        console.log('AsyncStorage keys found:', {
            storedUserID,
            hasUserData: !!storedUserData,
            hasCurrentUser: !!currentUser,
            hasLoggedInUser: !!loggedInUser
        });
        
        let foundUserID = null;
        
        // Check in order of priority
        if (storedUserID) {
            foundUserID = storedUserID;
            console.log('✅ Found userID from AsyncStorage:', foundUserID);
        } 
        
        // Check storedUserData
        if (!foundUserID && storedUserData) {
            try {
                const parsedUser = JSON.parse(storedUserData);
                const userIdFromData = parsedUser.userID || parsedUser.id || parsedUser.user_id || parsedUser.userId;
                if (userIdFromData) {
                    foundUserID = userIdFromData;
                    console.log('✅ Found userID from userData:', foundUserID);
                }
            } catch (parseError) {
                console.error('Error parsing userData:', parseError);
            }
        }
        
        // Check currentUser
        if (!foundUserID && currentUser) {
            try {
                const parsedUser = JSON.parse(currentUser);
                const userIdFromData = parsedUser.userID || parsedUser.id || parsedUser.user_id || parsedUser.userId;
                if (userIdFromData) {
                    foundUserID = userIdFromData;
                    console.log('✅ Found userID from currentUser:', foundUserID);
                }
            } catch (parseError) {
                console.error('Error parsing currentUser:', parseError);
            }
        }
        
        // Check loggedInUser
        if (!foundUserID && loggedInUser) {
            try {
                const parsedUser = JSON.parse(loggedInUser);
                const userIdFromData = parsedUser.userID || parsedUser.id || parsedUser.user_id || parsedUser.userId;
                if (userIdFromData) {
                    foundUserID = userIdFromData;
                    console.log('✅ Found userID from loggedInUser:', foundUserID);
                }
            } catch (parseError) {
                console.error('Error parsing loggedInUser:', parseError);
            }
        }
        
        // Use found userID or fallback
        if (foundUserID) {
            setUserID(foundUserID);
            console.log('🔄 Set userID to:', foundUserID);
        } else {
            console.log('⚠️ No userID found in AsyncStorage. Using fallback.');
            setUserID("U001"); // Fallback for testing
        }
        
    } catch (error) {
        console.error('❌ Error loading user data:', error);
        // Set fallback userID
        setUserID("U001");
    }
};

  useEffect(() => {
    console.log('ReportScreen - route.params:', route.params);
    
    if (route.params?.bin) {
        console.log('✅ Bin data received:', route.params.bin);
        console.log('📋 Bin ID check:');
        console.log('- bin.bin_id:', route.params.bin.bin_id);
        console.log('- bin.id:', route.params.bin.id);
        console.log('- bin.original_bin_id:', route.params.bin.original_bin_id);
        console.log('- Is station bin?:', route.params.bin.isStationBin);
        console.log('- Found matching bin?:', route.params.bin.foundMatchingBin);
        console.log('- Matching bin data:', route.params.bin.matchingBinData);
        
        setBin(route.params.bin);
        setInitialized(true);
    } else {
        console.error('❌ No bin data received');
        Alert.alert(
            'Error',
            'No bin data received. Please select a bin from the map.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
    }
  }, [route.params]);

  // Debug log for userID changes
  useEffect(() => {
    console.log('🔄 userID state updated:', userID);
  }, [userID]);

  const takePhoto = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled camera');
        } else if (response.error) {
          console.log('Camera Error: ', response.error);
          Alert.alert('Error', 'Failed to take photo');
        } else {
          setPhoto(response.assets[0]);
        }
      }
    );
  };

  const choosePhoto = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.error) {
          console.log('ImagePicker Error: ', response.error);
          Alert.alert('Error', 'Failed to pick image');
        } else {
          setPhoto(response.assets[0]);
        }
      }
    );
  };

  const handleSubmit = async () => {
    if (!selectedIssue) {
        Alert.alert('Error', 'Please select an issue type');
        return;
    }

    if (!description.trim()) {
        Alert.alert('Error', 'Please provide a description');
        return;
    }

    if (!bin) {
        Alert.alert('Error', 'Invalid bin data. Please go back and select a bin again.');
        return;
    }

    // Check if we have a userID
    if (!userID) {
        Alert.alert('Error', 'User not logged in. Please login first.');
        return;
    }

    setLoading(true);
    
    try {
        let validBinId = null;
        
        console.log('🔍 Checking bin ID from bin object:', bin);
        console.log('📋 Full bin object:', JSON.stringify(bin, null, 2));
        console.log('👤 Current userID:', userID);
        
        if (bin.bin_id && parseInt(bin.bin_id) > 0) {
            validBinId = parseInt(bin.bin_id);
            console.log('✅ Found valid bin_id:', validBinId);
        } else if (bin.id && parseInt(bin.id) > 0) {
            validBinId = parseInt(bin.id);
            console.log('✅ Found valid id:', validBinId);
        } else if (bin.original_bin_id) {
            if (typeof bin.original_bin_id === 'string') {
                const numId = parseInt(bin.original_bin_id);
                if (!isNaN(numId) && numId > 0) {
                    validBinId = numId;
                    console.log('✅ Found valid original_bin_id:', validBinId);
                } else {
                    console.log('🔍 Searching for bin in database...');
                    try {
                        const searchResponse = await axios.get(`${API_BASE_URL}/api/bins/nearby`, {
                            params: {
                                lat: bin.latitude,
                                lng: bin.longitude,
                                radius: 0.01 
                            }
                        });
                        
                        const nearbyBins = searchResponse.data;
                        console.log('📍 Nearby bins found:', nearbyBins);
                        
                        const matchingBin = nearbyBins.find(b => 
                            b.type_name === bin.type_name && 
                            Math.abs(b.latitude - bin.latitude) < 0.001 &&
                            Math.abs(b.longitude - bin.longitude) < 0.001
                        );
                        
                        if (matchingBin) {
                            validBinId = matchingBin.bin_id;
                            console.log('✅ Found matching bin in database:', validBinId);
                        }
                    } catch (searchError) {
                        console.error('❌ Error searching for bin:', searchError);
                    }
                }
            }
        }
        
        if (!validBinId) {
            Alert.alert(
                'Error', 
                'Cannot find valid bin ID. Please try selecting the bin directly from the map instead of the station list.',
                [{ text: 'OK' }]
            );
            setLoading(false);
            return;
        }
        
        // ✅ FIXED: Use the userID state variable, not user.studentID
        const reportData = {
            bin_id: validBinId,
            userID: userID,  // This is the key fix - using userID state
            issue_type: selectedIssue,
            description: description.trim(),
            photo_url: photo ? photo.uri : null,
        };

        console.log('📤 Submitting report data:', JSON.stringify(reportData, null, 2));
        
        // Send request
        const response = await axios.post(`${API_BASE_URL}/api/issues/report`, reportData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Server response:', response.data);
        
        if (response.data.success) {
            Alert.alert(
                'Success', 
                'Issue reported successfully!',
                [
                    { 
                        text: 'OK', 
                        onPress: () => {
                            setLoading(false);
                            navigation.goBack();
                        }
                    }
                ]
            );
        } else {
            Alert.alert('Error', response.data.error || 'Failed to report issue');
            setLoading(false);
        }
    } catch (error) {
        console.error('❌ Error reporting issue:', error);
        
        let errorMessage = 'Failed to report issue. Please try again.';
        let errorDetails = '';
        
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error('📊 Server Response Status:', error.response.status);
            console.error('📊 Server Response Data:', error.response.data);
            console.error('📊 Server Response Headers:', error.response.headers);
            
            errorDetails = `Status: ${error.response.status}\n`;
            if (error.response.data?.error) {
                errorMessage = error.response.data.error;
                errorDetails += `Error: ${error.response.data.error}\n`;
            }
            if (error.response.data?.message) {
                errorMessage = error.response.data.message;
                errorDetails += `Message: ${error.response.data.message}\n`;
            }
            if (error.response.data?.details) {
                errorDetails += `Details: ${error.response.data.details}\n`;
            }
            if (error.response.data?.sql) {
                errorDetails += `SQL: ${error.response.data.sql}`;
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('📡 No response received:', error.request);
            errorMessage = 'No response from server. Please check your connection.';
            errorDetails = 'Request was made but no response received.';
        } else {
            // Something happened in setting up the request
            console.error('🔧 Request setup error:', error.message);
            errorMessage = error.message;
            errorDetails = `Error: ${error.message}`;
        }
        
        console.error('📋 Error Summary:', errorDetails);
        
        Alert.alert('Error', errorMessage);
        setLoading(false);
    }
};

  // Add a debug button to check AsyncStorage (optional)
  const checkAsyncStorage = async () => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        console.log('🔑 All AsyncStorage keys:', keys);
        
        for (const key of keys) {
            const value = await AsyncStorage.getItem(key);
            console.log(`📝 ${key}:`, value?.substring(0, 100) + '...');
        }
    } catch (error) {
        console.error('Error checking AsyncStorage:', error);
    }
  };

  // If no bin data, show loading or error
  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading bin data...</Text>
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={checkAsyncStorage}
        >
          <Text style={styles.debugButtonText}>Debug AsyncStorage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!bin) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={60} color="#F44336" />
        <Text style={styles.errorTitle}>No Bin Selected</Text>
        <Text style={styles.errorText}>Please go back and select a bin from the map.</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={checkAsyncStorage}
        >
          <Text style={styles.debugButtonText}>Debug AsyncStorage</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Debug Info Section (Optional - remove in production) */}
      <View style={styles.debugSection}>
        <TouchableOpacity onPress={checkAsyncStorage}>
          <Text style={styles.debugText}>
            UserID: {userID || 'Not loaded'} | Status: {userID ? 'Ready' : 'No User'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bin Info Section */}
      <View style={styles.binSection}>
        <Text style={styles.sectionTitle}>Selected Bin</Text>
        <View style={styles.binCard}>
          <View style={styles.binHeader}>
              <Icon name="recycle" size={24} color="#4CAF50" />
              <Text style={styles.binName}>{bin.bin_name || `${bin.type_name} Bin`}</Text>
          </View>
          <Text style={styles.binType}>{bin.type_name} Bin</Text>
          <Text style={styles.binLocation}>{bin.location_description || 'Recycling Location'}</Text>
          <Text style={styles.binIdText}>Bin ID: {bin.bin_id || bin.id || 'N/A'}</Text>
      </View>
      </View>

      {/* Issue Type Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issue Type *</Text>
        <Text style={styles.sectionSubtitle}>Select the type of issue</Text>
        
        <View style={styles.issueTypesContainer}>
          {issueTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.issueTypeButton,
                selectedIssue === type.name && { backgroundColor: type.color }
              ]}
              onPress={() => setSelectedIssue(type.name)}
            >
              <Icon 
                name={type.icon} 
                size={24} 
                color={selectedIssue === type.name ? '#FFFFFF' : type.color} 
              />
              <Text style={[
                styles.issueTypeText,
                selectedIssue === type.name && styles.issueTypeTextSelected
              ]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Description Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description *</Text>
        <Text style={styles.sectionSubtitle}>Provide details about the issue</Text>
        
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe what's wrong with the bin..."
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
          maxLength={500}
        />
        
        <Text style={styles.charCount}>
          {description.length}/500 characters
        </Text>
      </View>

      {/* Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo (Optional)</Text>
        <Text style={styles.sectionSubtitle}>Add a photo of the issue</Text>
        
        <View style={styles.photoButtonsContainer}>
          <TouchableOpacity 
            style={[styles.photoButton, loading && styles.disabledButton]} 
            onPress={takePhoto}
            disabled={loading}
          >
            <Icon name="camera" size={24} color="#FFFFFF" />
            <Text style={styles.photoButtonText}>Take Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.photoButton, loading && styles.disabledButton]} 
            onPress={choosePhoto}
            disabled={loading}
          >
            <Icon name="image" size={24} color="#FFFFFF" />
            <Text style={styles.photoButtonText}>Choose Photo</Text>
          </TouchableOpacity>
        </View>
        
        {photo && (
          <View style={styles.photoPreview}>
            <Image 
              source={{ uri: photo.uri }} 
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TouchableOpacity 
              style={styles.removePhotoButton}
              onPress={() => setPhoto(null)}
              disabled={loading}
            >
              <Icon name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <TouchableOpacity
          style={[styles.submitButton, (loading || !selectedIssue || !description.trim() || !userID) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !selectedIssue || !description.trim() || !userID}
        >
          {loading ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </>
          ) : (
            <>
              <Icon name="send" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {userID ? 'Submit Report' : 'Login Required'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {!userID && (
          <Text style={styles.warningText}>
            Please login to submit a report. UserID not found.
          </Text>
        )}
        
        <Text style={styles.disclaimer}>
          Your report will be reviewed by UTM administrators. 
          You'll receive updates on the status.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  debugSection: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  debugButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FF9800',
    borderRadius: 5,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 20,
  },
  binSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  binCard: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  binHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  binName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  binType: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
  },
  binLocation: {
    fontSize: 12,
    color: '#666',
  },
  binIdText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  stationNote: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    fontStyle: 'italic',
  },
  issueTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  issueTypeButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    margin: '1%',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  issueTypeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  issueTypeTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  photoPreview: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitSection: {
    padding: 20,
    marginTop: 16,
    marginBottom: 32,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
});

export default ReportScreen;