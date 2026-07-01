import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

const AdminClubDetail = ({ navigation, route }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const { clubId, clubName } = route.params || {};
  const [clubData, setClubData] = useState(null);

  useEffect(() => {
    fetchClubDetails();
  }, [clubId]);

  const fetchClubDetails = async () => {
    try {
      const res = await fetch(`http://192.168.43.107/cam/clubs.php?action=get`);
      const data = await res.json();
      if (data.success && data.data) {
        const club = data.data.find(c => c.club_id === clubId);
        if (club) setClubData(club);
      }
    } catch (e) {}
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.cream }} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.cream} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={T.navy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{clubName || 'Club'}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Club Info Card */}
        <View style={styles.infoCard}>
          <View style={[styles.infoCardAccent, { backgroundColor: T.lavender }]} />
          <View style={styles.infoCardBody}>
            <View style={[styles.infoIconWrap, { backgroundColor: T.lavender + '22' }]}>
              <MaterialIcons name="groups" size={32} color={T.lavender} />
            </View>
            <Text style={styles.infoName}>{clubName}</Text>
            <Text style={styles.infoMeta}>{clubData?.member_count || 0} members</Text>
            {clubData?.patron ? (
              <Text style={styles.infoPatron}>Patron: {clubData.patron}</Text>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <Text style={styles.sectionLabel}>Manage Club</Text>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ActsTab', { screen: 'ManageActivities', params: { clubId, clubName } })}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: T.mint + '22' }]}>
            <MaterialIcons name="event" size={28} color={T.mint} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionLabel}>Activities</Text>
            <Text style={styles.actionDesc}>View, add, edit or delete activities for this club</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={T.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ManageAnnouncements', { clubId, clubName })}
        >
          <View style={[styles.actionIconWrap, { backgroundColor: T.gold + '22' }]}>
            <MaterialIcons name="campaign" size={28} color={T.gold} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionLabel}>Announcements</Text>
            <Text style={styles.actionDesc}>Create and manage announcements for this club</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={T.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.cream },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerTitle: {
    flex: 1, fontSize: 18, fontFamily: 'DMSans_700Bold',
    color: T.text, textAlign: 'center', marginHorizontal: 12,
  },

  // Info card
  infoCard: {
    backgroundColor: T.white, borderRadius: 20, overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  infoCardAccent: { height: 4 },
  infoCardBody: { alignItems: 'center', padding: 24 },
  infoIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  infoName: {
    fontSize: 20, fontFamily: 'DMSans_700Bold', color: T.text, textAlign: 'center',
  },
  infoMeta: {
    fontSize: 13, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 4,
  },
  infoPatron: {
    fontSize: 11, fontFamily: 'DMSans_500Medium', color: T.textMuted, marginTop: 2,
  },

  // Section
  sectionLabel: {
    fontSize: 12, fontFamily: 'DMSans_700Bold',
    color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Action cards
  actionCard: {
    backgroundColor: T.white, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center',
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  actionIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  actionTextWrap: { flex: 1, marginRight: 8 },
  actionLabel: {
    fontSize: 16, fontFamily: 'DMSans_700Bold', color: T.text, marginBottom: 3,
  },
  actionDesc: {
    fontSize: 11, fontFamily: 'DMSans_400Regular', color: T.textMuted, lineHeight: 15,
  },
});

export default AdminClubDetail;
