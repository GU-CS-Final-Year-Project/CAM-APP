import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { useAlert } from '../../components/CustomAlert';

const T = {
  navy:     '#0D1B2A',
  navyMid:  '#162436',
  navyCard: '#1C2E40',
  coral:    '#E8624A',
  coralSoft:'#F4A090',
  gold:     '#F0C060',
  mint:     '#4ECBA8',
  lavender: '#A78BFA',
  surface:  '#F5F3EE',
  surfaceAlt:'#EDE9E2',
  text:     '#1A1A1A',
  textMuted:'#6B6560',
  white:    '#FFFFFF',
  cream:    '#FBF9F6',
};

const API_URL = 'http://192.168.43.107/cam/club_members.php?action=get';

const PendingRequestsScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchPendingRequests();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPendingRequests();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchPendingRequests = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (!userData) return;
      const currentUser = JSON.parse(userData);

      const [clubsRes, membersRes] = await Promise.all([
        fetch('http://192.168.43.107/cam/clubs.php?action=get'),
        fetch(API_URL),
      ]);

      const clubsData = await clubsRes.json();
      const membersData = await membersRes.json();

      if (!clubsData.success || !membersData.success) return;

      const myClubIds = (clubsData.data || [])
        .filter(c => c.patron === currentUser.user_name || c.created_by === currentUser.user_id)
        .map(c => c.club_id);

      const pending = (membersData.data || []).filter(m => {
        const status = (m.status || m.Status || '').toLowerCase();
        return myClubIds.includes(m.club_id) && (status === 'pending' || status === '');
      });

      const clubNames = {};
      (clubsData.data || []).forEach(c => { clubNames[c.club_id] = c.club_name; });

      setPendingList(pending.map(m => ({ ...m, club_name: clubNames[m.club_id] || 'Unknown' })));
    } catch (e) {
      console.error('Error fetching pending requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (membershipId) => {
    setProcessing(membershipId);
    try {
      const res = await fetch('http://192.168.43.107/cam/club_members.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', membership_id: membershipId, status: 'active' }),
      });
      const result = await res.json();
      if (result.success) {
        showAlert({ type: 'success', title: 'Approved', message: 'Member request approved.' });
        setPendingList(prev => prev.filter(m => m.membership_id !== membershipId));
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to approve.' });
      }
    } catch (e) {
      showAlert({ type: 'error', title: 'Error', message: 'Network error.' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (membershipId) => {
    setProcessing(membershipId);
    try {
      const res = await fetch('http://192.168.43.107/cam/club_members.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', membership_id: membershipId, status: 'rejected' }),
      });
      const result = await res.json();
      if (result.success) {
        showAlert({ type: 'success', title: 'Rejected', message: 'Member request rejected.' });
        setPendingList(prev => prev.filter(m => m.membership_id !== membershipId));
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to reject.' });
      }
    } catch (e) {
      showAlert({ type: 'error', title: 'Error', message: 'Network error.' });
    } finally {
      setProcessing(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingRequests().finally(() => setRefreshing(false));
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.cream }} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.cream} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={T.navy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.navy]} tintColor={T.navy} />}
        >
          {pendingList.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialIcons name="person-add" size={48} color={T.textMuted + '40'} />
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          ) : (
            pendingList.map(m => (
              <View key={m.membership_id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(m.student_name || '?')[0]}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name} numberOfLines={1}>{m.student_name}</Text>
                    <Text style={styles.clubName}>{m.club_name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: '#F39C12' }]}>
                      <Text style={styles.statusText}>Pending</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(m.membership_id)}
                    disabled={processing === m.membership_id}
                    activeOpacity={0.8}
                  >
                    {processing === m.membership_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="check" size={18} color="#fff" />
                        <Text style={styles.actionText}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleReject(m.membership_id)}
                    disabled={processing === m.membership_id}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="close" size={18} color="#fff" />
                    <Text style={styles.actionText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: T.cream,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.white, justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  headerTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: T.text, flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 10 },

  card: {
    backgroundColor: T.white, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: T.coral + '22', justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: T.coral },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: T.text },
  clubName: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 2 },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, marginTop: 6,
  },
  statusText: { fontSize: 10, fontFamily: 'DMSans_700Bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  approveBtn: { backgroundColor: '#27AE60' },
  rejectBtn: { backgroundColor: '#E74C3C' },
  actionText: { color: '#fff', fontSize: 14, fontFamily: 'DMSans_700Bold' },
});

export default PendingRequestsScreen;
