import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const API_URL = 'http://192.168.43.107/cam/club_members.php';

const StudentClubMemberships = ({ navigation, route }) => {
  const { studentId } = route.params || {};
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMemberships();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchMemberships(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const fetchMemberships = async () => {
    try {
      const res = await fetch(`${API_URL}?action=get_by_student&student_id=${studentId}`);
      const data = await res.json();
      if (data.success) setMemberships(data.data || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const getStatusColor = (s) => {
    switch ((s || '').toLowerCase()) {
      case 'active': return '#2ECC71';
      case 'pending': return '#F39C12';
      case 'rejected': return '#E74C3C';
      default: return '#7f8c8d';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClubLeaderDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Club Memberships</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}>
        {memberships.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="groups" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Club Memberships</Text>
            <Text style={styles.emptyText}>This student is not a member of any clubs.</Text>
          </View>
        ) : (
          memberships.map((m, i) => (
            <View key={m.MembershipID || i} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(m.club_name || '?')[0]}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.clubName}>{m.club_name || 'Unknown Club'}</Text>
                  <Text style={styles.roleText}>Role: {m.role || 'member'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(m.status || m.Status) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(m.status || m.Status) }]}>
                    {m.status || m.Status || 'Active'}
                  </Text>
                </View>
              </View>
              {m.joined_date && (
                <Text style={styles.dateText}>Joined: {new Date(m.joined_date).toLocaleDateString()}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f7fa' },
  header: { backgroundColor: '#4A90E2', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center', marginRight: 48 },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }, android: { elevation: 3 } }) },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#4A90E2' },
  cardInfo: { flex: 1 },
  clubName: { fontSize: 16, fontWeight: '600', color: '#2c3e50' },
  roleText: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  dateText: { fontSize: 12, color: '#999' },
});

export default StudentClubMemberships;
