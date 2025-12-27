import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Button, ScrollView, Alert, ActivityIndicator,
  Image, TextInput, TouchableOpacity, Modal, FlatList, PermissionsAndroid,
  Platform
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

export default function SmartScannerScreen({ navigation }) {
  const [detectedItems, setDetectedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualQuantity, setManualQuantity] = useState('1');
  const [cameraPermission, setCameraPermission] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(true);

  // Simplified waste categories
  const WASTE_CATEGORIES = [
    { id: 1, label: 'Glass', class: 'Glass', recyclable: true },
    { id: 2, label: 'Metal', class: 'Metal', recyclable: true },
    { id: 3, label: 'Paper', class: 'Paper', recyclable: true },
    { id: 4, label: 'Plastic', class: 'Plastic', recyclable: true },
    { id: 5, label: 'Non-Recyclable', class: 'Non-Recyclable', recyclable: false },
    { id: 6, label: 'Tyre', class: 'Tyre', recyclable: false },
  ];

  const MERIT_POINTS = {
    'Glass': 5, 'Metal': 8, 'Paper': 3, 'Plastic': 4, 'Non-Recyclable': 0, 'Tyre': 10,
  };

  // Class mapping for Flask server responses
  const CLASS_MAPPING = {
    '0': 'Plastic',
    '1': 'Glass',
    '2': 'Metal', 
    '3': 'Paper',
    '4': 'Non-Recyclable',
    '5': 'Tyre',
  };

  useEffect(() => {
    console.log('✅ Smart Scanner Ready - Flask AI Server Connected');
  }, []);

  // Helper function to find existing item by class
  const findExistingItem = (className) => {
    return detectedItems.find(item => item.class === className);
  };

  // Add or update item in the list
  const addOrUpdateItem = (newItem) => {
    setDetectedItems(prevItems => {
      const existingItem = findExistingItem(newItem.class);
      
      if (existingItem) {
        // If item exists, increase quantity
        return prevItems.map(item =>
          item.class === newItem.class 
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      } else {
        // If item doesn't exist, add new item
        return [...prevItems, newItem];
      }
    });
  };

  // Web API inference - Connect to your Flask server
  const runWebAPIInference = async (imageUri) => {
    try {
      console.log('Sending image to AI server...');
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'recyclable_item.jpg',
      });

      const API_URL = 'http://localhost:5000/predict';

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ AI Server Response:', result);
      
      if (result.success && result.detections) {
        return parseAPIResults(result.detections);
      } else {
        throw new Error(result.error || 'No detections received');
      }
      
    } catch (error) {
      console.error('Web API Error:', error);
      throw new Error(`AI detection failed: ${error.message}`);
    }
  };

  // Save image to laptop for AI improvement (manual confirmation)
  const uploadImageForAIImprovement = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please scan an image first before uploading for AI improvement.');
      return;
    }

    Alert.alert(
      'Improve AI Model',
      'Would you like to upload this image to help improve the AI model? This image will be used for future training.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upload for AI Training', 
          onPress: async () => {
            try {
              setIsProcessing(true);
              console.log('Uploading image for AI improvement...');
              
              const formData = new FormData();
              formData.append('image', {
                uri: selectedImage.uri,
                type: 'image/jpeg',
                name: `ai_training_${Date.now()}.jpg`,
              });
              
              // Add detected classes as metadata
              const detectedClasses = detectedItems.map(d => d.class);
              formData.append('detected_classes', JSON.stringify(detectedClasses));
              formData.append('timestamp', new Date().toISOString());

              const API_URL = 'http://localhost:5000/save_training_image';

              const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              });

              if (response.ok) {
                console.log('✅ Image uploaded for AI improvement');
                Alert.alert('Success', 'Image uploaded for AI training! 🎯\n\nThank you for helping improve the model!');
              } else {
                console.log('⚠️ Failed to upload image for AI improvement');
                Alert.alert('Info', 'AI improvement feature requires server setup.');
              }
              
            } catch (error) {
              console.error('Error uploading image for AI improvement:', error);
              Alert.alert('Info', 'AI improvement feature requires server setup.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  // Save data to laptop
  const saveDataToLaptop = async () => {
    if (detectedItems.length === 0) {
      Alert.alert('Error', 'No items to save');
      return;
    }

    try {
      const timestamp = new Date().toLocaleString();
      const totalItems = getTotalItems();
      const totalPoints = getTotalMeritPoints();
      
      const submissionData = {
        id: Date.now(),
        timestamp: timestamp,
        total_items: totalItems,
        total_points: totalPoints,
        items: detectedItems
      };

      const API_URL = 'http://localhost:5000/save_recycling_data';

      const response = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify(submissionData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        Alert.alert(
          'Success!', 
          `Data saved to laptop! 📁\n\nTotal Items: ${totalItems}\nTotal Points: ${totalPoints}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setDetectedItems([]);
                setSelectedImage(null);
              }
            }
          ]
        );
      } else {
        Alert.alert('Info', 'Data saving requires server setup.');
      }
      
    } catch (error) {
      Alert.alert('Info', 'Laptop saving requires server setup.');
    }
  };

  const parseAPIResults = (detections) => {
    if (!detections || detections.length === 0) {
      Alert.alert('No Detection', 'No recyclable items detected. Try a clearer image or use manual input.');
      return [];
    }

    const uniqueDetections = [];
    const seenClasses = new Set();

    detections.forEach((detection, index) => {
      const className = detection.class || CLASS_MAPPING[detection.class_id?.toString()] || 'Non-Recyclable';
      const confidence = detection.confidence || detection.score || 0.5;
      
      if (confidence > 0.3 && !seenClasses.has(className)) {
        seenClasses.add(className);
        
        const wasteCategory = WASTE_CATEGORIES.find(cat => 
          cat.class.toLowerCase() === className.toLowerCase()
        ) || WASTE_CATEGORIES.find(cat => cat.class === 'Non-Recyclable');

        uniqueDetections.push({
          id: Date.now() + index,
          label: wasteCategory?.label || className,
          confidence: confidence,
          recyclable: wasteCategory?.recyclable || false,
          class: wasteCategory?.class || className,
          quantity: 1,
          meritPoints: MERIT_POINTS[className] || 0,
          manual: false
        });
      }
    });

    if (uniqueDetections.length === 0) {
      Alert.alert('Low Confidence', 'Detections below confidence threshold. Use manual input.');
    }

    return uniqueDetections;
  };

  // Camera permission
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs camera access to scan recyclable items',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        setCameraPermission(false);
        return false;
      }
    } else {
      setCameraPermission(true);
      return true;
    }
  };

  // Take photo
  const takePhoto = async () => {
    if (!cameraPermission) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos');
        return;
      }
    }

    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 640,
      maxWidth: 640,
      quality: 0.8,
      saveToPhotos: false,
    };

    launchCamera(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled camera');
      } else if (response.error) {
        Alert.alert('Error', 'Camera error: ' + response.error);
      } else if (response.assets && response.assets[0]) {
        setIsProcessing(true);
        setSelectedImage(response.assets[0]);
        
        try {
          const detections = await runWebAPIInference(response.assets[0].uri);
          if (detections.length > 0) {
            // Use addOrUpdateItem instead of directly setting state
            detections.forEach(detection => {
              addOrUpdateItem(detection);
            });
            
            // Show appropriate message
            const newItems = detections.filter(detection => !findExistingItem(detection.class));
            const updatedItems = detections.filter(detection => findExistingItem(detection.class));
            
            let message = '';
            if (newItems.length > 0 && updatedItems.length > 0) {
              message = `Added ${newItems.length} new item(s) and updated ${updatedItems.length} existing item(s)!`;
            } else if (newItems.length > 0) {
              message = `Added ${newItems.length} new item(s)!`;
            } else {
              message = `Updated ${updatedItems.length} existing item(s)!`;
            }
            
            Alert.alert('Success', message);
          }
        } catch (error) {
          console.error('Processing error:', error);
          Alert.alert('Processing Error', error.message);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    setIsProcessing(true);
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 640,
        maxWidth: 640,
        quality: 0.8,
      },
      async (response) => {
        if (response.assets?.[0]) {
          setSelectedImage(response.assets[0]);
          try {
            const detections = await runWebAPIInference(response.assets[0].uri);
            if (detections.length > 0) {
              // Use addOrUpdateItem instead of directly setting state
              detections.forEach(detection => {
                addOrUpdateItem(detection);
              });
              
              // Show appropriate message
              const newItems = detections.filter(detection => !findExistingItem(detection.class));
              const updatedItems = detections.filter(detection => findExistingItem(detection.class));
              
              let message = '';
              if (newItems.length > 0 && updatedItems.length > 0) {
                message = `Added ${newItems.length} new item(s) and updated ${updatedItems.length} existing item(s)!`;
              } else if (newItems.length > 0) {
                message = `Added ${newItems.length} new item(s)!`;
              } else {
                message = `Updated ${updatedItems.length} existing item(s)!`;
              }
              
              Alert.alert('Success', message);
            }
          } catch (error) {
            console.error('Processing error:', error);
            Alert.alert('Processing Error', error.message);
          }
        }
        setIsProcessing(false);
      }
    );
  };

  // Manual input functions
  const addManualItem = (category) => {
    const quantity = parseInt(manualQuantity) || 1;
    
    const newItem = {
      id: Date.now(),
      label: category.label,
      confidence: 1.0,
      recyclable: category.recyclable,
      class: category.class,
      quantity: quantity,
      meritPoints: MERIT_POINTS[category.class],
      manual: true
    };

    // Use addOrUpdateItem to prevent duplicates
    addOrUpdateItem(newItem);
    setShowManualModal(false);
    setManualQuantity('1');
    
    const existingItem = findExistingItem(category.class);
    if (existingItem && existingItem.quantity > quantity) {
      Alert.alert('Updated', `${category.label} quantity increased to ${existingItem.quantity}!`);
    } else {
      Alert.alert('Added', `${category.label} added to list!`);
    }
  };

  const increaseQuantity = (id) => {
    setDetectedItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQuantity = (id) => {
    setDetectedItems(prevItems =>
      prevItems.map(item =>
        item.id === id && item.quantity > 1 
          ? { ...item, quantity: item.quantity - 1 } 
          : item
      )
    );
  };

  const updateQuantity = (id, newQuantity) => {
    const quantity = parseInt(newQuantity) || 1;
    setDetectedItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const removeItem = (id) => {
    setDetectedItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const getTotalItems = () => {
    return detectedItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalMeritPoints = () => {
    return detectedItems.reduce((total, item) => 
      total + (item.meritPoints * item.quantity), 0
    );
  };

  const getMeritPointsForItem = (item) => {
    return item.meritPoints * item.quantity;
  };

  const submitList = () => {
    if (detectedItems.length === 0) {
      Alert.alert('Empty List', 'Please add some items before saving');
      return;
    }

    Alert.alert(
      'Save Data',
      `Save this recycling data to laptop?\n\nTotal Items: ${getTotalItems()}\nTotal Points: ${getTotalMeritPoints()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: saveDataToLaptop }
      ]
    );
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.categoryItem,
        item.recyclable ? styles.recyclableCategory : styles.nonRecyclableCategory
      ]}
      onPress={() => addManualItem(item)}
    >
      <View style={styles.categoryContent}>
        <Text style={styles.categoryLabel}>{item.label}</Text>
        <Text style={styles.categoryPoints}>
          {MERIT_POINTS[item.class]} points {item.recyclable ? '♻️' : '🚫'}
        </Text>
        {findExistingItem(item.class) && (
          <Text style={styles.existingItemText}>
            Already in list: {findExistingItem(item.class).quantity}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>UTM ReMerit Scanner</Text>
        <Text style={styles.subtitle}>
          {modelLoaded ? 'AI Model Ready 🟢' : 'Loading AI Model... 🟡'}
        </Text>
        <Text style={styles.instruction}>
          Take photo → AI detection → Save data
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.imageContainer}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>📷</Text>
              <Text style={styles.placeholderSubtext}>Ready for AI detection</Text>
            </View>
          )}
          
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.processingText}>AI Processing Image...</Text>
            </View>
          )}
        </View>

        <View style={styles.controlContainer}>
          <View style={styles.scanButtons}>
            <Button 
              title="📸 AI Camera Scan" 
              onPress={takePhoto} 
              color="#4CAF50" 
              disabled={isProcessing} 
            />
            <View style={styles.spacer} />
            <Button 
              title="📁 AI Gallery Scan" 
              onPress={pickFromGallery} 
              color="#2196F3" 
              disabled={isProcessing} 
            />
          </View>
          
          {selectedImage && (
            <Button 
              title="🔄 Scan New Image" 
              onPress={() => setSelectedImage(null)} 
              color="#FF9800" 
              disabled={isProcessing}
            />
          )}
        </View>

        {/* Manual Input Button - Moved to top right of results section */}
        {detectedItems.length > 0 && (
          <View style={styles.manualInputHeader}>
            <Text style={styles.resultsTitle}>📋 Detected Items</Text>
            <TouchableOpacity 
              style={styles.manualInputButton} 
              onPress={() => setShowManualModal(true)}
            >
              <Text style={styles.manualInputButtonText}>➕ Add Manual</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Stats */}
        {detectedItems.length > 0 && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Detection Results</Text>
            <View style={styles.statsRow}>
              <Text style={styles.stat}>Items: {getTotalItems()}</Text>
              <Text style={styles.stat}>Types: {detectedItems.length}</Text>
              <Text style={[styles.stat, styles.meritHighlight]}>Points: {getTotalMeritPoints()}</Text>
            </View>
          </View>
        )}

        {/* Items List */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            {detectedItems.length > 0 ? '' : 'No items detected yet'}
          </Text>
          
          {detectedItems.length > 0 && (
            <View style={styles.itemsContainer}>
              {detectedItems.map((item) => (
                <View key={item.id} style={[
                  styles.itemCard,
                  item.recyclable ? styles.recyclableCard : styles.nonRecyclableCard
                ]}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.label}</Text>
                      <Text style={styles.itemClass}>
                        {item.class} {item.manual && '(Manual)'}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => removeItem(item.id)}>
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.itemDetails}>
                    {!item.manual && (
                      <Text style={styles.itemConfidence}>AI Confidence: {(item.confidence * 100).toFixed(0)}%</Text>
                    )}
                    
                    <Text style={[
                      styles.recyclableText,
                      item.recyclable ? styles.recyclable : styles.nonRecyclable
                    ]}>
                      {item.recyclable ? '♻️ Recyclable' : '🚫 Non-Recyclable'}
                    </Text>

                    <View style={styles.meritContainer}>
                      <Text style={styles.meritLabel}>UTM Merit Points:</Text>
                      <Text style={styles.meritValue}>
                        {item.meritPoints} pts × {item.quantity} = 
                        <Text style={styles.totalMerit}> {getMeritPointsForItem(item)} pts</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Quantity Controls */}
                  <View style={styles.quantityContainer}>
                    <Text style={styles.quantityLabel}>Quantity:</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity style={styles.quantityButton} onPress={() => decreaseQuantity(item.id)}>
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      
                      <TextInput
                        style={styles.quantityInput}
                        value={item.quantity.toString()}
                        onChangeText={(text) => updateQuantity(item.id, text)}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                      
                      <TouchableOpacity style={styles.quantityButton} onPress={() => increaseQuantity(item.id)}>
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons - Below the list */}
        {detectedItems.length > 0 && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity style={styles.improveAIButton} onPress={uploadImageForAIImprovement}>
              <Text style={styles.improveAIButtonText}>🧠 Improve AI Model</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveDataButton} onPress={submitList}>
              <Text style={styles.saveDataButtonText}>💾 Save Data to Laptop</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Manual Add Modal */}
      <Modal visible={showManualModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Item Manually</Text>
            <Text style={styles.modalSubtitle}>Select waste category:</Text>
            
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <View style={styles.quantityModalControls}>
              <TouchableOpacity 
                style={styles.quantityButton} 
                onPress={() => setManualQuantity(Math.max(1, parseInt(manualQuantity) - 1).toString())}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.quantityModalInput}
                value={manualQuantity}
                onChangeText={setManualQuantity}
                keyboardType="numeric"
                maxLength={2}
              />
              
              <TouchableOpacity 
                style={styles.quantityButton} 
                onPress={() => setManualQuantity((parseInt(manualQuantity) || 1 + 1).toString())}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={WASTE_CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={item => item.id.toString()}
              style={styles.categoriesList}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowManualModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
    color: '#4CAF50',
  },
  instruction: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    color: '#666',
    fontStyle: 'italic',
  },
  imageContainer: {
    height: 300,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#555',
    padding: 20,
  },
  placeholderText: {
    fontSize: 60,
    marginBottom: 15,
  },
  placeholderSubtext: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  controlContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  scanButtons: {
    marginBottom: 10,
  },
  spacer: {
    height: 10,
  },
  // New manual input header style
  manualInputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  manualInputButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  manualInputButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  statsContainer: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976D2',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  meritHighlight: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 8,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  itemsContainer: {
    // No fixed height - will expand with content
  },
  itemCard: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  recyclableCard: {
    backgroundColor: '#E8F5E8',
    borderLeftColor: '#4CAF50',
  },
  nonRecyclableCard: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#FF5722',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemClass: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    color: '#FF5722',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDetails: {
    marginBottom: 8,
  },
  itemConfidence: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recyclableText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  recyclable: {
    color: '#4CAF50',
  },
  nonRecyclable: {
    color: '#FF5722',
  },
  meritContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.1)',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  meritLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  meritValue: {
    fontSize: 14,
    color: '#666',
  },
  totalMerit: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#f0f0f0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 8,
    width: 50,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Action buttons container
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  improveAIButton: {
    backgroundColor: '#9C27B0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  improveAIButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveDataButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveDataButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  quantityModalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  quantityModalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesList: {
    maxHeight: 400,
  },
  categoryItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  recyclableCategory: {
    backgroundColor: '#E8F5E8',
    borderLeftColor: '#4CAF50',
  },
  nonRecyclableCategory: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#FF5722',
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  categoryPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  existingItemText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalButtons: {
    marginTop: 16,
  },
  cancelButton: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});