import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert } from '../../components/CustomAlert';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

// API URL
const API_URL = 'http://192.168.43.107/cam/sportscategories.php';

const ManageSportsCategories = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlert();

  const [newCategory, setNewCategory] = useState({
    CategoryName: '',
    Description: '',
    SportType: 'Team',
    Gender: 'Any'
  });

  const [editedCategory, setEditedCategory] = useState({
    SportCategoryID: null,
    CategoryName: '',
    Description: '',
    SportType: 'Team',
    Gender: 'Any'
  });

  const sportTypes = ['Individual', 'Team', 'Both'];
  const genderOptions = ['Male', 'Female', 'Mixed', 'Any'];

  // Validation function to check if string contains numbers
  const containsNumber = (str) => {
    return /\d/.test(str);
  };

  // Validation function to check if string contains only letters and spaces (no numbers, no special characters)
  const isValidText = (str) => {
    return /^[a-zA-Z\s]+$/.test(str);
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      console.log('📚 Fetching sports categories from:', `${API_URL}?action=get`);
      
      const response = await fetch(`${API_URL}?action=get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      
      if (!text.trim()) {
        throw new Error('Server returned empty response');
      }
      
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response format from server' });
        return;
      }
      
      if (data.success) {
        setCategories(data.data || []);
        console.log(`✅ Loaded ${data.data?.length || 0} categories`);
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to fetch categories' });
        setCategories([]);
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      showAlert({ type: 'error', title: 'Connection Error', message: error.message });
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    
    return categories.filter(category =>
      category.CategoryName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.Description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.SportType?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const handleAddCategory = () => {
    setNewCategory({
      CategoryName: '',
      Description: '',
      SportType: 'Team',
      Gender: 'Any'
    });
    setAddModalVisible(true);
  };

  const handleEditCategory = (category) => {
    setEditedCategory({
      SportCategoryID: category.SportCategoryID,
      CategoryName: category.CategoryName,
      Description: category.Description || '',
      SportType: category.SportType || 'Team',
      Gender: category.Gender || 'Any'
    });
    setEditModalVisible(true);
  };

  const handleDeleteCategory = (category) => {
    showAlert({
      type: 'confirm',
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.CategoryName}"? This action cannot be undone.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => confirmDelete(category.SportCategoryID) }
      ]
    });
  };

  const confirmDelete = async (SportCategoryID) => {
    try {
      console.log('🗑️ Deleting category:', SportCategoryID);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          SportCategoryID: SportCategoryID
        })
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Category deleted successfully!' });
        fetchCategories();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to delete category.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  // Handle add form change - only filter numbers from CategoryName, allow anything in Description
  const handleAddFormChange = (field, value) => {
    if (field === 'CategoryName') {
      // Remove numbers from Category Name
      let filteredValue = value.replace(/[0-9]/g, '');
      setNewCategory({ ...newCategory, [field]: filteredValue });
    } else {
      // No filtering for Description and other fields
      setNewCategory({ ...newCategory, [field]: value });
    }
  };

  // Handle edit form change - only filter numbers from CategoryName, allow anything in Description
  const handleEditFormChange = (field, value) => {
    if (field === 'CategoryName') {
      // Remove numbers from Category Name
      let filteredValue = value.replace(/[0-9]/g, '');
      setEditedCategory({ ...editedCategory, [field]: filteredValue });
    } else {
      // No filtering for Description and other fields
      setEditedCategory({ ...editedCategory, [field]: value });
    }
  };

  const validateForm = (category, isEdit = false) => {
    // Check if Category Name is empty
    if (!category.CategoryName?.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name is required' });
      return false;
    }
    
    // Check if Category Name contains numbers
    if (containsNumber(category.CategoryName)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name cannot contain numbers. Please use only letters and spaces.' });
      return false;
    }
    
    // Check if Category Name has at least 3 characters
    if (category.CategoryName.length < 3) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name must be at least 3 characters' });
      return false;
    }
    
    // Check if Category Name has valid characters (letters and spaces only)
    if (!isValidText(category.CategoryName)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name can only contain letters and spaces. No numbers or special characters allowed.' });
      return false;
    }

    // DESCRIPTION VALIDATION REMOVED - Description can now contain anything
    
    return true;
  };

  const handleAddFormSubmit = async () => {
    if (!validateForm(newCategory)) return;

    try {
      console.log('➕ Adding category:', newCategory);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          CategoryName: newCategory.CategoryName.trim(),
          Description: newCategory.Description?.trim() || '',
          SportType: newCategory.SportType,
          Gender: newCategory.Gender
        })
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Category added successfully!' });
        setAddModalVisible(false);
        fetchCategories();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add category.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleEditFormSubmit = async () => {
    if (!validateForm(editedCategory, true)) return;

    try {
      console.log('✏️ Updating category:', editedCategory);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          SportCategoryID: editedCategory.SportCategoryID,
          CategoryName: editedCategory.CategoryName.trim(),
          Description: editedCategory.Description?.trim() || '',
          SportType: editedCategory.SportType,
          Gender: editedCategory.Gender
        })
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid response from server' });
        return;
      }

      if (result.success) {
        showAlert({ type: 'success', title: 'Success', message: 'Category updated successfully!' });
        setEditModalVisible(false);
        fetchCategories();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update category.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const getSportTypeIcon = (sportType) => {
    switch (sportType) {
      case 'Individual': return 'person';
      case 'Team': return 'groups';
      case 'Both': return 'sports';
      default: return 'sports';
    }
  };

  const getGenderIcon = (gender) => {
    switch (gender) {
      case 'Male': return 'male';
      case 'Female': return 'female';
      case 'Mixed': return 'people';
      default: return 'person';
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

  const renderCategoryCard = (category) => (
    <View key={category.SportCategoryID} style={styles.categoryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.CategoryName}</Text>
          <Text style={styles.categoryDescription}>{category.Description}</Text>
          <View style={styles.categoryTags}>
            <View style={styles.tag}>
              <MaterialIcons name={getSportTypeIcon(category.SportType)} size={14} color={COLORS.primary} />
              <Text style={styles.tagText}>{category.SportType}</Text>
            </View>
            <View style={styles.tag}>
              <MaterialIcons name={getGenderIcon(category.Gender)} size={14} color="#9B59B6" />
              <Text style={styles.tagText}>{category.Gender}</Text>
            </View>
          </View>
          <Text style={styles.categoryDate}>Created: {formatDate(category.CreatedOn)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditCategory(category)}
        >
          <MaterialIcons name="edit" size={16} color={COLORS.warning} />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCategory(category)}
        >
          <MaterialIcons name="delete" size={16} color={COLORS.error} />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCategories();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const getStats = () => {
    const total = categories.length;
    const team = categories.filter(c => c.SportType === 'Team').length;
    const individual = categories.filter(c => c.SportType === 'Individual').length;
    const both = categories.filter(c => c.SportType === 'Both').length;
    return { total, team, individual, both };
  };

  const stats = getStats();

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Sports Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.grey} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by category name or description..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={COLORS.grey} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewNumber}>{stats.total}</Text>
          <Text style={styles.overviewLabel}>Total</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.primaryLight }]}>{stats.team}</Text>
          <Text style={styles.overviewLabel}>Team Sports</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.info }]}>{stats.individual}</Text>
          <Text style={styles.overviewLabel}>Individual</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.warning }]}>{stats.both}</Text>
          <Text style={styles.overviewLabel}>Both</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchCategories}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Categories List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.categoriesList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={categories.length === 0 ? { flexGrow: 1 } : {}}
          refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchCategories(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => renderCategoryCard(category))
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="sports" size={64} color={COLORS.grey} />
              <Text style={styles.noDataText}>
                {searchQuery ? 'No categories match your search' : 'No categories found'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddCategory}>
                  <Text style={styles.addFirstButtonText}>Add First Category</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Category Modal */}
      <Modal animationType="slide" transparent visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Sports Category</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.grey} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Category Name * (Letters and spaces only, no numbers)" 
                  value={newCategory.CategoryName} 
                  onChangeText={(text) => handleAddFormChange('CategoryName', text)} 
                  placeholderTextColor="#999"
                />
                
                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Description (Any text allowed)" 
                  value={newCategory.Description} 
                  onChangeText={(text) => handleAddFormChange('Description', text)} 
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {/* Sport Type Picker */}
                <Text style={styles.inputLabel}>Sport Type *</Text>
                <View style={styles.typeOptions}>
                  {sportTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        newCategory.SportType === type && styles.typeOptionSelected
                      ]}
                      onPress={() => handleAddFormChange('SportType', type)}
                    >
                      <MaterialIcons 
                        name={getSportTypeIcon(type)} 
                        size={18} 
                        color={newCategory.SportType === type ? COLORS.white : COLORS.grey} 
                      />
                      <Text style={[
                        styles.typeOptionText,
                        newCategory.SportType === type && styles.typeOptionTextSelected
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Gender Picker */}
                <Text style={styles.inputLabel}>Gender Category</Text>
                <View style={styles.genderOptions}>
                  {genderOptions.map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderOption,
                        newCategory.Gender === gender && styles.genderOptionSelected
                      ]}
                      onPress={() => handleAddFormChange('Gender', gender)}
                    >
                      <MaterialIcons 
                        name={getGenderIcon(gender)} 
                        size={18} 
                        color={newCategory.Gender === gender ? COLORS.white : COLORS.grey} 
                      />
                      <Text style={[
                        styles.genderOptionText,
                        newCategory.Gender === gender && styles.genderOptionTextSelected
                      ]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity style={styles.submitButton} onPress={handleAddFormSubmit}>
                  <Text style={styles.submitButtonText}>Add Category</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Category Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Sports Category</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.grey} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={[styles.formInput, { backgroundColor: COLORS.lightGrey }]} 
                  placeholder="Category ID" 
                  value={editedCategory.SportCategoryID ? editedCategory.SportCategoryID.toString() : ''} 
                  editable={false} 
                  placeholderTextColor="#999" 
                />
                
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Category Name * (Letters and spaces only, no numbers)" 
                  value={editedCategory.CategoryName} 
                  onChangeText={(text) => handleEditFormChange('CategoryName', text)} 
                  placeholderTextColor="#999" 
                />
                
                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Description (Any text allowed)" 
                  value={editedCategory.Description} 
                  onChangeText={(text) => handleEditFormChange('Description', text)} 
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                {/* Sport Type Picker */}
                <Text style={styles.inputLabel}>Sport Type *</Text>
                <View style={styles.typeOptions}>
                  {sportTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        editedCategory.SportType === type && styles.typeOptionSelected
                      ]}
                      onPress={() => handleEditFormChange('SportType', type)}
                    >
                      <MaterialIcons 
                        name={getSportTypeIcon(type)} 
                        size={18} 
                        color={editedCategory.SportType === type ? COLORS.white : COLORS.grey} 
                      />
                      <Text style={[
                        styles.typeOptionText,
                        editedCategory.SportType === type && styles.typeOptionTextSelected
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Gender Picker */}
                <Text style={styles.inputLabel}>Gender Category</Text>
                <View style={styles.genderOptions}>
                  {genderOptions.map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderOption,
                        editedCategory.Gender === gender && styles.genderOptionSelected
                      ]}
                      onPress={() => handleEditFormChange('Gender', gender)}
                    >
                      <MaterialIcons 
                        name={getGenderIcon(gender)} 
                        size={18} 
                        color={editedCategory.Gender === gender ? COLORS.white : COLORS.grey} 
                      />
                      <Text style={[
                        styles.genderOptionText,
                        editedCategory.Gender === gender && styles.genderOptionTextSelected
                      ]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <TouchableOpacity style={styles.submitButton} onPress={handleEditFormSubmit}>
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.white, flex: 1, textAlign: 'center' },
  addButton: { padding: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...SHADOWS.small,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, fontFamily: FONTS.regular, color: COLORS.text },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  overviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    ...SHADOWS.small,
  },
  overviewNumber: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.primary },
  overviewLabel: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.grey, marginTop: 4, textAlign: 'center' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  refreshText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 16, fontWeight: '600', marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontFamily: FONTS.regular, color: COLORS.grey },
  categoriesList: { flex: 1, paddingHorizontal: 16 },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
  categoryDescription: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 20 },
  categoryTags: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  tagText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.primary, fontWeight: '500' },
  categoryDate: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGrey,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  editButton: { backgroundColor: 'rgba(243, 156, 18, 0.1)' },
  deleteButton: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  actionText: { fontSize: 14, marginLeft: 4, fontWeight: '500', fontFamily: FONTS.medium },
  editText: { color: COLORS.warning },
  deleteText: { color: COLORS.error },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.text },
  inputLabel: { fontSize: 14, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 8, marginTop: 12 },
  formInput: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeOptions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.lightGrey,
    marginHorizontal: 4,
    gap: 6,
  },
  typeOptionSelected: { backgroundColor: COLORS.primary },
  typeOptionText: { fontSize: 14, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.grey },
  typeOptionTextSelected: { fontFamily: FONTS.medium, color: COLORS.white },
  genderOptions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.lightGrey,
    marginHorizontal: 4,
    gap: 6,
  },
  genderOptionSelected: { backgroundColor: '#9B59B6' },
  genderOptionText: { fontSize: 14, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.grey },
  genderOptionTextSelected: { fontFamily: FONTS.medium, color: COLORS.white },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold },
  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.grey, marginTop: 16, textAlign: 'center' },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageSportsCategories;
