import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios'; 

export default function AddContributionScreen({ route, navigation }) {
  const { user, event } = route.params;
  
  const [selectedBin, setSelectedBin] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventCurrentPoints, setEventCurrentPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(true);
  
  const [contributionData, setContributionData] = useState({
    eventID: event?.eventID,
    eventTitle: event?.eventTitle,
    studentID: user?.studentID || user?.utmID || user?.username,
    totalPoints: 0,
    totalItems: 0,
    totalWeight: 0
  });

  // Function to calculate points based on database logic
  const calculateItemPoints = (item) => {
    if (!item || !item.class) return 0;
    
    const className = item.class.toLowerCase();
    
    // Match database point calculation exactly
    if (className === 'paper') {
      // Paper: 10 points per kg (pointsPerKg = 10 from MaterialType table)
      const weight = parseFloat(item.weight) || parseFloat(item.quantity) || 0;
      return Math.round(weight * 10);
    } else if (className === 'plastic') {
      // Plastic: 4 points per unit (pointsPerUnit = 4)
      const quantity = parseFloat(item.quantity) || 1;
      return Math.round(quantity * 4);
    } else if (className === 'glass') {
      // Glass: 5 points per unit (pointsPerUnit = 5)
      const quantity = parseFloat(item.quantity) || 1;
      return Math.round(quantity * 5);
    } else if (className === 'metal') {
      // Metal: 8 points per unit (pointsPerUnit = 8)
      const quantity = parseFloat(item.quantity) || 1;
      return Math.round(quantity * 8);
    }
    return 0;
  };

  // Get student ID like MyEventsScreen
  const getStudentID = () => {
    const id = user?.studentID || user?.matricNo || user?.utmID || user?.username || user?.id;
    console.log('🔍 AddContribution - User fields:', {
      studentID: user?.studentID,
      matricNo: user?.matricNo,
      utmID: user?.utmID,
      username: user?.username,
      id: user?.id
    });
    console.log('✅ AddContribution - Selected studentID:', id);
    return id ? String(id) : null;
  };

  // Load scanned items from navigation params if coming from SmartScanner
  useEffect(() => {
    console.log('📱 AddContributionScreen loaded with:', { 
      user: user?.username,
      eventID: event?.eventID,
      eventTitle: event?.eventTitle
    });

    fetchEventCurrentPoints();
    
    // Check if we have scanned items from SmartScanner
    if (route.params?.scannedItems) {
      console.log('📦 Loaded scanned items:', route.params.scannedItems);
      setScannedItems(route.params.scannedItems);
      
      // Calculate totals using correct point calculation
      const totals = calculateTotals(route.params.scannedItems);
      setContributionData(prev => ({
        ...prev,
        totalPoints: totals.points,
        totalItems: totals.items,
        totalWeight: totals.weight
      }));
    }
    
    // Check if we have selected bin from EcoMap
    if (route.params?.selectedBin) {
      console.log('🗑️ Loaded selected bin:', route.params.selectedBin);
      setSelectedBin(route.params.selectedBin);
    }
  }, [route.params]);

  const fetchEventCurrentPoints = async () => {
    try {
      setLoadingPoints(true);
      const studentID = getStudentID();
      
      if (!studentID || !event?.eventID) {
        console.log('⚠️ Missing studentID or eventID');
        setEventCurrentPoints(0);
        return;
      }
      
      console.log(`📊 Fetching current points for event ${event.eventID}, student ${studentID}`);
      
      const response = await axios.get(
        `http://10.0.2.2:3000/participation/points/${studentID}/${event.eventID}`,
        { timeout: 5000 }
      );
      
      console.log('📊 Points response:', response.data);
      
      // Get current points from response
      const currentPoints = Number(response.data.currentPoints) || 0;
      setEventCurrentPoints(currentPoints);
      
      console.log(`✅ Current points for event ${event.eventID}: ${currentPoints}`);
      
    } catch (error) {
      console.error('❌ Error fetching event points:', error.message);
      setEventCurrentPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  };

  // Function to refresh points after contribution
  const refreshEventPoints = async () => {
    try {
      const studentID = getStudentID();
      
      if (!studentID || !event?.eventID) return;
      
      console.log('🔄 Refreshing event points after contribution...');
      
      const response = await axios.get(
        `http://10.0.2.2:3000/participation/points/${studentID}/${event.eventID}`,
        { timeout: 5000 }
      );
      
      const updatedPoints = Number(response.data.currentPoints) || 0;
      setEventCurrentPoints(updatedPoints);
      
      console.log(`✅ Updated points: ${updatedPoints}`);
      
    } catch (error) {
      console.error('❌ Error refreshing points:', error.message);
    }
  };

  const calculateTotals = (items) => {
    let totalPoints = 0;
    let totalItems = 0;
    let totalWeight = 0;
    
    items.forEach(item => {
      totalItems += parseFloat(item.quantity) || 1;
      totalWeight += parseFloat(item.weight) || 0;
      totalPoints += calculateItemPoints(item); // Use corrected function
    });
    
    return {
      points: Math.round(totalPoints),
      items: Math.round(totalItems),
      weight: parseFloat(totalWeight.toFixed(2))
    };
  };

  const handleStartScanning = () => {
    console.log('🔍 Navigating to SmartScanner with:', {
      user: { ...user, studentID: getStudentID() },
      event: event,
      fromAddContribution: true
    });
    
    navigation.navigate('SmartScanner', {
      user: { ...user, studentID: getStudentID() },
      event: event,
      fromAddContribution: true
    });
  };

  const handleSelectBin = () => {
    console.log('🗺️ Navigating to EcoMap with:', {
      user: user,
      event: event,
      scannedItems: scannedItems,
      fromAddContribution: true,
      returnTo: 'AddContribution'
    });
    
    navigation.navigate('EcoMap', {
      user: user,
      event: event,
      scannedItems: scannedItems,
      fromAddContribution: true,
      returnTo: 'AddContribution'
    });
  };

  const handleSubmitContribution = async () => {
    if (!selectedBin) {
      Alert.alert('Missing Bin', 'Please select a recycling bin location');
      return;
    }

    if (scannedItems.length === 0) {
      Alert.alert('No Items', 'Please scan some recyclable items first');
      return;
    }

    // Check if items already have transactionID (were already saved in SmartScanner)
    const hasExistingTransaction = scannedItems.some(item => item.transactionID);
    
    // Calculate total points from database logic
    const totalPointsEarned = scannedItems.reduce((total, item) => {
      return total + calculateItemPoints(item);
    }, 0);

    Alert.alert(
      'Submit Contribution',
      `${hasExistingTransaction ? '⚠️ Using previously saved scan\n\n' : ''}` +
      `Event: ${event.eventTitle}\n` +
      `Items: ${contributionData.totalItems}\n` +
      `Points: ${totalPointsEarned}\n` +
      `Location: ${selectedBin.bin_name || selectedBin.location_description}\n\n` +
      `${hasExistingTransaction ? 'Note: Points already saved in SmartScanner' : 'Ready to submit contribution?'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              
              let recyclingTransactionID;
              
              if (!hasExistingTransaction) {
                // Only save recycling transaction if it wasn't already saved
                console.log('📦 Saving NEW recycling transaction...');
                const recyclingResponse = await fetch('http://10.0.2.2:3000/api/save-recycling-transaction', {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  body: JSON.stringify({
                    userID: user.userID,
                    items: scannedItems.map(item => ({
                      material_type: item.class.toLowerCase(),
                      quantity: parseFloat(item.quantity.toFixed(2)),
                      points_earned: calculateItemPoints(item),
                      weight: item.class === 'Paper' ? parseFloat(item.quantity.toFixed(2)) : 0,
                      scan_method: item.manual ? 'manual' : 'ai',
                      confidence: item.confidence || 1.0,
                      manual_entry: item.manual || false,
                      ai_detected: !item.manual,
                      recyclable: true,
                      corrected: false
                    })),
                    isForContribution: true  // Add this flag
                  })
                });
                console.log('📦 Recycling transaction response status:', recyclingResponse.status);
                const recyclingResult = await recyclingResponse.json();
                console.log('📦 Recycling transaction result:', recyclingResult);
                
                if (!recyclingResponse.ok) {
                  throw new Error(recyclingResult.error || recyclingResult.message || 'Failed to save recycling transaction');
                }
                
                recyclingTransactionID = recyclingResult.transactionID;
                console.log('✅ New transaction saved with ID:', recyclingTransactionID);
              } else {
                // Use existing transaction ID from SmartScanner
                recyclingTransactionID = scannedItems[0].transactionID;
                console.log('📦 Using EXISTING transaction ID from SmartScanner:', recyclingTransactionID);
              }

              // Save contribution with skipStudentPointsUpdate flag
              console.log('🎯 Saving contribution...');
              const contributionResponse = await fetch('http://10.0.2.2:3000/contribution/add', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      studentID: getStudentID(),
                      eventID: event.eventID,
                      recyclingTransactionID: recyclingTransactionID,
                      stationID: selectedBin.station_id || selectedBin.stationID,
                      pointsEarned: totalPointsEarned,
                      skipStudentPointsUpdate: hasExistingTransaction  // Skip student points if already saved
                  })
              });

              console.log('🎯 Contribution response status:', contributionResponse.status);
              const contributionResult = await contributionResponse.json();
              console.log('🎯 Contribution result:', contributionResult);

              if (contributionResponse.ok) {
                // IMPORTANT: DO NOT update user points here!
                // Points are already updated in:
                // 1. SmartScanner (for existing transactions)
                // 2. The /contribution/add endpoint already updates participation points
                // 3. Student points are ONLY updated if skipStudentPointsUpdate = false
                console.log('ℹ️ Student points handling:', {
                  hasExistingTransaction,
                  skipStudentPointsUpdate: hasExistingTransaction,
                  pointsEarned: totalPointsEarned
                });
                
                await refreshEventPoints();

                const newTotalPoints = eventCurrentPoints + (hasExistingTransaction ? 0 : totalPointsEarned);
                const requiredPoints = event.rewardPoints || 0;
                const pointsMet = newTotalPoints >= requiredPoints;

                Alert.alert(
                  'Success! 🎉',
                  `Contribution submitted successfully!\n\n` +
                  `Event: ${event.eventTitle}\n` +
                  `Points: ${totalPointsEarned}\n` +
                  `Items Recycled: ${contributionData.totalItems}\n` +
                  `${hasExistingTransaction ? '(Points already saved earlier)\n' : ''}` +
                  `\n📊 Progress Update:\n` +
                  `Previous Points: ${eventCurrentPoints}\n` +
                  `New Total: ${newTotalPoints} / ${requiredPoints}\n` +
                  `Status: ${pointsMet ? '✅ Ready to Complete!' : '📈 Keep Going!'}`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate back to MyEvents with refresh flag
                        navigation.navigate('MyEvents', { 
                          user: user,
                          shouldRefresh: true 
                        });
                      }
                    }
                  ]
                );
              } else {
                throw new Error(contributionResult.error || contributionResult.message || 'Failed to add contribution');
              }
              
            } catch (error) {
              console.error('❌ Submission error:', error);
              Alert.alert('Submission Failed', error.message || 'Please check your connection and try again');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  // Check if items have existing transaction
  const hasExistingTransaction = scannedItems.some(item => item.transactionID);
  
  // Calculate points after contribution correctly (0 for existing transactions, full points for new)
  const totalPointsAfterContribution = eventCurrentPoints + (hasExistingTransaction ? 0 : contributionData.totalPoints);
  const requiredPoints = event?.rewardPoints || 0;
  const pointsMet = totalPointsAfterContribution >= requiredPoints;

  const renderItemCard = (item, index) => {
    const itemPoints = calculateItemPoints(item);
    
    return (
      <View key={index} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemIcon, { backgroundColor: getItemColor(item.class) }]}>
            <Icon name={getItemIcon(item.class)} size={20} color="#fff" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.label}</Text>
            <Text style={styles.itemClass}>{item.class} {item.manual && '(Manual)'}</Text>
            {item.transactionID && (
              <Text style={styles.existingTransaction}>✓ Already saved</Text>
            )}
          </View>
          <Text style={styles.itemPoints}>+{itemPoints} pts</Text>
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemQuantity}>
            {item.class === 'Paper' 
              ? `Weight: ${(item.weight || 0).toFixed(2)} kg`
              : `Quantity: ${item.quantity} units`
            }
          </Text>
          {!item.manual && item.confidence && (
            <Text style={styles.itemConfidence}>
              AI Confidence: {(item.confidence * 100).toFixed(0)}%
            </Text>
          )}
        </View>
      </View>
    );
  };

  const getItemIcon = (type) => {
    switch (type) {
      case 'Paper': return 'file-document';
      case 'Plastic': return 'bottle-soda';
      case 'Glass': return 'glass-mug';
      case 'Metal': return 'cog';
      default: return 'recycle';
    }
  };

  const getItemColor = (type) => {
    switch (type) {
      case 'Paper': return '#FF9800';
      case 'Plastic': return '#2196F3';
      case 'Glass': return '#795548';
      case 'Metal': return '#607D8B';
      default: return '#4CAF50';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Contribution</Text>
        <View style={styles.headerRight} />
      </View> */}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Info */}
        <View style={styles.eventCard}>
          <Text style={styles.sectionTitle}>Event</Text>
          <Text style={styles.eventTitle}>{event?.eventTitle || 'No Event Selected'}</Text>
          <Text style={styles.eventDescription}>
            {event?.eventDescription || 'Add your recycling contribution to this event'}
          </Text>
          <View style={styles.eventStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Required Points</Text>
              <Text style={styles.statValue}>{event?.rewardPoints || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Your Points</Text>
              {loadingPoints ? (
                <ActivityIndicator size="small" color="#4CAF50" />
              ) : (
                <Text style={[
                  styles.statValue,
                  { color: eventCurrentPoints >= (event?.rewardPoints || 0) ? '#4CAF50' : '#FF9800' }
                ]}>
                  {eventCurrentPoints}
                </Text>
              )}
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>New Points</Text>
              <Text style={[styles.statValue, { color: '#2196F3' }]}>
                +{hasExistingTransaction ? 0 : contributionData.totalPoints}
              </Text>
            </View>
          </View>
          
          {/* Progress Summary */}
          <View style={styles.progressSummary}>
            <Text style={styles.progressSummaryTitle}>Progress Summary</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { 
                    width: `${Math.min(100, (totalPointsAfterContribution / (requiredPoints || 1)) * 100)}%`,
                    backgroundColor: pointsMet ? '#4CAF50' : '#FF9800'
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {loadingPoints ? 'Loading...' : 
                `${totalPointsAfterContribution} / ${requiredPoints} points ` +
                `(${Math.round((totalPointsAfterContribution / (requiredPoints || 1)) * 100)}%)`
              }
            </Text>
            {!loadingPoints && (
              <Text style={[
                styles.progressStatus,
                { color: pointsMet ? '#4CAF50' : '#FF9800' }
              ]}>
                {pointsMet ? '✅ Ready to complete event!' : '📈 Keep contributing to reach the goal!'}
              </Text>
            )}
          </View>
        </View>

        {/* Step 1: Scan Items */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: scannedItems.length > 0 ? '#4CAF50' : '#ccc' }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Scan Recyclable Items</Text>
            {scannedItems.length > 0 && (
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{scannedItems.length} items</Text>
              </View>
            )}
          </View>
          
          {scannedItems.length === 0 ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleStartScanning}
            >
              <Icon name="camera" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Start Scanning</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.itemsList}>
                {scannedItems.map((item, index) => renderItemCard(item, index))}
              </View>
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={handleStartScanning}
              >
                <Icon name="plus" size={20} color="#4CAF50" />
                <Text style={styles.secondaryButtonText}>Add More Items</Text>
              </TouchableOpacity>
              
              {/* Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Scan Summary</Text>
                {hasExistingTransaction && (
                  <Text style={styles.existingScanNote}>
                    ⚠️ Note: These items were already saved in SmartScanner
                  </Text>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Items:</Text>
                  <Text style={styles.summaryValue}>{contributionData.totalItems}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Weight:</Text>
                  <Text style={styles.summaryValue}>{contributionData.totalWeight} kg</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Points:</Text>
                  <Text style={[styles.summaryValue, styles.pointsHighlight]}>
                    +{contributionData.totalPoints}
                  </Text>
                </View>
                {hasExistingTransaction && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Points for Event:</Text>
                    <Text style={[styles.summaryValue, { color: '#FF9800' }]}>
                      +0 (already saved)
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Step 2: Select Bin */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepNumber, { backgroundColor: selectedBin ? '#4CAF50' : '#ccc' }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Select Recycling Location</Text>
            {selectedBin && (
              <View style={styles.stepBadge}>
                <Icon name="check" size={16} color="#fff" />
              </View>
            )}
          </View>
          
          {!selectedBin ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleSelectBin}
            >
              <Icon name="map-marker" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Choose Bin on EcoMap</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.binCard}>
              <View style={styles.binHeader}>
                <View style={[styles.binIcon, { backgroundColor: getItemColor(selectedBin.type_name || selectedBin.type) }]}>
                  <Icon name={getItemIcon(selectedBin.type_name || selectedBin.type)} size={24} color="#fff" />
                </View>
                <View style={styles.binInfo}>
                  <Text style={styles.binName}>{selectedBin.bin_name || selectedBin.name}</Text>
                  <Text style={styles.binType}>{selectedBin.type_name || selectedBin.type} Bin</Text>
                  <Text style={styles.binLocation}>{selectedBin.location_description || selectedBin.location}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.changeButton}
                  onPress={handleSelectBin}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.binStatus}>
                <Text style={styles.binStatusLabel}>Status:</Text>
                <Text style={[
                  styles.binStatusValue,
                  { color: selectedBin.status === 'Active' ? '#4CAF50' : 
                          selectedBin.status === 'Full' ? '#F44336' : '#FF9800' }
                ]}>
                  {selectedBin.status || 'Active'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Submit Section */}
        {scannedItems.length > 0 && selectedBin && (
          <View style={styles.submitSection}>
            <View style={styles.finalSummary}>
              <Text style={styles.finalSummaryTitle}>Ready to Submit</Text>
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>Event:</Text>
                <Text style={styles.finalSummaryValue}>{event.eventTitle}</Text>
              </View>
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>Items:</Text>
                <Text style={styles.finalSummaryValue}>{contributionData.totalItems} items</Text>
              </View>
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>Location:</Text>
                <Text style={styles.finalSummaryValue}>{selectedBin.bin_name}</Text>
              </View>
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>Total Points from Scan:</Text>
                <Text style={[styles.finalSummaryValue]}>
                  +{contributionData.totalPoints}
                </Text>
              </View>
              <View style={styles.finalSummaryRow}>
                <Text style={styles.finalSummaryLabel}>Points for Event:</Text>
                <Text style={[styles.finalSummaryValue, styles.totalPoints]}>
                  +{hasExistingTransaction ? 0 : contributionData.totalPoints}
                </Text>
              </View>
              {hasExistingTransaction && (
                <View style={styles.existingWarning}>
                  <Text style={styles.existingWarningText}>
                    ⚠️ Note: Points were already saved in SmartScanner (0 added to event)
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitContribution}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="check-circle" size={24} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit Contribution</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        {scannedItems.length === 0 || !selectedBin ? (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How to Add Contribution</Text>
            <View style={styles.instructionStep}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Use Smart Scanner to scan your recyclable items (Paper, Plastic, Glass, Metal)
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Select a recycling bin location on EcoMap
              </Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Submit your contribution to earn points for this event
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  eventStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressSummary: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1e7ff',
  },
  progressSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressStatus: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stepBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemClass: {
    fontSize: 12,
    color: '#666',
  },
  existingTransaction: {
    fontSize: 10,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemConfidence: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f5e8',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1e7ff',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 12,
  },
  existingScanNote: {
    fontSize: 12,
    color: '#FF9800',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pointsHighlight: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  binCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  binHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  binIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  binInfo: {
    flex: 1,
  },
  binName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  binType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  binLocation: {
    fontSize: 12,
    color: '#888',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  changeButtonText: {
    color: '#2196f3',
    fontSize: 12,
    fontWeight: '600',
  },
  binStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  binStatusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  binStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitSection: {
    marginTop: 8,
    marginBottom: 32,
  },
  finalSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  finalSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  finalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  finalSummaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  finalSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalPoints: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  existingWarning: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  existingWarningText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});