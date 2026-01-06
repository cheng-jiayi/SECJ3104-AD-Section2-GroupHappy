import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getBinTypes, filterBinsByType } from '../services/api';

const FilterScreen = ({ navigation, route }) => {
  const [binTypes, setBinTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    fetchBinTypes();
  }, []);

  const fetchBinTypes = async () => {
    try {
      const types = await getBinTypes();
      setBinTypes(types);
    } catch (error) {
      console.error('Error fetching bin types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    // Navigate back to map with filter applied
    navigation.navigate('EcoMapMain', { 
      filterType: type.type_name 
    });
  };

  const renderBinType = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.typeCard,
        selectedType?.type_name === item.type_name && styles.typeCardSelected
      ]}
      onPress={() => handleTypeSelect(item)}
    >
      <View style={styles.typeContent}>
        <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type_name) }]}>
          <Icon 
            name={getTypeIcon(item.type_name)} 
            size={24} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.typeInfo}>
          <Text style={styles.typeName}>{item.type_name}</Text>
          <Text style={styles.typeDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        {selectedType?.type_name === item.type_name && (
          <Icon name="check-circle" size={24} color="#4CAF50" />
        )}
      </View>
    </TouchableOpacity>
  );

  const getTypeIcon = (typeName) => {
    const icons = {
      'Plastic': 'recycle',
      'Paper': 'file-document',
      'Glass': 'glass-mug',
      'Metal': 'cog',
      'E-Waste': 'chip',
      'Organic': 'leaf',
      'Mixed': 'package-variant',
    };
    return icons[typeName] || 'recycle';
  };

  const getTypeColor = (typeName) => {
    const colors = {
      'Plastic': '#2196F3',
      'Paper': '#4CAF50',
      'Glass': '#FF9800',
      'Metal': '#795548',
      'E-Waste': '#9C27B0',
      'Organic': '#8BC34A',
      'Mixed': '#607D8B',
    };
    return colors[typeName] || '#607D8B';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter Bin Types</Text>
        <Text style={styles.subtitle}>
          Select a recyclable material to view specific bins
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Icon name="recycle" size={40} color="#4CAF50" />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={binTypes}
          renderItem={renderBinType}
          keyExtractor={(item) => item.bin_type_id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            setSelectedType(null);
            navigation.navigate('EcoMapMain', { filterType: null });
          }}
        >
          <Icon name="filter-remove" size={20} color="#666" />
          <Text style={styles.clearButtonText}>Clear Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={() => {
            if (selectedType) {
              navigation.navigate('EcoMapMain', { 
                filterType: selectedType.type_name 
              });
            }
          }}
        >
          <Text style={styles.applyButtonText}>Apply Filter</Text>
          <Icon name="check" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  typeCardSelected: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  typeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginRight: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  clearButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginLeft: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  applyButtonText: {
    marginRight: 8,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default FilterScreen;