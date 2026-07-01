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
import { useAlert } from '../../components/CustomAlert';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL
const API_URL = 'http://192.168.43.107/cam/clubs.php';

const ManageClubs = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const { showAlert } = useAlert();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [activeDropdownFor, setActiveDropdownFor] = useState(null); // 'add' or 'edit'
  
  const [newClub, setNewClub] = useState({
    club_name: '',
    description: '',
    category_id: '',
    patron: '',
    meeting_schedule: '',
    meeting_location: ''
  });

  const [editedClub, setEditedClub] = useState({
    club_id: null,
    club_name: '',
    description: '',
    category_id: '',
    patron: '',
    meeting_schedule: '',
    meeting_location: ''
  });

  // Helper validation functions
  const containsNumber = (str) => {
    return /\d/.test(str);
  };

  const containsLetter = (str) => {
    return /[a-zA-Z]/.test(str);
  };

  const isValidClubName = (name) => {
    return /^[a-zA-Z\s\-'&]+$/.test(name.trim());
  };

  const isValidPatronName = (name) => {
    // Allow letters, spaces, hyphens, apostrophes, and periods (for titles like Dr., Prof.)
    return /^[a-zA-Z\s\-'.]+$/.test(name.trim());
  };

  const isValidDescription = (desc) => {
    return /^[a-zA-Z\s\-'",.!?;:()&]+$/.test(desc.trim());
  };

  const isValidMeetingSchedule = (schedule) => {
    // Allow letters, numbers, spaces, colons, commas, hyphens, and ampersands
    return /^[a-zA-Z0-9\s\-:,&]+$/.test(schedule.trim());
  };

  const isValidMeetingLocation = (location) => {
    return /^[a-zA-Z\s\-',.&]+$/.test(location.trim());
  };

  // Get user type from stored session
  const getUserType = async () => {
    try {
      const userType = await AsyncStorage.getItem('userType');
      const userName = await AsyncStorage.getItem('userName');
      const userId = await AsyncStorage.getItem('userId');
      return {
        user_type: userType || 'Admin', // Default to Admin for testing - CHANGE THIS
        user_name: userName || '',
        user_id: userId || ''
      };
    } catch (error) {
      console.error('Error getting user type:', error);
      return { user_type: 'Admin', user_name: '', user_id: '' }; // Default fallback
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
        showAlert({ type: 'error', title: 'Error', message: 'Invalid JSON response from server' });
        return;
      }
      
      if (data.success) {
        setClubs(data.data || []);
        console.log(`✅ Loaded ${data.data?.length || 0} clubs`);
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to fetch clubs' });
        setClubs([]);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      showAlert({ type: 'error', title: 'Connection Error', message: error.message });
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

  // Real-time input filtering for add form
  const handleAddFormChange = (field, value) => {
    let processedValue = value;
    
    if (field === 'club_name') {
      processedValue = value.replace(/[^a-zA-Z\s\-'&]/g, '');
      if (processedValue.length > 100) {
        processedValue = processedValue.slice(0, 100);
      }
    }
    else if (field === 'description') {
      processedValue = value.replace(/[^a-zA-Z\s\-'",.!?;:()&]/g, '');
      if (processedValue.length > 500) {
        processedValue = processedValue.slice(0, 500);
      }
    }
    else if (field === 'category_id') {
      processedValue = value;
    }
    else if (field === 'patron') {
      processedValue = value;
    }
    else if (field === 'meeting_schedule') {
      processedValue = value.replace(/[^a-zA-Z0-9\s\-:,&]/g, '');
      if (processedValue.length > 100) {
        processedValue = processedValue.slice(0, 100);
      }
    }
    else if (field === 'meeting_location') {
      processedValue = value.replace(/[^a-zA-Z\s\-',.&]/g, '');
      if (processedValue.length > 200) {
        processedValue = processedValue.slice(0, 200);
      }
    }
    
    setNewClub({ ...newClub, [field]: processedValue });
  };

  // Real-time input filtering for edit form
  const handleEditFormChange = (field, value) => {
    let processedValue = value;
    
    if (field === 'club_name') {
      processedValue = value.replace(/[^a-zA-Z\s\-'&]/g, '');
      if (processedValue.length > 100) {
        processedValue = processedValue.slice(0, 100);
      }
    }
    else if (field === 'description') {
      processedValue = value.replace(/[^a-zA-Z\s\-'",.!?;:()&]/g, '');
      if (processedValue.length > 500) {
        processedValue = processedValue.slice(0, 500);
      }
    }
    else if (field === 'category_id') {
      processedValue = value;
    }
    else if (field === 'patron') {
      processedValue = value;
    }
    else if (field === 'meeting_schedule') {
      processedValue = value.replace(/[^a-zA-Z0-9\s\-:,&]/g, '');
      if (processedValue.length > 100) {
        processedValue = processedValue.slice(0, 100);
      }
    }
    else if (field === 'meeting_location') {
      processedValue = value.replace(/[^a-zA-Z\s\-',.&]/g, '');
      if (processedValue.length > 200) {
        processedValue = processedValue.slice(0, 200);
      }
    }
    
    setEditedClub({ ...editedClub, [field]: processedValue });
  };

  const validateForm = (club, isEdit = false) => {
    // Club Name validation
    if (!club.club_name.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Club name is required' });
      return false;
    }
    
    if (club.club_name.length < 3) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Club name must be at least 3 characters long' });
      return false;
    }
    
    if (club.club_name.length > 100) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Club name cannot exceed 100 characters' });
      return false;
    }
    
    if (!isValidClubName(club.club_name)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Club name can only contain letters, spaces, hyphens, apostrophes, and ampersands (&)' });
      return false;
    }
    
    // Check for duplicate club name (case-insensitive)
    const isDuplicate = clubs.some(existingClub => 
      existingClub.club_name?.toLowerCase() === club.club_name.trim().toLowerCase() &&
      (!isEdit || existingClub.club_id !== club.club_id)
    );
    
    if (isDuplicate) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'A club with this name already exists. Please use a different name.' });
      return false;
    }

    // Description validation
    if (!club.description.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description is required' });
      return false;
    }
    
    if (club.description.length < 10) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description must be at least 10 characters long' });
      return false;
    }
    
    if (club.description.length > 500) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description cannot exceed 500 characters' });
      return false;
    }
    
    if (!isValidDescription(club.description)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description contains invalid characters. Please use only letters, spaces, and common punctuation marks.' });
      return false;
    }

    // Category ID validation (optional but must be valid if provided)
    if (club.category_id) {
      const categoryIdNum = parseInt(club.category_id);
      if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Please select a valid category' });
        return false;
      }
      
      const categoryExists = categories.some(cat => cat.category_id === categoryIdNum);
      if (!categoryExists) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Selected category does not exist. Please select a valid category.' });
        return false;
      }
    }

    // Patron validation (required)
    if (!club.patron || !club.patron.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Please select a patron/advisor' });
      return false;
    }

    // Meeting Schedule validation (optional)
    if (club.meeting_schedule && club.meeting_schedule.trim()) {
      if (club.meeting_schedule.length > 100) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Meeting schedule cannot exceed 100 characters' });
        return false;
      }
      
      if (!isValidMeetingSchedule(club.meeting_schedule)) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Meeting schedule contains invalid characters. Use letters, numbers, spaces, colons, commas, and hyphens only.' });
        return false;
      }
    }

    // Meeting Location validation (optional)
    if (club.meeting_location && club.meeting_location.trim()) {
      if (club.meeting_location.length > 200) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Meeting location cannot exceed 200 characters' });
        return false;
      }
      
      if (!isValidMeetingLocation(club.meeting_location)) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Meeting location contains invalid characters. Use only letters, spaces, hyphens, apostrophes, commas, periods, and ampersands.' });
        return false;
      }
    }

    return true;
  };

  const handleAddClub = () => {
    setNewClub({
      club_name: '',
      description: '',
      category_id: '',
      patron: '',
      meeting_schedule: '',
      meeting_location: ''
    });
    setShowCategoryDropdown(false);
    setAddModalVisible(true);
  };

  const handleEditClub = (club) => {
    setEditedClub({
      club_id: club.club_id,
      club_name: club.club_name,
      description: club.description || '',
      category_id: club.category_id ? club.category_id.toString() : '',
      patron: club.patron || '',
      meeting_schedule: club.meeting_schedule || '',
      meeting_location: club.meeting_location || ''
    });
    setShowCategoryDropdown(false);
    setEditModalVisible(true);
  };

  const handleDeleteClub = (club) => {
    showAlert({
      type: 'confirm',
      title: 'Delete Club',
      message: `Are you sure you want to delete "${club.club_name}"? This action cannot be undone and may affect all members associated with this club.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => confirmDelete(club.club_id) }
      ]
    });
  };

  const confirmDelete = async (club_id) => {
    try {
      // Get user type from stored session
      const userInfo = await getUserType();
      
      console.log('🗑️ Deleting club with user_type:', userInfo.user_type); // Debug log
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          club_id: club_id,
          user_type: userInfo.user_type,  // ✅ FIX: Added user_type
          user_id: userInfo.user_id,       // Optional: for logging
          user_name: userInfo.user_name    // Optional: for logging
        })
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('Parse error:', text);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Club deleted successfully!' });
        fetchClubs();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to delete club.' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleAddFormSubmit = async () => {
    if (!validateForm(newClub, false)) return;

    try {
      const userInfo = await getUserType();
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          club_name: newClub.club_name.trim(),
          description: newClub.description.trim(),
          category_id: newClub.category_id ? parseInt(newClub.category_id) : null,
          patron: newClub.patron.trim(),
          meeting_schedule: newClub.meeting_schedule.trim(),
          meeting_location: newClub.meeting_location.trim(),
          created_by: userInfo.user_id,  // Optional: track who created
          user_type: userInfo.user_type   // Optional: for permission checks
        })
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Club added successfully!' });
        setAddModalVisible(false);
        fetchClubs();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add club.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleEditFormSubmit = async () => {
    if (!validateForm(editedClub, true)) return;

    try {
      const userInfo = await getUserType();
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          club_id: editedClub.club_id,
          club_name: editedClub.club_name.trim(),
          description: editedClub.description.trim(),
          category_id: editedClub.category_id ? parseInt(editedClub.category_id) : null,
          patron: editedClub.patron.trim(),
          meeting_schedule: editedClub.meeting_schedule.trim(),
          meeting_location: editedClub.meeting_location.trim(),
          user_type: userInfo.user_type,  // For permission checks
          user_id: userInfo.user_id,       // For permission checks
          user_name: userInfo.user_name    // For patron matching
        })
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Club updated successfully!' });
        setEditModalVisible(false);
        fetchClubs();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update club.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.category_id === categoryId);
    return category ? category.category_name : 'Uncategorized';
  };

  const renderClubCard = (club) => (
    <View style={styles.clubCard}>
      <View style={styles.cardHeader}>
        <View style={styles.clubInfo}>
          <Text style={styles.clubName}>{club.club_name}</Text>
          <Text style={styles.clubCategory}>Category: {getCategoryName(club.category_id)}</Text>
          <Text style={styles.clubDescription}>{club.description}</Text>
          <View style={styles.clubDetails}>
            {club.patron && <Text style={styles.clubDetail}>👤 Club Leader: {club.patron}</Text>}
            {club.meeting_schedule && <Text style={styles.clubDetail}>📅 Schedule: {club.meeting_schedule}</Text>}
            {club.meeting_location && <Text style={styles.clubDetail}>📍 Location: {club.meeting_location}</Text>}
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditClub(club)}
        >
          <MaterialIcons name="edit" size={16} color={COLORS.warning} />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteClub(club)}
        >
          <MaterialIcons name="delete" size={16} color={COLORS.error} />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
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

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'AdminDashboard' })}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Clubs</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddClub}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by club name, patron, or location..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.grey}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewNumber}>{clubs.length}</Text>
          <Text style={styles.overviewLabel}>Total Clubs</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchClubs}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Clubs List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading clubs...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.clubsList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={clubs.length === 0 ? { flexGrow: 1 } : {}}
          refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchClubs(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {filteredClubs.length > 0 ? (
            filteredClubs.map((club) => (
              <View key={club.club_id}>
                {renderClubCard(club)}
              </View>
            ))
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="groups" size={64} color={COLORS.grey} />
              <Text style={styles.noDataText}>
                {searchQuery ? 'No clubs match your search' : 'No clubs found'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddClub}>
                  <Text style={styles.addFirstButtonText}>Add Your First Club</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Club Modal */}
      <Modal animationType="slide" transparent visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Club</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Club Name * (3-100 characters)" 
                  value={newClub.club_name} 
                  onChangeText={(text) => handleAddFormChange('club_name', text)} 
                  placeholderTextColor={COLORS.grey}
                  maxLength={100}
                />
                
                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Description * (10-500 characters)" 
                  value={newClub.description} 
                  onChangeText={(text) => handleAddFormChange('description', text)} 
                  placeholderTextColor={COLORS.grey}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                
                <Text style={styles.dropdownLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    if (showCategoryDropdown && activeDropdownFor === 'add') {
                      setShowCategoryDropdown(false);
                    } else {
                      setShowCategoryDropdown(true);
                      setActiveDropdownFor('add');
                    }
                  }}
                >
                  <Text style={[styles.dropdownText, !newClub.category_id && styles.dropdownPlaceholder]}>
                    {newClub.category_id
                      ? categories.find(c => c.category_id === parseInt(newClub.category_id))?.category_name || 'Select Category'
                      : 'Select Category'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.grey} />
                </TouchableOpacity>
                {showCategoryDropdown && activeDropdownFor === 'add' && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                      {categories.length === 0 ? (
                        <Text style={styles.dropdownEmpty}>No categories available</Text>
                      ) : (
                        categories.map(cat => (
                          <TouchableOpacity
                            key={cat.category_id}
                            style={[styles.dropdownItem, parseInt(newClub.category_id) === cat.category_id && styles.dropdownItemActive]}
                            onPress={() => {
                              setNewClub({ ...newClub, category_id: cat.category_id.toString() });
                              setShowCategoryDropdown(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, parseInt(newClub.category_id) === cat.category_id && styles.dropdownItemTextActive]}>
                              {cat.category_name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
                
                <Text style={styles.dropdownLabel}>Club Leader</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Enter club leader name" 
                  value={newClub.patron} 
                  onChangeText={(text) => handleAddFormChange('patron', text)} 
                  placeholderTextColor={COLORS.grey}
                />
                
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Meeting Schedule (e.g., Monday 3PM)" 
                  value={newClub.meeting_schedule} 
                  onChangeText={(text) => handleAddFormChange('meeting_schedule', text)} 
                  placeholderTextColor={COLORS.grey}
                  maxLength={100}
                />
                
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Meeting Location" 
                  value={newClub.meeting_location} 
                  onChangeText={(text) => handleAddFormChange('meeting_location', text)} 
                  placeholderTextColor={COLORS.grey}
                  maxLength={200}
                />
                
                <TouchableOpacity style={styles.submitButton} onPress={handleAddFormSubmit}>
                  <Text style={styles.submitButtonText}>Add Club</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Club Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Club</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Club Name * (3-100 characters)" 
                  value={editedClub.club_name} 
                  onChangeText={(text) => handleEditFormChange('club_name', text)} 
                  placeholderTextColor={COLORS.grey}
                  maxLength={100}
                />
                
                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Description * (10-500 characters)" 
                  value={editedClub.description} 
                  onChangeText={(text) => handleEditFormChange('description', text)} 
                  placeholderTextColor={COLORS.grey}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                
                <Text style={styles.dropdownLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => {
                    if (showCategoryDropdown && activeDropdownFor === 'edit') {
                      setShowCategoryDropdown(false);
                    } else {
                      setShowCategoryDropdown(true);
                      setActiveDropdownFor('edit');
                    }
                  }}
                >
                  <Text style={[styles.dropdownText, !editedClub.category_id && styles.dropdownPlaceholder]}>
                    {editedClub.category_id
                      ? categories.find(c => c.category_id === parseInt(editedClub.category_id))?.category_name || 'Select Category'
                      : 'Select Category'}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.grey} />
                </TouchableOpacity>
                {showCategoryDropdown && activeDropdownFor === 'edit' && (
                  <View style={styles.dropdownList}>
                    <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                      {categories.length === 0 ? (
                        <Text style={styles.dropdownEmpty}>No categories available</Text>
                      ) : (
                        categories.map(cat => (
                          <TouchableOpacity
                            key={cat.category_id}
                            style={[styles.dropdownItem, parseInt(editedClub.category_id) === cat.category_id && styles.dropdownItemActive]}
                            onPress={() => {
                              setEditedClub({ ...editedClub, category_id: cat.category_id.toString() });
                              setShowCategoryDropdown(false);
                            }}
                          >
                            <Text style={[styles.dropdownItemText, parseInt(editedClub.category_id) === cat.category_id && styles.dropdownItemTextActive]}>
                              {cat.category_name}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
                
                <Text style={styles.dropdownLabel}>Club Leader</Text>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Enter club leader name" 
                  value={editedClub.patron} 
                  onChangeText={(text) => handleEditFormChange('patron', text)} 
                  placeholderTextColor={COLORS.grey}
                />
                
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Meeting Schedule" 
                  value={editedClub.meeting_schedule} 
                  onChangeText={(text) => handleEditFormChange('meeting_schedule', text)} 
                  placeholderTextColor={COLORS.grey}
                  maxLength={100}
                />
                
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Meeting Location" 
                  value={editedClub.meeting_location} 
                  onChangeText={(text) => handleEditFormChange('meeting_location', text)} 
                  placeholderTextColor={COLORS.grey}
                  maxLength={200}
                />
                
                <TouchableOpacity style={styles.submitButton} onPress={handleEditFormSubmit}>
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  clubsList: { flex: 1, paddingHorizontal: 16 },
  clubCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clubInfo: { flex: 1 },
  clubName: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  clubCategory: { fontSize: 12, color: COLORS.primary, marginBottom: 8, fontFamily: FONTS.medium },
  clubDescription: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 20 },
  clubDetails: { marginTop: 8 },
  clubDetail: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 4 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGrey,
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
  editButton: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  deleteButton: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  actionText: { fontSize: 14, marginLeft: 4, fontFamily: FONTS.medium },
  editText: { color: COLORS.warning },
  deleteText: { color: COLORS.error },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  formInput: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontFamily: FONTS.bold },
  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.medium },
  dropdownLabel: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 6, marginTop: 4 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  dropdownText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.text, flex: 1 },
  dropdownPlaceholder: { color: COLORS.grey },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: -12,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGrey },
  dropdownItemActive: { backgroundColor: COLORS.primary + '15' },
  dropdownItemText: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.text },
  dropdownItemTextActive: { color: COLORS.primary, fontFamily: FONTS.bold },
  dropdownEmpty: { padding: 16, textAlign: 'center', color: COLORS.grey, fontFamily: FONTS.regular },
});

export default ManageClubs;