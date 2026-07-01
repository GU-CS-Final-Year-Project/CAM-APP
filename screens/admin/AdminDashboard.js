import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Animated, StatusBar, RefreshControl, Modal, TextInput, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
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

const AdminDashboard = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [userInfo, setUserInfo] = useState(null);
  const [totalClubs, setTotalClubs] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [allClubs, setAllClubs] = useState([]);
  const [totalSportsCategories, setTotalSportsCategories] = useState(0);
  const [totalSportsTeams, setTotalSportsTeams] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [totalActivityParticipants, setTotalActivityParticipants] = useState(0);
  const [clubsExpanded, setClubsExpanded] = useState(false);
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showClubModal, setShowClubModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ club_name: '', description: '', patron: '' });

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchDashboardStats(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    loadUserInfo();
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardStats();
    });
    return unsubscribe;
  }, [navigation]);

  const loadUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) setUserInfo(JSON.parse(userData));
    } catch (e) {}
  };

  const fetchDashboardStats = async () => {
    try {
      const [clubsRes, activitiesRes, announcementsRes, sportsCatsRes, sportsTeamsRes, matchesRes, partsRes] = await Promise.all([
        fetch('http://192.168.43.107/cam/clubs.php?action=get'),
        fetch('http://192.168.43.107/cam/activities.php?action=get'),
        fetch('http://192.168.43.107/cam/announcements.php?action=get'),
        fetch('http://192.168.43.107/cam/sportscategories.php?action=get'),
        fetch('http://192.168.43.107/cam/sportsteams.php?action=get'),
        fetch('http://192.168.43.107/cam/matches.php?action=get'),
        fetch('http://192.168.43.107/cam/activityparticipants.php?action=get'),
      ]);
      const [clubs, activities, announcements, sportsCats, sportsTeams, matches, parts] = await Promise.all([
        clubsRes.json(), activitiesRes.json(), announcementsRes.json(),
        sportsCatsRes.json(), sportsTeamsRes.json(), matchesRes.json(), partsRes.json(),
      ]);
      if (clubs.success) {
        setTotalClubs(clubs.data?.length || 0);
        setAllClubs(clubs.data || []);
      }
      if (activities.success) setTotalActivities(activities.data?.length || 0);
      if (announcements.success) setTotalAnnouncements(announcements.data?.length || 0);
      if (sportsCats.success) setTotalSportsCategories(sportsCats.data?.length || 0);
      if (sportsTeams.success) setTotalSportsTeams(sportsTeams.data?.length || 0);
      if (matches.success) setTotalMatches(matches.data?.length || 0);
      if (parts.success) setTotalActivityParticipants(parts.data?.length || 0);
    } catch (e) {
      setTotalClubs(0);
      setTotalActivities(0);
      setTotalAnnouncements(0);
    }
  };

  const handleAddClub = async () => {
    if (!formData.club_name.trim()) {
      Alert.alert('Error', 'Club name is required');
      return;
    }
    try {
      const res = await fetch('http://192.168.43.107/cam/clubs.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', club_name: formData.club_name.trim(), description: formData.description.trim(), patron: formData.patron.trim(), user_type: 'Admin' }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setFormData({ club_name: '', description: '', patron: '' });
        fetchDashboardStats();
      } else {
        Alert.alert('Error', data.message || 'Failed to add club');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleEditClub = async () => {
    if (!formData.club_name.trim() || !selectedClub) return;
    try {
      const del = await fetch('http://192.168.43.107/cam/clubs.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', club_id: selectedClub.club_id }),
      });
      const delData = await del.json();
      if (!delData.success) {
        Alert.alert('Error', delData.message || 'Failed to update club');
        return;
      }
      const add = await fetch('http://192.168.43.107/cam/clubs.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', club_name: formData.club_name.trim(), description: formData.description.trim(), patron: formData.patron.trim() }),
      });
      const addData = await add.json();
      if (addData.success) {
        setShowEditModal(false);
        setSelectedClub(null);
        setFormData({ club_name: '', description: '', patron: '' });
        fetchDashboardStats();
      } else {
        Alert.alert('Error', addData.message || 'Failed to update club');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleDeleteClub = (club) => {
    Alert.alert('Delete Club', `Are you sure you want to delete "${club.club_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          const res = await fetch('http://192.168.43.107/cam/clubs.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', club_id: club.club_id }),
          });
          const data = await res.json();
          if (data.success) {
            setShowClubModal(false);
            setSelectedClub(null);
            fetchDashboardStats();
          } else {
            Alert.alert('Error', data.message || 'Failed to delete club');
          }
        } catch (e) {
          Alert.alert('Error', 'Network error');
        }
      }},
    ]);
  };

  const openEditModal = (club) => {
    setSelectedClub(club);
    setFormData({ club_name: club.club_name || '', description: club.description || '', patron: club.patron || '' });
    setShowClubModal(false);
    setShowEditModal(true);
  };

  const openClubActions = (club) => {
    setSelectedClub(club);
    setShowClubModal(true);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
    } catch (e) {}
    navigation.replace('Login');
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.navy }} />;

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

          <View style={styles.heroActionsTop}>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => navigation.navigate('ManageAnnouncements')}
            >
              <MaterialIcons name="campaign" size={22} color={T.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroIconBtn} onPress={handleLogout}>
              <MaterialIcons name="logout" size={22} color={T.coralSoft} />
            </TouchableOpacity>
          </View>

          <Text style={styles.heroTagline}>System Management</Text>

          <View style={styles.heroPillRow}>
            {[
              { val: totalClubs,        label: 'Clubs' },
              { val: totalActivities,   label: 'Activities' },
            ].map(({ val, label }) => (
              <View key={label} style={styles.heroPill}>
                <Text style={styles.heroPillVal}>{val}</Text>
                <Text style={styles.heroPillLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Section label ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Management</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* ── Quick Access Toggle ── */}
        <TouchableOpacity
          style={styles.dropdownToggle}
          onPress={() => setClubsExpanded(!clubsExpanded)}
          activeOpacity={0.7}
        >
          <MaterialIcons name={clubsExpanded ? 'expand-less' : 'expand-more'} size={20} color={T.textMuted} />
          <Text style={styles.dropdownToggleText}>Quick Access</Text>
        </TouchableOpacity>

        {clubsExpanded && (
          <View style={styles.dropdownBody}>
            {/* Activities */}
            <TouchableOpacity style={styles.dropdownItem} onPress={() => setActivitiesExpanded(!activitiesExpanded)} activeOpacity={0.6}>
              <View style={[styles.dropdownIcon, { backgroundColor: T.mint + '22' }]}>
                <MaterialIcons name="event" size={18} color={T.mint} />
              </View>
              <View style={styles.dropdownTextWrap}>
                <Text style={styles.dropdownLabel}>Activities</Text>
                <Text style={styles.dropdownDesc}>Events, sports & matches</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dropdownItemBadge, { borderColor: T.mint + '30', backgroundColor: T.mint + '18' }]}>
                  <Text style={[styles.dropdownItemBadgeText, { color: T.mint }]}>{totalActivities}</Text>
                </View>
                <MaterialIcons name={activitiesExpanded ? 'expand-less' : 'expand-more'} size={18} color={T.textMuted} />
              </View>
            </TouchableOpacity>

            {activitiesExpanded && (
              <View style={styles.dropdownSubList}>
                <TouchableOpacity style={styles.dropdownSubItem} onPress={() => navigation.navigate('ActsTab')} activeOpacity={0.6}>
                  <MaterialIcons name="celebration" size={15} color={T.mint} />
                  <Text style={styles.dropdownSubLabel}>Events</Text>
                  <Text style={styles.dropdownSubCount}>{totalActivities}</Text>
                  <MaterialIcons name="chevron-right" size={15} color={T.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownSubItem} onPress={() => navigation.navigate('ManageSportsCategories')} activeOpacity={0.6}>
                  <MaterialIcons name="category" size={15} color={T.gold} />
                  <Text style={styles.dropdownSubLabel}>Sports Categories</Text>
                  <Text style={styles.dropdownSubCount}>{totalSportsCategories}</Text>
                  <MaterialIcons name="chevron-right" size={15} color={T.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownSubItem} onPress={() => navigation.navigate('ManageSportsTeams')} activeOpacity={0.6}>
                  <MaterialIcons name="group" size={15} color={T.coral} />
                  <Text style={styles.dropdownSubLabel}>Sports Teams</Text>
                  <Text style={styles.dropdownSubCount}>{totalSportsTeams}</Text>
                  <MaterialIcons name="chevron-right" size={15} color={T.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownSubItem} onPress={() => navigation.navigate('ManageMatches')} activeOpacity={0.6}>
                  <MaterialIcons name="sports" size={15} color={T.lavender} />
                  <Text style={styles.dropdownSubLabel}>Matches</Text>
                  <Text style={styles.dropdownSubCount}>{totalMatches}</Text>
                  <MaterialIcons name="chevron-right" size={15} color={T.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dropdownSubItem, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('ActsTab', { screen: 'ManageActivityParticipants' })} activeOpacity={0.6}>
                  <MaterialIcons name="people" size={15} color={T.gold} />
                  <Text style={styles.dropdownSubLabel}>Participants</Text>
                  <Text style={styles.dropdownSubCount}>{totalActivityParticipants}</Text>
                  <MaterialIcons name="chevron-right" size={15} color={T.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.dropdownDivider} />

            {/* Announcements */}
            <TouchableOpacity style={styles.dropdownItem} onPress={() => navigation.navigate('ManageAnnouncements')} activeOpacity={0.6}>
              <View style={[styles.dropdownIcon, { backgroundColor: T.gold + '22' }]}>
                <MaterialIcons name="campaign" size={18} color={T.gold} />
              </View>
              <View style={styles.dropdownTextWrap}>
                <Text style={styles.dropdownLabel}>Announcements</Text>
                <Text style={styles.dropdownDesc}>Create & manage notifications</Text>
              </View>
              <View style={[styles.dropdownItemBadge, { borderColor: T.gold + '40', backgroundColor: T.gold + '18' }]}>
                <Text style={[styles.dropdownItemBadgeText, { color: T.gold }]}>{totalAnnouncements}</Text>
              </View>
            </TouchableOpacity>

          </View>
        )}

        {/* ── All Clubs Grid ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ALL CLUBS</Text>
          <View style={styles.sectionLine} />
        </View>

        {/* Create Club Button */}
        <TouchableOpacity style={styles.createClubBtn} onPress={() => { setFormData({ club_name: '', description: '', patron: '' }); setShowAddModal(true); }} activeOpacity={0.8}>
          <MaterialIcons name="add-circle-outline" size={20} color={T.mint} />
          <Text style={styles.createClubBtnText}>Create New Club</Text>
        </TouchableOpacity>

        {allClubs.length === 0 ? (
          <View style={styles.noClubsCard}>
            <MaterialIcons name="groups" size={40} color={T.textMuted + '40'} />
            <Text style={styles.noClubsText}>No clubs available</Text>
          </View>
        ) : (
          <View style={styles.clubGrid}>
            {allClubs.map(club => (
              <TouchableOpacity
                key={club.club_id}
                style={styles.clubCard}
                activeOpacity={0.7}
                onPress={() => openClubActions(club)}
              >
                <View style={[styles.clubCardAccent, { backgroundColor: T.lavender }]} />
                <View style={styles.clubCardBody}>
                  <View style={[styles.clubCardIcon, { backgroundColor: T.lavender + '22' }]}>
                    <MaterialIcons name="groups" size={22} color={T.lavender} />
                  </View>
                  <Text style={styles.clubCardName} numberOfLines={1}>{club.club_name}</Text>
                  <Text style={styles.clubCardMeta}>{club.member_count || 0} members</Text>
                  <View style={styles.clubCardActions}>
                    <TouchableOpacity style={styles.clubActionBtn} onPress={() => openEditModal(club)}>
                      <MaterialIcons name="edit" size={14} color={T.gold} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clubActionBtn} onPress={() => handleDeleteClub(club)}>
                      <MaterialIcons name="delete" size={14} color={T.coral} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Club Action Modal ── */}
        <Modal visible={showClubModal} transparent animationType="fade" onRequestClose={() => setShowClubModal(false)}>
          <TouchableWithoutFeedback onPress={() => setShowClubModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.actionModal}>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowClubModal(false)}>
                    <MaterialIcons name="close" size={22} color={T.textMuted} />
                  </TouchableOpacity>
                  <View style={styles.actionModalHeader}>
                    <View style={[styles.actionModalIcon, { backgroundColor: T.lavender + '22' }]}>
                      <MaterialIcons name="groups" size={28} color={T.lavender} />
                    </View>
                    <Text style={styles.actionModalTitle}>{selectedClub?.club_name}</Text>
                    <Text style={styles.actionModalMeta}>{selectedClub?.member_count || 0} members</Text>
                  </View>
                  <TouchableOpacity style={styles.actionModalBtn} onPress={() => { setShowClubModal(false); navigation.navigate('AdminClubDetail', { clubId: selectedClub?.club_id, clubName: selectedClub?.club_name }); }}>
                    <MaterialIcons name="visibility" size={20} color={T.lavender} />
                    <Text style={styles.actionModalBtnText}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionModalBtn} onPress={() => openEditModal(selectedClub)}>
                    <MaterialIcons name="edit" size={20} color={T.gold} />
                    <Text style={styles.actionModalBtnText}>Edit Club</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionModalBtn} onPress={() => handleDeleteClub(selectedClub)}>
                    <MaterialIcons name="delete" size={20} color={T.coral} />
                    <Text style={[styles.actionModalBtnText, { color: T.coral }]}>Delete Club</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionModalCancel} onPress={() => setShowClubModal(false)}>
                    <Text style={styles.actionModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── Add Club Modal ── */}
        <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.formModal}>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowAddModal(false)}>
                    <MaterialIcons name="close" size={22} color={T.textMuted} />
                  </TouchableOpacity>
                  <Text style={styles.formModalTitle}>Create New Club</Text>
                  <TextInput style={styles.formInput} placeholder="Club name *" value={formData.club_name} onChangeText={t => setFormData({...formData, club_name: t.replace(/[^a-zA-Z\s\-'&]/g, '')})} />
                  <TextInput style={[styles.formInput, styles.formTextArea]} placeholder="Description" value={formData.description} onChangeText={t => setFormData({...formData, description: t.replace(/[^a-zA-Z\s\-'",.!?;:()&]/g, '')})} multiline numberOfLines={3} />
                  <TextInput style={styles.formInput} placeholder="Club Leader" value={formData.patron} onChangeText={t => setFormData({...formData, patron: t})} />
                  <View style={styles.formModalBtns}>
                    <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowAddModal(false)}>
                      <Text style={styles.formCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formSubmitBtn} onPress={handleAddClub}>
                      <Text style={styles.formSubmitText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* ── Edit Club Modal ── */}
        <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.formModal}>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowEditModal(false)}>
                    <MaterialIcons name="close" size={22} color={T.textMuted} />
                  </TouchableOpacity>
                  <Text style={styles.formModalTitle}>Edit Club</Text>
                  <TextInput style={styles.formInput} placeholder="Club name *" value={formData.club_name} onChangeText={t => setFormData({...formData, club_name: t.replace(/[^a-zA-Z\s\-'&]/g, '')})} />
                  <TextInput style={[styles.formInput, styles.formTextArea]} placeholder="Description" value={formData.description} onChangeText={t => setFormData({...formData, description: t.replace(/[^a-zA-Z\s\-'",.!?;:()&]/g, '')})} multiline numberOfLines={3} />
                  <TextInput style={styles.formInput} placeholder="Club Leader" value={formData.patron} onChangeText={t => setFormData({...formData, patron: t})} />
                  <View style={styles.formModalBtns}>
                    <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowEditModal(false)}>
                      <Text style={styles.formCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formSubmitBtn} onPress={handleEditClub}>
                      <Text style={styles.formSubmitText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

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
  heroActionsTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginBottom: 16 },
  heroIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8, position: 'relative',
  },
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

  // Section label
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 14, gap: 10,
  },
  sectionTitle: {
    fontSize: 12, fontFamily: 'DMSans_700Bold',
    color: T.textMuted, textTransform: 'uppercase', letterSpacing: 1.2,
  },
  sectionLine: {
    flex: 1, height: 1, backgroundColor: T.surfaceAlt,
  },

  // Dropdown
  dropdownToggle: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 4,
    backgroundColor: T.surfaceAlt + '80',
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  dropdownToggleText: {
    fontSize: 12, fontFamily: 'DMSans_500Medium',
    color: T.textMuted,
  },
  dropdownBody: {
    backgroundColor: T.white,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: T.surfaceAlt,
  },
  dropdownIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  dropdownTextWrap: {
    flex: 1, marginRight: 10,
  },
  dropdownLabel: {
    fontSize: 14, fontFamily: 'DMSans_700Bold',
    color: T.text, marginBottom: 1,
  },
  dropdownDesc: {
    fontSize: 10, fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
  },
  dropdownItemBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 20, borderWidth: 1,
  },
  dropdownItemBadgeText: {
    fontSize: 10, fontFamily: 'DMSans_700Bold',
  },
  dropdownBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  dropdownDivider: {
    height: 1, backgroundColor: T.surfaceAlt,
  },
  dropdownSubList: {
    marginLeft: 48, marginBottom: 4,
  },
  dropdownSubItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: T.surfaceAlt,
  },
  dropdownSubLabel: {
    flex: 1, fontSize: 12, fontFamily: 'DMSans_500Medium',
    color: T.text, marginLeft: 8,
  },
  dropdownSubCount: {
    fontSize: 11, fontFamily: 'DMSans_700Bold',
    color: T.textMuted, marginRight: 4,
  },

  // Create Club button
  createClubBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, marginBottom: 14,
    backgroundColor: T.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: T.mint + '30', borderStyle: 'dashed',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  createClubBtnText: {
    fontSize: 13, fontFamily: 'DMSans_700Bold', color: T.mint,
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
  noClubsCard: {
    backgroundColor: T.white, borderRadius: 16, padding: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  noClubsText: {
    fontSize: 13, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 10,
  },

  // Club card actions (edit/delete icons)
  clubCardActions: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8,
  },
  clubActionBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },

  // Modal overlay
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Action modal (View/Edit/Delete)
  actionModal: {
    width: '80%', backgroundColor: T.white, borderRadius: 24,
    padding: 24, alignItems: 'center',
  },
  actionModalHeader: {
    alignItems: 'center', marginBottom: 20,
  },
  actionModalIcon: {
    width: 56, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  actionModalTitle: {
    fontSize: 18, fontFamily: 'DMSans_700Bold', color: T.text, textAlign: 'center',
  },
  actionModalMeta: {
    fontSize: 12, fontFamily: 'DMSans_400Regular', color: T.textMuted, marginTop: 2,
  },
  actionModalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    width: '100%', paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 12, marginBottom: 4,
  },
  actionModalBtnText: {
    fontSize: 15, fontFamily: 'DMSans_500Medium', color: T.text,
  },
  actionModalCancel: {
    marginTop: 12, paddingVertical: 10,
  },
  actionModalCancelText: {
    fontSize: 13, fontFamily: 'DMSans_500Medium', color: T.textMuted,
  },

  // Close button
  modalCloseBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },

  // Form modals (Add/Edit)
  formModal: {
    width: '85%', backgroundColor: T.white, borderRadius: 24,
    padding: 24,
  },
  formModalTitle: {
    fontSize: 18, fontFamily: 'DMSans_700Bold', color: T.text,
    marginBottom: 16, textAlign: 'center',
  },
  formInput: {
    backgroundColor: T.surfaceAlt, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontFamily: 'DMSans_400Regular', color: T.text,
    marginBottom: 12,
  },
  formTextArea: {
    minHeight: 80, textAlignVertical: 'top',
  },
  formModalBtns: {
    flexDirection: 'row', gap: 10, marginTop: 4,
  },
  formCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: T.surfaceAlt, alignItems: 'center',
  },
  formCancelText: {
    fontSize: 14, fontFamily: 'DMSans_500Medium', color: T.textMuted,
  },
  formSubmitBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    backgroundColor: T.navy, alignItems: 'center',
  },
  formSubmitText: {
    fontSize: 14, fontFamily: 'DMSans_700Bold', color: T.white,
  },

});

export default AdminDashboard;
