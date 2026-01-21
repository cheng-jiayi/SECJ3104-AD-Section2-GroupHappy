import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import axios from 'axios';

export default function RegistrationScreen({ navigation }) {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    utmID: '',
    matricNo: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    faculty: '',
    yearOfStudy: '1',
    contactNumber: '',
    address: ''
  });

  const [loading, setLoading] = useState(false);

  const API_BASE_URL = 'http://10.0.2.2:5000';

  // Define required fields at the component level
  const requiredFields = [
    'fullName', 'username', 'email', 'utmID', 'matricNo', 
    'password', 'confirmPassword', 'role', 'faculty', 'yearOfStudy'
  ];

  // Faculty options that match the database ENUM
  const faculties = [
    'FABU (Faculty of Built Environment & Surveying)',
    'FS (Faculty of Science)',
    'FKT (Faculty of Technical and Vocational Education)',
    'FKE (Faculty of Electrical Engineering)',
    'FK (Faculty of Mechanical and Manufacturing Engineering)',
    'FKM (Faculty of Chemical and Energy Engineering)',
    'FSSH (Faculty of Social Sciences and Humanities)',
    'FEST (Faculty of Engineering Technology)',
    'FM (Faculty of Management)',
    'SPACE (Faculty of Architecture, Planning & Surveying)'
  ];

  // Function to extract faculty code from faculty string
  const getFacultyCode = (facultyString) => {
    return facultyString.split(' ')[0];
  };

  // Function to get faculty from matric number
  const getFacultyFromMatric = (matricNo) => {
    if (!matricNo || matricNo.length < 6) return '';
    const code = matricNo.substring(4, 6); // Get the 5th and 6th characters
    const facultyMap = {
      'CS': 'FK',   // Computer Science -> Mechanical & Manufacturing
      'EE': 'FKE',  // Electrical Engineering
      'ME': 'FK',   // Mechanical Engineering
      'CE': 'FKM',  // Chemical Engineering
      'CV': 'FABU', // Civil Engineering -> Built Environment
      'SC': 'FS',   // Science
      'SS': 'FSSH', // Social Sciences
      'ED': 'FKT',  // Education
      'AR': 'SPACE',// Architecture
      'MG': 'FM',   // Management
      'ET': 'FEST', // Engineering Technology
      'BU': 'FABU', // Built Environment
      'EN': 'FKE',  // Engineering (general)
    };
    return facultyMap[code] || '';
  };

  // Validate faculty code
  const validateFaculty = (facultyInput) => {
    const facultyCode = getFacultyCode(facultyInput);
    const validFacultyCodes = ['FABU', 'FS', 'FKT', 'FKE', 'FK', 'FKM', 'FSSH', 'FEST', 'FM', 'SPACE'];
    return validFacultyCodes.includes(facultyCode.toUpperCase());
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-detect faculty when matric number is entered
    if (field === 'matricNo' && value.length >= 6) {
      const detectedFaculty = getFacultyFromMatric(value.toUpperCase());
      if (detectedFaculty && !formData.faculty) {
        // Find the full faculty name for the detected code
        const fullFaculty = faculties.find(f => getFacultyCode(f) === detectedFaculty);
        if (fullFaculty) {
          setFormData(prev => ({
            ...prev,
            faculty: fullFaculty
          }));
        }
      }
    }

    // CRITICAL: When faculty is changed, ensure we store the full string
    if (field === 'faculty') {
      // The value should already be the full faculty string from the dropdown
      console.log('Faculty selected:', value);
      console.log('Extracted code:', getFacultyCode(value));
    }
  };

  const handleRegister = async () => {
  // Debug: Log the actual value of fullName
  console.log('=== DEBUGGING FORM VALUES ===');
  console.log('fullName value:', JSON.stringify(formData.fullName));
  console.log('fullName length:', formData.fullName.length);
  
  // Add more detailed debugging for all fields
  console.log('=== VALIDATING ALL FIELDS ===');
  
  // CRITICAL FIX: Ensure we're extracting faculty code properly
  const facultyCode = getFacultyCode(formData.faculty);
  console.log('Faculty input:', formData.faculty);
  console.log('Extracted faculty code:', facultyCode);
  
  const fieldDetails = requiredFields.map(field => {
    const value = formData[field];
    
    // Handle different data types for validation
    let trimmed;
    if (typeof value === 'string') {
      trimmed = value.trim();
    } else if (typeof value === 'number') {
      trimmed = value.toString().trim();
    } else {
      trimmed = value ? value.toString().trim() : '';
    }
    
    const isEmpty = !trimmed || trimmed.length === 0;
    console.log(`${field}: "${value}" (type: ${typeof value}, trimmed: "${trimmed}", empty: ${isEmpty})`);
    return { field, value, trimmed, isEmpty };
  });

  const missingFields = fieldDetails.filter(item => item.isEmpty);
  
  console.log('Missing fields:', missingFields.map(f => f.field));
  
  if (missingFields.length > 0) {
    Alert.alert(
      'Validation Error', 
      `Please fill in all required fields.\nMissing: ${missingFields.map(f => f.field).join(', ')}`
    );
    return;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    Alert.alert('Validation Error', 'Please enter a valid email address');
    return;
  }

  // Matric number validation
  const matricRegex = /^A\d{2}[A-Z]{2}\d{4}$/;
  if (!matricRegex.test(formData.matricNo.toUpperCase())) {
    Alert.alert('Validation Error', 'Matric number must be in format A23CS0001');
    return;
  }

  // Faculty validation - check extracted code
  if (!facultyCode || !validateFaculty(formData.faculty)) {
    Alert.alert(
      'Validation Error', 
      'Invalid faculty code. Please use one of:\nFABU, FS, FKT, FKE, FK, FKM, FSSH, FEST, FM, SPACE'
    );
    return;
  }

  // Password validation
  if (formData.password.length < 6) {
    Alert.alert('Validation Error', 'Password must be at least 6 characters long');
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    Alert.alert('Validation Error', 'Passwords do not match');
    return;
  }

  setLoading(true);

  try {
    // Trim all string values before sending
    const registrationData = {
      fullName: formData.fullName.trim(),  // Send as fullName (matching server expectation)
      name: formData.fullName.trim(),      // Also send as name for compatibility
      username: formData.username.trim(),
      password: formData.password.trim(),
      role: formData.role.trim(),
      // Additional fields
      email: formData.email.trim(),
      utmID: formData.utmID.trim(),
      matricNo: formData.matricNo.trim().toUpperCase(),
      faculty: facultyCode, // CRITICAL: Send only the extracted code, not the full string
      yearOfStudy: parseInt(formData.yearOfStudy),
      contactNumber: formData.contactNumber ? formData.contactNumber.trim() : null,
      address: formData.address ? formData.address.trim() : null
    };

    console.log('=== SENDING DATA TO SERVER ===');
    console.log('Registration data:', JSON.stringify(registrationData, null, 2));
    console.log('Faculty code being sent:', registrationData.faculty);
    console.log('Making POST request to:', `${API_BASE_URL}/register`);
    
    const res = await axios.post(`${API_BASE_URL}/register`, registrationData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Registration response:', res.data);
    
    if (res.data.success) {
      Alert.alert(
        'Success 🎉', 
        `${res.data.message}\n\nUsername: ${formData.username}\nRole: ${formData.role}\nStudent ID: ${formData.matricNo.toUpperCase()}`,
        [{ text: 'Login Now', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert('Registration Failed', res.data.error || 'Unknown error');
    }

  } catch (err) {
    console.error('Registration error:', err);
    console.error('Error details:', err.response?.data);
    console.error('Error status:', err.response?.status);
    console.error('Error headers:', err.response?.headers);
    
    if (err.response) {
      Alert.alert(
        'Registration Failed', 
        `Error ${err.response.status}: ${JSON.stringify(err.response?.data?.error || err.response?.data?.message || 'Unknown error')}`
      );
    } else if (err.request) {
      Alert.alert(
        'Connection Error', 
        'Cannot connect to server. Please check your connection and try again.'
      );
    } else {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  } finally {
    setLoading(false);
  }
};

  // Helper function to check if all required fields are filled
  const checkAllFieldsFilled = () => {
    return requiredFields.every(field => {
      const value = formData[field];
      if (typeof value === 'string') {
        return value.trim().length > 0;
      } else if (typeof value === 'number') {
        return true; // Numbers are always truthy
      } else {
        return value && value.toString().trim().length > 0;
      }
    });
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>UTM ReMerit Registration</Text>
          <Text style={styles.subtitle}>Create your account</Text>

          {/* Personal Information Section */}
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput 
              placeholder="John Doe" 
              placeholderTextColor="#999"
              style={styles.input} 
              value={formData.fullName} 
              onChangeText={(text) => handleChange('fullName', text)}
              autoCapitalize="words"
              onBlur={() => {
                // Trim when user leaves the field
                handleChange('fullName', formData.fullName.trim());
              }}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Username *</Text>
              <TextInput 
                placeholder="johndoe" 
                placeholderTextColor="#999"
                style={styles.input} 
                value={formData.username} 
                onChangeText={(text) => handleChange('username', text)}
                autoCapitalize="none"
                onBlur={() => {
                  handleChange('username', formData.username.trim());
                }}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Role *</Text>
              <View style={styles.pickerContainer}>
                <TextInput 
                  placeholder="student" 
                  placeholderTextColor="#999"
                  style={styles.input} 
                  value={formData.role} 
                  onChangeText={(text) => handleChange('role', text)}
                  autoCapitalize="none"
                  editable={false}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput 
              placeholder="john.doe@graduate.utm.my" 
              placeholderTextColor="#999"
              style={styles.input} 
              value={formData.email} 
              onChangeText={(text) => handleChange('email', text)}
              autoCapitalize="none"
              keyboardType="email-address"
              onBlur={() => {
                handleChange('email', formData.email.trim());
              }}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>UTM ID *</Text>
              <TextInput 
                placeholder="UTM12345" 
                placeholderTextColor="#999"
                style={styles.input} 
                value={formData.utmID} 
                onChangeText={(text) => handleChange('utmID', text)}
                autoCapitalize="none"
                onBlur={() => {
                  handleChange('utmID', formData.utmID.trim());
                }}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Matric No *</Text>
              <TextInput 
                placeholder="A23CS0001" 
                placeholderTextColor="#999"
                style={styles.input} 
                value={formData.matricNo} 
                onChangeText={(text) => handleChange('matricNo', text)}
                autoCapitalize="characters"
                onBlur={() => {
                  handleChange('matricNo', formData.matricNo.trim().toUpperCase());
                }}
              />
            </View>
          </View>

          {/* Academic Information Section */}
          <Text style={styles.sectionTitle}>Academic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Faculty *</Text>
            <TextInput 
              placeholder="e.g., FK for Computer Science" 
              placeholderTextColor="#999"
              style={styles.input} 
              value={formData.faculty} 
              onChangeText={(text) => handleChange('faculty', text)}
              onBlur={() => {
                // Ensure we only keep the faculty code
                const facultyCode = getFacultyCode(formData.faculty);
                if (facultyCode) {
                  // Find the full name for this code
                  const fullFaculty = faculties.find(f => getFacultyCode(f) === facultyCode.toUpperCase());
                  if (fullFaculty) {
                    handleChange('faculty', fullFaculty);
                  } else {
                    // If not found, just keep the code in uppercase
                    handleChange('faculty', facultyCode.toUpperCase());
                  }
                }
              }}
            />
            <Text style={styles.helperText}>
              Valid codes: FABU, FS, FKT, FKE, FK, FKM, FSSH, FEST, FM, SPACE
            </Text>
            {formData.matricNo.length >= 6 && (
              <Text style={[styles.helperText, { color: '#2196F3' }]}>
                Detected faculty from matric {formData.matricNo}: {getFacultyFromMatric(formData.matricNo) || 'Unknown'}
              </Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Year of Study *</Text>
              <TextInput 
                placeholder="1" 
                placeholderTextColor="#999"
                style={styles.input} 
                value={formData.yearOfStudy} 
                onChangeText={(text) => handleChange('yearOfStudy', text)}
                keyboardType="number-pad"
                onBlur={() => {
                  handleChange('yearOfStudy', formData.yearOfStudy.trim());
                }}
              />
            </View>

            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Contact Number</Text>
              <TextInput 
                placeholder="012-3456789" 
                placeholderTextColor="#999"
                style={styles.input} 
                value={formData.contactNumber} 
                onChangeText={(text) => handleChange('contactNumber', text)}
                keyboardType="phone-pad"
                onBlur={() => {
                  handleChange('contactNumber', formData.contactNumber.trim());
                }}
              />
            </View>
          </View>

          {/* Security Section */}
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <TextInput 
              placeholder="Minimum 6 characters" 
              placeholderTextColor="#999"
              style={styles.input} 
              secureTextEntry 
              value={formData.password} 
              onChangeText={(text) => handleChange('password', text)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput 
              placeholder="Re-enter your password" 
              placeholderTextColor="#999"
              style={styles.input} 
              secureTextEntry 
              value={formData.confirmPassword} 
              onChangeText={(text) => handleChange('confirmPassword', text)}
            />
          </View>

          {/* Address (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address (Optional)</Text>
            <TextInput 
              placeholder="e.g., Kolej Rahman Putra, UTM" 
              placeholderTextColor="#999"
              style={[styles.input, styles.multilineInput]} 
              value={formData.address} 
              onChangeText={(text) => handleChange('address', text)}
              multiline
              numberOfLines={2}
              onBlur={() => {
                handleChange('address', formData.address.trim());
              }}
            />
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By registering, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>Login Here</Text>
            </TouchableOpacity>
          </View>

          {/* Required Fields Note */}
          <Text style={styles.noteText}>* Required fields</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold',
    textAlign: 'center', 
    marginBottom: 5, 
    color: '#1A5F7A' 
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 10,
    color: '#2E7D32',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 5,
  },
  inputContainer: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  input: { 
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
    minHeight: 40,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    backgroundColor: '#fafafa',
  },
  helperText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Debug Styles
  debugContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    padding: 12,
    marginTop: 15,
    marginBottom: 15,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  termsContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 6,
    marginTop: 15,
    marginBottom: 15,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  registerButton: {
    backgroundColor: '#1A5F7A',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#81C784',
    opacity: 0.8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  loginText: {
    color: '#777',
    marginRight: 4,
    fontSize: 13,
  },
  loginButton: {
    padding: 3,
  },
  loginButtonText: {
    color: '#1A5F7A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  noteText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});