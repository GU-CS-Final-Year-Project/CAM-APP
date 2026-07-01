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
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

// Use consistent IP address for all API calls
const BASE_URL = 'http://192.168.43.107/cam';
const API_URL = `${BASE_URL}/activityparticipants.php`;

const ManageActivityParticipants = ({ navigation, route }) => {
  const [participants, setParticipants] = useState([]);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [activities, setActivities] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(route?.params?.activityId || null);
  const [newParticipant, setNewParticipant] = useState({
    ActivityID: route?.params?.activityId?.toString() || '',
    StudentID: '',
    AttendanceStatus: 'Registered',
    Notes: ''
  });

  const { showAlert } = useAlert();

  const statusOptions = ['Registered', 'Confirmed', 'Attended', 'Absent', 'Cancelled', 'Waitlisted'];

  // Fetch activities for dropdown - FIXED IP ADDRESS
  const fetchActivities = async () => {
    try {
      const res = await fetch(`${BASE_URL}/activities.php?action=get`);
      const data = await res.json();
      if (data.success) setActivities(data.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch activities: ' + error.message });
    }
  };

  // Fetch students for dropdown - FIXED IP ADDRESS
  const fetchStudents = async () => {
    try {
      const res = await fetch(`${BASE_URL}/users.php?action=get_students`);
      const data = await res.json();
      if (data.success) {
        setStudents(data.data || []);
      } else {
        // Mock data if endpoint doesn't exist yet
        setStudents([
          { user_id: 1, user_name: 'John Doe', email: 'john@example.com' },
          { user_id: 2, user_name: 'Jane Smith', email: 'jane@example.com' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      // Mock data for testing
      setStudents([
        { user_id: 1, user_name: 'John Doe', email: 'john@example.com' },
        { user_id: 2, user_name: 'Jane Smith', email: 'jane@example.com' },
      ]);
      showAlert({ type: 'warning', title: 'Warning', message: 'Using demo student data' });
    }
  };

  const fetchParticipants = async () => {
    if (!selectedActivityId) {
      setParticipants([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?action=get_by_activity&activity_id=${selectedActivityId}`);
      const data = await res.json();
      if (data.success) setParticipants(data.data || []);
    } catch (error) {
      console.error(error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch participants: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newParticipant.ActivityID || !newParticipant.StudentID) {
      showAlert({ type: 'error', title: 'Error', message: 'Please select an activity and a student' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          ActivityID: parseInt(newParticipant.ActivityID),
          StudentID: parseInt(newParticipant.StudentID),
          AttendanceStatus: newParticipant.AttendanceStatus,
          Notes: newParticipant.Notes
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Participant added successfully' });
        setAddModalVisible(false);
        setNewParticipant({
          ActivityID: '',
          StudentID: '',
          AttendanceStatus: 'Registered',
          Notes: ''
        });
        fetchParticipants();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add participant' });
      }
    } catch (error) {
      console.error('Error adding participant:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error: ' + error.message });
    }
  };

  const handleDelete = async (ParticipationID) => {
    showAlert({ type: 'confirm', title: 'Confirm Delete', message: 'Are you sure you want to remove this participant?', buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', ParticipationID })
              });
              const data = await res.json();
              if (data.success) {
                showAlert({ type: 'success', title: 'Success', message: 'Participant removed successfully' });
                fetchParticipants();
              } else {
                showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to remove participant' });
              }
            } catch (error) {
              console.error('Error deleting participant:', error);
              showAlert({ type: 'error', title: 'Error', message: 'Network error: ' + error.message });
            }
          }
        }
      ] });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Attended': return '#5CB85C';
      case 'Registered': return '#F0AD4E';
      case 'Confirmed': return '#5BC0DE';
      case 'Absent': return '#E74C3C';
      case 'Cancelled': return '#95A5A6';
      case 'Waitlisted': return '#F39C12';
      default: return '#7f8c8d';
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (activities.length > 0 && !selectedActivityId) {
      setSelectedActivityId(activities[0].ActivityID);
      setNewParticipant(prev => ({ ...prev, ActivityID: activities[0].ActivityID.toString() }));
    }
  }, [activities]);

  useEffect(() => {
    if (selectedActivityId) {
      setNewParticipant(prev => ({ ...prev, ActivityID: selectedActivityId.toString() }));
      fetchParticipants();
    }
  }, [selectedActivityId]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'AdminDashboard' })} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Participants</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Activity Selector */}
      <View style={styles.activitySelector}>
        <Text style={styles.selectorLabel}>Select Activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
          {activities.map(activity => (
            <TouchableOpacity
              key={activity.ActivityID}
              style={[styles.optionChip, selectedActivityId === activity.ActivityID && styles.optionChipSelected]}
              onPress={() => setSelectedActivityId(activity.ActivityID)}
            >
              <Text style={[styles.optionChipText, selectedActivityId === activity.ActivityID && styles.optionChipTextSelected]}>
                {activity.ActivityName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{participants.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#5CB85C' }]}>
            {participants.filter(p => p.AttendanceStatus === 'Attended').length}
          </Text>
          <Text style={styles.statLabel}>Attended</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F0AD4E' }]}>
            {participants.filter(p => p.AttendanceStatus === 'Registered').length}
          </Text>
          <Text style={styles.statLabel}>Registered</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchParticipants}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Participants List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchParticipants(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {participants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people" size={64} color={COLORS.grey} />
              <Text style={styles.emptyText}>No participants found</Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.addFirstButtonText}>Add First Participant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            participants.map(p => (
              <View key={p.ParticipationID} style={styles.card}>
                <Text style={styles.activityName}>{p.ActivityName}</Text>
                <Text style={styles.studentName}>👤 {p.student_name}</Text>
                <Text style={styles.email}>📧 {p.email}</Text>
                {p.Notes && <Text style={styles.notes}>📝 {p.Notes}</Text>}
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(p.AttendanceStatus) + '20', alignSelf: 'flex-start' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(p.AttendanceStatus) }]}>{p.AttendanceStatus}</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p.ParticipationID)}>
                  <MaterialIcons name="delete" size={18} color="#E74C3C" />
                  <Text style={styles.deleteText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Participant Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Participant</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Activity Picker */}
              <Text style={styles.inputLabel}>Select Activity *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {activities.map(activity => (
                  <TouchableOpacity
                    key={activity.ActivityID}
                    style={[
                      styles.optionChip,
                      newParticipant.ActivityID === activity.ActivityID.toString() && styles.optionChipSelected
                    ]}
                    onPress={() => setNewParticipant({ ...newParticipant, ActivityID: activity.ActivityID.toString() })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newParticipant.ActivityID === activity.ActivityID.toString() && styles.optionChipTextSelected
                    ]}>
                      {activity.ActivityName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Student Picker */}
              <Text style={styles.inputLabel}>Select Student *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {students.map(student => (
                  <TouchableOpacity
                    key={student.user_id}
                    style={[
                      styles.optionChip,
                      newParticipant.StudentID === student.user_id.toString() && styles.optionChipSelected
                    ]}
                    onPress={() => setNewParticipant({ ...newParticipant, StudentID: student.user_id.toString() })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newParticipant.StudentID === student.user_id.toString() && styles.optionChipTextSelected
                    ]}>
                      {student.user_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Status Picker */}
              <Text style={styles.inputLabel}>Attendance Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {statusOptions.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.optionChip,
                      newParticipant.AttendanceStatus === status && styles.optionChipSelected
                    ]}
                    onPress={() => setNewParticipant({ ...newParticipant, AttendanceStatus: status })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newParticipant.AttendanceStatus === status && styles.optionChipTextSelected
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes (Optional)"
                value={newParticipant.Notes}
                onChangeText={(text) => setNewParticipant({ ...newParticipant, Notes: text })}
                multiline
                numberOfLines={3}
                placeholderTextColor={COLORS.grey}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleAdd}>
                <Text style={styles.submitBtnText}>Add Participant</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, flex: 1, textAlign: 'center', fontFamily: FONTS.bold },
  addButton: { padding: 8 },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    ...SHADOWS.small,
  },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, fontFamily: FONTS.bold },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontFamily: FONTS.regular },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
  },
  refreshText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginLeft: 8, fontFamily: FONTS.medium },
  list: { padding: 16, flex: 1 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  activityName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.bold },
  studentName: { fontSize: 14, color: '#34495e', marginTop: 4, fontFamily: FONTS.regular },
  email: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  notes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontStyle: 'italic', fontFamily: FONTS.regular },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  statusText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  deleteText: { color: '#E74C3C', marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.bold },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 12, fontFamily: FONTS.medium },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, fontFamily: FONTS.regular },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  activitySelector: { marginHorizontal: 16, marginTop: 12 },
  selectorLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8, fontFamily: FONTS.medium },
  optionScroll: { flexDirection: 'row', marginBottom: 16 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8 },
  optionChipSelected: { backgroundColor: COLORS.primary },
  optionChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  optionChipTextSelected: { color: COLORS.white },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', fontFamily: FONTS.bold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontFamily: FONTS.regular },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageActivityParticipants;
