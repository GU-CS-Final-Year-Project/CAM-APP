import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform,
  TextInput, ActivityIndicator, Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/';

const StudentProfile = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    user_name: '',
    email: '',
    phone: '',
    address: '',
  });
  const { showAlert } = useAlert();

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const data = await AsyncStorage.getItem('userInfo');
      if (data) {
        const parsed = JSON.parse(data);
        setUserInfo(parsed);
        setForm({
          user_name: parsed.user_name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          address: parsed.address || '',
        });
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.user_name.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Name is required' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}students.php?action=update_profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userInfo.user_id,
          user_name: form.user_name,
          email: form.email,
          phone: form.phone,
          address: form.address,
        }),
      });
      const result = await response.json();
      if (result.success) {
        const updated = { ...userInfo, ...form };
        await AsyncStorage.setItem('userInfo', JSON.stringify(updated));
        setUserInfo(updated);
        setEditing(false);
        showAlert({ type: 'success', title: 'Success', message: 'Profile updated successfully' });
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'StudentDashboard' })} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editButton}>
          <MaterialIcons name={editing ? 'close' : 'edit'} size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={60} color={COLORS.white} />
          </View>
          <Text style={styles.userName}>{userInfo?.user_name || 'User'}</Text>
          <Text style={styles.userRole}>Student</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="person" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.user_name}
                onChangeText={(v) => setForm({ ...form, user_name: v })}
                editable={editing}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.grey}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="email" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                editable={editing}
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor={COLORS.grey}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="phone" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                editable={editing}
                keyboardType="phone-pad"
                placeholder="Enter your phone number"
                placeholderTextColor={COLORS.grey}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Address</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="location-on" size={20} color={COLORS.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(v) => setForm({ ...form, address: v })}
                editable={editing}
                multiline
                placeholder="Enter your address"
                placeholderTextColor={COLORS.grey}
              />
            </View>
          </View>

          {editing && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color={COLORS.white} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color={COLORS.primary} />
            <Text style={styles.infoLabel}>Username:</Text>
            <Text style={styles.infoValue}>{userInfo?.username || userInfo?.user_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="category" size={20} color={COLORS.primary} />
            <Text style={styles.infoLabel}>User Type:</Text>
            <Text style={styles.infoValue}>{userInfo?.user_type || 'Student'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="verified-user" size={20} color={COLORS.primary} />
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{userInfo?.user_id || 'N/A'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: SIZES.padding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.medium,
  },
  backButton: { padding: 8 },
  editButton: { padding: 8 },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '700', color: COLORS.headerText, fontFamily: FONTS.bold },
  scrollContent: { paddingHorizontal: SIZES.padding, paddingBottom: 30 },
  avatarSection: { alignItems: 'center', marginVertical: 24 },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, ...SHADOWS.medium,
  },
  userName: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold, marginBottom: 4 },
  userRole: { fontSize: SIZES.md, color: COLORS.textSecondary, fontFamily: FONTS.medium },
  formCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg,
    padding: SIZES.padding, marginBottom: SIZES.margin, ...SHADOWS.small,
  },
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg,
    padding: SIZES.padding, marginBottom: SIZES.margin, ...SHADOWS.small,
  },
  sectionTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.text, fontFamily: FONTS.bold, marginBottom: 16 },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, fontFamily: FONTS.medium, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    backgroundColor: COLORS.lightGrey, paddingHorizontal: 12, height: 50,
  },
  inputWrapperActive: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: SIZES.md, color: COLORS.text, fontFamily: FONTS.regular, paddingVertical: 8 },
  saveButton: {
    flexDirection: 'row', backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    padding: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8, ...SHADOWS.medium,
  },
  saveButtonDisabled: { backgroundColor: COLORS.grey },
  saveButtonText: { color: COLORS.white, fontSize: SIZES.lg, fontWeight: '700', fontFamily: FONTS.bold, marginLeft: 8 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  infoLabel: { fontSize: SIZES.md, color: COLORS.textSecondary, fontFamily: FONTS.medium, marginLeft: 10, flex: 1 },
  infoValue: { fontSize: SIZES.md, color: COLORS.text, fontFamily: FONTS.regular, flex: 1, textAlign: 'right' },
});

export default StudentProfile;
