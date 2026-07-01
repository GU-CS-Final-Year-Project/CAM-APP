import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const API_URL = 'http://192.168.43.107/cam/activityparticipants.php';

const StudentActivityHistory = ({ navigation, route }) => {
  const { studentId } = route.params || {};
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchActivities(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch(`${API_URL}?action=get_by_student&student_id=${studentId}`);
      const data = await res.json();
      if (data.success) setActivities(data.data || []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  const formatDate = (ds) => {
    if (!ds) return 'N/A';
    return new Date(ds).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
        <Text style={styles.headerTitle}>Activity History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}>
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Activity History</Text>
            <Text style={styles.emptyText}>This student has not participated in any activities.</Text>
          </View>
        ) : (
          activities.map((a, i) => (
            <View key={a.ParticipantID || i} style={styles.card}>
              <View style={styles.cardHeader}>
                <MaterialIcons name="celebration" size={20} color="#4A90E2" />
                <Text style={styles.activityName}>{a.ActivityName || `Activity #${i + 1}`}</Text>
              </View>
              <Text style={styles.statusText}>Status: {a.Status || a.status || 'Registered'}</Text>
              <Text style={styles.dateText}>{formatDate(a.RegistrationDate || a.registration_date)}</Text>
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  activityName: { fontSize: 16, fontWeight: '600', color: '#2c3e50', flex: 1 },
  statusText: { fontSize: 13, color: '#7f8c8d', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#999' },
});

export default StudentActivityHistory;
