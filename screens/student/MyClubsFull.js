import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';

const T = {
  navy:     '#0D1B2A',
  navyMid:  '#162436',
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

const MyClubsFull = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [myJoinedClubs, setMyJoinedClubs] = useState([]);
  const [clubActivities, setClubActivities] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchMyJoinedClubs();
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

          // Check for newly approved memberships
          try {
            const cachedStatuses = await AsyncStorage.getItem('membershipStatusesFull');
            const previous = cachedStatuses ? JSON.parse(cachedStatuses) : {};
            const current = {};
            const approvedClubs = [];
            result.data.forEach(club => {
              const status = club.status || club.Status || 'active';
              current[club.club_id] = status;
              const prevStatus = previous[club.club_id];
              if ((prevStatus === 'pending' || prevStatus === 'Pending') && (status === 'active')) {
                approvedClubs.push(club.club_name);
              }
            });
            await AsyncStorage.setItem('membershipStatusesFull', JSON.stringify(current));
            if (approvedClubs.length > 0) {
              setTimeout(() => {
                alert(`🎉 Your membership in ${approvedClubs.join(', ')} has been approved!`);
              }, 500);
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (myJoinedClubs.length > 0) fetchClubActivities();
  }, [myJoinedClubs]);

  const fetchClubActivities = async () => {
    try {
      const results = await Promise.all(
        myJoinedClubs.map(club =>
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
    } catch (e) {}
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
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
          <Text style={styles.headerTitle}>My Clubs</Text>
          <View style={{ width: 24 }} />
        </View>

        {myJoinedClubs.length === 0 ? (
          <Text style={styles.emptyText}>No clubs joined yet</Text>
        ) : (
          myJoinedClubs.map(club => {
                  const clubAct = clubActivities.find(c => c.clubId === club.club_id);
                  const acts = clubAct ? clubAct.activities || [] : [];
                  const upcoming = acts.filter(a => new Date(a.StartDateTime) > new Date());
                  return (
              <View key={club.club_id || club.id} style={styles.myClubSection}>
                <TouchableOpacity
                  style={styles.myClubHeader}
                  onPress={() => navigation.navigate('ClubActivities', { clubId: club.club_id, clubName: club.club_name })}
                  activeOpacity={0.6}
                >
                  <MaterialIcons name="group" size={18} color={T.coral} />
                  <Text style={styles.myClubName} numberOfLines={1}>{club.club_name}</Text>
                  <MaterialIcons name="chevron-right" size={18} color={T.textMuted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.myClubSubLink}
                  onPress={() => navigation.navigate('ClubMembers', { clubId: club.club_id, clubName: club.club_name })}
                  activeOpacity={0.6}
                >
                  <MaterialIcons name="people" size={14} color={T.lavender} />
                  <Text style={styles.myClubSubLinkText}>View members</Text>
                  <MaterialIcons name="chevron-right" size={14} color={T.textMuted} />
                </TouchableOpacity>

                {upcoming.length === 0 ? (
                  <Text style={styles.emptyItemText}>No upcoming activities</Text>
                ) : upcoming.length === 1 ? (
                  <Text style={styles.activityItemText}>There is an upcoming activity</Text>
                ) : (
                  <Text style={styles.activityItemText}>There are {upcoming.length} upcoming activities</Text>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: 16, paddingBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18, fontFamily: 'DMSans_700Bold', color: T.navy,
  },
  emptyText: {
    fontSize: 12, fontFamily: 'DMSans_400Regular',
    color: T.textMuted, fontStyle: 'italic', marginTop: 4,
  },
  myClubSection: {
    marginBottom: 6, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: T.surfaceAlt,
  },
  myClubHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4, gap: 8,
  },
  myClubName: {
    flex: 1, fontSize: 14, fontFamily: 'DMSans_700Bold', color: T.navy,
  },
  myClubSubLink: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 4, paddingHorizontal: 4, paddingLeft: 30, gap: 6, marginBottom: 2,
  },
  myClubSubLinkText: {
    fontSize: 12, fontFamily: 'DMSans_500Medium', color: T.lavender, flex: 1,
  },
  emptyItemText: {
    fontSize: 11, fontFamily: 'DMSans_400Regular',
    color: T.textMuted, fontStyle: 'italic', paddingLeft: 28, paddingBottom: 4,
  },
  activityItemText: {
    fontSize: 12, fontFamily: 'DMSans_500Medium',
    color: T.mint, paddingLeft: 28, paddingVertical: 6,
  },
  activityItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 4, paddingLeft: 28,
  },
  activityDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: T.mint, marginRight: 8,
  },
  activityName: {
    flex: 1, fontSize: 12, fontFamily: 'DMSans_500Medium', color: T.text,
  },
  activityDate: {
    fontSize: 10, fontFamily: 'DMSans_400Regular', color: T.textMuted,
  },
  activitiesMore: {
    fontSize: 11, fontFamily: 'DMSans_500Medium',
    color: T.mint, paddingLeft: 28, paddingTop: 2,
  },
});

export default MyClubsFull;
