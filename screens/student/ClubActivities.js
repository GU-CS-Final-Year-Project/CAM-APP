// screens/student/ClubActivities.js
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
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/';

const ClubActivities = ({ navigation, route }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const { clubId, clubName } = route.params || {};
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clubInfo, setClubInfo] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [registering, setRegistering] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const { showAlert } = useAlert();

  const statusFilters = [
    { value: 'all', label: 'All', icon: 'apps' },
    { value: 'upcoming', label: 'Upcoming', icon: 'schedule' },
    { value: 'ongoing', label: 'Ongoing', icon: 'play-circle' },
    { value: 'completed', label: 'Completed', icon: 'check-circle' },
  ];

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (clubId) {
      fetchClubDetails();
      fetchClubActivities();
    } else {
      showAlert({ type: 'error', title: 'Error', message: 'Club information not found' });
      navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentDashboard');
    }
  }, [clubId]);

  useEffect(() => {
    if (userInfo && clubId) {
      fetchMyRegistrations();
    }
  }, [userInfo, clubId]);

  const loadUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const fetchMyRegistrations = async () => {
    try {
      const response = await fetch(`${API_URL}activityparticipants.php?action=get`);
      const result = await response.json();
      if (result.success && result.data) {
        const myActivityIds = result.data
          .filter(p => Number(p.StudentID) === Number(userInfo.user_id))
          .map(p => Number(p.ActivityID));
        setMyRegistrations(myActivityIds);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const fetchClubDetails = async () => {
    try {
      console.log('📚 Fetching club details for ID:', clubId);
      const response = await fetch(`${API_URL}clubs.php?action=get_club&club_id=${clubId}`);
      const result = await response.json();
      console.log('Club details response:', result);
      if (result.success && result.data) {
        setClubInfo(result.data);
        console.log('✅ Club details loaded:', result.data.club_name);
      } else {
        console.log('⚠️ No club details found');
      }
    } catch (error) {
      console.error('Error fetching club details:', error);
    }
  };

  // FIXED: Better error handling for activities fetch
  const fetchClubActivities = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching activities for club ID:', clubId);
      console.log('URL:', `${API_URL}activities.php?action=get_by_club&club_id=${clubId}`);
      
      const response = await fetch(`${API_URL}activities.php?action=get_by_club&club_id=${clubId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Raw response:', text.substring(0, 200)); // Log first 200 chars
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setActivities([]);
        setLoading(false);
        return;
      }
      
      console.log('Activities result:', result);
      
      if (result.success) {
        const activitiesData = result.data || [];
        setActivities(activitiesData);
        console.log(`✅ Loaded ${activitiesData.length} activities`);
        
        if (activitiesData.length === 0) {
          console.log('ℹ️ No activities found for this club');
        }
      } else {
        console.error('API error:', result.message);
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error.message);
      setActivities([]);
      showAlert({ type: 'error', title: 'Connection Error', message: `Failed to fetch activities: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterForActivity = async (activity) => {
    if (!userInfo) {
      showAlert({ type: 'warning', title: 'Login Required', message: 'Please login to register for activities' });
      return;
    }

    setRegistering(true);
    try {
      const response = await fetch(`${API_URL}activityparticipants.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          ActivityID: activity.ActivityID,
          StudentID: userInfo.user_id,
          AttendanceStatus: 'Registered',
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'You have successfully registered for this activity!' });
        fetchClubActivities(); // Refresh the list
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to register for activity' });
      }
    } catch (error) {
      console.error('Error registering for activity:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.' });
    } finally {
      setRegistering(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchClubDetails(),
      fetchClubActivities(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return '#5CB85C';
      case 'Pending': return '#F39C12';
      case 'In Progress': return '#3498DB';
      case 'Completed': return '#27AE60';
      case 'Cancelled': return '#E74C3C';
      default: return '#7f8c8d';
    }
  };

  const getActivityTypeIcon = (type) => {
    switch (type) {
      case 'Workshop': return 'school';
      case 'Seminar': return 'record-voice-over';
      case 'Competition': return 'emoji-events';
      case 'Meeting': return 'groups';
      case 'Training': return 'fitness-center';
      case 'Social Event': return 'celebration';
      case 'Sports': return 'sports';
      default: return 'event';
    }
  };

  const isUpcoming = (dateTime) => {
    return new Date(dateTime) > new Date();
  };

  const filterActivities = () => {
    let filtered = activities;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.ActivityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.Location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus === 'upcoming') {
      filtered = filtered.filter(activity => isUpcoming(activity.StartDateTime));
    } else if (filterStatus === 'ongoing') {
      filtered = filtered.filter(activity => 
        new Date(activity.StartDateTime) <= new Date() && 
        new Date(activity.EndDateTime) >= new Date()
      );
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(activity => 
        new Date(activity.EndDateTime) < new Date()
      );
    }
    
    return filtered;
  };

  const filteredActivities = filterActivities();

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {clubName ? `${clubName} Activities` : 'Club Activities'}
        </Text>
        <TouchableOpacity onPress={fetchClubActivities} style={styles.refreshButton}>
          <MaterialIcons name="refresh" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Club Info Card */}
      {clubInfo && (
        <View style={styles.clubInfoCard}>
          <View style={styles.clubIconContainer}>
            <MaterialIcons name="groups" size={40} color={COLORS.primary} />
          </View>
          <View style={styles.clubInfoContent}>
            <Text style={styles.clubName}>{clubInfo.club_name}</Text>
            <Text style={styles.clubDescription} numberOfLines={2}>
              {clubInfo.description}
            </Text>
            <View style={styles.clubStats}>
              <View style={styles.statBadge}>
                <MaterialIcons name="event" size={14} color={COLORS.primary} />
                <Text style={styles.statBadgeText}>{activities.length} Activities</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search activities..."
          placeholderTextColor={COLORS.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterChip,
              filterStatus === filter.value && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus(filter.value)}
          >
            <MaterialIcons 
              name={filter.icon} 
              size={16} 
              color={filterStatus === filter.value ? COLORS.white : COLORS.textSecondary} 
            />
            <Text style={[
              styles.filterText,
              filterStatus === filter.value && styles.filterTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Activities Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredActivities.length} {filteredActivities.length === 1 ? 'Activity' : 'Activities'} found
        </Text>
      </View>

      {/* Activities List */}
      <ScrollView 
        style={styles.activitiesList}
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
        {filteredActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={64} color={COLORS.grey} />
            <Text style={styles.emptyStateTitle}>No Activities Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Try a different search term' : 'No activities scheduled for this club yet'}
            </Text>
            <TouchableOpacity 
              style={styles.refreshEmptyButton}
              onPress={fetchClubActivities}
            >
              <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.refreshEmptyButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredActivities.map(activity => (
            <TouchableOpacity
              key={activity.ActivityID}
              style={styles.activityCard}
              onPress={() => {
                setSelectedActivity(activity);
                setDetailsModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.activityTypeIcon}>
                  <MaterialIcons 
                    name={getActivityTypeIcon(activity.ActivityType)} 
                    size={24} 
                    color={COLORS.primary} 
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {activity.ActivityName}
                  </Text>
                  <View style={styles.activityMeta}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="schedule" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.metaText}>
                        {formatDate(activity.StartDateTime)} at {formatTime(activity.StartDateTime)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="location-on" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {activity.Location || 'TBA'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activity.Status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(activity.Status) }]}>
                    {activity.Status}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.activityDescription} numberOfLines={2}>
                {activity.Description}
              </Text>
              
              <View style={styles.cardFooter}>
                <View style={styles.participantInfo}>
                  <MaterialIcons name="people" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.participantText}>
                    {activity.MaxParticipants === 0 ? 'Unlimited' : `${activity.MaxParticipants} spots`}
                  </Text>
                </View>
                {isUpcoming(activity.StartDateTime) && activity.Status === 'Approved' && (
                  myRegistrations.includes(Number(activity.ActivityID)) ? (
                    <View style={styles.registeredBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#27AE60" />
                      <Text style={styles.registeredBadgeText}>Registered</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.registerButton}
                      onPress={() => handleRegisterForActivity(activity)}
                      disabled={registering}
                    >
                      {registering ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <MaterialIcons name="how-to-reg" size={16} color={COLORS.white} />
                          <Text style={styles.registerButtonText}>Register</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Activity Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedActivity && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalActivityType}>
                  <MaterialIcons 
                    name={getActivityTypeIcon(selectedActivity.ActivityType)} 
                    size={32} 
                    color={COLORS.primary} 
                  />
                  <Text style={styles.modalActivityName}>{selectedActivity.ActivityName}</Text>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Description</Text>
                  <Text style={styles.modalDescription}>{selectedActivity.Description}</Text>
                </View>
                
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Details</Text>
                  <View style={styles.modalDetailRow}>
                    <MaterialIcons name="event" size={18} color={COLORS.primary} />
                    <Text style={styles.modalDetailText}>
                      {formatDate(selectedActivity.StartDateTime)}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <MaterialIcons name="schedule" size={18} color={COLORS.primary} />
                    <Text style={styles.modalDetailText}>
                      {formatTime(selectedActivity.StartDateTime)} - {formatTime(selectedActivity.EndDateTime)}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <MaterialIcons name="location-on" size={18} color={COLORS.primary} />
                    <Text style={styles.modalDetailText}>{selectedActivity.Location || 'TBA'}</Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <MaterialIcons name="people" size={18} color={COLORS.primary} />
                    <Text style={styles.modalDetailText}>
                      Max Participants: {selectedActivity.MaxParticipants === 0 ? 'Unlimited' : selectedActivity.MaxParticipants}
                    </Text>
                  </View>
                  <View style={styles.modalDetailRow}>
                    <MaterialIcons name="attach-money" size={18} color={COLORS.primary} />
                    <Text style={styles.modalDetailText}>Budget: UGX {selectedActivity.Budget?.toLocaleString() || 0}</Text>
                  </View>
                </View>
                
                {isUpcoming(selectedActivity.StartDateTime) && selectedActivity.Status === 'Approved' && (
                  myRegistrations.includes(Number(selectedActivity.ActivityID)) ? (
                    <View style={styles.modalRegisteredBadge}>
                      <MaterialIcons name="check-circle" size={20} color="#27AE60" />
                      <Text style={styles.modalRegisteredBadgeText}>You are registered</Text>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.modalRegisterButton}
                      onPress={() => {
                        setDetailsModalVisible(false);
                        handleRegisterForActivity(selectedActivity);
                      }}
                      disabled={registering}
                    >
                      {registering ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <MaterialIcons name="how-to-reg" size={20} color={COLORS.white} />
                          <Text style={styles.modalRegisterButtonText}>Register for Activity</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )
                )}
              </ScrollView>
            )}
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
  refreshButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white, flex: 1, textAlign: 'center' },
  clubInfoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: SIZES.radiusLg,
    ...SHADOWS.medium,
  },
  clubIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.statBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clubInfoContent: {
    flex: 1,
  },
  clubName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  clubDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  clubStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    ...SHADOWS.small,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  countContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  activitiesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  activityTypeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.statBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  activityMeta: {
    gap: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  activityDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 12,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
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
  refreshEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statBg,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
  },
  refreshEmptyButtonText: {
    color: COLORS.primary,
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
    width: '90%',
    maxHeight: '80%',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  modalActivityType: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalActivityName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  modalRegisterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: SIZES.radius,
    gap: 8,
    marginTop: 16,
  },
  modalRegisterButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  registeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  registeredBadgeText: {
    color: '#27AE60',
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  modalRegisteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  modalRegisteredBadgeText: {
    color: '#27AE60',
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});

export default ClubActivities;
