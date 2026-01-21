import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  DeviceEventEmitter
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { profileApi, validation } from '../services/api';
import * as ImagePicker from 'react-native-image-picker';

// Color Constants
const COLORS = {
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',
  secondary: '#2196F3',
  danger: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#2196F3',
  light: '#F5F9F5',
  white: '#FFFFFF',
  gray: '#666',
  lightGray: '#E0E0E0',
  lightGreen: '#E8F5E8',
  lightBlue: '#E3F2FD',
  lightRed: '#FFEBEE',
  lightYellow: '#FFF3E0'
};

// Constants
const PROFILE_IMAGE_KEY = 'profile_image_';
const DEFAULT_STUDENT_ID = 'U022';
const PROFILE_UPDATED_EVENT = 'profileDataUpdated';

function StudentProfile() {
  const navigation = useNavigation();
  const route = useRoute();
  
  // State variables
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [selectedField, setSelectedField] = useState(null);
  const [showImagePickerOptions, setShowImagePickerOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Profile data
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileImageUri, setProfileImageUri] = useState(null);

  // Get parameters
  const studentId = route.params?.studentId || DEFAULT_STUDENT_ID;
  const isAdminView = route.params?.isAdminView || false;
  const studentName = route.params?.studentName;

  // REAL-TIME SYNC: Listen for profile data updates
  useEffect(() => {
    const handleProfileUpdate = (eventData) => {
      console.log('Profile data updated event received:', eventData);
      if (!eventData || !eventData.userId || eventData.userId === studentId) {
        console.log('Refreshing profile data...');
        loadProfileData();
      }
    };

    const subscription = DeviceEventEmitter.addListener(
      PROFILE_UPDATED_EVENT,
      handleProfileUpdate
    );

    return () => {
      subscription.remove();
    };
  }, [studentId]);

  // Load profile data on focus
  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
      return () => {};
    }, [studentId])
  );

  // Refresh function
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  // Load profile from backend
  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const profileData = await profileApi.getProfile(studentId);
      setStudentProfile(profileData);
      
      const savedImage = await AsyncStorage.getItem(`${PROFILE_IMAGE_KEY}${studentId}`);
      if (savedImage) {
        setProfileImageUri(savedImage);
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      
      setStudentProfile({
        userID: studentId,
        fullName: studentName || 'Ali bin Ahmad',
        utmID: 'A23EN0001',
        email: 'ali.ahmad@graduate.utm.my',
        role: 'student',
        contactNumber: '010-8201396',
        address: 'L12a, KTHO, UTM SKUDAI',
        matricNo: 'A23EN0001',
        faculty: 'FKE',
        totalPoints: 1500,
        totalMerits: 120,
        totalItemsRecycled: 45,
        totalWeightRecycled: 67.5,
        memberSince: '2023',
        accountStatus: 'active',
        activeSessions: 2
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async (field, value) => {
    if (!studentProfile) return;
    
    setIsUpdating(true);
    try {
      const updateData = { [field]: value };
      const result = await profileApi.updateProfile(studentProfile.userID, updateData);
      
      setStudentProfile(prev => ({
        ...prev,
        [field]: value
      }));
      
      setSuccessMessage(`${getFieldLabel(field)} updated successfully!`);
      setShowSuccessModal(true);
      
      DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
        userId: studentProfile.userID,
        updates: updateData
      });
      
      setTimeout(() => {
        setEditModalVisible(false);
        setSelectedField(null);
        setShowSuccessModal(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.error || 'Failed to update profile';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle field selection
  const handleFieldSelect = (field) => {
    if (isEditMode && studentProfile) {
      setSelectedField(field);
      setEditingField(field);
      setEditValue(studentProfile[field] || '');
      setEditModalVisible(true);
    }
  };

  // Handle save edit
  const handleSaveEdit = () => {
    if (editValue.trim() === '') {
      Alert.alert('Error', 'Field cannot be empty');
      return;
    }

    if (editingField === 'email' && !validation.validateEmail(editValue)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (editingField === 'contactNumber' && !validation.validatePhone(editValue)) {
      Alert.alert('Error', 'Please enter a valid phone number (min 8 digits)');
      return;
    }

    if (editingField === 'matricNo' && !validation.validateMatric(editValue)) {
      Alert.alert('Error', 'Please enter a valid matric number (e.g., A23CS0001)');
      return;
    }

    handleUpdateProfile(editingField, editValue);
  };

  // Handle image selection
  const handleSelectImage = async (source) => {
    setShowImagePickerOptions(false);
    
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 500,
      maxHeight: 500,
    };

    try {
      let response;
      
      if (source === 'camera') {
        response = await ImagePicker.launchCamera(options);
      } else {
        response = await ImagePicker.launchImageLibrary(options);
      }
      
      if (response.didCancel) {
        console.log('User cancelled image picker');
        return;
      }
      
      if (response.errorCode) {
        Alert.alert('Error', 'Failed to access image');
        return;
      }
      
      if (response.assets && response.assets[0]) {
        const imageUri = response.assets[0].uri;
        
        await AsyncStorage.setItem(`${PROFILE_IMAGE_KEY}${studentId}`, imageUri);
        
        setProfileImageUri(imageUri);
        
        await handleUpdateProfile('profilePicture', imageUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // Navigation functions
  const goToAccountSettings = () => {
    navigation.navigate('ManageAccountSettings', {
      studentId: studentId,
      isAdminView: isAdminView,
      studentName: studentProfile?.fullName || studentName
    });
  };

  const goBack = () => {
    if (isAdminView) {
      navigation.navigate('AdminHome');
    } else {
      navigation.navigate('StudentHome');
    }
  };

  const getFieldLabel = (field) => {
    const labels = {
      fullName: 'Full Name',
      utmID: 'UTM ID',
      matricNo: 'Matric Number',
      email: 'Email',
      contactNumber: 'Contact Number',
      address: 'Address',
      faculty: 'Faculty',
      accountStatus: 'Account Status',
      memberSince: 'Member Since',
      profilePicture: 'Profile Picture'
    };
    return labels[field] || field;
  };

  // Get profile picture source
  const getProfilePictureSource = () => {
    if (profileImageUri) {
      return { uri: profileImageUri };
    } else if (studentProfile?.profilePicture) {
      return { uri: studentProfile.profilePicture };
    }
    return require('../media/default_profile.png');
  };

  // Editable fields based on role
  const getEditableFields = () => {
    if (isAdminView) {
      return ['fullName', 'utmID', 'matricNo', 'email', 'contactNumber', 'address', 'faculty'];
    }
    return ['email', 'contactNumber', 'address'];
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!studentProfile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfileData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primaryLight]}
            tintColor={COLORS.primaryLight}
          />
        }
      >
          <View style={styles.topSettingsContainer}>
          <TouchableOpacity 
            onPress={goToAccountSettings}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            onPress={() => setShowImagePickerOptions(true)}
            style={styles.avatarTouchable}
            disabled={!isEditMode}
          >
            <Image 
              source={getProfilePictureSource()} 
              style={styles.avatar}
            />
            {isEditMode && (
              <View style={styles.cameraIconContainer}>
                <Text style={styles.cameraIcon}>📷</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.name}>{studentProfile.fullName}</Text>
          
          <View style={styles.badgeContainer}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {studentProfile.role === 'student' ? 'Student' : 'Admin'}
              </Text>
            </View>
            {isAdminView && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin View</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.matric}>{studentProfile.matricNo}</Text>
        </View>

        {/* Contribution Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Total Contribution</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.pointsCard]}>
              <Text style={styles.statNumber}>{studentProfile.totalPoints || 0}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={[styles.statCard, styles.itemsCard]}>
              <Text style={styles.statNumber}>{studentProfile.totalMerits || 0}</Text>
              <Text style={styles.statLabel}>Merits</Text>
            </View>
            <View style={[styles.statCard, styles.weightCard]}>
              <Text style={styles.statNumber}>
                {Number(studentProfile?.totalWeightRecycled || 0).toFixed(1)}kg
                </Text>
              <Text style={styles.statLabel}>Weight</Text>
            </View>
          </View>
        </View>

        {/* Profile Information */}
        <View style={styles.detailsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            <TouchableOpacity 
              style={[styles.editToggleButton, isEditMode && styles.editToggleButtonActive]}
              onPress={() => setIsEditMode(!isEditMode)}
            >
              <Text style={[styles.editToggleButtonText, isEditMode && styles.editToggleButtonTextActive]}>
                {isEditMode ? 'Done' : '✏️ Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Personal Details */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionSubtitle}>Personal Details</Text>
            
            {getEditableFields().includes('fullName') ? (
              <EditableField 
                label="Full Name"
                field="fullName"
                value={studentProfile.fullName}
                isEditMode={isEditMode}
                isSelected={selectedField === 'fullName'}
                onSelect={() => handleFieldSelect('fullName')}
                type="text"
              />
            ) : (
              <DetailRow 
                label="Full Name" 
                value={studentProfile.fullName} 
                type="text"
              />
            )}
            
            {getEditableFields().includes('utmID') ? (
              <EditableField 
                label="UTM ID"
                field="utmID"
                value={studentProfile.utmID}
                isEditMode={isEditMode}
                isSelected={selectedField === 'utmID'}
                onSelect={() => handleFieldSelect('utmID')}
                type="text"
              />
            ) : (
              <DetailRow 
                label="UTM ID" 
                value={studentProfile.utmID} 
                type="text"
              />
            )}
            
            {getEditableFields().includes('matricNo') ? (
              <EditableField 
                label="Matric No"
                field="matricNo"
                value={studentProfile.matricNo}
                isEditMode={isEditMode}
                isSelected={selectedField === 'matricNo'}
                onSelect={() => handleFieldSelect('matricNo')}
                type="text"
              />
            ) : (
              <DetailRow 
                label="Matric No" 
                value={studentProfile.matricNo} 
                type="text"
              />
            )}
            
            <DetailRow 
              label="Role" 
              value={studentProfile.role === 'student' ? 'Student' : 'Admin'} 
              type="text"
            />
          </View>

          {/* Contact Information */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionSubtitle}>Contact Information</Text>
            
            {getEditableFields().includes('email') ? (
              <EditableField 
                label="Email"
                field="email"
                value={studentProfile.email || 'Not provided'}
                isEditMode={isEditMode}
                isSelected={selectedField === 'email'}
                onSelect={() => handleFieldSelect('email')}
                type="email"
              />
            ) : (
              <DetailRow 
                label="Email" 
                value={studentProfile.email || 'Not provided'} 
                type="email"
              />
            )}
            
            {getEditableFields().includes('contactNumber') ? (
              <EditableField 
                label="Contact Number"
                field="contactNumber"
                value={studentProfile.contactNumber || 'Not provided'}
                isEditMode={isEditMode}
                isSelected={selectedField === 'contactNumber'}
                onSelect={() => handleFieldSelect('contactNumber')}
                type="phone"
              />
            ) : (
              <DetailRow 
                label="Contact Number" 
                value={studentProfile.contactNumber || 'Not provided'} 
                type="phone"
              />
            )}
            
            {getEditableFields().includes('address') ? (
              <EditableField 
                label="Address"
                field="address"
                value={studentProfile.address || 'Not provided'}
                isEditMode={isEditMode}
                isSelected={selectedField === 'address'}
                onSelect={() => handleFieldSelect('address')}
              />
            ) : (
              <DetailRow 
                label="Address" 
                value={studentProfile.address || 'Not provided'} 
              />
            )}
          </View>

          {/* Academic Information */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionSubtitle}>Academic Information</Text>
            
            {getEditableFields().includes('faculty') ? (
              <EditableField 
                label="Faculty"
                field="faculty"
                value={studentProfile.faculty || 'Not provided'}
                isEditMode={isEditMode}
                isSelected={selectedField === 'faculty'}
                onSelect={() => handleFieldSelect('faculty')}
              />
            ) : (
              <DetailRow 
                label="Faculty" 
                value={studentProfile.faculty || 'Not provided'} 
              />
            )}
          </View>

          {/* Account Information */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionSubtitle}>Account Information</Text>
            
            <DetailRow 
              label="Account Status" 
              value={studentProfile.accountStatus || 'Active'} 
            />
            
            <DetailRow 
              label="Member Since" 
              value={studentProfile.memberSince || '2023'} 
            />
            <DetailRow 
              label="Active Sessions" 
              value={studentProfile.activeSessions || 0} 
            />
          </View>

          {/* Edit Instructions */}
          {isEditMode && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsText}>
                • Tap on any editable field to modify it
                • Changes are saved immediately to database
                {!isAdminView && " • Tap profile picture to update"}
                {isAdminView && " • As admin, you can edit all student details"}
                • Changes sync in real-time across all screens
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showImagePickerOptions}
        onRequestClose={() => setShowImagePickerOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePickerModal}>
            <Text style={styles.modalTitle}>Update Profile Picture</Text>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.galleryButton]}
              onPress={() => handleSelectImage('gallery')}
            >
              <Text style={styles.modalButtonText}>📁 Choose from Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cameraButton]}
              onPress={() => handleSelectImage('camera')}
            >
              <Text style={styles.modalButtonText}>📸 Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowImagePickerOptions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Field Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.modalTitle}>Edit {getFieldLabel(editingField)}</Text>
            
            <TextInput
              style={[styles.modalInput, editingField === 'address' && styles.addressInput]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${getFieldLabel(editingField).toLowerCase()}`}
              placeholderTextColor="#999"
              autoCapitalize="none"
              keyboardType={
                editingField === 'email' ? 'email-address' :
                editingField === 'contactNumber' ? 'phone-pad' : 'default'
              }
              multiline={editingField === 'address'}
              numberOfLines={editingField === 'address' ? 4 : 1}
              editable={!isUpdating}
            />
            
            {isUpdating && (
              <View style={styles.updatingContainer}>
                <ActivityIndicator size="small" color={COLORS.primaryLight} />
                <Text style={styles.updatingText}>Updating...</Text>
              </View>
            )}
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setEditModalVisible(false);
                  setSelectedField(null);
                }}
                disabled={isUpdating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={isUpdating}
              >
                <Text style={styles.saveButtonText}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <Text style={styles.syncNote}>Changes will sync across all screens</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper Components
function DetailRow({ label, value, type = 'text' }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={[
        styles.detailValue,
        type === 'email' && styles.emailValue,
        type === 'phone' && styles.phoneValue
      ]}>
        {value || 'Not provided'}
      </Text>
    </View>
  );
}

function EditableField({ label, field, value, isEditMode, isSelected, onSelect, type = 'text' }) {
  const route = useRoute();
  const isAdminView = route.params?.isAdminView || false;
  
  const getEditableFields = () => {
    if (isAdminView) {
      return ['fullName', 'utmID', 'matricNo', 'email', 'contactNumber', 'address', 'faculty'];
    }
    return ['email', 'contactNumber', 'address'];
  };
  
  const isEditable = isEditMode && getEditableFields().includes(field);
  
  return (
    <TouchableOpacity 
      style={[
        styles.editableFieldContainer,
        isEditable && styles.editableFieldActive,
        isSelected && styles.selectedField
      ]}
      onPress={onSelect}
      activeOpacity={isEditable ? 0.7 : 1}
      disabled={!isEditable}
    >
      <View style={styles.editableFieldRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={[
          styles.detailValue,
          type === 'email' && styles.emailValue,
          type === 'phone' && styles.phoneValue,
          isEditable && styles.editableValue,
          !value && styles.missingValue
        ]}>
          {value || 'Not provided'}
        </Text>
      </View>
      {isEditable && (
        <Text style={styles.editHint}>Tap to edit • Real-time sync</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.danger,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  settingsButton: {
    padding: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 25,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.lightGray,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primaryLight,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cameraIcon: {
    fontSize: 18,
    color: COLORS.white,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 10,
  },
  roleBadge: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  adminBadgeText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  matric: {
    fontSize: 16,
    color: COLORS.gray,
  },
  statsContainer: {
    backgroundColor: COLORS.white,
    marginVertical: 15,
    marginHorizontal: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    minWidth: 80,
    elevation: 2,
  },
  pointsCard: {
    backgroundColor: COLORS.lightGreen,
  },
  itemsCard: {
    backgroundColor: COLORS.lightBlue,
  },
  weightCard: {
    backgroundColor: COLORS.lightYellow,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: COLORS.white,
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  editToggleButton: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  editToggleButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  editToggleButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  editToggleButtonTextActive: {
    color: COLORS.white,
  },
  detailSection: {
    marginBottom: 25,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  editableFieldContainer: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    marginBottom: 2,
  },
  editableFieldActive: {
    backgroundColor: '#F9F9F9',
    borderRadius: 6,
  },
  selectedField: {
    backgroundColor: COLORS.lightGreen,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryLight,
  },
  editableFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  editableValue: {
    color: COLORS.secondary,
    fontWeight: '500',
  },
  emailValue: {
    color: COLORS.secondary,
  },
  phoneValue: {
    color: COLORS.primaryLight,
  },
  missingValue: {
    color: '#999',
    fontStyle: 'italic',
  },
  editHint: {
    fontSize: 11,
    color: COLORS.warning,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 120,
  },
  instructionsContainer: {
    backgroundColor: COLORS.lightYellow,
    padding: 10,
    borderRadius: 6,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  instructionsText: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 18,
  },
   // Add new top settings container
  topSettingsContainer: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 10,
  },
  settingsButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  settingsButtonText: {
    fontSize: 22,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  imagePickerModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  editModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 25,
    width: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  successModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 8,
    elevation: 2,
  },
  galleryButton: {
    backgroundColor: COLORS.secondary,
  },
  cameraButton: {
    backgroundColor: COLORS.primaryLight,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
    marginTop: 10,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
    marginBottom: 25,
  },
  addressInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  updatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  updatingText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.gray,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '50%',
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: COLORS.primaryLight,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  successIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  syncNote: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default StudentProfile;