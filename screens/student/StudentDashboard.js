import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
  Animated,
  StatusBar,
  RefreshControl,
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
import { useAlert } from '../../components/CustomAlert';

const { width } = Dimensions.get('window');

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

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const StudentDashboard = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [userInfo, setUserInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [myClubsCount, setMyClubsCount] = useState(0);
  const [upcomingActivities, setUpcomingActivities] = useState(0);
  const [totalClubs, setTotalClubs] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [joinedClubs, setJoinedClubs] = useState([]);
  const [clubActivities, setClubActivities] = useState([]);
  const [userData, setUserData] = useState(null);
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [todayEventsCount, setTodayEventsCount] = useState(0);
  const alertedEvents = useRef(new Set());
  const bellAnim = useRef(new Animated.Value(1)).current;

  const headerAnim = useRef(new Animated.Value(0)).current;
  const { showAlert } = useAlert();

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadUserInfo();
    fetchAllData();
  }, []);

  useEffect(() => {
    if (joinedClubs.length > 0) {
      fetchClubActivities();
    }
    fetchClubAnnouncements();
  }, [joinedClubs]);

  useEffect(() => {
    if (todayEventsCount > 0) {
      const pulse = Animated.sequence([
        Animated.timing(bellAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
        Animated.timing(bellAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]);
      const loop = Animated.loop(pulse);
      loop.start();
      return () => loop.stop();
    } else {
      bellAnim.setValue(1);
    }
  }, [todayEventsCount]);

  const loadUserInfo = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user');
      if (userDataStr) {
        const parsed = JSON.parse(userDataStr);
        setUserData(parsed);
        setUserInfo(parsed);
      }
    } catch (e) {}
  };

  const fetchAllData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) return;
      const user = JSON.parse(storedUser);
      const studentId = user.user_id;

      const [clubsRes, membersRes] = await Promise.all([
        fetch('http://192.168.43.107/cam/clubs.php?action=get'),
        fetch(`http://192.168.43.107/cam/club_members.php?action=get_by_student&student_id=${studentId}`),
      ]);

      const clubs = await clubsRes.json();
      const members = await membersRes.json();

      if (clubs.success && clubs.data) {
        setTotalClubs(clubs.data.length);

        const memberships = {};
        const joined = [];
        if (members.success && members.data) {
          members.data.forEach(m => {
            const status = (m.status || m.Status || '').toLowerCase();
            memberships[m.club_id] = status;
          });

          const activeMemberships = members.data.filter(m => (m.status || m.Status || '').toLowerCase() === 'active');
          setMyClubsCount(activeMemberships.length);

          const joinedIds = new Set(activeMemberships.map(m => m.club_id));
          joinedIds.forEach(id => {
            const club = clubs.data.find(c => c.club_id === id);
            if (club) joined.push({ ...club, member_count: club.member_count || 0 });
          });
        }

        setJoinedClubs(joined);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    }
  };

  const fetchClubActivities = async () => {
    try {
      const results = await Promise.all(
        joinedClubs.map(club =>
          fetch(`http://192.168.43.107/cam/activities.php?action=get_by_club&club_id=${club.club_id}`)
            .then(r => r.json())
            .then(data => ({
              clubId: club.club_id,
              clubName: club.club_name,
              activities: data.success ? (data.data || []) : [],
            }))
        )
      );
      setClubActivities(results);
      const totalUpcoming = results.reduce((sum, c) =>
        sum + (c.activities || []).length, 0
      );
      setUpcomingActivities(totalUpcoming);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 86400000);
      const allTodayEvents = [];
      const newTodayEvents = [];
      results.forEach(club => {
        (club.activities || []).forEach(act => {
          if (act.StartDateTime) {
            const d = new Date(act.StartDateTime);
            if (d >= todayStart && d < todayEnd) {
              allTodayEvents.push({ ...act, clubName: club.clubName });
              const id = `${act.ActivityID || act.ActivityName}-${club.clubId}`;
              if (!alertedEvents.current.has(id)) {
                newTodayEvents.push({ ...act, clubName: club.clubName });
                alertedEvents.current.add(id);
              }
            }
          }
        });
      });
      setTodayEventsCount(allTodayEvents.length);
      if (newTodayEvents.length > 0) {
        const names = newTodayEvents.map(e => `• ${e.ActivityName} (${e.clubName})`).join('\n');
        showAlert({
          type: 'success',
          title: '🔔 Events Today!',
          message: `You have ${newTodayEvents.length} event(s) today:\n\n${names}`
        });
      }
    } catch (e) {
      console.error('Error fetching club activities:', e);
    }
  };

  const fetchClubAnnouncements = async () => {
    try {
      const [annoRes] = await Promise.all([
        fetch('http://192.168.43.107/cam/announcements.php?action=get_published'),
      ]);
      const anno = await annoRes.json();
      if (anno.success && anno.data) {
        const myClubIds = joinedClubs.map(c => c.club_id);
        const myAnnouncements = anno.data.filter(a => !a.club_id || myClubIds.includes(a.club_id));
        setNotificationsCount(myAnnouncements.length);
      } else {
        setNotificationsCount(0);
      }
    } catch (e) {
      setNotificationsCount(0);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      loadUserInfo(),
      fetchAllData(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const handleLogout = async () => {
    await AsyncStorage.clear().catch(() => {});
    navigation.replace('Login');
  };

  // Calendar helpers
  const getEventsMap = () => {
    const map = {};
    clubActivities.forEach(club => {
      (club.activities || []).forEach(act => {
        const actStatus = (act.Status || act.status || '').toLowerCase();
        if (actStatus === 'rejected') return;
        if (act.StartDateTime) {
          const d = new Date(act.StartDateTime);
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          if (!map[key]) map[key] = [];
          map[key].push({ ...act, clubName: club.clubName, clubId: club.clubId });
        }
      });
    });
    return map;
  };
  const eventsMap = getEventsMap();
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.navy }} />;

  const firstName = userInfo?.user_name?.split(' ')[0] || 'Student';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2E7D32']}
            tintColor="#2E7D32"
          />
        }
      >
        {/* ── Hero header ── */}
        <Animated.View style={[styles.hero, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
          <View style={styles.deco1} />
          <View style={styles.deco2} />

          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.heroProfile}
              onPress={() => navigation.navigate('ProfileTab')}
              activeOpacity={0.75}
            >
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase()}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.heroAppTag}>CAM Platform</Text>
                <Text style={styles.heroName}>
                  Hey, <Text style={styles.heroNameAccent}>{firstName}</Text> 👋
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={() => navigation.navigate('StudentAnnouncements')}
              >
                <MaterialIcons name="notifications-none" size={22} color={T.white} />
                {notificationsCount > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>{notificationsCount > 9 ? '9+' : notificationsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroIconBtn} onPress={handleLogout}>
                <MaterialIcons name="logout" size={22} color={T.coralSoft} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.heroTagline}>Your campus, your clubs.</Text>

          <View style={styles.heroPillRow}>
            {[
              { val: myClubsCount,        label: 'Joined' },
              { val: upcomingActivities,  label: 'Events' },
              { val: totalClubs,          label: 'Clubs'  },
            ].map(({ val, label }) => (
              <View key={label} style={styles.heroPill}>
                <Text style={styles.heroPillVal}>{val}</Text>
                <Text style={styles.heroPillLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Discover Clubs Button ── */}
        <TouchableOpacity
          style={styles.discoverBtn}
          onPress={() => navigation.navigate('BrowseClubsFull')}
          activeOpacity={0.85}
        >
          <View style={styles.discoverBtnIcon}>
            <MaterialIcons name="explore" size={22} color={T.white} />
          </View>
          <View style={styles.discoverBtnTextWrap}>
            <Text style={styles.discoverBtnLabel}>Discover Clubs</Text>
            <Text style={styles.discoverBtnSub}>{totalClubs} clubs available on campus</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={20} color={T.white} />
        </TouchableOpacity>

        {/* ── My Joined Clubs (2 columns) ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MY CLUBS</Text>
          <View style={styles.sectionLine} />
        </View>

        {joinedClubs.length === 0 ? (
          <View style={styles.noClubsCard}>
            <MaterialIcons name="groups" size={40} color={T.textMuted + '40'} />
            <Text style={styles.noClubsText}>You haven't joined any clubs yet</Text>
          </View>
        ) : (
          <View style={styles.clubGrid}>
            {joinedClubs.slice(0, 6).map(club => (
              <TouchableOpacity
                key={club.club_id}
                style={styles.clubCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ClubDetailScreen', { clubId: club.club_id, clubName: club.club_name })}
              >
                <View style={[styles.clubCardAccent, { backgroundColor: T.mint }]} />
                <View style={styles.clubCardBody}>
                  <View style={[styles.clubCardIcon, { backgroundColor: T.mint + '22' }]}>
                    <MaterialIcons name="groups" size={22} color={T.mint} />
                  </View>
                  <Text style={styles.clubCardName} numberOfLines={1}>{club.club_name}</Text>
                  <Text style={styles.clubCardMeta}>{club.member_count || 0} members</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Section label ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick access</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* ── Calendar ── */}
        <View style={styles.cardsGrid}>
          <TouchableOpacity
            style={styles.calendarCard}
            activeOpacity={0.9}
            onPress={() => setCalendarExpanded(!calendarExpanded)}
          >
            <View style={[styles.cardAccentStrip, { backgroundColor: T.lavender }]} />
            <View style={styles.featureCardInner}>
              <View style={styles.featureCardTop}>
                <View style={[styles.featureIconWrap, { backgroundColor: T.lavender + '20' }]}>
                  <MaterialIcons name="calendar-today" size={22} color={T.lavender} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {todayEventsCount > 0 && (
                    <Animated.View style={{ transform: [{ scale: bellAnim }], position: 'relative', marginRight: 2 }}>
                      <MaterialIcons name="notifications-active" size={22} color={T.coral} />
                      <View style={styles.alarmCountBadge}>
                        <Text style={styles.alarmCountText}>{todayEventsCount}</Text>
                      </View>
                    </Animated.View>
                  )}
                  <MaterialIcons
                    name={calendarExpanded ? 'expand-less' : 'expand-more'}
                    size={20}
                    color={T.textMuted}
                  />
                </View>
              </View>
              <Text style={styles.featureTitle}>Calendar</Text>
              <Text style={styles.featureSubtitle}>Monthly events view</Text>

              {calendarExpanded && (
                <View style={styles.calendarContainer}>
                  <View style={styles.calHeader}>
                    <TouchableOpacity onPress={() => {
                      setCalendarDate(new Date(calYear, calMonth - 1, 1));
                      setCalendarSelectedDate(null);
                    }}>
                      <MaterialIcons name="chevron-left" size={24} color={T.navy} />
                    </TouchableOpacity>
                    <Text style={styles.calMonthText}>{MONTHS[calMonth]} {calYear}</Text>
                    <TouchableOpacity onPress={() => {
                      setCalendarDate(new Date(calYear, calMonth + 1, 1));
                      setCalendarSelectedDate(null);
                    }}>
                      <MaterialIcons name="chevron-right" size={24} color={T.navy} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.calDayHeaders}>
                    {DAYS.map(d => (
                      <Text key={d} style={styles.calDayHeaderText}>{d}</Text>
                    ))}
                  </View>
                  <View style={styles.calGrid}>
                    {[...Array(firstDayOfWeek)].map((_, i) => (
                      <View key={`e${i}`} style={styles.calDayCell} />
                    ))}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                      const hasEvents = !!(eventsMap[key] && eventsMap[key].length);
                      const isSelected = calendarSelectedDate === key;
                      const isToday = key === new Date().toISOString().split('T')[0];
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.calDayCell,
                            isSelected && styles.calDaySelected,
                            isToday && styles.calDayToday,
                          ]}
                          onPress={() => setCalendarSelectedDate(isSelected ? null : key)}
                          activeOpacity={0.6}
                        >
                          <Text style={[
                            styles.calDayText,
                            isSelected && styles.calDayTextSelected,
                            isToday && styles.calDayTextToday,
                          ]}>
                            {day}
                          </Text>
                          {hasEvents && <View style={styles.calDot} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {(() => {
                    const todayKey = new Date().toISOString().split('T')[0];
                    const todayEvts = eventsMap[todayKey];
                    if (!todayEvts || todayEvts.length === 0) return null;
                    return (
                      <View style={[styles.calEventsList, calendarSelectedDate && todayKey !== calendarSelectedDate && { opacity: 0.5 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 4 }}>
                          <MaterialIcons name="notifications-active" size={14} color={T.coral} />
                          <Text style={[styles.calEventsTitle, { marginBottom: 0, paddingHorizontal: 0, flex: 1 }]}>
                            Today's Events
                          </Text>
                          <Text style={{ fontSize: 10, fontFamily: 'DMSans_500Medium', color: T.textMuted }}>
                            {todayEvts.length} event{todayEvts.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                        {todayEvts.map((evt, idx) => (
                          <TouchableOpacity
                            key={evt.ActivityID || idx}
                            style={styles.calEventItem}
                            onPress={() => navigation.navigate('ClubDetailScreen', { clubId: evt.clubId, clubName: evt.clubName })}
                            activeOpacity={0.6}
                          >
                            <View style={[styles.calEventDot, { backgroundColor: T.coral }]} />
                            <View style={styles.calEventInfo}>
                              <Text style={styles.calEventName}>{evt.ActivityName}</Text>
                              <Text style={styles.calEventClub}>{evt.clubName}</Text>
                            </View>
                            <Text style={styles.calEventTime}>
                              {new Date(evt.StartDateTime).toLocaleTimeString('en-US', {
                                hour: 'numeric', minute: '2-digit'
                              })}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })()}
                  {calendarSelectedDate && eventsMap[calendarSelectedDate] && (
                    <View style={styles.calEventsList}>
                      <Text style={styles.calEventsTitle}>
                        {new Date(calendarSelectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long', month: 'short', day: 'numeric'
                        })}
                      </Text>
                      {eventsMap[calendarSelectedDate].map((evt, idx) => (
                        <TouchableOpacity
                          key={evt.ActivityID || idx}
                          style={styles.calEventItem}
                          onPress={() => navigation.navigate('ClubDetailScreen', { clubId: evt.clubId, clubName: evt.clubName })}
                          activeOpacity={0.6}
                        >
                          <View style={styles.calEventDot} />
                          <View style={styles.calEventInfo}>
                            <Text style={styles.calEventName}>{evt.ActivityName}</Text>
                            <Text style={styles.calEventClub}>{evt.clubName}</Text>
                          </View>
                          <Text style={styles.calEventTime}>
                            {new Date(evt.StartDateTime).toLocaleTimeString('en-US', {
                              hour: 'numeric', minute: '2-digit'
                            })}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>



        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const CARD_GAP = 12;

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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  heroProfile: { flexDirection: 'row', alignItems: 'center' },
  avatarRing: {
    width: 46, height: 46, borderRadius: 23,
    borderWidth: 2, borderColor: T.coral + '80',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: T.coral,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial: {
    color: T.white, fontSize: 17, fontFamily: 'DMSans_700Bold',
  },
  heroAppTag: {
    fontSize: 10, color: T.coralSoft,
    fontFamily: 'DMSans_500Medium', letterSpacing: 1.2, textTransform: 'uppercase',
  },
  heroName: {
    fontSize: 18, color: T.white,
    fontFamily: 'DMSans_400Regular', marginTop: 1,
  },
  heroNameAccent: {
    fontFamily: 'DMSans_700Bold', color: T.white,
  },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8, position: 'relative',
  },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: T.coral,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: T.navy,
  },
  notifDotText: { color: T.white, fontSize: 9, fontFamily: 'DMSans_700Bold' },

  heroTagline: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 26, color: T.white,
    lineHeight: 32, marginBottom: 20,
  },

  heroPillRow: {
    flexDirection: 'row', gap: 10,
  },
  heroPill: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.09)',
    borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  heroPillVal: {
    fontSize: 22, fontFamily: 'DMSans_700Bold', color: T.white,
  },
  heroPillLabel: {
    fontSize: 10, color: 'rgba(255,255,255,0.55)',
    fontFamily: 'DMSans_500Medium', marginTop: 2,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 12, gap: 10,
  },
  sectionTitle: {
    fontSize: 12, fontFamily: 'DMSans_700Bold',
    color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1.2,
  },
  sectionLine: {
    flex: 1, height: 1, backgroundColor: T.surfaceAlt,
  },


  // Club grid (2 columns)
  clubGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginBottom: 16,
  },
  clubCard: {
    width: '48%',
    backgroundColor: T.white, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  clubCardAccent: {
    height: 3,
  },
  clubCardBody: {
    alignItems: 'center', padding: 14,
  },
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
  // No clubs
  noClubsCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  noClubsText: {
    fontSize: 13, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 10,
  },

  // Feature cards
  cardsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: CARD_GAP, marginBottom: 16,
  },
  cardAccentStrip: {
    height: 4, width: '100%',
  },
  featureCardInner: {
    padding: 16, minHeight: 150,
  },
  featureCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  featureTitle: {
    fontSize: 15, fontFamily: 'DMSans_700Bold',
    color: T.text, marginBottom: 3,
  },
  featureSubtitle: {
    fontSize: 11, fontFamily: 'DMSans_400Regular',
    color: T.textMuted, lineHeight: 15, marginBottom: 14,
  },

  // Discover Clubs Button
  discoverBtn: {
    backgroundColor: T.mint, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center',
    gap: 14, marginBottom: 16,
    shadowColor: T.mint, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  discoverBtnIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  discoverBtnTextWrap: {
    flex: 1,
  },
  discoverBtnLabel: {
    fontSize: 15, fontFamily: 'DMSans_700Bold', color: T.white,
  },
  discoverBtnSub: {
    fontSize: 11, fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.8)', marginTop: 1,
  },

  // Calendar card
  calendarCard: {
    backgroundColor: T.white, borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    width: '100%',
  },
  calendarContainer: {
    marginTop: 4, borderTopWidth: 1, borderTopColor: T.surfaceAlt,
    paddingTop: 10,
  },
  calHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 4, marginBottom: 10,
  },
  calMonthText: {
    fontSize: 15, fontFamily: 'DMSans_700Bold', color: T.navy,
  },
  calDayHeaders: {
    flexDirection: 'row', marginBottom: 4,
  },
  calDayHeaderText: {
    flex: 1, textAlign: 'center',
    fontSize: 10, fontFamily: 'DMSans_700Bold',
    color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
    paddingVertical: 4,
  },
  calGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
  },
  calDayCell: {
    width: '14.28%', aspectRatio: 1,
    justifyContent: 'center', alignItems: 'center',
    paddingVertical: 2,
  },
  calDayText: {
    fontSize: 13, fontFamily: 'DMSans_500Medium',
    color: T.text,
  },
  calDayToday: {
    borderWidth: 1.5, borderColor: T.navy + '40',
    borderRadius: 20, width: 30, height: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  calDayTextToday: {
    color: T.navy, fontFamily: 'DMSans_700Bold',
  },
  calDaySelected: {
    backgroundColor: T.lavender,
    borderRadius: 20, width: 30, height: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  calDayTextSelected: {
    color: T.white, fontFamily: 'DMSans_700Bold',
  },
  calDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: T.coral,
    position: 'absolute', bottom: 4,
  },
  calEventsList: {
    marginTop: 8, borderTopWidth: 1, borderTopColor: T.surfaceAlt,
    paddingTop: 8,
  },
  calEventsTitle: {
    fontSize: 12, fontFamily: 'DMSans_700Bold',
    color: T.navy, marginBottom: 8, paddingHorizontal: 4,
  },
  calEventItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: T.surfaceAlt,
  },
  calEventDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: T.lavender, marginRight: 10,
  },
  calEventInfo: {
    flex: 1,
  },
  calEventName: {
    fontSize: 13, fontFamily: 'DMSans_500Medium',
    color: T.text,
  },
  calEventClub: {
    fontSize: 10, fontFamily: 'DMSans_400Regular',
    color: T.textMuted, marginTop: 1,
  },
  calEventTime: {
    fontSize: 11, fontFamily: 'DMSans_500Medium',
    color: T.textMuted,
  },
  alarmCountBadge: {
    position: 'absolute', top: -4, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: T.coral,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: T.white,
  },
  alarmCountText: {
    color: T.white, fontSize: 9, fontFamily: 'DMSans_700Bold',
  },
});

export default StudentDashboard;
