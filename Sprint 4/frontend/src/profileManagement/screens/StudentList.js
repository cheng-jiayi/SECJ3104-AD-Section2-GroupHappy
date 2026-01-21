import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  DeviceEventEmitter
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { studentApi, validation } from '../services/api';

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

// Constants for event names
const PROFILE_UPDATED_EVENT = 'profileDataUpdated';

function StudentList() {
  const navigation = useNavigation();
  
  // State variables
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // New student form
  const [newStudent, setNewStudent] = useState({
    utmId: '',
    name: '',
    matricNo: '',
    faculty: '',
    email: '',
    contactNumber: '',
    address: ''
  });

  // REAL-TIME SYNC: Listen for profile data updates
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      PROFILE_UPDATED_EVENT,
      () => {
        console.log('Profile updated event received, refreshing student list...');
        loadStudents();
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Load students on focus
  useFocusEffect(
    React.useCallback(() => {
      loadStudents();
      return () => {};
    }, [])
  );

  // Filter students when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.matricNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.utmID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.faculty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  // Load students from backend
  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await studentApi.getAllStudents();
      setStudents(data);
      setFilteredStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Info', 'Using demo data. Backend may be unavailable.');
      
      const fallbackStudents = [
        {
          userID: 'U022',
          fullName: 'Ali bin Ahmad',
          utmID: 'ali.ahmad',
          email: 'ali.ahmad@graduate.utm.my',
          matricNo: 'A23EN0001',
          faculty: 'FKE',
          totalPoints: 1500,
          totalMerits: 120,
          totalItemsRecycled: 45,
          totalWeightRecycled: 67.5,
          contactNumber: '010-8201396',
          address: 'L12a, KTHO, UTM SKUDAI',
          accountStatus: 'active',
          activeSessions: 2,
          memberSince: '2023'
        },
        {
          userID: 'U010',
          fullName: 'Raj Kumar',
          utmID: 'raj.kumar',
          email: 'raj.kumar@graduate.utm.my',
          matricNo: 'A23CS0001',
          faculty: 'FC',
          totalPoints: 850,
          totalMerits: 65,
          totalItemsRecycled: 28,
          totalWeightRecycled: 42.0,
          contactNumber: '011-23456789',
          address: 'Block C, Kolej 2, UTM',
          accountStatus: 'active',
          activeSessions: 1,
          memberSince: '2023'
        },
        {
          userID: 'U005',
          fullName: 'Siti Norhaliza',
          utmID: 'siti.norhaliza',
          email: 'siti.norhaliza@graduate.utm.my',
          matricNo: 'A23BU0001',
          faculty: 'FABU',
          totalPoints: 620,
          totalMerits: 45,
          totalItemsRecycled: 22,
          totalWeightRecycled: 33.0,
          contactNumber: '012-3456789',
          address: 'Block A, UTM Residence',
          accountStatus: 'active',
          activeSessions: 1,
          memberSince: '2023'
        }
      ];
      setStudents(fallbackStudents);
      setFilteredStudents(fallbackStudents);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudents();
  };

  // Handle view profile
  const handleViewProfile = (student) => {
    navigation.navigate('StudentProfile', {
      studentId: student.userID,
      isAdminView: true,
      studentName: student.fullName
    });
  };

  // Handle delete
  const handleDeletePress = (student) => {
    setSelectedStudent(student);
    setDeleteModalVisible(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!selectedStudent) return;
    
    setIsDeleting(true);
    try {
      await studentApi.deleteStudent(selectedStudent.userID);
      
      setStudents(prev => prev.filter(s => s.userID !== selectedStudent.userID));
      
      setSuccessMessage(`Student ${selectedStudent.fullName} (${selectedStudent.matricNo}) has been deleted.`);
      setShowSuccessModal(true);
      
      DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
        userId: selectedStudent.userID,
        deleted: true
      });
      
      setTimeout(() => {
        setDeleteModalVisible(false);
        setShowSuccessModal(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting student:', error);
      Alert.alert('Error', 'Failed to delete student');
    } finally {
      setIsDeleting(false);
      setSelectedStudent(null);
    }
  };

  // Handle add new student
  const saveNewStudent = async () => {
    if (!validateNewStudent()) return;
    
    setIsAdding(true);
    try {
      const studentData = {
        utmID: newStudent.utmId.trim(),
        fullName: newStudent.name.trim(),
        email: newStudent.email.trim(),
        faculty: newStudent.faculty.trim(),
        matricNo: newStudent.matricNo.trim().toUpperCase(),
        contactNumber: newStudent.contactNumber.trim() || null,
        address: newStudent.address.trim() || null
      };
      
      const result = await studentApi.addNewStudent(studentData);
      
      await loadStudents();
      
      DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, {
        userId: result.userID,
        added: true,
        data: studentData
      });
      
      setAddModalVisible(false);
      setNewStudent({
        utmId: '',
        name: '',
        matricNo: '',
        faculty: '',
        email: '',
        contactNumber: '',
        address: ''
      });
      
      setSuccessMessage(`Student ${studentData.fullName} (${studentData.matricNo}) has been added successfully!`);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error adding student:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add student');
    } finally {
      setIsAdding(false);
    }
  };

  // Validation
  const validateNewStudent = () => {
    const errors = [];
    
    if (!newStudent.utmId.trim()) errors.push('UTM ID');
    if (!newStudent.name.trim()) errors.push('Full Name');
    if (!newStudent.matricNo.trim()) errors.push('Matric Number');
    if (!newStudent.faculty.trim()) errors.push('Faculty');
    if (!newStudent.email.trim()) errors.push('Email');
    
    if (newStudent.email.trim() && !validation.validateEmail(newStudent.email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    
    const matricRegex = /^A\d{2}[A-Z]{2}\d{4}$/;
    if (newStudent.matricNo.trim() && !matricRegex.test(newStudent.matricNo.trim().toUpperCase())) {
      Alert.alert('Error', 'Matric number must be in format: AXXXX0000 (e.g., A23CS0001)');
      return false;
    }
    
    if (errors.length > 0) {
      Alert.alert('Error', `Please fill in: ${errors.join(', ')}`);
      return false;
    }
    
    return true;
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Render student item
  const renderStudentItem = ({ item }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.fullName}</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>UTM ID:</Text>
          <Text style={styles.detailValue}>{item.utmID}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Matric No:</Text>
          <Text style={[styles.detailValue, styles.matricValue]}>{item.matricNo}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Faculty:</Text>
          <Text style={styles.detailValue}>{item.faculty}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={[styles.detailValue, styles.emailValue]}>{item.email}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Points:</Text>
          <Text style={[styles.detailValue, styles.pointsValue]}>{item.totalPoints || 0}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[
            styles.detailValue,
            item.accountStatus === 'active' ? styles.activeStatus : styles.inactiveStatus
          ]}>
            {item.accountStatus || 'Active'}
          </Text>
        </View>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewProfile(item)}
        >
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.accountButton]}
          onPress={() => navigation.navigate('ManageAccountSettings', {
            studentId: item.userID,
            isAdminView: true,
            studentName: item.fullName
          })}
        >
          <Text style={styles.actionButtonText}>Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeletePress(item)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading students...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Student List</Text>
            <Text style={styles.subtitle}>Manage Student Profiles • Real-time Sync</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by UTM ID, Matric No, Name or Faculty..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearSearch}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Header Stats */}
        <View style={styles.statsHeader}>
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              Total Students: <Text style={styles.statsNumber}>{students.length}</Text>
            </Text>
            {searchQuery && (
              <Text style={styles.statsText}>
                Found: <Text style={styles.statsNumber}>{filteredStudents.length}</Text>
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setAddModalVisible(true)}
          >
            <Text style={styles.addButtonText}>+ Add Student</Text>
          </TouchableOpacity>
        </View>

        {/* Student List */}
        <FlatList
          data={filteredStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.userID}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primaryLight]}
              tintColor={COLORS.primaryLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📋</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No matching students found' : 'No students found'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery 
                  ? 'Try a different search term'
                  : 'Add a new student using the button above'}
              </Text>
            </View>
          }
        />

        {/* Delete Confirmation Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Text style={styles.modalIcon}>🗑️</Text>
              <Text style={styles.modalTitle}>Confirm Delete</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete{'\n'}
                <Text style={styles.studentName}>{selectedStudent?.fullName}</Text>?
              </Text>
              <Text style={styles.modalDetails}>
                UTM ID: <Text style={styles.detailValue}>{selectedStudent?.utmID}</Text>{'\n'}
                Matric No: <Text style={styles.detailValue}>{selectedStudent?.matricNo}</Text>
              </Text>
              <Text style={styles.warningText}>
                This action cannot be undone.
              </Text>
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setDeleteModalVisible(false)}
                  disabled={isDeleting}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={confirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.modalButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Student Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={addModalVisible}
          onRequestClose={() => !isAdding && setAddModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.formModal}>
              <ScrollView 
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.modalTitle}>➕ Add New Student</Text>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>UTM ID *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newStudent.utmId}
                    onChangeText={(text) => setNewStudent(prev => ({...prev, utmId: text}))}
                    placeholder="UTM ID"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    editable={!isAdding}
                  />
                  <Text style={styles.formHint}>Unique identifier for UTM login</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newStudent.name}
                    onChangeText={(text) => setNewStudent(prev => ({...prev, name: text}))}
                    placeholder="Full Name"
                    placeholderTextColor="#999"
                    editable={!isAdding}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Matric No *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newStudent.matricNo}
                    onChangeText={(text) => setNewStudent(prev => ({...prev, matricNo: text}))}
                    placeholder="e.g., AXXXXXXXX"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                    editable={!isAdding}
                  />
                  <Text style={styles.formHint}>Format: AYYXXXXXX (e.g., A23CS0284)</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Faculty *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newStudent.faculty}
                    onChangeText={(text) => setNewStudent(prev => ({...prev, faculty: text}))}
                    placeholder="e.g., FC (Faculty of Computing)"
                    placeholderTextColor="#999"
                    autoCapitalize="characters"
                    editable={!isAdding}
                  />
                  <Text style={styles.formHint}>Enter faculty abbreviation (e.g., FC, FKE, FKM)</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newStudent.email}
                    onChangeText={(text) => setNewStudent(prev => ({...prev, email: text}))}
                    placeholder="e.g., UTM-ID@graduate.utm.my"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isAdding}
                  />
                  <Text style={styles.formHint}>Enter valid email address</Text>
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newStudent.contactNumber}
                    onChangeText={(text) => setNewStudent(prev => ({...prev, contactNumber: text}))}
                    placeholder="e.g., 01X-XXXXXXX"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    editable={!isAdding}
                  />
                </View>
                
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Address</Text>
                  <TextInput
                    style={[styles.formInput, styles.addressInput]}
                    value={newStudent.address}
                    onChangeText={(text) => setNewStudent(prev => ({...prev, address: text}))}
                    placeholder="e.g., L12a, KTHO, UTM SKUDAI"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                    editable={!isAdding}
                  />
                </View>
                
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => !isAdding && setAddModalVisible(false)}
                    disabled={isAdding}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={saveNewStudent}
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.modalButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
              <Text style={styles.modalIcon}>✅</Text>
              <Text style={styles.modalTitle}>Success!</Text>
              <Text style={styles.modalMessage}>{successMessage}</Text>
              <Text style={styles.syncNote}>Changes will sync across all screens</Text>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
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
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#C8E6C9',
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 15,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 18,
    color: COLORS.gray,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#999',
    fontWeight: 'bold',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  statsText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statsNumber: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
  },
  studentInfo: {
    marginBottom: 12,
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  matricValue: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
  emailValue: {
    color: COLORS.gray,
  },
  pointsValue: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  activeStatus: {
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  inactiveStatus: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    elevation: 1,
    borderWidth: 1,
  },
  viewButton: {
    backgroundColor: COLORS.lightBlue,
    borderColor: COLORS.secondary,
  },
  accountButton: {
    backgroundColor: COLORS.lightGreen,
    borderColor: COLORS.primaryLight,
  },
  deleteButton: {
    backgroundColor: COLORS.lightRed,
    borderColor: '#FFCDD2',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  viewButtonText: {
    color: COLORS.secondary,
  },
  accountButtonText: {
    color: COLORS.primaryDark,
  },
  deleteButtonText: {
    color: COLORS.danger,
  },
  emptyState: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 50,
    marginBottom: 20,
    color: COLORS.gray,
  },
  emptyStateText: {
    fontSize: 18,
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    elevation: 10,
  },
  formModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    width: '90%',
    maxHeight: '85%',
    elevation: 10,
  },
  successModal: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    elevation: 10,
  },
  modalIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  modalDetails: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 6,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '500',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  scrollContainer: {
    padding: 25,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  addressInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
    fontStyle: 'italic',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: COLORS.lightGray,
  },
  confirmButton: {
    backgroundColor: COLORS.danger,
  },
  saveButton: {
    backgroundColor: COLORS.primaryLight,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  syncNote: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default StudentList;