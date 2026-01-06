import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  StyleSheet, 
  ScrollView, 
  Text, 
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { updateEvent } from '../../services/api';

export default function EditEvent({ route, navigation }) {
  const { event } = route.params;
  
  const [form, setForm] = useState({
    eventTitle: event.eventTitle || '',
    eventDescription: event.eventDescription || '',
    eventCategory: event.eventCategory || '',
    eventStartDate: event.eventStartDate ? event.eventStartDate.split('T')[0] : '',
    eventEndDate: event.eventEndDate ? event.eventEndDate.split('T')[0] : '',
    rewardPoints: event.rewardPoints?.toString() || '0',
    UTMMeritPoints: event.UTMMeritPoints?.toString() || '0',
    status: event.status || 'Upcoming'
  });
  
  const [image, setImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.7,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: true,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        Alert.alert('Error', 'Failed to select image');
        console.log('ImagePicker Error: ', response.error);
      } else if (response.assets && response.assets[0]) {
        const selectedImage = response.assets[0];
        
        setImage({
          uri: selectedImage.uri,
          name: selectedImage.fileName || `event_${Date.now()}.jpg`,
          type: selectedImage.type || 'image/jpeg',
        });
        
        // Store base64 data for upload
        if (selectedImage.base64) {
          setBase64Image(selectedImage.base64);
          console.log('📷 Base64 image data received, length:', selectedImage.base64.length);
        }
      }
    });
  };

  const removeImage = () => {
    setImage(null);
    setBase64Image(null);
  };

  const validateDate = (dateString) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const isValid = date instanceof Date && !isNaN(date);
    
    const [year, month, day] = dateString.split('-').map(Number);
    const isValidMonth = month >= 1 && month <= 12;
    const isValidDay = day >= 1 && day <= 31;
    
    return isValid && isValidMonth && isValidDay;
  };

  const validateForm = () => {
    if (!form.eventTitle.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return false;
    }
    if (!form.eventStartDate.trim()) {
      Alert.alert('Error', 'Please enter a start date');
      return false;
    }
    
    if (!validateDate(form.eventStartDate)) {
      Alert.alert('Error', 'Please enter a valid start date in YYYY-MM-DD format');
      return false;
    }

    if (form.eventEndDate && !validateDate(form.eventEndDate)) {
      Alert.alert('Error', 'Please enter a valid end date in YYYY-MM-DD format');
      return false;
    }

    // Validate date logic
    if (form.eventEndDate && form.eventEndDate < form.eventStartDate) {
      Alert.alert('Error', 'End date cannot be before start date');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let dataToSend;
      
      if (base64Image) {
        // Use base64 image data
        dataToSend = {
          eventTitle: form.eventTitle.trim(),
          eventDescription: form.eventDescription.trim(),
          eventCategory: form.eventCategory.trim(),
          eventStartDate: form.eventStartDate,
          eventEndDate: form.eventEndDate || form.eventStartDate,
          rewardPoints: parseInt(form.rewardPoints) || 0,
          UTMMeritPoints: parseInt(form.UTMMeritPoints) || 0,
          status: form.status || 'Upcoming',
          eventImageBase64: base64Image,
          imageType: 'image/jpeg'
        };
        console.log('📤 Sending JSON with base64 image for update');
      } else {
        // Use regular JSON without image
        dataToSend = {
          eventTitle: form.eventTitle.trim(),
          eventDescription: form.eventDescription.trim(),
          eventCategory: form.eventCategory.trim(),
          eventStartDate: form.eventStartDate,
          eventEndDate: form.eventEndDate || form.eventStartDate,
          rewardPoints: parseInt(form.rewardPoints) || 0,
          UTMMeritPoints: parseInt(form.UTMMeritPoints) || 0,
          status: form.status || 'Upcoming'
        };
        console.log('📤 Sending JSON without image for update');
      }

      console.log('🔄 Updating event:', event.eventID, 'with image:', base64Image ? 'Yes' : 'No');
      
      const res = await updateEvent(event.eventID, dataToSend);
      
      console.log('✅ Update event response:', res);
      Alert.alert('Success', res.message || 'Event updated successfully');
      navigation.navigate('EventList');
    } catch (error) {
      console.error('❌ Error updating event:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit Event</Text>

      {/* Image Upload Section */}
      <Text style={styles.label}>Event Banner Image</Text>
      <View style={styles.imageSection}>
        {event.eventImageURL ? (
          <View style={styles.imagePreview}>
            <Image 
              source={{ uri: `http://10.0.2.2:3000${event.eventImageURL}` }} 
              style={styles.image} 
            />
            <Text style={styles.currentImageText}>Current Image</Text>
          </View>
        ) : null}
        
        {image ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: image.uri }} style={styles.image} />
            <Text style={styles.newImageText}>New Image Selected</Text>
            <Text style={styles.imageInfo}>
              Base64 ready: {base64Image ? 'Yes' : 'No'}
            </Text>
            <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
              <Text style={styles.removeImageText}>Remove New Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imageUploadButton} onPress={selectImage}>
            <Text style={styles.imageUploadText}>
              {event.eventImageURL ? '+ Change Image' : '+ Select Banner Image'}
            </Text>
            <Text style={styles.imageHelperText}>Tap to choose from gallery</Text>
            <Text style={styles.imageHelperText}>Using base64 encoding</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Event Title *</Text>
      <TextInput 
        placeholder="Enter event title" 
        style={styles.input} 
        value={form.eventTitle}
        onChangeText={text => setForm({...form, eventTitle: text})}
        maxLength={100}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput 
        placeholder="Enter event description" 
        style={[styles.input, styles.textArea]} 
        multiline
        numberOfLines={4}
        value={form.eventDescription}
        onChangeText={text => setForm({...form, eventDescription: text})}
        maxLength={500}
      />

      <Text style={styles.label}>Category</Text>
      <TextInput 
        placeholder="e.g., Clean-Up, Recycling, Workshop" 
        style={styles.input} 
        value={form.eventCategory}
        onChangeText={text => setForm({...form, eventCategory: text})}
        maxLength={50}
      />

      {/* Start Date Input */}
      <Text style={styles.label}>Start Date *</Text>
      <TextInput 
        placeholder={`YYYY-MM-DD (e.g., ${getTodayDate()})`}
        style={styles.input} 
        value={form.eventStartDate}
        onChangeText={text => setForm({...form, eventStartDate: text})}
        keyboardType="numbers-and-punctuation"
      />
      <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2024-12-25)</Text>

      {/* End Date Input */}
      <Text style={styles.label}>End Date</Text>
      <TextInput 
        placeholder={`YYYY-MM-DD (optional)`}
        style={styles.input} 
        value={form.eventEndDate}
        onChangeText={text => setForm({...form, eventEndDate: text})}
        keyboardType="numbers-and-punctuation"
      />
      <Text style={styles.helperText}>Leave empty if same as start date</Text>

      <Text style={styles.label}>Reward Points</Text>
      <TextInput 
        placeholder="50" 
        style={styles.input} 
        keyboardType="numeric" 
        value={form.rewardPoints}
        onChangeText={text => setForm({...form, rewardPoints: text.replace(/[^0-9]/g, '')})}
      />

      <Text style={styles.label}>UTM Merit Points</Text>
      <TextInput 
        placeholder="5" 
        style={styles.input} 
        keyboardType="numeric" 
        value={form.UTMMeritPoints}
        onChangeText={text => setForm({...form, UTMMeritPoints: text.replace(/[^0-9]/g, '')})}
      />

      <Text style={styles.label}>Status</Text>
      <TextInput 
        placeholder="Upcoming, Ongoing, Completed" 
        style={styles.input} 
        value={form.status}
        onChangeText={text => setForm({...form, status: text})}
      />

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" />
        ) : (
          <>
            <Button title="Update Event" onPress={handleSubmit} color="#4CAF50" />
            <View style={styles.spacer} />
            <Button 
              title="Cancel" 
              color="#999" 
              onPress={() => navigation.goBack()} 
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20,
    backgroundColor: '#E8F5E8'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2E7D32'
  },
  label: { 
    fontWeight: 'bold', 
    marginBottom: 5, 
    marginTop: 10,
    color: '#2E7D32'
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#4CAF50',
    marginBottom: 5, 
    padding: 12,
    borderRadius: 5,
    backgroundColor: 'white'
  },
  textArea: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic'
  },
  imageSection: {
    marginBottom: 15,
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#F8FFF8',
  },
  imageUploadText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageHelperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginBottom: 5,
  },
  currentImageText: {
    color: '#666',
    fontStyle: 'italic',
  },
  newImageText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  imageInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  removeImageButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  removeImageText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonContainer: { 
    marginTop: 20,
    marginBottom: 30 
  },
  spacer: { 
    height: 10 
  }
});