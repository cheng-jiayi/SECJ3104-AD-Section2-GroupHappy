import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const CustomDatePicker = ({ 
  value, 
  onDateChange, 
  placeholder = "Select Date",
  style 
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      onDateChange(formattedDate);
    }
  };

  const showDatePicker = () => {
    setShowPicker(true);
  };

  return (
    <View>
      <TouchableOpacity 
        style={style} 
        onPress={showDatePicker}
      >
        <Text style={value ? { color: '#333' } : { color: '#999' }}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showPicker}
            onRequestClose={() => setShowPicker(false)}
          >
            <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <TouchableWithoutFeedback>
                  <View style={{ backgroundColor: 'white', padding: 20 }}>
                    <DateTimePicker
                      value={value ? new Date(value) : new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                    />
                    <TouchableOpacity 
                      style={{ padding: 15, alignItems: 'center', backgroundColor: '#4CAF50', borderRadius: 5, marginTop: 10 }}
                      onPress={() => setShowPicker(false)}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        ) : (
          <DateTimePicker
            value={value ? new Date(value) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )
      )}
    </View>
  );
};

export default CustomDatePicker;