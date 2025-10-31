import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import AuthService from '../services/AuthService';
import ChatService, { Chat, UserType } from '../services/ChatService';
import { collection, getDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import FoodSurplusService from '../services/FoodSurplusService';
import { Ionicons } from '@expo/vector-icons';
import theme from '../config/theme';

interface SectionItem {
  chat: Chat;
  otherUserId: string;
  otherUserName: string;
  otherUserType: UserType;
}

export default function ChatListScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(new Set());
  const userCache = useRef<Record<string, { name: string; userType: UserType }>>({});

  // New chat directory modal state
  const [showDirectory, setShowDirectory] = useState(false);
  const [directorySections, setDirectorySections] = useState<Array<{ title: string; data: Array<{ id: string; name: string; userType: UserType }> }>>([]);

  useEffect(() => {
    (async () => {
      const u = await AuthService.getCurrentUser();
      if (!u) {
        Alert.alert('Error', 'You must be logged in to view messages.');
        return;
      }
      setUser(u);
      const unsub = ChatService.subscribeChatsForUser(u.id, async (list) => {
        setChats(list);
        if (u.userType === 'driver' || u.userType === 'volunteer') {
          // Evaluate archival for driver chats linked to deliveries
          const ids = new Set<string>();
          for (const chat of list) {
            const archived = await ChatService.isChatArchivedForDriver(chat, u.id);
            if (archived) ids.add(chat.id);
          }
          setHiddenChatIds(ids);
        } else {
          setHiddenChatIds(new Set());
        }
        setLoading(false);
      });
      return () => unsub();
    })();
  }, []);

  const fetchUserBrief = async (userId: string): Promise<{ name: string; userType: UserType }> => {
    if (userCache.current[userId]) return userCache.current[userId];
    const d = await getDoc(doc(collection(db, 'users'), userId));
    if (!d.exists()) return { name: 'Unknown', userType: 'ngo' } as any;
    const data: any = d.data();
    const name = data.organizationName || data.name || 'Unknown';
    const rawType = (data.userType as UserType) || 'ngo';
    const userType = (rawType === 'volunteer' ? 'driver' : rawType) as UserType; // normalize
    const brief = { name, userType };
    userCache.current[userId] = brief;
    return brief;
  };

  const sections = useMemo(() => {
    const grouped: Record<'canteen' | 'ngo' | 'driver', SectionItem[]> = { canteen: [], ngo: [], driver: [] };
    const selfId = user?.id;
    for (const chat of chats) {
      if (hiddenChatIds.has(chat.id)) continue; // hide archived
      const otherId = (chat.participants || []).find((pid) => pid !== selfId);
      if (!otherId) continue;
      const rawType = (chat.participantTypes?.[otherId] as UserType) || 'ngo';
      const otherType = (rawType === 'volunteer' ? 'driver' : rawType) as UserType; // normalize
      const otherName = chat.participantNames?.[otherId] || 'Unknown';
      if (otherType === 'driver') grouped.driver.push({ chat, otherUserId: otherId, otherUserType: otherType, otherUserName: otherName });
      else if (otherType === 'ngo') grouped.ngo.push({ chat, otherUserId: otherId, otherUserType: otherType, otherUserName: otherName });
      else grouped.canteen.push({ chat, otherUserId: otherId, otherUserType: otherType, otherUserName: otherName });
    }

    const makeSection = (title: string, type: 'canteen' | 'ngo' | 'driver') => ({
      title,
      data: grouped[type],
    });

    return [
      makeSection('NGOs', 'ngo'),
      makeSection('Drivers', 'driver'),
      makeSection('Canteens', 'canteen'),
    ];
  }, [chats, hiddenChatIds, user?.id]);

  const openChat = async (item: SectionItem) => {
    navigation.navigate('ChatScreen', {
      chatId: item.chat.id,
      otherUserName: item.otherUserName,
      otherUserType: item.otherUserType,
    });
  };

  const startNewChatWithUser = async (targetUserId: string) => {
    try {
      if (!user) return;
      const brief = await fetchUserBrief(targetUserId);
      let linkSurplus: string | null = null;
      // If current user is a driver/volunteer and target is NGO, link active delivery if exists
      if ((user.userType === 'driver' || user.userType === 'volunteer') && brief.userType === 'ngo') {
        const assigned = await FoodSurplusService.getDriverAssignedSurplus(user.id);
        const match = assigned.find((s) => s.status === 'claimed' && s.claimedBy === targetUserId);
        if (match) linkSurplus = match.id;
      }
      const chat = await ChatService.getOrCreateOneToOneChat(
        { id: user.id, name: user.name || user.organizationName, userType: (user.userType === 'volunteer' ? 'driver' : user.userType) },
        { id: targetUserId, name: brief.name, userType: brief.userType },
        linkSurplus
      );
      setShowDirectory(false);
      navigation.navigate('ChatScreen', {
        chatId: chat.id,
        otherUserName: brief.name,
        otherUserType: brief.userType,
      });
    } catch (e) {
      console.error('Failed to start chat:', e);
      Alert.alert('Error', 'Unable to start chat.');
    }
  };

  const openDirectory = async () => {
    try {
      if (!user) return;
      const snap = await getDocs(collection(db, 'users'));
      const entries: Array<{ id: string; name: string; userType: UserType }> = [];
      snap.forEach((d) => {
        if (d.id === user.id) return; // exclude self
        const data: any = d.data();
        const name = data.organizationName || data.name || 'Unknown';
        const rawType: UserType = data.userType;
        const userType: UserType = (rawType === 'volunteer' ? 'driver' : rawType) as UserType; // normalize
        entries.push({ id: d.id, name, userType });
      });
      const grouped: Record<'ngo' | 'driver' | 'canteen', Array<{ id: string; name: string; userType: UserType }>> = {
        ngo: [], driver: [], canteen: []
      };
      for (const e of entries) {
        if (e.userType === 'ngo') grouped.ngo.push(e);
        else if (e.userType === 'driver') grouped.driver.push(e);
        else grouped.canteen.push(e);
      }
      setDirectorySections([
        { title: 'NGOs', data: grouped.ngo },
        { title: 'Drivers', data: grouped.driver },
        { title: 'Canteens', data: grouped.canteen },
      ]);
      setShowDirectory(true);
    } catch (err) {
      console.error('Failed to load user directory', err);
      Alert.alert('Error', 'Unable to load users.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 8, color: theme.colors.textSecondary }}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>Grouped by contact type</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.chat.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.chatItem} onPress={() => openChat(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.otherUserName?.charAt(0) || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.chatName}>{item.otherUserName}</Text>
              <Text style={styles.chatMeta}>{(item.otherUserType === 'volunteer' ? 'DRIVER' : item.otherUserType.toUpperCase())}</Text>
            </View>
            {(['driver', 'volunteer'] as UserType[]).includes(item.otherUserType) && (
              <View style={styles.badgeDriver}><Text style={styles.badgeText}>Driver</Text></View>
            )}
            {item.otherUserType === 'ngo' && (
              <View style={styles.badgeNGO}><Text style={styles.badgeText}>NGO</Text></View>
            )}
            {item.otherUserType === 'canteen' && (
              <View style={styles.badgeCanteen}><Text style={styles.badgeText}>Canteen</Text></View>
            )}
          </TouchableOpacity>
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: theme.colors.textSecondary }}>No chats yet. Start one below.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.newChatButton} onPress={openDirectory}>
        <Ionicons name="chatbubbles" size={22} color={theme.colors.textLight} />
        <Text style={styles.newChatText}>Start new chat</Text>
      </TouchableOpacity>

      <Modal visible={showDirectory} animationType="slide" onRequestClose={() => setShowDirectory(false)}>
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}> 
            <Text style={styles.title}>Start a new chat</Text>
            <TouchableOpacity onPress={() => setShowDirectory(false)}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
          <SectionList
            sections={directorySections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.chatItem} onPress={() => startNewChatWithUser(item.id)}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0) || '?'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.chatMeta}>{(item.userType === 'volunteer' ? 'DRIVER' : item.userType.toUpperCase())}</Text>
                </View>
                {(['driver', 'volunteer'] as UserType[]).includes(item.userType) && (
                  <View style={styles.badgeDriver}><Text style={styles.badgeText}>Driver</Text></View>
                )}
                {item.userType === 'ngo' && (
                  <View style={styles.badgeNGO}><Text style={styles.badgeText}>NGO</Text></View>
                )}
                {item.userType === 'canteen' && (
                  <View style={styles.badgeCanteen}><Text style={styles.badgeText}>Canteen</Text></View>
                )}
              </TouchableOpacity>
            )}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={{ color: theme.colors.textSecondary }}>No users found.</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  header: { padding: 16, backgroundColor: theme.colors.backgroundCard, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.backgroundSecondary },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, backgroundColor: theme.colors.backgroundCard },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.accentLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  chatName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  chatMeta: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  badgeDriver: { backgroundColor: theme.colors.driver, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  badgeNGO: { backgroundColor: theme.colors.ngo, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  badgeCanteen: { backgroundColor: theme.colors.canteen, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  badgeText: { color: theme.colors.textLight, fontSize: 10, fontWeight: '700' },
  newChatButton: { position: 'absolute', bottom: 20, right: 20, backgroundColor: theme.colors.primary, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 3 },
  newChatText: { color: theme.colors.textLight, fontWeight: '700', marginLeft: 8 },
});