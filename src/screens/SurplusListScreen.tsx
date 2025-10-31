import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, TextInput, Platform } from 'react-native';
import AuthService from '../services/AuthService';
import FoodSurplusService from '../services/FoodSurplusService';
import { FoodSurplus } from '../models/FoodSurplus';
import { collection, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import theme from '../config/theme';

export default function SurplusListScreen() {
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
      if (!u || u.userType !== 'canteen') {
        Alert.alert('Not allowed', 'Only canteen users can view this list.');
        setLoading(false);
        return;
      }
      setUser(u);
      const list = await FoodSurplusService.getFoodSurplusByCanteen(u.id);
      setItems(list);
    } catch (e) {
      console.error('Failed to load surplus list', e);
      Alert.alert('Error', 'Unable to load your surplus list.');
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
      const list = await FoodSurplusService.getFoodSurplusByCanteen(user.id);
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

  const startVerify = (id: string) => {
    setVerifyingId(id);
    setCodeInput('');
  };

  const cancelVerify = () => {
    setVerifyingId(null);
    setCodeInput('');
  };

  const submitVerifyPickup = async (item: FoodSurplus) => {
    try {
      const code = codeInput.trim();
      if (!code) {
        Alert.alert('Enter code', 'Please enter the 4-digit code shared with you.');
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
        Alert.alert('Not ready', 'No verification code set yet. Please wait for driver assignment.');
        return;
      }
      if (String(data.deliveryCode) !== code) {
        Alert.alert('Incorrect code', 'The code you entered does not match.');
        return;
      }
      await updateDoc(ref, { driverPickupVerifiedAt: Timestamp.now(), updatedAt: Timestamp.now() });
      setItems((prev) => prev.map((s) => (s.id === item.id ? { ...s, driverPickupVerifiedAt: new Date() } : s)));
      setVerifyingId(null);
      setCodeInput('');
      Alert.alert('Pickup verified', 'Pickup confirmed. Thank you!');
    } catch (e) {
      console.error('Verify pickup failed', e);
      Alert.alert('Error', 'Failed to verify pickup. Try again.');
    }
  };

  const active = items.filter((i) => i.status === 'available' || i.status === 'claimed');
  const past = items.filter((i) => i.status === 'collected' || i.status === 'expired');

  const renderItem = ({ item }: { item: FoodSurplus }) => {
    const canVerify = item.status === 'claimed' && !!item.assignedDriverId && !item.driverPickupVerifiedAt;
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.foodName}>{item.foodName}</Text>
          <Text style={styles.meta}>{item.quantity} {item.unit} • Expires: {formatTime(item.expiryTime)}</Text>
          <Text style={styles.location}>Pickup: {item.pickupLocation}</Text>
          <Text style={styles.status}>Status: {item.status}</Text>
          {item.assignedDriverName && (
            <Text style={styles.status}>Driver: {item.assignedDriverName}</Text>
          )}
          <Text style={styles.status}>Pickup verification: {item.driverPickupVerifiedAt ? 'Completed' : 'Pending'}</Text>
          {!item.deliveryCode && item.status === 'claimed' && (
            <Text style={[styles.hint, { marginTop: 6 }]}>Waiting for driver assignment to generate code…</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          {canVerify ? (
            verifyingId === item.id ? (
              <View style={{ width: 180 }}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter code"
                  keyboardType={Platform.select({ ios: 'number-pad', android: 'numeric', default: 'numeric' })}
                  maxLength={6}
                  value={codeInput}
                  onChangeText={setCodeInput}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => submitVerifyPickup(item)}>
                    <Text style={styles.primaryBtnText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={cancelVerify}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => startVerify(item.id)}>
                <Text style={styles.primaryBtnText}>Verify Pickup</Text>
              </TouchableOpacity>
            )
          ) : (
            <Text style={styles.hint}>{item.status === 'claimed' ? (item.driverPickupVerifiedAt ? 'Pickup verified' : 'Awaiting driver pickup') : 'No action needed'}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 8, color: theme.colors.textSecondary }}>Loading your surplus…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Surplus</Text>
        <Text style={styles.subtitle}>Verify driver pickup with code shared in chat</Text>
      </View>

      <FlatList
        data={active}
        keyExtractor={(item) => `${item.id}-active`}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Active</Text>}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: theme.colors.textSecondary }}>No active items.</Text>
          </View>
        }
      />

      <FlatList
        data={past}
        keyExtractor={(item) => `${item.id}-past`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.foodName}</Text>
              <Text style={styles.meta}>{item.quantity} {item.unit}</Text>
              <Text style={styles.status}>Status: {item.status}</Text>
            </View>
            <Text style={styles.hint}>{item.status === 'collected' ? 'Delivered' : 'Expired'}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Past</Text>}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: theme.colors.textSecondary }}>No past items.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: theme.colors.backgroundCard, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginHorizontal: 16, marginTop: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.backgroundCard, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: theme.colors.shadow, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  foodName: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  meta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  location: { fontSize: 12, color: theme.colors.text, marginTop: 4 },
  status: { fontSize: 12, color: theme.colors.text, marginTop: 4 },
  hint: { fontSize: 12, color: theme.colors.textSecondary },
  input: { borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.colors.backgroundSecondary },
  primaryBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  primaryBtnText: { color: theme.colors.textLight, fontWeight: '700' },
  secondaryBtn: { backgroundColor: theme.colors.backgroundCard, borderWidth: 1, borderColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  secondaryBtnText: { color: theme.colors.primary, fontWeight: '700' },
});