// screens/student/SelectClub.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const SelectClub = ({ navigation, route }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const { clubs, purpose, destination } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClubs = clubs?.filter(club =>
    club.club_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelectClub = (club) => {
    if (destination === 'ClubMembers') {
      navigation.navigate('ClubMembers', {
        clubId: club.club_id,
        clubName: club.club_name
      });
    }
  };

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: COLORS.background }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StudentDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Club</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your clubs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.grey}
        />
      </View>

      {filteredClubs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="groups" size={64} color={COLORS.grey} />
          <Text style={styles.emptyText}>No clubs found</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate('BrowseTab')}
          >
            <Text style={styles.browseButtonText}>Browse Clubs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {filteredClubs.map(club => (
            <TouchableOpacity
              key={club.club_id}
              style={styles.clubCard}
              onPress={() => handleSelectClub(club)}
            >
              <View style={styles.clubIcon}>
                <MaterialIcons name="groups" size={30} color={COLORS.primary} />
              </View>
              <View style={styles.clubInfo}>
                <Text style={styles.clubName}>{club.club_name}</Text>
                <Text style={styles.clubDescription} numberOfLines={1}>
                  {club.description || 'No description'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={COLORS.grey} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerBg,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.white, flex: 1, textAlign: 'center', marginRight: 48 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 12,
    borderRadius: SIZES.radius,
    ...SHADOWS.small,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: COLORS.text },
  list: { paddingHorizontal: 16 },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  clubIcon: { width: 50, alignItems: 'center' },
  clubInfo: { flex: 1, marginLeft: 12 },
  clubName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  clubDescription: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16 },
  browseButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: SIZES.radius, marginTop: 16 },
  browseButtonText: { color: COLORS.white, fontSize: 16, fontFamily: FONTS.bold },
});

export default SelectClub;
