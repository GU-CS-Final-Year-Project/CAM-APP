// screens/teacher/ClubMemberships.js - FULL CRUD for Teachers (Admin Style)
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL
const API_URL = 'http://192.168.43.107/cam/club_members.php';

const ClubMemberships = ({ navigation, route }) => {
  const { clubId, clubName } = route.params || {};
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Dropdown states
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);



  // State for custom alert/confirmation modal
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertTitle, setCustomAlertTitle] = useState('');
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertOnConfirm, setCustomAlertOnConfirm] = useState(null);
  const [customAlertShowCancel, setCustomAlertShowCancel] = useState(false);

  const [newMember, setNewMember] = useState({
    student_id: '',
    student_name: '',
    role: 'member'
  });

  // Role options
  const roleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'Vice President', value: 'vice_president' },
    { label: 'Secretary', value: 'secretary' },
    { label: 'Treasurer', value: 'treasurer' },
  ];

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchMembers(),
      new Promise(resolve => setTimeout(resolve, 600))
    ]).finally(() => setRefreshing(false));
  };

  const showCustomAlert = (title, message, onConfirm = null, showCancel = false) => {
    setCustomAlertTitle(title);
    setCustomAlertMessage(message);
    setCustomAlertOnConfirm(() => onConfirm);
    setCustomAlertShowCancel(showCancel);
    setCustomAlertVisible(true);
  };

  // Load user info
  const loadUserInfo = async () => {
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        setUserInfo(JSON.parse(userData));
        console.log('✅ Teacher Info:', userInfo);
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  // Fetch students (users with user_type = 'Student')
  const fetchStudents = async () => {
    try {
      console.log('Fetching students...');
      const response = await fetch('http://192.168.43.107/cam/users.php?action=get_students');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailableStudents(result.data);
        console.log('Students loaded:', result.data.length);
      } else {
        setAvailableStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setAvailableStudents([]);
    }
  };

  // Fetch members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_URL}?action=get_by_club&club_id=${clubId}`, {
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
        console.error('JSON parse error:', parseError);
        showCustomAlert('Error', 'Invalid JSON response from server');
        return;
      }
      
      if (data.success) {
        setMembers(data.data || []);
        console.log(`Loaded ${data.data?.length || 0} members`);
      } else {
        showCustomAlert('Error', data.message || 'Failed to fetch members');
        setMembers([]);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      showCustomAlert('Connection Error', error.message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Add member manually
  const handleAddMember = () => {
    setNewMember({
      student_id: '',
      student_name: '',
      role: 'member'
    });
    setShowStudentDropdown(false);
    setShowRoleDropdown(false);
    setAddModalVisible(true);
  };

  const handleAddFormSubmit = async () => {
    if (!newMember.student_id) {
      showCustomAlert('Validation Error', 'Please select a student');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          club_id: parseInt(clubId),
          student_id: parseInt(newMember.student_id),
          role: newMember.role,
          created_by: userInfo?.user_id
        })
      });
      
      const text = await response.text();
      let result;
      
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        showCustomAlert('Error', 'Invalid response from server');
        return;
      }

      if (result.success) {
        const membershipId = result.data?.membership_id;
        if (membershipId) {
          await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update',
              membership_id: membershipId,
              status: 'active'
            })
          });
        }
        showCustomAlert('Success', 'Student added successfully.');
        setAddModalVisible(false);
        fetchMembers();
      } else {
        showCustomAlert('Error', result.message || 'Failed to add member.');
      }
    } catch (error) {
      showCustomAlert('Error', `Failed to connect: ${error.message}`);
    }
  };

  const filteredMembers = useMemo(() => {
    let filtered = members.filter(m => (m.status || m.Status || '').toLowerCase() !== 'rejected');
    if (searchQuery) {
      filtered = filtered.filter(member =>
        member.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [members, searchQuery]);

  const getRoleColor = (role) => {
    switch (role) {
      case 'president': return '#E74C3C';
      case 'vice_president': return '#F39C12';
      case 'secretary': return '#27AE60';
      case 'treasurer': return '#3498DB';
      default: return '#7f8c8d';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'president': return 'star';
      case 'vice_president': return 'star-half';
      case 'secretary': return 'edit';
      case 'treasurer': return 'attach-money';
      default: return 'person';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#27AE60';
      case 'inactive': return '#E74C3C';
      case 'suspended': return '#F39C12';
      case 'graduated': return '#3498DB';
      case 'pending': return '#F39C12';
      case 'rejected': return '#E74C3C';
      default: return '#7f8c8d';
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

  const handleRemoveMember = (membershipId, studentName) => {
    showCustomAlert(
      'Remove Member',
      `Are you sure you want to remove ${studentName} from this club?`,
      async () => {
        try {
          const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'delete',
              membership_id: membershipId,
            }),
          });
          const result = await response.json();
          if (result.success) {
            showCustomAlert('Removed', `${studentName} has been removed from the club.`);
            fetchMembers();
          } else {
            showCustomAlert('Error', result.message || 'Failed to remove member.');
          }
        } catch (e) {
          showCustomAlert('Error', 'Network error.');
        }
      },
      true
    );
  };

  const renderMemberCard = (member) => {
    const status = (member.status || member.Status || 'active').toLowerCase();
    const statusColor = getStatusColor(status);
    return (
    <View key={member.membership_id} style={styles.memberCard}>
      <View style={styles.cardHeader}>
        <View style={styles.memberInfo}>
          <View style={styles.memberHeaderRow}>
            <Text style={styles.studentName}>{member.student_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
            </View>
          </View>
          <Text style={styles.studentEmail}>{member.student_email}</Text>
          <View style={styles.roleBadge}>
            <MaterialIcons name={getRoleIcon(member.role)} size={14} color={getRoleColor(member.role)} />
            <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
              {member.role?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberDetail}>📅 Joined: {formatDate(member.join_date)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.removeBtn]}
          onPress={() => handleRemoveMember(member.membership_id, member.student_name)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="person-remove" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );};

  useEffect(() => {
    loadUserInfo();
    fetchMembers();
    fetchStudents();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMembers();
      fetchStudents();
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashTab', { screen: 'ClubLeaderDashboard' })}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {clubName || 'Club Members'}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddMember}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by student name or email..."
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

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMembers}>
        <MaterialIcons name="refresh" size={20} color="#4A90E2" />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Members/Requests List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.list} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filteredMembers.length === 0 ? { flexGrow: 1 } : {}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Members ({members.length})</Text>
          </View>
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => renderMemberCard(member))
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="group" size={64} color="#ccc" />
              <Text style={styles.noDataText}>
                {searchQuery ? 'No members match your search' : 'No members found'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddMember}>
                  <Text style={styles.addFirstButtonText}>Add First Member</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Member Modal */}
      <Modal animationType="slide" transparent visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Member</Text>
                <TouchableOpacity onPress={() => {
                  setAddModalVisible(false);
                  setShowStudentDropdown(false);
                }}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Select Student Dropdown */}
                <Text style={styles.inputLabel}>Select Student *</Text>
                <TouchableOpacity 
                  style={styles.pickerWrapper}
                  onPress={() => {
                    setShowStudentDropdown(!showStudentDropdown);
                  }}
                >
                  <MaterialIcons name="person" size={20} color="#666" />
                  <Text style={styles.pickerText}>
                    {newMember.student_name || 'Select a student...'}
                  </Text>
                  <MaterialIcons name={showStudentDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="#666" />
                </TouchableOpacity>

                {showStudentDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                      {availableStudents.length === 0 ? (
                        <Text style={styles.dropdownItemText}>No students found</Text>
                      ) : (
                        availableStudents.map(student => (
                          <TouchableOpacity
                            key={student.user_id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setNewMember({ 
                                ...newMember, 
                                student_id: student.user_id.toString(), 
                                student_name: student.user_name 
                              });
                              setShowStudentDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{student.user_name} ({student.email})</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

                {/* Role Dropdown */}
                <Text style={styles.inputLabel}>Role</Text>
                <TouchableOpacity 
                  style={styles.pickerWrapper}
                  onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                >
                  <MaterialIcons name="badge" size={20} color="#666" />
                  <Text style={styles.pickerText}>
                    {roleOptions.find(r => r.value === newMember.role)?.label || 'Select role...'}
                  </Text>
                  <MaterialIcons name={showRoleDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="#666" />
                </TouchableOpacity>

                {showRoleDropdown && (
                  <View style={styles.dropdownList}>
                    {roleOptions.map(role => (
                      <TouchableOpacity
                        key={role.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setNewMember({ ...newMember, role: role.value });
                          setShowRoleDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{role.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <TouchableOpacity style={styles.submitButton} onPress={handleAddFormSubmit}>
                  <Text style={styles.submitButtonText}>Add Member</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customAlertVisible}
        onRequestClose={() => setCustomAlertVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCustomAlertVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.customAlertContent}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setCustomAlertVisible(false)}>
                <MaterialIcons name="close" size={22} color="#999" />
              </TouchableOpacity>
              <Text style={styles.customAlertTitle}>{customAlertTitle}</Text>
              <Text style={styles.customAlertMessage}>{customAlertMessage}</Text>
              <View style={styles.customAlertButtons}>
                {customAlertShowCancel && (
                  <TouchableOpacity
                    style={[styles.customAlertButton, styles.customAlertCancelButton]}
                    onPress={() => setCustomAlertVisible(false)}
                  >
                    <Text style={styles.customAlertButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.customAlertButton, styles.customAlertConfirmButton]}
                  onPress={() => {
                    if (customAlertOnConfirm) {
                      customAlertOnConfirm();
                    }
                    setCustomAlertVisible(false);
                  }}
                >
                  <Text style={styles.customAlertButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  addButton: { padding: 8 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#333' },

  sectionHeader: { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  refreshText: { color: '#4A90E2', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  list: { flex: 1, paddingHorizontal: 16 },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  cardHeader: { marginBottom: 12 },
  memberInfo: { flex: 1 },
  memberHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', flex: 1, marginRight: 8 },
  studentEmail: { fontSize: 12, color: '#7f8c8d', marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  roleText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  memberDetails: { marginTop: 8 },
  memberDetail: { fontSize: 12, color: '#7f8c8d', marginBottom: 4 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 12,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveBtn: { backgroundColor: '#27AE60' },
  rejectBtn: { backgroundColor: '#E74C3C' },
  removeBtn: { backgroundColor: '#E74C3C' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },



  closeButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 10 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    height: 50,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },

  submitButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, color: '#666', marginTop: 16, textAlign: 'center' },
  addFirstButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  customAlertContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
      android: { elevation: 5 },
    }),
  },
  customAlertTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  customAlertMessage: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#666' },
  customAlertButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  customAlertButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  customAlertConfirmButton: { backgroundColor: '#4A90E2' },
  customAlertCancelButton: { backgroundColor: '#ccc' },
  customAlertButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ClubMemberships;