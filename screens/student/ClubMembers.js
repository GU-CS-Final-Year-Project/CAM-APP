// screens/student/ClubMembers.js
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
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const API_URL = 'http://192.168.43.107/cam/';

const ClubMembers = ({ navigation, route }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  // Get clubId from route params (either passed directly or from navigation)
  const { clubId, clubName } = route.params || {};
  
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clubInfo, setClubInfo] = useState(null);
  const [error, setError] = useState(null);
  const { showAlert } = useAlert();

  // Fetch club details
  const fetchClubDetails = async () => {
    if (!clubId) {
      console.log('No clubId provided');
      setError('Club information not available');
      return null;
    }

    try {
      console.log('Fetching club details for ID:', clubId);
      const response = await fetch(`${API_URL}clubs.php?action=get_club&club_id=${clubId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Club details response:', result);
      
      if (result.success && result.data) {
        setClubInfo(result.data);
        return result.data;
      } else {
        console.log('Club not found, using fallback');
        // Use fallback club info from route params
        setClubInfo({
          club_name: clubName || 'Club',
          description: 'Club details loading...'
        });
        return null;
      }
    } catch (error) {
      console.error('Error fetching club details:', error);
      // Use fallback club info
      setClubInfo({
        club_name: clubName || 'Club',
        description: 'Unable to load club details'
      });
      return null;
    }
  };

  // Fetch club members
  const fetchClubMembers = async () => {
    if (!clubId) {
      setLoading(false);
      setError('No club selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching members for club ID:', clubId);
      const response = await fetch(`${API_URL}club_members.php?action=get_by_club&club_id=${clubId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Members response:', result);
      
      if (result.success) {
        setMembers(result.data || []);
        console.log(`✅ Loaded ${result.data?.length || 0} members`);
      } else {
        throw new Error(result.message || 'Failed to fetch members');
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setError('Failed to load club members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchClubDetails(),
      fetchClubMembers(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    // Check if we have clubId
    if (!clubId) {
      showAlert({ type: 'error', title: 'Error', message: 'Club information not found. Please go back and try again.' });
      setLoading(false);
      setError('No club ID provided');
      return;
    }
    
    fetchClubDetails();
    fetchClubMembers();
  }, [clubId]);

  const getRoleIcon = (role) => {
    switch (role) {
      case 'president': return 'star';
      case 'vice_president': return 'star-half';
      case 'secretary': return 'edit';
      case 'treasurer': return 'attach-money';
      default: return 'person';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'president': return '#E74C3C';
      case 'vice_president': return '#F39C12';
      case 'secretary': return '#27AE60';
      case 'treasurer': return '#3498DB';
      default: return '#7f8c8d';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'president': return 'President';
      case 'vice_president': return 'Vice President';
      case 'secretary': return 'Secretary';
      case 'treasurer': return 'Treasurer';
      default: return 'Member';
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

  const filteredMembers = members.filter(member =>
    member.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group members by role
  const groupedMembers = {
    president: [],
    vice_president: [],
    secretary: [],
    treasurer: [],
    member: []
  };

  filteredMembers.forEach(member => {
    const role = member.role || 'member';
    if (groupedMembers[role]) {
      groupedMembers[role].push(member);
    } else {
      groupedMembers.member.push(member);
    }
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading members...</Text>
      </View>
    );
  }

  if (error && members.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorTitle}>Unable to Load</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            fetchClubMembers();
            fetchClubDetails();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButtonOutline}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentDashboard')}
        >
          <Text style={styles.backButtonOutlineText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Club Members</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Club Info Card */}
      <View style={styles.clubInfoCard}>
        <View style={styles.clubIconContainer}>
          <MaterialIcons name="groups" size={40} color={COLORS.primary} />
        </View>
        <View style={styles.clubInfoContent}>
          <Text style={styles.clubName}>{clubInfo?.club_name || clubName || 'Club'}</Text>
          <Text style={styles.clubDescription} numberOfLines={2}>
            {clubInfo?.description || 'No description available'}
          </Text>
          <View style={styles.clubStats}>
            <View style={styles.statBadge}>
              <MaterialIcons name="people" size={14} color={COLORS.primary} />
              <Text style={styles.statBadgeText}>{members.length} Members</Text>
            </View>
            {clubInfo?.patron && (
              <View style={styles.statBadge}>
                <MaterialIcons name="school" size={14} color={COLORS.primary} />
                <Text style={styles.statBadgeText}>Club Leader: {clubInfo.patron}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members by name, email or role..."
          placeholderTextColor={COLORS.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Members Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredMembers.length} {filteredMembers.length === 1 ? 'Member' : 'Members'}
        </Text>
      </View>

      {/* Members List */}
      <ScrollView 
        style={styles.membersList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="group-off" size={64} color={COLORS.grey} />
            <Text style={styles.emptyStateTitle}>No Members Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Try a different search term' : 'This club has no members yet'}
            </Text>
          </View>
        ) : (
          <>
            {/* Leadership Section */}
            {(groupedMembers.president.length > 0 || groupedMembers.vice_president.length > 0 || 
              groupedMembers.secretary.length > 0 || groupedMembers.treasurer.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Leadership Team</Text>
                {[...groupedMembers.president, ...groupedMembers.vice_president, 
                  ...groupedMembers.secretary, ...groupedMembers.treasurer].map(member => (
                  <View key={member.membership_id} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <MaterialIcons name={getRoleIcon(member.role)} size={30} color={getRoleColor(member.role)} />
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberHeader}>
                        <Text style={styles.memberName}>{member.student_name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(member.role) + '20' }]}>
                          <MaterialIcons name={getRoleIcon(member.role)} size={12} color={getRoleColor(member.role)} />
                          <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
                            {getRoleLabel(member.role)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.memberEmail}>{member.student_email}</Text>
                      <Text style={styles.joinDate}>Joined: {formatDate(member.join_date)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Members Section */}
            {groupedMembers.member.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Members ({groupedMembers.member.length})</Text>
                {groupedMembers.member.map(member => (
                  <View key={member.membership_id} style={styles.memberCard}>
                    <View style={styles.memberAvatar}>
                      <MaterialIcons name={getRoleIcon(member.role)} size={30} color={getRoleColor(member.role)} />
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberHeader}>
                        <Text style={styles.memberName}>{member.student_name}</Text>
                      </View>
                      <Text style={styles.memberEmail}>{member.student_email}</Text>
                      <Text style={styles.joinDate}>Joined: {formatDate(member.join_date)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  clubInfoCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: SIZES.radiusLg,
    ...SHADOWS.medium,
  },
  clubIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.statBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  clubInfoContent: {
    flex: 1,
  },
  clubName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  clubDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  clubStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  countContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  countText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.medium,
  },
  membersList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 12,
    paddingLeft: 4,
  },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  memberAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: COLORS.statBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  memberEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  backButtonOutline: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 12,
  },
  backButtonOutlineText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ClubMembers;
