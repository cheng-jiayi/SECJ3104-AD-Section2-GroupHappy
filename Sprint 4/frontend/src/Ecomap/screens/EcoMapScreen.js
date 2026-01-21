import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    PermissionsAndroid,
    Platform,
    Dimensions,
    Modal,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout, Circle } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import MapViewDirections from 'react-native-maps-directions';

const { width, height } = Dimensions.get('window');

const API_BASE_URL = 'http://10.0.2.2:3000';

const EcoMapScreen = ({ navigation , route}) => {
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState({
        latitude: 1.5585,
        longitude: 103.6378,
        latitudeDelta: 0.015,
        longitudeDelta: 0.0121,
    });
    const [destination, setDestination] = useState(null);
    const [bins, setBins] = useState([]);
    const [stations, setStations] = useState([]);
    const [filteredBins, setFilteredBins] = useState([]);
    const [selectedBin, setSelectedBin] = useState(null);
    const [selectedStationBins, setSelectedStationBins] = useState([]);
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [stationsWithTypes, setStationsWithTypes] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showStationResults, setShowStationResults] = useState(false);
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const [isFindingStations, setIsFindingStations] = useState(false);
    const [showFilteredBins, setShowFilteredBins] = useState(false); 
    const mapRef = useRef(null);

    const filterOptions = [
        { id: 'Plastic', label: 'Plastic', icon: 'bottle-soda', color: '#2196F3' },
        { id: 'Paper', label: 'Paper', icon: 'file-document', color: '#FF9800' },
        { id: 'Glass', label: 'Glass', icon: 'glass-mug', color: '#795548' },
        { id: 'Metal', label: 'Metal', icon: 'cog', color: '#607D8B' },
        { id: 'E-Waste', label: 'E-Waste', icon: 'chip', color: '#9C27B0' },
        { id: 'Organic', label: 'Organic', icon: 'leaf', color: '#8BC34A' },
        { id: 'Mixed', label: 'Mixed', icon: 'package-variant', color: '#FF5722' },
    ];

    useEffect(() => {
        requestLocationPermission();
        fetchAllStations();
    }, []);

    useEffect(() => {
        console.log('Current destination:', destination);
        console.log('Selected types:', selectedTypes);
    }, [destination, selectedTypes]);

    useEffect(() => {
        if (selectedStationBins && selectedStationBins.length > 0 && matchingBins.length > 0) {
            setSelectedBin(matchingBins[0]);
        }
    }, [selectedStationBins, selectedTypes]);

    const matchingBins = selectedStationBins.filter(bin => selectedTypes.includes(bin.type_name));

    const closeBottomSheet = () => {
        setShowBottomSheet(false);
        setTimeout(() => {
            setSelectedBin(null);
            setSelectedStationBins([]);
        }, 300);
    };

    const requestLocationPermission = async () => {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'EcoMap needs access to your location to show nearby recycling bins.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    getCurrentLocation();
                } else {
                    Alert.alert(
                        'Location Permission',
                        'Permission denied. Using default UTM location.',
                        [{ text: 'OK' }]
                    );
                    setLoading(false);
                }
            } else {
                getCurrentLocation();
            }
        } catch (err) {
            console.warn('Permission error:', err);
            setLoading(false);
        }
    };

    const getCurrentLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const userLoc = {
                    latitude: latitude,
                    longitude: longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                };
                setUserLocation(userLoc);
                setLocation(userLoc);
                setLoading(false);

                setTimeout(() => {
                    if (mapRef.current) {
                        mapRef.current.animateToRegion(userLoc, 1000);
                    }
                }, 500);
            },
            (error) => {
                console.error('Location error:', error);
                setLoading(false);
                Alert.alert(
                    'Location Error',
                    'Unable to get your location. Showing UTM campus map.',
                    [{ text: 'OK' }]
                );
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const handleBinSelectForContribution = (bin) => {
        console.log('🎯 Bin selected for contribution:', bin);
        
        const fromAddContribution = route?.params?.fromAddContribution;
        
        if (fromAddContribution) {
            const selectedBinData = {
                ...bin,
                bin_id: bin.bin_id || bin.id,
                bin_name: bin.bin_name || `${bin.type_name} Bin`,
                type_name: bin.type_name || bin.type,
                location_description: bin.location_description || bin.location,
                status: bin.status || 'Active',
                station_id: bin.station_id,
                latitude: bin.latitude,
                longitude: bin.longitude
            };
            
            console.log('📤 Returning to AddContribution with:', {
                selectedBin: selectedBinData,
                scannedItems: route.params.scannedItems
            });
            
            navigation.navigate('AddContributionScreen', {
                user: route.params.user,
                event: route.params.event,
                scannedItems: route.params.scannedItems,
                selectedBin: selectedBinData
            });
        } else {
            handleBinSelect(bin);
        }
    };

    const fetchAllStations = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/stations`);
            
            const stationsWithNumbers = response.data.map(station => ({
                ...station,
                latitude: typeof station.latitude === 'string' ? parseFloat(station.latitude) : station.latitude,
                longitude: typeof station.longitude === 'string' ? parseFloat(station.longitude) : station.longitude,
                total_bins: typeof station.total_bins === 'string' ? parseInt(station.total_bins) : station.total_bins,
                active_bins: typeof station.active_bins === 'string' ? parseInt(station.active_bins) : station.active_bins,
                full_bins: typeof station.full_bins === 'string' ? parseInt(station.full_bins) : station.full_bins,
                maintenance_bins: typeof station.maintenance_bins === 'string' ? parseInt(station.maintenance_bins) : station.maintenance_bins
            }));
            
            setStations(stationsWithNumbers);
            await fetchAllBinsForFiltering();
        } catch (error) {
            console.error('Error fetching stations:', error);
            Alert.alert('Error', 'Failed to load recycling stations from server');
        }
    };

    const fetchAllBinsForFiltering = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/bins`);
            
            const binsWithNumbers = response.data.map(bin => ({
                ...bin,
                latitude: typeof bin.latitude === 'string' ? parseFloat(bin.latitude) : bin.latitude,
                longitude: typeof bin.longitude === 'string' ? parseFloat(bin.longitude) : bin.longitude
            }));
            
            setBins(binsWithNumbers);
            setFilteredBins(binsWithNumbers);
        } catch (error) {
            console.error('Error fetching bins for filtering:', error);
        }
    };

    const parseBinDetails = (detailsString) => {
        if (!detailsString) return [];

        return detailsString.split(" | ").map((item) => {
            const name = item.split(" (")[0];
            const inside = item.split(" (")[1].replace(")", "");
            const [type, status] = inside.split(" - ");

            return {
                name,
                type,
                status
            };
        });
    };

    const findStationsWithTypes = async () => {
        if (selectedTypes.length < 1) {
            Alert.alert('Select Types', 'Please select at least one bin type');
            return;
        }

        if (!userLocation) {
            Alert.alert('Location Required', 'Please allow location access');
            return;
        }

        setIsFindingStations(true);
        setShowFilterModal(false);
        setDestination(null); 
        
        try {
            console.log('Finding stations with types:', selectedTypes);
            console.log('User location:', userLocation);
            
            const response = await axios.post(`${API_BASE_URL}/api/stations/find`, {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                binTypes: selectedTypes,
                radius: 1.0
            });

            console.log('Found stations:', response.data);
            
            const stationsWithNumbers = response.data.map(station => ({
                ...station,
                latitude: typeof station.latitude === 'string' ? parseFloat(station.latitude) : station.latitude,
                longitude: typeof station.longitude === 'string' ? parseFloat(station.longitude) : station.longitude,
                distance_km: typeof station.distance_km === 'string' ? parseFloat(station.distance_km) : station.distance_km,
                bins: parseBinDetails(station.bin_details)
            }));
            
            setStationsWithTypes(stationsWithNumbers);
            setShowStationResults(true);
            setShowFilteredBins(false);
            
            if (stationsWithNumbers.length === 0) {
                Alert.alert(
                    'No Stations Found',
                    `No recycling stations found with ${selectedTypes.join(' and ')} bins within 1km.`
                );
            } else {
                if (stationsWithNumbers.length > 0 && mapRef.current) {
                    const nearestStation = stationsWithNumbers[0];
                    mapRef.current.animateToRegion({
                        latitude: nearestStation.latitude,
                        longitude: nearestStation.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error finding stations:', error.response?.data || error.message);
            Alert.alert(
                'Error',
                error.response?.data?.error || 'Failed to find recycling stations'
            );
        } finally {
            setIsFindingStations(false);
        }
    };

    const handleTypeSelect = (typeId) => {
        if (selectedTypes.includes(typeId)) {
            setSelectedTypes(selectedTypes.filter(id => id !== typeId));
        } else {
            setSelectedTypes([...selectedTypes, typeId]);
        }
    };

    const clearSelections = () => {
        setSelectedTypes([]);
        setStationsWithTypes([]);
        setShowStationResults(false);
        setShowFilteredBins(false);
        setFilteredBins(bins);
        setDestination(null);
        
        setShowBottomSheet(false);
        setSelectedBin(null);
        setSelectedStationBins([]);

        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion(userLocation, 1000);
        }
    };

    const applyFilter = () => {
        if (selectedTypes.length === 0) {
            Alert.alert('Select Types', 'Please select at least one bin type');
            return;
        }

        setDestination(null);

        const filtered = bins.filter(bin => 
            selectedTypes.includes(bin.type_name)
        );
        
        setFilteredBins(filtered);
        setShowFilteredBins(true);
        setShowStationResults(false);
        setShowFilterModal(false);
        
        if (filtered.length > 0) {
            const firstBin = filtered[0];
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: firstBin.latitude,
                    longitude: firstBin.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 1000);
            }
        } else {
            Alert.alert(
                'No Bins Found',
                `No ${selectedTypes.join(' or ')} bins found in the area.`
            );
        }
    };

    const handleBinSelect = (bin) => {
        console.log('handleBinSelect called with bin:', bin);

        setDestination(null);
        
        const isStationBin = bin.isStationBin || bin.station_info || !bin.bin_id;
        
        let binId;
        if (isStationBin) {
            binId = `station-${bin.latitude?.toFixed(6)}-${bin.longitude?.toFixed(6)}-${bin.type_name}`;
        } else {
            binId = parseInt(bin.bin_id) || (bin.id ? parseInt(bin.id) : 0);
        }
        
        const selectedBinData = {
            ...bin,
            bin_id: binId,
            original_bin_id: isStationBin ? null : bin.bin_id,
            bin_name: bin.bin_name || `${bin.type_name} Bin`,
            type_name: bin.type_name,
            status: bin.status,
            latitude: bin.latitude,
            longitude: bin.longitude,
            location_description: bin.location_description || 'Recycling Station',
            updated_at: bin.updated_at || new Date().toISOString(),
            isStationBin: isStationBin,
            station_info: bin.station_info || null,
            station_bin_id: bin.station_bin_id || null
        };
        
        console.log('Selected bin data:', selectedBinData);
        
        if (selectedStationBins.length === 0) {
            setSelectedStationBins([selectedBinData]);
        }
        
        setSelectedBin(selectedBinData);
        setShowBottomSheet(true);
        
        const binLat = typeof selectedBinData.latitude === 'string' ? parseFloat(selectedBinData.latitude) : selectedBinData.latitude;
        const binLng = typeof selectedBinData.longitude === 'string' ? parseFloat(selectedBinData.longitude) : selectedBinData.longitude;
        
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: binLat,
                longitude: binLng,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
            }, 1000);
        }
    };

    // FIXED: Handle station selection - now prompts user to select a specific bin
    const handleSelectStation = (station) => {
        console.log('📌 Selecting station:', station.station_name);
        
        // Check if coming from AddContribution flow
        const fromAddContribution = route?.params?.fromAddContribution;
        
        if (fromAddContribution) {
            // Show station bins and let user pick one
            showStationBinsForSelection(station);
        } else {
            // Regular flow: show station bins in bottom sheet
            showStationBins(station);
        }
    };

    // Show station bins for AddContribution selection
    const showStationBinsForSelection = async (station) => {
        try {
            console.log(`📡 Fetching bins for station: ${station.station_id}`);
            const response = await axios.get(`${API_BASE_URL}/api/stations/${station.station_id}/bins`);
            
            console.log('✅ Station bins found:', response.data);
            
            if (response.data.length === 0) {
                Alert.alert('No Bins', 'No bins found at this station');
                return;
            }
            
            // Format bins for selection
            const stationBins = response.data.map((bin, index) => ({
                ...bin,
                bin_id: bin.bin_id,
                bin_name: bin.bin_name || `${bin.type_name} Bin`,
                type_name: bin.type_name,
                status: bin.status || 'Active',
                latitude: station.latitude,
                longitude: station.longitude,
                location_description: station.description || 'Recycling Station',
                updated_at: bin.updated_at || new Date().toISOString(),
                isStationBin: true,
                station_id: station.station_id,
                station_name: station.station_name
            }));
            
            // Show bin selection dialog
            Alert.alert(
                'Select a Bin',
                'Choose a specific bin from this station:',
                stationBins.map(bin => ({
                    text: `${bin.bin_name} (${bin.type_name}) - ${bin.status}`,
                    onPress: () => {
                        console.log('✅ Bin selected:', bin);
                        navigation.navigate('AddContributionScreen', {
                            user: route.params.user,
                            event: route.params.event,
                            scannedItems: route.params.scannedItems,
                            selectedBin: bin
                        });
                    }
                })).concat([{ text: 'Cancel', style: 'cancel' }])
            );
            
        } catch (error) {
            console.error('❌ Error fetching station bins:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load station bins: ' + (error.response?.data?.error || error.message));
        }
    };

    // Show station bins in bottom sheet (regular flow)
    const showStationBins = async (station) => {
        try {
            console.log(`📡 Fetching bins for station: ${station.station_id}`);
            const response = await axios.get(`${API_BASE_URL}/api/stations/${station.station_id}/bins`);
            
            console.log('✅ Station bins found:', response.data);
            
            if (response.data.length === 0) {
                Alert.alert('No Bins', 'No bins found at this station');
                return;
            }
            
            // Format bins for display
            const stationBins = response.data.map((bin, index) => ({
                ...bin,
                bin_id: bin.bin_id,
                station_bin_id: `station-${station.latitude.toFixed(6)}-${station.longitude.toFixed(6)}-${bin.type_name}-${index}`,
                bin_name: bin.bin_name || `${bin.type_name} Bin`,
                type_name: bin.type_name,
                status: bin.status || 'Active',
                latitude: station.latitude,
                longitude: station.longitude,
                location_description: station.description || 'Recycling Station',
                updated_at: bin.updated_at || new Date().toISOString(),
                isStationBin: true,
                station_info: station.description,
                station_id: station.station_id,
                station_name: station.station_name,
                station_latitude: station.latitude,
                station_longitude: station.longitude
            }));
            
            console.log('📦 Formatted station bins:', stationBins);
            
            // Set state for bottom sheet
            setSelectedStationBins(stationBins);
            setSelectedBin(stationBins[0]); // Select first bin
            setShowStationResults(false);
            setShowBottomSheet(true);
            
            // Center map on station
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: station.latitude,
                    longitude: station.longitude,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                }, 800);
            }
            
        } catch (error) {
            console.error('❌ Error fetching station bins:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to load station bins: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleGetDirections = () => {
        if (selectedBin && userLocation) {
            setDestination({
                latitude: selectedBin.latitude,
                longitude: selectedBin.longitude
            });
            
            if (mapRef.current) {
                const bounds = {
                    latitude: (userLocation.latitude + selectedBin.latitude) / 2,
                    longitude: (userLocation.longitude + selectedBin.longitude) / 2,
                    latitudeDelta: Math.abs(userLocation.latitude - selectedBin.latitude) * 1.5,
                    longitudeDelta: Math.abs(userLocation.longitude - selectedBin.longitude) * 1.5,
                };
                mapRef.current.animateToRegion(bounds, 1000);
            }
            
            closeBottomSheet();
        }
    };

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

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return '#4CAF50';
            case 'Full': return '#F44336';
            case 'Under Maintenance': return '#FF9800';
            default: return '#9E9E9E';
        }
    };

    const getBinIcon = (type) => {
        const option = filterOptions.find(f => f.id === type);
        return option ? option.icon : 'recycle';
    };

    const getBinColor = (type) => {
        const option = filterOptions.find(f => f.id === type);
        return option ? option.color : '#4CAF50';
    };

    // Render individual bin marker
    const renderBinMarker = (bin) => {
        return (
            <Marker
                key={bin.bin_id}
                coordinate={{
                    latitude: bin.latitude,
                    longitude: bin.longitude
                }}
                onPress={() => handleBinSelectForContribution(bin)}
            >
                <View style={styles.markerContainer}>
                    <View style={[styles.markerIcon, { backgroundColor: getBinColor(bin.type_name) }]}>
                        <Icon 
                            name={getBinIcon(bin.type_name)} 
                            size={20} 
                            color="#FFFFFF" 
                        />
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(bin.status) }]} />
                </View>
                
                <Callout tooltip onPress={() => handleBinSelect(bin)}>
                    <View style={styles.calloutContainer}>
                        <Text style={styles.calloutTitle}>{bin.bin_name}</Text>
                        <Text style={styles.calloutType}>{bin.type_name} Bin</Text>
                        <Text style={styles.calloutStatus}>
                            Status: <Text style={{ color: getStatusColor(bin.status) }}>
                                {bin.status}
                            </Text>
                        </Text>
                        {userLocation && (
                            <Text style={styles.calloutDistance}>
                                {Math.round(calculateDistance(
                                    userLocation.latitude,
                                    userLocation.longitude,
                                    bin.latitude,
                                    bin.longitude
                                ))}m away
                            </Text>
                        )}
                        <TouchableOpacity 
                            style={styles.calloutButton}
                            onPress={() => handleBinSelect(bin)}
                        >
                            <Text style={styles.calloutButtonText}>View Details</Text>
                        </TouchableOpacity>
                    </View>
                </Callout>
            </Marker>
        );
    };

    // Render station marker
    const renderStationMarker = (station) => {
        const stationLat = typeof station.latitude === 'string' ? parseFloat(station.latitude) : station.latitude;
        const stationLng = typeof station.longitude === 'string' ? parseFloat(station.longitude) : station.longitude;
        
        if (!stationLat || !stationLng) return null;
        
        let distanceText = '';
        if (userLocation && userLocation.latitude && userLocation.longitude) {
            const distanceMeters = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                stationLat,
                stationLng
            );
            distanceText = `${Math.round(distanceMeters)}m away`;
        } else if (station.distance_km) {
            distanceText = `${Math.round((station.distance_km || 0) * 1000)}m away`;
        } else {
            distanceText = 'Distance not available';
        }
        
        return (
            <Marker
                key={`station-${station.station_id}`}
                coordinate={{
                    latitude: stationLat,
                    longitude: stationLng
                }}
                pinColor="#FF9800"
                onPress={() => handleSelectStation(station)}
            >
                <View style={styles.stationMarker}>
                    <Icon name="map-marker-radius" size={30} color="#FF9800" />
                    <View style={styles.stationBadge}>
                        <Text style={styles.stationBadgeText}>{station.total_bins || 0}</Text>
                    </View>
                </View>
                
                <Callout>
                    <View style={styles.stationCallout}>
                        <Text style={styles.stationCalloutTitle}>{station.station_name}</Text>
                        <Text style={styles.stationCalloutText}>{station.description || 'Recycling Station'}</Text>
                        <Text style={styles.stationCalloutText}>{distanceText}</Text>
                        <Text style={styles.stationCalloutText}>
                            {station.total_bins || 0} bin{station.total_bins !== 1 ? 's' : ''} available
                        </Text>
                        <Text style={styles.stationCalloutText}>
                            Types: {station.available_types || 'Various'}
                        </Text>
                        <Text style={styles.stationCalloutText}>
                            Status: {station.active_bins || 0} active, {station.full_bins || 0} full
                        </Text>
                        
                        <TouchableOpacity
                            style={styles.stationCalloutButton}
                            onPress={() => handleSelectStation(station)}
                        >
                            <Text style={styles.stationCalloutButtonText}>View Station Details</Text>
                        </TouchableOpacity>
                    </View>
                </Callout>
            </Marker>
        );
    };

    // Get map markers to display
    const getMapMarkers = () => {
        if (showFilteredBins) {
            return filteredBins.map(bin => renderBinMarker(bin));
        }
        
        if (showStationResults) {
            return stationsWithTypes.map(station => renderStationMarker(station));
        }
        
        return stations.map(station => renderStationMarker(station));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>Loading EcoMap...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#4CAF50" barStyle="light-content" />
            
            {/* Map View */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={location}
                showsUserLocation={true}
                showsMyLocationButton={false}
                showsCompass={true}
                showsScale={true}
            >
                {getMapMarkers()}
                
                {userLocation && (
                    <Circle
                        center={userLocation}
                        radius={500}
                        strokeWidth={1}
                        strokeColor="#1E88E5"
                        fillColor="rgba(30, 136, 229, 0.1)"
                    />
                )}

                {userLocation && destination && typeof userLocation.latitude === 'number' && typeof destination.latitude === 'number' ? (
                    <MapViewDirections
                        origin={userLocation}
                        destination={destination}
                        apikey={"AIzaSyCVxAiz-VJIJY0C2gPIsVbNDtcdvEd4iJ4"} 
                        strokeWidth={4}
                        strokeColor="green"
                        onError={(errorMessage) => console.log('Direction error:', errorMessage)}
                    />
                ) : null}
            </MapView>

            {/* Selected Types Display */}
            {selectedTypes.length > 0 && (
                <View style={styles.selectedTypesContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedTypes.map(typeId => {
                            const type = filterOptions.find(f => f.id === typeId);
                            return (
                                <View key={typeId} style={[styles.selectedTypeChip, { backgroundColor: type?.color }]}>
                                    <Icon name={type?.icon} size={14} color="#FFFFFF" />
                                    <Text style={styles.selectedTypeText}>{type?.label}</Text>
                                    <TouchableOpacity onPress={() => handleTypeSelect(typeId)}>
                                        <Icon name="close" size={14} color="#FFFFFF" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                        <TouchableOpacity style={styles.clearButton} onPress={clearSelections}>
                            <Icon name="close-circle" size={18} color="#F44336" />
                            <Text style={styles.clearButtonText}>Clear</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            {/* Filtered Bins Count Card */}
            {showFilteredBins && filteredBins.length > 0 && (
                <View style={styles.filteredBinsCard}>
                    <View style={styles.filteredBinsHeader}>
                        <Icon name="filter-check" size={20} color="#4CAF50" />
                        <Text style={styles.filteredBinsTitle}>
                            Showing {filteredBins.length} {selectedTypes.join(', ')} Bin{filteredBins.length > 1 ? 's' : ''}
                        </Text>
                        <TouchableOpacity onPress={() => setShowFilteredBins(false)}>
                            <Icon name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.filteredBinsList}>
                        {filteredBins.slice(0, 5).map((bin, index) => (
                            <TouchableOpacity 
                                key={bin.bin_id || `bin-${bin.latitude}-${bin.longitude}-${index}`} 
                                style={styles.filteredBinItem}
                                onPress={() => handleBinSelect(bin)}
                            >
                                <View style={styles.filteredBinItemHeader}>
                                    <View style={[styles.filteredBinIcon, { backgroundColor: getBinColor(bin.type_name) }]}>
                                        <Icon name={getBinIcon(bin.type_name)} size={16} color="#fff" />
                                    </View>
                                    <Text style={styles.filteredBinName}>{bin.bin_name}</Text>
                                    <Icon name="chevron-right" size={20} color="#2196F3" />
                                </View>
                                <Text style={styles.filteredBinLocation}>{bin.location_description || bin.station_description}</Text>
                                <Text style={[styles.filteredBinStatus, { color: getStatusColor(bin.status) }]}>
                                    Status: {bin.status}
                                </Text>
                                {userLocation && (
                                    <Text style={styles.filteredBinDistance}>
                                        {Math.round(calculateDistance(
                                            userLocation.latitude,
                                            userLocation.longitude,
                                            bin.latitude,
                                            bin.longitude
                                        ))}m away
                                    </Text>
                                )}
                            </TouchableOpacity>
                        ))}
                        {filteredBins.length > 5 && (
                            <Text style={styles.filteredBinsMore}>
                                ... and {filteredBins.length - 5} more bins
                            </Text>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Station Results Card */}
            {showStationResults && stationsWithTypes.length > 0 && (
                <View style={styles.resultsCard}>
                    <View style={styles.resultsHeader}>
                        <Icon name="map-marker-check" size={20} color="#4CAF50" />
                        <Text style={styles.resultsTitle}>
                            Found {stationsWithTypes.length} Station{stationsWithTypes.length > 1 ? 's' : ''}
                        </Text>
                        <TouchableOpacity onPress={() => setShowStationResults(false)}>
                            <Icon name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.resultsList}>
                        {stationsWithTypes.map((station, index) => (
                            <TouchableOpacity 
                                key={`station-${station.station_id}`}
                                style={styles.stationResult}
                                onPress={() => handleSelectStation(station)}
                            >
                                <View style={styles.stationResultHeader}>
                                    <Text style={styles.stationResultTitle}>
                                        {station.station_name} - {Math.round((station.distance_km || 0) * 1000)}m
                                    </Text>
                                    <Icon name="chevron-right" size={20} color="#2196F3" />
                                </View>
                                <Text style={styles.stationResultText}>
                                    {station.station_description || station.description}
                                </Text>
                                <Text style={styles.stationResultTypes}>
                                    <Text style={{ fontWeight: 'bold' }}>Available: </Text>
                                    {station.available_bin_types || station.available_types}
                                </Text>
                                <Text style={styles.stationResultBins}>
                                    {station.total_bins_at_station || station.total_bins} bin{(station.total_bins_at_station || station.total_bins) > 1 ? 's' : ''}
                                </Text>
                                <Text style={styles.stationResultStatus}>
                                    Status: {station.status_summary || 'Active'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.primaryAction]}
                    onPress={() => setShowFilterModal(true)}
                >
                    <Icon name="filter-variant" size={24} color="#FFFFFF" />
                    <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                        {selectedTypes.length > 0 ? `${selectedTypes.length} Selected` : 'Choose an item and we\'ll show you where to recycle it.'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Filter Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showFilterModal}
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Options</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <Icon name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.modalSubtitle}>
                            Select the types of items you want to recycle:
                        </Text>
                        
                        <ScrollView style={styles.filterList}>
                            {filterOptions.map(filter => (
                                <TouchableOpacity
                                    key={filter.id}
                                    style={[
                                        styles.filterItem,
                                        selectedTypes.includes(filter.id) && styles.filterItemSelected
                                    ]}
                                    onPress={() => handleTypeSelect(filter.id)}
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
                                onPress={() => setShowFilterModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.modalActionButton2, selectedTypes.length === 0 && styles.disabledButton]}
                                onPress={() => {
                                    setShowFilterModal(false);
                                    findStationsWithTypes();
                                }}
                                disabled={selectedTypes.length === 0}
                            >
                                <Icon name="map-search" size={20} color="#FFFFFF" />
                                <Text style={styles.modalActionText}>
                                    Find Stations
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Bottom Sheet */}
            {(selectedBin || selectedStationBins.length > 0) && showBottomSheet && (
                <View style={styles.bottomSheet}>
                    <View style={styles.bottomSheetHeader}>
                        <View style={styles.dragHandle} />
                        <TouchableOpacity 
                            style={styles.closeSheetButton}
                            onPress={closeBottomSheet}
                        >
                            <Icon name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView style={styles.bottomSheetContent}>
                        {/* Station/Bin Header */}
                        <View style={styles.stationHeader}>
                            <Icon 
                                name={selectedStationBins.length > 1 ? "map-marker-radius" : "recycle"} 
                                size={40} 
                                color="#FF9800" 
                            />
                            <View style={styles.stationHeaderInfo}>
                                <Text style={styles.stationTitle}>
                                    {selectedStationBins.length > 1 ? 'Recycling Station' : 'Recycling Bin'}
                                </Text>
                                <Text style={styles.stationLocation}>
                                    {selectedBin?.station_name || selectedBin?.location_description || 'Bin Location'}
                                </Text>
                                <Text style={styles.stationBinCount}>
                                    {selectedStationBins.length} bin{selectedStationBins.length > 1 ? 's' : ''} available
                                </Text>
                            </View>
                        </View>

                        {selectedStationBins.length > 1 && (
                            <>
                                <Text style={styles.sectionTitle}>Available Bins</Text>
                                {selectedStationBins.map((bin, index) => {
                                    const isMatch = selectedTypes.includes(bin.type_name);
                                    return (
                                        <TouchableOpacity 
                                            key={bin.bin_id || `bin-${index}`}
                                            style={[
                                                styles.binListItem,
                                                selectedBin && selectedBin.bin_id === bin.bin_id && styles.selectedBinItem,
                                                isMatch && { borderColor: '#4CAF50', borderWidth: 1 }
                                            ]}
                                            onPress={() => {
                                                const binWithStationData = {
                                                    ...bin,
                                                    station_id: bin.station_id || selectedStationBins[0]?.station_id,
                                                    station_name: bin.station_name || selectedStationBins[0]?.station_name,
                                                    station_latitude: bin.station_latitude || selectedStationBins[0]?.station_latitude,
                                                    station_longitude: bin.station_longitude || selectedStationBins[0]?.station_longitude,
                                                    location_description: bin.location_description || selectedStationBins[0]?.location_description,
                                                    updated_at: bin.updated_at || new Date().toISOString()
                                                };
                                                setSelectedBin(binWithStationData);
                                            }}
                                        >
                                            <View style={[styles.binIconSmall, { backgroundColor: getBinColor(bin.type_name) }]}>
                                                <Icon name={getBinIcon(bin.type_name)} size={22} color="#fff" />
                                            </View>

                                            <View style={styles.binListInfo}>
                                                <Text style={styles.binListTitle}>{bin.bin_name || `${bin.type_name} Bin`}</Text>
                                                <Text style={styles.binListType}>{bin.type_name} Bin</Text>
                                                <Text style={styles.binListStatus}>
                                                    Status: 
                                                    <Text style={{ 
                                                        color: getStatusColor(bin.status), 
                                                        fontWeight:'bold',
                                                        marginLeft: 5
                                                    }}>
                                                        {bin.status}
                                                    </Text>
                                                </Text>
                                            </View>

                                            {isMatch && (
                                                <View style={styles.matchBadge}>
                                                    <Text style={styles.matchText}>Match</Text>
                                                </View>
                                            )}

                                            <Icon name="chevron-right" size={22} color="#444" />
                                        </TouchableOpacity>
                                    );
                                })}
                            </>
                        )}

                        {/* Show currently selected bin details */}
                        {selectedBin && (
                            <View style={styles.selectedBinDetails}>
                                <Text style={styles.sectionTitle}>
                                    {selectedStationBins.length > 1 ? 'Selected Bin Details' : 'Bin Details'}
                                </Text>
                                <View style={styles.binDetailCard}>
                                    <View style={styles.binDetailHeader}>
                                        <View style={[styles.binDetailIcon, { backgroundColor: getBinColor(selectedBin.type_name) }]}>
                                            <Icon name={getBinIcon(selectedBin.type_name)} size={30} color="#fff" />
                                        </View>
                                        <View style={styles.binDetailInfo}>
                                            <Text style={styles.binDetailName}>{selectedBin.bin_name}</Text>
                                            <Text style={styles.binDetailType}>{selectedBin.type_name} Bin</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={styles.detailRow}>
                                        <Icon name="information" size={20} color="#666" />
                                        <Text style={styles.detailText}>
                                            Status: <Text style={{ color: getStatusColor(selectedBin.status), fontWeight: 'bold' }}>
                                                {selectedBin.status}
                                            </Text>
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.detailRow}>
                                        <Icon name="map-marker" size={20} color="#666" />
                                        <Text style={styles.detailText}>
                                            {selectedBin.station_name ? `Station: ${selectedBin.station_name}` : `Location: ${selectedBin.location_description || 'Recycling Station'}`}
                                        </Text>
                                    </View>
                                    
                                    <View style={styles.detailRow}>
                                        <Icon name="update" size={20} color="#666" />
                                        <Text style={styles.detailText}>
                                            Last Updated: {new Date(selectedBin.updated_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Action Buttons */}
                    {selectedBin && (
                        <View style={styles.bottomSheetActions}>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.navigateButton]}
                                onPress={handleGetDirections}
                            >
                                <Icon name="directions" size={20} color="#FFFFFF" />
                                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Get Directions</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.reportButton]}
                                onPress={() => {
                                    console.log('Navigating to Report with bin:', selectedBin);
                                    closeBottomSheet();
                                    
                                    if (!selectedBin) {
                                        Alert.alert('Error', 'No bin selected');
                                        return;
                                    }
                                    
                                    const reportData = {
                                        bin_id: selectedBin.bin_id || 0,
                                        original_bin_id: selectedBin.original_bin_id || selectedBin.bin_id,
                                        id: selectedBin.id,
                                        
                                        station_bin_id: selectedBin.station_bin_id,
                                        isStationBin: selectedBin.isStationBin || false,
                                        
                                        bin_name: selectedBin.bin_name || `${selectedBin.type_name} Bin`,
                                        type_name: selectedBin.type_name,
                                        location_description: selectedBin.location_description || 'Recycling Bin',
                                        status: selectedBin.status,
                                        latitude: selectedBin.latitude,
                                        longitude: selectedBin.longitude,
                                        updated_at: selectedBin.updated_at,
                                        
                                        ...(selectedBin.isStationBin && {
                                            station_info: selectedBin.station_info,
                                            station_id: selectedBin.station_id,
                                            station_name: selectedBin.station_name,
                                            station_latitude: selectedBin.station_latitude,
                                            station_longitude: selectedBin.station_longitude
                                        })
                                    };
                                    
                                    console.log('Passing to ReportScreen:', reportData);
                                    
                                    setTimeout(() => {
                                        navigation.navigate('Report', { 
                                            bin: reportData  
                                        });
                                    }, 300);
                                }}
                            >
                                <Icon name="alert-circle" size={20} color="#FFFFFF" />
                                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Report Issue</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    },
    
    // Header Styles
    header: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
        borderRadius: 10,
        padding: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        flex: 1,
        marginLeft: 10,
    },
    headerTitleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    
    // Selected Types Display
    selectedTypesContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
    },
    selectedTypeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        elevation: 2,
    },
    selectedTypeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
        marginHorizontal: 6,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        elevation: 2,
    },
    clearButtonText: {
        color: '#F44336',
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    
    // Filtered Bins Card
    filteredBinsCard: {
        position: 'absolute',
        top: 120,
        left: 10,
        right: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        maxHeight: height * 0.4,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    filteredBinsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    filteredBinsTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    filteredBinsList: {
        maxHeight: height * 0.3,
        padding: 10,
    },
    filteredBinItem: {
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#F9F9F9',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    filteredBinItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    filteredBinIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    filteredBinName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    filteredBinLocation: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    filteredBinStatus: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    filteredBinDistance: {
        fontSize: 11,
        color: '#2196F3',
        fontWeight: '500',
    },
    filteredBinsMore: {
        textAlign: 'center',
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
        padding: 10,
    },
    
    // Results Card
    resultsCard: {
        position: 'absolute',
        top: 50,
        left: 10,
        right: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        maxHeight: height * 0.4,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    resultsTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    resultsList: {
        maxHeight: height * 0.3,
    },
    stationResult: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    stationResultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    stationResultTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    stationResultText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    stationResultTypes: {
        fontSize: 12,
        color: '#2196F3',
        marginBottom: 4,
    },
    stationResultBins: {
        fontSize: 11,
        color: '#795548',
        marginBottom: 4,
    },
    stationResultStatus: {
        fontSize: 11,
        color: '#666',
        fontStyle: 'italic',
    },
    
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        marginHorizontal: 4,
        borderRadius: 8,
    },
    primaryAction: {
        backgroundColor: '#4CAF50',
    },
    actionButtonText: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 4,
    },
    
    // Marker Styles
    markerContainer: {
        alignItems: 'center',
    },
    markerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    statusDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    
    // Station Marker
    stationMarker: {
        alignItems: 'center',
    },
    stationBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: '#2196F3',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    stationBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: 'bold',
    },
    
    // Callout Styles
    calloutContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        width: 200,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    calloutTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    calloutType: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    calloutStatus: {
        fontSize: 11,
        color: '#666',
        marginBottom: 4,
    },
    calloutDistance: {
        fontSize: 11,
        color: '#2196F3',
        fontWeight: '500',
        marginBottom: 8,
    },
    calloutButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    calloutButtonText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    
    // Station Callout
    stationCallout: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        width: 200,
    },
    stationCalloutTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
    },
    stationCalloutText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    stationCalloutButton: {
        backgroundColor: '#FF9800',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 8,
    },
    stationCalloutButtonText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    
    // Filter Modal
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
    modalActionButton2: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#FF9800',
        marginHorizontal: 5,
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
    
    // Bottom Sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        elevation: 10,
    },
    bottomSheetHeader: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CCCCCC',
        borderRadius: 2,
    },
    closeSheetButton: {
        position: 'absolute',
        right: 15,
        top: 10,
        padding: 5,
    },
    bottomSheetContent: {
        padding: 20,
        maxHeight: 400,
    },
    stationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    stationHeaderInfo: {
        flex: 1,
        marginLeft: 15,
    },
    stationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    stationLocation: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    stationBinCount: {
        fontSize: 12,
        color: '#2196F3',
        fontStyle: 'italic',
    },
    selectedBinItem: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        borderWidth: 1,
        borderColor: '#4CAF50',
        borderRadius: 8,
    },
    selectedBinDetails: {
        marginTop: 20,
    },
    binDetailCard: {
        backgroundColor: '#F9F9F9',
        borderRadius: 10,
        padding: 15,
        marginTop: 10,
    },
    binDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    binDetailIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    binDetailInfo: {
        flex: 1,
    },
    binDetailName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    binDetailType: {
        fontSize: 14,
        color: '#666',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        marginTop: 5,
    },
    binListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    binListInfo: {
        flex: 1,
        marginLeft: 12,
    },
    binListTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    binListType: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    binListStatus: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    matchBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#4CAF50',
        marginRight: 8,
    },
    matchText: {
        fontSize: 11,
        color: '#4CAF50',
    },
    disabledButton: {
        backgroundColor: '#CCCCCC',
    },
    binIconSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailText: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        marginLeft: 10,
    },
    bottomSheetActions: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    navigateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
    },
    reportButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F44336',
        paddingVertical: 12,
        borderRadius: 8,
        marginLeft: 8,
    },
});

export default EcoMapScreen;