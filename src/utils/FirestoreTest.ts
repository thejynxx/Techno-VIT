import { doc, setDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export class FirestoreTest {
  public static async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Firestore connection...');
      
      // Test 1: Try to write a simple test document
      const testDocRef = doc(db, 'test', 'connection-test');
      const testData = {
        message: 'Firestore connection test',
        timestamp: new Date(),
        testId: Math.random().toString(36).substr(2, 9)
      };
      
      console.log('Attempting to write test document...');
      await setDoc(testDocRef, testData);
      console.log('Test document written successfully');
      
      // Test 2: Try to read the document back
      console.log('Attempting to read test document...');
      const docSnap = await getDoc(testDocRef);
      
      if (docSnap.exists()) {
        console.log('Test document read successfully:', docSnap.data());
        return true;
      } else {
        console.error('Test document was not found after writing');
        return false;
      }
    } catch (error: any) {
      console.error('Firestore connection test failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return false;
    }
  }

  public static async testUserCollection(): Promise<boolean> {
    try {
      console.log('Testing users collection access...');
      
      // Test writing to users collection
      const testUserId = 'test-user-' + Math.random().toString(36).substr(2, 9);
      const testUserData = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        userType: 'canteen',
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Attempting to write to users collection...');
      await setDoc(doc(db, 'users', testUserId), testUserData);
      console.log('Test user document written successfully');
      
      // Test reading from users collection
      console.log('Attempting to read from users collection...');
      const userDoc = await getDoc(doc(db, 'users', testUserId));
      
      if (userDoc.exists()) {
        console.log('Test user document read successfully:', userDoc.data());
        return true;
      } else {
        console.error('Test user document was not found after writing');
        return false;
      }
    } catch (error: any) {
      console.error('Users collection test failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      return false;
    }
  }
}