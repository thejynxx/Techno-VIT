import { initializeApp, setLogLevel } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { Platform } from 'react-native'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoACgd5HhMJD0Zk-23PA4YSLk8ag2NWFU",
  authDomain: "hackinfinity-56efd.firebaseapp.com",
  databaseURL: "https://hackinfinity-56efd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hackinfinity-56efd",
  storageBucket: "hackinfinity-56efd.appspot.com",
  messagingSenderId: "441636774631",
  appId: "1:441636774631:web:ff1a650029384a1df47842",
  measurementId: "G-MN6NMX77Y2"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Enable verbose logging on all platforms to help diagnose Storage/network issues
try {
  setLogLevel('debug')
  console.log('Firebase SDK log level set to debug (all platforms)')
} catch (e) {
  console.warn('Failed to set Firebase log level:', (e as any)?.message)
}

// Initialize Firebase Auth
const auth: Auth = getAuth(app)

// Initialize Firestore with error handling
let db: Firestore
try {
  db = getFirestore(app)
  console.log('Firestore initialized successfully')
} catch (error: any) {
  console.error('Firestore initialization failed:', error.message)
  throw error
}

// Initialize Storage with error handling
let storage: FirebaseStorage
try {
  storage = getStorage(app)
  console.log('Firebase Storage initialized successfully')
} catch (error: any) {
  console.error('Firebase Storage initialization failed:', error.message)
  throw error
}

// Initialize Analytics with better error handling
let analytics: Analytics | null = null
if (Platform.OS === 'web') {
  isSupported().then((supported) => {
    if (supported && typeof window !== 'undefined') {
      try {
        analytics = getAnalytics(app)
        console.log('Firebase Analytics initialized successfully')
      } catch (error: any) {
        console.warn('Analytics initialization failed:', error.message)
      }
    } else {
      console.log('Analytics not supported in this environment')
    }
  }).catch((error: any) => {
    console.warn('Analytics support check failed:', error.message)
  })
}

export { auth, db, analytics, storage }
export default app