// screens/ClubLeader/ClubLeaderActivities.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'http://192.168.43.107/cam/activities.php';
const CLUBS_API_URL = 'http://192.168.43.107/cam/clubs.php';

const ClubLeaderActivities = ({ navigation, route }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [selectedClubName, setSelectedClubName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerField, setPickerField] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  const [newActivity, setNewActivity] = useState({
    ActivityName: '',
    Description: '',
    ActivityType: 'Other',
    StartDateTime: '',
    EndDateTime: '',
    Location: '',
    MaxParticipants: '',
    RegistrationDeadline: '',
    Status: 'Approved',
    Budget: ''
  });

  const [editedActivity, setEditedActivity] = useState({
    ActivityID: null,
    ActivityName: '',
    Description: '',
    ActivityType: 'Other',
    StartDateTime: '',
    EndDateTime: '',
    Location: '',
    MaxParticipants: '',
    RegistrationDeadline: '',
    Status: 'Approved',
    Budget: ''
  });

  const activityTypes = ['Workshop', 'Seminar', 'Competition', 'Meeting', 'Training', 'Social Event', 'Sports', 'Fundraiser', 'Other'];

  const formatDateForAPI = (date) => {
    if (!date) return '';
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const openDatePicker = (field, target) => {
    setPickerField(field);
    setPickerTarget(target);
    const val = target === 'add' ? newActivity[field] : editedActivity[field];
    if (val) {
      const parsed = new Date(val.replace(' ', 'T'));
      if (!isNaN(parsed.getTime())) setTempDate(parsed);
    } else {
      setTempDate(new Date());
    }
    setShowDatePicker(true);
  };

  const handleDateSelected = (event, selectedDate) => {
    if (event?.type === 'dismissed' || !selectedDate) {
      setShowDatePicker(false);
      return;
    }
    if (selectedDate) {
      setTempDate(selectedDate);
      setShowDatePicker(false);
      if (Platform.OS === 'ios') {
        commitDateTime(selectedDate);
      } else {
        setShowTimePicker(true);
      }
    }
  };

  const handleTimeSelected = (event, selectedTime) => {
    if (event?.type === 'dismissed' || !selectedTime) {
      setShowTimePicker(false);
      return;
    }
    if (selectedTime) {
      const combined = new Date(tempDate);
      combined.setHours(selectedTime.getHours());
      combined.setMinutes(selectedTime.getMinutes());
      combined.setSeconds(0);
      commitDateTime(combined);
      setShowTimePicker(false);
    }
  };

  const commitDateTime = (date) => {
    const formatted = formatDateForAPI(date);
    if (pickerTarget === 'add') {
      setNewActivity(prev => ({ ...prev, [pickerField]: formatted }));
    } else {
      setEditedActivity(prev => ({ ...prev, [pickerField]: formatted }));
    }
  };

  // State for reply to rejection
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyActivityId, setReplyActivityId] = useState(null);
  const [replyText, setReplyText] = useState('');

  // State for custom alert
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertOnConfirm, setCustomAlertOnConfirm] = useState(null);

  const showCustomAlert = (title, message, onConfirm = null) => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertOnConfirm(() => onConfirm);
    setCustomAlertVisible(true);
  };

  const safeDismissKeyboard = () => {
    try {
      Keyboard.dismiss();
    } catch (e) {
      console.log('Keyboard dismiss error:', e);
    }
  };

  // Load user info
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

  // Fetch teacher's clubs (where teacher is patron)
  const fetchMyClubs = async () => {
    try {
      const response = await fetch(`${CLUBS_API_URL}?action=get`);
      const data = await response.json();
      if (data.success) {
        const clubs = data.data.filter(club => club.patron === userInfo?.user_name);
        setMyClubs(clubs);
        const paramClubId = route?.params?.clubId;
        if (paramClubId) {
          const matched = clubs.find(c => c.club_id === paramClubId || String(c.club_id) === String(paramClubId));
          if (matched) {
            setSelectedClubId(matched.club_id);
            setSelectedClubName(matched.club_name);
          } else if (clubs.length > 0 && !selectedClubId) {
            setSelectedClubId(clubs[0].club_id);
            setSelectedClubName(clubs[0].club_name);
          }
        } else if (clubs.length > 0 && !selectedClubId) {
          setSelectedClubId(clubs[0].club_id);
          setSelectedClubName(clubs[0].club_name);
        }
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  // Fetch activities for selected club
  const fetchActivities = async () => {
    if (!selectedClubId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}?action=get`);
      const data = await response.json();
      if (data.success) {
        const filtered = (data.data || []).filter(a => a.club_id === selectedClubId);
        console.log('📡 club activities:', JSON.stringify(filtered.map(a => ({ id: a.ActivityID, name: a.ActivityName, Status: a.Status, status: a.status, RejectionReason: a.RejectionReason, rejection_reason: a.rejection_reason }))));
        if (filtered.length > 0) console.log('📡 activity keys:', Object.keys(filtered[0]));
        setActivities(filtered);
        setFilteredActivities(filtered);
      } else {
        showCustomAlert('Error', data.message || 'Failed to fetch activities');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      showCustomAlert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Add new activity
  const handleAddActivity = async () => {
    if (!newActivity.ActivityName.trim()) {
      showCustomAlert('Error', 'Activity name is required');
      return;
    }
    if (!newActivity.StartDateTime) {
      showCustomAlert('Error', 'Please select a start date and time');
      return;
    }
    if (!newActivity.EndDateTime) {
      showCustomAlert('Error', 'Please select an end date and time');
      return;
    }
    if (!newActivity.Location.trim()) {
      showCustomAlert('Error', 'Location is required');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          club_id: selectedClubId,
          ActivityName: newActivity.ActivityName,
          Description: newActivity.Description,
          ActivityType: newActivity.ActivityType,
          StartDateTime: newActivity.StartDateTime,
          EndDateTime: newActivity.EndDateTime,
          Location: newActivity.Location,
          MaxParticipants: newActivity.MaxParticipants ? parseInt(newActivity.MaxParticipants) : 0,
          RegistrationDeadline: newActivity.RegistrationDeadline || null,
          Status: 'Approved',
          Budget: newActivity.Budget ? parseFloat(newActivity.Budget) : 0,
          CreatedBy: userInfo?.user_id
        })
      });
      const data = await response.json();
      if (data.success) {
        showCustomAlert('Success', 'Activity added successfully!');
        setAddModalVisible(false);
        resetNewForm();
        fetchActivities();
      } else {
        showCustomAlert('Error', data.message || 'Failed to add activity');
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      showCustomAlert('Error', 'Network error');
    }
  };

  const resubmitActivity = async (activityId) => {
    try {
      const getRes = await fetch(`${API_URL}?action=get`);
      const getData = await getRes.json();
      if (!getData.success) { showCustomAlert('Error', 'Failed to fetch activity.'); return; }
      const act = (getData.data || []).find(a => a.ActivityID === activityId);
      if (!act) { showCustomAlert('Error', 'Activity not found.'); return; }
      const payload = {
        action: 'update',
        ActivityID: act.ActivityID,
        club_id: act.club_id,
        ActivityName: act.ActivityName || '',
        Description: act.Description || '',
        ActivityType: act.ActivityType || 'Other',
        StartDateTime: act.StartDateTime || '',
        EndDateTime: act.EndDateTime || '',
        Location: act.Location || '',
        MaxParticipants: act.MaxParticipants || 0,
        RegistrationDeadline: act.RegistrationDeadline || '',
        RequiresApproval: act.RequiresApproval ? 1 : 0,
        Status: 'Approved',
        Budget: act.Budget || 0,
        ModifiedBy: 1,
      };
      console.log('📡 resubmit payload:', JSON.stringify(payload));
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log('📡 resubmit response:', text);
      let result;
      try { result = JSON.parse(text); } catch (e) { result = { success: false, message: text }; }
      if (result.success) {
        showCustomAlert('Success', 'Activity submitted for admin approval.');
        fetchActivities();
      } else {
        showCustomAlert('Error', result.message || 'Failed to resubmit activity.');
      }
    } catch (e) {
      showCustomAlert('Error', 'Network error');
    }
  };

  const handleActivityRequestApproval = async (activityId) => {
    resubmitActivity(activityId);
  };

  const handleReplyToRejection = (activityId) => {
    setReplyActivityId(activityId);
    setReplyText('');
    setReplyModalVisible(true);
  };

  const submitReply = async () => {
    if (!replyText.trim()) {
      showCustomAlert('Error', 'Please enter your reply.');
      return;
    }
    try {
      const payload = { action: 'reply_rejection', ActivityID: replyActivityId, RejectionReply: replyText };
      console.log('📡 reply payload:', JSON.stringify(payload));
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      console.log('📡 reply response:', text);
      let result;
      try { result = JSON.parse(text); } catch (e) { result = { success: false, message: text }; }
      if (result.success) {
        showCustomAlert('Success', 'Your reply has been sent to the admin.');
        fetchActivities();
      } else {
        showCustomAlert('Error', result.message || 'Failed to send reply.');
      }
    } catch (e) {
      showCustomAlert('Error', 'Network error');
    }
    setReplyModalVisible(false);
  };

  const resetNewForm = () => {
    setNewActivity({
      ActivityName: '',
      Description: '',
      ActivityType: 'Other',
      StartDateTime: '',
      EndDateTime: '',
      Location: '',
      MaxParticipants: '',
      RegistrationDeadline: '',
      Status: 'Approved',
      Budget: ''
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchActivities(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  // Apply search filter
  useEffect(() => {
    if (!searchQuery) {
      setFilteredActivities(activities);
    } else {
      const filtered = activities.filter(activity =>
        activity.ActivityName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.Location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredActivities(filtered);
    }
  }, [searchQuery, activities]);

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    const paramClubId = route?.params?.clubId;
    if (paramClubId && myClubs.length > 0) {
      const matched = myClubs.find(c => c.club_id === paramClubId || String(c.club_id) === String(paramClubId));
      if (matched) {
        setSelectedClubId(matched.club_id);
        setSelectedClubName(matched.club_name);
      }
    }
  }, [route?.params?.clubId, myClubs]);

  useEffect(() => {
    if (userInfo) {
      fetchMyClubs();
    }
  }, [userInfo]);

  useEffect(() => {
    if (selectedClubId) {
      fetchActivities();
    }
  }, [selectedClubId]);

  const getVal = (obj, ...keys) => {
    for (const k of keys) { if (obj[k] !== undefined && obj[k] !== null) return obj[k]; }
    return '';
  };

  const actStatus = (a) => {
    const raw = getVal(a, 'Status', 'status');
    if (!raw) return '';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };
  const actRejectionReason = (a) => getVal(a, 'RejectionReason', 'rejection_reason');
  const actRejectionReply = (a) => getVal(a, 'RejectionReply', 'rejection_reply');
  const actAdminReply = (a) => getVal(a, 'AdminReply', 'admin_reply');

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return '#5CB85C';
      case 'Pending': return '#F39C12';
      case 'In Progress': return '#3498DB';
      case 'Completed': return '#27AE60';
      case 'Cancelled': return '#E74C3C';
      case 'Postponed': return '#9B59B6';
      case 'Rejected': return '#D32F2F';
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

  const formatDateTime = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isUpcoming = (dateTime) => {
    return new Date(dateTime) > new Date();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'ClubLeaderDashboard' })} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Activities</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Current Club Indicator */}
      {selectedClubName ? (
        <View style={styles.clubSelector}>
          <Text style={styles.clubSelectorLabel}>Club</Text>
          <Text style={styles.selectedClubName}>{selectedClubName}</Text>
        </View>
      ) : null}

      {myClubs.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="groups" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Clubs Found</Text>
          <Text style={styles.emptyMessage}>
            You are not assigned as patron to any club.
          </Text>
        </View>
      ) : (
        <>


          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search activities..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>



          {/* Refresh Button */}
          <TouchableOpacity style={styles.refreshButton} onPress={fetchActivities}>
            <MaterialIcons name="refresh" size={20} color="#4A90E2" />
            <Text style={styles.refreshText}>Refresh List</Text>
          </TouchableOpacity>

          {/* Activities List */}
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {filteredActivities.length === 0 ? (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="event-busy" size={64} color="#ccc" />
                <Text style={styles.noDataText}>
                  {searchQuery ? 'No activities match your search' : 'No activities found'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity style={styles.addFirstButton} onPress={() => setAddModalVisible(true)}>
                    <Text style={styles.addFirstButtonText}>Create First Activity</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredActivities.map(activity => {
                const s = actStatus(activity);
                const reason = actRejectionReason(activity);
                const reply = actRejectionReply(activity);
                const adminReply = actAdminReply(activity);
                return (
                <View key={activity.ActivityID} style={styles.activityCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.activityIcon}>
                      <MaterialIcons name={getActivityTypeIcon(activity.ActivityType)} size={20} color="#4A90E2" />
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{activity.ActivityName}</Text>
                      <Text style={styles.activityType}>{activity.ActivityType}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(s) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(s) }]}>
                        {s}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.activityDescription} numberOfLines={2}>
                    {activity.Description}
                  </Text>

                  {s === 'Rejected' && (
                    <View style={styles.rejectionBanner}>
                      <View style={styles.rejectionBannerLeft}>
                        <MaterialIcons name="error" size={22} color="#D32F2F" />
                      </View>
                      <View style={styles.rejectionBannerContent}>
                        <Text style={styles.rejectionBannerTitle}>Activity Rejected</Text>
                        <Text style={styles.rejectionBannerReason}>{reason || 'No reason provided by admin.'}</Text>
                        {reply && (
                          <View style={styles.rejectionReplyBox}>
                            <Text style={styles.rejectionReplyLabel}>Your reply:</Text>
                            <Text style={styles.rejectionReplyText}>{reply}</Text>
                          </View>
                        )}
                        {adminReply && (
                          <View style={styles.adminReplyBox}>
                            <Text style={styles.adminReplyLabel}>Admin's response:</Text>
                            <Text style={styles.adminReplyText}>{adminReply}</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={styles.rejectionReplyBtn}
                          onPress={() => handleReplyToRejection(activity.ActivityID)}
                        >
                          <MaterialIcons name="reply" size={16} color="#fff" />
                          <Text style={styles.rejectionReplyBtnText}>
                            {reply ? 'Edit Reply' : 'Reply to Admin'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.activityDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="schedule" size={14} color="#7f8c8d" />
                      <Text style={styles.detailText}>Start: {formatDateTime(activity.StartDateTime)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="schedule" size={14} color="#7f8c8d" />
                      <Text style={styles.detailText}>End: {formatDateTime(activity.EndDateTime)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="location-on" size={14} color="#7f8c8d" />
                      <Text style={styles.detailText}>{activity.Location}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="people" size={14} color="#7f8c8d" />
                      <Text style={styles.detailText}>Max: {activity.MaxParticipants === 0 ? 'Unlimited' : activity.MaxParticipants}</Text>
                    </View>
                    {!!reason && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="error" size={14} color="#D32F2F" />
                        <Text style={[styles.detailText, { color: '#D32F2F', flex: 1 }]} numberOfLines={1}>Rejected: {reason}</Text>
                      </View>
                    )}
                    {activity.Budget > 0 && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="attach-money" size={14} color="#7f8c8d" />
                        <Text style={styles.detailText}>Budget: UGX {activity.Budget.toLocaleString()}</Text>
                      </View>
                    )}
                    {activity.RegistrationDeadline && (
                      <View style={styles.detailRow}>
                        <MaterialIcons name="event" size={14} color="#7f8c8d" />
                        <Text style={styles.detailText}>Register by: {formatDate(activity.RegistrationDeadline)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={styles.participantsButton} 
                      onPress={() => navigation.navigate('ClubLeaderActivityParticipants', { 
                        activityId: activity.ActivityID, 
                        activityName: activity.ActivityName 
                      })}
                    >
                      <MaterialIcons name="people" size={16} color="#4A90E2" />
                      <Text style={styles.participantsText}>Participants</Text>
                    </TouchableOpacity>
                    {(s === 'Draft' || s === 'Rejected') && (
                      <TouchableOpacity style={styles.approvalButton} onPress={() => handleActivityRequestApproval(activity.ActivityID)}>
                        <MaterialIcons name="how-to-reg" size={16} color="#27AE60" />
                        <Text style={styles.approvalBtnText}>Submit for Approval</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );})
            )}
          </ScrollView>
        </>
      )}

      {/* Add Activity Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={safeDismissKeyboard}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Activity</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.clubNameLabel}>Club: {selectedClubName}</Text>
                
                <TextInput
                  style={styles.input}
                  placeholder="Activity Name *"
                  value={newActivity.ActivityName}
                  onChangeText={(text) => setNewActivity({ ...newActivity, ActivityName: text })}
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  value={newActivity.Description}
                  onChangeText={(text) => setNewActivity({ ...newActivity, Description: text })}
                  multiline
                  numberOfLines={3}
                />

                <Text style={styles.inputLabel}>Activity Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                  {activityTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.optionChip, newActivity.ActivityType === type && styles.optionChipSelected]}
                      onPress={() => setNewActivity({ ...newActivity, ActivityType: type })}
                    >
                      <Text style={[styles.optionChipText, newActivity.ActivityType === type && styles.optionChipTextSelected]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.input}
                  placeholder="Location *"
                  value={newActivity.Location}
                  onChangeText={(text) => setNewActivity({ ...newActivity, Location: text })}
                />

                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('StartDateTime', 'add')}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={[styles.dateInputText, !newActivity.StartDateTime && styles.dateInputPlaceholder]}>
                    {newActivity.StartDateTime || 'Tap to select start date & time'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('EndDateTime', 'add')}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={[styles.dateInputText, !newActivity.EndDateTime && styles.dateInputPlaceholder]}>
                    {newActivity.EndDateTime || 'Tap to select end date & time'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('RegistrationDeadline', 'add')}>
                  <MaterialIcons name="calendar-today" size={18} color="#666" />
                  <Text style={[styles.dateInputText, !newActivity.RegistrationDeadline && styles.dateInputPlaceholder]}>
                    {newActivity.RegistrationDeadline || 'Tap to select deadline'}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.input}
                  placeholder="Max Participants (0 = Unlimited)"
                  value={newActivity.MaxParticipants}
                  onChangeText={(text) => setNewActivity({ ...newActivity, MaxParticipants: text })}
                  keyboardType="numeric"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Budget (UGX)"
                  value={newActivity.Budget}
                  onChangeText={(text) => setNewActivity({ ...newActivity, Budget: text })}
                  keyboardType="numeric"
                />



                <TouchableOpacity style={styles.submitButton} onPress={handleAddActivity}>
                  <Text style={styles.submitButtonText}>Create Activity</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal visible={customAlertVisible} animationType="fade" transparent onRequestClose={() => setCustomAlertVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setCustomAlertVisible(false)}>
              <MaterialIcons name="close" size={22} color="#999" />
            </TouchableOpacity>
            <MaterialIcons name={customAlertTitle === 'Success' ? 'check-circle' : 'error'} size={48} color={customAlertTitle === 'Success' ? '#5CB85C' : '#E74C3C'} />
            <Text style={styles.alertTitle}>{customAlertTitle}</Text>
            <Text style={styles.alertMessage}>{customAlertMessage}</Text>
            <TouchableOpacity style={styles.alertButton} onPress={() => { setCustomAlertVisible(false); if (customAlertOnConfirm) customAlertOnConfirm(); }}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reply to Rejection Modal */}
      <Modal visible={replyModalVisible} animationType="slide" transparent onRequestClose={() => setReplyModalVisible(false)}>
        <TouchableWithoutFeedback onPress={safeDismissKeyboard}>
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
                style={[styles.input, styles.textArea]}
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

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateSelected}
        />
      )}
      {/* Time Picker (Android only - iOS uses date-only then skips this) */}
      {showTimePicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimeSelected}
        />
      )}
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
  addButton: { padding: 8 },
  clubSelector: { marginHorizontal: 16, marginTop: 16 },
  clubSelectorLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  clubScroll: { flexDirection: 'row' },
  clubChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  clubChipActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  clubChipText: { fontSize: 14, color: '#666' },
  clubChipTextActive: { color: '#fff' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#333' },

  refreshButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 8, padding: 12, borderRadius: 12 },
  refreshText: { color: '#4A90E2', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  list: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
  activityCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', marginBottom: 8 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50', marginBottom: 2 },
  activityType: { fontSize: 11, color: '#4A90E2' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '600' },
  rejectionBanner: {
    flexDirection: 'row', backgroundColor: '#FFF0F0', borderRadius: 10, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#FFCDD2', borderLeftWidth: 3, borderLeftColor: '#D32F2F',
  },
  rejectionBannerLeft: { marginRight: 8, justifyContent: 'flex-start', paddingTop: 2 },
  rejectionBannerContent: { flex: 1 },
  rejectionBannerTitle: { fontSize: 13, fontWeight: 'bold', color: '#D32F2F', marginBottom: 3 },
  rejectionBannerReason: { fontSize: 12, color: '#721C24', lineHeight: 16, marginBottom: 6 },
  rejectionReplyBox: { backgroundColor: '#D4EDDA', padding: 8, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#C3E6CB' },
  rejectionReplyLabel: { fontSize: 10, fontWeight: 'bold', color: '#155724', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  rejectionReplyText: { fontSize: 12, color: '#155724', lineHeight: 16 },
  adminReplyBox: { backgroundColor: '#E3F2FD', padding: 8, borderRadius: 6, marginBottom: 6, borderWidth: 1, borderColor: '#BBDEFB' },
  adminReplyLabel: { fontSize: 10, fontWeight: 'bold', color: '#1565C0', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  adminReplyText: { fontSize: 12, color: '#1565C0', lineHeight: 16 },
  rejectionReplyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
    backgroundColor: '#D32F2F', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 4,
  },
  rejectionReplyBtnText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  activityDescription: { fontSize: 12, color: '#7f8c8d', marginBottom: 8, lineHeight: 16 },
  activityDetails: { marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: 4 },
  detailText: { fontSize: 11, color: '#7f8c8d' },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f3f5', paddingTop: 8, gap: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  participantsButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editText: { color: '#F39C12', fontSize: 11 },
  participantsText: { color: '#4A90E2', fontSize: 11 },
  deleteText: { color: '#E74C3C', fontSize: 11 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginTop: 16 },
  emptyMessage: { fontSize: 14, color: '#7f8c8d', marginTop: 8, textAlign: 'center' },

  noDataContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, color: '#666', marginTop: 16, textAlign: 'center' },
  addFirstButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  clubNameLabel: { fontSize: 14, color: '#4A90E2', fontWeight: '600', marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f1f3f5', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f3f5', borderRadius: 8, padding: 12, marginBottom: 16, gap: 8 },
  dateInputText: { fontSize: 16, color: '#2c3e50', flex: 1 },
  dateInputPlaceholder: { color: '#999' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  optionScroll: { flexDirection: 'row', marginBottom: 16 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f3f5', marginRight: 8 },
  optionChipSelected: { backgroundColor: '#4A90E2' },
  optionChipText: { fontSize: 14, color: '#666' },
  optionChipTextSelected: { color: '#fff' },

  submitButton: { backgroundColor: '#4A90E2', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closeButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  alertContent: { width: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  alertTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  alertMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  alertButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  alertButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  replyInstructions: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  replyModalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 12 },
  replyCancelButton: { flex: 1, backgroundColor: '#ccc', borderRadius: 12, padding: 16, alignItems: 'center' },
  replyCancelText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  replySubmitButton: { flex: 1, flexDirection: 'row', backgroundColor: '#4A90E2', borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  replySubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ClubLeaderActivities;