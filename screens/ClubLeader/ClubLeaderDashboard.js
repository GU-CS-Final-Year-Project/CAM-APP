import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
  Animated,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from '@expo-google-fonts/dm-sans';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  DMSerifDisplay_400Regular,
} from '@expo-google-fonts/dm-serif-display';

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



const ClubLeaderDashboard = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [userInfo, setUserInfo] = useState(null);
  const [myClubs, setMyClubs] = useState([]);
  const [myClubsCount, setMyClubsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [leftMembers, setLeftMembers] = useState([]);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadUserInfo();
    fetchDashboardStats();

    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardStats();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      const currentUser = userData ? JSON.parse(userData) : null;
      console.log('[fetchDashboardStats] currentUser:', currentUser?.user_name, 'id:', currentUser?.user_id);

      const clubsRes = await fetch(`http://192.168.43.107/cam/clubs.php?action=get`);
      const clubsData = await clubsRes.json();
      let myClubs = [];
      let myClubIds = [];
      if (clubsData.success) {
        myClubs = clubsData.data?.filter(club => club.patron === currentUser?.user_name || club.created_by === currentUser?.user_id) || [];
        myClubIds = myClubs.map(c => c.club_id);
        setMyClubs(myClubs);
        setMyClubsCount(myClubs.length);
        console.log('[fetchDashboardStats] myClubs:', myClubs.length, 'ids:', myClubIds);
      }

      if (myClubIds.length > 0) {
        const [membersRes, leftRes] = await Promise.all([
          fetch(`http://192.168.43.107/cam/club_members.php?action=get`),
          fetch(`http://192.168.43.107/cam/club_members.php?action=get_left_members`),
        ]);
        const membersData = await membersRes.json();
        const leftData = await leftRes.json();

        if (membersData.success) {
          const allMembers = membersData.data || [];

          const clubsWithExactCount = myClubs.map(club => ({
            ...club,
            member_count: allMembers.filter(m => m.club_id === club.club_id && (m.status === 'active' || m.Status === 'Active')).length,
          }));
          setMyClubs(clubsWithExactCount);

          const pending = allMembers.filter(m => {
            const s = (m.status || m.Status || '').toLowerCase();
            return myClubIds.includes(m.club_id) && (s === 'pending' || s === '');
          });
          console.log('[fetchDashboardStats] pending found:', pending.length, pending.map(m => ({id: m.membership_id, club: m.club_id, status: m.status, student: m.student_name})));

          const pendingByClub = clubsWithExactCount
            .map(club => ({
              clubId: club.club_id,
              clubName: club.club_name,
              count: pending.filter(m => m.club_id === club.club_id).length,
            }))
            .filter(c => c.count > 0);
          console.log('[fetchDashboardStats] pendingByClub:', JSON.stringify(pendingByClub));
          setPendingRequests(pendingByClub);
        }

        if (leftData.success) {
          const leftAll = (leftData.data || []).filter(m => myClubIds.includes(m.club_id) && m.reason && !m.reason.toLowerCase().includes('removed by admin'));
          console.log('[fetchDashboardStats] voluntary left members found:', leftAll.length, leftAll.map(m => ({id: m.membership_id, club: m.club_id, student: m.student_name, reason: m.reason})));
          const leftByClub = myClubs
            .map(club => ({
              clubId: club.club_id,
              clubName: club.club_name,
              count: leftAll.filter(m => m.club_id === club.club_id).length,
            }))
            .filter(c => c.count > 0);
          setLeftMembers(leftByClub);
        }
      } else {
        console.log('[fetchDashboardStats] no clubs found, clearing pending');
        setPendingRequests([]);
        setLeftMembers([]);
        console.log('[fetchDashboardStats] no clubs found, clearing pending');
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('[fetchDashboardStats] Error:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      loadUserInfo(),
      fetchDashboardStats(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const handleLogout = async () => {
    await AsyncStorage.clear().catch(() => {});
    navigation.replace('Login');
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.navy }} />;

  const firstName = userInfo?.user_name?.split(' ')[0] || 'Leader';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
      >
        {/* ── Hero header ── */}
        <Animated.View style={[styles.hero, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
          <View style={styles.deco1} />
          <View style={styles.deco2} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroProfile}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase()}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.heroAppTag}>Club Leader</Text>
                <Text style={styles.heroName}>
                  Hey, <Text style={styles.heroNameAccent}>{firstName}</Text> 👋
                </Text>
              </View>
            </View>

            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.navigate('ClubLeaderAnnouncements')}>
                <MaterialIcons name="notifications-none" size={22} color={T.white} />
                {(pendingRequests.length > 0 || leftMembers.length > 0) && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>
                      {pendingRequests.length + leftMembers.length > 9 ? '9+' : pendingRequests.length + leftMembers.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroIconBtn} onPress={handleLogout}>
                <MaterialIcons name="logout" size={22} color={T.coralSoft} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.heroTagline}>Lead your club, manage members & activities.</Text>

          <View style={styles.heroPillRow}>
            {[
              { val: myClubsCount, label: 'My Clubs' },
            ].map(({ val, label }) => (
              <View key={label} style={styles.heroPill}>
                <Text style={styles.heroPillVal}>{val}</Text>
                <Text style={styles.heroPillLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Pending Requests Banner ── */}
        {pendingRequests.length > 0 && (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerLeft}>
              <MaterialIcons name="person-add" size={22} color={T.coral} />
              <View>
                <Text style={styles.pendingBannerTitle}>Pending Requests</Text>
                <Text style={styles.pendingBannerSub}>
                  {pendingRequests.reduce((s, c) => s + c.count, 0)} student{pendingRequests.reduce((s, c) => s + c.count, 0) > 1 ? 's' : ''} want{pendingRequests.reduce((s, c) => s + c.count, 0) === 1 ? 's' : ''} to join
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.pendingBannerBtn}
              onPress={() => navigation.navigate('PendingRequestsScreen')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-forward" size={20} color={T.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Left Members Banner ── */}
        {leftMembers.length > 0 && (
          <TouchableOpacity
            style={styles.leftBanner}
            onPress={() => navigation.navigate('ClubLeaderLeftMembers')}
            activeOpacity={0.85}
          >
            <View style={styles.pendingBannerLeft}>
              <MaterialIcons name="exit-to-app" size={22} color={T.coral} />
              <View>
                <Text style={styles.leftBannerTitle}>Members Left</Text>
                <Text style={styles.leftBannerSub}>
                  {leftMembers.reduce((s, c) => s + c.count, 0)} member{leftMembers.reduce((s, c) => s + c.count, 0) > 1 ? 's' : ''} left your club{leftMembers.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.pendingBannerBtn}>
              <MaterialIcons name="arrow-forward" size={20} color={T.white} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── My Clubs ── */}
        <View style={styles.sectionLabel}>
          <Text style={styles.sectionLabelText}>MY CLUBS</Text>
          <View style={styles.sectionLabelLine} />
        </View>

        {myClubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="groups" size={48} color={T.textMuted + '40'} />
            <Text style={styles.emptyCardText}>No clubs assigned to you yet</Text>
          </View>
        ) : (
          <View style={styles.clubGrid}>
            {myClubs.map(club => (
              <TouchableOpacity
                key={club.club_id}
                style={styles.clubCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ClubTab', { screen: 'ClubManagement', params: { clubId: club.club_id } })}
              >
                <View style={[styles.clubCardAccent, { backgroundColor: T.mint }]} />
                <View style={styles.clubCardBody}>
                  <View style={[styles.clubCardIcon, { backgroundColor: T.mint + '22' }]}>
                    <MaterialIcons name="groups" size={24} color={T.mint} />
                  </View>
                  <Text style={styles.clubCardName} numberOfLines={1}>{club.club_name}</Text>
                  <Text style={styles.clubCardMeta}>
                    {club.member_count || 0} member{(club.member_count || 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Quick Access ── */}
        <View style={styles.membersCard}>
          <View style={[styles.membersCardAccent, { backgroundColor: T.mint }]} />

          <TouchableOpacity
            style={styles.dropdownToggle}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownToggleText}>Quick Access</Text>
            <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={22} color={T.textMuted} />
          </TouchableOpacity>

          {expanded && (
            <View style={styles.dropdownBody}>
              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={() => { setExpanded(false); navigation.navigate('SelectClubForMembers'); }}
              >
                <View style={[styles.dropdownIcon, { backgroundColor: T.lavender + '22' }]}>
                  <MaterialIcons name="people" size={22} color={T.lavender} />
                </View>
                <View style={styles.dropdownTextWrap}>
                  <Text style={styles.dropdownLabel}>Club Members</Text>
                  <Text style={styles.dropdownDesc}>Add, remove, and manage members</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={T.textMuted} />
              </TouchableOpacity>

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={() => { setExpanded(false); navigation.navigate('ActsTab'); }}
              >
                <View style={[styles.dropdownIcon, { backgroundColor: T.gold + '22' }]}>
                  <MaterialIcons name="event" size={22} color={T.gold} />
                </View>
                <View style={styles.dropdownTextWrap}>
                  <Text style={styles.dropdownLabel}>Activities</Text>
                  <Text style={styles.dropdownDesc}>Plan & manage club activities</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={T.textMuted} />
              </TouchableOpacity>

              <View style={styles.dropdownDivider} />

              <TouchableOpacity
                style={styles.dropdownItem}
                activeOpacity={0.7}
                onPress={() => { setExpanded(false); navigation.navigate('ProfileTab'); }}
              >
                <View style={[styles.dropdownIcon, { backgroundColor: T.lavender + '22' }]}>
                  <MaterialIcons name="person" size={22} color={T.lavender} />
                </View>
                <View style={styles.dropdownTextWrap}>
                  <Text style={styles.dropdownLabel}>My Profile</Text>
                  <Text style={styles.dropdownDesc}>View and edit your profile</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.cream,
  },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Hero
  hero: {
    backgroundColor: T.navy,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute', top: -48, right: -48,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: T.coral, opacity: 0.12,
  },
  deco2: {
    position: 'absolute', bottom: -32, left: 60,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: T.mint, opacity: 0.1,
  },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  heroProfile: {
    flexDirection: 'row', alignItems: 'center',
  },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: T.white + '30',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.coral, justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18, fontWeight: '700', color: T.white, fontFamily: 'DMSans_700Bold',
  },
  heroAppTag: {
    fontSize: 11, color: T.mint, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'DMSans_500Medium',
  },
  heroName: {
    fontSize: 22, color: T.white, marginTop: 2, fontFamily: 'DMSans_700Bold',
  },
  heroNameAccent: {
    color: T.gold,
  },
  heroActions: {
    flexDirection: 'row', gap: 8,
  },
  heroIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: T.navyMid, justifyContent: 'center', alignItems: 'center',
  },
  heroTagline: {
    fontSize: 14, color: T.white + '99', marginBottom: 16, fontFamily: 'DMSans_400Regular',
  },
  heroPillRow: {
    flexDirection: 'row', gap: 8,
  },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.navyCard, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  heroPillVal: {
    fontSize: 15, fontWeight: '700', color: T.white, fontFamily: 'DMSans_700Bold',
  },
  heroPillLabel: {
    fontSize: 12, color: T.white + '80', fontFamily: 'DMSans_400Regular',
  },

  // Members card
  membersCard: {
    backgroundColor: T.white, borderRadius: 20, overflow: 'hidden', marginTop: 8,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10 }, android: { elevation: 4 } }),
  },
  membersCardAccent: {
    height: 4,
  },
  membersCardInner: {
    padding: 20, paddingBottom: 12,
  },
  membersCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  membersCardTopLeft: {
    flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14,
  },
  membersCardTopRight: {
    alignItems: 'flex-end',
  },
  membersIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  membersBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
  },
  membersBadgeText: {
    fontSize: 14, fontWeight: '700', fontFamily: 'DMSans_700Bold',
  },
  membersTitle: {
    fontSize: 18, fontWeight: '700', color: T.text, marginBottom: 2, fontFamily: 'DMSans_700Bold',
  },
  membersSubtitle: {
    fontSize: 13, color: T.textMuted, fontFamily: 'DMSans_400Regular',
  },
  membersArrow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  membersArrowText: {
    fontSize: 13, fontWeight: '600', fontFamily: 'DMSans_500Medium', color: T.lavender,
  },

  // Dropdown
  dropdownToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: T.surfaceAlt,
  },
  dropdownToggleText: {
    fontSize: 13, fontWeight: '600', color: T.textMuted, fontFamily: 'DMSans_500Medium',
  },
  dropdownBody: {
    borderTopWidth: 1, borderTopColor: T.surfaceAlt, paddingVertical: 4,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20,
  },
  dropdownIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  dropdownTextWrap: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 15, fontWeight: '600', color: T.text, fontFamily: 'DMSans_500Medium',
  },
  dropdownDesc: {
    fontSize: 12, color: T.textMuted, marginTop: 1, fontFamily: 'DMSans_400Regular',
  },
  dropdownItemBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, marginRight: 4,
  },
  dropdownItemBadgeText: {
    fontSize: 12, fontWeight: '700', fontFamily: 'DMSans_700Bold',
  },
  dropdownDivider: {
    height: 1, backgroundColor: T.surfaceAlt, marginHorizontal: 20,
  },

  // Section label
  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10,
  },
  sectionLabelText: {
    fontSize: 12, fontFamily: 'DMSans_700Bold',
    color: T.textMuted, letterSpacing: 1.2,
  },
  sectionLabelLine: {
    flex: 1, height: 1, backgroundColor: T.surfaceAlt,
  },

  // Club grid
  clubGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  clubCard: {
    width: '48%',
    backgroundColor: T.white, borderRadius: 16, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  clubCardAccent: {
    height: 3,
  },
  clubCardBody: {
    alignItems: 'center', padding: 14,
  },
  clubCardIcon: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  clubCardName: {
    fontSize: 14, fontFamily: 'DMSans_700Bold', color: T.text, textAlign: 'center',
  },
  clubCardMeta: {
    fontSize: 11, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 2, textAlign: 'center',
  },

  // Empty card
  emptyCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  emptyCardText: {
    fontSize: 14, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 12,
  },

  // Notification dot
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: T.coral,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: T.navy,
  },
  notifDotText: { color: T.white, fontSize: 9, fontFamily: 'DMSans_700Bold' },

  // Pending banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.coral + '12',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: T.coral + '25',
  },
  pendingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: T.coral,
  },
  pendingBannerSub: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
    marginTop: 1,
  },
  pendingBannerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.coral,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Left Members banner
  leftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.coral + '12',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: T.coral + '25',
  },
  leftBannerTitle: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: T.coral,
  },
  leftBannerSub: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
    marginTop: 1,
  },
});

export default ClubLeaderDashboard;
