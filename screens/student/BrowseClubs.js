import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const categoryColors = ['#2E7D32', '#388E3C', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#1B5E20', '#43A047'];
const categoryIcons = ['category', 'groups', 'star', 'auto-awesome', 'school', 'palette', 'music-note', 'sports-esports'];

const BrowseClubs = ({ navigation, route }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [clubs, setClubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [joiningClub, setJoiningClub] = useState(null);
  const [studentId, setStudentId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [myMemberships, setMyMemberships] = useState({});
  const joiningRef = useRef({});
  const { showAlert } = useAlert();

  const API_URL = 'http://192.168.43.107/cam/';

  useEffect(() => {
    const categoryId = route?.params?.categoryId;
    if (categoryId) {
      setSelectedCategory(categoryId.toString());
    }
    loadInitialData();
    const unsubscribe = navigation.addListener('focus', loadStudentInfo);
    return unsubscribe;
  }, [navigation, route?.params?.categoryId]);

  const loadInitialData = async () => {
    setLoading(true);
    await loadStudentInfo();
    await Promise.all([fetchClubs(), fetchCategories(), fetchMyJoinedClubs()]);
    setLoading(false);
  };

  const loadStudentInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setStudentId(parsedUser.user_id);
      } else {
        setStudentId(null);
      }
    } catch (error) {
      console.error('Error loading student info:', error);
      setStudentId(null);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch(`${API_URL}clubs.php?action=get`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setClubs(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch clubs');
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to load clubs. Please try again.', buttons: [{ text: 'OK' }] });
      setClubs([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}club_categories.php?action=get_public`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setCategories(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchMyJoinedClubs = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const { user_id } = JSON.parse(userData);
        const res = await fetch(`${API_URL}club_members.php?action=get_by_student&student_id=${user_id}`);
        const result = await res.json();
        if (result.success && result.data) {
          const membershipMap = {};
          result.data.forEach(m => {
            const status = m.status || m.Status || 'active';
            membershipMap[m.club_id] = status.toLowerCase();
          });
          setMyMemberships(membershipMap);
        }
      }
    } catch (e) {}
  };

  const handleClubPress = (club) => {
    Alert.alert(
      club.club_name,
      `${club.description || ''}\n\nLocation: ${club.meeting_location || 'TBA'}\nSchedule: ${club.meeting_schedule || 'TBA'}\n\nDo you want to join this club?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join Club', onPress: () => performJoinClub(club.club_id) }
      ]
    );
  };

  const performJoinClub = async (clubId) => {
    if (!clubId || !studentId) {
      showAlert({ type: 'warning', title: 'Error', message: 'Unable to join club. Please try logging in again.', buttons: [{ text: 'OK' }] });
      return;
    }
    if (joiningRef.current[clubId]) return;
    joiningRef.current[clubId] = true;
    try {
      setJoiningClub(clubId);
      setMyMemberships(prev => ({ ...prev, [clubId]: 'active' }));
      const response = await fetch(`${API_URL}club_members.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          club_id: clubId,
          student_id: studentId,
          role: 'member',
        }),
      });
      const result = await response.json();
      console.log('Join club result:', JSON.stringify(result));

      if (result.success) {
        const membershipId = result.data?.membership_id;
        if (membershipId) {
          await fetch(`${API_URL}club_members.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              membership_id: membershipId,
              status: 'active',
            }),
          });
        }
        showAlert({ type: 'success', title: 'Joined', message: 'You have successfully joined the club!', buttons: [{ text: 'OK' }] });
      } else {
        setMyMemberships(prev => {
          const next = { ...prev };
          delete next[clubId];
          return next;
        });
        if (result.message?.includes('already a member') || result.message?.includes('already')) {
          await fetchMyJoinedClubs();
          showAlert({ type: 'warning', title: 'Already a Member', message: 'You are already a member of this club.', buttons: [{ text: 'OK' }] });
        } else {
          showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to send request', buttons: [{ text: 'OK' }] });
        }
      }
    } catch (error) {
      console.error('Error joining club:', error);
      setMyMemberships(prev => {
        const next = { ...prev };
        delete next[clubId];
        return next;
      });
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.', buttons: [{ text: 'OK' }] });
    } finally {
      setJoiningClub(null);
      delete joiningRef.current[clubId];
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchClubs(),
      fetchCategories(),
      loadStudentInfo(),
      fetchMyJoinedClubs(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.club_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         club.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || club.category_id?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getClubCount = (categoryId) => {
    return clubs.filter(c => c.category_id?.toString() === categoryId?.toString()).length;
  };

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading clubs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'StudentDashboard' })} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Clubs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clubs..."
          placeholderTextColor={COLORS.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Dropdown */}
      <View style={styles.sectionHeader}>
        <MaterialIcons name="category" size={20} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Category</Text>
      </View>

      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.7}
      >
        <MaterialIcons name={selectedCategory === 'all' ? 'apps' : 'label'} size={20} color={COLORS.primary} />
        <Text style={styles.dropdownButtonText}>
          {selectedCategory === 'all'
            ? 'All Clubs'
            : categories.find(c => c.CategoryID?.toString() === selectedCategory)?.CategoryName || 'All Clubs'
          }
        </Text>
        <Text style={styles.dropdownCount}>
          {selectedCategory === 'all' ? clubs.length : getClubCount(selectedCategory)} clubs
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={showDropdown} transparent animationType="fade" onRequestClose={() => setShowDropdown(false)}>
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowDropdown(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.dropdownItem, selectedCategory === 'all' && styles.dropdownItemActive]}
                onPress={() => { setSelectedCategory('all'); setShowDropdown(false); }}
              >
                <View style={[styles.dropdownItemIcon, { backgroundColor: COLORS.primary }]}>
                  <MaterialIcons name="apps" size={18} color={COLORS.white} />
                </View>
                <Text style={[styles.dropdownItemText, selectedCategory === 'all' && styles.dropdownItemTextActive]}>
                  All Clubs
                </Text>
                <Text style={styles.dropdownItemCount}>{clubs.length}</Text>
                {selectedCategory === 'all' && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
              </TouchableOpacity>

              {categories.map((category, index) => {
                const color = categoryColors[index % categoryColors.length];
                const icon = categoryIcons[index % categoryIcons.length];
                const count = getClubCount(category.CategoryID);
                const isActive = selectedCategory === category.CategoryID?.toString();

                return (
                  <TouchableOpacity
                    key={category.CategoryID}
                    style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                    onPress={() => { setSelectedCategory(category.CategoryID?.toString()); setShowDropdown(false); }}
                  >
                    <View style={[styles.dropdownItemIcon, { backgroundColor: color }]}>
                      <MaterialIcons name={icon} size={18} color={COLORS.white} />
                    </View>
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {category.CategoryName}
                    </Text>
                    <Text style={styles.dropdownItemCount}>{count}</Text>
                    {isActive && <MaterialIcons name="check" size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Clubs Section Header */}
      <View style={styles.sectionHeader}>
        <MaterialIcons name="groups" size={20} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>
          {selectedCategory === 'all'
            ? `All Clubs (${filteredClubs.length})`
            : `Clubs (${filteredClubs.length})`
          }
        </Text>
      </View>

      {/* Clubs List */}
      <ScrollView
        style={styles.clubsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={filteredClubs.length === 0 ? styles.emptyListContent : styles.listContent}
      >
        {filteredClubs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color={COLORS.grey} />
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedCategory !== 'all'
                ? 'No clubs match your search criteria'
                : 'No clubs available'
              }
            </Text>
          </View>
        ) : (
          filteredClubs.map(club => (
            <TouchableOpacity
              key={club.club_id}
              style={styles.clubCard}
              activeOpacity={0.7}
              onPress={() => handleClubPress(club)}
              disabled={joiningClub === club.club_id}
            >
              <View style={styles.clubCardTop}>
                <View style={styles.clubCardLeft}>
                  <View style={styles.clubIconContainer}>
                    <MaterialIcons name="groups" size={28} color={COLORS.primary} />
                  </View>
                </View>
                <View style={styles.clubCardRight}>
                  <View style={styles.clubHeader}>
                    <Text style={styles.clubName} numberOfLines={1}>{club.club_name}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.clubCategory}>
                        {categories.find(cat => cat.CategoryID === club.category_id)?.CategoryName || 'General'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.clubDescription} numberOfLines={2}>{club.description}</Text>
                  <View style={styles.clubMeta}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="people" size={14} color={COLORS.primary} />
                      <Text style={styles.metaText}>{club.member_count || 0} members</Text>
                    </View>
                    {club.meeting_location && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="location-on" size={14} color={COLORS.primary} />
                        <Text style={styles.metaText} numberOfLines={1}>{club.meeting_location}</Text>
                      </View>
                    )}
                    {club.meeting_schedule && (
                      <View style={styles.metaItem}>
                        <MaterialIcons name="schedule" size={14} color={COLORS.primary} />
                        <Text style={styles.metaText} numberOfLines={1}>{club.meeting_schedule}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.clubCardBottom}>
                {joiningClub === club.club_id ? (
                  <View style={styles.joiningIndicator}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.joiningText}>Joining...</Text>
                  </View>
                ) : myMemberships[club.club_id] === 'active' ? (
                  <View style={[styles.tapHint, { backgroundColor: '#E8F5E9' }]}>
                    <MaterialIcons name="check-circle" size={14} color="#2E7D32" />
                    <Text style={[styles.tapHintText, { color: '#2E7D32' }]}>Joined</Text>
                  </View>
                ) : myMemberships[club.club_id] === 'pending' ? (
                  <View style={[styles.tapHint, { backgroundColor: '#FFF3E0' }]}>
                    <MaterialIcons name="hourglass-empty" size={14} color="#FF9800" />
                    <Text style={[styles.tapHintText, { color: '#FF9800' }]}>Pending</Text>
                  </View>
                ) : (
                  <View style={styles.tapHint}>
                    <MaterialIcons name="touch-app" size={14} color={COLORS.primary} />
                    <Text style={styles.tapHintText}>Tap to join</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
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
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white, textAlign: 'center', flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
    ...SHADOWS.small,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  dropdownCount: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 32,
  },
  dropdownModal: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    maxHeight: '70%',
    ...SHADOWS.large,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: SIZES.radius,
    marginBottom: 4,
    gap: 12,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.statBg,
  },
  dropdownItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  dropdownItemCount: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  clubsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  clubCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  clubCardTop: {
    flexDirection: 'row',
  },
  clubCardLeft: {
    marginRight: 12,
    alignItems: 'center',
  },
  clubIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.statBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubCardRight: {
    flex: 1,
  },
  clubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  clubName: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: COLORS.statBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  clubCategory: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  clubDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
    fontFamily: FONTS.regular,
  },
  clubMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  clubCardBottom: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  joiningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  joiningText: {
    fontSize: 14,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tapHintText: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
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
    fontFamily: FONTS.regular,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
});

export default BrowseClubs;
