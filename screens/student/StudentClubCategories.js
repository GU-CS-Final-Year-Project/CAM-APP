import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';

const CATEGORY_API = 'http://192.168.43.107/cam/club_categories.php';
const CLUBS_API = 'http://192.168.43.107/cam/clubs.php';
const MEMBERS_API = 'http://192.168.43.107/cam/club_members.php';

const categoryColors = ['#2E7D32', '#388E3C', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#1B5E20', '#43A047'];
const categoryIcons = ['category', 'groups', 'star', 'auto-awesome', 'school', 'palette', 'music-note', 'sports-esports'];

const StudentClubCategories = ({ navigation }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [myJoinedClubs, setMyJoinedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [joiningClub, setJoiningClub] = useState(null);
  const joiningRef = useRef({});
  const { showAlert } = useAlert();

  const fetchData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setStudentId(parsed.user_id);
      }
      const [catRes, clubRes] = await Promise.all([
        fetch(`${CATEGORY_API}?action=get_public`),
        fetch(`${CLUBS_API}?action=get`),
      ]);
      const catData = await catRes.json();
      const clubData = await clubRes.json();
      if (catData.success) setCategories(catData.data || []);
      if (clubData.success) setAllClubs(clubData.data || []);

      if (userData) {
        const { user_id } = JSON.parse(userData);
        const memRes = await fetch(`${MEMBERS_API}?action=get_by_student&student_id=${user_id}`);
        const memData = await memRes.json();
        if (memData.success && memData.data) setMyJoinedClubs(memData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchData(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const performJoinClub = async (clubId) => {
    if (!clubId || !studentId) {
      showAlert({ type: 'warning', title: 'Error', message: 'Unable to join club. Please try logging in again.' });
      return;
    }
    if (joiningRef.current[clubId]) return;
    joiningRef.current[clubId] = true;
    try {
      setJoiningClub(clubId);
      setMyJoinedClubs(prev => [...prev, { club_id: clubId, status: 'active' }]);
      const response = await fetch(MEMBERS_API, {
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
      if (result.success) {
        const membershipId = result.data?.membership_id;
        if (membershipId) {
          await fetch(MEMBERS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              membership_id: membershipId,
              status: 'active',
            }),
          });
        }
        showAlert({ type: 'success', title: 'Joined', message: 'You have successfully joined the club!' });
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const { user_id } = JSON.parse(userData);
          const memRes = await fetch(`${MEMBERS_API}?action=get_by_student&student_id=${user_id}`);
          const memData = await memRes.json();
          if (memData.success && memData.data) setMyJoinedClubs(memData.data);
        }
      } else {
        setMyJoinedClubs(prev => prev.filter(m => m.club_id !== clubId));
        showAlert({
          type: result.message?.includes('already') ? 'warning' : 'error',
          title: result.message?.includes('already') ? 'Already a Member' : 'Error',
          message: result.message || 'Failed to send request',
        });
      }
    } catch (e) {
      setMyJoinedClubs(prev => prev.filter(m => m.club_id !== clubId));
      showAlert({ type: 'error', title: 'Error', message: 'Network error. Please try again.' });
    } finally {
      setJoiningClub(null);
      delete joiningRef.current[clubId];
    }
  };

  const filteredCategories = categories.filter(category =>
    category.CategoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.Description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Club Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search categories or clubs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.grey}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : filteredCategories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="search-off" size={64} color={COLORS.grey} />
          <Text style={styles.emptyText}>No categories found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2E7D32']}
              tintColor="#2E7D32"
            />
          }
        >
          {filteredCategories.map((cat, idx) => {
            const catClubs = allClubs.filter(c => c.category_id === cat.CategoryID);
            if (searchQuery && catClubs.length === 0) {
              const matchesCategory = cat.CategoryName?.toLowerCase().includes(searchQuery.toLowerCase());
              if (!matchesCategory) return null;
            }
            const color = categoryColors[idx % categoryColors.length];
            const icon = categoryIcons[idx % categoryIcons.length];
            return (
              <View key={cat.CategoryID} style={styles.catSection}>
                <TouchableOpacity
                  style={styles.catHeader}
                  onPress={() => navigation.navigate('BrowseClubs', { categoryId: cat.CategoryID, categoryName: cat.CategoryName })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: color + '20' }]}>
                    <MaterialIcons name={icon} size={18} color={color} />
                  </View>
                  <Text style={styles.catName}>{cat.CategoryName}</Text>
                  <Text style={styles.catCount}>{catClubs.length}</Text>
                </TouchableOpacity>

                {catClubs.length === 0 ? (
                  <Text style={styles.emptyCatText}>No clubs in this category</Text>
                ) : (
                  catClubs.map(club => {
                    const memberEntry = myJoinedClubs.find(m => m.club_id === club.club_id);
                    const memberStatus = memberEntry ? (memberEntry.status || memberEntry.Status || 'active').toLowerCase() : null;
                    return (
                      <TouchableOpacity
                        key={club.club_id}
                        style={styles.clubCard}
                        activeOpacity={0.7}
                        onPress={() => performJoinClub(club.club_id)}
                        disabled={joiningClub === club.club_id}
                      >
                        <View style={styles.clubCardTop}>
                          <MaterialIcons name="groups" size={22} color={COLORS.primary} />
                          <View style={styles.clubCardInfo}>
                            <Text style={styles.clubCardName} numberOfLines={1}>{club.club_name}</Text>
                            <Text style={styles.clubCardDesc} numberOfLines={1}>{club.description || 'No description'}</Text>
                          </View>
                        </View>
                        <View style={styles.clubCardMeta}>
                          <MaterialIcons name="people" size={12} color={COLORS.textSecondary} />
                          <Text style={styles.clubCardMetaText}>{club.member_count || 0}</Text>
                          {club.meeting_location && (
                            <>
                              <MaterialIcons name="location-on" size={12} color={COLORS.textSecondary} />
                              <Text style={styles.clubCardMetaText} numberOfLines={1}>{club.meeting_location}</Text>
                            </>
                          )}
                        </View>
                        <View style={styles.clubCardBottom}>
                          {joiningClub === club.club_id ? (
                            <View style={styles.joinBadge}>
                              <ActivityIndicator size="small" color={COLORS.primary} />
                              <Text style={styles.joinBadgeText}>Joining...</Text>
                            </View>
                          ) : memberStatus === 'active' ? (
                            <View style={[styles.joinBadge, { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' }]}>
                              <MaterialIcons name="check-circle" size={14} color="#2E7D32" />
                              <Text style={[styles.joinBadgeText, { color: '#2E7D32' }]}>Joined</Text>
                            </View>
                          ) : memberStatus === 'pending' ? (
                            <View style={[styles.joinBadge, { backgroundColor: '#FFF3E0', borderColor: '#FF9800' }]}>
                              <MaterialIcons name="hourglass-empty" size={14} color="#FF9800" />
                              <Text style={[styles.joinBadgeText, { color: '#FF9800' }]}>Pending</Text>
                            </View>
                          ) : (
                            <View style={styles.joinBadge}>
                              <MaterialIcons name="touch-app" size={14} color={COLORS.primary} />
                              <Text style={styles.joinBadgeText}>Tap to join</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
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
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white, textAlign: 'center', flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: FONTS.regular,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  catSection: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 12,
    ...SHADOWS.small,
  },
  catHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catName: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  catCount: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  emptyCatText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingLeft: 46,
  },
  clubCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 8,
  },
  clubCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  clubCardInfo: {
    flex: 1,
  },
  clubCardName: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 2,
  },
  clubCardDesc: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  clubCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginLeft: 32,
  },
  clubCardMetaText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  clubCardBottom: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  joinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.statBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  joinBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    color: COLORS.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontFamily: FONTS.regular,
  },
});

export default StudentClubCategories;
