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

const API_URL = 'http://192.168.43.107/cam/sportsteams.php';

const ManageSportsTeams = ({ navigation }) => {
  const [teams, setTeams] = useState([]);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  const [newTeam, setNewTeam] = useState({
    TeamName: '',
    SportCategoryID: '',
    Season: '',
    Division: '',
    MaxPlayers: '25',
    Status: 'Pending',
    CoachID: '',
    AssistantCoachID: '',
    EstablishedDate: ''
  });

  const [editedTeam, setEditedTeam] = useState({
    TeamID: null,
    TeamName: '',
    SportCategoryID: '',
    Season: '',
    Division: '',
    MaxPlayers: '25',
    Status: 'Pending',
    CoachID: '',
    AssistantCoachID: '',
    EstablishedDate: ''
  });

  const { showAlert } = useAlert();

  const statusOptions = ['Active', 'Pending', 'Inactive', 'Dissolved', 'Suspended'];

  // Fetch categories for dropdown
  const fetchCategories = async () => {
    try {
      const res = await fetch('http://192.168.43.107/cam/sportscategories.php?action=get');
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?action=get`);
      const data = await res.json();
      if (data.success) setTeams(data.data || []);
    } catch (error) {
      console.error(error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch teams' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTeam.TeamName || !newTeam.SportCategoryID || !newTeam.Season) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in all required fields' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          ...newTeam,
          SportCategoryID: parseInt(newTeam.SportCategoryID),
          MaxPlayers: parseInt(newTeam.MaxPlayers),
          CoachID: newTeam.CoachID ? parseInt(newTeam.CoachID) : null,
          AssistantCoachID: newTeam.AssistantCoachID ? parseInt(newTeam.AssistantCoachID) : null
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Team added successfully' });
        setAddModalVisible(false);
        setNewTeam({
          TeamName: '',
          SportCategoryID: '',
          Season: '',
          Division: '',
          MaxPlayers: '25',
          Status: 'Pending',
          CoachID: '',
          AssistantCoachID: '',
          EstablishedDate: ''
        });
        fetchTeams();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add team' });
      }
    } catch (error) {
      console.error('Error adding team:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const handleUpdate = async () => {
    if (!editedTeam.TeamName || !editedTeam.SportCategoryID || !editedTeam.Season) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in all required fields' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          TeamID: editedTeam.TeamID,
          TeamName: editedTeam.TeamName,
          SportCategoryID: parseInt(editedTeam.SportCategoryID),
          Season: editedTeam.Season,
          Division: editedTeam.Division,
          MaxPlayers: parseInt(editedTeam.MaxPlayers),
          Status: editedTeam.Status,
          CoachID: editedTeam.CoachID ? parseInt(editedTeam.CoachID) : null,
          AssistantCoachID: editedTeam.AssistantCoachID ? parseInt(editedTeam.AssistantCoachID) : null,
          EstablishedDate: editedTeam.EstablishedDate
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Team updated successfully' });
        setEditModalVisible(false);
        fetchTeams();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to update team' });
      }
    } catch (error) {
      console.error('Error updating team:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const handleDelete = async (TeamID) => {
    showAlert({ type: 'confirm', title: 'Confirm Delete', message: 'Are you sure you want to delete this team?', buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', TeamID })
              });
              const data = await res.json();
              if (data.success) {
                showAlert({ type: 'success', title: 'Success', message: 'Team deleted successfully' });
                fetchTeams();
              } else {
                showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to delete team' });
              }
            } catch (error) {
              console.error('Error deleting team:', error);
              showAlert({ type: 'error', title: 'Error', message: 'Network error' });
            }
          }
        }
      ] });
  };

  const openEditModal = (team) => {
    setEditedTeam({
      TeamID: team.TeamID,
      TeamName: team.TeamName,
      SportCategoryID: team.SportCategoryID?.toString() || '',
      Season: team.Season || '',
      Division: team.Division || '',
      MaxPlayers: team.MaxPlayers?.toString() || '25',
      Status: team.Status || 'Pending',
      CoachID: team.CoachID?.toString() || '',
      AssistantCoachID: team.AssistantCoachID?.toString() || '',
      EstablishedDate: team.EstablishedDate || ''
    });
    setEditModalVisible(true);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.SportCategoryID === categoryId);
    return category ? category.CategoryName : 'Unknown';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#5CB85C';
      case 'Pending': return '#F0AD4E';
      case 'Inactive': return '#E74C3C';
      case 'Dissolved': return '#34495E';
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

  useEffect(() => {
    fetchTeams();
    fetchCategories();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sports Teams</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{teams.length}</Text>
          <Text style={styles.statLabel}>Total Teams</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#5CB85C' }]}>
            {teams.filter(t => t.Status === 'Active').length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F0AD4E' }]}>
            {teams.filter(t => t.Status === 'Pending').length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchTeams}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Teams List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchTeams(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {teams.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="sports" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No teams found</Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.addFirstButtonText}>Add Your First Team</Text>
              </TouchableOpacity>
            </View>
          ) : (
            teams.map(team => (
              <View key={team.TeamID} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.TeamName}</Text>
                    <Text style={styles.categoryName}>
                      Category: {getCategoryName(team.SportCategoryID)}
                    </Text>
                    <Text style={styles.teamDetail}>Season: {team.Season}</Text>
                    {team.Division && (
                      <Text style={styles.teamDetail}>Division: {team.Division}</Text>
                    )}
                    <Text style={styles.teamDetail}>Max Players: {team.MaxPlayers}</Text>
                    {team.EstablishedDate && (
                      <Text style={styles.teamDetail}>
                        Established: {formatDate(team.EstablishedDate)}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(team.Status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(team.Status) }]}>
                      {team.Status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(team)}>
                    <MaterialIcons name="edit" size={18} color="#F39C12" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(team.TeamID)}>
                    <MaterialIcons name="delete" size={18} color="#E74C3C" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Team Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Sports Team</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Team Name *"
                value={newTeam.TeamName}
                onChangeText={(text) => setNewTeam({ ...newTeam, TeamName: text })}
              />
              
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Sport Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.SportCategoryID}
                      style={[
                        styles.categoryChip,
                        newTeam.SportCategoryID === cat.SportCategoryID.toString() && styles.categoryChipSelected
                      ]}
                      onPress={() => setNewTeam({ ...newTeam, SportCategoryID: cat.SportCategoryID.toString() })}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        newTeam.SportCategoryID === cat.SportCategoryID.toString() && styles.categoryChipTextSelected
                      ]}>
                        {cat.CategoryName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Season * (e.g., 2024-2025)"
                value={newTeam.Season}
                onChangeText={(text) => setNewTeam({ ...newTeam, Season: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Division (e.g., Premier League)"
                value={newTeam.Division}
                onChangeText={(text) => setNewTeam({ ...newTeam, Division: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Max Players"
                value={newTeam.MaxPlayers}
                onChangeText={(text) => setNewTeam({ ...newTeam, MaxPlayers: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Coach ID (optional)"
                value={newTeam.CoachID}
                onChangeText={(text) => setNewTeam({ ...newTeam, CoachID: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Assistant Coach ID (optional)"
                value={newTeam.AssistantCoachID}
                onChangeText={(text) => setNewTeam({ ...newTeam, AssistantCoachID: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Established Date (YYYY-MM-DD)"
                value={newTeam.EstablishedDate}
                onChangeText={(text) => setNewTeam({ ...newTeam, EstablishedDate: text })}
              />

              <Text style={styles.pickerLabel}>Status</Text>
              <View style={styles.statusOptions}>
                {statusOptions.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      newTeam.Status === status && styles.statusChipSelected
                    ]}
                    onPress={() => setNewTeam({ ...newTeam, Status: status })}
                  >
                    <Text style={[
                      styles.statusChipText,
                      newTeam.Status === status && styles.statusChipTextSelected
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                <Text style={styles.submitButtonText}>Add Team</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Team Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Sports Team</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { backgroundColor: '#e9ecef' }]}
                placeholder="Team ID"
                value={editedTeam.TeamID?.toString()}
                editable={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Team Name *"
                value={editedTeam.TeamName}
                onChangeText={(text) => setEditedTeam({ ...editedTeam, TeamName: text })}
              />
              
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Sport Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.SportCategoryID}
                      style={[
                        styles.categoryChip,
                        editedTeam.SportCategoryID === cat.SportCategoryID.toString() && styles.categoryChipSelected
                      ]}
                      onPress={() => setEditedTeam({ ...editedTeam, SportCategoryID: cat.SportCategoryID.toString() })}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        editedTeam.SportCategoryID === cat.SportCategoryID.toString() && styles.categoryChipTextSelected
                      ]}>
                        {cat.CategoryName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Season *"
                value={editedTeam.Season}
                onChangeText={(text) => setEditedTeam({ ...editedTeam, Season: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Division"
                value={editedTeam.Division}
                onChangeText={(text) => setEditedTeam({ ...editedTeam, Division: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Max Players"
                value={editedTeam.MaxPlayers}
                onChangeText={(text) => setEditedTeam({ ...editedTeam, MaxPlayers: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Coach ID"
                value={editedTeam.CoachID}
                onChangeText={(text) => setEditedTeam({ ...editedTeam, CoachID: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Assistant Coach ID"
                value={editedTeam.AssistantCoachID}
                onChangeText={(text) => setEditedTeam({ ...editedTeam, AssistantCoachID: text })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Established Date (YYYY-MM-DD)"
                value={editedTeam.EstablishedDate}
                onChangeText={(text) => setEditedTeam({ ...editedTeam, EstablishedDate: text })}
              />

              <Text style={styles.pickerLabel}>Status</Text>
              <View style={styles.statusOptions}>
                {statusOptions.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      editedTeam.Status === status && styles.statusChipSelected
                    ]}
                    onPress={() => setEditedTeam({ ...editedTeam, Status: status })}
                  >
                    <Text style={[
                      styles.statusChipText,
                      editedTeam.Status === status && styles.statusChipTextSelected
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
    backgroundColor: COLORS.headerBg,
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
  statNumber: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.primary },
  statLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
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
  refreshText: { color: COLORS.primary, fontSize: 14, fontFamily: FONTS.bold, marginLeft: 8 },
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
  teamInfo: { flex: 1, marginRight: 12 },
  teamName: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  categoryName: { fontSize: 14, color: COLORS.primary, marginBottom: 2, fontFamily: FONTS.medium },
  teamDetail: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2, fontFamily: FONTS.regular },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontFamily: FONTS.bold },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  deleteButton: { flexDirection: 'row', alignItems: 'center' },
  editText: { color: COLORS.warning, marginLeft: 6, fontFamily: FONTS.medium },
  deleteText: { color: COLORS.error, marginLeft: 6, fontFamily: FONTS.medium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: COLORS.text, fontFamily: FONTS.regular },
  pickerWrapper: { marginBottom: 16 },
  pickerLabel: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 8 },
  categoryScroll: { flexDirection: 'row', maxHeight: 50 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8 },
  categoryChipSelected: { backgroundColor: COLORS.primary },
  categoryChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  categoryChipTextSelected: { color: COLORS.white, fontFamily: FONTS.medium },
  statusOptions: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8, marginBottom: 8 },
  statusChipSelected: { backgroundColor: COLORS.primary },
  statusChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  statusChipTextSelected: { color: COLORS.white, fontFamily: FONTS.medium },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontFamily: FONTS.regular },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold },
});

export default ManageSportsTeams;