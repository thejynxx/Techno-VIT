import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, TextInput, Platform } from 'react-native';
import AuthService from '../services/AuthService';
import FoodSurplusService from '../services/FoodSurplusService';
import { FoodSurplus } from '../models/FoodSurplus';
import { collection, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ClaimedFoodScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<FoodSurplus[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState<string>('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const u = await AuthService.getCurrentUser();
      if (!u || u.userType !== 'ngo') {
        Alert.alert('Not allowed', 'Only NGO users can view claimed items.');
        setLoading(false);
        return;
      }
      setUser(u);
      const list = await FoodSurplusService.getClaimedFoodSurplus(u.id);
      setItems(list);
    } catch (e) {
      console.error('Failed to load claimed items', e);
      Alert.alert('Error', 'Unable to load your claimed items.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      if (!user) return;
      const list = await FoodSurplusService.getClaimedFoodSurplus(user.id);
      setItems(list);
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const formatTime = (d?: Date | null) => {
    if (!d) return '';
    const mins = Math.max(1, Math.round((d.getTime() - Date.now()) / 60000));
    if (mins < 60) return `${mins} min left`;
    const hrs = Math.round(mins / 60);
    return `${hrs} hr${hrs !== 1 ? 's' : ''} left`;
  };

  const startVerifyDelivery = (id: string) => {
    setVerifyingId(id);
    setCodeInput('');
  };

  const cancelVerifyDelivery = () => {
    setVerifyingId(null);
    setCodeInput('');
  };

  const submitVerifyDelivery = async (item: FoodSurplus) => {
    try {
      const code = codeInput.trim();
      if (!code) {
        Alert.alert('Enter code', 'Please enter the 4-digit delivery code.');
        return;
      }
      const ref = doc(collection(db, 'foodSurplus'), item.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        Alert.alert('Error', 'Record not found.');
        return;
      }
      const data: any = snap.data();
      if (!data.deliveryCode) {
        Alert.alert('Not ready', 'No delivery code set yet. Please wait for driver assignment.');
        return;
      }
      if (String(data.deliveryCode) !== code) {
        Alert.alert('Incorrect code', 'The code you entered does not match.');
        return;
      }
      if (!data.driverPickupVerifiedAt) {
        Alert.alert('Not ready', 'Driver has not yet picked up this item from the canteen.');
        return;
      }
      await updateDoc(ref, { 
        ngoDeliveryVerifiedAt: Timestamp.now(), 
        status: 'collected',
        updatedAt: Timestamp.now() 
      });
      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, ngoDeliveryVerifiedAt: new Date(), status: 'collected' } : s)));
      setVerifyingId(null);
      setCodeInput('');
      Alert.alert('Delivery confirmed', 'Thank you for confirming the delivery!');
    } catch (e) {
      console.error('Verify delivery failed', e);
      Alert.alert('Error', 'Failed to verify delivery. Try again.');
    }
  };

  const getDeliveryStatus = (item: FoodSurplus) => {
    if (item.ngoDeliveryVerifiedAt) return 'Delivered';
    if (!item.assignedDriverId) return 'Awaiting driver assignment';
    if (!item.driverPickupVerifiedAt) return 'Driver assigned, awaiting pickup';
    return 'On the way to you';
  };

  const getStatusColor = (item: FoodSurplus) => {
    if (item.ngoDeliveryVerifiedAt) return '#4CAF50';
    if (!item.assignedDriverId) return '#FF9800';
    if (!item.driverPickupVerifiedAt) return '#2196F3';
    return '#9C27B0';
  };

  const active = items.filter((i) => i.status === 'claimed');
  const delivered = items.filter((i) => i.status === 'collected');

  const renderItem = ({ item }: { item: FoodSurplus }) => {
    const canVerifyDelivery = item.status === 'claimed' && 
                             !!item.assignedDriverId && 
                             !!item.driverPickupVerifiedAt && 
                             !item.ngoDeliveryVerifiedAt;
    
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.foodName}>{item.foodName}</Text>
          <Text style={styles.meta}>{item.quantity} {item.unit} • Expires: {formatTime(item.expiryTime)}</Text>
          <Text style={styles.location}>Pickup from: {item.pickupLocation}</Text>
          {item.assignedDriverName && (
            <Text style={styles.status}>Driver: {item.assignedDriverName}</Text>
          )}
          <Text style={[styles.status, { color: getStatusColor(item) }]}>
            Status: {getDeliveryStatus(item)}
          </Text>
          {!item.deliveryCode && item.status === 'claimed' && (
            <Text style={[styles.hint, { marginTop: 6 }]}>Waiting for driver assignment to generate code…</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          {canVerifyDelivery ? (
            verifyingId === item.id ? (
              <View style={{ width: 180 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter delivery code"
                  keyboardType={Platform.select({ ios: 'number-pad', android: 'numeric', default: 'numeric' })}
                  maxLength={6}
                  value={codeInput}
                  onChangeText={setCodeInput}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => submitVerifyDelivery(item)}>
                    <Text style={styles.primaryBtnText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={cancelVerifyDelivery}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => startVerifyDelivery(item.id)}>
                <Text style={styles.primaryBtnText}>Confirm Delivery</Text>
              </TouchableOpacity>
            )
          ) : (
            <Text style={styles.hint}>
              {item.ngoDeliveryVerifiedAt ? 'Delivered' : 'Awaiting delivery'}
            </Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 8, color: '#666' }}>Loading your claims…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>My Claims</Text>
        <Text style={styles.subtitle}>Track your claimed items and confirm deliveries</Text>
      </View>

      <FlatList
        data={active}
        keyExtractor={(item) => `${item.id}-active`}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<Text style={styles.sectionTitle}>On The Way</Text>}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: '#666' }}>No items on the way.</Text>
          </View>
        }
      />

      <FlatList
        data={delivered}
        keyExtractor={(item) => `${item.id}-delivered`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.foodName}</Text>
              <Text style={styles.meta}>{item.quantity} {item.unit}</Text>
              <Text style={styles.location}>From: {item.pickupLocation}</Text>
              <Text style={[styles.status, { color: '#4CAF50' }]}>Status: Delivered</Text>
            </View>
            <Text style={[styles.hint, { color: '#4CAF50' }]}>✓ Completed</Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Delivered</Text>}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: '#666' }}>No delivered items yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: '700', color: '#333' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginHorizontal: 16, marginTop: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  foodName: { fontSize: 16, fontWeight: '700', color: '#2196F3' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  location: { fontSize: 12, color: '#444', marginTop: 4 },
  status: { fontSize: 12, color: '#333', marginTop: 4 },
  hint: { fontSize: 12, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fafafa' },
  primaryBtn: { backgroundColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  secondaryBtnText: { color: '#2196F3', fontWeight: '700' },
});