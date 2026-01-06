import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const StationMarker = ({ station, userLocation, onPress, onBinPress }) => {
    
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceKm = R * c;
        return distanceKm * 1000;
    };

    const getStatusSummaryColor = (statusSummary) => {
        if (!statusSummary) return '#9E9E9E';
        
        if (statusSummary.includes('All Active')) return '#4CAF50';
        if (statusSummary.includes('Some Issues')) return '#FF9800';
        if (statusSummary.includes('All Full') || statusSummary.includes('Critical')) return '#F44336';
        return '#9E9E9E';
    };

    // Parse bin details string
    const parseBinDetails = () => {
        if (!station.bin_details) return [];
        
        try {
            return station.bin_details.split(" | ").map((item) => {
                const name = item.split(" (")[0];
                const inside = item.split(" (")[1].replace(")", "");
                const [type, status] = inside.split(" - ");
                
                return {
                    name,
                    type,
                    status
                };
            });
        } catch (error) {
            console.error('Error parsing bin details:', error);
            return [];
        }
    };

    // Get single bin status color
    const getBinStatusColor = (status) => {
        switch (status) {
            case 'Active': return '#4CAF50';
            case 'Full': return '#F44336';
            case 'Under Maintenance': return '#FF9800';
            default: return '#9E9E9E';
        }
    };

    // Get bin type color
    const getBinTypeColor = (type) => {
        const colors = {
            'Plastic': '#2196F3',
            'Paper': '#FF9800',
            'Glass': '#795548',
            'Metal': '#607D8B',
            'E-Waste': '#9C27B0',
            'Organic': '#8BC34A',
            'Mixed': '#FF5722',
        };
        return colors[type] || '#4CAF50';
    };

    // Get bin icon
    const getBinTypeIcon = (type) => {
        const icons = {
            'Plastic': 'bottle-soda',
            'Paper': 'file-document',
            'Glass': 'glass-mug',
            'Metal': 'cog',
            'E-Waste': 'chip',
            'Organic': 'leaf',
            'Mixed': 'package-variant',
        };
        return icons[type] || 'recycle';
    };

    const stationLat = typeof station.latitude === 'string' ? parseFloat(station.latitude) : station.latitude;
    const stationLng = typeof station.longitude === 'string' ? parseFloat(station.longitude) : station.longitude;
    
    const distance = userLocation 
        ? Math.round(calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            stationLat,
            stationLng
        ))
        : null;

    const bins = parseBinDetails();
    const availableTypes = station.available_bin_types || 
        (bins.length > 0 ? bins.map(b => b.type).join(', ') : '');
    
    const stationKey = `station-${stationLat}-${stationLng}-${station.station_id || ''}`;

    return (
        <Marker
            key={stationKey}
            coordinate={{
                latitude: stationLat,
                longitude: stationLng
            }}
            onPress={onPress}
        >
            {/* Station marker */}
            <View style={styles.stationMarker}>
                <Icon name="map-marker-radius" size={30} color="#FF9800" />
                <View style={styles.stationBadge}>
                    <Text style={styles.stationBadgeText}>
                        {station.total_bins_at_station || bins.length}
                    </Text>
                </View>
            </View>
            
            {/* Station callout */}
            <Callout tooltip>
                <View style={styles.calloutContainer}>
                    <View style={styles.calloutHeader}>
                        <Icon name="map-marker-radius" size={24} color="#FF9800" />
                        <Text style={styles.stationCalloutTitle}>Recycling Station</Text>
                    </View>
                    
                    <Text style={styles.calloutText}>
                        {station.location_description || station.station_name || 'Recycling Station'}
                    </Text>
                    
                    {distance && (
                        <Text style={styles.calloutDistance}>
                            <Icon name="walk" size={12} color="#2196F3" /> {distance}m away
                        </Text>
                    )}
                    
                    <Text style={styles.calloutBinsCount}>
                        <Icon name="recycle" size={12} color="#795548" /> 
                        {station.total_bins_at_station || bins.length} bins available
                    </Text>
                    
                    <Text style={styles.calloutTypes}>
                        <Icon name="format-list-bulleted" size={12} color="#2196F3" /> 
                        Types: {availableTypes}
                    </Text>
                    
                    {station.status_summary && (
                        <Text style={[styles.calloutStatus, { color: getStatusSummaryColor(station.status_summary) }]}>
                            <Icon name="information" size={12} /> 
                            Status: {station.status_summary}
                        </Text>
                    )}
                    
                    {/* Show bin list */}
                    {bins.length > 0 && (
                        <View style={styles.binsContainer}>
                            <Text style={styles.binsTitle}>Available Bins:</Text>
                            {bins.map((bin, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.binItem}
                                    onPress={() => {
                                        if (onBinPress) {
                                            const binObject = {
                                                bin_id: 0,
                                                station_bin_id: `${stationKey}-${index}`,
                                                bin_name: bin.name,
                                                type_name: bin.type,
                                                status: bin.status,
                                                latitude: stationLat,
                                                longitude: stationLng,
                                                location_description: station.location_description || station.station_name,
                                                updated_at: new Date().toISOString(),
                                                isStationBin: true,
                                                station_info: station.location_description || station.station_name,
                                                tryFindMatchingBin: true
                                            };
                                            onBinPress(binObject);
                                        }
                                    }}
                                >
                                    <View style={[styles.binIcon, { backgroundColor: getBinTypeColor(bin.type) }]}>
                                        <Icon 
                                            name={getBinTypeIcon(bin.type)} 
                                            size={14} 
                                            color="#FFFFFF" 
                                        />
                                    </View>
                                    <View style={styles.binInfo}>
                                        <Text style={styles.binName}>{bin.name}</Text>
                                        <Text style={styles.binType}>{bin.type}</Text>
                                        <Text style={[styles.binStatus, { color: getBinStatusColor(bin.status) }]}>
                                            {bin.status}
                                        </Text>
                                    </View>
                                    <Icon name="chevron-right" size={16} color="#666" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    
                    {/* Action button */}
                    <TouchableOpacity 
                        style={styles.calloutButton}
                        onPress={onPress}
                    >
                        <Icon name="arrow-right" size={14} color="#FFFFFF" />
                        <Text style={styles.calloutButtonText}>View Station Details</Text>
                    </TouchableOpacity>
                </View>
            </Callout>
        </Marker>
    );
};

const styles = StyleSheet.create({
    stationMarker: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    stationBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#2196F3',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 3,
    },
    stationBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    calloutContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        width: 280,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    calloutHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    stationCalloutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    calloutText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    calloutDistance: {
        fontSize: 12,
        color: '#2196F3',
        fontWeight: '500',
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    calloutBinsCount: {
        fontSize: 12,
        color: '#795548',
        marginBottom: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    calloutTypes: {
        fontSize: 12,
        color: '#2196F3',
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    calloutStatus: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    binsContainer: {
        marginTop: 8,
        marginBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 10,
    },
    binsTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    binItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    binIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    binInfo: {
        flex: 1,
    },
    binName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    binType: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
    },
    binStatus: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
    },
    calloutButton: {
        backgroundColor: '#FF9800',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginTop: 8,
    },
    calloutButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 6,
    },
});

export default StationMarker;