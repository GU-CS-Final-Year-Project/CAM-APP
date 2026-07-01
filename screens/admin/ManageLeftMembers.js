import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Platform, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/club_members.php';

const ManageLeftMembers = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [leftMembers, setLeftMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchLeftMembers();
  }, []);

  const fetchLeftMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}?action=get_left_members`);
      const result = await response.json();
      if (result.success) {
        setLeftMembers(result.data || []);
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to fetch data' });
      }
    } catch (error) {
      console.error('Error fetching left members:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (membershipId) => {
    Alert.alert(
      'Mark as Reviewed',
      'Mark this reason as reviewed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Reviewed',
          onPress: async () => {
            setAcknowledging(membershipId);
            try {
              const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'acknowledge_leave',
                  membership_id: membershipId,
                }),
              });
              const result = await response.json();
              if (result.success) {
                setLeftMembers(prev =>
                  prev.map(m => m.membership_id === membershipId ? { ...m, reviewed: 1 } : m)
                );
                showAlert({ type: 'success', title: 'Done', message: 'Marked as reviewed' });
              } else {
                showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update' });
              }
            } catch (error) {
              console.error('Error acknowledging leave:', error);
              showAlert({ type: 'error', title: 'Error', message: 'Network error' });
            } finally {
              setAcknowledging(null);
            }
          },
        },
      ]
    );
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;

  const unreviewed = leftMembers.filter(m => !m.reviewed).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchLeftMembers(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Left Members</Text>
            <Text style={styles.headerSubtitle}>
              {unreviewed > 0 ? `${unreviewed} unreviewed` : 'All reviewed'}
            </Text>
          </View>
          <TouchableOpacity onPress={fetchLeftMembers} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : leftMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="check-circle" size={64} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>No Records</Text>
            <Text style={styles.emptyText}>No members have left clubs with reasons yet.</Text>
          </View>
        ) : (
          leftMembers.map((member) => (
            <View key={member.membership_id || member.id} style={[styles.card, member.reviewed && styles.cardReviewed]}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardIcon}>
                  <MaterialIcons name="person" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.studentName}>{member.student_name || 'Unknown'}</Text>
                  <Text style={styles.clubName}>{member.club_name || 'Unknown Club'}</Text>
                </View>
                {member.reviewed ? (
                  <View style={styles.reviewedBadge}>
                    <MaterialIcons name="check-circle" size={16} color={COLORS.primary} />
                    <Text style={styles.reviewedText}>Reviewed</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.acknowledgeButton}
                    onPress={() => handleAcknowledge(member.membership_id || member.id)}
                    disabled={acknowledging === (member.membership_id || member.id)}
                  >
                    {acknowledging === (member.membership_id || member.id) ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.acknowledgeText}>Acknowledge</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.reasonBox}>
                <MaterialIcons name="format-quote" size={16} color={COLORS.textSecondary} />
                <Text style={styles.reasonText}>{member.reason || 'No reason provided'}</Text>
              </View>

              {member.left_at && (
                <Text style={styles.leftAtText}>
                  Left on {new Date(member.left_at).toLocaleDateString()}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 30 },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white },
  headerSubtitle: { fontSize: 12, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  refreshButton: { padding: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: SIZES.radius,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    ...SHADOWS.small,
  },
  cardReviewed: {
    borderLeftColor: COLORS.primary,
    opacity: 0.75,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.statBg,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  studentName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  clubName: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
  reviewedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.statBg,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12,
  },
  reviewedText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.primary },
  acknowledgeButton: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  acknowledgeText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.white },
  reasonBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.sm,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  reasonText: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: COLORS.text, lineHeight: 18 },
  leftAtText: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.grey, marginTop: 8, textAlign: 'right' },
});

export default ManageLeftMembers;
