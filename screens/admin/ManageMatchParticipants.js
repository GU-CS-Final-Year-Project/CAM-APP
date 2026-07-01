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

const API_URL = 'http://192.168.43.107/cam/matchparticipants.php';

const ManageMatchParticipants = ({ navigation }) => {
  const [participants, setParticipants] = useState([]);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  const [newParticipant, setNewParticipant] = useState({
    MatchID: '',
    student_id: '',
    ParticipationStatus: 'Selected',
    MinutesPlayed: '0',
    Performance: ''
  });

  const [editedParticipant, setEditedParticipant] = useState({
    MatchParticipantID: null,
    MatchID: '',
    student_id: '',
    student_name: '',
    ParticipationStatus: 'Selected',
    MinutesPlayed: '0',
    Performance: ''
  });

  const { showAlert } = useAlert();

  const participationStatuses = ['Selected', 'Confirmed', 'Played', 'Substitute', 'Did Not Play', 'Injured', 'Suspended', 'Absent'];

  // Fetch matches for dropdown
  const fetchMatches = async () => {
    try {
      const res = await fetch('http://192.168.43.107/cam/matches.php?action=get');
      const data = await res.json();
      if (data.success) setMatches(data.data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  // Fetch participants for selected match
  const fetchParticipants = async (matchId) => {
    try {
      setLoading(true);
      let url = `${API_URL}?action=get`;
      if (matchId) {
        url = `${API_URL}?action=get_by_match&match_id=${matchId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setParticipants(data.data || []);
    } catch (error) {
      console.error(error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch participants' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch available players for a match
  const fetchAvailablePlayers = async (matchId) => {
    try {
      const res = await fetch(`${API_URL}?action=get_available_players&match_id=${matchId}`);
      const data = await res.json();
      if (data.success) setAvailablePlayers(data.data || []);
    } catch (error) {
      console.error('Error fetching available players:', error);
    }
  };

  const handleAdd = async () => {
    if (!newParticipant.MatchID || !newParticipant.student_id) {
      showAlert({ type: 'error', title: 'Error', message: 'Please select a match and a player' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          MatchID: parseInt(newParticipant.MatchID),
          student_id: parseInt(newParticipant.student_id),
          ParticipationStatus: newParticipant.ParticipationStatus,
          MinutesPlayed: parseInt(newParticipant.MinutesPlayed),
          Performance: newParticipant.Performance
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Player added to match successfully' });
        setAddModalVisible(false);
        resetNewForm();
        fetchParticipants(selectedMatchId);
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add player' });
      }
    } catch (error) {
      console.error('Error adding match participant:', error);
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
          MatchParticipantID: editedParticipant.MatchParticipantID,
          ParticipationStatus: editedParticipant.ParticipationStatus,
          MinutesPlayed: parseInt(editedParticipant.MinutesPlayed),
          Performance: editedParticipant.Performance
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Player updated successfully' });
        setEditModalVisible(false);
        fetchParticipants(selectedMatchId);
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to update player' });
      }
    } catch (error) {
      console.error('Error updating match participant:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const handleDelete = async (MatchParticipantID, playerName) => {
    showAlert({ type: 'confirm', title: 'Confirm Remove', message: `Are you sure you want to remove ${playerName} from this match?`, buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', MatchParticipantID })
              });
              const data = await res.json();
              if (data.success) {
                showAlert({ type: 'success', title: 'Success', message: 'Player removed successfully' });
                fetchParticipants(selectedMatchId);
              } else {
                showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to remove player' });
              }
            } catch (error) {
              console.error('Error deleting match participant:', error);
              showAlert({ type: 'error', title: 'Error', message: 'Network error' });
            }
          }
        }
      ] });
  };

  const openEditModal = (participant) => {
    setEditedParticipant({
      MatchParticipantID: participant.MatchParticipantID,
      MatchID: participant.MatchID,
      student_id: participant.student_id,
      student_name: participant.student_name,
      ParticipationStatus: participant.ParticipationStatus || 'Selected',
      MinutesPlayed: participant.MinutesPlayed?.toString() || '0',
      Performance: participant.Performance || ''
    });
    setEditModalVisible(true);
  };

  const resetNewForm = () => {
    setNewParticipant({
      MatchID: selectedMatchId?.toString() || '',
      student_id: '',
      ParticipationStatus: 'Selected',
      MinutesPlayed: '0',
      Performance: ''
    });
  };

  const handleMatchSelect = (matchId) => {
    setSelectedMatchId(matchId);
    fetchParticipants(matchId);
    fetchAvailablePlayers(matchId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Played': return '#5CB85C';
      case 'Confirmed': return '#5BC0DE';
      case 'Selected': return '#F0AD4E';
      case 'Substitute': return '#3498DB';
      case 'Did Not Play': return '#95A5A6';
      case 'Injured': return '#E74C3C';
      case 'Suspended': return '#E74C3C';
      case 'Absent': return '#E74C3C';
      default: return '#7f8c8d';
    }
  };

  const getMatchTitle = (match) => {
    if (!match) return 'Unknown Match';
    return `${match.TeamName} vs ${match.OpponentName} - ${new Date(match.MatchDate).toLocaleDateString()}`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    if (selectedMatchId) {
      fetchParticipants(selectedMatchId);
      fetchAvailablePlayers(selectedMatchId);
    }
  }, [selectedMatchId]);

  const selectedMatch = matches.find(m => m.MatchID === selectedMatchId);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Participants</Text>
      </View>

      {/* Match Selector */}
      <View style={styles.matchSelector}>
        <Text style={styles.sectionTitle}>Select Match</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matchScroll}>
          {matches.map(match => (
            <TouchableOpacity
              key={match.MatchID}
              style={[
                styles.matchChip,
                selectedMatchId === match.MatchID && styles.matchChipSelected
              ]}
              onPress={() => handleMatchSelect(match.MatchID)}
            >
              <Text style={[
                styles.matchChipText,
                selectedMatchId === match.MatchID && styles.matchChipTextSelected
              ]}>
                {match.TeamName} vs {match.OpponentName}
              </Text>
              <Text style={styles.matchChipDate}>
                {new Date(match.MatchDate).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedMatchId && (
        <>
          {/* Match Info */}
          <View style={styles.matchInfoCard}>
            <Text style={styles.matchTitle}>{selectedMatch?.TeamName} vs {selectedMatch?.OpponentName}</Text>
            <Text style={styles.matchDetail}>📅 {formatDateTime(selectedMatch?.MatchDate)}</Text>
            <Text style={styles.matchDetail}>📍 {selectedMatch?.Location}</Text>
            {selectedMatch?.OurScore !== null && (
              <Text style={styles.matchScore}>Score: {selectedMatch?.OurScore} - {selectedMatch?.OpponentScore}</Text>
            )}
          </View>

          {/* Stats Overview */}
          <View style={styles.statsOverview}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{participants.length}</Text>
              <Text style={styles.statLabel}>Total Players</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#5CB85C' }]}>
                {participants.filter(p => p.ParticipationStatus === 'Played').length}
              </Text>
              <Text style={styles.statLabel}>Played</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: '#F0AD4E' }]}>
                {participants.filter(p => p.ParticipationStatus === 'Substitute').length}
              </Text>
              <Text style={styles.statLabel}>Substitutes</Text>
            </View>
          </View>

          {/* Add Player Button */}
          <TouchableOpacity 
            style={styles.addPlayerButton}
            onPress={() => {
              resetNewForm();
              setShowPlayerPicker(true);
            }}
          >
            <MaterialIcons name="person-add" size={20} color={COLORS.white} />
            <Text style={styles.addPlayerButtonText}>Add Player to Match</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Players List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchParticipants(selectedMatchId), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {!selectedMatchId ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="sports-soccer" size={64} color={COLORS.grey} />
              <Text style={styles.emptyText}>Select a match to view participants</Text>
            </View>
          ) : participants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="group" size={64} color={COLORS.grey} />
              <Text style={styles.emptyText}>No players added to this match</Text>
              <TouchableOpacity 
                style={styles.addFirstButton} 
                onPress={() => {
                  resetNewForm();
                  setShowPlayerPicker(true);
                }}
              >
                <Text style={styles.addFirstButtonText}>Add First Player</Text>
              </TouchableOpacity>
            </View>
          ) : (
            participants.map(participant => (
              <View key={participant.MatchParticipantID} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{participant.student_name}</Text>
                    <Text style={styles.playerEmail}>{participant.student_email}</Text>
                    <View style={styles.playerDetails}>
                      {participant.Position && (
                        <Text style={styles.position}>Position: {participant.Position}</Text>
                      )}
                      {participant.JerseyNumber && (
                        <Text style={styles.jerseyNumber}>Jersey: #{participant.JerseyNumber}</Text>
                      )}
                      <Text style={styles.minutesPlayed}>Minutes: {participant.MinutesPlayed}</Text>
                    </View>
                    {participant.Performance && (
                      <Text style={styles.performance}>⭐ {participant.Performance}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(participant.ParticipationStatus) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(participant.ParticipationStatus) }]}>
                      {participant.ParticipationStatus?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(participant)}>
                    <MaterialIcons name="edit" size={18} color="#F39C12" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(participant.MatchParticipantID, participant.student_name)}>
                    <MaterialIcons name="delete" size={18} color="#E74C3C" />
                    <Text style={styles.deleteText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Player Picker Modal (Add Player) */}
      <Modal visible={showPlayerPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Player to Match</Text>
              <TouchableOpacity onPress={() => setShowPlayerPicker(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Select Player *</Text>
              {availablePlayers.length === 0 ? (
                <View style={styles.noPlayersContainer}>
                  <Text style={styles.noPlayersText}>No available players</Text>
                  <Text style={styles.noPlayersSubtext}>All team members have been added to this match</Text>
                </View>
              ) : (
                availablePlayers.map(player => (
                  <TouchableOpacity
                    key={player.user_id}
                    style={[
                      styles.playerOption,
                      newParticipant.student_id === player.user_id.toString() && styles.playerOptionSelected
                    ]}
                    onPress={() => {
                      setNewParticipant({
                        ...newParticipant,
                        student_id: player.user_id.toString(),
                        student_name: player.user_name
                      });
                    }}
                  >
                    <View style={styles.playerOptionInfo}>
                      <Text style={styles.playerOptionName}>{player.user_name}</Text>
                      <Text style={styles.playerOptionDetails}>
                        {player.Position ? `Position: ${player.Position}` : 'No position'} | Jersey: {player.JerseyNumber || 'N/A'}
                      </Text>
                    </View>
                    {newParticipant.student_id === player.user_id.toString() && (
                      <MaterialIcons name="check-circle" size={24} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}

              {newParticipant.student_id && (
                <>
                  <Text style={styles.inputLabel}>Participation Status</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                    {participationStatuses.map(status => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusChip,
                          newParticipant.ParticipationStatus === status && styles.statusChipSelected
                        ]}
                        onPress={() => setNewParticipant({ ...newParticipant, ParticipationStatus: status })}
                      >
                        <Text style={[
                          styles.statusChipText,
                          newParticipant.ParticipationStatus === status && styles.statusChipTextSelected
                        ]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TextInput
                    style={styles.input}
                    placeholder="Minutes Played"
                    value={newParticipant.MinutesPlayed}
                    onChangeText={(text) => setNewParticipant({ ...newParticipant, MinutesPlayed: text })}
                    keyboardType="numeric"
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Performance Notes (goals, assists, rating, etc.)"
                    value={newParticipant.Performance}
                    onChangeText={(text) => setNewParticipant({ ...newParticipant, Performance: text })}
                    multiline
                    numberOfLines={3}
                  />

                  <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                    <Text style={styles.submitButtonText}>Add Player</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Participant Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Player</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Player: {editedParticipant.student_name}</Text>
              </View>

              <Text style={styles.inputLabel}>Participation Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                {participationStatuses.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusChip,
                      editedParticipant.ParticipationStatus === status && styles.statusChipSelected
                    ]}
                    onPress={() => setEditedParticipant({ ...editedParticipant, ParticipationStatus: status })}
                  >
                    <Text style={[
                      styles.statusChipText,
                      editedParticipant.ParticipationStatus === status && styles.statusChipTextSelected
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Minutes Played"
                value={editedParticipant.MinutesPlayed}
                onChangeText={(text) => setEditedParticipant({ ...editedParticipant, MinutesPlayed: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Performance Notes"
                value={editedParticipant.Performance}
                onChangeText={(text) => setEditedParticipant({ ...editedParticipant, Performance: text })}
                multiline
                numberOfLines={3}
              />

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
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.white, flex: 1, textAlign: 'center', marginRight: 48, fontFamily: FONTS.bold },
  matchSelector: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 12, fontFamily: FONTS.bold },
  matchScroll: { flexDirection: 'row', maxHeight: 80 },
  matchChip: {
    backgroundColor: COLORS.lightGrey,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    minWidth: 150,
  },
  matchChipSelected: { backgroundColor: COLORS.primary },
  matchChipText: { fontSize: 14, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.medium },
  matchChipTextSelected: { color: COLORS.white },
  matchChipDate: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  matchInfoCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  matchTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 8, fontFamily: FONTS.bold },
  matchDetail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4, fontFamily: FONTS.regular },
  matchScore: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginTop: 8, fontFamily: FONTS.bold },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, fontFamily: FONTS.bold },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontFamily: FONTS.regular },
  addPlayerButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPlayerButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
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
  playerInfo: { flex: 1, marginRight: 12 },
  playerName: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 2, fontFamily: FONTS.bold },
  playerEmail: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, fontFamily: FONTS.regular },
  playerDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  position: { fontSize: 12, color: COLORS.primary, fontWeight: '500', fontFamily: FONTS.medium },
  jerseyNumber: { fontSize: 12, color: '#F39C12', fontWeight: '500', fontFamily: FONTS.medium },
  minutesPlayed: { fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  performance: { fontSize: 12, color: '#5CB85C', marginTop: 4, fontStyle: 'italic', fontFamily: FONTS.regular },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  statusScroll: { flexDirection: 'row', maxHeight: 50, marginBottom: 16 },
  statusChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8 },
  statusChipSelected: { backgroundColor: COLORS.primary },
  statusChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  statusChipTextSelected: { color: COLORS.white },
  playerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerOptionSelected: { backgroundColor: '#e3f2fd', borderWidth: 1, borderColor: COLORS.primary },
  playerOptionInfo: { flex: 1 },
  playerOptionName: { fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: FONTS.medium },
  playerOptionDetails: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontFamily: FONTS.regular },
  noPlayersContainer: { padding: 20, alignItems: 'center' },
  noPlayersText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', fontFamily: FONTS.regular },
  noPlayersSubtext: { fontSize: 12, color: COLORS.grey, marginTop: 4, textAlign: 'center', fontFamily: FONTS.regular },
  infoBox: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 16 },
  infoText: { fontSize: 14, color: COLORS.text, fontWeight: '500', fontFamily: FONTS.medium },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', fontFamily: FONTS.bold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center', fontFamily: FONTS.regular },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageMatchParticipants;
