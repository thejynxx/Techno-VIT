import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthService from '../services/AuthService';
import FoodSurplusService from '../services/FoodSurplusService';
import { FoodSurplus } from '../models/FoodSurplus';

const PickupRequestsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [availableFood, setAvailableFood] = useState<FoodSurplus[]>([]);
  const navigation = useNavigation();

  const loadAvailableFood = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to view available food.');
        return;
      }
      const foodSurplus = await FoodSurplusService.getAvailableFoodSurplus();
      setAvailableFood(foodSurplus);
    } catch (error) {
      console.error('Failed to load available food:', error);
      Alert.alert('Error', 'Failed to load available food. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableFood();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAvailableFood();
    setRefreshing(false);
  };

  const handleClaim = async (item: FoodSurplus) => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to claim food.');
        return;
      }

      await FoodSurplusService.claimFoodSurplus(item.id, currentUser.id, currentUser.organizationName || currentUser.name);
      Alert.alert('Success', 'Food claimed successfully! Check your claims for details.');
      await loadAvailableFood(); // Refresh the list
      navigation.navigate('ClaimedFoodScreen' as never);
    } catch (error) {
      console.error('Failed to claim food:', error);
      Alert.alert('Error', 'Failed to claim food. Please try again.');
    }
  };

  const formatExpiryTime = (expiryTime: Date) => {
    const now = new Date();
    const diffHours = Math.max(0, Math.ceil((expiryTime.getTime() - now.getTime()) / (1000 * 60 * 60)));
    return `${diffHours} hours`;
  };

  const renderItem = ({ item }: { item: FoodSurplus }) => (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Text style={styles.foodName}>{item.foodName}</Text>
        <Text style={styles.canteenName}>{item.canteenName}</Text>
        <Text style={styles.details}>
          Quantity: {item.quantity} {item.unit}
        </Text>
        <Text style={styles.details}>
          Expires in: {formatExpiryTime(item.expiryTime)}
        </Text>
        <Text style={styles.details}>
          Pickup Location: {item.pickupLocation}
        </Text>
        {item.additionalInfo && (
          <Text style={styles.details}>
            Additional Info: {item.additionalInfo}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.claimButton}
        onPress={() => handleClaim(item)}
      >
        <Text style={styles.claimButtonText}>Claim</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading available food...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={availableFood}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No available food pickups at the moment.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    marginBottom: 12,
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  canteenName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  details: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default PickupRequestsScreen;