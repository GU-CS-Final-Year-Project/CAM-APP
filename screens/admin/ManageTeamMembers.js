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

const API_URL = 'http://192.168.43.107/cam/teammemberships.php';

const ManageTeamMembers = ({ navigation }) => {
  const [memberships, setMemberships] = useState([]);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [teams, setTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState(null);

  const [newMembership, setNewMembership] = useState({
    TeamID: '',
    student_id: '',
    Position: '',
    JerseyNumber: '',
    JoinDate: '',
    Status: 'Active'
  });

  const [editedMembership, setEditedMembership] = useState({
    TeamMembershipID: null,
    TeamID: '',
    student_id: '',
    student_name: '',
    Position: '',
    JerseyNumber: '',
    JoinDate: '',
    EndDate: '',
    Status: 'Active'
  });

  const { showAlert } = useAlert();

  const statusOptions = ['Active', 'Inactive', 'Suspended', 'Graduated', 'Resigned'];
  const positions = [
    'Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Striker',
    'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center',
    'Setter', 'Outside Hitter', 'Opposite', 'Middle Blocker', 'Libero',
    'Captain', 'Vice Captain', 'Player', 'Substitute', 'Reserve'
  ];

  // Fetch teams for dropdown
  const fetchTeams = async () => {
    try {
      const res = await fetch('http://192.168.43.107/cam/sportsteams.php?action=get');
      const data = await res.json();
      if (data.success) setTeams(data.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  // Fetch students for dropdown
  const fetchStudents = async () => {
    try {
      const res = await fetch('http://192.168.43.107/cam/users.php?action=get_students');
      const data = await res.json();
      if (data.success) setStudents(data.data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Fetch all memberships
  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?action=get`);
      const data = await res.json();
      if (data.success) setMemberships(data.data || []);
    } catch (error) {
      console.error(error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch team members' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newMembership.TeamID || !newMembership.student_id) {
      showAlert({ type: 'error', title: 'Error', message: 'Please select a team and a student' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          TeamID: parseInt(newMembership.TeamID),
          student_id: parseInt(newMembership.student_id),
          Position: newMembership.Position,
          JerseyNumber: newMembership.JerseyNumber ? parseInt(newMembership.JerseyNumber) : null,
          JoinDate: newMembership.JoinDate || new Date().toISOString().split('T')[0],
          Status: newMembership.Status
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Team member added successfully' });
        setAddModalVisible(false);
        resetNewForm();
        fetchMemberships();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add member' });
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          TeamMembershipID: editedMembership.TeamMembershipID,
          Position: editedMembership.Position,
          JerseyNumber: editedMembership.JerseyNumber ? parseInt(editedMembership.JerseyNumber) : null,
          JoinDate: editedMembership.JoinDate,
          EndDate: editedMembership.EndDate,
          Status: editedMembership.Status
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Team member updated successfully' });
        setEditModalVisible(false);
        fetchMemberships();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to update member' });
      }
    } catch (error) {
      console.error('Error updating team member:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const handleDelete = async (TeamMembershipID, student_name) => {
    showAlert({ type: 'confirm', title: 'Confirm Delete', message: `Are you sure you want to remove ${student_name} from this team?`, buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', TeamMembershipID })
              });
              const data = await res.json();
              if (data.success) {
                showAlert({ type: 'success', title: 'Success', message: 'Member removed successfully' });
                fetchMemberships();
              } else {
                showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to remove member' });
              }
            } catch (error) {
              console.error('Error deleting team member:', error);
              showAlert({ type: 'error', title: 'Error', message: 'Network error' });
            }
          }
        }
      ] });
  };

  const openEditModal = (membership) => {
    setEditedMembership({
      TeamMembershipID: membership.TeamMembershipID,
      TeamID: membership.TeamID,
      student_id: membership.student_id,
      student_name: membership.student_name,
      Position: membership.Position || '',
      JerseyNumber: membership.JerseyNumber?.toString() || '',
      JoinDate: membership.JoinDate || '',
      EndDate: membership.EndDate || '',
      Status: membership.Status || 'Active'
    });
    setEditModalVisible(true);
  };

  const resetNewForm = () => {
    setNewMembership({
      TeamID: '',
      student_id: '',
      Position: '',
      JerseyNumber: '',
      JoinDate: new Date().toISOString().split('T')[0],
      Status: 'Active'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#5CB85C';
      case 'Inactive': return '#E74C3C';
      case 'Suspended': return '#F39C12';
      case 'Graduated': return '#3498DB';
      case 'Resigned': return '#95A5A6';
      default: return '#7f8c8d';
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.TeamID === teamId);
    return team ? team.TeamName : 'Unknown Team';
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

  useEffect(() => {
    fetchMemberships();
    fetchTeams();
    fetchStudents();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Members</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{memberships.length}</Text>
          <Text style={styles.statLabel}>Total Members</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#5CB85C' }]}>
            {memberships.filter(m => m.Status === 'Active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#E74C3C' }]}>
            {memberships.filter(m => m.Status === 'Inactive').length}
          </Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMemberships}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Members List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchMemberships(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {memberships.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="group" size={64} color={COLORS.grey} />
              <Text style={styles.emptyText}>No team members found</Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.addFirstButtonText}>Add First Member</Text>
              </TouchableOpacity>
            </View>
          ) : (
            memberships.map(member => (
              <View key={member.TeamMembershipID} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.teamName}>{member.TeamName}</Text>
                    <Text style={styles.studentName}>{member.student_name}</Text>
                    <Text style={styles.studentEmail}>{member.student_email}</Text>
                    {member.Position && (
                      <Text style={styles.position}>Position: {member.Position}</Text>
                    )}
                    {member.JerseyNumber && (
                      <Text style={styles.jerseyNumber}>Jersey #: {member.JerseyNumber}</Text>
                    )}
                    <Text style={styles.joinDate}>Joined: {formatDate(member.JoinDate)}</Text>
                    {member.EndDate && (
                      <Text style={styles.endDate}>Ended: {formatDate(member.EndDate)}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.Status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(member.Status) }]}>
                      {member.Status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(member)}>
                    <MaterialIcons name="edit" size={18} color="#F39C12" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(member.TeamMembershipID, member.student_name)}>
                    <MaterialIcons name="delete" size={18} color="#E74C3C" />
                    <Text style={styles.deleteText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Member Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Team Member</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Team Picker */}
              <Text style={styles.inputLabel}>Select Team *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {teams.map(team => (
                  <TouchableOpacity
                    key={team.TeamID}
                    style={[
                      styles.optionChip,
                      newMembership.TeamID === team.TeamID.toString() && styles.optionChipSelected
                    ]}
                    onPress={() => setNewMembership({ ...newMembership, TeamID: team.TeamID.toString() })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newMembership.TeamID === team.TeamID.toString() && styles.optionChipTextSelected
                    ]}>
                      {team.TeamName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Student Picker */}
              <Text style={styles.inputLabel}>Select Student *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {students.map(student => (
                  <TouchableOpacity
                    key={student.user_id}
                    style={[
                      styles.optionChip,
                      newMembership.student_id === student.user_id.toString() && styles.optionChipSelected
                    ]}
                    onPress={() => setNewMembership({ ...newMembership, student_id: student.user_id.toString() })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newMembership.student_id === student.user_id.toString() && styles.optionChipTextSelected
                    ]}>
                      {student.user_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Position Picker */}
              <Text style={styles.inputLabel}>Position</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {positions.map(pos => (
                  <TouchableOpacity
                    key={pos}
                    style={[
                      styles.optionChip,
                      newMembership.Position === pos && styles.optionChipSelected
                    ]}
                    onPress={() => setNewMembership({ ...newMembership, Position: pos })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newMembership.Position === pos && styles.optionChipTextSelected
                    ]}>
                      {pos}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Jersey Number"
                value={newMembership.JerseyNumber}
                onChangeText={(text) => setNewMembership({ ...newMembership, JerseyNumber: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Join Date (YYYY-MM-DD)"
                value={newMembership.JoinDate}
                onChangeText={(text) => setNewMembership({ ...newMembership, JoinDate: text })}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusOptions}>
                {statusOptions.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      newMembership.Status === status && styles.statusChipSelected
                    ]}
                    onPress={() => setNewMembership({ ...newMembership, Status: status })}
                  >
                    <Text style={[
                      styles.statusChipText,
                      newMembership.Status === status && styles.statusChipTextSelected
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                <Text style={styles.submitButtonText}>Add Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Member Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Team Member</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.infoBox, { backgroundColor: COLORS.lightGrey, padding: 12, borderRadius: 8, marginBottom: 16 }]}>
                <Text style={styles.infoText}>Team: {getTeamName(editedMembership.TeamID)}</Text>
                <Text style={styles.infoText}>Student: {editedMembership.student_name}</Text>
              </View>

              <Text style={styles.inputLabel}>Position</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {positions.map(pos => (
                  <TouchableOpacity
                    key={pos}
                    style={[
                      styles.optionChip,
                      editedMembership.Position === pos && styles.optionChipSelected
                    ]}
                    onPress={() => setEditedMembership({ ...editedMembership, Position: pos })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      editedMembership.Position === pos && styles.optionChipTextSelected
                    ]}>
                      {pos}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Jersey Number"
                value={editedMembership.JerseyNumber}
                onChangeText={(text) => setEditedMembership({ ...editedMembership, JerseyNumber: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Join Date (YYYY-MM-DD)"
                value={editedMembership.JoinDate}
                onChangeText={(text) => setEditedMembership({ ...editedMembership, JoinDate: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="End Date (YYYY-MM-DD)"
                value={editedMembership.EndDate}
                onChangeText={(text) => setEditedMembership({ ...editedMembership, EndDate: text })}
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusOptions}>
                {statusOptions.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      editedMembership.Status === status && styles.statusChipSelected
                    ]}
                    onPress={() => setEditedMembership({ ...editedMembership, Status: status })}
                  >
                    <Text style={[
                      styles.statusChipText,
                      editedMembership.Status === status && styles.statusChipTextSelected
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleUpdate}>
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
  statNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, fontFamily: FONTS.bold },
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
  list: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
  card: {
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
  memberInfo: { flex: 1, marginRight: 12 },
  teamName: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 4, fontFamily: FONTS.bold },
  studentName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 2, fontFamily: FONTS.bold },
  studentEmail: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontFamily: FONTS.regular },
  position: { fontSize: 14, color: '#34495e', marginBottom: 2, fontFamily: FONTS.regular },
  jerseyNumber: { fontSize: 14, color: '#34495e', marginBottom: 2, fontWeight: '500', fontFamily: FONTS.medium },
  joinDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontFamily: FONTS.regular },
  endDate: { fontSize: 12, color: '#E74C3C', marginTop: 2, fontFamily: FONTS.regular },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  deleteButton: { flexDirection: 'row', alignItems: 'center' },
  editText: { color: '#F39C12', marginLeft: 6 },
  deleteText: { color: '#E74C3C', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.bold },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 12, fontFamily: FONTS.medium },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, fontFamily: FONTS.regular },
  categoryScroll: { flexDirection: 'row', maxHeight: 50, marginBottom: 16 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8 },
  optionChipSelected: { backgroundColor: COLORS.primary },
  optionChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  optionChipTextSelected: { color: COLORS.white },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8, marginBottom: 8 },
  statusChipSelected: { backgroundColor: COLORS.primary },
  statusChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  statusChipTextSelected: { color: COLORS.white },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', fontFamily: FONTS.bold },
  infoBox: { marginBottom: 16 },
  infoText: { fontSize: 14, color: COLORS.text, marginBottom: 4, fontFamily: FONTS.regular },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontFamily: FONTS.regular },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageTeamMembers;
