import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import FoodSurplusService from '../services/FoodSurplusService';
import ChatService from '../services/ChatService';
import AuthService from '../services/AuthService';
import { FoodSurplus } from '../models/FoodSurplus';

export default function MatchFoodScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<FoodSurplus[]>([]);
  const [user, setUser] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const u = await AuthService.getCurrentUser();
      setUser(u);
      const list = await FoodSurplusService.getAvailableFoodSurplus();
      setItems(list);
    } catch (e) {
      console.error('Failed to load available surplus', e);
      Alert.alert('Error', 'Unable to load available food right now.');
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
      const list = await FoodSurplusService.getAvailableFoodSurplus();
      setItems(list);
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const formatTime = (d?: Date) => {
    if (!d) return '';
    const mins = Math.max(1, Math.round((d.getTime() - Date.now()) / 60000));
    if (mins < 60) return `${mins} min left`;
    const hrs = Math.round(mins / 60);
    return `${hrs} hr${hrs !== 1 ? 's' : ''} left`;
  };

  const handleMatchAndChat = async (item: FoodSurplus) => {
    try {
      if (!user) {
        Alert.alert('Login required', 'Please log in again.');
        return;
      }
      if (user.userType !== 'ngo') {
        Alert.alert('Not allowed', 'Only NGOs can match with canteens.');
        return;
      }

      const displayName = user.organizationName || user.name || 'NGO';
      // Confirm claim
      Alert.alert(
        'Claim this food?',
        `${item.foodName} from ${item.canteenName}\nQuantity: ${item.quantity} ${item.unit}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Claim & Chat',
            style: 'default',
            onPress: async () => {
              try {
                await FoodSurplusService.claimFoodSurplus(item.id, user.id, displayName);
                // Create or get chat with canteen and link this surplus
                const chat = await ChatService.getOrCreateOneToOneChat(
                  { id: user.id, name: displayName, userType: (user.userType === 'volunteer' ? 'driver' : user.userType) },
                  { id: item.canteenId, name: item.canteenName, userType: 'canteen' },
                  item.id
                );
                // Remove item locally since it's now claimed
                setItems((prev) => prev.filter((s) => s.id !== item.id));
                // Navigate to chat
                navigation.navigate('ChatScreen', {
                  chatId: chat.id,
                  otherUserName: item.canteenName,
                  otherUserType: 'canteen',
                });
              } catch (e) {
                console.error('Claim/chat failed', e);
                Alert.alert('Error', 'Unable to claim and start chat. Please try again.');
              }
            },
          },
        ]
      );
    } catch (e) {
      console.error('Match & Chat error', e);
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  const renderItem = ({ item }: { item: FoodSurplus }) => {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.canteenName}>{item.canteenName}</Text>
          <Text style={styles.foodName}>{item.foodName}</Text>
          <Text style={styles.meta}>{item.quantity} {item.unit} • Expires: {formatTime(item.expiryTime)}</Text>
          <Text style={styles.location}>Pickup: {item.pickupLocation}</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => handleMatchAndChat(item)}>
          <Text style={styles.primaryBtnText}>Match & Chat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={{ marginTop: 8, color: '#666' }}>Loading available food…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Food</Text>
        <Text style={styles.subtitle}>Claim surplus from nearby canteens and start chatting</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: '#666' }}>No available food right now. Pull to refresh.</Text>
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
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  canteenName: { fontSize: 14, fontWeight: '700', color: '#333' },
  foodName: { fontSize: 16, fontWeight: '700', color: '#2196F3', marginTop: 4 },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  location: { fontSize: 12, color: '#444', marginTop: 4 },
  primaryBtn: { backgroundColor: '#2196F3', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginLeft: 12 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});