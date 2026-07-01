// screens/teacher/ClubManagement.js - FULL CRUD for Teachers (Admin Style)
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL
const API_URL = 'http://192.168.43.107/cam/clubs.php';

const ClubManagement = ({ navigation, route }) => {
  const clubIdParam = route?.params?.clubId;
  const [searchQuery, setSearchQuery] = useState('');
  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null);
  
  // State for custom alert/confirmation modal
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertOnConfirm, setCustomAlertOnConfirm] = useState(null);
  const [customAlertShowCancel, setCustomAlertShowCancel] = useState(false);

  // State for reply to rejection
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyClubId, setReplyClubId] = useState(null);
  const [replyText, setReplyText] = useState('');

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchClubs(),
      fetchCategories(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const showCustomAlert = (title, message, onConfirm = null, showCancel = false) => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertOnConfirm(() => onConfirm);
    setCustomAlertShowCancel(showCancel);
    setCustomAlertVisible(true);
  };

  // Load user info
  const loadUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserInfo(parsedUser);
        console.log('✅ Teacher Info:', parsedUser.user_name);
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  // Fetch categories for dropdown
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://192.168.43.107/cam/club_categories.php?action=get');
      const result = await response.json();
      if (result.success && result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch clubs
  const fetchClubs = async () => {
    try {
      setLoading(true);
      
      console.log('📚 Fetching clubs from:', `${API_URL}?action=get`);
      
      const response = await fetch(`${API_URL}?action=get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text.trim()) {
        throw new Error('Server returned empty response');
      }
      
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        showCustomAlert('Error', 'Invalid JSON response from server');
        return;
      }
      
      if (data.success) {
        const clubsData = data.data || [];
        try {
          const memRes = await fetch('http://192.168.43.107/cam/club_members.php?action=get');
          const memData = await memRes.json();
          if (memData.success) {
            const allMembers = memData.data || [];
            const clubsWithCount = clubsData.map(club => ({
              ...club,
              member_count: allMembers.filter(m => m.club_id === club.club_id && (m.status === 'active' || m.Status === 'Active')).length,
            }));
            setClubs(clubsWithCount);
          } else {
            setClubs(clubsData);
          }
        } catch (e) {
          setClubs(clubsData);
        }
        console.log(`✅ Loaded ${clubsData.length} clubs`);
      } else {
        showCustomAlert('Error', data.message || 'Failed to fetch clubs');
        setClubs([]);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      showCustomAlert('Connection Error', error.message);
      setClubs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter clubs based on search query
  const filteredClubs = useMemo(() => {
    if (!searchQuery) return clubs;
    
    return clubs.filter(club =>
      club.club_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.meeting_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.patron?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [clubs, searchQuery]);

  // Check if user can edit this club
  const canEditClub = (club) => {
    return club.created_by === userInfo?.user_id || 
           club.patron === userInfo?.user_name || 
           userInfo?.user_type === 'Admin';
  };

  const handleRequestApproval = async (clubId) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_club_approval', club_id: clubId }),
      });
      const result = await res.json();
      if (result.success) {
        showCustomAlert('Success', 'Club submitted for admin approval.');
        fetchClubs();
      } else {
        showCustomAlert('Error', result.message || 'Failed to submit for approval.');
      }
    } catch (e) {
      showCustomAlert('Error', 'Failed to connect to server.');
    }
  };

  const handleReplyToRejection = (clubId) => {
    setReplyClubId(clubId);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const submitReply = async () => {
    if (!replyText.trim()) {
      showCustomAlert('Error', 'Please enter your reply.');
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reply_rejection', club_id: replyClubId, reply: replyText }),
      });
      const result = await res.json();
      if (result.success) {
        setReplyModalVisible(false);
        showCustomAlert('Success', 'Your reply has been sent to the admin.');
        fetchClubs();
      } else {
        showCustomAlert('Error', result.message || 'Failed to send reply.');
      }
    } catch (e) {
      showCustomAlert('Error', 'Failed to connect to server.');
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category ? category.category_name : 'Uncategorized';
  };

  // Categories with club counts
  const categoriesWithCounts = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      clubCount: clubs.filter(c => c.category_id === cat.category_id).length,
    }));
  }, [categories, clubs]);

  // Clubs filtered by selected category
  const clubsInSelectedCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return filteredClubs.filter(club =>
      getCategoryName(club.category_id) === selectedCategory.category_name
    );
  }, [filteredClubs, selectedCategory]);

  const renderClubCard = (club) => {
    const canEdit = canEditClub(club);
    
    const statusColors = {
      pending:  { bg: '#FFF3CD', text: '#856404' },
      approved: { bg: '#D4EDDA', text: '#155724' },
      rejected: { bg: '#F8D7DA', text: '#721C24' },
      draft:    { bg: '#E2E3E5', text: '#383D41' },
    };
    const statusLabels = {
      pending:  'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      draft:    'Draft',
    };
    const sColor = statusColors[club.status] || statusColors.draft;
    const sLabel = statusLabels[club.status] || club.status;

    return (
      <View style={styles.clubCard}>
        <View style={styles.cardHeader}>
          <View style={styles.clubInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={styles.clubName}>{club.club_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: sColor.bg }]}>
                <Text style={[styles.statusBadgeText, { color: sColor.text }]}>{sLabel}</Text>
              </View>
            </View>
            <Text style={styles.clubCategory}>Category: {getCategoryName(club.category_id)}</Text>
            <Text style={styles.clubDescription}>{club.description}</Text>
            <View style={styles.clubDetails}>
              {club.patron && <Text style={styles.clubDetail}> Club Leader: {club.patron}</Text>}
              {club.meeting_schedule && <Text style={styles.clubDetail}> Schedule: {club.meeting_schedule}</Text>}
              {club.meeting_location && <Text style={styles.clubDetail}> Location: {club.meeting_location}</Text>}
              <Text style={styles.clubDetail}> Members: {club.member_count || 0}</Text>
            </View>
          </View>
        </View>

        {club.status === 'rejected' && club.RejectionReason && (
          <View style={styles.rejectionBanner}>
            <View style={styles.rejectionBannerLeft}>
              <MaterialIcons name="error" size={22} color="#721C24" />
            </View>
            <View style={styles.rejectionBannerContent}>
              <Text style={styles.rejectionBannerTitle}>Club Rejected</Text>
              <Text style={styles.rejectionBannerReason}>{club.RejectionReason}</Text>
              {club.RejectionReply && (
                <View style={styles.rejectionReplyBox}>
                  <Text style={styles.rejectionReplyLabel}>Your reply:</Text>
                  <Text style={styles.rejectionReplyText}>{club.RejectionReply}</Text>
                </View>
              )}
              {club.AdminReply && (
                <View style={styles.adminReplyBox}>
                  <Text style={styles.adminReplyLabel}>Admin's response:</Text>
                  <Text style={styles.adminReplyText}>{club.AdminReply}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.rejectionReplyBtn}
                onPress={() => handleReplyToRejection(club.club_id)}
              >
                <MaterialIcons name="reply" size={16} color="#fff" />
                <Text style={styles.rejectionReplyBtnText}>
                  {club.RejectionReply ? 'Edit Reply' : 'Reply to Admin'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.membersButton]}
            onPress={() => navigation.navigate('ClubMemberships', { clubId: club.club_id, clubName: club.club_name })}
          >
            <MaterialIcons name="people" size={16} color="#4A90E2" />
            <Text style={[styles.actionText, styles.membersText]}>Members</Text>
          </TouchableOpacity>
          {canEdit && (
            <TouchableOpacity
              style={[styles.actionButton, styles.activitiesButton]}
              onPress={() => navigation.navigate('ActsTab', { screen: 'ClubLeaderActivities', params: { clubId: club.club_id } })}
            >
              <MaterialIcons name="event" size={16} color="#27AE60" />
              <Text style={[styles.actionText, styles.activitiesText]}>Activities</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {!canEdit && (
          <View style={styles.readOnlyContainer}>
            <MaterialIcons name="visibility" size={16} color="#7f8c8d" />
            <Text style={styles.readOnlyText}>Read Only</Text>
          </View>
        )}
      </View>
    );
  };

  const renderReadOnlyClubCard = (club) => (
    <View style={styles.readOnlyClubCard}>
      <View style={styles.readOnlyClubRow}>
        <MaterialIcons name="group" size={20} color="#4A90E2" />
        <Text style={styles.readOnlyClubName}>{club.club_name}</Text>
      </View>
    </View>
  );

  const renderCategoryCard = (cat) => {
    const managedInCat = clubs.filter(c => c.category_id === cat.category_id && canEditClub(c)).length;
    return (
      <TouchableOpacity
        key={cat.category_id}
        style={styles.categoryCard}
        activeOpacity={0.7}
        onPress={() => { setSearchQuery(''); setSelectedCategory(cat); }}
      >
        <View style={styles.categoryCardTop}>
          <View style={styles.categoryIconWrap}>
            <MaterialIcons name="folder" size={28} color="#4A90E2" />
          </View>
          <Text style={styles.categoryCardCount}>{cat.clubCount}</Text>
        </View>
        <Text style={styles.categoryCardName}>{cat.category_name}</Text>
        <Text style={styles.categoryCardSub}>
          {managedInCat > 0 ? `${managedInCat} managed` : 'View clubs'}
        </Text>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    loadUserInfo();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchClubs();
      fetchCategories();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchClubs();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (clubIdParam && clubs.length > 0) {
      const club = clubs.find(c => c.club_id === clubIdParam || String(c.club_id) === String(clubIdParam));
      if (club) setSelectedClub(club);
    }
  }, [clubIdParam, clubs]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (selectedClub && clubIdParam) { navigation.navigate('DashTab', { screen: 'ClubLeaderDashboard' }); }
          else if (selectedClub) { setSelectedClub(null); }
          else if (selectedCategory) { setSelectedCategory(null); setSearchQuery(''); }
          else { navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'ClubLeaderDashboard' }); }
        }}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedClub ? selectedClub.club_name : selectedCategory ? selectedCategory.category_name : 'Categories'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Selected Club Detail ── */}
      {selectedClub ? (
        <ScrollView
          style={styles.clubsList}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {renderClubCard(selectedClub)}
        </ScrollView>
      ) : !selectedCategory && (
        <>
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.clubsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={categoriesWithCounts.length === 0 ? { flexGrow: 1 } : { paddingBottom: 20 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
            >
              {categoriesWithCounts.length > 0 ? (
                <View style={styles.categoryGrid}>
                  {categoriesWithCounts.map(cat => renderCategoryCard(cat))}
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <MaterialIcons name="category" size={64} color="#ccc" />
                  <Text style={styles.noDataText}>No categories available</Text>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* ── Clubs in Selected Category ── */}
      {!selectedClub && selectedCategory && (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clubs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Clubs List */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
              <Text style={styles.loadingText}>Loading clubs...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.clubsList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={clubsInSelectedCategory.length === 0 ? { flexGrow: 1 } : { paddingBottom: 60 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
            >
              {clubsInSelectedCategory.length > 0 ? (
                clubsInSelectedCategory.map(club => (
                  <View key={club.club_id}>
                    {canEditClub(club) ? renderClubCard(club) : renderReadOnlyClubCard(club)}
                  </View>
                ))
              ) : (
                <View style={styles.noDataContainer}>
                  <MaterialIcons name="group" size={64} color="#ccc" />
                  <Text style={styles.noDataText}>
                    {searchQuery ? 'No clubs match your search' : 'No clubs in this category'}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Reply to Rejection Modal */}
      <Modal animationType="slide" transparent visible={replyModalVisible} onRequestClose={() => setReplyModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reply to Rejection</Text>
                <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.replyInstructions}>
                Explain the changes you've made or provide additional information to the admin.
              </Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Type your reply here..."
                value={replyText}
                onChangeText={setReplyText}
                placeholderTextColor="#999"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                autoFocus
              />
              <View style={styles.replyModalActions}>
                <TouchableOpacity
                  style={styles.replyCancelButton}
                  onPress={() => setReplyModalVisible(false)}
                >
                  <Text style={styles.replyCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.replySubmitButton} onPress={submitReply}>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={styles.replySubmitText}>Send Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customAlertVisible}
        onRequestClose={() => setCustomAlertVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCustomAlertVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.customAlertContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setCustomAlertVisible(false)}>
                <MaterialIcons name="close" size={22} color="#999" />
              </TouchableOpacity>
              <Text style={styles.customAlertTitle}>{customAlertTitle}</Text>
              <Text style={styles.customAlertMessage}>{customAlertMessage}</Text>
              <View style={styles.customAlertButtons}>
                {customAlertShowCancel && (
                  <TouchableOpacity
                    style={[styles.customAlertButton, styles.customAlertCancelButton]}
                    onPress={() => setCustomAlertVisible(false)}
                  >
                    <Text style={styles.customAlertButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.customAlertButton, styles.customAlertConfirmButton]}
                  onPress={() => {
                    if (customAlertOnConfirm) {
                      customAlertOnConfirm();
                    }
                    setCustomAlertVisible(false);
                  }}
                >
                  <Text style={styles.customAlertButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  overviewNumber: { fontSize: 18, fontWeight: 'bold', color: '#4A90E2' },
  overviewLabel: { fontSize: 10, color: '#666', marginTop: 4, textAlign: 'center' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  refreshText: { color: '#4A90E2', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8,
  },
  categoryCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  categoryCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  categoryIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EBF2FA',
    justifyContent: 'center', alignItems: 'center',
  },
  categoryCardCount: {
    fontSize: 24, fontWeight: '700', color: '#4A90E2', fontFamily: 'DMSans_700Bold',
  },
  categoryCardName: {
    fontSize: 15, fontWeight: '600', color: '#2c3e50', marginBottom: 4,
  },
  categoryCardSub: {
    fontSize: 12, color: '#7f8c8d',
  },
  readOnlyClubCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  readOnlyClubRow: { flexDirection: 'row', alignItems: 'center' },
  readOnlyClubName: { fontSize: 15, color: '#2c3e50', marginLeft: 10, fontWeight: '500' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  clubsList: { flex: 1, paddingHorizontal: 16 },
  clubCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clubInfo: { flex: 1 },
  clubName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  clubCategory: { fontSize: 12, color: '#4A90E2', marginBottom: 8 },
  clubDescription: { fontSize: 14, color: '#7f8c8d', marginBottom: 8, lineHeight: 20 },
  clubDetails: { marginTop: 8 },
  clubDetail: { fontSize: 12, color: '#7f8c8d', marginBottom: 4 },
  rejectionBanner: {
    flexDirection: 'row', backgroundColor: '#FFF0F0', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#FFCDD2', borderLeftWidth: 4, borderLeftColor: '#D32F2F',
  },
  rejectionBannerLeft: { marginRight: 12, justifyContent: 'flex-start', paddingTop: 2 },
  rejectionBannerContent: { flex: 1 },
  rejectionBannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#D32F2F', marginBottom: 4 },
  rejectionBannerReason: { fontSize: 14, color: '#721C24', lineHeight: 20, marginBottom: 8 },
  rejectionReplyBox: { backgroundColor: '#D4EDDA', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#C3E6CB' },
  rejectionReplyLabel: { fontSize: 11, fontWeight: 'bold', color: '#155724', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  rejectionReplyText: { fontSize: 13, color: '#155724', lineHeight: 18 },
  adminReplyBox: { backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#BBDEFB' },
  adminReplyLabel: { fontSize: 11, fontWeight: 'bold', color: '#1565C0', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  adminReplyText: { fontSize: 13, color: '#1565C0', lineHeight: 18 },
  rejectionReplyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
    backgroundColor: '#D32F2F', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6,
  },
  rejectionReplyBtnText: { fontSize: 13, color: '#fff', fontWeight: 'bold' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  membersButton: { backgroundColor: 'rgba(74, 144, 226, 0.1)' },
  activitiesButton: { backgroundColor: 'rgba(39, 174, 96, 0.1)' },
  actionText: { fontSize: 14, marginLeft: 4, fontWeight: '500' },
  membersText: { color: '#4A90E2' },
  activitiesText: { color: '#27AE60' },
  readOnlyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
  },
  readOnlyText: { fontSize: 12, color: '#7f8c8d', fontStyle: 'italic', marginLeft: 4 },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  formInput: {
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, color: '#666', marginTop: 16, textAlign: 'center' },
  customAlertContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
      android: { elevation: 5 },
    }),
  },
  customAlertTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  customAlertMessage: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#666' },
  customAlertButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  customAlertButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  customAlertConfirmButton: { backgroundColor: '#4A90E2' },
  customAlertCancelButton: { backgroundColor: '#ccc' },
  customAlertButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  approvalButton: { backgroundColor: 'rgba(39, 174, 96, 0.1)' },
  approvalText: { color: '#27AE60' },
  replyInstructions: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  replyModalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 12 },
  replyCancelButton: { flex: 1, backgroundColor: '#ccc', borderRadius: 12, padding: 16, alignItems: 'center' },
  replyCancelText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  replySubmitButton: { flex: 1, flexDirection: 'row', backgroundColor: '#4A90E2', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  replySubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ClubManagement;
