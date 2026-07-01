import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/';
const T = {
  navy: '#0D1B2A', navyMid: '#162436', navyCard: '#1C2E40',
  coral: '#E8624A', gold: '#F0C060', mint: '#4ECBA8',
  white: '#FFFFFF', cream: '#FBF9F6',
  text: '#1A1A1A', textMuted: '#6B6560',
};

const ClubLeaderProfile = ({ navigation }) => {
  const { showAlert } = useAlert();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    user_name: '',
    email: '',
    phone: '',
    address: '',
  });

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      loadUserInfo(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const handleSave = async () => {
    if (!form.user_name.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Name is required' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}teachers.php?action=update_profile`, {
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

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.coral} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('DashTab', { screen: 'ClubLeaderDashboard' })} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={T.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editButton}>
          <MaterialIcons name={editing ? 'close' : 'edit'} size={24} color={T.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#E8624A']} tintColor="#E8624A" />}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userInfo?.user_name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.name}>{userInfo?.user_name || 'N/A'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userInfo?.user_type || 'Club Leader'}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="person" size={20} color={T.coral} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.user_name}
                onChangeText={(v) => setForm({ ...form, user_name: v })}
                editable={editing}
                placeholder="Enter your name"
                placeholderTextColor={T.textMuted}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="email" size={20} color={T.coral} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                editable={editing}
                keyboardType="email-address"
                placeholder="Enter your email"
                placeholderTextColor={T.textMuted}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Phone</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="phone" size={20} color={T.coral} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                editable={editing}
                keyboardType="phone-pad"
                placeholder="Enter your phone number"
                placeholderTextColor={T.textMuted}
              />
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Address</Text>
            <View style={[styles.inputWrapper, editing && styles.inputWrapperActive]}>
              <MaterialIcons name="location-on" size={20} color={T.coral} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(v) => setForm({ ...form, address: v })}
                editable={editing}
                multiline
                placeholder="Enter your address"
                placeholderTextColor={T.textMuted}
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
                <ActivityIndicator size="small" color={T.white} />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color={T.white} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="badge" size={20} color={T.coral} />
            <Text style={styles.infoLabel}>Username</Text>
            <Text style={styles.infoValue}>{userInfo?.username || userInfo?.user_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="category" size={20} color={T.coral} />
            <Text style={styles.infoLabel}>User Type</Text>
            <Text style={styles.infoValue}>{userInfo?.user_type || 'Club Leader'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="verified-user" size={20} color={T.coral} />
            <Text style={styles.infoLabel}>User ID</Text>
            <Text style={styles.infoValue}>{userInfo?.user_id || 'N/A'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.cream },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: T.cream },
  header: {
    backgroundColor: T.navy, paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  editButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: T.white },
  content: { padding: 20, paddingBottom: 30 },
  profileCard: { alignItems: 'center', backgroundColor: T.white, borderRadius: 16, padding: 24, marginBottom: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }) },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: T.coral, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '700', color: T.white },
  name: { fontSize: 22, fontWeight: '700', color: T.text, marginBottom: 8 },
  roleBadge: { backgroundColor: T.coral + '18', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 13, fontWeight: '600', color: T.coral },
  formCard: { backgroundColor: T.white, borderRadius: 16, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }) },
  infoCard: { backgroundColor: T.white, borderRadius: 16, padding: 16, marginBottom: 20, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }) },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: T.text, marginBottom: 16 },
  fieldContainer: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: T.textMuted, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: T.text + '20', borderRadius: 12,
    backgroundColor: T.cream, paddingHorizontal: 12, height: 50,
  },
  inputWrapperActive: { borderColor: T.coral, backgroundColor: T.white },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: T.text, paddingVertical: 8 },
  saveButton: {
    flexDirection: 'row', backgroundColor: T.coral, borderRadius: 12,
    padding: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 }, android: { elevation: 4 } }),
  },
  saveButtonDisabled: { backgroundColor: T.textMuted },
  saveButtonText: { color: T.white, fontSize: 16, fontWeight: '700', marginLeft: 8 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: T.text + '12',
  },
  infoLabel: { fontSize: 14, color: T.textMuted, marginLeft: 10, flex: 1 },
  infoValue: { fontSize: 14, color: T.text, flex: 1, textAlign: 'right' },
});

export default ClubLeaderProfile;
