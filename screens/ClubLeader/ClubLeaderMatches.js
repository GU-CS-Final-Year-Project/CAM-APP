import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Modal,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/matches.php';

const ClubLeaderMatches = ({ navigation }) => {
  const { showAlert } = useAlert();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchMatches(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchMatches(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?action=get`);
      const data = await res.json();
      if (data.success) setMatches(data.data || []);
    } catch (e) {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch matches' });
    } finally { setLoading(false); }
  };

  const filtered = matches.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      const d = new Date(m.MatchDate || m.match_date);
      return d >= new Date();
    }
    if (filter === 'recent') {
      const d = new Date(m.MatchDate || m.match_date);
      return d < new Date();
    }
    return true;
  });

  const formatDate = (ds) => {
    if (!ds) return 'TBD';
    return new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getMatchTypeColor = (type) => {
    const map = { Friendly: '#3498DB', League: '#2ECC71', Tournament: '#E74C3C', Cup: '#F39C12', Playoff: '#9B59B6' };
    return map[type || 'Friendly'] || '#7f8c8d';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClubLeaderDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Matches</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterRow}>
        {['all', 'upcoming', 'recent'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}>
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="sports-soccer" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Matches Found</Text>
          </View>
        ) : (
          filtered.map(m => {
            const mid = m.MatchID || m.match_id;
            return (
              <TouchableOpacity
                key={mid}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => { setSelectedMatch(m); setDetailsModal(true); }}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { backgroundColor: getMatchTypeColor(m.MatchType || m.match_type) + '20' }]}>
                    <Text style={[styles.typeText, { color: getMatchTypeColor(m.MatchType || m.match_type) }]}>
                      {m.MatchType || m.match_type || 'Friendly'}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(m.MatchDate || m.match_date)}</Text>
                </View>
                <View style={styles.teamsRow}>
                  <Text style={styles.teamName}>{m.TeamName || m.OpponentName || 'Home Team'}</Text>
                  <Text style={styles.vs}>vs</Text>
                  <Text style={styles.teamName}>{m.OpponentName || 'Opponent'}</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.locationText}>{m.Location || m.location || 'TBD'}</Text>
                  {m.OurScore !== undefined && m.OurScore !== null && (
                    <Text style={styles.scoreText}>{m.OurScore} - {m.OpponentScore || 0}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={detailsModal} transparent animationType="slide" onRequestClose={() => setDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Match Details</Text>
              <TouchableOpacity onPress={() => setDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {selectedMatch && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Match Type</Text>
                  <Text style={styles.detailValue}>{selectedMatch.MatchType || selectedMatch.match_type}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedMatch.MatchDate || selectedMatch.match_date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedMatch.Location || selectedMatch.location || 'TBD'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Opponent</Text>
                  <Text style={styles.detailValue}>{selectedMatch.OpponentName || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Home/Away</Text>
                  <Text style={styles.detailValue}>{selectedMatch.HomeAway || selectedMatch.home_away || 'Home'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Score</Text>
                  <Text style={styles.detailValue}>{selectedMatch.OurScore ?? '-'} : {selectedMatch.OpponentScore ?? '-'}</Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  header: { backgroundColor: '#4A90E2', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center', marginRight: 48 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#4A90E2' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff' },
  list: { flex: 1, paddingHorizontal: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }) },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#7f8c8d' },
  teamsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 10 },
  teamName: { fontSize: 16, fontWeight: '600', color: '#2c3e50', flex: 1, textAlign: 'center' },
  vs: { fontSize: 14, color: '#7f8c8d', fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f3f5', paddingTop: 10 },
  locationText: { fontSize: 12, color: '#7f8c8d' },
  scoreText: { fontSize: 14, fontWeight: '700', color: '#4A90E2' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  detailLabel: { fontSize: 14, color: '#7f8c8d' },
  detailValue: { fontSize: 14, color: '#2c3e50', fontWeight: '500' },
});

export default ClubLeaderMatches;
