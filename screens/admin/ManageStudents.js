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

// API URL for student operations
const API_URL = 'http://192.168.43.107/cam/students.php';

const ManageStudents = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlert();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  const [newStudent, setNewStudent] = useState({
    student_name: '',
    student_number: '',
    email: '',
    password: '',
    phone: '',
    faculty: '',
    year_of_study: '',
    enrollment_date: '',
    status: 'Active'
  });

  const [editedStudent, setEditedStudent] = useState({
    student_id: null,
    student_name: '',
    student_number: '',
    email: '',
    phone: '',
    faculty: '',
    year_of_study: '',
    enrollment_date: '',
    status: 'Active'
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState('');
  const [datePickerDate, setDatePickerDate] = useState(new Date());

  const statusTypes = ['Active', 'Graduated', 'Transferred', 'Inactive'];
  const faculties = ['Science & Technology', 'Business & Management', 'Arts & Social Sciences', 'Law', 'Medicine & Health Sciences', 'Education', 'Engineering'];
  const yearsOfStudy = ['First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year'];

  // Helper validation functions
  const containsNumber = (str) => {
    return /\d/.test(str);
  };

  const containsLetter = (str) => {
    return /[a-zA-Z]/.test(str);
  };

  const isValidName = (name) => {
    return /^[a-zA-Z\s\-']+$/.test(name.trim());
  };

  const isValidStudentNumber = (num) => {
    const digitsOnly = num.replace(/\D/g, '');
    return digitsOnly.length === 10 && /^\d+$/.test(digitsOnly);
  };

  const isValidEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const isValidPhone = (phone) => {
    if (!phone) return true; // Phone is optional
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching students from:', `${API_URL}?action=get`);
      
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
      
      if (data.success) {
        console.log('✅ Students fetched successfully');
        setStudents(data.data || []);
        console.log(`✅ Loaded ${data.data?.length || 0} students`);
      } else {
        console.log('❌ API returned error:', data.message);
        setStudents([]);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      showAlert({ type: 'error', title: 'Connection Error', message: `Cannot connect to server: ${error.message}` });
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    
    return students.filter(student =>
      student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.faculty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.year_of_study?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // Real-time input filtering for add form
  const handleAddFormChange = (field, value) => {
    let processedValue = value;
    
    if (field === 'student_name') {
      // Only allow letters, spaces, hyphens, and apostrophes
      processedValue = value.replace(/[^a-zA-Z\s\-']/g, '');
    }
    else if (field === 'student_number') {
      // Only allow digits, max 10 characters
      let digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length > 10) {
        digitsOnly = digitsOnly.slice(0, 10);
      }
      processedValue = digitsOnly;
    }
    else if (field === 'email') {
      // Allow email characters, convert to lowercase
      processedValue = value.toLowerCase();
    }
    else if (field === 'phone') {
      // Only allow digits, +, -, spaces for phone numbers
      processedValue = value.replace(/[^\d\s\+-]/g, '');
      if (processedValue.replace(/\D/g, '').length > 15) {
        const digitsOnly = processedValue.replace(/\D/g, '').slice(0, 15);
        processedValue = digitsOnly;
      }
    }
    
    setNewStudent({ ...newStudent, [field]: processedValue });
  };

  // Real-time input filtering for edit form
  const handleEditFormChange = (field, value) => {
    let processedValue = value;
    
    if (field === 'student_name') {
      // Only allow letters, spaces, hyphens, and apostrophes
      processedValue = value.replace(/[^a-zA-Z\s\-']/g, '');
    }
    else if (field === 'student_number') {
      // Only allow digits, max 10 characters
      let digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length > 10) {
        digitsOnly = digitsOnly.slice(0, 10);
      }
      processedValue = digitsOnly;
    }
    else if (field === 'email') {
      // Allow email characters, convert to lowercase
      processedValue = value.toLowerCase();
    }
    else if (field === 'phone') {
      // Only allow digits, +, -, spaces for phone numbers
      processedValue = value.replace(/[^\d\s\+-]/g, '');
      if (processedValue.replace(/\D/g, '').length > 15) {
        const digitsOnly = processedValue.replace(/\D/g, '').slice(0, 15);
        processedValue = digitsOnly;
      }
    }
    
    setEditedStudent({ ...editedStudent, [field]: processedValue });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      if (addModalVisible) {
        setNewStudent({ ...newStudent, [datePickerField]: formattedDate });
      } else if (editModalVisible) {
        setEditedStudent({ ...editedStudent, [datePickerField]: formattedDate });
      }
    }
  };

  const openDatePicker = (field, currentDate = '') => {
    setDatePickerField(field);
    if (currentDate) {
      setDatePickerDate(new Date(currentDate));
    } else {
      setDatePickerDate(new Date());
    }
    setShowDatePicker(true);
  };

  const validateForm = (student, isEdit = false) => {
    // Student Name validation
    if (!student.student_name?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Student name is required' });
      return false;
    }
    if (containsNumber(student.student_name)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Student name should not contain numbers' });
      return false;
    }
    if (!isValidName(student.student_name)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Student name can only contain letters, spaces, hyphens, and apostrophes' });
      return false;
    }

    // Student Number validation
    if (!student.student_number?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Student number is required' });
      return false;
    }
    if (!isValidStudentNumber(student.student_number)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Student number must be exactly 10 digits (numbers only)' });
      return false;
    }

    // Email validation (only for new students)
    if (!isEdit) {
      if (!student.email?.trim()) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Email is required' });
        return false;
      }
      if (!isValidEmail(student.email)) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Please enter a valid email address' });
        return false;
      }
    } else {
      // For edit, email is required but we don't require password validation
      if (!student.email?.trim()) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Email is required' });
        return false;
      }
      if (!isValidEmail(student.email)) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Please enter a valid email address' });
        return false;
      }
    }

    // Password validation (only for new students)
    if (!isEdit) {
      if (!student.password?.trim()) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Password is required' });
        return false;
      }
      if (student.password.length < 6) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Password must be at least 6 characters' });
        return false;
      }
      if (student.password.length > 20) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Password must be at most 20 characters' });
        return false;
      }
    }

    // Phone validation (optional but must be valid if provided)
    if (student.phone && student.phone.trim()) {
      if (containsLetter(student.phone)) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Phone number should not contain letters' });
        return false;
      }
      if (!isValidPhone(student.phone)) {
        showAlert({ type: 'warning', title: 'Validation Error', message: 'Phone number must have at least 10 digits' });
        return false;
      }
    }

    // Faculty validation
    if (!student.faculty?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Faculty is required' });
      return false;
    }

    // Year of study validation
    if (!student.year_of_study?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Year of study is required' });
      return false;
    }

    // Enrollment date validation
    if (!student.enrollment_date) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Enrollment date is required' });
      return false;
    }

    return true;
  };

  const handleAddStudent = () => {
    const today = new Date().toISOString().split('T')[0];
    setNewStudent({
      student_name: '',
      student_number: '',
      email: '',
      password: '',
      phone: '',
      faculty: '',
      year_of_study: '',
      enrollment_date: today,
      status: 'Active'
    });
    setAddModalVisible(true);
  };

  const handleEditStudent = (student) => {
    setEditedStudent({
      student_id: student.student_id,
      student_name: student.student_name,
      student_number: student.student_number,
      email: student.email,
      phone: student.phone || '',
      faculty: student.faculty,
      year_of_study: student.year_of_study,
      enrollment_date: student.enrollment_date,
      status: student.status || 'Active'
    });
    setEditModalVisible(true);
  };

  const handleDeleteStudent = (student) => {
    showAlert({
      type: 'confirm',
      title: 'Delete Student',
      message: `Are you sure you want to delete ${student.student_name}? This will also remove their user account.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => confirmDelete(student.student_id) }
      ]
    });
  };

  const confirmDelete = async (student_id) => {
    try {
      console.log('🗑️ Deleting student:', student_id);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          student_id: student_id
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
showAlert({ type: 'success', title: 'Success', message: 'Student deleted successfully!' });
        fetchStudents();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to delete student.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleAddFormSubmit = async () => {
    if (!validateForm(newStudent, false)) return;

    try {
      console.log('➕ Adding student:', newStudent);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          student_name: newStudent.student_name.trim(),
          student_number: newStudent.student_number.trim(),
          email: newStudent.email.trim(),
          password: newStudent.password,
          phone: newStudent.phone.trim(),
          faculty: newStudent.faculty,
          year_of_study: newStudent.year_of_study,
          enrollment_date: newStudent.enrollment_date,
          status: newStudent.status,
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
showAlert({ type: 'success', title: 'Success', message: 'Student added successfully!' });
        setAddModalVisible(false);
        fetchStudents();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add student.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleEditFormSubmit = async () => {
    if (!validateForm(editedStudent, true)) return;

    try {
      console.log('✏️ Updating student:', editedStudent);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          student_id: editedStudent.student_id,
          student_name: editedStudent.student_name.trim(),
          student_number: editedStudent.student_number.trim(),
          email: editedStudent.email.trim(),
          phone: editedStudent.phone.trim(),
          faculty: editedStudent.faculty,
          year_of_study: editedStudent.year_of_study,
          enrollment_date: editedStudent.enrollment_date,
          status: editedStudent.status,
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
showAlert({ type: 'success', title: 'Success', message: 'Student updated successfully!' });
        setEditModalVisible(false);
        fetchStudents();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update student.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return COLORS.primaryLight;
      case 'Graduated': return '#9B59B6';
      case 'Transferred': return '#3498DB';
      case 'Inactive': return COLORS.warning;
      default: return COLORS.textSecondary;
    }
  };

  const getStudentStats = () => {
    const total = students.length;
    const active = students.filter(student => student.status === 'Active').length;
    const graduated = students.filter(student => student.status === 'Graduated').length;
    const transferred = students.filter(student => student.status === 'Transferred').length;
    const inactive = students.filter(student => student.status === 'Inactive').length;
    
    return { total, active, graduated, transferred, inactive };
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

  const renderStudentCard = (student) => (
    <View key={student.student_id} style={styles.studentCard}>
      <View style={styles.cardHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.student_name}</Text>
          <Text style={styles.studentId}>Student #: {student.student_number}</Text>
          <Text style={styles.studentDetail}>📧 {student.email}</Text>
          <Text style={styles.studentDetail}>🎓 Faculty: {student.faculty}</Text>
          <Text style={styles.studentDetail}>📖 Year: {student.year_of_study}</Text>
          {student.phone && <Text style={styles.studentDetail}>📞 Phone: {student.phone}</Text>}
          <Text style={styles.studentDate}>📅 Enrollment: {formatDate(student.enrollment_date)}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(student.status) }]}>
              {student.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditStudent(student)}
        >
          <MaterialIcons name="edit" size={16} color={COLORS.warning} />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteStudent(student)}
        >
          <MaterialIcons name="delete" size={16} color={COLORS.error} />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStudents();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const stats = getStudentStats();

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Students</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddStudent}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, student number, email, or faculty..."
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
          <Text style={styles.overviewNumber}>{stats.total}</Text>
          <Text style={styles.overviewLabel}>Total Students</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.primaryLight }]}>{stats.active}</Text>
          <Text style={styles.overviewLabel}>Active</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: '#9B59B6' }]}>{stats.graduated}</Text>
          <Text style={styles.overviewLabel}>Graduated</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.warning }]}>{stats.inactive}</Text>
          <Text style={styles.overviewLabel}>Inactive</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchStudents}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Students List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.studentsList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={students.length === 0 ? { flexGrow: 1 } : {}}
          refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchStudents(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => renderStudentCard(student))
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="school" size={64} color={COLORS.grey} />
              <Text style={styles.noDataText}>
                {searchQuery ? 'No students match your search' : 'No students found'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddStudent}>
                  <Text style={styles.addFirstButtonText}>Add Your First Student</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Student Modal */}
      <Modal animationType="slide" transparent visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Student</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Full Name * (Letters only)" 
                  value={newStudent.student_name} 
                  onChangeText={(text) => handleAddFormChange('student_name', text)} 
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Student Number * (10 digits only)" 
                  value={newStudent.student_number} 
                  onChangeText={(text) => handleAddFormChange('student_number', text)} 
                  keyboardType="numeric"
                  maxLength={10}
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Email Address * (e.g., student@domain.com)" 
                  value={newStudent.email} 
                  onChangeText={(text) => handleAddFormChange('email', text)} 
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Password * (min 6 characters)" 
                  value={newStudent.password} 
                  onChangeText={(text) => setNewStudent({...newStudent, password: text})} 
                  secureTextEntry
                  maxLength={20}
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Phone (Optional - numbers only, min 10 digits)" 
                  value={newStudent.phone} 
                  onChangeText={(text) => handleAddFormChange('phone', text)} 
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.grey} 
                />

                {/* Faculty Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Faculty *</Text>
                  <View style={styles.gradeOptions}>
                    {faculties.map((faculty) => (
                      <TouchableOpacity 
                        key={faculty} 
                        style={[styles.gradeOption, newStudent.faculty === faculty && styles.gradeOptionSelected]} 
                        onPress={() => setNewStudent({...newStudent, faculty: faculty})}
                      >
                        <Text style={[styles.gradeOptionText, newStudent.faculty === faculty && styles.gradeOptionTextSelected]}>
                          {faculty.split(' ').slice(0, 2).join(' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Year of Study Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Year of Study *</Text>
                  <View style={styles.gradeOptions}>
                    {yearsOfStudy.map((year) => (
                      <TouchableOpacity 
                        key={year} 
                        style={[styles.gradeOption, newStudent.year_of_study === year && styles.gradeOptionSelected]} 
                        onPress={() => setNewStudent({...newStudent, year_of_study: year})}
                      >
                        <Text style={[styles.gradeOptionText, newStudent.year_of_study === year && styles.gradeOptionTextSelected]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Enrollment Date */}
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={() => openDatePicker('enrollment_date', newStudent.enrollment_date)}
                >
                  <Text style={newStudent.enrollment_date ? { color: COLORS.text } : { color: COLORS.grey }}>
                    {newStudent.enrollment_date || 'Enrollment Date *'}
                  </Text>
                </TouchableOpacity>

                {/* Status Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Status *</Text>
                  <View style={styles.statusOptions}>
                    {statusTypes.map((status) => (
                      <TouchableOpacity 
                        key={status} 
                        style={[styles.statusOption, newStudent.status === status && styles.statusOptionSelected]} 
                        onPress={() => setNewStudent({...newStudent, status: status})}
                      >
                        <Text style={[styles.statusOptionText, newStudent.status === status && styles.statusOptionTextSelected]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <TouchableOpacity style={styles.submitButton} onPress={handleAddFormSubmit}>
                  <Text style={styles.submitButtonText}>Add Student</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Student Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Student</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: COLORS.lightGrey }]} 
                  placeholder="Student ID" 
                  value={editedStudent.student_id ? editedStudent.student_id.toString() : ''} 
                  editable={false} 
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Full Name * (Letters only)" 
                  value={editedStudent.student_name} 
                  onChangeText={(text) => handleEditFormChange('student_name', text)} 
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Student Number * (10 digits only)" 
                  value={editedStudent.student_number} 
                  onChangeText={(text) => handleEditFormChange('student_number', text)} 
                  keyboardType="numeric"
                  maxLength={10}
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Email Address *" 
                  value={editedStudent.email} 
                  onChangeText={(text) => handleEditFormChange('email', text)} 
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={COLORS.grey} 
                />
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Phone (Optional - numbers only, min 10 digits)" 
                  value={editedStudent.phone} 
                  onChangeText={(text) => handleEditFormChange('phone', text)} 
                  keyboardType="phone-pad"
                  placeholderTextColor={COLORS.grey} 
                />

                {/* Faculty Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Faculty *</Text>
                  <View style={styles.gradeOptions}>
                    {faculties.map((faculty) => (
                      <TouchableOpacity 
                        key={faculty} 
                        style={[styles.gradeOption, editedStudent.faculty === faculty && styles.gradeOptionSelected]} 
                        onPress={() => setEditedStudent({...editedStudent, faculty: faculty})}
                      >
                        <Text style={[styles.gradeOptionText, editedStudent.faculty === faculty && styles.gradeOptionTextSelected]}>
                          {faculty.split(' ').slice(0, 2).join(' ')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Year of Study Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Year of Study *</Text>
                  <View style={styles.gradeOptions}>
                    {yearsOfStudy.map((year) => (
                      <TouchableOpacity 
                        key={year} 
                        style={[styles.gradeOption, editedStudent.year_of_study === year && styles.gradeOptionSelected]} 
                        onPress={() => setEditedStudent({...editedStudent, year_of_study: year})}
                      >
                        <Text style={[styles.gradeOptionText, editedStudent.year_of_study === year && styles.gradeOptionTextSelected]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Enrollment Date */}
                <TouchableOpacity
                  style={styles.formInput}
                  onPress={() => openDatePicker('enrollment_date', editedStudent.enrollment_date)}
                >
                  <Text style={editedStudent.enrollment_date ? { color: COLORS.text } : { color: COLORS.grey }}>
                    {editedStudent.enrollment_date || 'Enrollment Date *'}
                  </Text>
                </TouchableOpacity>

                {/* Status Picker */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Status *</Text>
                  <View style={styles.statusOptions}>
                    {statusTypes.map((status) => (
                      <TouchableOpacity 
                        key={status} 
                        style={[styles.statusOption, editedStudent.status === status && styles.statusOptionSelected]} 
                        onPress={() => setEditedStudent({...editedStudent, status: status})}
                      >
                        <Text style={[styles.statusOptionText, editedStudent.status === status && styles.statusOptionTextSelected]}>
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
    flex: 0.23,
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
  studentsList: { flex: 1, paddingHorizontal: 16 },
  studentCard: {
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
  studentInfo: { flex: 1 },
  studentName: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  studentId: { fontSize: 14, color: COLORS.primary, marginBottom: 2, fontFamily: FONTS.medium },
  studentDetail: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 2 },
  studentDate: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
  statusContainer: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontFamily: FONTS.medium },
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
    justifyContent: 'center',
  },
  pickerContainer: { marginBottom: 16 },
  pickerLabel: { fontSize: 16, fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 8 },
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
  gradeOptionText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textSecondary, textAlign: 'center' },
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
  statusOptionText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary },
  statusOptionTextSelected: { color: COLORS.white },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontFamily: FONTS.bold },
  noDataContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60 
  },
  noDataText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' },
  addFirstButton: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 8, 
    marginTop: 16 
  },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.medium },
});

export default ManageStudents;