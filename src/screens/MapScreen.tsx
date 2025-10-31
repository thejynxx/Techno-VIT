import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
// Removed static import from 'react-native-maps' to prevent web build error
import AuthService from '../services/AuthService';
import { LocationService } from '../services/LocationService';
import FoodSurplusService from '../services/FoodSurplusService';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import theme from '../config/theme';
// Local Region type to avoid importing from react-native-maps on web
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type UserType = 'canteen' | 'ngo' | 'driver';

interface UserLocation {
  id: string;
  name: string;
  userType: UserType;
  latitude: number;
  longitude: number;
  address: string;
}

const CHENNAI_REGION: Region = {
  latitude: 13.0827,
  longitude: 80.2707,
  latitudeDelta: 0.25,
  longitudeDelta: 0.25,
};

const NEARBY_RADIUS_KM = 10; // filter radius for "nearby"

interface RouteEndpoints {
  start: { latitude: number; longitude: number }; // canteen
  end: { latitude: number; longitude: number };   // NGO
}

// Display modes to toggle between allowed categories
// For NGO: all | canteen | driver
// For Driver: all | canteen | ngo
type DisplayMode = 'all' | 'canteen' | 'ngo' | 'driver';

export default function MapScreen() {
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserType, setCurrentUserType] = useState<UserType>('ngo');
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [assignedOnlyMode, setAssignedOnlyMode] = useState(false);
  const [route, setRoute] = useState<RouteEndpoints | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all');

  // Dynamically require react-native-maps only on native platforms
  const isWeb = Platform.OS === 'web';
  const RNMaps = !isWeb ? require('react-native-maps') : null;
  const MapViewComp = RNMaps ? RNMaps.default : null;
  const MarkerComp = RNMaps ? RNMaps.Marker : null;
  const PolylineComp = RNMaps ? RNMaps.Polyline : null;
  const PROVIDER_GOOGLE = RNMaps ? RNMaps.PROVIDER_GOOGLE : null;

  // Helpers to map display mode -> includeTypes for current role
  const getAllowedTypes = (type: UserType): Array<'canteen' | 'ngo' | 'driver'> => {
    if (type === 'ngo') return ['canteen', 'driver'];
    if (type === 'driver') return ['canteen', 'ngo'];
    return [];
  };

  const getIncludeTypes = (type: UserType, mode: DisplayMode): Array<'canteen' | 'ngo' | 'driver'> | undefined => {
    const allowed = getAllowedTypes(type);
    if (mode === 'all') return allowed;
    if (allowed.includes(mode as any)) return [mode as any];
    return allowed; // fallback safety
  };

  useEffect(() => {
    const checkLocationPermissions = async () => {
      try {
        // Check if location services are enabled
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          Alert.alert(
            'Location Services Disabled',
            'Please enable location services to use the map features.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Please grant location permissions to use the map features.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Load initial data
        const user = await AuthService.getCurrentUser();
        if (user) {
          setCurrentUserType(user.userType);
          await loadDataForType(user.userType, user.id);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
        if (error instanceof Error) {
          Alert.alert('Error', error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    checkLocationPermissions();
  }, []);

  const loadDataForType = async (type: UserType, userId: string | null) => {
    try {
      setAssignedOnlyMode(false);
      setRoute(null);

      // Determine my coordinates for proximity filtering
      let myCoords: { latitude: number; longitude: number } | null = null;
      if (userId) {
        const mine = await LocationService.getUserLocationById(userId);
        if (mine) {
          myCoords = { latitude: mine.latitude, longitude: mine.longitude };
          setMyLocation(myCoords);
        }
      }

      // Fallback for drivers: use device GPS when stored coords are unavailable
      if (!myCoords && type === 'driver') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            myCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setMyLocation(myCoords);
          }
        } catch (e) {
          console.warn('Could not get device location:', e);
        }
      }

      const include = getIncludeTypes(type, displayMode);

      if (type === 'ngo') {
        // NGOs: show ALL drivers and/or canteens based on filter (no proximity restriction)
        const allForNGO = await LocationService.getUserLocations('ngo', userId || undefined, include);
        setUserLocations(allForNGO);
      } else if (type === 'driver') {
        // Drivers: first check if this driver has an assignment; if so, show only route to that NGO
        let assigned = await FoodSurplusService.getDriverAssignedSurplus(userId || '');
        assigned = assigned.filter(s => s.status === 'claimed');
        if (assigned.length > 0) {
          const first = assigned[0];
          const canteenLoc = await LocationService.getUserLocationById(first.canteenId);
          const ngoLoc = first.claimedBy ? await LocationService.getUserLocationById(first.claimedBy) : null;
          if (canteenLoc && ngoLoc) {
            setAssignedOnlyMode(true);
            setUserLocations([canteenLoc, ngoLoc]);
            setRoute({
              start: { latitude: canteenLoc.latitude, longitude: canteenLoc.longitude },
              end: { latitude: ngoLoc.latitude, longitude: ngoLoc.longitude },
            });
            return; // do not show other markers
          }
        }

        // Otherwise: show NGOs and/or Canteens (exclude self), only if we have myCoords
        const allForDriver = await LocationService.getUserLocations('driver', userId || undefined, include);
        if (myCoords) {
          const filtered = filterNearby(allForDriver, myCoords);
          setUserLocations(filtered);
        } else {
          // Without location, don't show all markers to keep the view focused
          setUserLocations([]);
        }
      }
    } catch (err) {
      console.error('Error loading map data for type:', err);
      throw err;
    }
  };

  const filterNearby = (locations: UserLocation[], myCoords: { latitude: number; longitude: number } | null) => {
    if (!myCoords) return locations; // if we don't know my location, skip filtering
    return locations.filter(loc => {
      const d = LocationService.calculateDistance(myCoords.latitude, myCoords.longitude, loc.latitude, loc.longitude);
      return d <= NEARBY_RADIUS_KM;
    });
  };

  const loadUserLocations = async (type: UserType) => {
    try {
      setLoading(true);
      const user = await AuthService.getCurrentUser();
      await loadDataForType(type, user?.id || null);
    } catch (error) {
      console.error('Error loading user locations:', error);
      Alert.alert('Error', 'Failed to load locations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserLocations(currentUserType);
    setRefreshing(false);
  };

  const cycleDisplayMode = async () => {
    // Cycle through: all -> first allowed -> second allowed -> all
    const allowed = getAllowedTypes(currentUserType);
    const first = allowed[0];
    const second = allowed[1];

    let next: DisplayMode = 'all';
    if (displayMode === 'all') next = first as DisplayMode;
    else if (displayMode === (first as DisplayMode)) next = second as DisplayMode;
    else next = 'all';

    setDisplayMode(next);
    await loadUserLocations(currentUserType);
  };

  const currentModeLabel = () => {
    if (displayMode === 'all') return 'All';
    if (displayMode === 'canteen') return 'Canteens';
    if (displayMode === 'ngo') return 'NGOs';
    if (displayMode === 'driver') return 'Drivers';
    return 'All';
  };

  const getMarkerColor = (userType: string) => {
    switch (userType) {
      case 'canteen':
        return theme.colors.canteen;
      case 'ngo':
        return theme.colors.ngo;
      case 'driver':
        return theme.colors.driver;
      default:
        return theme.colors.border;
    }
  };

  const renderMarker = (location: UserLocation) => (
    MarkerComp ? (
      <MarkerComp
        key={location.id}
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        title={location.name}
        description={`${location.userType.toUpperCase()} - ${location.address}`}
        pinColor={getMarkerColor(location.userType)}
      />
    ) : null
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading locations...</Text>
      </View>
    );
  }

  if (currentUserType === 'canteen') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Map is available only for NGO and Driver accounts.</Text>
      </View>
    );
  }

  if (isWeb) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Map is not available on web preview. Please use the Expo Go app on a device to view the map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {MapViewComp && (
        <MapViewComp
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={CHENNAI_REGION}
          showsUserLocation={currentUserType !== 'driver'}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
        >
          {userLocations.map(renderMarker)}
          {assignedOnlyMode && route && PolylineComp && (
            <PolylineComp
              coordinates={[route.start, route.end]}
              strokeColor={theme.colors.primary}
              strokeWidth={4}
            />
          )}
        </MapViewComp>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>PlateLink Map</Text>
      </View>

      <View style={styles.footer}>
        {/* Role-specific filter swap and refresh */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.swapButton} onPress={cycleDisplayMode}>
            <Ionicons name="swap-horizontal" size={18} color={theme.colors.primary} />
            <Text style={styles.swapText}>Showing: {currentModeLabel()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color={theme.colors.textLight} />
            <Text style={styles.refreshText}>{refreshing ? 'Refreshing...' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  map: { flex: 1 },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.backgroundCard,
    padding: 12,
    borderRadius: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.backgroundCard,
    padding: 12,
    borderRadius: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleTabs: { flexDirection: 'row', marginBottom: 10 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundSecondary,
    marginRight: 10,
  },
  activeTab: { backgroundColor: theme.colors.primary },
  tabText: { marginLeft: 6, color: theme.colors.primary, fontWeight: '600' },
  activeTabText: { color: theme.colors.textLight },
  swapButton: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  swapText: { marginLeft: 6, color: theme.colors.primary, fontWeight: '700' },
  refreshButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  refreshText: { color: theme.colors.textLight, marginLeft: 6, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 8, color: theme.colors.primary },
});