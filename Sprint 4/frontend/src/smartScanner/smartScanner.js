import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Button, ScrollView, Alert, ActivityIndicator,
  Image, TextInput, TouchableOpacity, Modal, FlatList, PermissionsAndroid,
  Platform, KeyboardAvoidingView
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SmartScannerScreen({ navigation, route }) {
  const [detectedItems, setDetectedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualQuantity, setManualQuantity] = useState('1');
  const [manualUnit, setManualUnit] = useState('units');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Check if coming from AddContribution
  const isFromAddContribution = route.params?.fromAddContribution || false;
  const event = route.params?.event || null;

  // Load current user from navigation params or AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔄 Loading user data...');
        
        // Try to get user from navigation params first (passed from StudentHomeScreen)
        const userFromParams = route.params?.user;
        
        if (userFromParams) {
          console.log('✅ User from navigation params:', userFromParams.username);
          setCurrentUser(userFromParams);
          
          // Store in AsyncStorage for future use
          await AsyncStorage.setItem('currentUser', JSON.stringify(userFromParams));
          return;
        }
        
        // If no params, try AsyncStorage
        const storedUser = await AsyncStorage.getItem('currentUser');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('✅ User from AsyncStorage:', userData.username);
          setCurrentUser(userData);
        } else {
          console.warn('⚠️ No user data found');
        }
        
      } catch (error) {
        console.error('❌ Error loading user:', error);
      }
    };
    
    loadUserData();
    console.log('✅ Smart Scanner Ready - Flask AI Server Connected');
    
    // If coming from AddContribution with existing items, load them
    if (route.params?.scannedItems) {
      console.log('📦 Loading existing scanned items from AddContribution:', route.params.scannedItems);
      setDetectedItems(route.params.scannedItems);
    }
  }, [route.params?.user, route.params?.scannedItems]);

  // Helper function to reload user data
  const reloadUserData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        console.log('✅ User reloaded:', user.username);
        Alert.alert('Success', 'User data reloaded successfully!');
        return user;
      } else {
        Alert.alert('No User Found', 'Please login first.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Error reloading user:', error);
    }
    return null;
  };

  // Waste categories matching your database MaterialType table (ONLY 4 CATEGORIES)
  const WASTE_CATEGORIES = [
    { 
      id: 1, 
      label: 'Paper', 
      class: 'Paper', 
      recyclable: true, 
      unit: 'kg',
      hasWeight: true,
      measurementUnit: 'kg',
      pointsPerUnit: null,
      pointsPerKg: 10  // From your SQL: pointsPerKg = 10
    },
    { 
      id: 2, 
      label: 'Plastic', 
      class: 'Plastic', 
      recyclable: true, 
      unit: 'units',
      hasWeight: false,
      measurementUnit: 'units',
      pointsPerUnit: 4,  // From your SQL: pointsPerUnit = 4
      pointsPerKg: null
    },
    { 
      id: 3, 
      label: 'Glass', 
      class: 'Glass', 
      recyclable: true, 
      unit: 'units',
      hasWeight: false,
      measurementUnit: 'units',
      pointsPerUnit: 5,  // From your SQL: pointsPerUnit = 5
      pointsPerKg: null
    },
    { 
      id: 4, 
      label: 'Metal', 
      class: 'Metal', 
      recyclable: true, 
      unit: 'units',
      hasWeight: false,
      measurementUnit: 'units',
      pointsPerUnit: 8,  // From your SQL: pointsPerUnit = 8
      pointsPerKg: null
    }
  ];

  // Class mapping for Flask server responses (ONLY 4 CATEGORIES)
  const CLASS_MAPPING = {
    '0': 'Plastic',
    '1': 'Glass',
    '2': 'Metal', 
    '3': 'Paper'
  };

  // Helper function to find existing item by class
  const findExistingItem = (className) => {
    return detectedItems.find(item => item.class === className);
  };

  // Add or update item in the list
  const addOrUpdateItem = (newItem) => {
    setDetectedItems(prevItems => {
      const existingItem = findExistingItem(newItem.class);
      
      if (existingItem) {
        // If item exists, increase quantity/weight
        return prevItems.map(item =>
          item.class === newItem.class 
            ? { 
                ...item, 
                quantity: parseFloat((item.quantity + newItem.quantity).toFixed(2)),
                weight: item.class === 'Paper' ? parseFloat((item.weight + newItem.weight).toFixed(2)) : item.weight,
                meritPoints: calculateItemPoints({
                  class: item.class,
                  quantity: parseFloat((item.quantity + newItem.quantity).toFixed(2)),
                  weight: item.class === 'Paper' ? parseFloat((item.weight + newItem.weight).toFixed(2)) : item.weight
                })
              }
            : item
        );
      } else {
        // If item doesn't exist, add new item
        return [...prevItems, { 
          ...newItem,
          weight: newItem.class === 'Paper' ? newItem.quantity : 0,
          meritPoints: calculateItemPoints({
            class: newItem.class,
            quantity: newItem.quantity,
            weight: newItem.class === 'Paper' ? newItem.quantity : 0
          })
        }];
      }
    });
  };

  // Calculate points for an item based on database logic
  const calculateItemPoints = (item) => {
    const category = WASTE_CATEGORIES.find(cat => cat.class === item.class);
    if (!category) return 0;
    
    if (category.measurementUnit === 'kg' && category.pointsPerKg) {
      return item.weight * category.pointsPerKg;
    } else if (category.pointsPerUnit) {
      return item.quantity * category.pointsPerUnit;
    }
    return 0;
  };

  // Calculate merit points for display (for AddContribution)
  const calculateItemMeritPoints = (item) => {
    const category = WASTE_CATEGORIES.find(cat => cat.class === item.class);
    if (!category) return 0;
    
    if (category.measurementUnit === 'kg' && category.pointsPerKg) {
      return item.weight * category.pointsPerKg;
    } else if (category.pointsPerUnit) {
      return item.quantity * category.pointsPerUnit;
    }
    return 0;
  };

  // Web API inference - Connect to your Flask server
  const runWebAPIInference = async (imageUri) => {
    try {
      console.log('📤 Sending image to AI server...');
      
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'recyclable_item.jpg',
      });

      const API_URL = 'http://10.0.2.2:5000/predict';

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
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

  // Save image for AI training
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
              
              const detectedClasses = detectedItems.map(d => d.class);
              formData.append('detected_classes', JSON.stringify(detectedClasses));
              formData.append('timestamp', new Date().toISOString());

              const API_URL = 'http://10.0.2.2:5000/save_training_image';

              const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
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

  // Save data to database 
  const saveDataToDatabase = async () => {
    console.log('🔍 Debug: Checking user before save:', {
      currentUser,
      hasUserID: currentUser?.userID,
      username: currentUser?.username
    });

    if (detectedItems.length === 0) {
      Alert.alert('Empty List', 'Please scan or add items first');
      return;
    }

    // Check for valid user with userID
    if (!currentUser?.userID) {
      console.error('❌ No valid user found:', currentUser);
      
      Alert.alert(
        'Login Required',
        'Please login to save your recycling data.\n\nWould you like to:',
        [
          { 
            text: 'Go to Login', 
            onPress: () => navigation.navigate('Login')
          },
          { 
            text: 'Try Reloading User', 
            onPress: async () => {
              try {
                const storedUser = await AsyncStorage.getItem('currentUser');
                if (storedUser) {
                  const user = JSON.parse(storedUser);
                  setCurrentUser(user);
                  console.log('✅ User reloaded from storage:', user.username);
                  Alert.alert('Success', 'User reloaded! Try saving again.');
                } else {
                  Alert.alert('Not Logged In', 'Please login first');
                  navigation.navigate('Login');
                }
              } catch (error) {
                console.error('Error reloading user:', error);
              }
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel' 
          }
        ]
      );
      return;
    }

    try {
      setIsProcessing(true);
      
      // Prepare data for each item
      const scannedItems = detectedItems.map(item => {
        // Convert class to lowercase to match database ENUM
        const materialType = item.class.toLowerCase();
        
        // Calculate points based on category
        const category = WASTE_CATEGORIES.find(cat => cat.class === item.class);
        let pointsEarned = 0;
        
        if (category) {
          if (item.class === 'Paper') {
            pointsEarned = item.weight * category.pointsPerKg;
          } else {
            pointsEarned = item.quantity * category.pointsPerUnit;
          }
        }
        
        return {
          userID: currentUser.userID,
          material_type: materialType,  // Lowercase to match database
          quantity: parseFloat(item.quantity.toFixed(2)),
          points_earned: Math.round(pointsEarned),  // Renamed to match database
          weight: item.class === 'Paper' ? parseFloat(item.quantity.toFixed(2)) : 0,
          weight_unit: item.class === 'Paper' ? 'kg' : 'units',
          recyclable: true,  // All are recyclable in our 4 categories
          confidence: item.confidence || 1.0,
          manual_entry: item.manual || false,  // Renamed to match database
          ai_detected: !item.manual,
          transaction_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          scan_method: selectedImage ? 'ai' : 'manual',
          status: 'finalized',
          corrected: false
        };
      });

      // Calculate totals
      const totalItems = detectedItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalWeight = detectedItems.reduce((sum, item) => sum + (item.weight || 0), 0);
      const totalPoints = scannedItems.reduce((sum, item) => sum + item.points_earned, 0);

      console.log('📊 Preparing to save:', {
        userID: currentUser.userID,
        username: currentUser.username,
        totalItems,
        totalWeight,
        totalPoints,
        itemsCount: detectedItems.length
      });

      // Prepare submission data
      const submissionData = {
        userID: currentUser.userID,
        items: scannedItems,
        scanData: {
          totalItems: Math.round(totalItems),
          totalWeight: parseFloat(totalWeight.toFixed(2)),
          totalPoints: totalPoints,
          scanMethod: selectedImage ? 'ai' : 'manual',
          notes: `Recyclable items scan - ${detectedItems.map(item => item.label).join(', ')}`
        },
        imageData: selectedImage ? {
          imagePath: selectedImage.uri,
          imageType: 'scan'
        } : null,
        isForContribution: isFromAddContribution ? true : false  // ← ADD THIS LINE
      };

      // Save to database - UPDATED ENDPOINT
      const API_URL = 'http://10.0.2.2:5000/api/save-recycling-transaction';
      console.log('📤 Sending to:', API_URL);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();
      console.log('✅ Server response:', result);

      if (result.success) {
        Alert.alert(
          'Success! 🎉', 
          `Your recycling data has been saved!\n\n• Items: ${result.totalItems || Math.round(totalItems)}\n• Points: ${result.totalPoints || totalPoints}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset only on success
                setDetectedItems([]);
                setSelectedImage(null);
                setIsProcessing(false);
                
                // If coming from AddContribution, navigate back with transaction ID
                if (isFromAddContribution) {
                  navigation.goBack({ 
                    scannedItems: detectedItems,
                    recyclingTransactionID: result.transactionID 
                  });
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Save Failed', result.error || 'Could not save to database');
        setIsProcessing(false);
      }
      
    } catch (error) {
      console.error('❌ Save error:', error);
      Alert.alert('Network Error', 'Could not connect to server. Check your connection.');
      setIsProcessing(false);
    }
  };

  // Add this function to handle saving and continuing to EcoMap
  const handleSaveAndContinue = async () => {
    if (detectedItems.length === 0) {
      Alert.alert('No Items', 'Please scan some items first');
      return;
    }

    console.log('💾 Saving items and continuing to EcoMap:', {
      fromAddContribution: isFromAddContribution,
      itemsCount: detectedItems.length,
      event: event?.eventTitle
    });
    
    // If coming from AddContributionScreen, navigate to EcoMap with scanned items
    if (isFromAddContribution) {
      // Calculate merit points for all items
      const itemsWithMeritPoints = detectedItems.map(item => ({
        ...item,
        meritPoints: calculateItemMeritPoints(item)
      }));
      
      navigation.navigate('EcoMap', {
        user: currentUser,
        event: event,
        scannedItems: itemsWithMeritPoints,
        fromAddContribution: true,
        returnTo: 'AddContribution'
      });
    } else {
      // Regular save flow
      saveDataToDatabase();
    }
  };

  // Parse API results from Flask server
  const parseAPIResults = (detections) => {
    if (!detections || detections.length === 0) {
      Alert.alert('No Detection', 'No recyclable items detected. Try a clearer image or use manual input.');
      return [];
    }

    const uniqueDetections = [];
    const seenClasses = new Set();

    detections.forEach((detection, index) => {
      const className = detection.class || CLASS_MAPPING[detection.class_id?.toString()];
      
      // Only process if className exists in CLASS_MAPPING (one of our 4 categories)
      if (!className) return;
      
      const confidence = detection.confidence || detection.score || 0.5;
      
      if (confidence > 0.3 && !seenClasses.has(className)) {
        seenClasses.add(className);
        
        const wasteCategory = WASTE_CATEGORIES.find(cat => 
          cat.class.toLowerCase() === className.toLowerCase()
        );

        // Skip if category not found
        if (!wasteCategory) return;
        
        const unit = wasteCategory.unit;
        const quantity = className === 'Paper' ? 0.5 : 1;
        const weight = className === 'Paper' ? 0.5 : 0;
        const meritPoints = calculateItemMeritPoints({
          class: className,
          quantity: quantity,
          weight: weight
        });
        
        uniqueDetections.push({
          id: Date.now() + index,
          label: wasteCategory.label,
          confidence: confidence,
          recyclable: wasteCategory.recyclable,
          class: wasteCategory.class,
          quantity: quantity,
          weight: weight,
          unit: unit,
          meritPoints: meritPoints,
          manual: false
        });
      }
    });

    if (uniqueDetections.length === 0) {
      Alert.alert('Low Confidence', 'Detections below confidence threshold. Use manual input.');
    }

    return uniqueDetections;
  };

  // Get unit for item type
  const getUnitForItem = (className) => {
    const category = WASTE_CATEGORIES.find(cat => cat.class === className);
    return category ? category.unit : 'units';
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
            detections.forEach(detection => {
              addOrUpdateItem(detection);
            });
            
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
              detections.forEach(detection => {
                addOrUpdateItem(detection);
              });
              
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
  const selectCategoryForManual = (category) => {
    setSelectedCategory(category);
    setManualUnit(category.unit);
    if (category.class === 'Paper') {
      setManualQuantity('0.5'); // Default 0.5 kg for paper
    } else {
      setManualQuantity('1'); // Default 1 unit for others
    }
  };

  const addManualItem = () => {
    if (!selectedCategory) {
      Alert.alert('No Category', 'Please select a waste category first');
      return;
    }

    const quantity = parseFloat(manualQuantity) || (selectedCategory.class === 'Paper' ? 0.5 : 1);
    const weight = selectedCategory.class === 'Paper' ? quantity : 0;
    const meritPoints = calculateItemMeritPoints({
      class: selectedCategory.class,
      quantity: quantity,
      weight: weight
    });
    
    const newItem = {
      id: Date.now(),
      label: selectedCategory.label,
      confidence: 1.0,
      recyclable: selectedCategory.recyclable,
      class: selectedCategory.class,
      quantity: quantity,
      weight: weight,
      unit: selectedCategory.unit,
      meritPoints: meritPoints,
      manual: true
    };

    // Use addOrUpdateItem to prevent duplicates
    addOrUpdateItem(newItem);
    
    const existingItem = findExistingItem(selectedCategory.class);
    if (existingItem && existingItem.quantity > quantity) {
      Alert.alert('Updated', `${selectedCategory.label} ${selectedCategory.unit === 'kg' ? 'weight' : 'quantity'} increased to ${existingItem.quantity.toFixed(2)} ${selectedCategory.unit}!`);
    } else {
      Alert.alert('Added', `${selectedCategory.label} added to list!`);
    }
    
    // Reset modal
    setSelectedCategory(null);
    setShowManualModal(false);
    setManualQuantity('1');
    setManualUnit('units');
  };

  const increaseQuantity = (id) => {
    setDetectedItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const increment = item.class === 'Paper' ? 0.1 : 1;
          const newQuantity = parseFloat((item.quantity + increment).toFixed(2));
          const newWeight = item.class === 'Paper' ? newQuantity : item.weight;
          const newMeritPoints = calculateItemMeritPoints({
            class: item.class,
            quantity: newQuantity,
            weight: newWeight
          });
          
          return { 
            ...item, 
            quantity: newQuantity,
            weight: newWeight,
            meritPoints: newMeritPoints
          };
        }
        return item;
      })
    );
  };

  const decreaseQuantity = (id) => {
    setDetectedItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const decrement = item.class === 'Paper' ? 0.1 : 1;
          const newQuantity = Math.max(
            item.class === 'Paper' ? 0.1 : 1, 
            parseFloat((item.quantity - decrement).toFixed(2))
          );
          const newWeight = item.class === 'Paper' ? newQuantity : item.weight;
          const newMeritPoints = calculateItemMeritPoints({
            class: item.class,
            quantity: newQuantity,
            weight: newWeight
          });
          
          return { 
            ...item, 
            quantity: newQuantity,
            weight: newWeight,
            meritPoints: newMeritPoints
          };
        }
        return item;
      })
    );
  };

  const updateQuantity = (id, newQuantity) => {
    const quantity = parseFloat(newQuantity) || (detectedItems.find(item => item.id === id)?.class === 'Paper' ? 0.5 : 1);
    const minQuantity = detectedItems.find(item => item.id === id)?.class === 'Paper' ? 0.1 : 1;
    const finalQuantity = Math.max(minQuantity, parseFloat(quantity.toFixed(2)));
    
    setDetectedItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const newWeight = item.class === 'Paper' ? finalQuantity : item.weight;
          const newMeritPoints = calculateItemMeritPoints({
            class: item.class,
            quantity: finalQuantity,
            weight: newWeight
          });
          
          return { 
            ...item, 
            quantity: finalQuantity,
            weight: newWeight,
            meritPoints: newMeritPoints
          };
        }
        return item;
      })
    );
  };

  const removeItem = (id) => {
    setDetectedItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const getTotalItems = () => {
    return detectedItems.reduce((total, item) => {
      return total + 1; // Count each item as 1 regardless of quantity/weight
    }, 0);
  };

  const getTotalWeight = () => {
    return detectedItems.reduce((total, item) => {
      return total + (item.weight || 0);
    }, 0).toFixed(2);
  };

  const calculateTotalPoints = () => {
    const total = detectedItems.reduce((total, item) => {
      return total + calculateItemPoints(item);
    }, 0);
    return Math.round(total);
  };

  const getTotalMeritPoints = () => {
    return detectedItems.reduce((total, item) => 
      total + (item.meritPoints || 0), 0
    ).toFixed(2);
  };

  const getMeritPointsForItem = (item) => {
    return (item.meritPoints || 0).toFixed(2);
  };

  const getDisplayQuantity = (item) => {
    if (item.class === 'Paper') {
      return `${item.quantity.toFixed(2)} kg`;
    } else {
      return `${item.quantity} ${item.unit}`;
    }
  };

  const submitList = () => {
    if (detectedItems.length === 0) {
      Alert.alert('Empty List', 'Please add some items before saving');
      return;
    }

    if (!currentUser) {
      Alert.alert('Login Required', 'Please login first to save data');
      return;
    }

    const totalWeight = getTotalWeight();
    const weightDisplay = totalWeight > 0 ? `\nTotal Paper Weight: ${totalWeight} kg` : '';
    
    Alert.alert(
      'Save Data',
      `Save this recycling data to database?${weightDisplay}\n\nTotal Items: ${getTotalItems()}\nTotal Points: ${calculateTotalPoints()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: saveDataToDatabase }
      ]
    );
  };

  // Handle back button press differently based on where we came from
  const handleBackPress = () => {
    if (isFromAddContribution && detectedItems.length > 0) {
      Alert.alert(
        'Save Items?',
        'You have unsaved scanned items. Do you want to save them and return to Add Contribution?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => navigation.goBack() 
          },
          { 
            text: 'Save & Return', 
            onPress: () => {
              // Calculate merit points for all items
              const itemsWithMeritPoints = detectedItems.map(item => ({
                ...item,
                meritPoints: calculateItemMeritPoints(item)
              }));
              
              navigation.navigate('AddContribution', {
                user: currentUser,
                event: event,
                scannedItems: itemsWithMeritPoints
              });
            }
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.categoryItem,
        styles.recyclableCategory,
        selectedCategory?.id === item.id && styles.selectedCategory
      ]}
      onPress={() => selectCategoryForManual(item)}
    >
      <View style={styles.categoryContent}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryLabel}>{item.label}</Text>
          <Text style={styles.categoryUnit}>({item.unit})</Text>
        </View>
        <Text style={styles.categoryPoints}>
          {item.class === 'Paper' 
            ? `${item.pointsPerKg} points/kg ♻️` 
            : `${item.pointsPerUnit} points/unit ♻️`
          }
        </Text>
        {findExistingItem(item.class) && (
          <Text style={styles.existingItemText}>
            Already in list: {findExistingItem(item.class).quantity.toFixed(2)} {item.unit}
          </Text>
        )}
        {selectedCategory?.id === item.id && (
          <Text style={styles.selectedIndicator}>✓ Selected</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Custom Header with back button */}
        {/* <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isFromAddContribution ? `Scan for ${event?.eventTitle}` : "Let's Scan with AI"}
          </Text>
          <View style={styles.headerRight} />
        </View> */}
        
        {isFromAddContribution && (
          <View style={styles.eventBanner}>
            <Text style={styles.eventBannerText}>
              Scanning for: <Text style={styles.eventBannerTitle}>{event?.eventTitle}</Text>
            </Text>
            <Text style={styles.eventBannerSubtext}>
              Items scanned here will be added to your contribution
            </Text>
          </View>
        )}
        
        <Text style={styles.subtitle}>
          {modelLoaded ? 'AI Model Ready 🟢' : 'Loading AI Model... 🟡'}
        </Text>
        <Text style={styles.instruction}>
          Paper measured in kg, others in units (Plastic, Glass, Metal)
        </Text>
        
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
        </View>

        {/* Manual Input Button */}
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
              <Text style={[styles.stat, styles.pointHighlight]}>
                Points: {isFromAddContribution ? getTotalMeritPoints() : calculateTotalPoints()}
              </Text>
            </View>
            {parseFloat(getTotalWeight()) > 0 && (
              <View style={styles.weightContainer}>
                <Text style={styles.weightText}>📦 Total Paper Weight: {getTotalWeight()} kg</Text>
              </View>
            )}
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
                <View key={item.id} style={[styles.itemCard, styles.recyclableCard]}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.label}</Text>
                      <View style={styles.itemClassRow}>
                        <Text style={styles.itemClass}>
                          {item.class} {item.manual && '(Manual)'}
                        </Text>
                        <Text style={styles.itemUnit}>
                          ({getUnitForItem(item.class)})
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => removeItem(item.id)}>
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.itemDetails}>
                    {!item.manual && (
                      <Text style={styles.itemConfidence}>AI Confidence: {(item.confidence * 100).toFixed(0)}%</Text>
                    )}
                    
                    <Text style={[styles.recyclableText, styles.recyclable]}>
                      ♻️ Recyclable
                    </Text>

                    <View style={styles.pointContainer}>
                      <Text style={styles.pointLabel}>Rewards Points:</Text>
                      <Text style={styles.pointValue}>
                        {isFromAddContribution ? getMeritPointsForItem(item) : calculateItemPoints(item)} pts
                      </Text>
                    </View>
                  </View>

                  {/* Quantity/Weight Controls */}
                  <View style={styles.quantityContainer}>
                    <Text style={styles.quantityLabel}>
                      {item.class === 'Paper' ? 'Weight (kg):' : 'Quantity:'}
                    </Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity style={styles.quantityButton} onPress={() => decreaseQuantity(item.id)}>
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      
                      <TextInput
                        style={styles.quantityInput}
                        value={item.quantity.toString()}
                        onChangeText={(text) => updateQuantity(item.id, text)}
                        keyboardType="decimal-pad"
                        maxLength={item.class === 'Paper' ? 6 : 3}
                      />
                      
                      <TouchableOpacity style={styles.quantityButton} onPress={() => increaseQuantity(item.id)}>
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.unitDisplay}>{getDisplayQuantity(item)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {detectedItems.length > 0 && (
          <View style={styles.actionButtonsContainer}>
            {!isFromAddContribution && (
              <TouchableOpacity style={styles.improveAIButton} onPress={uploadImageForAIImprovement}>
                <Text style={styles.improveAIButtonText}>🧠 Improve AI Model</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.saveDataButton} 
              onPress={isFromAddContribution ? handleSaveAndContinue : saveDataToDatabase}
            >
              <Text style={styles.saveDataButtonText}>
                {isFromAddContribution ? 'Continue to EcoMap' : '💾 Save to Database'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Manual Add Modal */}
      <Modal visible={showManualModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Item Manually</Text>
            <Text style={styles.modalSubtitle}>
              Select waste category (all recyclable):
            </Text>
            
            {/* Selected Category Display */}
            {selectedCategory && (
              <View style={styles.selectedCategoryDisplay}>
                <Text style={styles.selectedCategoryTitle}>Selected: {selectedCategory.label}</Text>
                <Text style={styles.selectedCategoryUnit}>Unit: {selectedCategory.unit}</Text>
                <Text style={styles.selectedCategoryPoints}>
                  Points: {selectedCategory.class === 'Paper' 
                    ? `${selectedCategory.pointsPerKg} per kg` 
                    : `${selectedCategory.pointsPerUnit} per unit`}
                </Text>
              </View>
            )}

            {/* Quantity/Weight Input */}
            <Text style={styles.quantityLabel}>
              {selectedCategory?.class === 'Paper' ? 'Weight (kg):' : 'Quantity:'}
            </Text>
            <View style={styles.quantityModalControls}>
              <TouchableOpacity 
                style={styles.quantityButton} 
                onPress={() => {
                  const current = parseFloat(manualQuantity) || (selectedCategory?.class === 'Paper' ? 0.5 : 1);
                  const decrement = selectedCategory?.class === 'Paper' ? 0.1 : 1;
                  const newValue = Math.max(
                    selectedCategory?.class === 'Paper' ? 0.1 : 1,
                    parseFloat((current - decrement).toFixed(2))
                  );
                  setManualQuantity(newValue.toString());
                }}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              
              <TextInput
                style={styles.quantityModalInput}
                value={manualQuantity}
                onChangeText={setManualQuantity}
                keyboardType="decimal-pad"
                maxLength={selectedCategory?.class === 'Paper' ? 6 : 3}
                placeholder={selectedCategory?.class === 'Paper' ? '0.5' : '1'}
              />
              
              <TouchableOpacity 
                style={styles.quantityButton} 
                onPress={() => {
                  const current = parseFloat(manualQuantity) || (selectedCategory?.class === 'Paper' ? 0.5 : 1);
                  const increment = selectedCategory?.class === 'Paper' ? 0.1 : 1;
                  const newValue = parseFloat((current + increment).toFixed(2));
                  setManualQuantity(newValue.toString());
                }}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            {selectedCategory && (
              <Text style={styles.unitDisplay}>
                {parseFloat(manualQuantity) || 0} {selectedCategory.unit}
              </Text>
            )}

            {/* Category List */}
            <FlatList
              data={WASTE_CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={item => item.id.toString()}
              style={styles.categoriesList}
              showsVerticalScrollIndicator={false}
            />

            {/* Action Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]} 
                onPress={() => {
                  setShowManualModal(false);
                  setSelectedCategory(null);
                  setManualQuantity('1');
                  setManualUnit('units');
                }}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.addButton, !selectedCategory && styles.disabledButton]} 
                onPress={addManualItem}
                disabled={!selectedCategory}
              >
                <Text style={styles.actionButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E7D32',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  eventBanner: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  eventBannerText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  eventBannerTitle: {
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  eventBannerSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    paddingHorizontal: 16,
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
    marginBottom: 10,
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
    marginBottom: 8,
  },
  stat: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  pointHighlight: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  weightContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#BBDEFB',
  },
  weightText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    textAlign: 'center',
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
  itemClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  itemClass: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  itemUnit: {
    fontSize: 12,
    color: '#888',
    marginLeft: 6,
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
  pointContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.1)',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  pointLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  pointValue: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  totalMerit: {
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 4,
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
    width: 60,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unitDisplay: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
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
  selectedCategoryDisplay: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  selectedCategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  selectedCategoryUnit: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 4,
  },
  selectedCategoryPoints: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  quantityModalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quantityModalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesList: {
    maxHeight: 300,
  },
  categoryItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  recyclableCategory: {
    backgroundColor: '#E8F5E8',
    borderLeftColor: '#4CAF50',
  },
  selectedCategory: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryUnit: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 4,
  },
  existingItemText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  selectedIndicator: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});