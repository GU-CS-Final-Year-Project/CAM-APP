import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from '@expo-google-fonts/dm-sans';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useAlert } from '../components/CustomAlert';
import { useTheme } from '../context/ThemeContext';

const SIGNUP_API_URL = 'http://192.168.43.107/cam/users.php';

const USER_TYPES = [
  { label: 'Student', value: 'Student', icon: 'school' },
  { label: 'Club Leader', value: 'ClubLeader', icon: 'people' },
];

const GreenInput = ({ label, icon, value, onChangeText, placeholder, secureEntry, showToggle, onToggle, keyboardType, returnKeyType, onSubmitEditing, error }) => {
  const { theme: G } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? G.error : G.borderColor, error ? G.error : G.emerald]
  });

  return (
    <View style={inp.container}>
      <Text style={[inp.label, { color: G.sage }]}>{label}</Text>
      <Animated.View style={[inp.wrapper, { borderColor, backgroundColor: G.inputBg }]}>
        <MaterialIcons name={icon} size={18} color={focused ? G.emerald : G.sage} style={inp.icon} />
        <TextInput
          style={[inp.input, { color: G.cream }]}
          placeholder={placeholder}
          placeholderTextColor={G.creamDim}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureEntry}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType || 'default'}
          returnKeyType={returnKeyType || 'done'}
          onSubmitEditing={onSubmitEditing}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {showToggle && (
          <TouchableOpacity onPress={onToggle} style={inp.toggle}>
            <MaterialIcons name={secureEntry ? 'visibility-off' : 'visibility'} size={18} color={G.sage} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && <Text style={[inp.errorText, { color: G.error }]}>{error}</Text>}
    </View>
  );
};

const inp = StyleSheet.create({
  container: { marginBottom: 20 },
  label: {
    fontFamily: 'DMSans_500Medium', fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 8,
  },
  wrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14,
    paddingHorizontal: 16, height: 54,
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1, fontFamily: 'DMSans_400Regular',
    fontSize: 15, paddingVertical: 0,
  },
  toggle: { padding: 6 },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11, marginTop: 6,
  },
});

const SignupScreen = ({ navigation }) => {
  const { theme: G, isDarkMode } = useTheme();
  const [fontsLoaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('Student');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [altContact, setAltContact] = useState('');
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState({});
  const { showAlert } = useAlert();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    else if (name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
    else if (/[0-9]/.test(name)) newErrors.name = 'Name must not contain numbers';

    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';

    if (!studentNumber.trim()) newErrors.studentNumber = 'Student number is required';
    else if (!/^\d{10}$/.test(studentNumber.trim())) newErrors.studentNumber = 'Student number must be exactly 10 digits';

    if (phone && !/^[0-9+\-\s]{10,}$/.test(phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (!selectedUserType) newErrors.userType = 'Please select a user type';

    if (gender && /[0-9]/.test(gender)) newErrors.gender = 'Gender must not contain numbers';

    if (address && /[0-9]/.test(address)) newErrors.address = 'Address must not contain numbers';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch(SIGNUP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: name.trim(),
          email: email.trim().toLowerCase(),
          student_number: studentNumber.trim(),
          phone: phone.trim() || null,
          password: password,
          user_type: selectedUserType,
          gender: gender.trim() || null,
          date_of_birth: dateOfBirth.trim() || null,
          contact: altContact.trim() || null,
          address: address.trim() || null,
        }),
      });

      const result = await response.json();
      setLoading(false);

      if (result.success) {
        showAlert({
          type: 'success',
          title: 'Success!',
          message: `Account created successfully as ${selectedUserType === 'ClubLeader' ? 'Club Leader' : selectedUserType}! Please login.`
        });

        setTimeout(() => {
          navigation.replace('Login');
        }, 1500);
      } else {
        showAlert({ type: 'error', title: 'Signup Failed', message: result.message });
      }
    } catch (error) {
      setLoading(false);
      console.error('Signup error:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Could not connect to server. Please check your connection.' });
    }
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: G.forest }} />;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: G.forest }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={G.forest} />

      <View style={[styles.blob1, { backgroundColor: G.emerald }]} />
      <View style={[styles.blob2, { backgroundColor: G.sage }]} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.heroArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={G.cream} />
          </TouchableOpacity>
          <Text style={[styles.heroTagline, { color: G.cream }]}>Create{'\n'}account.</Text>
          <Text style={[styles.heroSub, { color: G.creamDim }]}>Join the club community today.</Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: G.forestCard, borderColor: G.borderColor }]}>
          <Text style={[styles.cardTitle, { color: G.cream }]}>Sign Up</Text>

          <GreenInput
            label="Full Name"
            icon="person-outline"
            value={name}
            onChangeText={(text) => setName(text.replace(/[0-9]/g, ''))}
            placeholder="Enter your full name"
            returnKeyType="next"
            error={errors.name}
          />

          <GreenInput
            label="Email Address"
            icon="email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            returnKeyType="next"
            error={errors.email}
          />

          <GreenInput
            label="Student Number"
            icon="badge"
            value={studentNumber}
            onChangeText={(text) => setStudentNumber(text.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter your 10-digit student number"
            keyboardType="number-pad"
            returnKeyType="next"
            error={errors.studentNumber}
          />

          <GreenInput
            label="Phone Number (Optional)"
            icon="phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            returnKeyType="next"
            error={errors.phone}
          />

          <GreenInput
            label="Password"
            icon="lock-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password (min 6 characters)"
            secureEntry={!showPassword}
            showToggle
            onToggle={() => setShowPassword(v => !v)}
            returnKeyType="next"
            error={errors.password}
          />

          <GreenInput
            label="Confirm Password"
            icon="lock-outline"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureEntry={!showConfirmPassword}
            showToggle
            onToggle={() => setShowConfirmPassword(v => !v)}
            returnKeyType="done"
            onSubmitEditing={handleSignup}
            error={errors.confirmPassword}
          />

          <Text style={[styles.userTypeLabel, { color: G.sage }]}>I am signing up as a:</Text>
          <View style={styles.userTypeContainer}>
            {USER_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.userTypeOption,
                  { borderColor: G.borderColor, backgroundColor: G.inputBg },
                  selectedUserType === type.value && { borderColor: G.emerald, backgroundColor: G.emerald + '20' }
                ]}
                onPress={() => setSelectedUserType(type.value)}
              >
                <MaterialIcons
                  name={type.icon}
                  size={20}
                  color={selectedUserType === type.value ? G.forest : G.sage}
                />
                <Text style={[
                  styles.userTypeText,
                  { color: selectedUserType === type.value ? G.emerald : G.sage }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.userType && <Text style={[styles.userTypeError, { color: G.error }]}>{errors.userType}</Text>}

          <View style={[styles.profileSection, { borderTopColor: G.borderColor }]}>
            <Text style={[styles.profileSectionTitle, { color: G.sage }]}>Profile Info (optional)</Text>

            <GreenInput
              label="Gender"
              icon="wc"
              value={gender}
              onChangeText={(text) => setGender(text.replace(/[0-9]/g, ''))}
              placeholder="Male / Female / Other"
              returnKeyType="next"
              error={errors.gender}
            />

            <View style={inp.container}>
              <Text style={[inp.label, { color: G.sage }]}>Date of Birth</Text>
              <TouchableOpacity
                style={[inp.wrapper, { borderColor: G.borderColor, backgroundColor: G.inputBg, justifyContent: 'space-between' }]}
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <MaterialIcons name="cake" size={18} color={G.sage} style={inp.icon} />
                  <Text style={[inp.input, { color: dateOfBirth ? G.cream : G.creamDim }]}>
                    {dateOfBirth || 'Select your date of birth'}
                  </Text>
                </View>
                <MaterialIcons name="calendar-today" size={16} color={G.sage} />
              </TouchableOpacity>
            </View>
            {datePickerVisible && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setDatePickerVisible(false);
                  if (date) {
                    setSelectedDate(date);
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    setDateOfBirth(`${y}-${m}-${d}`);
                  }
                }}
              />
            )}

            <GreenInput
              label="Alternative Contact"
              icon="phone"
              value={altContact}
              onChangeText={setAltContact}
              placeholder="Optional phone number"
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <GreenInput
              label="Address"
              icon="home"
              value={address}
              onChangeText={(text) => setAddress(text.replace(/[0-9]/g, ''))}
              placeholder="Your address"
              returnKeyType="done"
              error={errors.address}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: G.emerald }, loading && styles.submitBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={G.forest} size="small" />
            ) : (
              <>
                <Text style={[styles.submitBtnText, { color: G.forest }]}>Create Account</Text>
                <View style={[styles.submitArrow, { backgroundColor: 'rgba(10,34,24,0.2)' }]}>
                  <MaterialIcons name="arrow-forward" size={18} color={G.forest} />
                </View>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: G.borderColor }]} />
            <Text style={[styles.dividerText, { color: G.creamDim }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: G.borderColor }]} />
          </View>

          <TouchableOpacity
            style={styles.loginRow}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.loginText, { color: G.creamDim }]}>Already have an account?</Text>
            <View style={[styles.loginPill, { borderColor: G.emerald + '60', backgroundColor: G.emerald + '15' }]}>
              <Text style={[styles.loginPillText, { color: G.emerald }]}>Sign In →</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  blob1: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    opacity: 0.07,
  },
  blob2: {
    position: 'absolute', top: 200, left: -80,
    width: 180, height: 180, borderRadius: 90,
    opacity: 0.06,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },

  heroArea: {
    marginBottom: 36,
  },
  backButton: {
    marginBottom: 20,
    width: 40,
  },
  heroTagline: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 48, lineHeight: 56, marginBottom: 10,
  },
  heroSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14, lineHeight: 22,
  },

  card: {
    borderRadius: 24, padding: 24,
    borderWidth: 1,
  },
  cardTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18, marginBottom: 24,
  },

  userTypeLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11, letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 12,
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  userTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  userTypeText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  userTypeError: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11, marginBottom: 10,
  },

  submitBtn: {
    borderRadius: 100, height: 54,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 8, gap: 10,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontFamily: 'DMSans_700Bold', fontSize: 16,
  },
  submitArrow: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },

  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 22, gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    fontFamily: 'DMSans_500Medium', fontSize: 12,
  },

  profileSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  profileSectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11, letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 20,
  },

  loginRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  loginText: {
    fontFamily: 'DMSans_400Regular', fontSize: 14,
  },
  loginPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5,
  },
  loginPillText: {
    fontFamily: 'DMSans_700Bold', fontSize: 13,
  },
});

export default SignupScreen;
