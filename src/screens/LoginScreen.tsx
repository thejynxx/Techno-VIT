import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { wp, hp, rf, rs } from '../utils/responsive';
import theme from '../config/theme';
import AuthService from '../services/AuthService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'canteen' | 'ngo' | 'driver'>('canteen');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
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

    // Continuous pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    animateButton();
    setLoading(true);
    try {
      const user = await AuthService.login({ email, password, userType });
      
      // Navigate based on user type
      if (user.userType === 'canteen') {
        navigation.navigate('CanteenTabs' as never);
      } else if (user.userType === 'driver') {
        navigation.navigate('DriverTabs' as never);
      } else {
        navigation.navigate('NGOTabs' as never);
      }
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('RegisterScreen' as never);
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPasswordScreen' as never);
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'canteen': return '🍽️';
      case 'ngo': return '🤝';
      case 'driver': return '🚚';
      default: return '👤';
    }
  };

  const getUserTypeGradient = (type: string) => {
    switch (type) {
      case 'canteen': return ['#667eea', '#764ba2'];
      case 'ngo': return ['#f093fb', '#f5576c'];
      case 'driver': return ['#4facfe', '#00f2fe'];
      default: return ['#667eea', '#764ba2'];
    }
  };

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Decorative circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.logoCircle}
              >
                <Text style={styles.logoEmoji}>🍽️</Text>
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>PlateLink</Text>
            <Text style={styles.subtitle}>Connecting surplus food with those in need</Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.glassmorphicCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.form}
              >
                <Text style={styles.sectionTitle}>Welcome Back</Text>
                <View style={styles.titleUnderline} />
                
                {/* User Type Selection */}
                <View style={styles.userTypeContainer}>
                  <Text style={styles.label}>Select Your Role</Text>
                  <View style={styles.userTypeButtons}>
                    {(['canteen', 'ngo', 'driver'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.userTypeButton,
                          userType === type && styles.userTypeButtonActive
                        ]}
                        onPress={() => setUserType(type)}
                        activeOpacity={0.7}
                      >
                        {userType === type && (
                          <LinearGradient
                            colors={getUserTypeGradient(type)}
                            style={styles.userTypeButtonGradient}
                          />
                        )}
                        <View style={styles.userTypeContent}>
                          <Text style={styles.userTypeIcon}>{getUserTypeIcon(type)}</Text>
                          <Text style={[
                            styles.userTypeButtonText,
                            userType === type && styles.userTypeButtonTextActive
                          ]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#a8b2d1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="your.email@example.com"
                      placeholderTextColor="rgba(168,178,209,0.5)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#a8b2d1" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(168,178,209,0.5)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-outline" : "eye-off-outline"} 
                        size={20} 
                        color="#a8b2d1" 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Forgot Password */}
                <TouchableOpacity onPress={navigateToForgotPassword} style={styles.forgotPasswordContainer}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.loginButtonGradient}
                    >
                      {loading ? (
                        <View style={styles.loadingContainer}>
                          <Text style={styles.loginButtonText}>Signing In...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Text style={styles.loginButtonText}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Register Link */}
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={navigateToRegister}>
                    <Text style={styles.registerLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(6),
    paddingVertical: hp(4),
    minHeight: SCREEN_HEIGHT,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(118, 75, 162, 0.1)',
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(4),
  },
  logoContainer: {
    marginBottom: hp(2),
  },
  logoCircle: {
    width: rs(90),
    height: rs(90),
    borderRadius: rs(45),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: rf(45),
  },
  title: {
    fontSize: rf(42),
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: hp(1),
    textShadowColor: 'rgba(102, 126, 234, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: rf(15),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: wp(4),
    lineHeight: rf(22),
    fontWeight: '400',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  glassmorphicCard: {
    borderRadius: 24,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
  },
  form: {
    borderRadius: 24,
    padding: wp(6),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: rf(32),
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: hp(1),
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: 60,
    height: 4,
    backgroundColor: '#667eea',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: hp(3),
  },
  userTypeContainer: {
    marginBottom: hp(3),
  },
  label: {
    fontSize: rf(15),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: hp(1.5),
    letterSpacing: 0.3,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: rs(10),
  },
  userTypeButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  userTypeButtonActive: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  userTypeButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  userTypeContent: {
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeIcon: {
    fontSize: rf(24),
    marginBottom: hp(0.5),
  },
  userTypeButtonText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  userTypeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: hp(2.5),
  },
  inputLabel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: hp(1),
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: wp(4),
    height: hp(6.5),
  },
  inputIcon: {
    marginRight: wp(3),
  },
  input: {
    flex: 1,
    fontSize: rf(15),
    color: '#ffffff',
    fontWeight: '400',
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: hp(3),
  },
  forgotPasswordText: {
    fontSize: rf(13),
    color: '#667eea',
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: hp(2.5),
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonGradient: {
    paddingVertical: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    fontSize: rf(18),
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: rf(14),
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  registerLink: {
    fontSize: rf(14),
    color: '#667eea',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default LoginScreen;