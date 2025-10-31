import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import AuthService from '../services/AuthService';
import FoodSurplusService from '../services/FoodSurplusService';
import ChatService from '../services/ChatService';
import { FoodSurplus } from '../models/FoodSurplus';
import { collection, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function DriverDeliveriesScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [needingDrivers, setNeedingDrivers] = useState<FoodSurplus[]>([]);
  const [assigned, setAssigned] = useState<FoodSurplus[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const u = await AuthService.getCurrentUser();
      if (!u || (u.userType !== 'driver' && u.userType !== 'volunteer')) {
        Alert.alert('Not allowed', 'Deliveries are only available for driver accounts.');
        setLoading(false);
        return;
      }
      setUser(u);
      const need = await FoodSurplusService.getClaimedSurplusNeedingDrivers();
      const mine = await FoodSurplusService.getDriverAssignedSurplus(u.id);
      setNeedingDrivers(need);
      setAssigned(mine);
    } catch (e) {
      console.error('Failed to load deliveries', e);
      Alert.alert('Error', 'Unable to load deliveries right now.');
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
      const need = await FoodSurplusService.getClaimedSurplusNeedingDrivers();
      const mine = user ? await FoodSurplusService.getDriverAssignedSurplus(user.id) : [];
      setNeedingDrivers(need);
      setAssigned(mine);
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

  const ensureDeliveryCode = async (surplusId: string): Promise<string | null> => {
    try {
      const ref = doc(collection(db, 'foodSurplus'), surplusId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      const data: any = snap.data();
      if (data.deliveryCode) return String(data.deliveryCode);
      const code = String(Math.floor(1000 + Math.random() * 9000));
      await updateDoc(ref, { deliveryCode: code, updatedAt: Timestamp.now() });
      return code;
    } catch (e) {
      console.warn('Failed to ensure delivery code', e);
      return null;
    }
  };

  const handleClaim = async (item: FoodSurplus) => {
    try {
      if (!user) return;
      const displayName = user.name || user.organizationName || 'Driver';
      await FoodSurplusService.assignDriverToSurplus(item.id, user.id, displayName);
      // Generate/ensure verification code and notify NGO and canteen via chat
      const code = await ensureDeliveryCode(item.id);
      // Create or get chats
      const chatNgo = await ChatService.getOrCreateOneToOneChat(
        { id: user.id, name: displayName, userType: (user.userType === 'volunteer' ? 'driver' : user.userType) },
        { id: item.claimedBy || '', name: item.claimerName || 'NGO', userType: 'ngo' },
        item.id
      );
      const chatCanteen = await ChatService.getOrCreateOneToOneChat(
        { id: user.id, name: displayName, userType: (user.userType === 'volunteer' ? 'driver' : user.userType) },
        { id: item.canteenId, name: item.canteenName, userType: 'canteen' },
        item.id
      );
      if (code) {
        await ChatService.sendMessage(chatNgo.id, user.id, (user.userType === 'volunteer' ? 'driver' : user.userType), `Pickup verification code: ${code}`);
        await ChatService.sendMessage(chatCanteen.id, user.id, (user.userType === 'volunteer' ? 'driver' : user.userType), `Pickup verification code: ${code}`);
      }
      // Update lists
      setNeedingDrivers((prev) => prev.filter((s) => s.id !== item.id));
      setAssigned((prev) => [{ ...item, assignedDriverId: user.id, assignedDriverName: displayName } as any, ...prev]);
      Alert.alert('Assigned', 'You have been assigned to this delivery. Chats with NGO and canteen are ready.');
    } catch (e) {
      console.error('Claim delivery failed', e);
      Alert.alert('Error', 'Unable to claim this delivery. It may have been taken by another driver.');
    }
  };

  const openChatWithNgo = async (item: FoodSurplus) => {
    if (!user) return;
    const displayName = user.name || user.organizationName || 'Driver';
    const chatNgo = await ChatService.getOrCreateOneToOneChat(
      { id: user.id, name: displayName, userType: (user.userType === 'volunteer' ? 'driver' : user.userType) },
      { id: item.claimedBy || '', name: item.claimerName || 'NGO', userType: 'ngo' },
      item.id
    );
    navigation.navigate('ChatScreen', { chatId: chatNgo.id, otherUserName: item.claimerName || 'NGO', otherUserType: 'ngo' });
  };

  const openChatWithCanteen = async (item: FoodSurplus) => {
    if (!user) return;
    const displayName = user.name || user.organizationName || 'Driver';
    const chatCanteen = await ChatService.getOrCreateOneToOneChat(
      { id: user.id, name: displayName, userType: (user.userType === 'volunteer' ? 'driver' : user.userType) },
      { id: item.canteenId, name: item.canteenName, userType: 'canteen' },
      item.id
    );
    navigation.navigate('ChatScreen', { chatId: chatCanteen.id, otherUserName: item.canteenName, otherUserType: 'canteen' });
  };

  const renderNeedItem = ({ item }: { item: FoodSurplus }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.canteenName}>{item.canteenName}</Text>
        <Text style={styles.foodName}>{item.foodName}</Text>
        <Text style={styles.meta}>{item.quantity} {item.unit} • Expires: {formatTime(item.expiryTime)}</Text>
        <Text style={styles.location}>Pickup: {item.pickupLocation}</Text>
        <Text style={styles.ngo}>Claimed by NGO: {item.claimerName || item.claimedBy}</Text>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => handleClaim(item)}>
        <Text style={styles.primaryBtnText}>Claim Delivery</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignedItem = ({ item }: { item: FoodSurplus }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.canteenName}>{item.canteenName}</Text>
        <Text style={styles.foodName}>{item.foodName}</Text>
        <Text style={styles.meta}>{item.quantity} {item.unit} • Expires: {formatTime(item.expiryTime)}</Text>
        <Text style={styles.location}>Pickup: {item.pickupLocation}</Text>
        <Text style={styles.ngo}>NGO: {item.claimerName || item.claimedBy}</Text>
        <Text style={styles.statusText}>Pickup: {item.driverPickupVerifiedAt ? 'Verified by canteen' : 'Awaiting canteen verification'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => openChatWithNgo(item)}>
          <Text style={styles.secondaryBtnText}>Chat NGO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => openChatWithCanteen(item)}>
          <Text style={styles.secondaryBtnText}>Chat Canteen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 8, color: '#666' }}>Loading deliveries…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Deliveries</Text>
        <Text style={styles.subtitle}>Claim rides and chat. Pickup is verified by canteen, delivery by NGO.</Text>
      </View>

      <FlatList
        data={needingDrivers}
        keyExtractor={(item) => `${item.id}-need`}
        renderItem={renderNeedItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Available Deliveries</Text>}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: '#666' }}>No deliveries needing drivers right now.</Text>
          </View>
        }
      />

      <FlatList
        data={assigned}
        keyExtractor={(item) => `${item.id}-assigned`}
        renderItem={renderAssignedItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>My Assigned Deliveries</Text>}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: '#666' }}>You have no assigned deliveries yet.</Text>
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
  canteenName: { fontSize: 14, fontWeight: '700', color: '#333' },
  foodName: { fontSize: 16, fontWeight: '700', color: '#2196F3', marginTop: 4 },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  location: { fontSize: 12, color: '#444', marginTop: 4 },
  ngo: { fontSize: 12, color: '#444', marginTop: 4 },
  primaryBtn: { backgroundColor: '#2196F3', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginLeft: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2196F3', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 8 },
  secondaryBtnText: { color: '#2196F3', fontWeight: '700' },
  statusText: { fontSize: 12, color: '#666', marginTop: 6 },
});