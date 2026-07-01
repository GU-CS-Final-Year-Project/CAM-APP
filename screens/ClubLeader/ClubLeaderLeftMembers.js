import React, { useState, useEffect } from 'react';
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

const ClubLeaderLeftMembers = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const [leftList, setLeftList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLeftMembers();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchLeftMembers();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchLeftMembers = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (!userData) return;
      const currentUser = JSON.parse(userData);

      const [clubsRes, leftRes] = await Promise.all([
        fetch('http://192.168.43.107/cam/clubs.php?action=get'),
        fetch('http://192.168.43.107/cam/club_members.php?action=get_left_members'),
      ]);
      const clubsData = await clubsRes.json();
      const leftData = await leftRes.json();

      if (clubsData.success && leftData.success) {
        const myClubIds = (clubsData.data || [])
          .filter(club => club.patron === currentUser?.user_name || club.created_by === currentUser?.user_id)
          .map(c => c.club_id);

        const left = (leftData.data || []).filter(m => myClubIds.includes(m.club_id) && m.reason && !m.reason.toLowerCase().includes('removed by admin'));
        setLeftList(left);
      }
    } catch (e) {
      console.error('Error fetching left members:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeftMembers();
    setRefreshing(false);
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.cream }} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.cream} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Members Left</Text>
          <Text style={styles.headerSub}>Students who left your clubs</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.navy} />
        </View>
      ) : leftList.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="exit-to-app" size={48} color={T.textMuted + '50'} />
          <Text style={styles.emptyText}>No members have left</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.navy]} tintColor={T.navy} />
          }
        >
          {leftList.map((m, idx) => {
            const name = m.student_name || m.StudentName || m.name || 'Unknown';
            return (
              <View key={m.membership_id || m.id || idx} style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{name[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                  {m.club_name && <Text style={styles.memberClub}>{m.club_name}</Text>}
                  {m.reason && (
                    <View style={styles.reasonRow}>
                      <MaterialIcons name="info-outline" size={13} color={T.textMuted} />
                      <Text style={styles.reasonText} numberOfLines={2}>{m.reason}</Text>
                    </View>
                  )}
                </View>
                <MaterialIcons name="exit-to-app" size={18} color={T.coral} />
              </View>
            );
          })}
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
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: T.white,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  headerTitles: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: T.text },
  headerSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 10 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4 },
  memberCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.white, borderRadius: 14,
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  memberAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: T.coral + '22',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  memberAvatarText: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: T.coral },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: T.text },
  memberClub: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  reasonText: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: T.textMuted, flex: 1, lineHeight: 15 },
});

export default ClubLeaderLeftMembers;
