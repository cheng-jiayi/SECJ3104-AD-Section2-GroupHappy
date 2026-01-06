import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Modal,
    ActivityIndicator,
    StyleSheet,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FILTER_OPTIONS } from '../constants/EcoMapConstants';

const { width } = Dimensions.get('window');

const FilterModal = ({
    visible,
    selectedTypes,
    isFindingStations,
    onClose,
    onTypeSelect,
    onFindStations,
}) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Find Recycling Stations</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.modalSubtitle}>
                        Select the types of items you want to recycle:
                    </Text>
                    
                    <ScrollView style={styles.filterList}>
                        {FILTER_OPTIONS.map(filter => (
                            <TouchableOpacity
                                key={filter.id}
                                style={[
                                    styles.filterItem,
                                    selectedTypes.includes(filter.id) && styles.filterItemSelected
                                ]}
                                onPress={() => onTypeSelect(filter.id)}
                            >
                                <View style={[styles.filterIcon, { backgroundColor: filter.color }]}>
                                    <Icon name={filter.icon} size={24} color="#FFFFFF" />
                                </View>
                                <Text style={styles.filterLabel}>{filter.label}</Text>
                                {selectedTypes.includes(filter.id) && (
                                    <Icon name="check-circle" size={24} color="#4CAF50" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    
                    <View style={styles.modalActions}>
                        <TouchableOpacity 
                            style={styles.modalCancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[
                                styles.modalActionButton, 
                                selectedTypes.length === 0 && styles.disabledButton
                            ]}
                            onPress={onFindStations}
                            disabled={selectedTypes.length === 0 || isFindingStations}
                        >
                            {isFindingStations ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Icon name="map-search" size={20} color="#FFFFFF" />
                                    <Text style={styles.modalActionText}>
                                        Find Stations ({selectedTypes.length})
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalSubtitle: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        fontSize: 14,
        color: '#666',
        backgroundColor: '#F9F9F9',
    },
    filterList: {
        padding: 20,
    },
    filterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
    },
    filterItemSelected: {
        backgroundColor: '#E8F5E8',
        borderWidth: 1,
        borderColor: '#4CAF50',
    },
    filterIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    filterLabel: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    modalActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    modalCancelButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        marginRight: 10,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    modalActionButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        marginLeft: 10,
    },
    disabledButton: {
        backgroundColor: '#CCCCCC',
    },
    modalActionText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default FilterModal;