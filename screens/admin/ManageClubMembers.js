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

// ✅ FIXED: Use consistent base URL for all API calls
const BASE_URL = 'http://192.168.43.107/cam/';
const API_URL = `${BASE_URL}club_members.php`;
const CLUBS_API_URL = `${BASE_URL}clubs.php`;
const USERS_API_URL = `${BASE_URL}users.php`;

const ManageClubMembers = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Dropdown states
  const [showClubDropdown, setShowClubDropdown] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showEditRoleDropdown, setShowEditRoleDropdown] = useState(false);
  const [showEditStatusDropdown, setShowEditStatusDropdown] = useState(false);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const { showAlert } = useAlert();
  const [activeFilter, setActiveFilter] = useState('all');

  const [newMember, setNewMember] = useState({
    club_id: '',
    club_name: '',
    student_id: '',
    student_name: '',
    role: 'member',
    status: 'active'
  });

  const [editedMember, setEditedMember] = useState({
    membership_id: null,
    club_id: '',
    student_id: '',
    role: 'member',
    status: 'active',
    student_name: ''
  });

  // Role options
  const roleOptions = [
    { label: 'Member', value: 'member' },
    { label: 'President', value: 'president' },
    { label: 'Vice President', value: 'vice_president' },
    { label: 'Secretary', value: 'secretary' },
    { label: 'Treasurer', value: 'treasurer' },
  ];

  // Status options
  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Graduated', value: 'graduated' },
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
  ];

  // ✅ FIXED: Fetch clubs for dropdown with correct URL
  const fetchClubs = async () => {
    try {
      console.log('📚 Fetching clubs from:', `${CLUBS_API_URL}?action=get`);
      const response = await fetch(`${CLUBS_API_URL}?action=get`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Clubs response:', result);
      
      if (result.success && result.data) {
        setClubs(result.data);
        console.log('✅ Clubs loaded:', result.data.length);
      } else {
        console.log('No clubs found');
        setClubs([]);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error.message);
      setClubs([]);
    }
  };

  // ✅ FIXED: Fetch students with correct URL (using get_all_users then filter, or get_students endpoint)
  const fetchStudents = async () => {
    try {
      console.log('📚 Fetching students from:', `${USERS_API_URL}?action=get_students`);
      
      // Try to fetch students using get_students action
      const response = await fetch(`${USERS_API_URL}?action=get_students`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Students response:', result);
      
      if (result.success && result.data) {
        // Check if data is an array or has students property
        if (Array.isArray(result.data)) {
          setStudents(result.data);
          console.log('✅ Students loaded:', result.data.length);
        } else if (result.data.students) {
          setStudents(result.data.students);
          console.log('✅ Students loaded:', result.data.students.length);
        } else {
          setStudents([]);
          console.log('No students found in response');
        }
      } else {
        console.log('No students found or API error');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error.message);
      // Try alternative endpoint: get_all_users and filter
      try {
        console.log('Trying alternative: fetching all users and filtering...');
        const allUsersResponse = await fetch(`${USERS_API_URL}?action=get_all`);
        const allUsersResult = await allUsersResponse.json();
        
        if (allUsersResult.success && allUsersResult.data) {
          const users = Array.isArray(allUsersResult.data) ? allUsersResult.data : allUsersResult.data.users || [];
          const filteredStudents = users.filter(user => user.user_type === 'Student');
          setStudents(filteredStudents);
          console.log('✅ Students loaded from alternative endpoint:', filteredStudents.length);
        } else {
          setStudents([]);
        }
      } catch (altError) {
        console.error('Alternative fetch also failed:', altError.message);
        setStudents([]);
      }
    }
  };

  // Fetch members
  const fetchMembers = async () => {
    try {
      setLoading(true);
      
      console.log('📚 Fetching members from:', `${API_URL}?action=get`);
      
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
        console.error('JSON parse error:', parseError);
        showAlert({ type: 'error', title: 'Error', message: 'Invalid JSON response from server' });
        setMembers([]);
        return;
      }
      
      if (data.success) {
        setMembers(data.data || []);
        console.log(`✅ Loaded ${data.data?.length || 0} members`);
      } else {
        console.error('API error:', data.message);
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to fetch members' });
        setMembers([]);
      }
    } catch (error) {
      console.error('Fetch error:', error.message);
      showAlert({ type: 'error', title: 'Connection Error', message: `Failed to connect: ${error.message}` });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter members based on search query and status filter
  const filteredMembers = useMemo(() => {
    let filtered = members;
    if (activeFilter !== 'all') {
      filtered = filtered.filter(m => m.status === activeFilter || m.Status === activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1));
    }
    if (searchQuery) {
      filtered = filtered.filter(member =>
        member.club_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.status?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [members, searchQuery, activeFilter]);

  const handleAddMember = () => {
    setNewMember({
      club_id: '',
      club_name: '',
      student_id: '',
      student_name: '',
      role: 'member',
      status: 'active'
    });
    setShowClubDropdown(false);
    setShowStudentDropdown(false);
    setShowRoleDropdown(false);
    setAddModalVisible(true);
  };

  const handleEditMember = (member) => {
    setEditedMember({
      membership_id: member.membership_id,
      club_id: member.club_id?.toString(),
      student_id: member.student_id?.toString(),
      role: member.role,
      status: member.status,
      student_name: member.student_name
    });
    setEditModalVisible(true);
  };

  const handleDeleteMember = (member) => {
    showAlert({
      type: 'confirm',
      title: 'Remove Member',
      message: `Are you sure you want to remove "${member.student_name}" from "${member.club_name}"?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'OK', onPress: () => confirmDelete(member.membership_id) }
      ]
    });
  };

  const confirmDelete = async (membership_id) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          membership_id: membership_id
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
        showAlert({ type: 'success', title: 'Success', message: 'Member removed successfully!' });
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to remove member.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleApproveMember = async (member) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          membership_id: member.membership_id,
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
        showAlert({ type: 'success', title: 'Approved', message: `${member.student_name} has been approved as a member!` });
        fetchMembers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to approve member.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleRejectMember = (member) => {
    showAlert({
      type: 'confirm',
      title: 'Reject Member',
      message: `Are you sure you want to reject "${member.student_name}" from "${member.club_name}"?`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', onPress: () => confirmReject(member.membership_id, member.student_name) }
      ]
    });
  };

  const confirmReject = async (membership_id, student_name) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          membership_id: membership_id
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
        showAlert({ type: 'success', title: 'Rejected', message: `${student_name}'s membership request has been rejected.` });
        fetchMembers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to reject member.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleAddFormSubmit = async () => {
    if (!newMember.club_id) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Please select a club' });
      return;
    }
    if (!newMember.student_id) {
      showAlert({ type: 'warning', title: 'Validation Error', message: 'Please select a student' });
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
          club_id: parseInt(newMember.club_id),
          student_id: parseInt(newMember.student_id),
          role: newMember.role,
          status: newMember.status
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
        showAlert({ type: 'success', title: 'Success', message: 'Member added successfully!' });
        setAddModalVisible(false);
        fetchMembers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to add member.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const handleEditFormSubmit = async () => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          membership_id: editedMember.membership_id,
          role: editedMember.role,
          status: editedMember.status
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
        showAlert({ type: 'success', title: 'Success', message: 'Member updated successfully!' });
        setEditModalVisible(false);
        fetchMembers();
      } else {
        showAlert({ type: 'error', title: 'Error', message: result.message || 'Failed to update member.' });
      }
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: `Failed to connect: ${error.message}` });
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'president': return COLORS.error;
      case 'vice_president': return '#F39C12';
      case 'secretary': return COLORS.primaryLight;
      case 'treasurer': return COLORS.info;
      default: return COLORS.textSecondary;
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
      case 'active': return COLORS.primaryLight;
      case 'inactive': return COLORS.error;
      case 'suspended': return '#F39C12';
      case 'graduated': return COLORS.info;
      case 'pending': return '#F39C12';
      case 'rejected': return COLORS.error;
      default: return COLORS.textSecondary;
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

  // ✅ FIXED: Added key prop to the member card
  const renderMemberCard = (member) => (
    <View key={member.membership_id} style={styles.memberCard}>
      <View style={styles.cardHeader}>
        <View style={styles.memberInfo}>
          <View style={styles.memberHeaderRow}>
            <Text style={styles.clubName}>{member.club_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(member.status) }]}>
              <Text style={styles.statusText}>{member.status}</Text>
            </View>
          </View>
          <Text style={styles.studentName}>{member.student_name}</Text>
          <Text style={styles.studentEmail}>{member.student_email}</Text>
          <View style={styles.roleBadge}>
            <MaterialIcons name={getRoleIcon(member.role)} size={14} color={getRoleColor(member.role)} />
            <Text style={[styles.roleText, { color: getRoleColor(member.role) }]}>
              {member.role?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberDetail}>📅 Joined: {formatDate(member.join_date)}</Text>
            {member.end_date && <Text style={styles.memberDetail}>📆 Ended: {formatDate(member.end_date)}</Text>}
            <Text style={styles.memberDetail}>👤 Added by: {member.created_by_name || 'System'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardActions}>
        {member.status === 'pending' ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveMember(member)}
            >
              <MaterialIcons name="check" size={16} color="#27AE60" />
              <Text style={[styles.actionText, styles.approveText]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectMember(member)}
            >
              <MaterialIcons name="close" size={16} color="#e74c3c" />
              <Text style={[styles.actionText, styles.rejectText]}>Reject</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditMember(member)}
            >
              <MaterialIcons name="edit" size={16} color="#F39C12" />
              <Text style={[styles.actionText, styles.editText]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteMember(member)}
            >
              <MaterialIcons name="delete" size={16} color="#e74c3c" />
              <Text style={[styles.actionText, styles.deleteText]}>Remove</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchMembers();
      fetchClubs();
      fetchStudents();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    fetchMembers();
    fetchClubs();
    fetchStudents();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Club Members</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddMember}>
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by club, student name, or role..."
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
          <Text style={styles.overviewNumber}>{members.length}</Text>
          <Text style={styles.overviewLabel}>Total Members</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.primaryLight }]}>
            {members.filter(m => m.status === 'active' || m.Status === 'Active').length}
          </Text>
          <Text style={styles.overviewLabel}>Active</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: '#F39C12' }]}>
            {members.filter(m => m.status === 'pending' || m.Status === 'Pending').length}
          </Text>
          <Text style={styles.overviewLabel}>Pending</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={[styles.overviewNumber, { color: COLORS.error }]}>
            {members.filter(m => m.status === 'inactive' || m.Status === 'Inactive').length}
          </Text>
          <Text style={styles.overviewLabel}>Inactive</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['all', 'active', 'pending'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'all' ? ` (${members.length})` : ` (${members.filter(m => m.status === tab || m.Status === tab.charAt(0).toUpperCase() + tab.slice(1)).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchMembers}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Members List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.membersList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={members.length === 0 ? { flexGrow: 1 } : {}}
          refreshControl={<RefreshControl refreshing={refreshing}           onRefresh={() => { setRefreshing(true); Promise.all([fetchMembers(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}
        >
          {filteredMembers.length > 0 ? (
            filteredMembers.map(renderMemberCard)
          ) : (
            <View key="empty-state" style={styles.noDataContainer}>
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
                  setShowClubDropdown(false);
                  setShowStudentDropdown(false);
                }}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Select Club Dropdown */}
                <Text style={styles.inputLabel}>Select Club *</Text>
                <TouchableOpacity 
                  style={styles.pickerWrapper}
                  onPress={() => {
                    setShowClubDropdown(!showClubDropdown);
                    setShowStudentDropdown(false);
                  }}
                >
                  <MaterialIcons name="groups" size={20} color="#666" />
                  <Text style={styles.pickerText}>
                    {newMember.club_name || 'Select a club...'}
                  </Text>
                  <MaterialIcons name={showClubDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="#666" />
                </TouchableOpacity>

                {showClubDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                      {clubs.length === 0 ? (
                        <Text style={styles.dropdownItemText}>No clubs found</Text>
                      ) : (
                        clubs.map(club => (
                          <TouchableOpacity
                            key={club.club_id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setNewMember({ ...newMember, club_id: club.club_id.toString(), club_name: club.club_name });
                              setShowClubDropdown(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{club.club_name}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

                {/* Select Student Dropdown */}
                <Text style={styles.inputLabel}>Select Student *</Text>
                <TouchableOpacity 
                  style={styles.pickerWrapper}
                  onPress={() => {
                    setShowStudentDropdown(!showStudentDropdown);
                    setShowClubDropdown(false);
                    console.log('Students available:', students.length);
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
                      {students.length === 0 ? (
                        <Text style={styles.dropdownItemText}>No students found. Add students first.</Text>
                      ) : (
                        students.map(student => (
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

      {/* Edit Member Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Member</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>Student</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: COLORS.lightGrey }]}>
                  <MaterialIcons name="person" size={20} color="#666" />
                  <Text style={styles.disabledText}>{editedMember.student_name}</Text>
                </View>

                {/* Edit Role Dropdown */}
                <Text style={styles.inputLabel}>Role</Text>
                <TouchableOpacity 
                  style={styles.pickerWrapper}
                  onPress={() => setShowEditRoleDropdown(!showEditRoleDropdown)}
                >
                  <MaterialIcons name="badge" size={20} color="#666" />
                  <Text style={styles.pickerText}>
                    {roleOptions.find(r => r.value === editedMember.role)?.label || 'Select role...'}
                  </Text>
                  <MaterialIcons name={showEditRoleDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="#666" />
                </TouchableOpacity>

                {showEditRoleDropdown && (
                  <View style={styles.dropdownList}>
                    {roleOptions.map(role => (
                      <TouchableOpacity
                        key={role.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setEditedMember({ ...editedMember, role: role.value });
                          setShowEditRoleDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{role.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Edit Status Dropdown */}
                <Text style={styles.inputLabel}>Status</Text>
                <TouchableOpacity 
                  style={styles.pickerWrapper}
                  onPress={() => setShowEditStatusDropdown(!showEditStatusDropdown)}
                >
                  <MaterialIcons name="toggle-on" size={20} color="#666" />
                  <Text style={styles.pickerText}>
                    {statusOptions.find(s => s.value === editedMember.status)?.label || 'Select status...'}
                  </Text>
                  <MaterialIcons name={showEditStatusDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="#666" />
                </TouchableOpacity>

                {showEditStatusDropdown && (
                  <View style={styles.dropdownList}>
                    {statusOptions.map(status => (
                      <TouchableOpacity
                        key={status.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setEditedMember({ ...editedMember, status: status.value });
                          setShowEditStatusDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{status.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
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
  overviewLabel: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
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
  loadingText: { marginTop: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  membersList: { flex: 1, paddingHorizontal: 16 },
  memberCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardHeader: { marginBottom: 12 },
  memberInfo: { flex: 1 },
  memberHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubName: { fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold, color: COLORS.text, flex: 1, marginRight: 8 },
  studentName: { fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium, color: COLORS.text, marginBottom: 2 },
  studentEmail: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 8 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  roleText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, color: COLORS.white, fontWeight: '600', fontFamily: FONTS.medium },
  memberDetails: { marginTop: 8 },
  memberDetail: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 4 },
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
  approveButton: { backgroundColor: 'rgba(39, 174, 96, 0.1)' },
  rejectButton: { backgroundColor: 'rgba(231, 76, 60, 0.1)' },
  actionText: { fontSize: 14, marginLeft: 4, fontWeight: '500', fontFamily: FONTS.medium },
  editText: { fontFamily: FONTS.medium, color: '#F39C12' },
  deleteText: { fontFamily: FONTS.medium, color: '#e74c3c' },
  approveText: { fontFamily: FONTS.medium, color: '#27AE60' },
  rejectText: { fontFamily: FONTS.medium, color: '#e74c3c' },
  filterTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
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
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.lightGrey,
    paddingHorizontal: 12,
    height: 50,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  dropdownItemText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  disabledText: { flex: 1, fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginLeft: 8 },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', fontFamily: FONTS.bold },
  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noDataText: { fontSize: 16, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 16, textAlign: 'center' },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageClubMembers;