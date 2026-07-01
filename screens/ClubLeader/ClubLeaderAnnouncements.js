import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const API_URL = 'http://192.168.43.107/cam/announcements.php';
const CLUBS_API = 'http://192.168.43.107/cam/clubs.php';

const priorityConfig = {
  Urgent: { color: '#E74C3C', bg: '#FDE8E8', icon: 'warning' },
  High: { color: '#F39C12', bg: '#FEF3D6', icon: 'priority-high' },
  Medium: { color: '#3498DB', bg: '#D6EDFF', icon: 'flag' },
  Low: { color: '#95A5A6', bg: '#F0F0F0', icon: 'flag' },
};

const ClubLeaderAnnouncements = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [myClubs, setMyClubs] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    Title: '',
    Content: '',
    ClubID: null,
    SendEmail: false,
  });

  const priorities = ['all', 'Low', 'Medium', 'High', 'Urgent'];

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}?action=get`;
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const info = JSON.parse(userInfoStr);
        setUserInfo(info);
        if (info.user_type) url += `&user_type=${info.user_type}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.data || []);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClubs = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserInfo(parsed);
        const res = await fetch(`${CLUBS_API}?action=get`);
        const data = await res.json();
        if (data.success) {
          const ledClubs = data.data?.filter(
            club => club.patron === parsed.user_name || club.created_by === parsed.user_id
          ) || [];
          setMyClubs(ledClubs);
        }
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchAnnouncements(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchMyClubs();
  }, []);

  const getPriority = (priority) => priorityConfig[priority] || priorityConfig.Low;

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Date not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.Title.trim() || !newAnnouncement.Content.trim()) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }
    if (!newAnnouncement.ClubID) {
      Alert.alert('Error', 'Please select a club');
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          Title: newAnnouncement.Title,
          Content: newAnnouncement.Content,
          TargetAudience: 'Clubs',
          Priority: 'Medium',
          Status: 'Published',
          PublishDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
          ClubID: newAnnouncement.ClubID,
          club_id: newAnnouncement.ClubID,
          SendEmailNotification: newAnnouncement.SendEmail ? 1 : 0,
        })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        Alert.alert('Error', 'Invalid server response');
        console.error(text);
        return;
      }
      if (data.success) {
        Alert.alert('Success', 'Announcement created successfully');
        setAddModalVisible(false);
        setNewAnnouncement({ Title: '', Content: '', ClubID: null, SendEmail: false });
        fetchAnnouncements();
      } else {
        Alert.alert('Error', data.message || 'Failed to create announcement');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', `Network error: ${error.message}`);
    }
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    if (isExpired(announcement.ExpiryDate)) return false;
    if (filterPriority !== 'all' && announcement.Priority !== filterPriority) return false;
    if (searchQuery) {
      return announcement.Title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             announcement.Content?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    const priorityDiff = (priorityOrder[a.Priority] || 4) - (priorityOrder[b.Priority] || 4);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.PublishDate) - new Date(a.PublishDate);
  });

  const urgentCount = announcements.filter(a => a.Priority === 'Urgent' && !isExpired(a.ExpiryDate)).length;
  const activeCount = announcements.filter(a => !isExpired(a.ExpiryDate)).length;

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClubLeaderDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.headerButton}>
            <MaterialIcons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
            <MaterialIcons name="refresh" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F39C12' }]}>{announcements.filter(a => a.Priority === 'High' && !isExpired(a.ExpiryDate)).length}</Text>
          <Text style={styles.statLabel}>High</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.error }]}>{urgentCount}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.primary }]}>{announcements.filter(a => a.Priority === 'Medium' && !isExpired(a.ExpiryDate)).length}</Text>
          <Text style={styles.statLabel}>Medium</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.grey} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search announcements..."
          placeholderTextColor={COLORS.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.grey} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {priorities.map(priority => {
          const isActive = filterPriority === priority;
          const cfg = priority === 'all' ? null : getPriority(priority);
          return (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterChip,
                isActive && { backgroundColor: priority === 'all' ? COLORS.primary : cfg.color },
              ]}
              onPress={() => setFilterPriority(priority)}
            >
              {!isActive && priority !== 'all' && (
                <View style={[styles.priorityDot, { backgroundColor: cfg.color }]} />
              )}
              <Text style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive,
              ]}>
                {priority === 'all' ? 'All' : priority}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {sortedAnnouncements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="campaign" size={64} color={COLORS.grey} />
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No announcements match your search' : 'There are no announcements at this time'}
            </Text>
          </View>
        ) : (
          sortedAnnouncements.map(announcement => {
            const pConfig = getPriority(announcement.Priority);
            return (
              <TouchableOpacity
                key={announcement.AnnouncementID}
                style={styles.announcementCard}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedAnnouncement(announcement);
                  setDetailsModalVisible(true);
                }}
              >
                <View style={[styles.leftAccent, { backgroundColor: pConfig.color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg }]}>
                      <MaterialIcons name={pConfig.icon} size={12} color={pConfig.color} />
                      <Text style={[styles.priorityText, { color: pConfig.color }]}>
                        {announcement.Priority}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color={COLORS.grey} />
                  </View>

                  <Text style={styles.title}>{announcement.Title}</Text>

                  <Text style={styles.contentPreview} numberOfLines={2}>
                    {announcement.Content}
                  </Text>

                  <View style={styles.metaContainer}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="event" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.metaText}>{formatDateTime(announcement.PublishDate)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="people" size={13} color={COLORS.textSecondary} />
                      <Text style={styles.metaText}>{announcement.TargetAudience}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAnnouncement && (
              <>
                <View style={[styles.modalHeaderBar, { backgroundColor: getPriority(selectedAnnouncement.Priority).color }]}>
                  <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color={COLORS.white} />
                  </TouchableOpacity>
                  <View style={[styles.modalPriorityBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <MaterialIcons name={getPriority(selectedAnnouncement.Priority).icon} size={14} color={COLORS.white} />
                    <Text style={styles.modalPriorityText}>{selectedAnnouncement.Priority}</Text>
                  </View>
                </View>
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalTitle}>{selectedAnnouncement.Title}</Text>
                  <View style={styles.modalMetaRow}>
                    <MaterialIcons name="event" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.modalMetaText}>Published: {formatDateTime(selectedAnnouncement.PublishDate)}</Text>
                  </View>
                  {selectedAnnouncement.ExpiryDate && (
                    <View style={styles.modalMetaRow}>
                      <MaterialIcons name="event-busy" size={14} color={COLORS.error} />
                      <Text style={[styles.modalMetaText, { color: COLORS.error }]}>Expires: {formatDateTime(selectedAnnouncement.ExpiryDate)}</Text>
                    </View>
                  )}
                  <View style={styles.modalMetaRow}>
                    <MaterialIcons name="people" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.modalMetaText}>Target: {selectedAnnouncement.TargetAudience}</Text>
                  </View>
                  <View style={styles.divider} />
                  <Text style={styles.modalContentText}>{selectedAnnouncement.Content}</Text>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeaderBar, { backgroundColor: COLORS.primary }]}>
              <Text style={{ color: COLORS.white, fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold }}>
                New Announcement
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Announcement title"
                value={newAnnouncement.Title}
                onChangeText={(text) => setNewAnnouncement({ ...newAnnouncement, Title: text })}
              />

              <Text style={styles.inputLabel}>Content *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your announcement..."
                value={newAnnouncement.Content}
                onChangeText={(text) => setNewAnnouncement({ ...newAnnouncement, Content: text })}
                multiline
                numberOfLines={5}
              />

              <Text style={styles.inputLabel}>Target Club *</Text>
              {myClubs.length === 0 ? (
                <Text style={{ color: COLORS.error, fontSize: 13, marginBottom: 16, fontFamily: FONTS.regular }}>
                  You are not leading any clubs
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {myClubs.map(club => (
                    <TouchableOpacity
                      key={club.club_id || club.ClubID || club.id}
                      style={[
                        styles.clubChip,
                        newAnnouncement.ClubID === (club.club_id || club.ClubID || club.id) && styles.clubChipSelected,
                      ]}
                      onPress={() => setNewAnnouncement({ ...newAnnouncement, ClubID: club.club_id || club.ClubID || club.id })}
                    >
                      <Text style={[
                        styles.clubChipText,
                        newAnnouncement.ClubID === (club.club_id || club.ClubID || club.id) && styles.clubChipTextSelected,
                      ]}>
                        {club.club_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.emailToggleRow}>
                <View style={styles.emailToggleInfo}>
                  <MaterialIcons name="email" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.emailToggleLabel}>Send email notification</Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggleSwitch, newAnnouncement.SendEmail && styles.toggleSwitchActive]}
                  onPress={() => setNewAnnouncement({ ...newAnnouncement, SendEmail: !newAnnouncement.SendEmail })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.toggleKnob, newAnnouncement.SendEmail && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAddAnnouncement}>
                <Text style={styles.submitButtonText}>Create Announcement</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, flex: 1, textAlign: 'center', fontFamily: FONTS.bold },
  headerButton: { padding: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 4, ...SHADOWS.small },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.bold },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontFamily: FONTS.regular },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 16, marginVertical: 8, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text, marginLeft: 8, fontFamily: FONTS.regular },
  filterContainer: { marginBottom: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, gap: 6 },
  filterChipText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  filterChipTextActive: { color: COLORS.white, fontWeight: '600' },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  list: { flex: 1, paddingHorizontal: 16 },
  listContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginTop: 16, fontFamily: FONTS.bold },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', fontFamily: FONTS.regular, paddingHorizontal: 20 },
  announcementCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 12, overflow: 'hidden', ...SHADOWS.small },
  leftAccent: { width: 4 },
  cardBody: { flex: 1, padding: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  priorityText: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.medium },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 6, fontFamily: FONTS.bold },
  contentPreview: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, fontFamily: FONTS.regular },
  metaContainer: { flexDirection: 'row', marginTop: 12, gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalPriorityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  modalPriorityText: { color: COLORS.white, fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 16, fontFamily: FONTS.bold },
  modalMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  modalMetaText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 16 },
  modalContentText: { fontSize: 15, color: COLORS.text, lineHeight: 24, fontFamily: FONTS.regular },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 12, fontFamily: FONTS.medium },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, fontFamily: FONTS.regular },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  clubChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8 },
  clubChipSelected: { backgroundColor: COLORS.primary },
  clubChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  clubChipTextSelected: { color: COLORS.white },
  emailToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, marginBottom: 8,
  },
  emailToggleInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emailToggleLabel: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  toggleSwitch: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: COLORS.lightGrey, justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: { backgroundColor: COLORS.primary },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', fontFamily: FONTS.bold },
});

export default ClubLeaderAnnouncements;
