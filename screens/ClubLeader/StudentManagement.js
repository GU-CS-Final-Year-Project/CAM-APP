// screens/teacher/StudentManagement.js
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/';

const StudentManagement = ({ navigation }) => {
  const { showAlert } = useAlert();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [filterFaculty, setFilterFaculty] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [userInfo, setUserInfo] = useState(null);
  const [studentStats, setStudentStats] = useState({
    total: 0,
    active: 0,
  });

  // Filter options
  const faculties = ['all', 'Science & Technology', 'Business & Management', 'Arts & Social Sciences', 'Law', 'Medicine', 'Education', 'Engineering'];
  const yearsOfStudy = ['all', 'First Year', 'Second Year', 'Third Year', 'Fourth Year', 'Fifth Year'];

  useEffect(() => {
    loadUserInfo();
    fetchStudents();
  }, []);

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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch all students (teachers can view all students)
      const response = await fetch(`${API_URL}students.php?action=get`);
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data || []);
        setFilteredStudents(data.data || []);
        calculateStats(data.data || []);
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to fetch students' });
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentsData) => {
    const total = studentsData.length;
    const active = studentsData.filter(s => s.student_status === 'Active' || s.status === 'Active').length;
    
    setStudentStats({
      total,
      active,
    });
  };

  const fetchStudentDetails = async (studentId) => {
    try {
      const response = await fetch(`${API_URL}students.php?action=get_one&id=${studentId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedStudent(data.data);
        setDetailsModalVisible(true);
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to fetch student details' });
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchStudents(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...students];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Faculty filter
    if (filterFaculty !== 'all') {
      filtered = filtered.filter(student => student.faculty === filterFaculty);
    }
    
    // Year filter
    if (filterYear !== 'all') {
      filtered = filtered.filter(student => student.year_of_study === filterYear);
    }
    
    setFilteredStudents(filtered);
  }, [searchQuery, filterFaculty, filterYear, students]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#5CB85C';
      case 'Inactive': return '#E74C3C';
      case 'Graduated': return '#3498DB';
      case 'Suspended': return '#F39C12';
      default: return '#7f8c8d';
    }
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
    <TouchableOpacity
      key={student.user_id || student.student_id}
      style={styles.studentCard}
      activeOpacity={0.7}
      onPress={() => fetchStudentDetails(student.user_id || student.student_id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="person" size={40} color="#4A90E2" />
        </View>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.user_name || student.student_name}</Text>
          <Text style={styles.studentNumber}>📚 {student.student_number || 'N/A'}</Text>
          <Text style={styles.studentEmail}>{student.email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.student_status || student.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(student.student_status || student.status) }]}>
            {student.student_status || student.status || 'Active'}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <MaterialIcons name="school" size={16} color="#7f8c8d" />
          <Text style={styles.footerText}>{student.faculty || 'N/A'}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons name="book" size={16} color="#7f8c8d" />
          <Text style={styles.footerText}>{student.year_of_study || 'N/A'}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons name="phone" size={16} color="#7f8c8d" />
          <Text style={styles.footerText}>{student.phone || 'N/A'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClubLeaderDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Management</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{studentStats.total}</Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#5CB85C' }]}>{studentStats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or student number..."
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

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, filterFaculty === 'all' && styles.filterChipActive]}
            onPress={() => setFilterFaculty('all')}
          >
            <Text style={[styles.filterText, filterFaculty === 'all' && styles.filterTextActive]}>All Faculties</Text>
          </TouchableOpacity>
          {faculties.slice(1).map(faculty => (
            <TouchableOpacity
              key={faculty}
              style={[styles.filterChip, filterFaculty === faculty && styles.filterChipActive]}
              onPress={() => setFilterFaculty(faculty)}
            >
              <Text style={[styles.filterText, filterFaculty === faculty && styles.filterTextActive]}>{faculty}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.secondFilterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterYear === 'all' && styles.filterChipActive]}
            onPress={() => setFilterYear('all')}
          >
            <Text style={[styles.filterText, filterYear === 'all' && styles.filterTextActive]}>All Years</Text>
          </TouchableOpacity>
          {yearsOfStudy.slice(1).map(year => (
            <TouchableOpacity
              key={year}
              style={[styles.filterChip, filterYear === year && styles.filterChipActive]}
              onPress={() => setFilterYear(year)}
            >
              <Text style={[styles.filterText, filterYear === year && styles.filterTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Students Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'} found
        </Text>
      </View>

      {/* Students List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A90E2']}
              tintColor="#4A90E2"
            />
          }
        >
          {filteredStudents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="school" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No students found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'No students registered yet'}
              </Text>
            </View>
          ) : (
            filteredStudents.map(renderStudentCard)
          )}
        </ScrollView>
      )}

      {/* Student Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedStudent && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                  <View style={styles.profileAvatar}>
                    <MaterialIcons name="account-circle" size={80} color="#4A90E2" />
                  </View>
                  <Text style={styles.profileName}>{selectedStudent.user_name || selectedStudent.student_name}</Text>
                  <Text style={styles.profileEmail}>{selectedStudent.email}</Text>
                  <View style={[styles.profileStatus, { backgroundColor: getStatusColor(selectedStudent.student_status || selectedStudent.status) + '20' }]}>
                    <Text style={[styles.profileStatusText, { color: getStatusColor(selectedStudent.student_status || selectedStudent.status) }]}>
                      {selectedStudent.student_status || selectedStudent.status || 'Active'}
                    </Text>
                  </View>
                </View>

                {/* Personal Information */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Student Number:</Text>
                    <Text style={styles.infoValue}>{selectedStudent.student_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{selectedStudent.phone || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Faculty:</Text>
                    <Text style={styles.infoValue}>{selectedStudent.faculty || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Year of Study:</Text>
                    <Text style={styles.infoValue}>{selectedStudent.year_of_study || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Enrollment Date:</Text>
                    <Text style={styles.infoValue}>{formatDate(selectedStudent.enrollment_date)}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      navigation.navigate('StudentActivityHistory', { studentId: selectedStudent.user_id });
                    }}
                  >
                    <MaterialIcons name="history" size={20} color="#4A90E2" />
                    <Text style={styles.actionButtonText}>View Activity History</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      navigation.navigate('StudentClubMemberships', { studentId: selectedStudent.user_id });
                    }}
                  >
                    <MaterialIcons name="groups" size={20} color="#4A90E2" />
                    <Text style={styles.actionButtonText}>View Club Memberships</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
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
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#4A90E2' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  filterSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  secondFilterRow: {
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  filterChipActive: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  countContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    fontSize: 13,
    color: '#666',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 2,
  },
  studentNumber: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 2,
  },
  studentEmail: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
      android: { elevation: 5 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  profileStatus: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  profileStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#7f8c8d',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  actionButtons: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  closeModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StudentManagement;