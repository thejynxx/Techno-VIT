import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

// Geocoding service using Expo Location

interface UserLocation {
  id: string;
  name: string;
  userType: 'canteen' | 'ngo' | 'driver';
  latitude: number;
  longitude: number;
  address: string;
}

interface FirestoreUser {
  id: string;
  name: string;
  userType: 'canteen' | 'ngo' | 'driver';
  address?: string;
  organizationName?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

// Chennai bounds for filtering locations
const CHENNAI_BOUNDS = {
  north: 13.2544,
  south: 12.8344,
  east: 80.3464,
  west: 80.1464,
};

export class LocationService {
  /**
   * Check if coordinates are within Chennai bounds
   */
  private static isWithinChennai(latitude: number, longitude: number): boolean {
    return (
      latitude >= CHENNAI_BOUNDS.south &&
      latitude <= CHENNAI_BOUNDS.north &&
      longitude >= CHENNAI_BOUNDS.west &&
      longitude <= CHENNAI_BOUNDS.east
    );
  }

  /**
   * Prefer stored coordinates on the user document if available and valid
   */
  private static getCoordsFromUser(userData: FirestoreUser): { latitude: number; longitude: number; address: string } | null {
    const lat = userData.location?.latitude;
    const lon = userData.location?.longitude;
    const addr = userData.location?.address || userData.address || '';
    if (typeof lat === 'number' && typeof lon === 'number' && this.isWithinChennai(lat, lon)) {
      return { latitude: lat, longitude: lon, address: addr };
    }
    return null;
  }

  /**
   * Geocode an address to get latitude and longitude using Expo Location
   */
  static async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      // On web, return a default Chennai location to avoid browser limitations
      if (Platform.OS === 'web') {
        console.warn('Geocoding not available on web, using default Chennai location');
        return {
          latitude: 13.0827,
          longitude: 80.2707
        };
      }

      // Add Chennai, India to the address for better accuracy
      const fullAddress = address?.includes('Chennai') ? address : `${address}, Chennai, India`;

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please grant location permissions to use the map features.',
          [{ text: 'OK' }]
        );
        return null;
      }

      // Ensure location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services to use the map features.',
          [{ text: 'OK' }]
        );
        return null;
      }

      const geocodedLocation = await Location.geocodeAsync(fullAddress);
      
      if (geocodedLocation && geocodedLocation.length > 0) {
        const { latitude, longitude } = geocodedLocation[0];

        // Check if the location is within Chennai bounds
        if (this.isWithinChennai(latitude, longitude)) {
          return { latitude, longitude };
        } else {
          console.warn(`Address "${address}" is outside Chennai bounds`);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      if (error instanceof Error) {
        Alert.alert('Location Error', error.message);
      }
      return null;
    }
  }

  /**
   * Get user locations visible to the current user, with optional type filters
   * - NGOs can see: canteens, drivers
   * - Drivers can see: canteens, NGOs
   * includeTypes: further narrows down which of the visible categories to include
   */
  static async getUserLocations(
    currentUserType: string,
    excludeUserId?: string,
    includeTypes?: Array<'canteen' | 'ngo' | 'driver'>
  ): Promise<UserLocation[]> {
    try {
      const usersRef = collection(db, 'users');

      // Define what user types the current user can see
      let allowed: Array<'canteen' | 'ngo' | 'driver'> = [];
      if (currentUserType === 'ngo') {
        allowed = ['canteen', 'driver'];
      } else if (currentUserType === 'driver' || currentUserType === 'volunteer') {
        // normalize volunteer to driver visibility
        allowed = ['canteen', 'ngo'];
      } else {
        // Canteens shouldn't access this (but if they do, show nothing)
        return [];
      }

      const finalTypes = includeTypes && includeTypes.length > 0
        ? allowed.filter((t) => includeTypes.includes(t))
        : allowed;

      if (finalTypes.length === 0) return [];

      const userQuery = query(usersRef, where('userType', 'in', finalTypes));
      const querySnapshot = await getDocs(userQuery);
      const locations: UserLocation[] = [];

      for (const doc of querySnapshot.docs) {
        const userData = doc.data() as FirestoreUser;

        // Do not include the current user in the results
        if (excludeUserId && doc.id === excludeUserId) {
          continue;
        }
        
        // Prefer stored coordinates if available
        const stored = this.getCoordsFromUser(userData);
        if (stored) {
          locations.push({
            id: doc.id,
            name: userData.organizationName || userData.name,
            userType: userData.userType,
            latitude: stored.latitude,
            longitude: stored.longitude,
            address: stored.address || userData.address || '',
          });
          continue;
        }

        if (!userData.address) {
          console.warn(`User ${userData.name} has no address`);
          continue;
        }

        // Geocode the address as a fallback (may be skipped on web)
        const coordinates = await this.geocodeAddress(userData.address);
        
        if (coordinates) {
          locations.push({
            id: doc.id,
            name: userData.organizationName || userData.name,
            userType: userData.userType,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            address: userData.address,
          });
        }
      }

      return locations;
    } catch (error) {
      console.error('Error fetching user locations:', error);
      throw new Error('Failed to fetch user locations');
    }
  }

  /**
   * Get a specific user's location by ID
   */
  static async getUserLocationById(userId: string): Promise<UserLocation | null> {
    try {
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('__name__', '==', userId));
      const querySnapshot = await getDocs(userQuery);

      if (querySnapshot.empty) {
        return null;
      }

      const docSnap = querySnapshot.docs[0];
      const userData = docSnap.data() as FirestoreUser;

      // Prefer stored coordinates if available
      const stored = this.getCoordsFromUser(userData);
      if (stored) {
        return {
          id: docSnap.id,
          name: userData.organizationName || userData.name,
          userType: userData.userType,
          latitude: stored.latitude,
          longitude: stored.longitude,
          address: stored.address || userData.address || '',
        };
      }

      if (!userData.address) {
        return null;
      }

      const coordinates = await this.geocodeAddress(userData.address);
      
      if (coordinates) {
        return {
          id: docSnap.id,
          name: userData.organizationName || userData.name,
          userType: userData.userType,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          address: userData.address,
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching user location by ID:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (in kilometers)
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}