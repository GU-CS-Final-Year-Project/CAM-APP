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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const API_URL = 'http://192.168.43.107/cam/announcements.php';

const priorityConfig = {
  Urgent: { color: '#E74C3C', bg: '#FDE8E8', icon: 'warning' },
  High: { color: '#F39C12', bg: '#FEF3D6', icon: 'priority-high' },
  Medium: { color: '#3498DB', bg: '#D6EDFF', icon: 'flag' },
  Low: { color: '#95A5A6', bg: '#F0F0F0', icon: 'flag' },
};

const StudentAnnouncements = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const priorities = ['all', 'Low', 'Medium', 'High', 'Urgent'];

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}?action=get_published`;
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        if (userInfo.user_type) url += `&user_type=${userInfo.user_type}`;
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

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchAnnouncements(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchAnnouncements();
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
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcements</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
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
                  <Text style={styles.modalHeaderTitle}>Announcement</Text>
                  <View style={{ width: 24 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                  <View style={[styles.modalPriorityBadge, { backgroundColor: getPriority(selectedAnnouncement.Priority).bg }]}>
                    <MaterialIcons name={getPriority(selectedAnnouncement.Priority).icon} size={16} color={getPriority(selectedAnnouncement.Priority).color} />
                    <Text style={[styles.modalPriorityText, { color: getPriority(selectedAnnouncement.Priority).color }]}>
                      {selectedAnnouncement.Priority} Priority
                    </Text>
                  </View>

                  <Text style={styles.modalTitleText}>{selectedAnnouncement.Title}</Text>

                  <View style={styles.modalMetaGrid}>
                    <View style={styles.modalMetaItem}>
                      <MaterialIcons name="event" size={16} color={COLORS.primary} />
                      <Text style={styles.modalMetaLabel}>Published</Text>
                      <Text style={styles.modalMetaValue}>{formatDateTime(selectedAnnouncement.PublishDate)}</Text>
                    </View>
                    {selectedAnnouncement.created_by_name && (
                      <View style={styles.modalMetaItem}>
                        <MaterialIcons name="person" size={16} color={COLORS.primary} />
                        <Text style={styles.modalMetaLabel}>Posted by</Text>
                        <Text style={styles.modalMetaValue}>{selectedAnnouncement.created_by_name}</Text>
                      </View>
                    )}
                    <View style={styles.modalMetaItem}>
                      <MaterialIcons name="people" size={16} color={COLORS.primary} />
                      <Text style={styles.modalMetaLabel}>Audience</Text>
                      <Text style={styles.modalMetaValue}>{selectedAnnouncement.TargetAudience}</Text>
                    </View>
                    {selectedAnnouncement.ExpiryDate && (
                      <View style={styles.modalMetaItem}>
                        <MaterialIcons name="event-busy" size={16} color={COLORS.error} />
                        <Text style={styles.modalMetaLabel}>Expires</Text>
                        <Text style={styles.modalMetaValue}>{formatDateTime(selectedAnnouncement.ExpiryDate)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.divider} />

                  <Text style={styles.modalContentText}>{selectedAnnouncement.Content}</Text>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  refreshButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  statNumber: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  statLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    ...SHADOWS.small,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: COLORS.text, fontFamily: FONTS.regular, paddingVertical: 0 },
  filterContainer: { marginHorizontal: 16, marginTop: 12 },
  filterContent: { paddingHorizontal: 4, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.statBg,
    gap: 6,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  filterChipText: { fontSize: 13, color: COLORS.text, fontFamily: FONTS.medium },
  filterChipTextActive: { color: COLORS.white },
  list: { flex: 1, paddingHorizontal: 16, marginTop: 12 },
  listContent: { paddingBottom: 20 },
  announcementCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    marginBottom: 12,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  leftAccent: { width: 4 },
  cardBody: { flex: 1, padding: 16 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  priorityText: { fontSize: 10, fontFamily: FONTS.bold },
  title: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 6, lineHeight: 22 },
  contentPreview: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  metaContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, fontSize: 16, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center', fontFamily: FONTS.regular },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    width: '92%',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusXl,
    maxHeight: '85%',
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  modalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalHeaderTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.white },
  modalBody: { padding: 20 },
  modalPriorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
    gap: 6,
  },
  modalPriorityText: { fontSize: 13, fontFamily: FONTS.bold },
  modalTitleText: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 16, lineHeight: 28 },
  modalMetaGrid: { gap: 12, marginBottom: 16 },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalMetaLabel: { fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.medium },
  modalMetaValue: { fontSize: 12, color: COLORS.text, fontFamily: FONTS.regular, flex: 1 },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 16 },
  modalContentText: { fontSize: 15, color: COLORS.text, lineHeight: 24, fontFamily: FONTS.regular },
});

export default StudentAnnouncements;
