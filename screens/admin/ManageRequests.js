import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '../../components/CustomAlert';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const CLUBS_API = 'http://192.168.43.107/cam/clubs.php';
const ACTIVITIES_API = 'http://192.168.43.107/cam/activities.php';

const ManageRequests = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('activities');
  const [pendingActivities, setPendingActivities] = useState([]);
  const [repliedActivities, setRepliedActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processedItems, setProcessedItems] = useState({});
  const [rejectModal, setRejectModal] = useState({ visible: false, type: null, id: null, name: '' });
  const [rejectReason, setRejectReason] = useState('');

  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const { showAlert } = useAlert();

  const fetchPendingRequests = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [allActsRes, pendingActsRes] = await Promise.all([
        fetch(`${ACTIVITIES_API}?action=get`),
        fetch(`${ACTIVITIES_API}?action=get_pending`),
      ]);
      const allActsResult = await allActsRes.json();
      const pendingActsResult = await pendingActsRes.json();

      let pending = [];
      if (pendingActsResult.success) pending = pendingActsResult.data || [];
      if (allActsResult.success) {
        const fallback = (allActsResult.data || []).filter(a => {
          const s = (a.Status || a.status || '').toLowerCase();
          return (s === 'pending' || s === 'draft') && !pending.some(p => p.ActivityID === a.ActivityID);
        });
        pending = [...pending, ...fallback];
      }
      console.log('📡 pending activities:', JSON.stringify(pending.map(a => ({ id: a.ActivityID, name: a.ActivityName, status: a.Status, reason: a.RejectionReason }))));
      setPendingActivities(pending);

      let replied = [];
      if (allActsResult.success) {
        const gv = (obj, ...keys) => { for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; } return ''; };
        replied = (allActsResult.data || []).filter(a => {
          const s = (a.Status || a.status || '').toLowerCase();
          const reply = gv(a, 'RejectionReply', 'rejection_reply');
          return s === 'rejected' && reply;
        });
      }
      console.log('📡 replied activities:', JSON.stringify(replied.map(a => ({ id: a.ActivityID, name: a.ActivityName, reply: a.RejectionReply || a.rejection_reply }))));
      setRepliedActivities(replied);

    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch pending requests.' });
      setPendingActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const markProcessed = (id, type, result) => {
    setProcessedItems(prev => ({ ...prev, [`${type}_${id}`]: result }));
    setTimeout(() => {
      setProcessedItems(prev => {
        const next = { ...prev };
        delete next[`${type}_${id}`];
        return next;
      });
      fetchPendingRequests(false);
    }, 1500);
  };

  const handleApproveClub = async (clubId, clubName) => {
    try {
      const res = await fetch(CLUBS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_club', club_id: clubId }),
      });
      const result = await res.json();
      if (result.success) {
        markProcessed(clubId, 'club', 'approved');
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to approve club.' });
      }
    } catch (e) {
      showAlert({ type: 'error', title: 'Error', message: 'Connection failed.' });
    }
  };

  const handleRejectClub = (clubId, clubName) => {
    setRejectReason('');
    setRejectModal({ visible: true, type: 'club', id: clubId, name: clubName });
  };

  const handleApproveActivity = async (activityId, activityName) => {
    try {
      const payload = { action: 'approve', ActivityID: activityId };
      console.log('📡 approve payload:', JSON.stringify(payload));
      const res = await fetch(ACTIVITIES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log('📡 approve response:', text);
      let result;
      try { result = JSON.parse(text); } catch (e) { result = { success: false, message: text }; }
      if (result.success) { markProcessed(activityId, 'activity', 'approved'); }
      else { showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to approve activity.' }); }
    } catch (e) {
      showAlert({ type: 'error', title: 'Error', message: 'Connection failed.' });
    }
  };

  const handleRejectActivity = (activityId, activityName) => {
    setRejectReason('');
    setRejectModal({ visible: true, type: 'activity', id: activityId, name: activityName });
  };

  const confirmReject = async () => {
    const { type, id, name } = rejectModal;
    const prefix = type === 'club' ? 'club' : 'activity';

    if (type === 'club') {
      try {
        const payload = { action: 'reject_club', club_id: id, rejection_reason: rejectReason || 'No reason provided' };
        console.log('📡 reject club payload:', JSON.stringify(payload));
        const res = await fetch(CLUBS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        console.log('📡 reject club response:', text);
        let result;
        try { result = JSON.parse(text); } catch (e) { result = { success: false, message: text }; }
        if (result.success) {
          setRejectModal({ visible: false, type: null, id: null, name: '' });
          markProcessed(id, prefix, 'rejected');
        } else {
          showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to reject club.' });
        }
      } catch (e) {
        showAlert({ type: 'error', title: 'Error', message: 'Connection failed.' });
      }
    } else {
      setRejectModal({ visible: false, type: null, id: null, name: '' });
      try {
        const getRes = await fetch(`${ACTIVITIES_API}?action=get`);
        const getData = await getRes.json();
        if (!getData.success) { showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch activity data.' }); return; }
        const act = (getData.data || []).find(a => a.ActivityID === id);
        if (!act) { showAlert({ type: 'error', title: 'Error', message: 'Activity not found.' }); return; }
        const payload = {
          action: 'update', ActivityID: act.ActivityID,
          club_id: act.club_id, ActivityName: act.ActivityName || '',
          Description: act.Description || '', ActivityType: act.ActivityType || 'Other',
          StartDateTime: act.StartDateTime || '', EndDateTime: act.EndDateTime || '',
          Location: act.Location || '', MaxParticipants: act.MaxParticipants || 0,
          RegistrationDeadline: act.RegistrationDeadline || '', RequiresApproval: act.RequiresApproval ? 1 : 0,
          Status: 'Rejected', Budget: act.Budget || 0, ModifiedBy: 1,
          RejectionReason: rejectReason || 'No reason provided',
        };
        console.log('📡 reject via update payload:', JSON.stringify(payload));
        const res = await fetch(ACTIVITIES_API, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        console.log('📡 reject via update response:', text);
        let result;
        try { result = JSON.parse(text); } catch (e) { result = { success: false, message: text }; }
        if (result.success) { markProcessed(id, prefix, 'rejected'); }
        else { showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to reject activity.' }); }
      } catch (e) {
        showAlert({ type: 'error', title: 'Error', message: 'Connection failed.' });
      }
    }
  };



  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPendingRequests();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  if (!fontsLoaded) return null;

  const renderClubCard = (club) => {
    const processed = processedItems[`club_${club.club_id}`];
    const isProcessed = !!processed;

    return (
    <View key={club.club_id} style={[styles.requestCard, isProcessed && { opacity: 0.6 }]}>
      {isProcessed && (
        <View style={[styles.resultBanner, processed === 'approved' ? styles.approvedBanner : styles.rejectedBanner]}>
          <MaterialIcons name={processed === 'approved' ? 'check-circle' : 'cancel'} size={16} color="#fff" />
          <Text style={styles.resultBannerText}>{processed === 'approved' ? 'Approved' : 'Rejected'}</Text>
        </View>
      )}
      <View style={styles.cardIconRow}>
        <View style={[styles.cardIcon, { backgroundColor: COLORS.primary + '20' }]}>
          <MaterialIcons name="groups" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>Club</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{club.club_name}</Text>
      <Text style={styles.cardDesc} numberOfLines={3}>{club.description}</Text>

      {club.RejectionReason && (
        <View style={styles.rejectionContext}>
          <View style={styles.rejectionReasonBanner}>
            <MaterialIcons name="info" size={14} color="#721C24" />
            <Text style={styles.rejectionReasonText}>Previously rejected: {club.RejectionReason}</Text>
          </View>
          {club.RejectionReply && (
            <View style={styles.replyBanner}>
              <MaterialIcons name="reply" size={14} color="#155724" />
              <Text style={styles.replyBannerText}>Club Leader replied: {club.RejectionReply}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardMeta}>
        {club.patron && (
          <View style={styles.metaItem}>
            <MaterialIcons name="person" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{club.patron}</Text>
          </View>
        )}
        {club.meeting_schedule && (
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{club.meeting_schedule}</Text>
          </View>
        )}
        {club.meeting_location && (
          <View style={styles.metaItem}>
            <MaterialIcons name="location-on" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{club.meeting_location}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {isProcessed ? (
          <View style={[styles.actionBtn, processed === 'approved' ? styles.approveBtn : styles.rejectBtn]}>
            <MaterialIcons name={processed === 'approved' ? 'check' : 'close'} size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{processed === 'approved' ? 'Approved' : 'Rejected'}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApproveClub(club.club_id, club.club_name)}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRejectClub(club.club_id, club.club_name)}
            >
              <MaterialIcons name="close" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );};

  const renderActivityCard = (activity) => {
    const processed = processedItems[`activity_${activity.ActivityID}`];
    const isProcessed = !!processed;
    const gv = (obj, ...keys) => { for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; } return ''; };
    const reason = gv(activity, 'RejectionReason', 'rejection_reason');
    const reply = gv(activity, 'RejectionReply', 'rejection_reply');

    return (
    <View key={activity.ActivityID} style={[styles.requestCard, isProcessed && { opacity: 0.6 }]}>
      {isProcessed && (
        <View style={[styles.resultBanner, processed === 'approved' ? styles.approvedBanner : styles.rejectedBanner]}>
          <MaterialIcons name={processed === 'approved' ? 'check-circle' : 'cancel'} size={16} color="#fff" />
          <Text style={styles.resultBannerText}>{processed === 'approved' ? 'Approved' : 'Rejected'}</Text>
        </View>
      )}
      <View style={styles.cardIconRow}>
        <View style={[styles.cardIcon, { backgroundColor: '#E67E2220' }]}>
          <MaterialIcons name="event" size={22} color="#E67E22" />
        </View>
        <View style={[styles.cardBadge, { backgroundColor: '#E67E2220' }]}>
          <Text style={[styles.cardBadgeText, { color: '#E67E22' }]}>Activity</Text>
        </View>
      </View>

      <Text style={styles.cardTitle}>{activity.ActivityName}</Text>
      <Text style={styles.cardDesc} numberOfLines={3}>{activity.Description}</Text>

      {reason && (
        <View style={styles.rejectionContext}>
          <View style={styles.rejectionReasonBanner}>
            <MaterialIcons name="info" size={14} color="#721C24" />
            <Text style={styles.rejectionReasonText}>Previously rejected: {reason}</Text>
          </View>
          {reply && (
            <View style={styles.replyBanner}>
              <MaterialIcons name="reply" size={14} color="#155724" />
              <Text style={styles.replyBannerText}>Club Leader replied: {reply}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.cardMeta}>
        {activity.StartDateTime && (
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{activity.StartDateTime}</Text>
          </View>
        )}
        {activity.Location && (
          <View style={styles.metaItem}>
            <MaterialIcons name="location-on" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{activity.Location}</Text>
          </View>
        )}
        {activity.ActivityType && (
          <View style={styles.metaItem}>
            <MaterialIcons name="category" size={14} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>{activity.ActivityType}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        {isProcessed ? (
          <View style={[styles.actionBtn, processed === 'approved' ? styles.approveBtn : styles.rejectBtn]}>
            <MaterialIcons name={processed === 'approved' ? 'check' : 'close'} size={18} color="#fff" />
            <Text style={styles.actionBtnText}>{processed === 'approved' ? 'Approved' : 'Rejected'}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleApproveActivity(activity.ActivityID, activity.ActivityName)}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRejectActivity(activity.ActivityID, activity.ActivityName)}
            >
              <MaterialIcons name="close" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );};

  const totalPending = pendingActivities.length + repliedActivities.length;
  const getIsEmpty = (tab) => {
    if (tab === 'activities') return pendingActivities.length === 0;
    if (tab === 'replied') return repliedActivities.length === 0;
    return true;
  };
  const isEmpty = getIsEmpty(activeTab);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Requests</Text>
        <TouchableOpacity style={styles.refreshHeaderBtn} onPress={() => fetchPendingRequests()}>
          <MaterialIcons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: '#E67E22' }]}>{totalPending}</Text>
          <Text style={styles.overviewLabel}>Total Pending</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: '#E67E22' }]}>{pendingActivities.length}</Text>
          <Text style={styles.overviewLabel}>Activities</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: '#9B59B6' }]}>{repliedActivities.length}</Text>
          <Text style={styles.overviewLabel}>Replied</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activities' && styles.tabActive]}
          onPress={() => setActiveTab('activities')}
        >
          <MaterialIcons name="event" size={18} color={activeTab === 'activities' ? COLORS.primary : COLORS.grey} />
          <Text style={[styles.tabText, activeTab === 'activities' && styles.tabTextActive]}>
            Activities ({pendingActivities.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'replied' && styles.tabActive]}
          onPress={() => setActiveTab('replied')}
        >
          <MaterialIcons name="reply" size={18} color={activeTab === 'replied' ? COLORS.primary : COLORS.grey} />
          <Text style={[styles.tabText, activeTab === 'replied' && styles.tabTextActive]}>
            Replied ({repliedActivities.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={isEmpty ? { flexGrow: 1 } : {}}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchPendingRequests(false), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {isEmpty ? (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="how-to-reg" size={64} color={COLORS.grey} />
              <Text style={styles.noDataText}>
                {activeTab === 'replied' ? 'No replied activities' :
                 'No pending activity requests'}
              </Text>
            </View>
          ) : activeTab === 'replied' ? (
            repliedActivities.map(renderActivityCard)
          ) : (
            pendingActivities.map(renderActivityCard)
          )}
        </ScrollView>
      )}
      {/* Rejection Reason Modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade" onRequestClose={() => setRejectModal({ ...rejectModal, visible: false })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setRejectModal({ visible: false, type: null, id: null, name: '' })}>
              <MaterialIcons name="close" size={22} color="#999" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Reject {rejectModal.type === 'club' ? 'Club' : 'Activity'}</Text>
            <Text style={styles.modalSubtitle}>{rejectModal.name}</Text>
            <Text style={styles.modalLabel}>Reason for rejection:</Text>
            <TextInput
              style={styles.modalInput}
              value={rejectReason}
              onChangeText={(text) => setRejectReason(text.replace(/[0-9]/g, ''))}
              placeholder="Enter reason..."
              placeholderTextColor="#999"
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModal({ visible: false, type: null, id: null, name: '' })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmReject}>
                <MaterialIcons name="close" size={18} color="#fff" />
                <Text style={styles.modalConfirmText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white, flex: 1, textAlign: 'center' },
  refreshHeaderBtn: { padding: 8 },
  statsOverview: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
  },
  overviewCard: {
    backgroundColor: COLORS.white, borderRadius: 12, padding: 12,
    alignItems: 'center', flex: 1, marginHorizontal: 4, ...SHADOWS.small,
  },
  overviewNumber: { fontSize: 18, fontFamily: FONTS.bold },
  overviewLabel: {
    fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textSecondary,
    marginTop: 4, textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: COLORS.white, borderRadius: 12, ...SHADOWS.small,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, gap: 6,
  },
  tabActive: { backgroundColor: COLORS.primary + '15' },
  tabText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.grey },
  tabTextActive: { color: COLORS.primary, fontFamily: FONTS.bold },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  list: { flex: 1, paddingHorizontal: 16 },
  requestCard: {
    backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
    marginTop: 12, ...SHADOWS.small,
  },
  cardIconRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBadge: {
    backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20,
  },
  cardBadgeText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primary },
  cardTitle: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  cardMeta: { marginBottom: 12 },
  metaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4,
  },
  metaText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, flex: 1 },
  cardActions: {
    flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.lightGrey, paddingTop: 12,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  approveBtn: { backgroundColor: '#27AE60' },
  rejectBtn: { backgroundColor: '#E74C3C' },
  actionBtnText: { color: '#fff', fontSize: 14, fontFamily: FONTS.bold },
  resultBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10,
  },
  approvedBanner: { backgroundColor: '#27AE60' },
  rejectedBanner: { backgroundColor: '#E74C3C' },
  resultBannerText: { color: '#fff', fontSize: 13, fontFamily: FONTS.bold },
  rejectionContext: { marginBottom: 10 },
  rejectionReasonBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F8D7DA', padding: 8, borderRadius: 8, marginBottom: 4 },
  rejectionReasonText: { fontSize: 12, fontFamily: FONTS.regular, color: '#721C24', flex: 1 },
  replyBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#D4EDDA', padding: 8, borderRadius: 8 },
  replyBannerText: { fontSize: 12, fontFamily: FONTS.regular, color: '#155724', flex: 1 },

  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginBottom: 16 },
  modalLabel: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 8 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.lightGrey, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textSecondary },
  modalConfirmBtn: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 10, backgroundColor: '#E74C3C', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modalConfirmText: { fontSize: 14, fontFamily: FONTS.bold, color: '#fff' },
});

export default ManageRequests;
