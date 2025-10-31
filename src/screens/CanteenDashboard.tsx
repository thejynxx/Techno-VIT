import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../services/AuthService';
import { User } from '../models/User';
import FoodSurplusService from '../services/FoodSurplusService';
import { FoodSurplus } from '../models/FoodSurplus';
import { wp, hp, rf, rs } from '../utils/responsive';
import theme from '../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MenuItem {
  dish_name: string;
  food_id: string;
  veg_nonveg: 'Veg' | 'Non-Veg';
  cuisine: string;
  waste_score_pct: number;
  estimated_prep_time_hours: number;
}

const CanteenDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [todayStats, setTodayStats] = useState({
    totalSurplus: 0,
    redistributed: 0,
    peopleFed: 0,
    carbonSaved: 0,
  });
  const [recentActivity, setRecentActivity] = useState<FoodSurplus[]>([]);
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const statsAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const actionsAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    loadUserData();
    startAnimations();
  }, []);

  useEffect(() => {
    if (user) {
        loadTodayStats();
    }
  }, [user]);

  const startAnimations = () => {
    // Main entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered animations for stats cards
    const statsStagger = statsAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: index * 150,
        useNativeDriver: true,
      })
    );

    // Staggered animations for action cards
    const actionsStagger = actionsAnimations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 600,
        delay: 400 + index * 100,
        useNativeDriver: true,
      })
    );

    Animated.parallel([...statsStagger, ...actionsStagger]).start();
  };

  const loadUserData = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  };

  const loadTodayStats = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) return;
      
      const items = await FoodSurplusService.getFoodSurplusByCanteen(currentUser.id);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const createdToday = items.filter(i => i.createdAt >= startOfDay && i.createdAt < endOfDay);
      const collectedToday = items.filter(i => i.status === 'collected' && (i.updatedAt || i.createdAt) >= startOfDay && (i.updatedAt || i.createdAt) < endOfDay);

      const totalSurplus = createdToday.length;
      const redistributed = collectedToday.length;
      const peopleFed = collectedToday.reduce((sum, i) => sum + (i.quantity || 0), 0);
      const carbonSaved = Math.round(peopleFed * 2.5); 

      setTodayStats({ totalSurplus, redistributed, peopleFed, carbonSaved });
      setRecentActivity(items.slice(0, 5));
    } catch (error) {
      console.error('Failed to load canteen stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    await loadTodayStats();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            navigation.navigate('LoginScreen' as never);
          },
        },
      ]
    );
  };

  const navigateToAddSurplus = () => {
    navigation.navigate('AddSurplusScreen' as never); 
  };

  const navigateToSurplusList = () => {
    navigation.navigate('Surplus' as never);
  };

  const navigateToMenuPlanner = () => {
    navigation.navigate('MenuPlannerScreen' as never);
  };

  const navigateToProfile = () => {
    navigation.navigate('ProfileScreen' as never);
  };

  const navigateToMessages = () => {
    navigation.navigate('Messages' as never);
  };

  const animateCardPress = (callback: () => void) => {
    const scaleValue = new Animated.Value(1);
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  const getStatIcon = (index: number) => {
    const icons = ['fast-food-outline', 'sync-circle-outline', 'people-outline', 'leaf-outline'];
    return icons[index];
  };

  const getStatColor = (index: number) => {
    const colors = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
    ];
    return colors[index];
  };

  const getActionIcon = (index: number) => {
    const icons = ['add-circle-outline', 'list-outline', 'restaurant-outline', 'chatbubbles-outline'];
    return icons[index];
  };

  const getActionColor = (index: number) => {
    const colors = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
    ];
    return colors[index];
  };

  return (
    <LinearGradient
      colors={['#1e3c72', '#2a5298']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.canteenName}>{user?.canteenName || user?.name}</Text>
            <View style={styles.greenScoreContainer}>
              <View style={styles.greenScoreBadge}>
                <Ionicons name="leaf" size={14} color="#fff" />
              </View>
              <Text style={styles.greenScore}>Green Score: {user?.greenScore || 0}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => animateCardPress(navigateToProfile)}
            activeOpacity={0.8}
          >
            <View style={styles.profileButtonInner}>
              <Ionicons name="person-outline" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Container */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Impact</Text>
            <Ionicons name="trending-up" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.statsGrid}>
            {[
              { value: todayStats.totalSurplus, label: 'Surplus Items', unit: '' },
              { value: todayStats.redistributed, label: 'Redistributed', unit: '' },
              { value: todayStats.peopleFed, label: 'People Fed', unit: 'kg' },
              { value: todayStats.carbonSaved, label: 'CO₂ Saved', unit: 'kg' },
            ].map((stat, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.statCardContainer,
                  {
                    opacity: statsAnimations[index],
                    transform: [{
                      translateY: statsAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    }],
                  }
                ]}
              >
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={getStatColor(index)}
                    style={styles.statGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.statIconContainer}>
                      <Ionicons 
                        name={getStatIcon(index) as any} 
                        size={28} 
                        color="#fff" 
                      />
                    </View>
                  </LinearGradient>
                  <View style={styles.statContent}>
                    <Text style={styles.statNumber}>
                      {stat.value}{stat.unit && <Text style={styles.statUnit}>{stat.unit}</Text>}
                    </Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                </View>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Ionicons name="flash" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.actionGrid}>
            {[
              { title: 'Log Surplus', subtitle: 'AI-optimized entry', icon: 'add-circle-outline', onPress: navigateToAddSurplus },
              { title: 'View Surplus', subtitle: 'Manage items', icon: 'list-outline', onPress: navigateToSurplusList },
              { title: 'Menu Planner', subtitle: 'Smart planning', icon: 'restaurant-outline', onPress: navigateToMenuPlanner },
              { title: 'Messages', subtitle: 'Chat with NGOs', icon: 'chatbubbles-outline', onPress: navigateToMessages },
            ].map((action, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.actionCardContainer,
                  {
                    opacity: actionsAnimations[index],
                    transform: [{
                      translateY: actionsAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                    }],
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.actionCard}
                  onPress={() => animateCardPress(action.onPress)}
                  activeOpacity={0.9}
                >
                  <View style={styles.actionIconWrapper}>
                    <LinearGradient
                      colors={getActionColor(index)}
                      style={styles.actionIconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons 
                        name={action.icon as any} 
                        size={28} 
                        color="#fff" 
                      />
                    </LinearGradient>
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(0,0,0,0.3)" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivity}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.activityList}>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="document-text-outline" size={48} color="rgba(0,0,0,0.2)" />
                </View>
                <Text style={styles.emptyStateTitle}>No recent activity</Text>
                <Text style={styles.emptyStateText}>Start by logging surplus food to see your impact</Text>
              </View>
            ) : (
              recentActivity.map((item, index) => (
                <View key={item.id} style={[styles.activityItem, index === recentActivity.length - 1 && styles.activityItemLast]}>
                  <View style={[
                    styles.activityIconContainer,
                    item.status === 'collected' && styles.activityIconCollected,
                    item.status === 'claimed' && styles.activityIconClaimed,
                    item.status === 'expired' && styles.activityIconExpired,
                  ]}>
                    <Ionicons 
                      name={
                        item.status === 'collected' ? 'checkmark-circle' :
                        item.status === 'claimed' ? 'hand-left' :
                        item.status === 'expired' ? 'close-circle' : 'add-circle'
                      } 
                      size={22} 
                      color={
                        item.status === 'collected' ? '#4CAF50' :
                        item.status === 'claimed' ? '#FF9800' :
                        item.status === 'expired' ? '#F44336' : '#2196F3'
                      }
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText} numberOfLines={2}>
                      {item.foodName}
                    </Text>
                    <Text style={styles.activityStatus}>
                      {item.status === 'claimed' ? `Claimed by ${item.claimerName || 'NGO'}` : 
                       item.status === 'collected' ? `Collected by ${item.claimerName || 'NGO'}` : 
                       item.status === 'expired' ? 'Expired' : 'Added'}
                    </Text>
                    <Text style={styles.activityTime}>{formatTimeAgo(item.updatedAt || item.createdAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: wp(6),
    paddingTop: hp(7),
    paddingBottom: hp(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: rf(14),
    marginBottom: hp(0.5),
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  canteenName: {
    color: '#fff',
    fontSize: rf(28),
    fontWeight: '800',
    marginBottom: hp(1.5),
    letterSpacing: 0.5,
  },
  greenScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: rs(25),
    alignSelf: 'flex-start',
    backdropFilter: 'blur(10px)',
  },
  greenScoreBadge: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2),
  },
  greenScore: {
    color: '#fff',
    fontSize: rf(13),
    fontWeight: '700',
  },
  profileButton: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(26),
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  profileButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: wp(6),
    marginBottom: hp(3),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: rf(22),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(14),
  },
  statCardContainer: {
    flex: 1,
    minWidth: wp(42),
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: rs(20),
    padding: wp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minHeight: hp(13),
  },
  statGradient: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  statIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: rf(26),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: hp(0.3),
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: rf(16),
    fontWeight: '600',
    color: '#666',
  },
  statLabel: {
    fontSize: rf(12),
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  quickActions: {
    paddingHorizontal: wp(6),
    marginBottom: hp(3),
  },
  actionGrid: {
    gap: rs(12),
  },
  actionCardContainer: {
    width: '100%',
  },
  actionCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: rs(18),
    padding: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  actionIconWrapper: {
    marginRight: wp(3),
  },
  actionIconGradient: {
    width: rs(54),
    height: rs(54),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: rf(15),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: hp(0.3),
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: rf(12),
    color: '#666',
    fontWeight: '500',
  },
  recentActivity: {
    paddingHorizontal: wp(6),
    marginBottom: hp(3),
  },
  activityList: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: rs(20),
    padding: wp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyIconContainer: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  emptyStateTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: '#333',
    marginBottom: hp(0.5),
  },
  emptyStateText: {
    fontSize: rf(13),
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: wp(8),
    lineHeight: rf(20),
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityIconContainer: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(14),
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  activityIconCollected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  activityIconClaimed: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  activityIconExpired: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: rf(14),
    color: '#1a1a1a',
    fontWeight: '700',
    marginBottom: hp(0.3),
    letterSpacing: 0.1,
  },
  activityStatus: {
    fontSize: rf(12),
    color: '#666',
    fontWeight: '500',
    marginBottom: hp(0.2),
  },
  activityTime: {
    fontSize: rf(11),
    color: '#999',
    fontWeight: '500',
  },
  logoutContainer: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(4),
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: rs(16),
    paddingVertical: hp(2),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutIcon: {
    marginRight: wp(2),
  },
  logoutButtonText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: rf(15),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

const formatTimeAgo = (date: Date) => {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} min ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
};

export default CanteenDashboard;