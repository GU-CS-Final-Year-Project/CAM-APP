// screens/admin/ManageTeachers.js - Complete CRUD Operations
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
import DateTimePicker from '@react-native-community/datetimepicker';

// API URL for teacher operations
const API_URL = 'http://192.168.43.107/cam/teachers.php';

const ManageTeachers = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerDate, setDatePickerDate] = useState(new Date());
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlert();

  const [newTeacher, setNewTeacher] = useState({
    teacher_name: '',
    employee_number: '',
    department: '',
    course_unit: '',
    hiredate: '',
    email: '',
    password: '',
    phone: '',
    status: 'Active'
  });

  const [editedTeacher, setEditedTeacher] = useState({
    teacher_id: null,
    teacher_name: '',
    employee_number: '',
    department: '',
    course_unit: '',
    hiredate: '',
    email: '',
    phone: '',
    status: 'Active'
  });

  const statusTypes = ['Active', 'Inactive', 'On Leave'];
  const departments = ['Science', 'Mathematics', 'Languages', 'Social Studies', 'Technology', 'Arts', 'Physical Education'];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (addModalVisible) {
        setNewTeacher({ ...newTeacher, hiredate: formattedDate });
      } else if (editModalVisible) {
        setEditedTeacher({ ...editedTeacher, hiredate: formattedDate });
      }
    }
  };

  const openDatePicker = () => {
    setDatePickerDate(new Date());
    setShowDatePicker(true);
  };

  // Fetch teachers from the API - FIXED
  const fetchTeachers = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching teachers from:', `${API_URL}?action=get`);
      
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
      console.log('Raw response:', text);
      
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response format from server' });
        return;
      }
      
      console.log('Parsed data:', data);
      
      if (data.success) {
        console.log('✅ Teachers fetched successfully');
        
        // FIXED: Extract teachers array correctly
        let teachersData = [];
        
        // Check different possible response structures
        if (data.data && Array.isArray(data.data)) {
          teachersData = data.data;
        } else if (data.data && data.data.teachers && Array.isArray(data.data.teachers)) {
          teachersData = data.data.teachers;
        } else if (data.teachers && Array.isArray(data.teachers)) {
          teachersData = data.teachers;
        } else if (Array.isArray(data)) {
          teachersData = data;
        }
        
        console.log('Extracted teachers data:', teachersData);
        
        if (teachersData.length > 0) {
          // Format the teachers data
          const formattedTeachers = teachersData.map(teacher => ({
            teacher_id: teacher.teacher_id,
            user_id: teacher.user_id,
            employee_number: teacher.employee_number,
            department: teacher.department,
            course_unit: teacher.course_unit,
            hiredate: teacher.hiredate,
            status: teacher.status,
            teacher_name: teacher.teacher_name || `Teacher ${teacher.employee_number}`,
            email: teacher.email || '',
            phone: teacher.phone || ''
          }));
          
          console.log('Formatted teachers:', formattedTeachers);
          setTeachers(formattedTeachers);
          console.log(`✅ Loaded ${formattedTeachers.length} teachers`);
        } else {
          console.log('ℹ️ No teachers found in response');
          setTeachers([]);
        }
      } else {
        console.log('❌ API returned error:', data.message);
        setTeachers([]);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      showAlert({ type: 'error', title: 'Connection Error', message: `Cannot connect to server: ${error.message}` });
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter teachers based on search query
  const filteredTeachers = useMemo(() => {
    if (!searchQuery) return teachers;
    
    return teachers.filter(teacher =>
      teacher.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.employee_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.course_unit?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [teachers, searchQuery]);

  const handleAddTeacher = () => {
    setNewTeacher({
      teacher_name: '',
      employee_number: '',
      department: '',
      course_unit: '',
      hiredate: '',
      email: '',
      password: '',
      phone: '',
      status: 'Active'
    });
    setAddModalVisible(true);
  };

  const handleEditTeacher = (teacher) => {
    setEditedTeacher({
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.teacher_name,
      employee_number: teacher.employee_number,
      department: teacher.department,
      course_unit: teacher.course_unit,
      hiredate: teacher.hiredate,
      email: teacher.email,
      phone: teacher.phone || '',
      status: teacher.status || 'Active'
    });
    setEditModalVisible(true);
  };

  const handleDeleteTeacher = (teacher) => {
    showAlert({
      type: 'confirm',
      title: 'Delete Teacher',
      message: `Are you sure you want to delete ${teacher.teacher_name}? This will also remove their user account.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => confirmDelete(teacher.teacher_id) }
      ]
    });
  };

  const confirmDelete = async (teacher_id) => {
    try {
      console.log('🗑️ Deleting teacher:', teacher_id);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          teacher_id: teacher_id
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
        showAlert({ type: 'success', title: 'Success', message: 'Teacher deleted successfully!' });
        fetchTeachers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to delete teacher.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleAddFormChange = (field, value) => {
    setNewTeacher({ ...newTeacher, [field]: value });
  };

  const handleEditFormChange = (field, value) => {
    setEditedTeacher({ ...editedTeacher, [field]: value });
  };

  const validateForm = (teacher, isEdit = false) => {
    if (!teacher.teacher_name?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Teacher name is required' });
      return false;
    }
    if (!teacher.employee_number?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Employee number is required' });
      return false;
    }
    if (!teacher.department?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Department is required' });
      return false;
    }
    if (!teacher.course_unit?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Course unit is required' });
      return false;
    }
    if (!teacher.hiredate) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Hire date is required' });
      return false;
    }
    if (!isEdit) {
      if (!teacher.email?.trim()) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Email is required' });
        return false;
      }
      if (!teacher.password?.trim()) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Password is required' });
        return false;
      }
      if (teacher.password?.length < 6) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Password must be at least 6 characters' });
        return false;
      }
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(teacher.hiredate)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Hire date must be in YYYY-MM-DD format' });
      return false;
    }
    return true;
  };

  const handleAddFormSubmit = async () => {
    if (!validateForm(newTeacher)) return;

    try {
      console.log('➕ Adding teacher:', newTeacher);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          teacher_name: newTeacher.teacher_name,
          employee_number: newTeacher.employee_number,
          department: newTeacher.department,
          course_unit: newTeacher.course_unit,
          hiredate: newTeacher.hiredate,
          email: newTeacher.email,
          password: newTeacher.password,
          phone: newTeacher.phone,
          status: newTeacher.status,
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
        showAlert({ type: 'success', title: 'Success', message: 'Teacher added successfully!' });
        setAddModalVisible(false);
        fetchTeachers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add teacher.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleEditFormSubmit = async () => {
    if (!validateForm(editedTeacher, true)) return;

    try {
      console.log('✏️ Updating teacher:', editedTeacher);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          teacher_id: editedTeacher.teacher_id,
          teacher_name: editedTeacher.teacher_name,
          employee_number: editedTeacher.employee_number,
          department: editedTeacher.department,
          course_unit: editedTeacher.course_unit,
          hiredate: editedTeacher.hiredate,
          email: editedTeacher.email,
          phone: editedTeacher.phone,
          status: editedTeacher.status,
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
        showAlert({ type: 'success', title: 'Success', message: 'Teacher updated successfully!' });
        setEditModalVisible(false);
        fetchTeachers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update teacher.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return COLORS.primaryLight;
      case 'Inactive': return COLORS.warning;
      case 'On Leave': return COLORS.info;
      default: return COLORS.textSecondary;
    }
  };

  const getTeacherStats = () => {
    const total = teachers.length;
    const active = teachers.filter(teacher => teacher.status === 'Active').length;
    const inactive = teachers.filter(teacher => teacher.status === 'Inactive').length;
    const onLeave = teachers.filter(teacher => teacher.status === 'On Leave').length;
    return { total, active, inactive, onLeave };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderTeacherCard = (teacher) => (
    <View key={teacher.teacher_id} style={styles.teacherCard}>
      <View style={styles.cardHeader}>
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{teacher.teacher_name}</Text>
          <Text style={styles.teacherId}>Employee #: {teacher.employee_number}</Text>
          {teacher.email ? <Text style={styles.teacherDetail}>📧 {teacher.email}</Text> : null}
          <Text style={styles.teacherDetail}>🏛️ Department: {teacher.department}</Text>
          <Text style={styles.teacherDetail}>📚 Course Unit: {teacher.course_unit}</Text>
          {teacher.phone ? <Text style={styles.teacherDetail}>📞 Phone: {teacher.phone}</Text> : null}
          <Text style={styles.teacherDate}>📅 Hire Date: {formatDate(teacher.hiredate)}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(teacher.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(teacher.status) }]}>
              {teacher.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditTeacher(teacher)}
        >
          <MaterialIcons name="edit" size={16} color="#F39C12" />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteTeacher(teacher)}
        >
          <MaterialIcons name="delete" size={16} color="#e74c3c" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTeachers();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const stats = getTeacherStats();

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Teachers</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddTeacher}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, employee number, department, or email..."
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

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewNumber}>{stats.total}</Text>
          <Text style={styles.overviewLabel}>Total Teachers</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.primaryLight }]}>{stats.active}</Text>
          <Text style={styles.overviewLabel}>Active</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.warning }]}>{stats.inactive}</Text>
          <Text style={styles.overviewLabel}>Inactive</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.info }]}>{stats.onLeave}</Text>
          <Text style={styles.overviewLabel}>On Leave</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchTeachers}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Teachers List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading teachers...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.teachersList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={teachers.length === 0 ? { flexGrow: 1 } : {}}
          refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchTeachers(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map((teacher) => renderTeacherCard(teacher))
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="person-off" size={64} color="#ccc" />
              <Text style={styles.noDataText}>
                {searchQuery ? 'No teachers match your search' : 'No teachers found'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddTeacher}>
                  <Text style={styles.addFirstButtonText}>Add Your First Teacher</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Teacher Modal */}
      <Modal animationType="slide" transparent visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Teacher</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Full Name *" 
                  value={newTeacher.teacher_name} 
                  onChangeText={(text) => handleAddFormChange('teacher_name', text)} 
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Employee Number *" 
                  value={newTeacher.employee_number} 
                  onChangeText={(text) => handleAddFormChange('employee_number', text)} 
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Email Address *" 
                  value={newTeacher.email} 
                  onChangeText={(text) => handleAddFormChange('email', text)} 
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Password * (min 6 characters)" 
                  value={newTeacher.password} 
                  onChangeText={(text) => handleAddFormChange('password', text)} 
                  secureTextEntry
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Phone (Optional)" 
                  value={newTeacher.phone} 
                  onChangeText={(text) => handleAddFormChange('phone', text)} 
                  keyboardType="phone-pad"
                  placeholderTextColor="#999" 
                />

                {/* Department Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Department *</Text>
                  <View style={styles.gradeOptions}>
                    {departments.map((dept) => (
                      <TouchableOpacity 
                        key={dept} 
                        style={[styles.gradeOption, newTeacher.department === dept && styles.gradeOptionSelected]} 
                        onPress={() => handleAddFormChange('department', dept)}
                      >
                        <Text style={[styles.gradeOptionText, newTeacher.department === dept && styles.gradeOptionTextSelected]}>
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput 
                  style={styles.formInput} 
                  placeholder="Course Unit *" 
                  value={newTeacher.course_unit} 
                  onChangeText={(text) => handleAddFormChange('course_unit', text)} 
                  placeholderTextColor="#999" 
                />

                {/* Hire Date Picker */}
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={openDatePicker}
                >
                  <Text style={newTeacher.hiredate ? { color: COLORS.text } : { color: COLORS.grey }}>
                    {newTeacher.hiredate || 'Hire Date * (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>

                {/* Status Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Status *</Text>
                  <View style={styles.statusOptions}>
                    {statusTypes.map((status) => (
                      <TouchableOpacity 
                        key={status} 
                        style={[styles.statusOption, newTeacher.status === status && styles.statusOptionSelected]} 
                        onPress={() => handleAddFormChange('status', status)}
                      >
                        <Text style={[styles.statusOptionText, newTeacher.status === status && styles.statusOptionTextSelected]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <TouchableOpacity style={styles.submitButton} onPress={handleAddFormSubmit}>
                  <Text style={styles.submitButtonText}>Add Teacher</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Teacher</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: COLORS.lightGrey }]} 
                  placeholder="Teacher ID" 
                  value={editedTeacher.teacher_id ? editedTeacher.teacher_id.toString() : ''} 
                  editable={false} 
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Full Name *" 
                  value={editedTeacher.teacher_name} 
                  onChangeText={(text) => handleEditFormChange('teacher_name', text)} 
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Employee Number *" 
                  value={editedTeacher.employee_number} 
                  onChangeText={(text) => handleEditFormChange('employee_number', text)} 
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Email Address *" 
                  value={editedTeacher.email} 
                  onChangeText={(text) => handleEditFormChange('email', text)} 
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#999" 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Phone" 
                  value={editedTeacher.phone} 
                  onChangeText={(text) => handleEditFormChange('phone', text)} 
                  keyboardType="phone-pad"
                  placeholderTextColor="#999" 
                />

                {/* Department Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Department *</Text>
                  <View style={styles.gradeOptions}>
                    {departments.map((dept) => (
                      <TouchableOpacity 
                        key={dept} 
                        style={[styles.gradeOption, editedTeacher.department === dept && styles.gradeOptionSelected]} 
                        onPress={() => handleEditFormChange('department', dept)}
                      >
                        <Text style={[styles.gradeOptionText, editedTeacher.department === dept && styles.gradeOptionTextSelected]}>
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TextInput 
                  style={styles.formInput} 
                  placeholder="Course Unit *" 
                  value={editedTeacher.course_unit} 
                  onChangeText={(text) => handleEditFormChange('course_unit', text)} 
                  placeholderTextColor="#999" 
                />

                {/* Hire Date Picker */}
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={openDatePicker}
                >
                  <Text style={editedTeacher.hiredate ? { color: COLORS.text } : { color: COLORS.grey }}>
                    {editedTeacher.hiredate || 'Hire Date * (YYYY-MM-DD)'}
                  </Text>
                </TouchableOpacity>

                {/* Status Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Status *</Text>
                  <View style={styles.statusOptions}>
                    {statusTypes.map((status) => (
                      <TouchableOpacity 
                        key={status} 
                        style={[styles.statusOption, editedTeacher.status === status && styles.statusOptionSelected]} 
                        onPress={() => handleEditFormChange('status', status)}
                      >
                        <Text style={[styles.statusOptionText, editedTeacher.status === status && styles.statusOptionTextSelected]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
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

// ==================== STYLES ====================
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.white, flex: 1, textAlign: 'center' },
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
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: COLORS.text, fontFamily: FONTS.regular },
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
  overviewNumber: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.primary },
  overviewLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center', fontFamily: FONTS.regular },
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
  refreshText: { color: COLORS.primary, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium, marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  teachersList: { flex: 1, paddingHorizontal: 16 },
  teacherCard: {
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
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  teacherId: { fontSize: 14, color: COLORS.primary, marginBottom: 2, fontWeight: '500', fontFamily: FONTS.medium },
  teacherDetail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 2, fontFamily: FONTS.regular },
  teacherDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontFamily: FONTS.regular },
  statusContainer: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },
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
  actionText: { fontSize: 14, marginLeft: 4, fontWeight: '500', fontFamily: FONTS.medium },
  editText: { color: '#F39C12', fontFamily: FONTS.medium },
  deleteText: { color: '#e74c3c', fontFamily: FONTS.medium },
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
  modalTitle: { fontSize: 22, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.text },
  formInput: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
    justifyContent: 'center',
  },
  pickerContainer: { marginBottom: 16 },
  pickerLabel: { fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 8 },
  gradeOptions: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  gradeOption: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.lightGrey,
    alignItems: 'center',
    marginHorizontal: 2,
    marginBottom: 8,
  },
  gradeOptionSelected: { backgroundColor: COLORS.primary },
  gradeOptionText: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.textSecondary, textAlign: 'center' },
  gradeOptionTextSelected: { color: COLORS.white },
  statusOptions: { flexDirection: 'row', justifyContent: 'space-between' },
  statusOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGrey,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statusOptionSelected: { backgroundColor: COLORS.primary },
  statusOptionText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.textSecondary },
  statusOptionTextSelected: { color: COLORS.white },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold },
  noDataContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  noDataText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center', fontFamily: FONTS.regular },
  addFirstButton: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 8, 
    marginTop: 16 
  },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageTeachers;