import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import AuthService from './AuthService';
import { FoodSurplus } from '../models/FoodSurplus';
import FoodSurplusService from './FoodSurplusService';

export type UserType = 'canteen' | 'ngo' | 'driver' | 'volunteer';

export interface Chat {
  id: string;
  participants: string[]; // user IDs
  participantTypes: Record<string, UserType>; // userId -> type
  participantNames?: Record<string, string>; // optional mapping for display
  lastMessage?: string;
  lastMessageAt?: Date;
  deliverySurplusId?: string | null; // link to a delivery (for driver/ngo chats)
  createdAt?: Date;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderType: UserType;
  text: string;
  createdAt: Date;
}

class ChatService {
  private static instance: ChatService;
  private chatsCol = 'chats';

  private constructor() {}

  public static getInstance(): ChatService {
    if (!ChatService.instance) ChatService.instance = new ChatService();
    return ChatService.instance;
  }

  // Subscribe to chats for a user (real-time)
  public subscribeChatsForUser(userId: string, onUpdate: (chats: Chat[]) => void): () => void {
    const q = query(collection(db, this.chatsCol), where('participants', 'array-contains', userId));
    const unsub = onSnapshot(q, (snap) => {
      const chats: Chat[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          participants: data.participants || [],
          participantTypes: data.participantTypes || {},
          participantNames: data.participantNames || {},
          lastMessage: data.lastMessage || '',
          lastMessageAt: data.lastMessageAt ? data.lastMessageAt.toDate?.() : undefined,
          deliverySurplusId: data.deliverySurplusId || null,
          createdAt: data.createdAt ? data.createdAt.toDate?.() : undefined,
        } as Chat;
      }).sort((a, b) => (b.lastMessageAt?.getTime?.() || 0) - (a.lastMessageAt?.getTime?.() || 0));
      onUpdate(chats);
    });
    return unsub;
  }

  // Subscribe to messages in a chat (real-time)
  public subscribeMessages(chatId: string, onUpdate: (messages: Message[]) => void): () => void {
    const msgsRef = collection(db, `${this.chatsCol}/${chatId}/messages`);
    const unsub = onSnapshot(msgsRef, (snap) => {
      const messages: Message[] = snap.docs
        .map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            chatId,
            senderId: data.senderId,
            senderType: data.senderType,
            text: data.text,
            createdAt: data.createdAt ? data.createdAt.toDate?.() : new Date(),
          } as Message;
        })
        .sort((a, b) => (a.createdAt?.getTime?.() || 0) - (b.createdAt?.getTime?.() || 0));
      onUpdate(messages);
    });
    return unsub;
  }

  public async getChatById(chatId: string): Promise<Chat | null> {
    const docRef = doc(db, this.chatsCol, chatId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      id: snap.id,
      participants: data.participants || [],
      participantTypes: data.participantTypes || {},
      participantNames: data.participantNames || {},
      lastMessage: data.lastMessage || '',
      lastMessageAt: data.lastMessageAt ? data.lastMessageAt.toDate?.() : undefined,
      deliverySurplusId: data.deliverySurplusId || null,
      createdAt: data.createdAt ? data.createdAt.toDate?.() : undefined,
    } as Chat;
  }

  // Ensure a 1-1 chat exists between two users; optionally link a delivery surplus
  public async getOrCreateOneToOneChat(
    currentUser: { id: string; name: string; userType: UserType },
    targetUser: { id: string; name: string; userType: UserType },
    deliverySurplusId?: string | null
  ): Promise<Chat> {
    // Try to find an existing chat containing current user, then filter client-side
    const q = query(collection(db, this.chatsCol), where('participants', 'array-contains', currentUser.id));
    const snap = await getDocs(q);
    const existing = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      .find((c: any) => Array.isArray(c.participants) && c.participants.length === 2 && c.participants.includes(targetUser.id));

    if (existing) {
      return {
        id: existing.id,
        participants: existing.participants,
        participantTypes: existing.participantTypes || {},
        participantNames: existing.participantNames || {},
        lastMessage: existing.lastMessage || '',
        lastMessageAt: existing.lastMessageAt ? existing.lastMessageAt.toDate?.() : undefined,
        deliverySurplusId: existing.deliverySurplusId || null,
        createdAt: existing.createdAt ? existing.createdAt.toDate?.() : undefined,
      } as Chat;
    }

    // Create new chat
    const now = Timestamp.now();
    const docRef = await addDoc(collection(db, this.chatsCol), {
      participants: [currentUser.id, targetUser.id],
      participantTypes: {
        [currentUser.id]: currentUser.userType,
        [targetUser.id]: targetUser.userType,
      },
      participantNames: {
        [currentUser.id]: currentUser.name,
        [targetUser.id]: targetUser.name,
      },
      deliverySurplusId: deliverySurplusId || null,
      lastMessage: '',
      lastMessageAt: now,
      createdAt: now,
    });

    return {
      id: docRef.id,
      participants: [currentUser.id, targetUser.id],
      participantTypes: {
        [currentUser.id]: currentUser.userType,
        [targetUser.id]: targetUser.userType,
      },
      participantNames: {
        [currentUser.id]: currentUser.name,
        [targetUser.id]: targetUser.name,
      },
      deliverySurplusId: deliverySurplusId || null,
      lastMessage: '',
      lastMessageAt: new Date(),
      createdAt: new Date(),
    } as Chat;
  }

  public async sendMessage(chatId: string, senderId: string, senderType: UserType, text: string): Promise<void> {
    const now = Timestamp.now();
    await addDoc(collection(db, `${this.chatsCol}/${chatId}/messages`), {
      senderId,
      senderType,
      text,
      createdAt: now,
    });
    await updateDoc(doc(db, this.chatsCol, chatId), {
      lastMessage: text,
      lastMessageAt: now,
    });
  }

  // Utility: For drivers, hide chats when linked delivery is completed
  public async isChatArchivedForDriver(chat: Chat, driverId: string): Promise<boolean> {
    if (!chat.deliverySurplusId) return false;
    const surplus = await FoodSurplusService.getFoodSurplusById(chat.deliverySurplusId);
    if (!surplus) return false;
    return surplus.status === 'collected' || surplus.status === 'expired';
  }
}

export default ChatService.getInstance();