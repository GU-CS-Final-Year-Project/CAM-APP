// screens/teacher/SelectClubForMembers.js
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.43.107/cam/';

const SelectClubForMembers = ({ navigation }) => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserInfo();
    fetchClubs();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        setUserInfo(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchClubs(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const fetchClubs = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      const currentUser = userData ? JSON.parse(userData) : null;
      setUserInfo(currentUser);

      const response = await fetch(`${API_URL}clubs.php?action=get`);
      const data = await response.json();
      if (data.success) {
        const myClubs = data.data.filter(club => 
          club.patron === currentUser?.user_name || 
          club.created_by === currentUser?.user_id
        );
        setClubs(myClubs);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading clubs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ClubLeaderDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Club</Text>
        <View style={{ width: 40 }} />
      </View>

      {clubs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="groups" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Clubs Found</Text>
          <Text style={styles.emptyMessage}>
            You are not assigned as patron to any club.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {clubs.map(club => (
            <TouchableOpacity
              key={club.club_id}
              style={styles.clubCard}
              onPress={() => navigation.navigate('ClubMemberships', { 
                clubId: club.club_id, 
                clubName: club.club_name 
              })}
            >
              <View style={styles.clubIcon}>
                <Text style={styles.clubInitial}>{getInitials(club.club_name)}</Text>
              </View>
              <View style={styles.clubInfo}>
                <Text style={styles.clubName}>{club.club_name}</Text>
                <Text style={styles.clubMeta}>
                  {club.member_count || 0} members • {club.status || 'Active'}
                </Text>
                {club.patron === userInfo?.user_name && (
                  <View style={styles.patronBadge}>
                    <MaterialIcons name="verified" size={12} color="#4A90E2" />
                    <Text style={styles.patronText}>You are the patron</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center', marginRight: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginTop: 16 },
  emptyMessage: { fontSize: 14, color: '#7f8c8d', marginTop: 8, textAlign: 'center' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  clubCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    borderRadius: 14, 
    padding: 16, 
    marginBottom: 12 
  },
  clubIcon: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#e3f2fd', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  clubInitial: { fontSize: 20, fontWeight: 'bold', color: '#4A90E2' },
  clubInfo: { flex: 1 },
  clubName: { fontSize: 16, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
  clubMeta: { fontSize: 12, color: '#7f8c8d' },
  patronBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  patronText: { fontSize: 11, color: '#4A90E2' },
});

export default SelectClubForMembers;