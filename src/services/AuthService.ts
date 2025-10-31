import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../models/User';
import { FirestoreTest } from '../utils/FirestoreTest';

// Helper: deeply remove undefined values from objects/arrays before Firestore writes
const sanitizeFirestoreData = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    const arr = value.map((v) => sanitizeFirestoreData(v)).filter((v) => v !== undefined);
    return arr;
  }
  if (typeof value === 'object') {
    const sanitized: any = {};
    Object.keys(value).forEach((key) => {
      const v = sanitizeFirestoreData(value[key]);
      if (v !== undefined) {
        sanitized[key] = v;
      }
    });
    return sanitized;
  }
  return value;
};

export interface LoginCredentials {
  email: string;
  password: string;
  userType: 'canteen' | 'ngo' | 'volunteer' | 'driver';
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  userType: 'canteen' | 'ngo' | 'volunteer' | 'driver';
  canteenName?: string;
  organizationName?: string;
  organizationType?: 'ngo' | 'volunteer' | 'community_group';
  address?: string;
  contactNumber?: string;
  // Driver-specific fields
  vehicleType?: string;
  licenseNumber?: string;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(credentials: LoginCredentials): Promise<User> {
    try {
      console.log('Starting login process for:', credentials.email);
      
      // Firebase authentication
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );
      
      console.log('Firebase authentication successful for user:', userCredential.user.uid);
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      console.log('Firestore document exists:', userDoc.exists());
      
      if (!userDoc.exists()) {
        console.error('User document not found in Firestore for UID:', userCredential.user.uid);
        throw new Error('User data not found in database. Please contact support.');
      }
      
      const userData = userDoc.data() as User;
      console.log('Retrieved user data from Firestore:', userData);
      
      // Verify user type matches
      if (userData.userType !== credentials.userType) {
        console.error('User type mismatch. Expected:', credentials.userType, 'Got:', userData.userType);
        throw new Error('Invalid user type for this account');
      }
      
      this.currentUser = userData;
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      console.log('Login completed successfully');
      return userData;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    }
  }

  public async register(data: RegisterData): Promise<User> {
    try {
      console.log('Starting registration process for:', data.email);
      
      // Test Firestore connection before proceeding
      console.log('Testing Firestore connection...');
      
      const connectionTest = await FirestoreTest.testConnection();
      if (!connectionTest) {
        throw new Error('Firestore connection test failed. Please check your internet connection and Firebase configuration.');
      }
      
      const userCollectionTest = await FirestoreTest.testUserCollection();
      if (!userCollectionTest) {
        throw new Error('Users collection access test failed. Please check Firestore security rules.');
      }
      
      console.log('Firestore tests passed, proceeding with registration...');
      
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        data.email, 
        data.password
      );
      
      console.log('Firebase user created successfully:', userCredential.user.uid);
      
      // Update Firebase user profile
      await updateProfile(userCredential.user, {
        displayName: data.name
      });
      
      console.log('Firebase user profile updated');
      
      // Create user document in Firestore
      const { email, password, ...rest } = data as any;
      const profile: any = {
        id: userCredential.user.uid,
        email,
        name: rest.name,
        userType: rest.userType,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Conditionally include fields only if they exist
      if (rest.address) profile.address = rest.address;
      if (rest.contactNumber) profile.contactNumber = rest.contactNumber;

      if (rest.userType === 'canteen') {
        if (rest.canteenName) profile.canteenName = rest.canteenName;
        // Ensure organization and driver fields are not present for canteen users
        delete profile.organizationName;
        delete profile.organizationType;
        delete profile.vehicleType;
        delete profile.licenseNumber;
        profile.greenScore = 0;
      } else if (rest.userType === 'driver') {
        // Driver-specific inclusion
        if (rest.vehicleType) profile.vehicleType = rest.vehicleType;
        if (rest.licenseNumber) profile.licenseNumber = rest.licenseNumber;
        // Ensure canteen and organization fields are not present for drivers
        delete profile.canteenName;
        delete profile.organizationName;
        delete profile.organizationType;
      } else {
        // NGO / Volunteer users
        if (rest.organizationName) profile.organizationName = rest.organizationName;
        if (rest.organizationType) profile.organizationType = rest.organizationType;
        // Ensure canteen and driver fields are not present for NGO/Volunteer users
        delete profile.canteenName;
        delete profile.vehicleType;
        delete profile.licenseNumber;
        profile.impactScore = 0;
      }

      // Remove any undefined values to satisfy Firestore constraints (shallow)
      Object.keys(profile).forEach((key) => {
        if ((profile as any)[key] === undefined) {
          delete (profile as any)[key];
        }
      });

      // Deep sanitize (handles nested objects/arrays)
      const sanitizedProfile = sanitizeFirestoreData(profile);

      console.log('Attempting to save user to Firestore (sanitized):', sanitizedProfile);

      // Save to Firestore with error handling
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), sanitizedProfile);
        console.log('User successfully saved to Firestore');
      } catch (firestoreError: any) {
        console.error('Firestore save error:', firestoreError);
        console.error('Firestore error code:', firestoreError.code);
        console.error('Firestore error message:', firestoreError.message);
        
        // Delete the Firebase Auth user if Firestore save fails
        try {
          await userCredential.user.delete();
          console.log('Firebase Auth user deleted due to Firestore save failure');
        } catch (deleteError: any) {
          console.error('Failed to delete Firebase Auth user:', deleteError);
        }
        
        throw new Error(`Failed to save user data to database: ${firestoreError.message}`);
      }
      
      // Send email verification
      try {
        await sendEmailVerification(userCredential.user);
        console.log('Email verification sent');
      } catch (emailError: any) {
        console.warn('Email verification failed:', emailError.message);
        // Don't fail registration if email verification fails
      }
      
      // Verify the user was saved by reading it back
      try {
        const savedUserDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (!savedUserDoc.exists()) {
          throw new Error('User was not saved to database properly');
        }
        console.log('User verification successful - user exists in database');
      } catch (verificationError: any) {
        console.error('User verification failed:', verificationError);
        throw new Error('Registration completed but user data verification failed');
      }
      
      this.currentUser = profile as User;
      await AsyncStorage.setItem('user', JSON.stringify(profile));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      console.log('Registration completed successfully');
      return profile as User;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'Registration failed. Please try again.');
    }
  }

  public async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('isLoggedIn');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error('Logout failed. Please try again.');
    }
  }

  public async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      // Check if user is authenticated with Firebase
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          this.currentUser = userDoc.data() as User;
          await AsyncStorage.setItem('user', JSON.stringify(this.currentUser));
          return this.currentUser;
        }
      }

      // Fallback to AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        return this.currentUser;
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }

    return null;
  }

  public async isAuthenticated(): Promise<boolean> {
    try {
      // Check Firebase auth state
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        return true;
      }
      
      // Fallback to AsyncStorage
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      return isLoggedIn === 'true';
    } catch (error) {
      return false;
    }
  }

  public async updateProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const updatedUser = {
        ...this.currentUser,
        ...updates,
        updatedAt: new Date(),
      } as any;

      // Remove any undefined values (shallow)
      Object.keys(updatedUser).forEach((key) => {
        if (updatedUser[key] === undefined) {
          delete updatedUser[key];
        }
      });

      // Deep sanitize before Firestore write
      const sanitizedUpdatedUser = sanitizeFirestoreData(updatedUser);

      // Update in Firestore
      await updateDoc(doc(db, 'users', this.currentUser.id), sanitizedUpdatedUser);
      
      this.currentUser = sanitizedUpdatedUser as User;
      await AsyncStorage.setItem('user', JSON.stringify(this.currentUser));
      
      return this.currentUser;
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  }

  public async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  public async verifyEmail(token: string): Promise<void> {
    // Email verification is handled automatically by Firebase
    // This method can be used for additional verification logic if needed
    console.log('Email verification with token:', token);
  }

  // Add auth state listener
  public onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            this.currentUser = userData;
            await AsyncStorage.setItem('user', JSON.stringify(userData));
            await AsyncStorage.setItem('isLoggedIn', 'true');
            callback(userData);
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          callback(null);
        }
      } else {
        this.currentUser = null;
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('isLoggedIn');
        callback(null);
      }
    });
  }
}

export default AuthService.getInstance();