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
const API_URL = 'http://192.168.43.107/cam/club_categories.php';

const ManageClubCategories = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert } = useAlert();

  const [newCategory, setNewCategory] = useState({
    category_name: '',
    description: ''
  });

  const [editedCategory, setEditedCategory] = useState({
    category_id: null,
    category_name: '',
    description: ''
  });

  // Helper validation functions
  const containsNumber = (str) => {
    return /\d/.test(str);
  };

  const isValidCategoryName = (name) => {
    // Allow only letters, spaces, hyphens, apostrophes, and ampersands (NO NUMBERS)
    return /^[a-zA-Z\s\-'&]+$/.test(name.trim());
  };

  const isValidDescription = (desc) => {
    // Allow letters, numbers, spaces, and common punctuation
    return /^[a-zA-Z0-9\s\-'",.!?;:()&]+$/.test(desc.trim());
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      console.log('📚 Fetching categories from:', `${API_URL}?action=get`);
      
      const response = await fetch(`${API_URL}?action=get`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 404) {
        throw new Error(`PHP file not found (404). Please check if club_categories.php exists`);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Raw response:', text);
      
      if (!text.trim()) {
        throw new Error('Server returned empty response');
      }
      
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid JSON response from server' });
        return;
      }
      
      console.log('Parsed data:', data);
      
      if (data.success) {
        let categoriesData = [];
        
        if (data.data && Array.isArray(data.data)) {
          categoriesData = data.data;
        } else if (Array.isArray(data.categories)) {
          categoriesData = data.categories;
        } else if (Array.isArray(data)) {
          categoriesData = data;
        }
        
        console.log('Extracted categories data:', categoriesData);
        
        const formattedCategories = categoriesData.map(category => ({
          category_id: category.category_id,
          category_name: category.category_name,
          description: category.description,
          created_by: category.created_by,
          created_at: category.created_at,
          updated_at: category.updated_at
        }));
        
        console.log('Formatted categories:', formattedCategories);
        setCategories(formattedCategories);
        console.log(`✅ Loaded ${formattedCategories.length} categories`);
      } else {
        console.log('❌ API returned error:', data.message);
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

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    
    return categories.filter(category =>
      category.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  // Real-time input filtering for add form
  const handleAddFormChange = (field, value) => {
    let processedValue = value;
    
    if (field === 'category_name') {
      // Allow only letters, spaces, hyphens, apostrophes, and ampersands - NO NUMBERS
      processedValue = value.replace(/[^a-zA-Z\s\-'&]/g, '');
      // Limit length to 100 characters
      if (processedValue.length > 100) {
        processedValue = processedValue.slice(0, 100);
      }
    }
    else if (field === 'description') {
      // Allow letters, numbers, spaces, and common punctuation
      processedValue = value.replace(/[^a-zA-Z0-9\s\-'",.!?;:()&]/g, '');
      // Limit length to 500 characters
      if (processedValue.length > 500) {
        processedValue = processedValue.slice(0, 500);
      }
    }
    
    setNewCategory({ ...newCategory, [field]: processedValue });
  };

  // Real-time input filtering for edit form
  const handleEditFormChange = (field, value) => {
    let processedValue = value;
    
    if (field === 'category_name') {
      // Allow only letters, spaces, hyphens, apostrophes, and ampersands - NO NUMBERS
      processedValue = value.replace(/[^a-zA-Z\s\-'&]/g, '');
      // Limit length to 100 characters
      if (processedValue.length > 100) {
        processedValue = processedValue.slice(0, 100);
      }
    }
    else if (field === 'description') {
      // Allow letters, numbers, spaces, and common punctuation
      processedValue = value.replace(/[^a-zA-Z0-9\s\-'",.!?;:()&]/g, '');
      // Limit length to 500 characters
      if (processedValue.length > 500) {
        processedValue = processedValue.slice(0, 500);
      }
    }
    
    setEditedCategory({ ...editedCategory, [field]: processedValue });
  };

  const validateForm = (category, isEdit = false) => {
    // Category Name validation
    if (!category.category_name.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name is required' });
      return false;
    }
    
    if (category.category_name.length < 3) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name must be at least 3 characters long' });
      return false;
    }
    
    if (category.category_name.length > 100) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name cannot exceed 100 characters' });
      return false;
    }
    
    // Check for numbers in category name
    if (containsNumber(category.category_name)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name cannot contain numbers' });
      return false;
    }
    
    if (!isValidCategoryName(category.category_name)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Category name can only contain letters, spaces, hyphens, apostrophes, and ampersands (&). Numbers are not allowed.' });
      return false;
    }
    
    // Check for duplicate category name (case-insensitive)
    const isDuplicate = categories.some(existingCategory => 
      existingCategory.category_name?.toLowerCase() === category.category_name.trim().toLowerCase() &&
      (!isEdit || existingCategory.category_id !== category.category_id)
    );
    
    if (isDuplicate) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'A category with this name already exists. Please use a different name.' });
      return false;
    }

    // Description validation
    if (!category.description.trim()) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description is required' });
      return false;
    }
    
    if (category.description.length < 10) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description must be at least 10 characters long' });
      return false;
    }
    
    if (category.description.length > 500) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description cannot exceed 500 characters' });
      return false;
    }
    
    if (!isValidDescription(category.description)) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Description contains invalid characters. Please use only letters, numbers, spaces, and common punctuation marks.' });
      return false;
    }
    
    return true;
  };

  const handleAddCategory = () => {
    setNewCategory({
      category_name: '',
      description: ''
    });
    setAddModalVisible(true);
  };

  const handleEditCategory = (category) => {
    setEditedCategory({
      category_id: category.category_id,
      category_name: category.category_name,
      description: category.description
    });
    setEditModalVisible(true);
  };

  const handleDeleteCategory = (category) => {
    showAlert({
      type: 'confirm',
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.category_name}"? This action cannot be undone and may affect clubs associated with this category.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => confirmDelete(category.category_id) }
      ]
    });
  };

  const confirmDelete = async (category_id) => {
    try {
      console.log('🗑️ Deleting category:', category_id);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          category_id: category_id
        })
      });
      
      const text = await response.text();
      console.log('Delete response:', text);
      
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
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
      console.error('❌ Delete error:', error);
    }
  };

  const handleAddFormSubmit = async () => {
    if (!validateForm(newCategory, false)) return;

    try {
      console.log('➕ Adding category:', newCategory);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          category_name: newCategory.category_name.trim(),
          description: newCategory.description.trim()
        })
      });
      
      const text = await response.text();
      console.log('Add response:', text);
      
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
        setNewCategory({ category_name: '', description: '' });
        fetchCategories();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add category.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
      console.error('❌ Add error:', error);
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
          category_id: editedCategory.category_id,
          category_name: editedCategory.category_name.trim(),
          description: editedCategory.description.trim()
        })
      });
      
      const text = await response.text();
      console.log('Update response:', text);
      
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
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
      console.error('❌ Update error:', error);
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
    <View style={styles.categoryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName}>{category.category_name}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
          <Text style={styles.categoryDate}>Created: {formatDate(category.created_at)}</Text>
          {category.updated_at && category.updated_at !== category.created_at && (
            <Text style={styles.categoryDate}>Updated: {formatDate(category.updated_at)}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditCategory(category)}
        >
          <MaterialIcons name="edit" size={16} color="#F39C12" />
          <Text style={[styles.actionText, styles.editText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCategory(category)}
        >
          <MaterialIcons name="delete" size={16} color="#e74c3c" />
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

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Club Categories</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by category name or description..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewNumber}>{categories.length}</Text>
          <Text style={styles.overviewLabel}>Total Categories</Text>
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
            filteredCategories.map((category) => (
              <View key={category.category_id}>
                {renderCategoryCard(category)}
              </View>
            ))
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="category" size={64} color="#ccc" />
              <Text style={styles.noDataText}>
                {searchQuery ? 'No categories match your search' : 'No categories found'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddCategory}>
                  <Text style={styles.addFirstButtonText}>Add Your First Category</Text>
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
                <Text style={styles.modalTitle}>Add New Category</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Category Name * (3-100 characters, No numbers allowed)" 
                  value={newCategory.category_name} 
                  onChangeText={(text) => handleAddFormChange('category_name', text)} 
                  placeholderTextColor="#999"
                  maxLength={100}
                />
                
                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Description * (10-500 characters)" 
                  value={newCategory.description} 
                  onChangeText={(text) => handleAddFormChange('description', text)} 
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                
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
                <Text style={styles.modalTitle}>Edit Category</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput 
                  style={styles.formInput} 
                  placeholder="Category Name * (3-100 characters, No numbers allowed)" 
                  value={editedCategory.category_name} 
                  onChangeText={(text) => handleEditFormChange('category_name', text)} 
                  placeholderTextColor="#999"
                  maxLength={100}
                />
                
                <TextInput 
                  style={[styles.formInput, styles.textArea]} 
                  placeholder="Description * (10-500 characters)" 
                  value={editedCategory.description} 
                  onChangeText={(text) => handleEditFormChange('description', text)} 
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
                
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
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: COLORS.text, fontFamily: FONTS.regular },
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
    ...SHADOWS.small,
  },
  overviewNumber: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.primary },
  overviewLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center', fontFamily: FONTS.regular },
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
  refreshText: { color: COLORS.primary, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium, marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  categoriesList: { flex: 1, paddingHorizontal: 16 },
  categoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 8 },
  categoryDescription: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 20, fontFamily: FONTS.regular },
  categoryDate: { fontSize: 12, color: COLORS.textSecondary, fontFamily: FONTS.regular },
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
  editText: { color: '#F39C12', fontFamily: FONTS.medium },
  deleteText: { color: '#e74c3c', fontFamily: FONTS.medium },
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
  formInput: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold },
  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center', fontFamily: FONTS.regular },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageClubCategories;