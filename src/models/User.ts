export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'canteen' | 'ngo' | 'volunteer' | 'driver';
  
  // Canteen specific fields
  canteenName?: string;
  address?: string;
  contactNumber?: string;
  operatingHours?: string;
  capacity?: number;
  greenScore?: number;
  
  // NGO/Volunteer specific fields
  organizationName?: string;
  organizationType?: 'ngo' | 'volunteer' | 'community_group';
  servingAreas?: string[];
  impactScore?: number;
  
  // Driver specific fields
  vehicleType?: string;
  licenseNumber?: string;
  serviceAreas?: string[];
  
  // Common fields
  profilePicture?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
}