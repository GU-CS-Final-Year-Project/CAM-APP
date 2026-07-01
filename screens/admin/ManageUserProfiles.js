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
  Image,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '../../components/CustomAlert';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

// ✅ FIXED: Use consistent base URL
const BASE_URL = 'http://192.168.43.107/cam/';
const API_URL = `${BASE_URL}userprofiles.php`;
const USERS_API_URL = `${BASE_URL}users.php`;

const ManageUserProfiles = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlert();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());

  const [newProfile, setNewProfile] = useState({
    user_id: '',
    gender: '',
    date_of_birth: '',
    contact: '',
    address: '',
    profile_picture: '',
  });

  const [editedProfile, setEditedProfile] = useState({
    profile_id: null,
    user_id: '',
    user_name: '',
    gender: '',
    date_of_birth: '',
    contact: '',
    address: '',
    profile_picture: '',
  });

  const genderOptions = ['Male', 'Female', 'Other'];

  // ✅ FIXED: Fetch users for dropdown with correct URL and error handling
  const fetchUsers = async () => {
    try {
      console.log('📚 Fetching users from:', `${USERS_API_URL}?action=get`);
      const response = await fetch(`${USERS_API_URL}?action=get`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Users response:', result);
      
      if (result.success && result.data && result.data.users) {
        setUsers(result.data.users);
        console.log(`✅ Loaded ${result.data.users.length} users`);
      } else if (result.success && Array.isArray(result.data)) {
        // Handle alternative response format
        setUsers(result.data);
        console.log(`✅ Loaded ${result.data.length} users`);
      } else {
        console.log('No users found or invalid response format');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error.message);
      // Don't show alert here to avoid spam, just log
      setUsers([]);
    }
  };

  // ✅ FIXED: Fetch all profiles with better error handling
  const fetchProfiles = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching profiles from:', `${API_URL}?action=get`);
      
      const response = await fetch(`${API_URL}?action=get`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const text = await response.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response format from server' });
        setProfiles([]);
        return;
      }
      
      if (data.success) {
        setProfiles(data.data || []);
        console.log(`✅ Loaded ${data.data?.length || 0} profiles`);
      } else {
        console.error('API error:', data.message);
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error.message);
      showAlert({ type: 'error', title: 'Connection Error', message: `Failed to connect: ${error.message}` });
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    return profiles.filter(profile =>
      profile.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.gender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [profiles, searchQuery]);

  const handleAddProfile = () => {
    setNewProfile({
      user_id: '',
      gender: '',
      date_of_birth: '',
      contact: '',
      address: '',
      profile_picture: '',
    });
    setAddModalVisible(true);
  };

  const handleEditProfile = (profile) => {
    setEditedProfile({
      profile_id: profile.profile_id,
      user_id: profile.user_id,
      user_name: profile.user_name,
      gender: profile.gender || '',
      date_of_birth: profile.date_of_birth || '',
      contact: profile.contact || '',
      address: profile.address || '',
      profile_picture: profile.profile_picture || '',
    });
    setEditModalVisible(true);
  };

  const handleDeleteProfile = (profile) => {
    showAlert({
      type: 'confirm',
      title: 'Delete Profile',
      message: `Are you sure you want to delete profile for ${profile.user_name}?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => confirmDelete(profile.profile_id) }
      ]
    });
  };

  const confirmDelete = async (profile_id) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', profile_id: profile_id })
      });
      
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch (e) { 
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' }); 
        return; 
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Profile deleted successfully!' });
        fetchProfiles();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to delete profile.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleAddFormChange = (field, value) => {
    setNewProfile({ ...newProfile, [field]: value });
  };

  const handleEditFormChange = (field, value) => {
    setEditedProfile({ ...editedProfile, [field]: value });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (addModalVisible) {
        handleAddFormChange('date_of_birth', formattedDate);
      } else if (editModalVisible) {
        handleEditFormChange('date_of_birth', formattedDate);
      }
    }
  };

  const openDatePicker = (currentDate) => {
    if (currentDate) setDatePickerDate(new Date(currentDate));
    else setDatePickerDate(new Date());
    setShowDatePicker(true);
  };

  const validateForm = (profile, isEdit = false) => {
    if (!isEdit && !profile.user_id) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Please select a user' });
      return false;
    }
    if (profile.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(profile.date_of_birth)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Date of birth must be in YYYY-MM-DD format' });
      return false;
    }
    return true;
  };

  const handleAddFormSubmit = async () => {
    if (!validateForm(newProfile)) return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          user_id: parseInt(newProfile.user_id),
          gender: newProfile.gender,
          date_of_birth: newProfile.date_of_birth,
          contact: newProfile.contact,
          address: newProfile.address,
          profile_picture: newProfile.profile_picture,
        })
      });
      
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch (e) { 
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' }); 
        return; 
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Profile added successfully!' });
        setAddModalVisible(false);
        fetchProfiles();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add profile.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleEditFormSubmit = async () => {
    if (!validateForm(editedProfile, true)) return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          profile_id: editedProfile.profile_id,
          gender: editedProfile.gender,
          date_of_birth: editedProfile.date_of_birth,
          contact: editedProfile.contact,
          address: editedProfile.address,
          profile_picture: editedProfile.profile_picture,
        })
      });
      
      const text = await response.text();
      let result;
      try { result = JSON.parse(text); } catch (e) { 
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' }); 
        return; 
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Profile updated successfully!' });
        setEditModalVisible(false);
        fetchProfiles();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update profile.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getGenderIcon = (gender) => {
    switch (gender) {
      case 'Male': return 'male';
      case 'Female': return 'female';
      default: return 'person';
    }
  };

  // ✅ FIXED: Added key prop to the renderProfileCard function
  const renderProfileCard = (profile) => (
    <View key={profile.profile_id} style={styles.profileCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="account-circle" size={60} color={COLORS.primary} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{profile.user_name}</Text>
          <Text style={styles.userEmail}>{profile.email}</Text>
          <Text style={styles.userType}>{profile.user_type}</Text>
        </View>
        <View style={styles.genderBadge}>
          <MaterialIcons name={getGenderIcon(profile.gender)} size={16} color={COLORS.primary} />
          <Text style={styles.genderText}>{profile.gender || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.profileDetails}>
        {profile.date_of_birth && (
          <View style={styles.detailRow}>
            <MaterialIcons name="cake" size={18} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>DOB: {formatDate(profile.date_of_birth)}</Text>
          </View>
        )}
        {profile.contact && (
          <View style={styles.detailRow}>
            <MaterialIcons name="phone" size={18} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>Contact: {profile.contact}</Text>
          </View>
        )}
        {profile.address && (
          <View style={styles.detailRow}>
            <MaterialIcons name="home" size={18} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>Address: {profile.address}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <MaterialIcons name="phone-android" size={18} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>Phone: {profile.user_phone || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => handleEditProfile(profile)}>
          <MaterialIcons name="edit" size={16} color={COLORS.warning} />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteProfile(profile)}>
          <MaterialIcons name="delete" size={16} color={COLORS.error} />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfiles();
      fetchUsers();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchProfiles();
    fetchUsers();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profiles</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddProfile}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, gender, or address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.grey}
        />
        {searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewNumber}>{profiles.length}</Text>
          <Text style={styles.overviewLabel}>Total Profiles</Text>
        </View>
        <View style={styles.overviewCard}>
<Text style={[styles.overviewNumber, { color: COLORS.primaryLight }]}>
            {profiles.filter(p => p.gender === 'Male').length}
          </Text>
          <Text style={styles.overviewLabel}>Male</Text>
        </View>
        <View style={styles.overviewCard}>
<Text style={[styles.overviewNumber, { color: COLORS.error }]}>
            {profiles.filter(p => p.gender === 'Female').length}
          </Text>
          <Text style={styles.overviewLabel}>Female</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={fetchProfiles}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      ) : (
        <ScrollView style={styles.profilesList} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchProfiles(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map(renderProfileCard)
          ) : (
            <View key="empty-state" style={styles.noDataContainer}>
              <MaterialIcons name="account-circle" size={64} color={COLORS.grey} />
              <Text style={styles.noDataText}>
                {searchQuery ? 'No profiles match your search' : 'No profiles found'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddProfile}>
                  <Text style={styles.addFirstButtonText}>Add First Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Profile Modal */}
      <Modal animationType="slide" transparent visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add User Profile</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* User Picker */}
                <Text style={styles.inputLabel}>Select User *</Text>
                <View style={styles.pickerWrapper}>
                  <MaterialIcons name="person" size={20} color={COLORS.textSecondary} />
                  <Picker
                    selectedValue={newProfile.user_id}
                    onValueChange={(value) => handleAddFormChange('user_id', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a user..." value="" />
                    {/* ✅ FIXED: Added key prop to each Picker.Item */}
                    {users.map(user => (
                      <Picker.Item 
                        key={user.user_id} 
                        label={`${user.user_name} (${user.user_type})`} 
                        value={user.user_id.toString()} 
                      />
                    ))}
                  </Picker>
                </View>

                {/* Gender Picker */}
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderOptions}>
                  {genderOptions.map(gender => (
                    <TouchableOpacity
                      key={gender}
                      style={[styles.genderOption, newProfile.gender === gender && styles.genderOptionSelected]}
                      onPress={() => handleAddFormChange('gender', gender)}
                    >
                      <Text style={[styles.genderOptionText, newProfile.gender === gender && styles.genderOptionTextSelected]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Date of Birth */}
                <TouchableOpacity style={styles.formInput} onPress={() => openDatePicker(newProfile.date_of_birth)}>
                  <Text style={newProfile.date_of_birth ? { color: COLORS.text } : { color: COLORS.grey }}>
                    {newProfile.date_of_birth || 'Date of Birth (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>

                <TextInput 
                  style={styles.formInput} 
                  placeholder="Alternative Contact" 
                  value={newProfile.contact} 
                  onChangeText={(text) => handleAddFormChange('contact', text)} 
                  placeholderTextColor={COLORS.grey} 
                  keyboardType="phone-pad"
                />

                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Address" 
                  value={newProfile.address} 
                  onChangeText={(text) => handleAddFormChange('address', text)} 
                  placeholderTextColor={COLORS.grey}
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity style={styles.submitButton} onPress={handleAddFormSubmit}>
                  <Text style={styles.submitButtonText}>Create Profile</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit User Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.pickerWrapper, { backgroundColor: COLORS.lightGrey, marginBottom: 16 }]}>
                  <MaterialIcons name="person" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.disabledText}>{editedProfile.user_name}</Text>
                </View>

                {/* Gender Picker */}
                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderOptions}>
                  {genderOptions.map(gender => (
                    <TouchableOpacity
                      key={gender}
                      style={[styles.genderOption, editedProfile.gender === gender && styles.genderOptionSelected]}
                      onPress={() => handleEditFormChange('gender', gender)}
                    >
                      <Text style={[styles.genderOptionText, editedProfile.gender === gender && styles.genderOptionTextSelected]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Date of Birth */}
                <TouchableOpacity style={styles.formInput} onPress={() => openDatePicker(editedProfile.date_of_birth)}>
                  <Text style={editedProfile.date_of_birth ? { color: COLORS.text } : { color: COLORS.grey }}>
                    {editedProfile.date_of_birth || 'Date of Birth (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>

                <TextInput 
                  style={styles.formInput} 
                  placeholder="Alternative Contact" 
                  value={editedProfile.contact} 
                  onChangeText={(text) => handleEditFormChange('contact', text)} 
                  placeholderTextColor={COLORS.grey} 
                  keyboardType="phone-pad"
                />

                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Address" 
                  value={editedProfile.address} 
                  onChangeText={(text) => handleEditFormChange('address', text)} 
                  placeholderTextColor={COLORS.grey}
                  multiline
                  numberOfLines={3}
                />
                
                <TouchableOpacity style={styles.submitButton} onPress={handleEditFormSubmit}>
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

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
  addButton: { padding: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...SHADOWS.small,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, fontFamily: FONTS.regular, color: COLORS.text },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  overviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    ...SHADOWS.small,
  },
  overviewNumber: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.primary },
  overviewLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  refreshText: { color: COLORS.primary, fontSize: 16, fontFamily: FONTS.medium, marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  profilesList: { flex: 1, paddingHorizontal: 16 },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  avatarContainer: { marginRight: 12 },
  profileInfo: { flex: 1 },
  userName: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text },
  userEmail: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  userType: { fontSize: 11, color: COLORS.primary, fontFamily: FONTS.medium, marginTop: 2 },
  genderBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.primary + '20', borderRadius: 20, flexDirection: 'row' },
  genderText: { fontSize: 12, color: COLORS.primary, marginLeft: 4, fontFamily: FONTS.medium },
  profileDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  detailText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginLeft: 8, flex: 1 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-start', borderTopWidth: 1, borderTopColor: COLORS.lightGrey, paddingTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  editButton: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  deleteButton: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  actionText: { fontSize: 14, marginLeft: 4, fontFamily: FONTS.medium },
  editText: { color: COLORS.warning },
  deleteText: { color: COLORS.error },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '90%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  inputLabel: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 8, marginTop: 12 },
  pickerWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.lightGrey, paddingHorizontal: 12, height: 50 },
  picker: { flex: 1, marginLeft: 8 },
  disabledText: { flex: 1, fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginLeft: 8 },
  formInput: { backgroundColor: COLORS.lightGrey, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, fontFamily: FONTS.regular, color: COLORS.text, marginBottom: 16, justifyContent: 'center' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  genderOptions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  genderOption: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS.lightGrey, alignItems: 'center', marginHorizontal: 4 },
  genderOptionSelected: { backgroundColor: COLORS.primary },
  genderOptionText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  genderOptionTextSelected: { color: COLORS.white },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontFamily: FONTS.bold },
  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.medium },
});

export default ManageUserProfiles;