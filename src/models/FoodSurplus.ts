export interface FoodSurplus {
  id: string;
  canteenId: string;
  canteenName: string;
  foodName: string;
  category: 'vegetarian' | 'non-vegetarian' | 'vegan' | 'beverages' | 'snacks' | 'desserts';
  quantity: number;
  unit: string;
  
  // Timing
  expiryTime: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Status
  status: 'available' | 'claimed' | 'collected' | 'expired';
  claimedBy: string | null; // NGO/Volunteer ID
  claimerName?: string; // NGO/Volunteer Name
  claimedAt: Date | null;
  
  // Driver assignment
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  
  // Location
  pickupLocation: string;
  
  // Additional info
  imageUrl?: string;
  additionalInfo?: string;

  // Delivery verification
  deliveryCode?: string; // 4-digit code generated when a driver is assigned
  driverPickupVerifiedAt?: Date | null; // set when canteen verifies pickup OTP
  ngoDeliveryVerifiedAt?: Date | null; // set when NGO verifies delivery OTP
}