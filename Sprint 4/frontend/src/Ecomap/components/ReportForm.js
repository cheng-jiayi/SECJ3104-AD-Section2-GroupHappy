import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ISSUE_TYPES } from '../utils/EcoMapHelpers.js';

const ReportForm = ({ visible, onClose, bin, onSubmit }) => {
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!selectedIssue) {
            Alert.alert('Error', 'Please select an issue type');
            return;
        }

        setLoading(true);
        try {
            await onSubmit({
                bin_id: bin.bin_id,
                user_id: 'STU001', // Replace with actual user ID
                issue_type: selectedIssue,
                description: description,
                photo_url: null,
            });
            
            Alert.alert('Success', 'Issue reported successfully');
            setSelectedIssue(null);
            setDescription('');
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to report issue. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setSelectedIssue(null);
        setDescription('');
        onClose();
    };

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
                        <Text style={styles.modalTitle}>Report Issue</Text>
                        <TouchableOpacity onPress={handleCancel}>
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.formContent}>
                        <View style={styles.binInfo}>
                            <Text style={styles.binName}>{bin.bin_name}</Text>
                            <Text style={styles.binType}>{bin.type_name} Bin</Text>
                            <Text style={styles.binLocation}>
                                {bin.station_description || bin.location_description || 'Recycling Station'}
                            </Text>
                        </View>

                        <Text style={styles.sectionTitle}>Select Issue Type</Text>
                        <View style={styles.issueTypesContainer}>
                            {ISSUE_TYPES.map((issue) => (
                                <TouchableOpacity
                                    key={issue.id}
                                    style={[
                                        styles.issueTypeButton,
                                        selectedIssue === issue.name && styles.issueTypeButtonSelected
                                    ]}
                                    onPress={() => setSelectedIssue(issue.name)}
                                >
                                    <Icon
                                        name={issue.icon}
                                        size={24}
                                        color={selectedIssue === issue.name ? '#FFFFFF' : issue.color}
                                    />
                                    <Text style={[
                                        styles.issueTypeText,
                                        selectedIssue === issue.name && styles.issueTypeTextSelected
                                    ]}>
                                        {issue.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Additional Details (Optional)</Text>
                        <TextInput
                            style={styles.descriptionInput}
                            placeholder="Describe the issue..."
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                            textAlignVertical="top"
                        />

                        <TouchableOpacity style={styles.photoButton}>
                            <Icon name="camera" size={20} color="#666" />
                            <Text style={styles.photoButtonText}>Add Photo</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <Text style={styles.submitButtonText}>Submitting...</Text>
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Report</Text>
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
        maxHeight: '90%',
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
    },
    formContent: {
        padding: 20,
    },
    binInfo: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    binName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    binType: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    binLocation: {
        fontSize: 12,
        color: '#999',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    issueTypesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    issueTypeButton: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        margin: '1%',
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
    },
    issueTypeButtonSelected: {
        backgroundColor: '#2196F3',
    },
    issueTypeText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#666',
    },
    issueTypeTextSelected: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    descriptionInput: {
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        marginBottom: 20,
        minHeight: 100,
    },
    photoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#DDDDDD',
        borderRadius: 8,
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    photoButtonText: {
        marginLeft: 8,
        color: '#666',
        fontSize: 14,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: '#2196F3',
    },
    submitButtonDisabled: {
        backgroundColor: '#BBDEFB',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default ReportForm;