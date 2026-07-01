import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { useAlert } from '../../components/CustomAlert';

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

const API_URL = 'http://192.168.43.107/cam/';

const ClubDetailScreen = ({ navigation, route }) => {
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const { clubId, clubName } = route.params || {};
  const [activeTab, setActiveTab] = useState('activities');
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [membershipId, setMembershipId] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveReason, setLeaveReason] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (clubId) {
      init();
    } else {
      showAlert({ type: 'error', title: 'Error', message: 'Club information not found' });
      navigation.goBack();
    }
  }, [clubId]);

  const init = async () => {
    const uid = await loadStudentInfo();
    fetchData(uid);
  };

  const loadStudentInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setStudentId(parsed.user_id);
        return parsed.user_id;
      }
    } catch (e) {}
    return null;
  };

  const fetchData = async (sid) => {
    try {
      const [activitiesRes, membersRes] = await Promise.all([
        fetch(`${API_URL}activities.php?action=get_by_club&club_id=${clubId}`),
        fetch(`${API_URL}club_members.php?action=get_by_club&club_id=${clubId}`),
      ]);

      const activitiesData = await activitiesRes.json();
      const membersData = await membersRes.json();

      if (activitiesData.success) {
        setActivities(activitiesData.data || []);
      }
      if (membersData.success) {
        setMembers(membersData.data || []);
        const myMembership = (membersData.data || []).find(
          m => m.student_id === (sid || studentId) || m.StudentID === (sid || studentId)
        );
        if (myMembership) {
          setMembershipId(myMembership.membership_id || myMembership.MembershipID);
        }
      }
    } catch (e) {
      console.error('Error fetching club data:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    await fetchData(studentId);
    setRefreshing(false);
  }, [clubId, studentId]);

  const handleLeaveClub = () => {
    if (!membershipId) return;
    setLeaveReason('');
    setShowLeaveModal(true);
  };

  const confirmLeave = async () => {
    if (!leaveReason.trim()) return;
    setShowLeaveModal(false);
    setLeaving(true);
    try {
      const res = await fetch(`${API_URL}club_members.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          membership_id: membershipId,
          reason: leaveReason.trim(),
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetch(`${API_URL}announcements.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            Title: `Member Left: ${clubName}`,
            Content: `A student left ${clubName}. Reason: ${leaveReason.trim()}`,
            TargetAudience: 'Club Leaders',
            Priority: 'Medium',
            PublishDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
            Status: 'Published',
            club_id: clubId,
          }),
        }).catch(() => {});
        showAlert({
          type: 'success',
          title: 'Left Club',
          message: `You have left ${clubName}.`,
          buttons: [{ text: 'OK', onPress: () => navigation.goBack() }],
        });
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to leave club' });
      }
    } catch (e) {
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.' });
    } finally {
      setLeaving(false);
    }
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: T.cream }} />;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={T.cream} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={T.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerClubName} numberOfLines={1}>{clubName || 'Club'}</Text>
          <Text style={styles.headerSub}>Club Details</Text>
        </View>
      </View>

      {/* Tab Pills + Leave */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'activities' && styles.tabPillActive]}
          onPress={() => setActiveTab('activities')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="event"
            size={16}
            color={activeTab === 'activities' ? T.white : T.textMuted}
          />
          <Text style={[styles.tabPillText, activeTab === 'activities' && styles.tabPillTextActive]}>
            Activities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabPill, activeTab === 'members' && styles.tabPillActive]}
          onPress={() => setActiveTab('members')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="people"
            size={16}
            color={activeTab === 'members' ? T.white : T.textMuted}
          />
          <Text style={[styles.tabPillText, activeTab === 'members' && styles.tabPillTextActive]}>
            Members
          </Text>
        </TouchableOpacity>
        <View style={styles.tabSpacer} />
        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={handleLeaveClub}
          disabled={leaving || !membershipId}
          activeOpacity={0.7}
        >
          {leaving ? (
            <ActivityIndicator size="small" color={T.coral} />
          ) : (
            <>
              <MaterialIcons name="exit-to-app" size={16} color={T.coral} />
              <Text style={styles.leaveBtnText}>Leave</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.navy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[T.navy]} tintColor={T.navy} />
          }
        >
          {activeTab === 'activities' ? (
            activities.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-busy" size={48} color={T.textMuted + '50'} />
                <Text style={styles.emptyText}>No activities yet</Text>
              </View>
            ) : (
              activities.map((act, idx) => {
                const status = (act.Status || act.status || 'upcoming').toLowerCase();
                const statusColors = {
                  approved: T.mint,
                  upcoming: T.lavender,
                  ongoing: T.gold,
                  completed: T.mint,
                  rejected: T.coral,
                };
                const sc = statusColors[status] || T.textMuted;
                return (
                  <View key={act.ActivityID || idx} style={styles.activityCard}>
                    <View style={[styles.activityAccent, { backgroundColor: sc }]} />
                    <View style={styles.activityBody}>
                      <View style={styles.activityTopRow}>
                        <Text style={styles.activityName} numberOfLines={1}>{act.ActivityName}</Text>
                        {status !== 'approved' && (
                          <View style={[styles.statusBadge, { backgroundColor: sc + '20' }]}>
                            <Text style={[styles.statusText, { color: sc }]}>{status}</Text>
                          </View>
                        )}
                      </View>
                      {act.Description && (
                        <Text style={styles.activityDesc} numberOfLines={2}>{act.Description}</Text>
                      )}
                      {act.StartDateTime && (
                        <View style={styles.activityMeta}>
                          <MaterialIcons name="schedule" size={14} color={T.textMuted} />
                          <Text style={styles.activityMetaText}>
                            {new Date(act.StartDateTime).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                            })}
                          </Text>
                        </View>
                      )}
                      {act.Location && (
                        <View style={styles.activityMeta}>
                          <MaterialIcons name="location-on" size={14} color={T.textMuted} />
                          <Text style={styles.activityMetaText} numberOfLines={1}>{act.Location}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )
          ) : (
            members.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={48} color={T.textMuted + '50'} />
                <Text style={styles.emptyText}>No members found</Text>
              </View>
            ) : (
              members.map((m, idx) => {
                const name = m.student_name || m.StudentName || m.name || 'Unknown';
                const role = m.role || m.Role || 'member';
                return (
                  <View key={m.membership_id || idx} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.memberRole}>{role}</Text>
                    </View>
                  </View>
                );
              })
            )
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Leave Reason Modal */}
      <Modal visible={showLeaveModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLeaveModal(false)}>
          <TouchableOpacity style={styles.modalContent} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Leave {clubName}</Text>
            <Text style={styles.modalSub}>Please tell us why you're leaving:</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Time constraints, not interested..."
              placeholderTextColor={T.textMuted + '80'}
              value={leaveReason}
              onChangeText={setLeaveReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLeaveModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !leaveReason.trim() && { opacity: 0.5 }]}
                onPress={confirmLeave}
                disabled={!leaveReason.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: T.cream,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitles: {
    flex: 1,
  },
  headerClubName: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: T.text,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
    marginTop: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.surfaceAlt,
  },
  tabPillActive: {
    backgroundColor: T.navy,
    borderColor: T.navy,
  },
  tabPillText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: T.textMuted,
  },
  tabPillTextActive: {
    color: T.white,
    fontFamily: 'DMSans_700Bold',
  },
  tabSpacer: {
    flex: 1,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: T.coral + '15',
    borderWidth: 1,
    borderColor: T.coral + '30',
  },
  leaveBtnText: {
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
    color: T.coral,
  },

  // Leave Reason Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%', backgroundColor: T.white,
    borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
  },
  modalTitle: {
    fontSize: 18, fontFamily: 'DMSans_700Bold',
    color: T.text, marginBottom: 6,
  },
  modalSub: {
    fontSize: 13, fontFamily: 'DMSans_400Regular',
    color: T.textMuted, marginBottom: 16,
  },
  reasonInput: {
    backgroundColor: T.surface,
    borderRadius: 12, padding: 14,
    fontSize: 13, fontFamily: 'DMSans_400Regular',
    color: T.text, minHeight: 90,
    borderWidth: 1, borderColor: T.surfaceAlt,
  },
  modalActions: {
    flexDirection: 'row', justifyContent: 'flex-end',
    gap: 10, marginTop: 18,
  },
  modalCancelBtn: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 14, fontFamily: 'DMSans_500Medium',
    color: T.textMuted,
  },
  modalConfirmBtn: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12, backgroundColor: T.coral,
  },
  modalConfirmText: {
    fontSize: 14, fontFamily: 'DMSans_700Bold',
    color: T.white,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
    marginTop: 10,
  },

  // Activity cards
  activityCard: {
    backgroundColor: T.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  activityAccent: {
    height: 3,
  },
  activityBody: {
    padding: 14,
  },
  activityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityName: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: T.text,
    flex: 1,
    marginRight: 8,
  },
  activityDesc: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
    lineHeight: 17,
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  activityMetaText: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'DMSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Member cards
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.mint + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontFamily: 'DMSans_700Bold',
    color: T.mint,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    color: T.text,
  },
  memberRole: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: T.textMuted,
    marginTop: 2,
    textTransform: 'capitalize',
  },
});

export default ClubDetailScreen;
