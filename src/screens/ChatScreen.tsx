import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Linking } from 'react-native';
import ChatService, { Message, UserType } from '../services/ChatService';
import AuthService from '../services/AuthService';
import FoodSurplusService from '../services/FoodSurplusService';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function ChatScreen({ route, navigation }: any) {
  const { chatId, otherUserName: otherUserNameParam, otherUserType: otherUserTypeParam } = route.params || {};
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatArchived, setChatArchived] = useState(false);
  const [allowedToChat, setAllowedToChat] = useState(true);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [otherUserName, setOtherUserName] = useState<string | null>(otherUserNameParam || null);
  const [otherUserType, setOtherUserType] = useState<UserType | null>(otherUserTypeParam || null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const u = await AuthService.getCurrentUser();
      setUser(u);
      const chat = await ChatService.getChatById(chatId);
      if (!chat || !u) return;
      const otherId = (chat.participants || []).find((pid) => pid !== u.id) || null;
      setOtherUserId(otherId);
      const oName = otherId ? (chat.participantNames?.[otherId] || otherUserNameParam || 'Unknown') : (otherUserNameParam || 'Unknown');
      setOtherUserName(oName);
      const rawType: UserType | null = otherId ? ((chat.participantTypes?.[otherId] as UserType) || otherUserTypeParam || 'ngo') : (otherUserTypeParam || 'ngo');
      setOtherUserType(rawType);

      // Driver/Volunteer archival check
      if (chat?.deliverySurplusId && (u?.userType === 'driver' || u?.userType === 'volunteer')) {
        const surplus = await FoodSurplusService.getFoodSurplusById(chat.deliverySurplusId);
        const archived = surplus && (surplus.status === 'collected' || surplus.status === 'expired');
        if (archived) {
          setChatArchived(true);
          Alert.alert('Delivery Completed', 'This chat is archived because the delivery has been completed.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }
      }

      // Enforce role-based restrictions
      const allowed = await isContactAllowed(u, otherId, rawType || 'ngo');
      setAllowedToChat(!!allowed);
      if (!allowed) {
        Alert.alert('Restricted', 'You can only chat with contacts linked to your active pickups/deliveries.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      const unsub = ChatService.subscribeMessages(chatId, (msgs) => {
        setMessages(msgs);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      });
      return () => unsub();
    })();
  }, [chatId]);

  const isContactAllowed = async (self: any, targetId: string | null, targetTypeRaw: UserType): Promise<boolean> => {
    if (!self || !targetId) return false;
    const selfType: UserType = (self.userType === 'volunteer' ? 'driver' : self.userType);
    const targetType: UserType = (targetTypeRaw === 'volunteer' ? 'driver' : targetTypeRaw);

    try {
      if (selfType === 'ngo') {
        const claimed = await FoodSurplusService.getClaimedFoodSurplus(self.id);
        const active = claimed.filter(s => s.status === 'claimed');
        if (targetType === 'canteen') return active.some(s => s.canteenId === targetId);
        if (targetType === 'driver') return active.some(s => s.assignedDriverId === targetId);
        return false;
      }
      if (selfType === 'canteen') {
        const items = await FoodSurplusService.getFoodSurplusByCanteen(self.id);
        const active = items.filter(s => s.status === 'claimed');
        if (targetType === 'ngo') return active.some(s => s.claimedBy === targetId);
        if (targetType === 'driver') return active.some(s => s.assignedDriverId === targetId);
        return false;
      }
      if (selfType === 'driver') {
        const assigned = await FoodSurplusService.getDriverAssignedSurplus(self.id);
        const active = assigned.filter(s => s.status === 'claimed');
        if (targetType === 'ngo') return active.some(s => s.claimedBy === targetId);
        if (targetType === 'canteen') return active.some(s => s.canteenId === targetId);
        return false;
      }
      return false;
    } catch (e) {
      console.warn('Failed allowed check', e);
      return false;
    }
  };

  const asDisplayType = (type: UserType): 'ngo' | 'driver' | 'canteen' => {
    return (type === 'volunteer' ? 'driver' : type) as any;
  };

  const bubbleColor = (type: UserType, mine: boolean) => {
    const displayType = asDisplayType(type);
    if (mine) return '#4CAF50'; // my messages green
    switch (displayType) {
      case 'ngo': return '#4ECDC4';
      case 'driver': return '#45B7D1';
      case 'canteen': return '#FF6B6B';
      default: return '#95A5A6';
    }
  };

  const send = async () => {
    try {
      if (!user || !input.trim() || chatArchived || !allowedToChat) return;
      const senderType: UserType = user.userType; // keep original type for storage
      await ChatService.sendMessage(chatId, user.id, senderType, input.trim());
      setInput('');
    } catch (e) {
      console.error('Failed to send:', e);
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleCall = async () => {
    try {
      if (!otherUserId) return;
      const d = await getDoc(doc(collection(db, 'users'), otherUserId));
      if (!d.exists()) return Alert.alert('Unavailable', 'Contact not found.');
      const data: any = d.data();
      const phone: string | undefined = data.contactNumber || data.phone || data.phoneNumber;
      if (!phone) return Alert.alert('Unavailable', 'This contact has no phone number.');
      const telUrl = `tel:${String(phone).replace(/[^+\d]/g, '')}`;
      const supported = await Linking.canOpenURL(telUrl);
      if (supported) await Linking.openURL(telUrl);
      else Alert.alert('Unavailable', 'Calling is not supported on this device.');
    } catch (e) {
      console.error('Call failed', e);
      Alert.alert('Error', 'Unable to start call.');
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.senderId === user?.id;
    const color = bubbleColor(item.senderType, mine);
    const label = asDisplayType(item.senderType).toUpperCase();
    return (
      <View style={[styles.messageRow, mine ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, { backgroundColor: color }, mine ? styles.bubbleRight : styles.bubbleLeft]}>
          <Text style={styles.text}>{item.text}</Text>
          <Text style={styles.meta}>{label}</Text>
        </View>
      </View>
    );
  };

  const headerSubtitleLabel = (t?: UserType | null) => (t ? asDisplayType(t).toUpperCase() : '');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}> 
        <View>
          <Text style={styles.title}>{otherUserName || 'Chat'}</Text>
          <Text style={styles.subtitle}>Chatting with: {headerSubtitleLabel(otherUserType)}</Text>
        </View>
        <TouchableOpacity onPress={handleCall} style={{ paddingHorizontal: 6, paddingVertical: 6 }}>
          <Ionicons name="call" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={chatArchived ? 'Chat archived' : (allowedToChat ? 'Type a message...' : 'Chat restricted to active deliveries')}
          value={input}
          onChangeText={setInput}
          editable={!chatArchived && allowedToChat}
        />
        <TouchableOpacity style={[styles.sendButton, (chatArchived || !allowedToChat) ? { backgroundColor: '#ccc' } : {}]} onPress={send} disabled={chatArchived || !allowedToChat}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  messageRow: { marginVertical: 6, flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bubbleLeft: { borderBottomLeftRadius: 4 },
  bubbleRight: { borderBottomRightRadius: 4 },
  text: { color: '#fff', fontSize: 14 },
  meta: { color: '#f0f0f0', fontSize: 10, marginTop: 4 },
  inputBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  sendButton: { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '700' },
});