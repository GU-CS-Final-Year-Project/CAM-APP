// screens/student/MyClubs.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/';

const MyClubs = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [myClubs, setMyClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [leavingClub, setLeavingClub] = useState(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [leaveReason, setLeaveReason] = useState('');
  const [clubActivities, setClubActivities] = useState([]);
  const { showAlert } = useAlert();

  useEffect(() => {
    loadStudentInfo();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadStudentInfo();
    });

    return unsubscribe;
  }, [navigation]);

  const loadStudentInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserInfo(parsedUser);
        setStudentId(parsedUser.user_id);
        console.log('✅ Student loaded:', parsedUser.user_id);
        await fetchMyClubs(parsedUser.user_id);
      } else {
        console.log('❌ No user info found');
        setStudentId(null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading student info:', error);
      setLoading(false);
    }
  };

  const fetchMyClubs = async (studentIdValue) => {
    try {
      setLoading(true);
      const studentIdParam = studentIdValue || studentId;
      
      if (!studentIdParam) {
        setMyClubs([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}club_members.php?action=get_by_student&student_id=${studentIdParam}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const clubsWithMembershipId = (result.data || []).map(club => ({
          ...club,
          membership_id: club.membership_id || club.MembershipID
        }));
        setMyClubs(clubsWithMembershipId);

        // Check for newly approved memberships
        try {
          const cachedStatuses = await AsyncStorage.getItem('membershipStatuses');
          const previous = cachedStatuses ? JSON.parse(cachedStatuses) : {};
          const current = {};
          const approvedClubs = [];
          clubsWithMembershipId.forEach(club => {
            current[club.club_id] = club.status || club.Status || 'active';
            const prevStatus = previous[club.club_id];
            if ((prevStatus === 'pending' || prevStatus === 'Pending') && (club.status === 'active' || club.Status === 'active')) {
              approvedClubs.push(club.club_name);
            }
          });
          await AsyncStorage.setItem('membershipStatuses', JSON.stringify(current));
          if (approvedClubs.length > 0) {
            setTimeout(() => {
              showAlert({
                type: 'success',
                title: 'Membership Approved! 🎉',
                message: `Your membership in ${approvedClubs.join(', ')} has been approved!`,
                buttons: [{ text: 'Great!' }]
              });
            }, 500);
          }
        } catch (e) {}

        console.log(`✅ Loaded ${clubsWithMembershipId?.length || 0} clubs joined`);
      } else {
        throw new Error(result.message || 'Failed to fetch your clubs');
      }
    } catch (error) {
      console.error('Error fetching my clubs:', error);
      setMyClubs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClubActivities = async () => {
    if (!myClubs || myClubs.length === 0) return;
    try {
      const results = await Promise.all(
        myClubs.map(club =>
          fetch(`${API_URL}activities.php?action=get_by_club&club_id=${club.club_id}`)
            .then(r => r.json())
            .then(data => ({
              clubId: club.club_id,
              activities: data.success ? (data.data || []) : [],
            }))
        )
      );
      setClubActivities(results);
      console.log('📡 club activities data:', JSON.stringify(results.map(r => ({ clubId: r.clubId, count: r.activities.length, dates: r.activities.map(a => a.StartDateTime) }))));
    } catch (e) {}
  };

  useEffect(() => {
    if (myClubs.length > 0) fetchClubActivities();
  }, [myClubs.length]);

  const handleLeaveClub = async (club) => {
    console.log('Attempting to leave club:', club);
    console.log('Membership ID:', club.membership_id);
    
    if (!club.membership_id) {
      showAlert({ type: 'error', title: 'Error', message: 'Invalid membership data. Please try refreshing the list.' });
      return;
    }
    
    setSelectedClub(club);
    setLeaveReason('');
    setConfirmModalVisible(true);
  };

  const confirmLeaveClub = async () => {
    if (!selectedClub) return;
    
    // Double check membership_id exists
    if (!selectedClub.membership_id) {
      showAlert({ type: 'error', title: 'Error', message: 'Membership ID is missing. Please refresh and try again.' });
      setConfirmModalVisible(false);
      setSelectedClub(null);
      return;
    }
    
    setConfirmModalVisible(false);
    setLeavingClub(selectedClub.club_id);
    
    try {
      const requestBody = {
        action: 'leave',
        membership_id: selectedClub.membership_id,
        reason: leaveReason.trim() || null
      };
      
      console.log('Sending leave request:', requestBody);
      
      const response = await fetch(`${API_URL}club_members.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      const result = await response.json();
      console.log('Leave response:', result);
      
      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'You have left the club' });
        await fetchMyClubs(studentId);
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to leave club' });
      }
    } catch (error) {
      console.error('Error leaving club:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.' });
    } finally {
      setLeavingClub(null);
      setSelectedClub(null);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchMyClubs(studentId),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  }, [studentId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'president': return 'star';
      case 'vice_president': return 'star-half';
      case 'secretary': return 'edit';
      case 'treasurer': return 'attach-money';
      default: return 'person';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'president': return '#E74C3C';
      case 'vice_president': return '#F39C12';
      case 'secretary': return '#27AE60';
      case 'treasurer': return '#3498DB';
      default: return '#7f8c8d';
    }
  };

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your clubs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'StudentDashboard' })} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Clubs</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => fetchMyClubs(studentId)}
        >
          <MaterialIcons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsItem}>
          <Text style={styles.statsNumber}>{myClubs.length}</Text>
          <Text style={styles.statsLabel}>Joined Clubs</Text>
        </View>
      </View>

      {/* Clubs List */}
      <ScrollView 
        style={styles.clubsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {myClubs.length === 0 ? (
          <View key="empty-state" style={styles.emptyState}>
            <MaterialIcons name="groups" size={80} color={COLORS.grey} />
            <Text style={styles.emptyStateTitle}>No Clubs Yet</Text>
            <Text style={styles.emptyStateText}>
              You haven't joined any clubs yet.
            </Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('BrowseTab')}
            >
              <MaterialIcons name="search" size={20} color={COLORS.white} />
              <Text style={styles.browseButtonText}>Browse Clubs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myClubs.map(club => {
            return (
            <View key={`club-${club.membership_id}`} style={styles.clubCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('StudentClubDetails', { 
                  clubId: club.club_id, 
                  clubName: club.club_name 
                })}
              >
                <View style={styles.clubHeader}>
                  <View style={styles.clubIcon}>
                    <MaterialIcons name="groups" size={32} color={COLORS.primary} />
                  </View>
                  <View style={styles.clubInfo}>
                    <Text style={styles.clubName}>{club.club_name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <View style={styles.roleBadge}>
                        <MaterialIcons name={getRoleIcon(club.role)} size={14} color={getRoleColor(club.role)} />
                        <Text style={[styles.roleText, { color: getRoleColor(club.role) }]}>
                          {club.role?.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.clubDescription} numberOfLines={2}>
                  {club.description || 'No description available'}
                </Text>
                
                <View style={styles.clubDetails}>
                  {club.meeting_schedule && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="schedule" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>{club.meeting_schedule}</Text>
                    </View>
                  )}
                  {club.meeting_location && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="location-on" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>{club.meeting_location}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <MaterialIcons name="calendar-today" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>Joined: {formatDate(club.join_date)}</Text>
                  </View>
                </View>

                {(() => {
                  const clubAct = clubActivities.find(c => c.clubId === club.club_id);
                  const acts = clubAct ? clubAct.activities || [] : [];
                  const upcoming = acts.filter(a => {
                    const d = new Date(a.StartDateTime?.replace(' ', 'T'));
                    return !isNaN(d.getTime()) && d > new Date();
                  });
                  if (upcoming.length === 0) return null;
                  return (
                    <View style={styles.upcomingBadge}>
                      <MaterialIcons name="event" size={14} color="#2E7D32" />
                      <Text style={styles.upcomingBadgeText}>{upcoming.length} upcoming {upcoming.length === 1 ? 'activity' : 'activities'}</Text>
                    </View>
                  );
                })()}
              </TouchableOpacity>
              
              {(
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => handleLeaveClub(club)}
                disabled={leavingClub === club.club_id}
              >
                {leavingClub === club.club_id ? (
                  <ActivityIndicator size="small" color={COLORS.error} />
                ) : (
                  <>
                    <MaterialIcons name="exit-to-app" size={18} color={COLORS.error} />
                    <Text style={styles.leaveButtonText}>Leave Club</Text>
                  </>
                )}
              </TouchableOpacity>
              )}
            </View>
            );
          })
        )}
      </ScrollView>

      {/* Leave Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialIcons name="warning" size={48} color={COLORS.warning} />
            <Text style={styles.modalTitle}>Leave Club?</Text>
            <Text style={styles.modalMessage}>
              Why are you leaving "{selectedClub?.club_name}"?
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Tell us your reason..."
              placeholderTextColor={COLORS.textSecondary}
              value={leaveReason}
              onChangeText={(text) => setLeaveReason(text.replace(/[0-9]/g, ''))}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmLeaveClub}
              >
                <Text style={styles.confirmButtonText}>Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white, flex: 1, textAlign: 'center' },
  refreshButton: { padding: 8 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...SHADOWS.medium,
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsNumber: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  statsLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  statsDivider: {
    width: 1,
    height: 50,
    backgroundColor: COLORS.border,
  },
  clubsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  clubCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clubIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.statBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  clubDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  clubDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  upcomingBadgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontFamily: FONTS.medium,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffeeee',
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 8,
    borderWidth: 1,
    borderColor: '#ffcdcd',
  },
  leaveButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
  },
  browseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    padding: 24,
    alignItems: 'center',
    width: '85%',
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 16,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  reasonInput: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: 12,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
    minHeight: 70,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.statBg,
  },
  confirmButton: {
    backgroundColor: COLORS.error,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.medium,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});

export default MyClubs;
