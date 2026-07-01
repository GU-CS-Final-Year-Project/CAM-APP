import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/users.php';

const ManageUsers = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    user_type: 'Student',
    phone: '',
  });
  const [editedUser, setEditedUser] = useState({
    id: null,
    name: '',
    email: '',
    user_type: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const { showAlert } = useAlert();

  // UPDATED: Capitalized to match database
  const userTypes = ['Student', 'ClubLeader', 'Admin'];

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    if (!phone) return true;
    const phoneRegex = /^[0-9+\-\s()]{10,}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateName = (name) => {
    return name.trim().length >= 2 && !/[0-9]/.test(name);
  };

  // Add user validation
  const validateAddForm = () => {
    const newErrors = {};

    if (!newUser.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!validateName(newUser.name)) {
      newErrors.name = 'Name must be at least 2 characters and contain only letters';
    }

    if (!newUser.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(newUser.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!newUser.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(newUser.password)) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!newUser.user_type) {
      newErrors.user_type = 'User type is required';
    }

    if (newUser.phone && !validatePhone(newUser.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Edit user validation
  const validateEditForm = () => {
    const newErrors = {};

    if (!editedUser.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!validateName(editedUser.name)) {
      newErrors.name = 'Name must be at least 2 characters and contain only letters';
    }

    if (!editedUser.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(editedUser.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!editedUser.user_type) {
      newErrors.user_type = 'User type is required';
    }

    if (editedUser.phone && !validatePhone(editedUser.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // READ USERS
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching users from:', `${API_URL}?action=get`);
      
      const response = await fetch(`${API_URL}?action=get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('📄 Raw response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
        console.log('📊 Parsed data:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response format from server' });
        return;
      }
      
      if (data.success) {
        console.log('✅ Users fetched successfully');
        setUsers(data.data?.users || []);
      } else {
        console.error('❌ API error:', data.message);
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to fetch users' });
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers().finally(() => setRefreshing(false));
  };

  const filteredUsers = users.filter(user =>
    user.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id?.toString().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    setErrors({});
    setAddModalVisible(true);
  };

  const handleEditUser = (user) => {
    setEditErrors({});
    setCurrentUser(user);
    setEditedUser({
      id: user.user_id,
      name: user.user_name,
      email: user.email,
      user_type: user.user_type,
      phone: user.phone || '',
    });
    setEditModalVisible(true);
  };

  const handleDeleteUser = (user) => {
    showAlert({ type: 'confirm', title: 'Delete User', message: `Are you sure you want to delete ${user.user_name}?`, buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(user.user_id) }
      ] });
  };

  const confirmDelete = async (id) => {
    try {
      console.log('🗑️ Deleting user ID:', id);
      
      const response = await fetch(API_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: id
        })
      });
      
      console.log('🗑️ Delete response status:', response.status);
      
      const text = await response.text();
      console.log('🗑️ Delete response text:', text);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Delete JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'User deleted successfully!' });
        fetchUsers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to delete user.' });
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleAddFormChange = (field, value) => {
    setNewUser({ ...newUser, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const handleEditFormChange = (field, value) => {
    setEditedUser({ ...editedUser, [field]: value });
    if (editErrors[field]) {
      setEditErrors({ ...editErrors, [field]: '' });
    }
  };

  const handleAddFormSubmit = async () => {
    if (!validateAddForm()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Please fix the errors in the form.' });
      return;
    }

    try {
      console.log('➕ Adding user:', newUser);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          user_type: newUser.user_type,
          phone: newUser.phone || '',
        })
      });
      
      console.log('➕ Add response status:', response.status);
      
      const text = await response.text();
      console.log('➕ Add response text:', text);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Add JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'User added successfully!' });
        setAddModalVisible(false);
        setNewUser({ name: '', email: '', password: '', user_type: 'Student', phone: '' });
        setErrors({});
        fetchUsers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add user.' });
      }
    } catch (error) {
      console.error('❌ Add error:', error);
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleEditFormSubmit = async () => {
    if (!validateEditForm()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Please fix the errors in the form.' });
      return;
    }

    try {
      console.log('✏️ Updating user:', editedUser);
      
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: editedUser.id,
          name: editedUser.name,
          email: editedUser.email,
          user_type: editedUser.user_type,
          phone: editedUser.phone || '',
        })
      });
      
      console.log('✏️ Update response status:', response.status);
      
      const text = await response.text();
      console.log('✏️ Update response text:', text);
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Update JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'User updated successfully!' });
        setEditModalVisible(false);
        setEditErrors({});
        fetchUsers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update user.' });
      }
    } catch (error) {
      console.error('❌ Update error:', error);
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  // UPDATED: Capitalized user types to match database
  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'Admin': return '#E74C3C';
      case 'Teacher': return '#F39C12';
      case 'Student': return COLORS.primary;
      default: return COLORS.textSecondary;
    }
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case 'Admin': return 'admin-panel-settings';
      case 'Teacher': return 'school';
      case 'Student': return 'person';
      default: return 'person';
    }
  };

  const getUserStats = () => {
    const total = users.length;
    const students = users.filter(user => user.user_type === 'Student').length;
    const teachers = users.filter(user => user.user_type === 'ClubLeader').length;
    const admins = users.filter(user => user.user_type === 'Admin').length;
    return { total, students, teachers, admins };
  };

  // UPDATED: Added unique key prop to each list item
  const renderUserCard = (user) => (
    <View key={user.user_id} style={styles.userCard}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <MaterialIcons 
              name={getUserTypeIcon(user.user_type)} 
              size={20} 
              color={getUserTypeColor(user.user_type)} 
            />
            <Text style={styles.userName}>{user.user_name}</Text>
          </View>
          <Text style={styles.userId}>ID: {user.user_id}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          {user.phone && <Text style={styles.userPhone}>Phone: {user.phone}</Text>}
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.typeBadge, { backgroundColor: getUserTypeColor(user.user_type) + '20' }]}>
            <Text style={[styles.typeText, { color: getUserTypeColor(user.user_type) }]}>
              {user.user_type?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditUser(user)}
        >
          <MaterialIcons name="edit" size={16} color={COLORS.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteUser(user)}
        >
          <MaterialIcons name="delete" size={16} color="#e74c3c" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const stats = getUserStats();

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'AdminDashboard' })}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddUser}
        >
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.grey}
        />
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewNumber}>{stats.total}</Text>
          <Text style={styles.overviewLabel}>Total Users</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.primary }]}>{stats.students}</Text>
          <Text style={styles.overviewLabel}>Students</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: '#F39C12' }]}>{stats.teachers}</Text>
          <Text style={styles.overviewLabel}>Club Leaders</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: '#E74C3C' }]}>{stats.admins}</Text>
          <Text style={styles.overviewLabel}>Admins</Text>
        </View>
      </View>

      {/* Users List */}
      {loading && !refreshing ? (
        <ActivityIndicator style={styles.loadingIndicator} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          style={styles.usersList}
          data={filteredUsers}
          renderItem={({ item }) => renderUserCard(item)}
          keyExtractor={(item) => item.user_id?.toString() || Math.random().toString()}
          contentContainerStyle={filteredUsers.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : { paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={<Text style={styles.noDataText}>No users found.</Text>}
        />
      )}

      {/* Add User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New User</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.formInput, errors.name && styles.inputError]}
                placeholder="Full Name *"
                value={newUser.name}
                onChangeText={(text) => handleAddFormChange('name', text.replace(/[0-9]/g, ''))}
                placeholderTextColor={COLORS.grey}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

              <TextInput
                style={[styles.formInput, errors.email && styles.inputError]}
                placeholder="Email *"
                value={newUser.email}
                onChangeText={(text) => handleAddFormChange('email', text)}
                keyboardType="email-address"
                placeholderTextColor={COLORS.grey}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Password *"
                  value={newUser.password}
                  onChangeText={(text) => handleAddFormChange('password', text)}
                  secureTextEntry={!showPassword}
                  placeholderTextColor={COLORS.grey}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={22} color={COLORS.grey} />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <TextInput
                style={[styles.formInput, errors.phone && styles.inputError]}
                placeholder="Phone (Optional)"
                value={newUser.phone}
                onChangeText={(text) => handleAddFormChange('phone', text)}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.grey}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>User Type *</Text>
                {errors.user_type && <Text style={styles.errorText}>{errors.user_type}</Text>}
                <View style={styles.typeOptions}>
                  {userTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newUser.user_type === type && styles.typeOptionSelected
                      ]}
                      onPress={() => handleAddFormChange('user_type', type)}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        newUser.user_type === type && styles.typeOptionTextSelected
                      ]}>
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddFormSubmit}
              >
                <Text style={styles.submitButtonText}>Add User</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit User</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.formInput}
                placeholder="User ID"
                value={editedUser.id ? editedUser.id.toString() : ''}
                editable={false}
                placeholderTextColor={COLORS.grey}
              />

              <TextInput
                style={[styles.formInput, editErrors.name && styles.inputError]}
                placeholder="Full Name *"
                value={editedUser.name}
                onChangeText={(text) => handleEditFormChange('name', text.replace(/[0-9]/g, ''))}
                placeholderTextColor={COLORS.grey}
              />
              {editErrors.name && <Text style={styles.errorText}>{editErrors.name}</Text>}

              <TextInput
                style={[styles.formInput, editErrors.email && styles.inputError]}
                placeholder="Email *"
                value={editedUser.email}
                onChangeText={(text) => handleEditFormChange('email', text)}
                keyboardType="email-address"
                placeholderTextColor={COLORS.grey}
              />
              {editErrors.email && <Text style={styles.errorText}>{editErrors.email}</Text>}

              <TextInput
                style={[styles.formInput, editErrors.phone && styles.inputError]}
                placeholder="Phone"
                value={editedUser.phone}
                onChangeText={(text) => handleEditFormChange('phone', text)}
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.grey}
              />
              {editErrors.phone && <Text style={styles.errorText}>{editErrors.phone}</Text>}

              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>User Type *</Text>
                {editErrors.user_type && <Text style={styles.errorText}>{editErrors.user_type}</Text>}
                <View style={styles.typeOptions}>
                  {userTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        editedUser.user_type === type && styles.typeOptionSelected
                      ]}
                      onPress={() => handleEditFormChange('user_type', type)}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        editedUser.user_type === type && styles.typeOptionTextSelected
                      ]}>
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleEditFormSubmit}
              >
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
    fontFamily: FONTS.bold,
  },
  addButton: {
    padding: 8,
  },
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
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
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
    flex: 0.23,
    ...SHADOWS.small,
  },
  overviewNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  overviewLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  userCard: {
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
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
    fontFamily: FONTS.bold,
  },
  userId: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
    fontFamily: FONTS.regular,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
    fontFamily: FONTS.regular,
  },
  userPhone: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.medium,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  actionText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  deleteText: {
    color: '#e74c3c',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: FONTS.bold,
  },
  formInput: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: FONTS.regular,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#E74C3C',
    backgroundColor: '#FDEDEC',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
    fontFamily: FONTS.regular,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: FONTS.medium,
  },
  typeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGrey,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  typeOptionTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
});

export default ManageUsers;
