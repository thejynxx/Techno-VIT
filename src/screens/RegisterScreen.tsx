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
import AuthService from '../services/AuthService';
import { wp, hp, rf, rs } from '../utils/responsive';
import theme from '../config/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RegisterScreen = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    userType: 'canteen' as 'canteen' | 'ngo' | 'driver',
    canteenName: '',
    organizationName: '',
    organizationType: 'ngo' as 'ngo' | 'community_group',
    address: '',
    contactNumber: '',
    vehicleType: '',
    licenseNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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

  const updateFormData = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (formData.userType === 'canteen' && !formData.canteenName) {
      Alert.alert('Error', 'Please enter canteen name');
      return false;
    }

    if ((formData.userType === 'ngo') && !formData.organizationName) {
      Alert.alert('Error', 'Please enter organization name');
      return false;
    }

    if (formData.userType === 'driver') {
      if (!formData.vehicleType) {
        Alert.alert('Error', 'Please enter vehicle type');
        return false;
      }
      if (!formData.licenseNumber) {
        Alert.alert('Error', 'Please enter license number');
        return false;
      }
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    animateButton();
    setLoading(true);
    try {
      const payload: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        userType: formData.userType,
        address: formData.address,
        contactNumber: formData.contactNumber,
      };

      if (formData.userType === 'canteen') {
        if (formData.canteenName) payload.canteenName = formData.canteenName;
      } else if (formData.userType === 'driver') {
        payload.vehicleType = formData.vehicleType;
        payload.licenseNumber = formData.licenseNumber;
      } else {
        if (formData.organizationName) payload.organizationName = formData.organizationName;
        if (formData.organizationType) payload.organizationType = formData.organizationType;
      }

      const user = await AuthService.register(payload);
      Alert.alert(
        'Registration Successful',
        'Your account has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              if (user.userType === 'canteen') {
                navigation.navigate('CanteenTabs' as never);
              } else if (user.userType === 'driver') {
                navigation.navigate('DriverTabs' as never);
              } else {
                navigation.navigate('NGOTabs' as never);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Registration Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('LoginScreen' as never);
  };

  const getUserTypeDisplayIcon = (type: string) => {
    switch (type) {
      case 'canteen': return '🍽️';
      case 'ngo': return '🤝';
      case 'driver': return '🚚';
      default: return '👤';
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'canteen': return theme.colors.gradients.primary;
      case 'ngo': return theme.colors.gradients.primary;
      case 'driver': return theme.colors.gradients.accent;
      default: return theme.colors.gradients.secondary;
    }
  };

  const getOrgTypeIcon = (type: string) => {
    switch (type) {
      case 'ngo': return '🏛️';
      case 'volunteer': return '👤';
      case 'community_group': return '👥';
      default: return '🏛️';
    }
  };

  return (
    <LinearGradient
      colors={theme?.colors?.gradients?.background || ['#F0F8FF', '#E0F6FF']}
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
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.logoCircle}
              >
                <Text style={styles.logoEmoji}>🍽️</Text>
              </LinearGradient>
            </View>
            <Text style={styles.title}>Join PlateLink</Text>
            <Text style={styles.subtitle}>Create your account to start making a difference</Text>
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
            <LinearGradient
              colors={theme?.colors?.gradients?.card || ['#FFFFFF', '#F8F9FA']}
              style={styles.form}
            >
              <Text style={styles.sectionTitle}>Create Account</Text>
              
              {/* User Type Selection */}
              <View style={styles.userTypeContainer}>
                <Text style={styles.label}>I am a:</Text>
                <View style={styles.userTypeButtons}>
                  {(['canteen', 'ngo', 'driver'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.userTypeButton,
                        formData.userType === type && styles.userTypeButtonActive
                      ]}
                      onPress={() => updateFormData('userType', type)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={formData.userType === type ? getUserTypeColor(type) : ['transparent', 'transparent']}
                        style={styles.userTypeButtonGradient}
                      >
                        <Text style={styles.userTypeIcon}>{getUserTypeIcon(type)}</Text>
                        <Text style={[
                          styles.userTypeButtonText,
                          formData.userType === type && styles.userTypeButtonTextActive
                        ]}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.email}
                    onChangeText={(value) => updateFormData('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.name}
                    onChangeText={(value) => updateFormData('name', value)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Canteen Name (if canteen) */}
              {formData.userType === 'canteen' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Canteen Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter canteen name"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={formData.canteenName}
                      onChangeText={(value) => updateFormData('canteenName', value)}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Organization Name (if NGO) */}
        {(formData.userType === 'ngo') && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Organization Name</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="business-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter organization name"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.organizationName}
                        onChangeText={(value) => updateFormData('organizationName', value)}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Organization Type</Text>
                    <View style={styles.organizationTypeButtons}>
                      {(['ngo', 'community_group'] as const).map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.orgTypeButton,
                            formData.organizationType === type && styles.orgTypeButtonActive
                          ]}
                          onPress={() => updateFormData('organizationType', type)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={formData.organizationType === type ? ['#2196F3', '#1976D2'] : ['transparent', 'transparent']}
                            style={styles.orgTypeButtonGradient}
                          >
                            <Text style={styles.orgTypeIcon}>{getOrgTypeIcon(type)}</Text>
                            <Text style={[
                              styles.orgTypeButtonText,
                              formData.organizationType === type && styles.orgTypeButtonTextActive
                            ]}>
                              {type === 'community_group' ? 'Community' : 'NGO'}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Driver specific fields */}
              {formData.userType === 'driver' && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Vehicle Type</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="car-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Car, Bike, Van"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.vehicleType}
                        onChangeText={(value) => updateFormData('vehicleType', value)}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>License Number</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="card-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your driving license number"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={formData.licenseNumber}
                        onChangeText={(value) => updateFormData('licenseNumber', value)}
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Address */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter your address"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.address}
                    onChangeText={(value) => updateFormData('address', value)}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>

              {/* Contact Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your contact number"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.contactNumber}
                    onChangeText={(value) => updateFormData('contactNumber', value)}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.password}
                    onChangeText={(value) => updateFormData('password', value)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateFormData('confirmPassword', value)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Button */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity
                  style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={theme?.colors?.gradients?.button || ['#87CEEB', '#4682B4']}
                    style={styles.registerButtonGradient}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <Animated.View style={styles.loadingDot} />
                        <Text style={styles.registerButtonText}>Creating Account...</Text>
                      </View>
                    ) : (
                      <Text style={styles.registerButtonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={navigateToLogin}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
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
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    minHeight: SCREEN_HEIGHT,
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  logoContainer: {
    marginBottom: hp(2),
  },
  logoCircle: {
    width: rs(70),
    height: rs(70),
    borderRadius: rs(35),
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
  logoEmoji: {
    fontSize: rf(35),
  },
  title: {
    fontSize: rf(32),
    fontWeight: 'bold',
    color: theme.colors.textLight,
    marginBottom: hp(1),
    ...theme.typography.textShadow,
  },
  subtitle: {
    fontSize: rf(14),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    paddingHorizontal: wp(4),
    lineHeight: rf(20),
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    borderRadius: theme.borderRadius.xlarge,
    padding: wp(6),
    ...theme.shadows.large,
  },
  sectionTitle: {
    fontSize: rf(24),
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: hp(3),
    textAlign: 'center',
  },
  userTypeContainer: {
    marginBottom: hp(3),
  },
  label: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: hp(1.5),
  },
  userTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(12),
  },
  userTypeButton: {
    flex: 1,
    minWidth: wp(25),
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  userTypeButtonActive: {
    borderColor: 'transparent',
  },
  userTypeButtonGradient: {
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeIcon: {
    fontSize: rf(18),
    marginBottom: hp(0.5),
  },
  userTypeButtonText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  userTypeButtonTextActive: {
    color: theme.colors.textLight,
  },
  inputContainer: {
    marginBottom: hp(2.5),
  },
  inputLabel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: hp(1),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: wp(4),
    height: hp(6),
  },
  inputIcon: {
    marginRight: wp(3),
  },
  input: {
    flex: 1,
    fontSize: rf(16),
    color: theme.colors.text,
  },
  organizationTypeButtons: {
    flexDirection: 'row',
    gap: rs(12),
    marginTop: hp(1),
  },
  orgTypeButton: {
    flex: 1,
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  orgTypeButtonActive: {
    borderColor: 'transparent',
  },
  orgTypeButtonGradient: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizationTypeText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  orgTypeButtonTextActive: {
    color: theme.colors.textLight,
  },
  registerButton: {
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    marginTop: hp(2),
    marginBottom: hp(2),
    ...theme.shadows.button,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    paddingVertical: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
    backgroundColor: theme.colors.textLight,
    marginRight: wp(2),
  },
  registerButtonText: {
    fontSize: rf(18),
    fontWeight: 'bold',
    color: theme.colors.textLight,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: rf(14),
    color: theme.colors.textSecondary,
  },
  loginLink: {
    fontSize: rf(14),
    color: theme.colors.primary,
    fontWeight: '600',
    marginLeft: wp(1),
  },
});

export default RegisterScreen;