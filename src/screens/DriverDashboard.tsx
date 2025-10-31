import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
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

const DriverDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [todayStats, setTodayStats] = useState({
    availableDeliveries: 0,
    completedDeliveries: 0,
  });
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const statsAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const actionsAnimations = useRef([
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

      // Get actual available deliveries that need drivers
      const availableDeliveries = await FoodSurplusService.getClaimedSurplusNeedingDrivers();
      const assignedDeliveries = await FoodSurplusService.getDriverAssignedSurplus(currentUser.id);
      
      // Filter completed deliveries (those with ngoDeliveryVerifiedAt set)
      const completedToday = assignedDeliveries.filter(delivery => 
        delivery.ngoDeliveryVerifiedAt && 
        delivery.ngoDeliveryVerifiedAt.getDate() === new Date().getDate()
      ).length;

      setTodayStats({
        availableDeliveries: availableDeliveries.length,
        completedDeliveries: completedToday,
      });
    } catch (error) {
      console.error('Failed to load driver stats:', error);
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

  const navigateToDeliveries = () => {
    navigation.navigate('Deliveries' as never);
  };

  const navigateToMap = () => {
    navigation.navigate('Map' as never);
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
    const icons = ['car-outline', 'checkmark-done-outline'];
    return icons[index];
  };

  const getStatColor = (index: number) => {
    const colors = [
      ['#667eea', '#764ba2'],
      ['#43e97b', '#38f9d7'],
    ];
    return colors[index];
  };

  const getActionColor = (index: number) => {
    const colors = [
      ['#667eea', '#764ba2'],
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
            <Text style={styles.driverName}>{user?.name}</Text>
            <View style={styles.ratingContainer}>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#fff" />
              </View>
              <Text style={styles.rating}>Driver Rating: {user?.rating || '4.8'}/5</Text>
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
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <Ionicons name="stats-chart" size={20} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={styles.statsGrid}>
            {[
              { value: todayStats.availableDeliveries, label: 'Available Deliveries', unit: '' },
              { value: todayStats.completedDeliveries, label: 'Completed Today', unit: '' },
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
              { title: 'Find Deliveries', subtitle: 'View available rides', icon: 'car-sport-outline', onPress: navigateToDeliveries },
              { title: 'Map', subtitle: 'View delivery routes', icon: 'map-outline', onPress: navigateToMap },
              { title: 'Messages', subtitle: 'Chat with partners', icon: 'chatbubbles-outline', onPress: navigateToMessages },
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

        {/* Driver Status Card */}
        <View style={styles.statusContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Driver Status</Text>
            <View style={styles.onlineIndicatorBadge}>
              <View style={styles.onlineIndicatorDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIconContainer}>
                <LinearGradient
                  colors={['#FF6B35', '#FF8C42']}
                  style={styles.statusIconGradient}
                >
                  <Ionicons name="car-sport" size={28} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Ready for Deliveries</Text>
                <Text style={styles.statusSubtitle}>You're online and available</Text>
              </View>
            </View>
            
            <View style={styles.statusStats}>
              <View style={styles.statusStatItem}>
                <Text style={styles.statusStatNumber}>{user?.totalDeliveries || 0}</Text>
                <Text style={styles.statusStatLabel}>Total Deliveries</Text>
              </View>
              <View style={styles.statusStatDivider} />
              <View style={styles.statusStatItem}>
                <Text style={styles.statusStatNumber}>{user?.rating || '4.8'}</Text>
                <Text style={styles.statusStatLabel}>Rating</Text>
              </View>
              <View style={styles.statusStatDivider} />
              <View style={styles.statusStatItem}>
                <Text style={styles.statusStatNumber}>{user?.totalEarnings || '$0'}</Text>
                <Text style={styles.statusStatLabel}>Earnings</Text>
              </View>
            </View>
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
  driverName: {
    color: '#fff',
    fontSize: rf(28),
    fontWeight: '800',
    marginBottom: hp(1.5),
    letterSpacing: 0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: rs(25),
    alignSelf: 'flex-start',
  },
  ratingBadge: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(2),
  },
  rating: {
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
  statusContainer: {
    paddingHorizontal: wp(6),
    marginBottom: hp(3),
  },
  onlineIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: rs(15),
  },
  onlineIndicatorDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: '#4CAF50',
    marginRight: wp(1.5),
  },
  onlineText: {
    color: '#fff',
    fontSize: rf(12),
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: rs(20),
    padding: wp(4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  statusIconContainer: {
    marginRight: wp(3),
  },
  statusIconGradient: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: hp(0.3),
    letterSpacing: 0.1,
  },
  statusSubtitle: {
    fontSize: rf(12),
    color: '#666',
    fontWeight: '500',
  },
  statusStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statusStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusStatNumber: {
    fontSize: rf(22),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: hp(0.3),
    letterSpacing: -0.5,
  },
  statusStatLabel: {
    fontSize: rf(11),
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusStatDivider: {
    width: 1,
    height: hp(4),
    backgroundColor: 'rgba(0,0,0,0.1)',
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

export default DriverDashboard;