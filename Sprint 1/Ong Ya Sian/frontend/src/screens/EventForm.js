import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Button, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { createEvent } from '../../services/api';

export default function EventForm({ navigation }) {
  const [form, setForm] = useState({
    eventTitle: '', 
    eventDescription: '', 
    eventCategory: '', 
    eventStartDate: '', 
    eventEndDate: '', 
    rewardPoints: '0', 
    UTMMeritPoints: '0',
    createdBy: '1'
  });
  const [image, setImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [loading, setLoading] = useState(false);

  const selectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.7, // Lower quality for smaller file size
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: true, // This is key - we'll get base64 data
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
      Alert.alert('Error', 'Please enter a valid start date in YYYY-MM-DD format (e.g., 2024-12-25)');
      return false;
    }

    if (form.eventEndDate && !validateDate(form.eventEndDate)) {
      Alert.alert('Error', 'Please enter a valid end date in YYYY-MM-DD format (e.g., 2024-12-31)');
      return false;
    }

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
        // Use base64 image data instead of FormData
        dataToSend = {
          eventTitle: form.eventTitle.trim(),
          eventDescription: form.eventDescription.trim(),
          eventCategory: form.eventCategory.trim(),
          eventStartDate: form.eventStartDate,
          eventEndDate: form.eventEndDate || form.eventStartDate,
          rewardPoints: parseInt(form.rewardPoints) || 0,
          UTMMeritPoints: parseInt(form.UTMMeritPoints) || 0,
          createdBy: '1',
          eventImageBase64: base64Image, // Send as base64 string
          imageType: 'image/jpeg' // You can get this from the image object
        };
        console.log('📤 Sending JSON with base64 image');
        console.log('🖼️ Base64 image size:', base64Image.length, 'characters');
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
          createdBy: '1'
        };
        console.log('📤 Sending JSON without image');
      }

      console.log('🔄 Creating event with image:', base64Image ? 'Yes' : 'No');
      
      const res = await createEvent(dataToSend);
      
      console.log('✅ Create event response:', res);
      Alert.alert('Success', res.message || 'Event created successfully');
      
      // Reset form
      setForm({
        eventTitle: '', 
        eventDescription: '', 
        eventCategory: '', 
        eventStartDate: '', 
        eventEndDate: '', 
        rewardPoints: '0', 
        UTMMeritPoints: '0',
        createdBy: '1'
      });
      setImage(null);
      setBase64Image(null);
      
      navigation.navigate('EventList');
    } catch (error) {
      console.error('❌ Error creating event:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('Network error')) {
        errorMessage = 'Image upload failed. The image might be too large. Try a smaller image.';
      } else if (error.message.includes('Database error')) {
        errorMessage = 'Server database error. Please check backend logs.';
      }
      
      Alert.alert('Error', errorMessage);
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
      <Text style={styles.title}>Create New Event</Text>

      {/* Image Upload Section */}
      <Text style={styles.label}>Event Banner Image (Optional)</Text>
      <View style={styles.imageSection}>
        {image ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: image.uri }} style={styles.image} />
            <Text style={styles.imageInfo}>
              Selected: {image.name || 'image.jpg'}
            </Text>
            <Text style={styles.imageInfo}>
              Base64 ready: {base64Image ? 'Yes' : 'No'}
            </Text>
            <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
              <Text style={styles.removeImageText}>Remove Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imageUploadButton} onPress={selectImage}>
            <Text style={styles.imageUploadText}>+ Select Banner Image</Text>
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
        placeholder="e.g., Clean-Up, Recycling, Workshop, Awareness Campaign" 
        style={styles.input} 
        value={form.eventCategory}
        onChangeText={text => setForm({...form, eventCategory: text})}
        maxLength={50}
      />

      <Text style={styles.label}>Start Date *</Text>
      <TextInput 
        placeholder={`YYYY-MM-DD (e.g., ${getTodayDate()})`}
        style={styles.input} 
        value={form.eventStartDate}
        onChangeText={text => setForm({...form, eventStartDate: text})}
        keyboardType="numbers-and-punctuation"
      />
      <Text style={styles.helperText}>Format: YYYY-MM-DD (e.g., 2024-12-25)</Text>

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

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#4CAF50" />
        ) : (
          <>
            <Button title="Create Event" onPress={handleSubmit} color="#4CAF50" />
            <View style={styles.spacer} />
            <Button 
              title="Cancel" 
              color="#999" 
              onPress={() => navigation.goBack()} 
            />
          </>
        )}
      </View>

      <Text style={styles.note}>
        * Required fields: Title and Start Date
      </Text>
      <Text style={styles.note}>
        Using base64 image encoding to avoid FormData issues
      </Text>
    </ScrollView>
  );
}

// ... keep the same styles ...

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
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 5,
    marginBottom: 10,
  },
  imageInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  removeImageButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
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
  },
  note: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 5,
  }
});