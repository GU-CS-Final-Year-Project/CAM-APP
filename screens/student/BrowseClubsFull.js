import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
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

const BrowseClubsFull = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [allClubs, setAllClubs] = useState([]);
  const [myJoinedClubs, setMyJoinedClubs] = useState([]);
  const [joiningClub, setJoiningClub] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const joiningRef = useRef({});
  const { showAlert } = useAlert();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await loadStudentInfo();
    await Promise.all([fetchAllClubs(), fetchMyJoinedClubs()]);
  };

  const loadStudentInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setStudentId(parsed.user_id);
      }
    } catch (e) {}
  };

  const fetchAllClubs = async () => {
    try {
      const res = await fetch('http://192.168.43.107/cam/clubs.php?action=get');
      const result = await res.json();
      if (result.success) setAllClubs(result.data || []);
    } catch (e) {}
  };

  const fetchMyJoinedClubs = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const { user_id } = JSON.parse(userData);
        const res = await fetch(`http://192.168.43.107/cam/club_members.php?action=get_by_student&student_id=${user_id}`);
        const result = await res.json();
        if (result.success && result.data) {
          setMyJoinedClubs(result.data);
        }
      }
    } catch (e) {}
  };

  const performJoinClub = async (clubId) => {
    if (!clubId || !studentId) {
      showAlert({ type: 'warning', title: 'Error', message: 'Unable to join club. Please try logging in again.' });
      return;
    }
    if (joiningRef.current[clubId]) return;
    joiningRef.current[clubId] = true;
    try {
      setJoiningClub(clubId);
      setMyJoinedClubs(prev => [...prev, { club_id: clubId, status: 'pending' }]);
      const response = await fetch('http://192.168.43.107/cam/club_members.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          club_id: clubId,
          student_id: studentId,
          role: 'member',
          status: 'pending',
        }),
      });
      const result = await response.json();
      console.log('Join club result:', JSON.stringify(result));
      if (result.success) {
        const membershipId = result.data?.membership_id;
        if (membershipId) {
          await fetch('http://192.168.43.107/cam/club_members.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              membership_id: membershipId,
              status: 'pending',
            }),
          });
        }
        showAlert({
          type: 'success',
          title: 'Request Sent',
          message: 'Your request has been sent to the club leader for approval.'
        });
      } else {
        setMyJoinedClubs(prev => prev.filter(m => m.club_id !== clubId));
        if (result.message?.includes('already')) {
          await fetchMyJoinedClubs();
        }
        showAlert({
          type: result.message?.includes('already') ? 'warning' : 'error',
          title: result.message?.includes('already') ? 'Already a Member' : 'Error',
          message: result.message || 'Failed to send request',
        });
      }
    } catch (e) {
      setMyJoinedClubs(prev => prev.filter(m => m.club_id !== clubId));
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.' });
    } finally {
      setJoiningClub(null);
      delete joiningRef.current[clubId];
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchAllClubs(),
      fetchMyJoinedClubs(),
      new Promise(resolve => setTimeout(resolve, 600)),
    ]).finally(() => setRefreshing(false));
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.cream }} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.cream} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2E7D32']}
            tintColor="#2E7D32"
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={T.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Browse Clubs</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ── All clubs in 2-column grid ── */}
        {allClubs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialIcons name="groups" size={48} color={T.textMuted + '40'} />
            <Text style={styles.emptyText}>No clubs available</Text>
          </View>
        ) : (
          <View style={styles.clubGrid}>
            {allClubs.map(club => {
              const memberEntry = myJoinedClubs.find(m => m.club_id === club.club_id);
              const memberStatus = memberEntry ? (memberEntry.status || memberEntry.Status || '').toLowerCase() : null;
              const isJoined = memberStatus === 'active';
              const isPending = memberStatus === 'pending';
              return (
                <TouchableOpacity
                  key={club.club_id}
                  style={styles.clubCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (isJoined) {
                      navigation.navigate('ClubDetailScreen', { clubId: club.club_id, clubName: club.club_name });
                    } else {
                      performJoinClub(club.club_id);
                    }
                  }}
                  disabled={joiningClub === club.club_id}
                >
                  <View style={[styles.clubCardAccent, { backgroundColor: isJoined ? T.mint : T.coral }]} />
                  <View style={styles.clubCardBody}>
                    <View style={[styles.clubCardIcon, { backgroundColor: isJoined ? T.mint + '22' : T.coral + '22' }]}>
                      <MaterialIcons name="groups" size={22} color={isJoined ? T.mint : T.coral} />
                    </View>
                    <Text style={styles.clubCardName} numberOfLines={1}>{club.club_name}</Text>
                    <Text style={styles.clubCardMeta}>{club.member_count || 0} members</Text>
                    <View style={styles.clubCardAction}>
                      {joiningClub === club.club_id ? (
                        <View style={styles.joiningBadgeRow}>
                          <ActivityIndicator size="small" color={T.gold} />
                          <Text style={styles.joiningText}>Joining...</Text>
                        </View>
                      ) : isJoined ? (
                        <View style={styles.joinedBadge}>
                          <MaterialIcons name="check-circle" size={12} color={T.mint} />
                          <Text style={styles.joinedBadgeText}>Joined</Text>
                        </View>
                      ) : isPending ? (
                        <View style={styles.pendingBadge}>
                          <MaterialIcons name="hourglass-empty" size={12} color="#FF9800" />
                          <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                      ) : (
                        <View style={styles.joinBadge}>
                          <MaterialIcons name="add" size={12} color={T.white} />
                          <Text style={styles.joinBadgeText}>Join</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingHorizontal: 16, paddingBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18, fontFamily: 'DMSans_700Bold', color: T.text,
  },

  // 2-column grid
  clubGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  clubCard: {
    width: '48%',
    backgroundColor: T.white, borderRadius: 16, overflow: 'hidden',
    marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  clubCardAccent: { height: 3 },
  clubCardBody: { alignItems: 'center', padding: 14 },
  clubCardIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  clubCardName: {
    fontSize: 13, fontFamily: 'DMSans_700Bold', color: T.text, textAlign: 'center',
  },
  clubCardMeta: {
    fontSize: 11, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 2, textAlign: 'center',
  },
  clubCardAction: { marginTop: 8 },

  joiningBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.gold + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  joiningText: {
    fontSize: 10, fontFamily: 'DMSans_500Medium', color: T.gold,
  },
  joinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: T.coral, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  joinBadgeText: {
    fontSize: 10, fontFamily: 'DMSans_700Bold', color: T.white,
  },
  joinedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: T.mint + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  joinedBadgeText: {
    fontSize: 10, fontFamily: 'DMSans_700Bold', color: T.mint,
  },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 10, fontFamily: 'DMSans_700Bold', color: '#FF9800',
  },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 48,
  },
  emptyText: {
    fontSize: 13, fontFamily: 'DMSans_400Regular',
    color: T.textMuted, marginTop: 10,
  },
});

export default BrowseClubsFull;
