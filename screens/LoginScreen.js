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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from '@expo-google-fonts/dm-sans';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useAlert } from '../components/CustomAlert';
import { useTheme } from '../context/ThemeContext';

const LOGIN_API_URL = 'http://192.168.43.107/cam/users.php';

const GreenInput = ({ label, icon, value, onChangeText, placeholder, secureEntry, showToggle, onToggle, keyboardType, returnKeyType, onSubmitEditing }) => {
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

  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [G.borderColor, G.emerald] });

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
});

const AuthScreens = ({ navigation }) => {
  const { theme: G, isDarkMode, toggleTheme } = useTheme();
  const [fontsLoaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { showAlert } = useAlert();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    checkExistingSession();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const checkExistingSession = async () => {
    try {
      const userType = await AsyncStorage.getItem('userType');
      if (userType) {
        switch(userType) {
          case 'Admin':
            navigation.replace('AdminFlow');
            break;
          case 'ClubLeader':
            navigation.replace('ClubLeaderFlow');
            break;
          case 'Student':
            navigation.replace('StudentFlow');
            break;
          default:
            break;
        }
      }
    } catch (error) {
      console.log('Session check error:', error);
    }
  };

  const handleSubmit = async () => {
    if (!username || !password) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in both fields.' });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: username,
          username: username,
          password: password
        }),
      });

      const rawText = await response.text();
      console.log('Login raw response:', rawText.substring(0, 500));
      const result = JSON.parse(rawText);
      setLoading(false);

      if (result.success) {
        const userData = result.data.user;
        const dashboard = result.data.dashboard;

        await AsyncStorage.setItem('user', JSON.stringify(userData));
        await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
        await AsyncStorage.setItem('userType', userData.user_type);
        await AsyncStorage.setItem('userId', userData.user_id.toString());
        await AsyncStorage.setItem('userName', userData.user_name);


        switch(userData.user_type) {
          case 'Admin':
            navigation.replace('AdminFlow');
            break;
          case 'ClubLeader':
            navigation.replace('ClubLeaderFlow');
            break;
          case 'Student':
            navigation.replace('StudentFlow');
            break;
          default:
            navigation.replace('StudentFlow');
        }
      } else {
        showAlert({ type: 'error', title: 'Login Failed', message: result.message || 'Invalid credentials.' });
      }
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Could not connect to server. Please check your connection.' });
    }
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: G.forest }} />;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: G.forest }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <View style={styles.titleRow}>
            <Text style={[styles.heroTagline, { color: G.cream }]}>CAM-APP</Text>
            <View style={styles.themeToggle}>
              <TouchableOpacity
                style={[styles.themeBtn, !isDarkMode && styles.themeBtnActive]}
                onPress={() => isDarkMode && toggleTheme()}
              >
                <MaterialIcons name="light-mode" size={16} color={!isDarkMode ? G.forest : G.creamDim} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeBtn, isDarkMode && styles.themeBtnActive]}
                onPress={() => !isDarkMode && toggleTheme()}
              >
                <MaterialIcons name="dark-mode" size={16} color={isDarkMode ? G.forest : G.creamDim} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.heroSub, { color: G.creamDim }]}>Club Activities Management App</Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: G.forestCard, borderColor: G.borderColor }]}>
          <Text style={[styles.cardTitle, { color: G.cream }]}>Sign In</Text>

          <GreenInput
            label="Username or Email"
            icon="person-outline"
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username or email"
            returnKeyType="next"
          />

          <GreenInput
            label="Password"
            icon="lock-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureEntry={!showPassword}
            showToggle
            onToggle={() => setShowPassword(v => !v)}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: G.emerald }, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={G.forest} size="small" />
            ) : (
              <>
                <Text style={[styles.submitBtnText, { color: G.forest }]}>Sign In</Text>
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
            style={styles.signupRow}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.7}
          >
            <Text style={[styles.signupText, { color: G.creamDim }]}>Don't have an account?</Text>
            <View style={[styles.signupPill, { borderColor: G.emerald + '60', backgroundColor: G.emerald + '15' }]}>
              <Text style={[styles.signupPillText, { color: G.emerald }]}>Create one →</Text>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTagline: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 48, lineHeight: 56, marginBottom: 10,
  },
  themeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 3,
    gap: 2,
  },
  themeBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  themeBtnActive: {
    backgroundColor: '#2ECC71',
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

  signupRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  signupText: {
    fontFamily: 'DMSans_400Regular', fontSize: 14,
  },
  signupPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5,
  },
  signupPillText: {
    fontFamily: 'DMSans_700Bold', fontSize: 13,
  },
});

export default AuthScreens;
