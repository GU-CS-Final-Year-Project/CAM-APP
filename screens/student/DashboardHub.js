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

const DashboardHub = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [myJoinedClubs, setMyJoinedClubs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMyJoinedClubs();
  }, []);

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
          <Text style={styles.headerTitle}>Categories</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* ── Browse Clubs nav card ── */}
        <TouchableOpacity
          style={styles.navCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('BrowseClubsFull')}
        >
          <View style={[styles.cardAccentStrip, { backgroundColor: T.gold }]} />
          <View style={styles.navCardInner}>
            <View style={styles.navCardLeft}>
              <View style={[styles.navIconWrap, { backgroundColor: T.gold + '20' }]}>
                <MaterialIcons name="explore" size={22} color={T.gold} />
              </View>
              <View style={styles.navCardInfo}>
                <Text style={styles.navCardTitle}>Browse Clubs</Text>
                <Text style={styles.navCardSub}>Explore categories & clubs</Text>
              </View>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={T.textMuted} />
          </View>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* ── My Clubs nav card ── */}
        <TouchableOpacity
          style={styles.navCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('MyClubsFull')}
        >
          <View style={[styles.cardAccentStrip, { backgroundColor: T.coral }]} />
          <View style={styles.navCardInner}>
            <View style={styles.navCardLeft}>
              <View style={[styles.navIconWrap, { backgroundColor: T.coral + '20' }]}>
                <MaterialIcons name="bookmark" size={22} color={T.coral} />
              </View>
              <View style={styles.navCardInfo}>
                <Text style={styles.navCardTitle}>My Clubs</Text>
                <Text style={styles.navCardSub}>Clubs, members & activities</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.featureBadge, { borderColor: T.coral + '30', backgroundColor: T.coral + '18' }]}>
                <Text style={[styles.featureBadgeText, { color: T.coral }]}>{myJoinedClubs.length}</Text>
              </View>
              <MaterialIcons name="arrow-forward" size={20} color={T.textMuted} />
            </View>
          </View>
        </TouchableOpacity>

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

  navCard: {
    backgroundColor: T.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    width: '100%',
  },
  cardAccentStrip: { height: 4, width: '100%' },
  navCardInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  navCardLeft: {
    flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1,
  },
  navIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  navCardInfo: { flex: 1 },
  navCardTitle: {
    fontSize: 15, fontFamily: 'DMSans_700Bold', color: T.text, marginBottom: 2,
  },
  navCardSub: {
    fontSize: 11, fontFamily: 'DMSans_400Regular', color: T.textMuted,
  },

  featureBadge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  featureBadgeText: { fontSize: 11, fontFamily: 'DMSans_700Bold' },

  browseCardSeeAll: {
    fontSize: 12, fontFamily: 'DMSans_500Medium', color: T.gold,
  },
  browseSeeAllBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 4,
    paddingVertical: 8, marginTop: 8,
    backgroundColor: T.gold + '0A', borderRadius: 8,
  },
  divider: {
    height: 1, backgroundColor: T.surfaceAlt, marginVertical: 16,
  },
});

export default DashboardHub;
