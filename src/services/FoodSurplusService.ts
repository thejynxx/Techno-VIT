import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FoodSurplus } from '../models/FoodSurplus';

export interface CreateFoodSurplusData {
  canteenId: string;
  canteenName: string;
  foodName: string;
  category: 'vegetarian' | 'non-vegetarian' | 'vegan' | 'beverages' | 'snacks' | 'desserts';
  quantity: number;
  unit: string;
  expiryTime: Date;
  pickupLocation: string;
  additionalInfo?: string;
  imageUrl?: string;
}

class FoodSurplusService {
  private static instance: FoodSurplusService;
  private collectionName = 'foodSurplus';

  private constructor() {}

  public static getInstance(): FoodSurplusService {
    if (!FoodSurplusService.instance) {
      FoodSurplusService.instance = new FoodSurplusService();
    }
    return FoodSurplusService.instance;
  }

  public async createFoodSurplus(data: CreateFoodSurplusData): Promise<FoodSurplus> {
    try {
      const newSurplus: Omit<FoodSurplus, 'id'> = {
        ...data,
        status: 'available',
        createdAt: new Date(),
        updatedAt: new Date(),
        claimedBy: null,
        claimedAt: null,
        assignedDriverId: null,
        assignedDriverName: null,
      };

      const docRef = await addDoc(collection(db, this.collectionName), {
        ...newSurplus,
        createdAt: Timestamp.fromDate(newSurplus.createdAt),
        updatedAt: Timestamp.fromDate(newSurplus.updatedAt),
        expiryTime: Timestamp.fromDate(newSurplus.expiryTime),
      });

      return {
        id: docRef.id,
        ...newSurplus,
      };
    } catch (error: any) {
      console.error('Error creating food surplus:', error);
      throw new Error(error.message || 'Failed to create food surplus');
    }
  }

  public async getFoodSurplusByCanteen(canteenId: string): Promise<FoodSurplus[]> {
    try {
      // Avoid composite index requirement by removing orderBy from the query and sorting client-side
      const q = query(
        collection(db, this.collectionName),
        where('canteenId', '==', canteenId)
      );

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          expiryTime: data.expiryTime.toDate(),
          claimedAt: data.claimedAt ? data.claimedAt.toDate() : null,
          driverPickupVerifiedAt: data.driverPickupVerifiedAt ? data.driverPickupVerifiedAt.toDate() : null,
          ngoDeliveryVerifiedAt: data.ngoDeliveryVerifiedAt ? data.ngoDeliveryVerifiedAt.toDate() : null,
        } as FoodSurplus;
      });
      // Sort by createdAt desc on the client
      return items.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
    } catch (error: any) {
      console.error('Error fetching canteen food surplus:', error);
      throw new Error(error.message || 'Failed to fetch food surplus');
    }
  }

  public async getAvailableFoodSurplus(): Promise<FoodSurplus[]> {
    try {
      // Query only by status to avoid composite index; filter and sort client-side
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'available')
      );

      const querySnapshot = await getDocs(q);
      const now = Date.now();
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const parsed: FoodSurplus = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          expiryTime: data.expiryTime.toDate(),
          claimedAt: data.claimedAt ? data.claimedAt.toDate() : null,
          driverPickupVerifiedAt: data.driverPickupVerifiedAt ? data.driverPickupVerifiedAt.toDate() : null,
          ngoDeliveryVerifiedAt: data.ngoDeliveryVerifiedAt ? data.ngoDeliveryVerifiedAt.toDate() : null,
        } as FoodSurplus;
        return parsed;
      })
      // Filter out expired entries client-side
      .filter(item => item.expiryTime && item.expiryTime.getTime() > now)
      // Sort by soonest expiry
      .sort((a, b) => (a.expiryTime?.getTime?.() || 0) - (b.expiryTime?.getTime?.() || 0));

      // Limit to 50
      return items.slice(0, 50);
    } catch (error: any) {
      console.error('Error fetching available food surplus:', error);
      throw new Error(error.message || 'Failed to fetch available food surplus');
    }
  }

  public async claimFoodSurplus(surplusId: string, claimedBy: string, claimerName: string): Promise<void> {
    try {
      const surplusRef = doc(db, this.collectionName, surplusId);
      await updateDoc(surplusRef, {
        status: 'claimed',
        claimedBy: claimedBy,
        claimerName: claimerName,
        claimedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      console.error('Error claiming food surplus:', error);
      throw new Error(error.message || 'Failed to claim food surplus');
    }
  }

  public async updateFoodSurplusStatus(
    surplusId: string, 
    status: 'available' | 'claimed' | 'collected' | 'expired'
  ): Promise<void> {
    try {
      const surplusRef = doc(db, this.collectionName, surplusId);
      await updateDoc(surplusRef, {
        status: status,
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      console.error('Error updating food surplus status:', error);
      throw new Error(error.message || 'Failed to update food surplus status');
    }
  }

  public async deleteFoodSurplus(surplusId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, surplusId));
    } catch (error: any) {
      console.error('Error deleting food surplus:', error);
      throw new Error(error.message || 'Failed to delete food surplus');
    }
  }

  public async getFoodSurplusById(surplusId: string): Promise<FoodSurplus | null> {
    try {
      const docRef = doc(db, this.collectionName, surplusId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          expiryTime: data.expiryTime.toDate(),
          claimedAt: data.claimedAt ? data.claimedAt.toDate() : null,
          driverPickupVerifiedAt: data.driverPickupVerifiedAt ? data.driverPickupVerifiedAt.toDate() : null,
          ngoDeliveryVerifiedAt: data.ngoDeliveryVerifiedAt ? data.ngoDeliveryVerifiedAt.toDate() : null,
        } as FoodSurplus;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error fetching food surplus by ID:', error);
      throw new Error(error.message || 'Failed to fetch food surplus');
    }
  }

  public async getClaimedFoodSurplus(claimedBy: string): Promise<FoodSurplus[]> {
    try {
      // Query only by claimedBy; sort client-side to avoid composite index requirements
      const q = query(
        collection(db, this.collectionName),
        where('claimedBy', '==', claimedBy)
      );

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          expiryTime: data.expiryTime.toDate(),
          claimedAt: data.claimedAt ? data.claimedAt.toDate() : null,
          driverPickupVerifiedAt: data.driverPickupVerifiedAt ? data.driverPickupVerifiedAt.toDate() : null,
          ngoDeliveryVerifiedAt: data.ngoDeliveryVerifiedAt ? data.ngoDeliveryVerifiedAt.toDate() : null,
        } as FoodSurplus;
      });
      return items.sort((a, b) => (b.claimedAt?.getTime?.() || 0) - (a.claimedAt?.getTime?.() || 0));
    } catch (error: any) {
      console.error('Error fetching claimed food surplus:', error);
      throw new Error(error.message || 'Failed to fetch food surplus');
    }
  }

  // Assign a driver to a claimed surplus
  public async assignDriverToSurplus(surplusId: string, driverId: string, driverName: string): Promise<void> {
    try {
      const surplusRef = doc(db, this.collectionName, surplusId);
      await updateDoc(surplusRef, {
        assignedDriverId: driverId,
        assignedDriverName: driverName,
        updatedAt: Timestamp.now(),
      });
    } catch (error: any) {
      console.error('Error assigning driver to surplus:', error);
      throw new Error(error.message || 'Failed to assign driver');
    }
  }

  // For drivers: get surpluses assigned to them (active ones)
  public async getDriverAssignedSurplus(driverId: string): Promise<FoodSurplus[]> {
    try {
      // Query only by assignedDriverId, then filter by status client-side
      const q = query(
        collection(db, this.collectionName),
        where('assignedDriverId', '==', driverId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          expiryTime: data.expiryTime.toDate(),
          claimedAt: data.claimedAt ? data.claimedAt.toDate() : null,
          driverPickupVerifiedAt: data.driverPickupVerifiedAt ? data.driverPickupVerifiedAt.toDate() : null,
          ngoDeliveryVerifiedAt: data.ngoDeliveryVerifiedAt ? data.ngoDeliveryVerifiedAt.toDate() : null,
        } as FoodSurplus;
      }).filter(item => item.status === 'claimed' || item.status === 'available');
    } catch (error: any) {
      console.error('Error fetching driver assignments:', error);
      throw new Error(error.message || 'Failed to fetch driver assignments');
    }
  }

  // For drivers: NGOs requesting drivers are surpluses that are claimed but have no assigned driver yet
  public async getClaimedSurplusNeedingDrivers(): Promise<FoodSurplus[]> {
    try {
      // Query only by status 'claimed'; filter and sort client-side to avoid composite index requirements
      const q = query(
        collection(db, this.collectionName),
        where('status', '==', 'claimed')
      );
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          expiryTime: data.expiryTime.toDate(),
          claimedAt: data.claimedAt ? data.claimedAt.toDate() : null,
          driverPickupVerifiedAt: data.driverPickupVerifiedAt ? data.driverPickupVerifiedAt.toDate() : null,
          ngoDeliveryVerifiedAt: data.ngoDeliveryVerifiedAt ? data.ngoDeliveryVerifiedAt.toDate() : null,
        } as FoodSurplus;
      })
      .filter(item => !item.assignedDriverId)
      .sort((a, b) => (b.claimedAt?.getTime?.() || 0) - (a.claimedAt?.getTime?.() || 0));

      return items.slice(0, 50);
    } catch (error: any) {
      console.error('Error fetching claimed surplus that need drivers:', error);
      throw new Error(error.message || 'Failed to fetch claimed surplus that need drivers');
    }
  }
}

export default FoodSurplusService.getInstance();