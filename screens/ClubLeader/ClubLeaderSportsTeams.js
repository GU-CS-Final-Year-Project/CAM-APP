import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, TextInput, Modal, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/sportsteams.php';
const CATEGORIES_API = 'http://192.168.43.107/cam/sportscategories.php';

const ClubLeaderSportsTeams = ({ navigation }) => {
  const { showAlert } = useAlert();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchTeams(); fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${CATEGORIES_API}?action=get`);
      const data = await res.json();
      if (data.success) setCategories(data.data || []);
    } catch (e) { console.error(e); }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchTeams(),
      fetchCategories(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?action=get`);
      const data = await res.json();
      if (data.success) setTeams(data.data || []);
    } catch (e) {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch teams' });
    } finally { setLoading(false); }
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.CategoryID === id || c.category_id === id);
    return cat ? (cat.CategoryName || cat.category_name) : 'Unknown';
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading sports teams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClubLeaderDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sports Teams</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}>
        {teams.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="sports" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Teams Found</Text>
          </View>
        ) : (
          teams.map(team => (
            <TouchableOpacity
              key={team.TeamID || team.team_id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => { setSelectedTeam(team); setDetailsModal(true); }}
            >
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(team.TeamName || team.team_name || '?')[0]}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{team.TeamName || team.team_name}</Text>
                  <Text style={styles.cardSub}>{getCategoryName(team.SportCategoryID || team.sport_category_id)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: (team.Status || team.status) === 'Active' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Text style={[styles.badgeText, { color: (team.Status || team.status) === 'Active' ? '#2E7D32' : '#E65100' }]}>
                    {team.Status || team.status || 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.metaText}>Season: {team.Season || team.season || 'N/A'}</Text>
                <Text style={styles.metaText}>Division: {team.Division || team.division || 'N/A'}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={detailsModal} transparent animationType="slide" onRequestClose={() => setDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Team Details</Text>
              <TouchableOpacity onPress={() => setDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {selectedTeam && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Team Name</Text>
                  <Text style={styles.detailValue}>{selectedTeam.TeamName || selectedTeam.team_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{getCategoryName(selectedTeam.SportCategoryID || selectedTeam.sport_category_id)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Season</Text>
                  <Text style={styles.detailValue}>{selectedTeam.Season || selectedTeam.season || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Division</Text>
                  <Text style={styles.detailValue}>{selectedTeam.Division || selectedTeam.division || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={styles.detailValue}>{selectedTeam.Status || selectedTeam.status || 'Pending'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Max Players</Text>
                  <Text style={styles.detailValue}>{selectedTeam.MaxPlayers || selectedTeam.max_players || '25'}</Text>
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
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }) },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#4A90E2' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  cardSub: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaText: { fontSize: 12, color: '#7f8c8d' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  detailLabel: { fontSize: 14, color: '#7f8c8d' },
  detailValue: { fontSize: 14, color: '#2c3e50', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});

export default ClubLeaderSportsTeams;
