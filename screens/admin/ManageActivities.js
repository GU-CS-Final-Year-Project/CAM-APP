import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, TextInput,
  Modal, TouchableWithoutFeedback, Keyboard, ActivityIndicator, RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '../../components/CustomAlert';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'http://192.168.43.107/cam/activities.php';

const ManageActivities = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlert();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerField, setPickerField] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  const [clubs, setClubs] = useState([]);
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showEditClubDropdown, setShowEditClubDropdown] = useState(false);

  const scopedClubId = route.params?.clubId ? parseInt(route.params.clubId) : null;
  const scopedClubName = route.params?.clubName || null;

  const [newActivity, setNewActivity] = useState({
    club_id: '',
    ActivityName: '',
    Description: '',
    ActivityType: 'Other',
    StartDateTime: '',
    EndDateTime: '',
    Location: '',
    MaxParticipants: '0',
    RegistrationDeadline: '',
    RequiresApproval: false,
    Status: 'Pending',
    Budget: '0',
    CreatedBy: '1'
  });

  const [editedActivity, setEditedActivity] = useState({
    ActivityID: '',
    club_id: '',
    ActivityName: '',
    Description: '',
    ActivityType: 'Other',
    StartDateTime: '',
    EndDateTime: '',
    Location: '',
    MaxParticipants: '0',
    RegistrationDeadline: '',
    RequiresApproval: false,
    Status: 'Pending',
    Budget: '0',
    ModifiedBy: '1'
  });

  const activityTypes = ['Workshop', 'Seminar', 'Competition', 'Meeting', 'Training', 'Social Event', 'Sports', 'Fundraiser', 'Other'];
  const statusTypes = ['Pending', 'Approved', 'In Progress', 'Completed', 'Cancelled', 'Postponed'];

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const url = scopedClubId
        ? `${API_URL}?action=get_by_club&club_id=${scopedClubId}`
        : `${API_URL}?action=get`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setActivities(data.data || []);
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to fetch activities' });
      }
    } catch (error) { 
      showAlert({ type: 'error', title: 'Error', message: error.message }); 
    } finally { 
      setLoading(false); 
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch('http://192.168.43.107/cam/clubs.php?action=get');
      const data = await response.json();
      if (data.success) {
        setClubs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  // Validation functions
  const validateActivityName = (name) => {
    if (!name || name.trim() === '') {
      return 'Activity name is required';
    }
    if (name.length < 3) {
      return 'Activity name must be at least 3 characters';
    }
    if (name.length > 100) {
      return 'Activity name must not exceed 100 characters';
    }
    if (/[0-9]/.test(name)) {
      return 'Activity name must not contain numbers';
    }
    return null;
  };

  const validateClubId = (id) => {
    if (!id || id.trim() === '') {
      return 'Club ID is required';
    }
    const numId = parseInt(id);
    if (isNaN(numId) || numId <= 0) {
      return 'Club ID must be a valid positive number';
    }
    return null;
  };

  const validateDescription = (desc) => {
    if (!desc || desc.trim() === '') {
      return 'Description is required';
    }
    if (desc.length < 10) {
      return 'Description must be at least 10 characters';
    }
    if (desc.length > 500) {
      return 'Description must not exceed 500 characters';
    }
    if (/[0-9]/.test(desc)) {
      return 'Description must not contain numbers';
    }
    return null;
  };

  const validateDateTime = (dateTime, fieldName) => {
    if (!dateTime || dateTime.trim() === '') {
      return `${fieldName} is required`;
    }
    // Check format YYYY-MM-DD HH:MM:SS
    const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    if (!regex.test(dateTime)) {
      return `${fieldName} must be in format: YYYY-MM-DD HH:MM:SS`;
    }
    return null;
  };

  const validateLocation = (location) => {
    if (!location || location.trim() === '') {
      return 'Location is required';
    }
    if (location.length > 200) {
      return 'Location must not exceed 200 characters';
    }
    if (!/^[a-zA-Z]/.test(location.trim())) {
      return 'Location must start with a letter';
    }
    if (!/^[a-zA-Z][a-zA-Z0-9\s]*$/.test(location.trim())) {
      return 'Location can only contain letters and numbers after the first letter';
    }
    return null;
  };

  const validateMaxParticipants = (max) => {
    const num = parseInt(max);
    if (isNaN(num) || num < 0) {
      return 'Maximum participants must be 0 or a positive number';
    }
    return null;
  };

  const validateBudget = (budget) => {
    const num = parseFloat(budget);
    if (isNaN(num) || num < 0) {
      return 'Budget must be a valid positive number';
    }
    return null;
  };

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

  const validateForm = (activity, isEdit = false) => {
    // Activity Name validation
    const nameError = validateActivityName(activity.ActivityName);
    if (nameError) {
      showAlert({ type: 'warning', title: 'Validation Error', message: nameError });
      return false;
    }

    // Club ID validation (only for new activities)
    if (!isEdit) {
      const clubIdError = validateClubId(activity.club_id);
      if (clubIdError) {
        showAlert({ type: 'warning', title: 'Validation Error', message: clubIdError });
        return false;
      }
    }

    // Description validation
    const descError = validateDescription(activity.Description);
    if (descError) {
      showAlert({ type: 'warning', title: 'Validation Error', message: descError });
      return false;
    }

    // Start DateTime validation
    const startError = validateDateTime(activity.StartDateTime, 'Start date/time');
    if (startError) {
      showAlert({ type: 'warning', title: 'Validation Error', message: startError });
      return false;
    }

    // End DateTime validation
    const endError = validateDateTime(activity.EndDateTime, 'End date/time');
    if (endError) {
      showAlert({ type: 'warning', title: 'Validation Error', message: endError });
      return false;
    }

    // REMOVED: End date after start date validation

    // Location validation
    const locationError = validateLocation(activity.Location);
    if (locationError) {
      showAlert({ type: 'warning', title: 'Validation Error', message: locationError });
      return false;
    }

    // Max Participants validation
    const participantsError = validateMaxParticipants(activity.MaxParticipants);
    if (participantsError) {
      showAlert({ type: 'warning', title: 'Validation Error', message: participantsError });
      return false;
    }

    // Budget validation
    const budgetError = validateBudget(activity.Budget);
    if (budgetError) {
      showAlert({ type: 'warning', title: 'Validation Error', message: budgetError });
      return false;
    }

    return true;
  };

  const handleAddSubmit = async () => {
    if (!validateForm(newActivity, false)) return;

    try {
      const activityData = {
        action: 'add',
        club_id: parseInt(newActivity.club_id),
        ActivityName: newActivity.ActivityName.trim(),
        Description: newActivity.Description.trim(),
        ActivityType: newActivity.ActivityType,
        StartDateTime: newActivity.StartDateTime,
        EndDateTime: newActivity.EndDateTime,
        Location: newActivity.Location.trim(),
        MaxParticipants: parseInt(newActivity.MaxParticipants) || 0,
        RegistrationDeadline: newActivity.RegistrationDeadline || null,
        RequiresApproval: newActivity.RequiresApproval ? 1 : 0,
        Status: newActivity.Status,
        Budget: parseFloat(newActivity.Budget) || 0,
        CreatedBy: parseInt(newActivity.CreatedBy) || null
      };

      const response = await fetch(API_URL, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activityData)
      });

      const text = await response.text();
      console.log('📡 Add activity raw response:', text);
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Add activity JSON parse error. Raw:', text);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid server response: ' + text.slice(0, 200) });
        return;
      }

      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Activity added successfully!' });
        setAddModalVisible(false);
        setNewActivity({
          club_id: '',
          ActivityName: '',
          Description: '',
          ActivityType: 'Other',
          StartDateTime: '',
          EndDateTime: '',
          Location: '',
          MaxParticipants: '0',
          RegistrationDeadline: '',
          RequiresApproval: false,
          Status: 'Pending',
          Budget: '0',
          CreatedBy: '1'
        });
        fetchActivities();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add activity' });
      }
    } catch (error) { 
      showAlert({ type: 'error', title: 'Error', message: error.message }); 
    }
  };

  const handleUpdate = async () => {
    if (!validateForm(editedActivity, true)) return;
    
    try {
      const updateData = {
        action: 'update',
        ActivityID: editedActivity.ActivityID,
        club_id: parseInt(editedActivity.club_id) || 0,
        ActivityName: editedActivity.ActivityName.trim(),
        Description: editedActivity.Description.trim(),
        ActivityType: editedActivity.ActivityType,
        StartDateTime: editedActivity.StartDateTime,
        EndDateTime: editedActivity.EndDateTime,
        Location: editedActivity.Location.trim(),
        MaxParticipants: parseInt(editedActivity.MaxParticipants) || 0,
        RegistrationDeadline: editedActivity.RegistrationDeadline || null,
        RequiresApproval: editedActivity.RequiresApproval ? 1 : 0,
        Status: editedActivity.Status,
        Budget: parseFloat(editedActivity.Budget) || 0,
        ModifiedBy: parseInt(editedActivity.ModifiedBy) || null
      };
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      const data = await response.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Activity updated successfully!' });
        setEditModalVisible(false);
        fetchActivities();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Update failed' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const handleDelete = async (ActivityID) => {
    showAlert({
      type: 'confirm',
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this activity?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: async () => {
          try {
            const response = await fetch(API_URL, {
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete', ActivityID })
            });
            const data = await response.json();
            if (data.success) { 
              fetchActivities(); 
              showAlert({ type: 'success', title: 'Success', message: 'Deleted successfully' });
            } else {
              showAlert({ type: 'error', title: 'Error', message: data.message || 'Delete failed' });
            }
          } catch (error) {
            showAlert({ type: 'error', title: 'Error', message: error.message });
          }
        }}
      ]
    });
  };

  const handleEditPress = (activity) => {
    setEditedActivity({
      ActivityID: activity.ActivityID,
      club_id: activity.club_id?.toString() || '',
      ActivityName: activity.ActivityName,
      Description: activity.Description || '',
      ActivityType: activity.ActivityType || 'Other',
      StartDateTime: activity.StartDateTime,
      EndDateTime: activity.EndDateTime,
      Location: activity.Location,
      MaxParticipants: activity.MaxParticipants?.toString() || '0',
      RegistrationDeadline: activity.RegistrationDeadline || '',
      RequiresApproval: activity.RequiresApproval === 1,
      Status: activity.Status || 'Pending',
      Budget: activity.Budget?.toString() || '0',
      ModifiedBy: '1'
    });
    setEditModalVisible(true);
  };

  useEffect(() => {
    if (scopedClubId) {
      setNewActivity(prev => ({ ...prev, club_id: scopedClubId.toString() }));
    }
  }, [scopedClubId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchActivities();
      fetchClubs();
    });
    return unsubscribe;
  }, [navigation]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return COLORS.primaryLight;
      case 'Pending': return COLORS.warning;
      case 'In Progress': return COLORS.info;
      case 'Completed': return COLORS.primaryLight;
      case 'Cancelled': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const renderActivityCard = (activity) => (
    <View key={activity.ActivityID} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{activity.ActivityName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activity.Status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(activity.Status) }]}>{activity.Status}</Text>
        </View>
      </View>
      <Text style={styles.clubName}>Club: {activity.club_name || 'N/A'}</Text>
      <Text style={styles.description} numberOfLines={2}>{activity.Description}</Text>
      <Text style={styles.dateText}>📅 Start: {activity.StartDateTime || 'N/A'}</Text>
      <Text style={styles.dateText}>⏰ End: {activity.EndDateTime || 'N/A'}</Text>
      <Text style={styles.location}>📍 {activity.Location || 'N/A'}</Text>
      <Text style={styles.participants}>👥 Max: {activity.MaxParticipants === 0 ? 'Unlimited' : activity.MaxParticipants}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.participantsBtn} onPress={() => navigation.navigate('ManageActivityParticipants', { activityId: activity.ActivityID, activityName: activity.ActivityName })}>
          <MaterialIcons name="people" size={18} color={COLORS.primary} />
          <Text style={styles.participantsBtnText}>Participants</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.editBtn} onPress={() => handleEditPress(activity)}>
          <MaterialIcons name="edit" size={18} color={COLORS.warning} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(activity.ActivityID)}>
          <MaterialIcons name="delete" size={18} color={COLORS.error} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!fontsLoaded) return null;

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'AdminDashboard' })}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {scopedClubName ? `${scopedClubName} Activities` : 'Manage Activities'}
            </Text>
            {scopedClubName && (
              <View style={styles.headerBadge}>
                <MaterialIcons name="groups" size={12} color={COLORS.white} />
                <Text style={styles.headerBadgeText}>{scopedClubName}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => setAddModalVisible(true)}>
            <MaterialIcons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={COLORS.grey} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search activities..." 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
          />
        </View>

        {loading && !refreshing ? 
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} /> :
          <ScrollView style={styles.list} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchActivities(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
            {activities
              .filter(a => a.ActivityName?.toLowerCase().includes(searchQuery.toLowerCase()))
              .map(renderActivityCard)}
            {activities.length === 0 && !loading && (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="event" size={64} color={COLORS.grey} />
                <Text style={styles.noDataText}>No activities found</Text>
                <TouchableOpacity style={styles.addFirstBtn} onPress={() => setAddModalVisible(true)}>
                  <Text style={styles.addFirstBtnText}>Add Your First Activity</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        }

        {/* Add Modal */}
        <Modal visible={addModalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlay}>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Activity</Text>
                  <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color={COLORS.grey} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.label}>Activity Name *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter activity name (min 3 characters)" 
                  value={newActivity.ActivityName} 
                  onChangeText={t => setNewActivity({...newActivity, ActivityName: t.replace(/[0-9]/g, '')})} 
                />
                
                {scopedClubId ? (
                  <View style={[styles.dropdown, { opacity: 0.6 }]}>
                    <Text style={styles.dropdownText}>{scopedClubName || 'Club'}</Text>
                    <MaterialIcons name="lock" size={18} color={COLORS.grey} />
                  </View>
                ) : (
                  <>
                    <Text style={styles.label}>Club *</Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowClubDropdown(!showClubDropdown)}
                    >
                      <Text style={[styles.dropdownText, !newActivity.club_id && styles.dropdownPlaceholder]}>
                        {newActivity.club_id
                          ? clubs.find(c => c.club_id === parseInt(newActivity.club_id))?.club_name || 'Select Club'
                          : 'Select Club'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.grey} />
                    </TouchableOpacity>
                    {showClubDropdown && (
                      <View style={styles.dropdownList}>
                        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                          {clubs.length === 0 ? (
                            <Text style={styles.dropdownEmpty}>No clubs available</Text>
                          ) : (
                            clubs.map(club => (
                              <TouchableOpacity
                                key={club.club_id}
                                style={[styles.dropdownItem, parseInt(newActivity.club_id) === club.club_id && styles.dropdownItemActive]}
                                onPress={() => {
                                  setNewActivity({...newActivity, club_id: club.club_id.toString()});
                                  setShowClubDropdown(false);
                                }}
                              >
                                <Text style={[styles.dropdownItemText, parseInt(newActivity.club_id) === club.club_id && styles.dropdownItemTextActive]}>
                                  {club.club_name}
                                </Text>
                              </TouchableOpacity>
                            ))
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </>
                )}
                
                <Text style={styles.label}>Description *</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Enter description (min 10 characters)" 
                  value={newActivity.Description} 
                  onChangeText={t => setNewActivity({...newActivity, Description: t.replace(/[0-9]/g, '')})} 
                  multiline 
                  numberOfLines={3}
                />
                
                <Text style={styles.label}>Activity Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                  {activityTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeChip, newActivity.ActivityType === type && styles.typeChipSelected]}
                      onPress={() => setNewActivity({...newActivity, ActivityType: type})}
                    >
                      <Text style={[styles.typeChipText, newActivity.ActivityType === type && styles.typeChipTextSelected]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <Text style={styles.label}>Start Date/Time *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('StartDateTime', 'add')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.dateInputText, !newActivity.StartDateTime && styles.dateInputPlaceholder]}>
                    {newActivity.StartDateTime || 'Tap to select start date & time'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.label}>End Date/Time *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('EndDateTime', 'add')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.dateInputText, !newActivity.EndDateTime && styles.dateInputPlaceholder]}>
                    {newActivity.EndDateTime || 'Tap to select end date & time'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.label}>Location *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter location" 
                  value={newActivity.Location} 
                  onChangeText={t => {
                    const filtered = t.replace(/[^a-zA-Z0-9\s]/g, '');
                    if (filtered === '' || /^[a-zA-Z]/.test(filtered)) {
                      setNewActivity({...newActivity, Location: filtered});
                    }
                  }} 
                />
                
                <Text style={styles.label}>Maximum Participants</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0 = unlimited" 
                  value={newActivity.MaxParticipants} 
                  onChangeText={t => setNewActivity({...newActivity, MaxParticipants: t})} 
                  keyboardType="numeric" 
                />
                
                <Text style={styles.label}>Registration Deadline (Optional)</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('RegistrationDeadline', 'add')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.dateInputText, !newActivity.RegistrationDeadline && styles.dateInputPlaceholder]}>
                    {newActivity.RegistrationDeadline || 'Tap to select deadline'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.label}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                  {statusTypes.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.typeChip, newActivity.Status === status && styles.typeChipSelected]}
                      onPress={() => setNewActivity({...newActivity, Status: status})}
                    >
                      <Text style={[styles.typeChipText, newActivity.Status === status && styles.typeChipTextSelected]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <Text style={styles.label}>Budget</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0.00" 
                  value={newActivity.Budget} 
                  onChangeText={t => setNewActivity({...newActivity, Budget: t})} 
                  keyboardType="numeric" 
                />
                
                <TouchableOpacity style={styles.submitBtn} onPress={handleAddSubmit}>
                  <Text style={styles.submitBtnText}>Add Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Edit Modal */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlay}>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Activity</Text>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <MaterialIcons name="close" size={24} color={COLORS.grey} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.label}>Activity Name *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter activity name" 
                  value={editedActivity.ActivityName} 
                  onChangeText={t => setEditedActivity({...editedActivity, ActivityName: t.replace(/[0-9]/g, '')})} 
                />
                
                <Text style={styles.label}>Club *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowEditClubDropdown(!showEditClubDropdown)}
                >
                  <Text style={[styles.dropdownText, !editedActivity.club_id && styles.dropdownPlaceholder]}>
                    {editedActivity.club_id
                      ? clubs.find(c => c.club_id === parseInt(editedActivity.club_id))?.club_name || 'Select Club'
                      : 'Select Club'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.grey} />
                </TouchableOpacity>
                {showEditClubDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                      {clubs.length === 0 ? (
                        <Text style={styles.dropdownEmpty}>No clubs available</Text>
                      ) : (
                        clubs.map(club => (
                          <TouchableOpacity
                            key={club.club_id}
                            style={[styles.dropdownItem, parseInt(editedActivity.club_id) === club.club_id && styles.dropdownItemActive]}
                            onPress={() => {
                              setEditedActivity({...editedActivity, club_id: club.club_id.toString()});
                              setShowEditClubDropdown(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, parseInt(editedActivity.club_id) === club.club_id && styles.dropdownItemTextActive]}>
                              {club.club_name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
                
                <Text style={styles.label}>Description *</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Enter description" 
                  value={editedActivity.Description} 
                  onChangeText={t => setEditedActivity({...editedActivity, Description: t.replace(/[0-9]/g, '')})} 
                  multiline 
                  numberOfLines={3}
                />
                
                <Text style={styles.label}>Activity Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                  {activityTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeChip, editedActivity.ActivityType === type && styles.typeChipSelected]}
                      onPress={() => setEditedActivity({...editedActivity, ActivityType: type})}
                    >
                      <Text style={[styles.typeChipText, editedActivity.ActivityType === type && styles.typeChipTextSelected]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <Text style={styles.label}>Start Date/Time *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('StartDateTime', 'edit')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.dateInputText, !editedActivity.StartDateTime && styles.dateInputPlaceholder]}>
                    {editedActivity.StartDateTime || 'Tap to select start date & time'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.label}>End Date/Time *</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('EndDateTime', 'edit')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.dateInputText, !editedActivity.EndDateTime && styles.dateInputPlaceholder]}>
                    {editedActivity.EndDateTime || 'Tap to select end date & time'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.label}>Location *</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter location" 
                  value={editedActivity.Location} 
                  onChangeText={t => {
                    const filtered = t.replace(/[^a-zA-Z0-9\s]/g, '');
                    if (filtered === '' || /^[a-zA-Z]/.test(filtered)) {
                      setEditedActivity({...editedActivity, Location: filtered});
                    }
                  }} 
                />
                
                <Text style={styles.label}>Maximum Participants</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0 = unlimited" 
                  value={editedActivity.MaxParticipants} 
                  onChangeText={t => setEditedActivity({...editedActivity, MaxParticipants: t})} 
                  keyboardType="numeric" 
                />
                
                <Text style={styles.label}>Registration Deadline (Optional)</Text>
                <TouchableOpacity style={styles.dateInput} onPress={() => openDatePicker('RegistrationDeadline', 'edit')}>
                  <MaterialIcons name="calendar-today" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.dateInputText, !editedActivity.RegistrationDeadline && styles.dateInputPlaceholder]}>
                    {editedActivity.RegistrationDeadline || 'Tap to select deadline'}
                  </Text>
                </TouchableOpacity>
                
                <Text style={styles.label}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                  {statusTypes.map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[styles.typeChip, editedActivity.Status === status && styles.typeChipSelected]}
                      onPress={() => setEditedActivity({...editedActivity, Status: status})}
                    >
                      <Text style={[styles.typeChipText, editedActivity.Status === status && styles.typeChipTextSelected]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <Text style={styles.label}>Budget</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0.00" 
                  value={editedActivity.Budget} 
                  onChangeText={t => setEditedActivity({...editedActivity, Budget: t})} 
                  keyboardType="numeric" 
                />
                
                <TouchableOpacity style={styles.submitBtn} onPress={handleUpdate}>
                  <Text style={styles.submitBtnText}>Update Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
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
        {/* Time Picker (Android only - iOS uses datetime mode) */}
        {showTimePicker && (
          <DateTimePicker
            value={tempDate}
            mode="time"
            display="default"
            onChange={handleTimeSelected}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.white },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  headerBadgeText: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.white },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, margin: 16, padding: 12, borderRadius: 12, ...SHADOWS.small },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, fontFamily: FONTS.regular },
  list: { paddingHorizontal: 16 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.text, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },
  clubName: { fontSize: 14, color: COLORS.primary, marginBottom: 4, fontFamily: FONTS.medium },
  description: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontFamily: FONTS.regular },
  dateText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2, fontFamily: FONTS.regular },
  location: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2, fontFamily: FONTS.regular },
  participants: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontFamily: FONTS.regular },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  participantsBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  participantsBtnText: { fontFamily: FONTS.medium, color: COLORS.primary, marginLeft: 4, fontSize: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center' },
  editText: { fontFamily: FONTS.medium, color: COLORS.warning, marginLeft: 4 },
  deleteText: { fontFamily: FONTS.medium, color: COLORS.error, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', fontFamily: FONTS.bold, textAlign: 'center', flex: 1, color: COLORS.text },
  label: { fontSize: 14, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, fontFamily: FONTS.regular },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 12, gap: 8 },
  dateInputText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.text, flex: 1 },
  dateInputPlaceholder: { color: COLORS.textSecondary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeContainer: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap' },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8, marginBottom: 8 },
  typeChipSelected: { backgroundColor: COLORS.primary },
  typeChipText: { fontFamily: FONTS.regular, color: COLORS.grey },
  typeChipTextSelected: { fontFamily: FONTS.medium, color: COLORS.white },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.lightGrey, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
  },
  dropdownText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.text, flex: 1 },
  dropdownPlaceholder: { color: COLORS.grey },
  dropdownList: {
    backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, marginTop: -8, marginBottom: 12, ...SHADOWS.small,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGrey },
  dropdownItemActive: { backgroundColor: COLORS.primary + '15' },
  dropdownItemText: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.text },
  dropdownItemTextActive: { color: COLORS.primary, fontFamily: FONTS.bold },
  dropdownEmpty: { padding: 16, textAlign: 'center', color: COLORS.grey, fontFamily: FONTS.regular },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', fontFamily: FONTS.bold },
  cancelText: { textAlign: 'center', marginTop: 12, color: COLORS.grey, fontSize: 16, fontFamily: FONTS.regular },
  noDataContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.grey, marginBottom: 16, marginTop: 16 },
  addFirstBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  addFirstBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium }
});

export default ManageActivities;
