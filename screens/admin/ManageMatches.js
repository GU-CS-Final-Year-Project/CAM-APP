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
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'http://192.168.43.107/cam/matches.php';

const ManageMatches = ({ navigation }) => {
  const [matches, setMatches] = useState([]);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, upcoming, recent

  const [newMatch, setNewMatch] = useState({
    TeamID: '',
    OpponentName: '',
    MatchType: 'Friendly',
    MatchDate: '',
    Location: '',
    HomeAway: 'Home',
    OurScore: '',
    OpponentScore: '',
    Notes: ''
  });

  const [editedMatch, setEditedMatch] = useState({
    MatchID: null,
    TeamID: '',
    OpponentName: '',
    MatchType: 'Friendly',
    MatchDate: '',
    Location: '',
    HomeAway: 'Home',
    OurScore: '',
    OpponentScore: '',
    Notes: ''
  });

  const { showAlert } = useAlert();

  const matchTypes = ['Friendly', 'League', 'Tournament', 'Cup', 'Playoff', 'Knockout', 'Group Stage', 'Quarter Final', 'Semi Final', 'Final'];
  const homeAwayOptions = ['Home', 'Away', 'Neutral'];
  const filterOptions = [
    { value: 'all', label: 'All Matches', icon: 'list' },
    { value: 'upcoming', label: 'Upcoming', icon: 'schedule' },
    { value: 'recent', label: 'Recent Results', icon: 'history' }
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

  // Fetch matches based on filter
  const fetchMatches = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}?action=get`;
      if (filterType === 'upcoming') {
        url = `${API_URL}?action=get_upcoming`;
      } else if (filterType === 'recent') {
        url = `${API_URL}?action=get_recent`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setMatches(data.data || []);
    } catch (error) {
      console.error(error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch matches' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newMatch.TeamID || !newMatch.OpponentName || !newMatch.MatchDate || !newMatch.Location) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in all required fields' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          TeamID: parseInt(newMatch.TeamID),
          OpponentName: newMatch.OpponentName,
          MatchType: newMatch.MatchType,
          MatchDate: newMatch.MatchDate,
          Location: newMatch.Location,
          HomeAway: newMatch.HomeAway,
          OurScore: newMatch.OurScore ? parseInt(newMatch.OurScore) : null,
          OpponentScore: newMatch.OpponentScore ? parseInt(newMatch.OpponentScore) : null,
          Notes: newMatch.Notes
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Match added successfully' });
        setAddModalVisible(false);
        resetNewForm();
        fetchMatches();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add match' });
      }
    } catch (error) {
      console.error('Error adding match:', error);
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
          MatchID: editedMatch.MatchID,
          TeamID: parseInt(editedMatch.TeamID),
          OpponentName: editedMatch.OpponentName,
          MatchType: editedMatch.MatchType,
          MatchDate: editedMatch.MatchDate,
          Location: editedMatch.Location,
          HomeAway: editedMatch.HomeAway,
          OurScore: editedMatch.OurScore ? parseInt(editedMatch.OurScore) : null,
          OpponentScore: editedMatch.OpponentScore ? parseInt(editedMatch.OpponentScore) : null,
          Notes: editedMatch.Notes
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Match updated successfully' });
        setEditModalVisible(false);
        fetchMatches();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to update match' });
      }
    } catch (error) {
      console.error('Error updating match:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const handleDelete = async (MatchID) => {
    showAlert({ type: 'confirm', title: 'Confirm Delete', message: 'Are you sure you want to delete this match?', buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', MatchID })
              });
              const data = await res.json();
              if (data.success) {
                showAlert({ type: 'success', title: 'Success', message: 'Match deleted successfully' });
                fetchMatches();
              } else {
                showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to delete match' });
              }
            } catch (error) {
              console.error('Error deleting match:', error);
              showAlert({ type: 'error', title: 'Error', message: 'Network error' });
            }
          }
        }
      ] });
  };

  const handleUpdateResult = async (MatchID, OurScore, OpponentScore) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_result',
          MatchID,
          OurScore: parseInt(OurScore),
          OpponentScore: parseInt(OpponentScore)
        })
      });
      const data = await res.json();
      if (data.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Match result updated' });
        fetchMatches();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to update result' });
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    }
  };

  const openEditModal = (match) => {
    setEditedMatch({
      MatchID: match.MatchID,
      TeamID: match.TeamID?.toString() || '',
      OpponentName: match.OpponentName || '',
      MatchType: match.MatchType || 'Friendly',
      MatchDate: match.MatchDate || '',
      Location: match.Location || '',
      HomeAway: match.HomeAway || 'Home',
      OurScore: match.OurScore?.toString() || '',
      OpponentScore: match.OpponentScore?.toString() || '',
      Notes: match.Notes || ''
    });
    setEditModalVisible(true);
  };

  const resetNewForm = () => {
    setNewMatch({
      TeamID: '',
      OpponentName: '',
      MatchType: 'Friendly',
      MatchDate: '',
      Location: '',
      HomeAway: 'Home',
      OurScore: '',
      OpponentScore: '',
      Notes: ''
    });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().slice(0, 19).replace('T', ' ');
      if (addModalVisible) {
        setNewMatch({ ...newMatch, MatchDate: formattedDate });
      } else if (editModalVisible) {
        setEditedMatch({ ...editedMatch, MatchDate: formattedDate });
      }
    }
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.TeamID === teamId);
    return team ? team.TeamName : 'Unknown Team';
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'Win': return '#5CB85C';
      case 'Loss': return '#E74C3C';
      case 'Draw': return '#F39C12';
      default: return '#7f8c8d';
    }
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

  const isUpcoming = (matchDate) => {
    return new Date(matchDate) > new Date();
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [filterType]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Matches</Text>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {filterOptions.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[styles.filterTab, filterType === option.value && styles.filterTabActive]}
            onPress={() => setFilterType(option.value)}
          >
            <MaterialIcons name={option.icon} size={18} color={filterType === option.value ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.filterText, filterType === option.value && styles.filterTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{matches.length}</Text>
          <Text style={styles.statLabel}>Total Matches</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#5CB85C' }]}>
            {matches.filter(m => m.Result === 'Win').length}
          </Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#E74C3C' }]}>
            {matches.filter(m => m.Result === 'Loss').length}
          </Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F39C12' }]}>
            {matches.filter(m => m.Result === 'Draw').length}
          </Text>
          <Text style={styles.statLabel}>Draws</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMatches}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Matches List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchMatches(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {matches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="sports-soccer" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No matches found</Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.addFirstButtonText}>Schedule First Match</Text>
              </TouchableOpacity>
            </View>
          ) : (
            matches.map(match => (
              <View key={match.MatchID} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.matchInfo}>
                    <Text style={styles.teamName}>{getTeamName(match.TeamID)}</Text>
                    <Text style={styles.opponentName}>vs {match.OpponentName}</Text>
                    <View style={styles.matchDetails}>
                      <Text style={styles.matchType}>{match.MatchType}</Text>
                      <Text style={styles.homeAway}>{match.HomeAway}</Text>
                    </View>
                    <Text style={styles.matchDate}>{formatDateTime(match.MatchDate)}</Text>
                    <Text style={styles.location}>📍 {match.Location}</Text>
                    
                    {/* Score Display */}
                    {match.OurScore !== null && match.OpponentScore !== null ? (
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreText}>{match.OurScore}</Text>
                        <Text style={styles.scoreDash}>-</Text>
                        <Text style={styles.scoreText}>{match.OpponentScore}</Text>
                        <View style={[styles.resultBadge, { backgroundColor: getResultColor(match.Result) + '20' }]}>
                          <Text style={[styles.resultText, { color: getResultColor(match.Result) }]}>
                            {match.Result?.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.addScoreBtn}
                        onPress={() => {
                          showAlert({ type: 'confirm', title: 'Add Result', message: 'Enter match scores', buttons: [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Save',
                                onPress: () => {
                                  // Prompt for scores
                                  Alert.prompt('Our Score', 'Enter our team score', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Next', onPress: (ourScore) => {
                                      Alert.prompt('Opponent Score', 'Enter opponent score', [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Save', onPress: (oppScore) => {
                                          handleUpdateResult(match.MatchID, ourScore, oppScore);
                                        }}
                                      ]);
                                    }}
                                  ]);
                                }
                              }
                            ]
                          });
                        }}
                      >
                        <MaterialIcons name="add-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.addScoreText}>Add Score</Text>
                      </TouchableOpacity>
                    )}
                    
                    {match.Notes && (
                      <Text style={styles.notes}>📝 {match.Notes}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(match)}>
                    <MaterialIcons name="edit" size={18} color="#F39C12" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(match.MatchID)}>
                    <MaterialIcons name="delete" size={18} color="#E74C3C" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Match Modal */}
      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Match</Text>
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
                      newMatch.TeamID === team.TeamID.toString() && styles.optionChipSelected
                    ]}
                    onPress={() => setNewMatch({ ...newMatch, TeamID: team.TeamID.toString() })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newMatch.TeamID === team.TeamID.toString() && styles.optionChipTextSelected
                    ]}>
                      {team.TeamName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Opponent Team Name *"
                value={newMatch.OpponentName}
                onChangeText={(text) => setNewMatch({ ...newMatch, OpponentName: text })}
              />

              {/* Match Type Picker */}
              <Text style={styles.inputLabel}>Match Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {matchTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionChip,
                      newMatch.MatchType === type && styles.optionChipSelected
                    ]}
                    onPress={() => setNewMatch({ ...newMatch, MatchType: type })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newMatch.MatchType === type && styles.optionChipTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Home/Away Picker */}
              <Text style={styles.inputLabel}>Home/Away</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {homeAwayOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionChip,
                      newMatch.HomeAway === option && styles.optionChipSelected
                    ]}
                    onPress={() => setNewMatch({ ...newMatch, HomeAway: option })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      newMatch.HomeAway === option && styles.optionChipTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Match Date */}
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <MaterialIcons name="event" size={20} color={COLORS.textSecondary} />
                <Text style={newMatch.MatchDate ? styles.dateText : styles.datePlaceholder}>
                  {newMatch.MatchDate || 'Select Match Date & Time *'}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Location *"
                value={newMatch.Location}
                onChangeText={(text) => setNewMatch({ ...newMatch, Location: text })}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes (Optional)"
                value={newMatch.Notes}
                onChangeText={(text) => setNewMatch({ ...newMatch, Notes: text })}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                <Text style={styles.submitButtonText}>Schedule Match</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Match Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Match</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { backgroundColor: COLORS.lightGrey }]}
                placeholder="Match ID"
                value={editedMatch.MatchID?.toString()}
                editable={false}
              />

              {/* Team Picker */}
              <Text style={styles.inputLabel}>Team *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {teams.map(team => (
                  <TouchableOpacity
                    key={team.TeamID}
                    style={[
                      styles.optionChip,
                      editedMatch.TeamID === team.TeamID.toString() && styles.optionChipSelected
                    ]}
                    onPress={() => setEditedMatch({ ...editedMatch, TeamID: team.TeamID.toString() })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      editedMatch.TeamID === team.TeamID.toString() && styles.optionChipTextSelected
                    ]}>
                      {team.TeamName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={styles.input}
                placeholder="Opponent Team Name *"
                value={editedMatch.OpponentName}
                onChangeText={(text) => setEditedMatch({ ...editedMatch, OpponentName: text })}
              />

              {/* Match Type Picker */}
              <Text style={styles.inputLabel}>Match Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {matchTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionChip,
                      editedMatch.MatchType === type && styles.optionChipSelected
                    ]}
                    onPress={() => setEditedMatch({ ...editedMatch, MatchType: type })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      editedMatch.MatchType === type && styles.optionChipTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Home/Away Picker */}
              <Text style={styles.inputLabel}>Home/Away</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {homeAwayOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionChip,
                      editedMatch.HomeAway === option && styles.optionChipSelected
                    ]}
                    onPress={() => setEditedMatch({ ...editedMatch, HomeAway: option })}
                  >
                    <Text style={[
                      styles.optionChipText,
                      editedMatch.HomeAway === option && styles.optionChipTextSelected
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Match Date */}
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <MaterialIcons name="event" size={20} color={COLORS.textSecondary} />
                <Text style={editedMatch.MatchDate ? styles.dateText : styles.datePlaceholder}>
                  {editedMatch.MatchDate || 'Select Match Date & Time *'}
                </Text>
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder="Location *"
                value={editedMatch.Location}
                onChangeText={(text) => setEditedMatch({ ...editedMatch, Location: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Our Score"
                value={editedMatch.OurScore}
                onChangeText={(text) => setEditedMatch({ ...editedMatch, OurScore: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={styles.input}
                placeholder="Opponent Score"
                value={editedMatch.OpponentScore}
                onChangeText={(text) => setEditedMatch({ ...editedMatch, OpponentScore: text })}
                keyboardType="numeric"
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes"
                value={editedMatch.Notes}
                onChangeText={(text) => setEditedMatch({ ...editedMatch, Notes: text })}
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

      {/* Date Time Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
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
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: COLORS.statBg,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  filterTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
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
  matchInfo: { flex: 1, marginRight: 12 },
  teamName: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 2 },
  opponentName: { fontSize: 16, fontFamily: FONTS.medium, color: COLORS.primary, marginBottom: 6 },
  matchDetails: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  matchType: { fontSize: 12, backgroundColor: COLORS.statBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, color: COLORS.primary, fontFamily: FONTS.medium },
  homeAway: { fontSize: 12, backgroundColor: COLORS.lightGrey, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  matchDate: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontFamily: FONTS.regular },
  location: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontFamily: FONTS.regular },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  scoreText: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
  scoreDash: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.textSecondary },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  resultText: { fontSize: 12, fontFamily: FONTS.bold },
  addScoreBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  addScoreText: { fontSize: 14, color: COLORS.primary, fontFamily: FONTS.medium },
  notes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontFamily: FONTS.regular },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  deleteButton: { flexDirection: 'row', alignItems: 'center' },
  editText: { color: COLORS.warning, marginLeft: 6, fontFamily: FONTS.medium },
  deleteText: { color: COLORS.error, marginLeft: 6, fontFamily: FONTS.medium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  inputLabel: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, color: COLORS.text, fontFamily: FONTS.regular },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, gap: 10 },
  dateText: { fontSize: 16, color: COLORS.text, fontFamily: FONTS.regular },
  datePlaceholder: { fontSize: 16, color: COLORS.grey, fontFamily: FONTS.regular },
  categoryScroll: { flexDirection: 'row', maxHeight: 50, marginBottom: 16 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8 },
  optionChipSelected: { backgroundColor: COLORS.primary },
  optionChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  optionChipTextSelected: { color: COLORS.white, fontFamily: FONTS.medium },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontFamily: FONTS.regular },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold },
});

export default ManageMatches;