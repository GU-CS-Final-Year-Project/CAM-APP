// screens/ClubLeader/ClubLeaderActivityParticipants.js
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
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/activityparticipants.php';
const ACTIVITIES_API_URL = 'http://192.168.43.107/cam/activities.php';
const USERS_API_URL = 'http://192.168.43.107/cam/users.php';

const ClubLeaderActivityParticipants = ({ navigation, route }) => {
  const { showAlert } = useAlert();
  const [participants, setParticipants] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [selectedActivityName, setSelectedActivityName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    loadUserInfo();
    fetchActivities();
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

  const fetchActivities = async () => {
    const paramId = route?.params?.activityId;
    const paramName = route?.params?.activityName;
    if (paramId) {
      setSelectedActivityId(paramId);
      setSelectedActivityName(paramName || '');
      return;
    }
    try {
      const response = await fetch(`${ACTIVITIES_API_URL}?action=get`);
      const data = await response.json();
      if (data.success) {
        setActivities(data.data || []);
        if (data.data.length > 0) {
          setSelectedActivityId(data.data[0].ActivityID);
          setSelectedActivityName(data.data[0].ActivityName);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchParticipants = async () => {
    if (!selectedActivityId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}?action=get_by_activity&activity_id=${selectedActivityId}`);
      const data = await response.json();
      if (data.success) {
        setParticipants(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${USERS_API_URL}?action=get_students`);
      const data = await response.json();
      if (data.success) {
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudent || !selectedActivityId) return;
    setAddingStudent(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          ActivityID: selectedActivityId,
          StudentID: selectedStudent.user_id,
          AttendanceStatus: 'Registered',
        }),
      });
      const data = await response.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Added', message: `${selectedStudent.user_name} has been added to this activity.` });
        setAddModalVisible(false);
        setSelectedStudent(null);
        setStudentSearch('');
        fetchParticipants();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add student' });
      }
    } catch (error) {
      console.error('Error adding student to activity:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    } finally {
      setAddingStudent(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.user_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const updateAttendance = async (participationId, status) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_attendance',
          participation_id: participationId,
          attendance_status: status
        })
      });
      const data = await response.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: `Attendance marked as ${status}` });
        fetchParticipants();
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to update attendance' });
    }
  };

  useEffect(() => {
    if (selectedActivityId) {
      fetchParticipants();
    }
  }, [selectedActivityId]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchParticipants(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Attended': return '#5CB85C';
      case 'Registered': return '#F0AD4E';
      case 'Confirmed': return '#5BC0DE';
      case 'Absent': return '#E74C3C';
      default: return '#7f8c8d';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'ClubLeaderDashboard' })} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Participants</Text>
        <TouchableOpacity
          onPress={() => { setAddModalVisible(true); setStudentSearch(''); setSelectedStudent(null); }}
          style={styles.addButton}
        >
          <MaterialIcons name="person-add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {selectedActivityId && (
        <View style={styles.activityInfo}>
          <Text style={styles.activityName}>{selectedActivityName}</Text>
          <Text style={styles.participantCount}>{participants.length} participants registered</Text>
        </View>
      )}

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 20 }} />
        ) : participants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No participants found</Text>
          </View>
        ) : (
          participants.map(participant => (
            <View key={participant.ParticipationID} style={styles.participantCard}>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>{participant.student_name}</Text>
                <Text style={styles.participantEmail}>{participant.student_email}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(participant.AttendanceStatus) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(participant.AttendanceStatus) }]}>
                    {participant.AttendanceStatus}
                  </Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.attendedBtn]}
                  onPress={() => updateAttendance(participant.ParticipationID, 'Attended')}
                >
                  <MaterialIcons name="check-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Mark Attended</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.absentBtn]}
                  onPress={() => updateAttendance(participant.ParticipationID, 'Absent')}
                >
                  <MaterialIcons name="cancel" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>Mark Absent</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Student Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Student</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor="#999"
              value={studentSearch}
              onChangeText={setStudentSearch}
            />

            <ScrollView style={styles.studentList} showsVerticalScrollIndicator={false}>
              {filteredStudents.length === 0 ? (
                <Text style={styles.noStudents}>No students found</Text>
              ) : (
                filteredStudents.map(student => (
                  <TouchableOpacity
                    key={student.user_id}
                    style={[styles.studentItem, selectedStudent?.user_id === student.user_id && styles.studentItemSelected]}
                    onPress={() => setSelectedStudent(student)}
                  >
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {student.user_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.user_name}</Text>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                    </View>
                    {selectedStudent?.user_id === student.user_id && (
                      <MaterialIcons name="check-circle" size={20} color="#4A90E2" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitBtn, !selectedStudent && styles.submitBtnDisabled]}
              onPress={handleAddStudent}
              disabled={!selectedStudent || addingStudent}
            >
              {addingStudent ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Add to Activity</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  backButton: { padding: 8 },
  addButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },

  activityInfo: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  activityName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  participantCount: { fontSize: 12, color: '#7f8c8d', marginTop: 4 },
  list: { flex: 1, paddingHorizontal: 16 },
  participantCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  participantInfo: { marginBottom: 12 },
  participantName: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  participantEmail: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
  attendedBtn: { backgroundColor: '#5CB85C' },
  absentBtn: { backgroundColor: '#E74C3C' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 16 },

  // Add modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  searchInput: { backgroundColor: '#f5f7fa', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', marginBottom: 12 },
  studentList: { maxHeight: 400, marginBottom: 16 },
  noStudents: { textAlign: 'center', color: '#999', paddingVertical: 20 },
  studentItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 4 },
  studentItemSelected: { backgroundColor: '#EBF5FB' },
  studentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentAvatarText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', color: '#2c3e50' },
  studentEmail: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  submitBtn: { backgroundColor: '#4A90E2', padding: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ClubLeaderActivityParticipants;