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
import { useFonts } from '@expo-google-fonts/dm-sans';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useAlert } from '../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/users.php';

const G = {
  forest:     '#0A2218',
  forestMid:  '#0F2E20',
  forestCard: '#153326',
  emerald:    '#2ECC71',
  emeraldDim: '#1A7A44',
  sage:       '#4CAF7D',
  cream:      '#F5F0E8',
  creamDim:   'rgba(245,240,232,0.6)',
  white:      '#FFFFFF',
  error:      '#F87171',
  border:     'rgba(46,204,113,0.2)',
  inputBg:    'rgba(255,255,255,0.05)',
};

const STEP_LABELS = ['Email', 'Code', 'Password'];

const ForgotPassword = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();
  const codeRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (step === 2 && codeRef.current) {
      codeRef.current.focus();
    }
  }, [step]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter your email address.' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forgot_password', email: email.trim().toLowerCase() }),
      });
      const text = await res.text();
      console.log('ForgotPassword raw response:', text.substring(0, 500));
      const result = JSON.parse(text);
      setLoading(false);
      if (result.success) {
        setStep(2);
      } else {
        showAlert({ type: 'error', title: 'Request Failed', message: result.message || 'Something went wrong.' });
      }
    } catch (e) {
      setLoading(false);
      console.error('ForgotPassword error (step 1):', e);
      showAlert({ type: 'error', title: 'Error', message: 'Could not connect to server. Check your connection.' });
    }
  };

  const handleVerifyCode = async () => {
    if (code.length < 6) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter the 6-digit code.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_reset_code', email: email.trim().toLowerCase(), code }),
      });
      const result = await res.json();
      setLoading(false);
      if (result.success) {
        setStep(3);
      } else {
        showAlert({ type: 'error', title: 'Invalid Code', message: result.message || 'The code is invalid or expired.' });
      }
    } catch (e) {
      setLoading(false);
      console.error('ForgotPassword error (step 2):', e);
      showAlert({ type: 'error', title: 'Error', message: 'Could not connect to server.' });
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      showAlert({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert({ type: 'error', title: 'Error', message: 'Passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          email: email.trim().toLowerCase(),
          code,
          new_password: newPassword,
        }),
      });
      const result = await res.json();
      setLoading(false);
      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Password reset successfully! Please sign in.' });
        setTimeout(() => navigation.replace('Login'), 1500);
      } else {
        showAlert({ type: 'error', title: 'Reset Failed', message: result.message || 'Something went wrong.' });
      }
    } catch (e) {
      setLoading(false);
      console.error('ForgotPassword error (step 3):', e);
      showAlert({ type: 'error', title: 'Error', message: 'Could not connect to server.' });
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, active && styles.stepCircleActive, done && styles.stepCircleDone]}>
              {done ? (
                <MaterialIcons name="check" size={14} color={G.forest} />
              ) : (
                <Text style={[styles.stepNum, active && styles.stepNumActive]}>{idx}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive, done && styles.stepLabelDone]}>{label}</Text>
            {i < STEP_LABELS.length - 1 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
          </View>
        );
      })}
    </View>
  );

  const heroTitle = step === 1 ? "Forgot\npassword?" : step === 2 ? "Check\nyour inbox" : "New\npassword";
  const heroSub = step === 1 ? "We'll send you a reset code." : step === 2 ? `Enter the code sent to ${email}` : "Create your new password.";

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: G.forest }} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={G.forest} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.heroArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity onPress={() => step === 1 ? (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')) : setStep(step - 1)} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={G.cream} />
          </TouchableOpacity>
          <View style={styles.logoWrap}>
            <MaterialIcons name="lock-outline" size={24} color={G.forest} />
          </View>
          <Text style={styles.heroTagline}>{heroTitle}</Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
        </Animated.View>

        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {renderStepIndicator()}

          {step === 1 && (
            <>
              <View style={inp.container}>
                <Text style={inp.label}>Email Address</Text>
                <View style={inp.wrapper}>
                  <MaterialIcons name="email" size={18} color={G.sage} style={inp.icon} />
                  <TextInput
                    style={inp.input}
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(245,240,232,0.3)"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSendCode}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={G.forest} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Send Reset Code</Text>
                    <View style={styles.submitArrow}>
                      <MaterialIcons name="arrow-forward" size={18} color={G.forest} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <View style={inp.container}>
                <Text style={inp.label}>6-Digit Code</Text>
                <TextInput
                  ref={codeRef}
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor="rgba(245,240,232,0.2)"
                  value={code}
                  onChangeText={t => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                />
                <Text style={styles.codeHint}>Enter the code sent to your email. It expires in 30 minutes.</Text>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleVerifyCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={G.forest} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Verify Code</Text>
                    <View style={styles.submitArrow}>
                      <MaterialIcons name="arrow-forward" size={18} color={G.forest} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendCode} disabled={loading} style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive it? </Text>
                <Text style={styles.resendLink}>Resend</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 3 && (
            <>
              <View style={inp.container}>
                <Text style={inp.label}>New Password</Text>
                <View style={inp.wrapper}>
                  <MaterialIcons name="lock-outline" size={18} color={G.sage} style={inp.icon} />
                  <TextInput
                    style={inp.input}
                    placeholder="Min 6 characters"
                    placeholderTextColor="rgba(245,240,232,0.3)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={inp.toggle}>
                    <MaterialIcons name={showPassword ? 'visibility-off' : 'visibility'} size={18} color={G.sage} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={inp.container}>
                <Text style={inp.label}>Confirm Password</Text>
                <View style={inp.wrapper}>
                  <MaterialIcons name="lock-outline" size={18} color={G.sage} style={inp.icon} />
                  <TextInput
                    style={inp.input}
                    placeholder="Re-enter password"
                    placeholderTextColor="rgba(245,240,232,0.3)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={inp.toggle}>
                    <MaterialIcons name={showConfirm ? 'visibility-off' : 'visibility'} size={18} color={G.sage} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={G.forest} size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Reset Password</Text>
                    <View style={styles.submitArrow}>
                      <MaterialIcons name="arrow-forward" size={18} color={G.forest} />
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.loginRow} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={styles.loginText}>Back to</Text>
            <View style={styles.loginPill}>
              <Text style={styles.loginPillText}>Sign In →</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const inp = StyleSheet.create({
  container: { marginBottom: 20 },
  label: {
    fontFamily: 'DMSans_500Medium', fontSize: 11,
    color: G.sage, letterSpacing: 1.2,
    textTransform: 'uppercase', marginBottom: 8,
  },
  wrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14, borderColor: G.border,
    backgroundColor: G.inputBg, paddingHorizontal: 16, height: 54,
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1, fontFamily: 'DMSans_400Regular',
    fontSize: 15, color: G.cream, paddingVertical: 0,
  },
  toggle: { padding: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.forest },
  blob1: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: G.emerald, opacity: 0.07,
  },
  blob2: {
    position: 'absolute', top: 200, left: -80,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: G.sage, opacity: 0.06,
  },
  scroll: {
    flexGrow: 1, paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingBottom: 40,
  },
  heroArea: { marginBottom: 36 },
  backButton: { marginBottom: 20, width: 40 },
  logoWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: G.emerald,
    justifyContent: 'center', alignItems: 'center', marginBottom: 28,
  },
  heroTagline: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 48, color: G.cream, lineHeight: 56, marginBottom: 10,
  },
  heroSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14, color: G.creamDim, lineHeight: 22,
  },
  card: {
    backgroundColor: G.forestCard,
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: G.border,
    marginBottom: 40,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24, gap: 0,
  },
  stepItem: {
    flexDirection: 'row', alignItems: 'center',
  },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: G.border,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'transparent',
  },
  stepCircleActive: {
    borderColor: G.emerald, backgroundColor: G.emerald + '20',
  },
  stepCircleDone: {
    borderColor: G.emerald, backgroundColor: G.emerald,
  },
  stepNum: {
    fontSize: 12, fontFamily: 'DMSans_700Bold', color: G.sage,
  },
  stepNumActive: {
    color: G.emerald,
  },
  stepLabel: {
    fontSize: 10, fontFamily: 'DMSans_500Medium',
    color: G.textMuted, marginLeft: 6,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  stepLabelActive: {
    color: G.emerald, fontFamily: 'DMSans_700Bold',
  },
  stepLabelDone: {
    color: G.emerald,
  },
  stepLine: {
    width: 24, height: 1.5, backgroundColor: G.border,
    marginHorizontal: 8,
  },
  stepLineDone: {
    backgroundColor: G.emerald,
  },
  codeInput: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 36, color: G.cream,
    textAlign: 'center', letterSpacing: 12,
    borderWidth: 1.5, borderRadius: 14, borderColor: G.border,
    backgroundColor: G.inputBg,
    height: 68, paddingHorizontal: 16,
  },
  codeHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11, color: G.creamDim,
    textAlign: 'center', marginTop: 10,
  },
  submitBtn: {
    backgroundColor: G.emerald,
    borderRadius: 100, height: 54,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 8, gap: 10,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontFamily: 'DMSans_700Bold', fontSize: 16, color: G.forest,
  },
  submitArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(10,34,24,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  resendRow: {
    flexDirection: 'row', justifyContent: 'center', marginTop: 16,
  },
  resendText: {
    fontFamily: 'DMSans_400Regular', fontSize: 12, color: G.creamDim,
  },
  resendLink: {
    fontFamily: 'DMSans_700Bold', fontSize: 12, color: G.emerald,
  },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 22, gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: G.border },
  dividerText: {
    fontFamily: 'DMSans_500Medium', fontSize: 12, color: G.creamDim,
  },
  loginRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  loginText: {
    fontFamily: 'DMSans_400Regular', fontSize: 14, color: G.creamDim,
  },
  loginPill: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 100, borderWidth: 1.5, borderColor: G.emerald + '60',
    backgroundColor: G.emerald + '15',
  },
  loginPillText: {
    fontFamily: 'DMSans_700Bold', fontSize: 13, color: G.emerald,
  },
});

export default ForgotPassword;
