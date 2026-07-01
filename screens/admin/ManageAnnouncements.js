import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
  Switch,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { useAlert } from '../../components/CustomAlert';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = 'http://192.168.43.107/cam/announcements.php';

const ManageAnnouncements = ({ navigation, route }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showPublishDatePicker, setShowPublishDatePicker] = useState(false);
  const [showPublishTimePicker, setShowPublishTimePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showExpiryTimePicker, setShowExpiryTimePicker] = useState(false);
  const [publishTempDate, setPublishTempDate] = useState(new Date());
  const [expiryTempDate, setExpiryTempDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');

  const [newAnnouncement, setNewAnnouncement] = useState({
    Title: '',
    Content: '',
    TargetAudience: 'All',
    Priority: 'Medium',
    PublishDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ExpiryDate: '',
    Status: 'Draft',
    SendEmailNotification: false,
    SendPushNotification: false
  });

  const [editedAnnouncement, setEditedAnnouncement] = useState({
    AnnouncementID: null,
    Title: '',
    Content: '',
    TargetAudience: 'All',
    Priority: 'Medium',
    PublishDate: '',
    ExpiryDate: '',
    Status: 'Draft',
    SendEmailNotification: false,
    SendPushNotification: false
  });

  const { showAlert } = useAlert();

  const scopedClubId = route.params?.clubId ? parseInt(route.params.clubId) : null;
  const scopedClubName = route.params?.clubName || null;

  const targetAudiences = ['All', 'Students', 'ClubLeader', 'Admins', 'Clubs'];
  const priorities = [
    { value: 'Low', label: 'Low', color: '#95A5A6', icon: 'flag' },
    { value: 'Medium', label: 'Medium', color: '#3498DB', icon: 'flag' },
    { value: 'High', label: 'High', color: '#F39C12', icon: 'flag' },
    { value: 'Urgent', label: 'Urgent', color: '#E74C3C', icon: 'warning' }
  ];
  const statuses = ['Draft', 'Published', 'Archived', 'Expired'];

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const url = scopedClubId
        ? `${API_URL}?action=get&club_id=${scopedClubId}`
        : `${API_URL}?action=get`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setAnnouncements(data.data || []);
    } catch (error) {
      console.error(error);
      showAlert({ type: 'error', title: 'Error', message: 'Failed to fetch announcements' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newAnnouncement.Title.trim() || !newAnnouncement.Content.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in title and content' });
      return;
    }
    if (/[0-9]/.test(newAnnouncement.Title)) {
      showAlert({ type: 'error', title: 'Error', message: 'Title must not contain numbers' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            Title: newAnnouncement.Title,
            Content: newAnnouncement.Content,
            TargetAudience: newAnnouncement.TargetAudience,
            Priority: newAnnouncement.Priority,
            PublishDate: newAnnouncement.PublishDate,
            ExpiryDate: newAnnouncement.ExpiryDate || null,
            Status: newAnnouncement.Status,
            club_id: scopedClubId || null,
            SendEmailNotification: newAnnouncement.SendEmailNotification ? 1 : 0,
            SendPushNotification: newAnnouncement.SendPushNotification ? 1 : 0
          })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid server response' });
        console.error('Server response:', text);
        return;
      }
      console.log('Add announcement response:', JSON.stringify(data));
      if (data.success) {
        const notif = data.data?.notifications;
        const emailErr = data.data?.email_error;
        let msg = 'Announcement added successfully';
        if (emailErr) {
          msg += `\n⚠ Email failed: ${emailErr}`;
        } else if (notif && notif.recipient_count > 0) {
          msg += `\n✅ Emails sent: ${notif.emails_sent}/${notif.recipient_count}`;
          if (notif.email_failed > 0) msg += ` (${notif.email_failed} failed)`;
        } else if (notif && notif.recipient_count === 0) {
          msg += '\n⚠ No recipients found (check user emails in database)';
        } else {
          msg += '\nℹ Email not requested';
        }
        if (notif && notif.push_recipient_count > 0) {
          msg += `\n📱 Push sent: ${notif.push_sent}/${notif.push_recipient_count}`;
          if (notif.push_failed > 0) msg += ` (${notif.push_failed} failed)`;
        }
        showAlert({ type: 'success', title: 'Success', message: msg });
        setAddModalVisible(false);
        resetNewForm();
        fetchAnnouncements();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to add announcement' });
      }
    } catch (error) {
      console.error('Error adding announcement:', error);
      showAlert({ type: 'error', title: 'Error', message: `Network error: ${error.message}` });
    }
  };

  const handleUpdate = async () => {
    if (!editedAnnouncement.Title.trim() || !editedAnnouncement.Content.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please fill in title and content' });
      return;
    }
    if (/[0-9]/.test(editedAnnouncement.Title)) {
      showAlert({ type: 'error', title: 'Error', message: 'Title must not contain numbers' });
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          AnnouncementID: editedAnnouncement.AnnouncementID,
          Title: editedAnnouncement.Title,
          Content: editedAnnouncement.Content,
          TargetAudience: editedAnnouncement.TargetAudience,
          Priority: editedAnnouncement.Priority,
          PublishDate: editedAnnouncement.PublishDate,
          ExpiryDate: editedAnnouncement.ExpiryDate || null,
          Status: editedAnnouncement.Status,
          SendEmailNotification: editedAnnouncement.SendEmailNotification ? 1 : 0,
          SendPushNotification: editedAnnouncement.SendPushNotification ? 1 : 0
        })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        showAlert({ type: 'error', title: 'Error', message: 'Invalid server response' });
        console.error('Server response:', text);
        return;
      }
      console.log('Update announcement response:', JSON.stringify(data));
      if (data.success) {
        const notif = data.data?.notifications;
        const emailErr = data.data?.email_error;
        let msg = 'Announcement updated successfully';
        if (emailErr) {
          msg += `\n⚠ Email failed: ${emailErr}`;
        } else if (notif && notif.recipient_count > 0) {
          msg += `\n✅ Emails sent: ${notif.emails_sent}/${notif.recipient_count}`;
          if (notif.email_failed > 0) msg += ` (${notif.email_failed} failed)`;
        } else if (notif && notif.recipient_count === 0) {
          msg += '\n⚠ No recipients found (check user emails in database)';
        } else {
          msg += '\nℹ Email not requested';
        }
        if (notif && notif.push_recipient_count > 0) {
          msg += `\n📱 Push sent: ${notif.push_sent}/${notif.push_recipient_count}`;
          if (notif.push_failed > 0) msg += ` (${notif.push_failed} failed)`;
        }
        showAlert({ type: 'success', title: 'Success', message: msg });
        setEditModalVisible(false);
        fetchAnnouncements();
      } else {
        showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to update announcement' });
      }
    } catch (error) {
      console.error('Error updating announcement:', error);
      showAlert({ type: 'error', title: 'Error', message: `Network error: ${error.message}` });
    }
  };

  const handleDelete = async (AnnouncementID, title) => {
    showAlert({ type: 'confirm', title: 'Confirm Delete', message: `Are you sure you want to delete "${title}"?`, buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', AnnouncementID })
              });
              const text = await res.text();
              let data;
              try {
                data = JSON.parse(text);
              } catch (parseError) {
                showAlert({ type: 'error', title: 'Error', message: 'Invalid server response' });
                console.error('Server response:', text);
                return;
              }
              if (data.success) {
                showAlert({ type: 'success', title: 'Success', message: 'Announcement deleted successfully' });
                fetchAnnouncements();
              } else {
                showAlert({ type: 'error', title: 'Error', message: data.message || 'Failed to delete announcement' });
              }
            } catch (error) {
              console.error('Error deleting announcement:', error);
              showAlert({ type: 'error', title: 'Error', message: `Network error: ${error.message}` });
            }
          }
        }
      ] });
  };

  const handleStatusChange = async (AnnouncementID, newStatus) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', AnnouncementID, Status: newStatus })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Server response:', text);
        return;
      }
      if (data.success) {
        fetchAnnouncements();
      }
    } catch (error) {
      console.error('Error changing announcement status:', error);
      showAlert({ type: 'error', title: 'Error', message: `Network error: ${error.message}` });
    }
  };

  const openEditModal = (announcement) => {
    setEditedAnnouncement({
      AnnouncementID: announcement.AnnouncementID,
      Title: announcement.Title,
      Content: announcement.Content,
      TargetAudience: announcement.TargetAudience || 'All',
      Priority: announcement.Priority || 'Medium',
      PublishDate: announcement.PublishDate?.slice(0, 19).replace('T', ' ') || '',
      ExpiryDate: announcement.ExpiryDate?.slice(0, 19).replace('T', ' ') || '',
      Status: announcement.Status || 'Draft',
      SendEmailNotification: announcement.SendEmailNotification == 1 || announcement.SendEmailNotification === true,
      SendPushNotification: announcement.SendPushNotification == 1 || announcement.SendPushNotification === true
    });
    setEditModalVisible(true);
  };

  const resetNewForm = () => {
    setNewAnnouncement({
      Title: '',
      Content: '',
      TargetAudience: 'All',
      Priority: 'Medium',
      PublishDate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ExpiryDate: '',
      Status: 'Draft',
      SendEmailNotification: false,
      SendPushNotification: false
    });
  };

  const handlePublishDateChange = (event, selectedDate) => {
    setShowPublishDatePicker(false);
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setPublishTempDate(selectedDate);
      setShowPublishTimePicker(true);
    }
  };

  const handlePublishTimeChange = (event, selectedTime) => {
    setShowPublishTimePicker(false);
    if (selectedTime && !isNaN(selectedTime.getTime())) {
      const combined = new Date(publishTempDate);
      combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      const formattedDate = combined.toISOString().slice(0, 19).replace('T', ' ');
      if (addModalVisible) {
        setNewAnnouncement(prev => ({ ...prev, PublishDate: formattedDate }));
      } else if (editModalVisible) {
        setEditedAnnouncement(prev => ({ ...prev, PublishDate: formattedDate }));
      }
    }
  };

  const handleExpiryDateChange = (event, selectedDate) => {
    setShowExpiryDatePicker(false);
    if (selectedDate && !isNaN(selectedDate.getTime())) {
      setExpiryTempDate(selectedDate);
      setShowExpiryTimePicker(true);
    }
  };

  const handleExpiryTimeChange = (event, selectedTime) => {
    setShowExpiryTimePicker(false);
    if (selectedTime && !isNaN(selectedTime.getTime())) {
      const combined = new Date(expiryTempDate);
      combined.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      const formattedDate = combined.toISOString().slice(0, 19).replace('T', ' ');
      if (addModalVisible) {
        setNewAnnouncement(prev => ({ ...prev, ExpiryDate: formattedDate }));
      } else if (editModalVisible) {
        setEditedAnnouncement(prev => ({ ...prev, ExpiryDate: formattedDate }));
      }
    }
  };

  const getPriorityColor = (priority) => {
    const p = priorities.find(p => p.value === priority);
    return p ? p.color : '#95A5A6';
  };

  const getPriorityIcon = (priority) => {
    const p = priorities.find(p => p.value === priority);
    return p ? p.icon : 'flag';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Published': return '#5CB85C';
      case 'Draft': return '#95A5A6';
      case 'Archived': return '#3498DB';
      case 'Expired': return '#E74C3C';
      default: return '#7f8c8d';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filterStatus !== 'all' && a.Status !== filterStatus) return false;
    if (filterAudience !== 'all' && a.TargetAudience !== filterAudience) return false;
    return true;
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('AdminDashboard')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {scopedClubName ? `${scopedClubName} Announcements` : 'Announcements'}
          </Text>
          {scopedClubName && (
            <View style={styles.headerBadge}>
              <MaterialIcons name="groups" size={12} color={COLORS.white} />
              <Text style={styles.headerBadgeText}>{scopedClubName}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
          <MaterialIcons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterStatus === 'all' && styles.filterChipActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {statuses.map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterAudience === 'all' && styles.filterChipActive]}
            onPress={() => setFilterAudience('all')}
          >
            <Text style={[styles.filterChipText, filterAudience === 'all' && styles.filterChipTextActive]}>All Audiences</Text>
          </TouchableOpacity>
          {targetAudiences.map(audience => (
            <TouchableOpacity
              key={audience}
              style={[styles.filterChip, filterAudience === audience && styles.filterChipActive]}
              onPress={() => setFilterAudience(audience)}
            >
              <Text style={[styles.filterChipText, filterAudience === audience && styles.filterChipTextActive]}>{audience}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Overview */}
      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{announcements.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#5CB85C' }]}>
            {announcements.filter(a => a.Status === 'Published').length}
          </Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F39C12' }]}>
            {announcements.filter(a => a.Priority === 'Urgent').length}
          </Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity style={styles.refreshButton} onPress={fetchAnnouncements}>
        <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
        <Text style={styles.refreshText}>Refresh List</Text>
      </TouchableOpacity>

      {/* Announcements List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); Promise.all([fetchAnnouncements(), new Promise(resolve => setTimeout(resolve, 600))]).finally(() => setRefreshing(false)); }} colors={['#2E7D32']} tintColor="#2E7D32" />}>
          {filteredAnnouncements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="campaign" size={64} color={COLORS.grey} />
              <Text style={styles.emptyText}>No announcements found</Text>
              <TouchableOpacity style={styles.addFirstButton} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.addFirstButtonText}>Create First Announcement</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAnnouncements.map(announcement => (
              <View key={announcement.AnnouncementID} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.announcementInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{announcement.Title}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(announcement.Priority) + '20' }]}>
                        <MaterialIcons name={getPriorityIcon(announcement.Priority)} size={14} color={getPriorityColor(announcement.Priority)} />
                        <Text style={[styles.priorityText, { color: getPriorityColor(announcement.Priority) }]}>
                          {announcement.Priority}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.content} numberOfLines={2}>{announcement.Content}</Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="people" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{announcement.TargetAudience}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="event" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>Publish: {formatDateTime(announcement.PublishDate)}</Text>
                      </View>
                      {announcement.ExpiryDate && (
                        <View style={styles.metaItem}>
                          <MaterialIcons name="event-busy" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.metaText}>Expires: {formatDateTime(announcement.ExpiryDate)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(announcement.Status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(announcement.Status) }]}>
                        {announcement.Status?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
                {announcement.recipients_count > 0 && (
                  <View style={styles.notifRow}>
                    <MaterialIcons name="email" size={14} color="#5CB85C" />
                    <Text style={styles.notifText}>
                      Sent {announcement.emails_sent || 0}/{announcement.recipients_count}
                    </Text>
                    {parseInt(announcement.email_failed) > 0 && (
                      <Text style={styles.notifFailed}>
                        ({announcement.email_failed} failed)
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(announcement)}>
                    <MaterialIcons name="edit" size={18} color="#F39C12" />
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                  
                  {announcement.Status === 'Draft' && (
                    <TouchableOpacity style={styles.publishButton} onPress={() => handleStatusChange(announcement.AnnouncementID, 'Published')}>
                      <MaterialIcons name="publish" size={18} color="#5CB85C" />
                      <Text style={styles.publishText}>Publish</Text>
                    </TouchableOpacity>
                  )}
                  {announcement.Status === 'Published' && (
                    <TouchableOpacity style={styles.archiveButton} onPress={() => handleStatusChange(announcement.AnnouncementID, 'Archived')}>
                      <MaterialIcons name="archive" size={18} color="#3498DB" />
                      <Text style={styles.archiveText}>Archive</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(announcement.AnnouncementID, announcement.Title)}>
                    <MaterialIcons name="delete" size={18} color="#E74C3C" />
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                  {announcement.recipients_count > 0 && (
                    <TouchableOpacity style={styles.logsButton} onPress={() => {
                      Alert.alert(
                        'Notification Logs',
                        `Recipients: ${announcement.recipients_count}\nSent: ${announcement.emails_sent || 0}\nFailed: ${announcement.email_failed || 0}${announcement.email_failed_list ? '\n\nFailed emails:\n' + announcement.email_failed_list : ''}`,
                        [{ text: 'OK' }]
                      );
                    }}>
                      <MaterialIcons name="assessment" size={18} color="#3498DB" />
                      <Text style={styles.logsText}>Logs</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add Announcement Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Announcement</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Title *"
                value={newAnnouncement.Title}
                onChangeText={(text) => setNewAnnouncement({ ...newAnnouncement, Title: text.replace(/[0-9]/g, '') })}
              />
              
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Content *"
                value={newAnnouncement.Content}
                onChangeText={(text) => setNewAnnouncement({ ...newAnnouncement, Content: text })}
                multiline
                numberOfLines={5}
              />

              <Text style={styles.inputLabel}>Target Audience</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {targetAudiences.map(audience => (
                  <TouchableOpacity
                    key={audience}
                    style={[styles.optionChip, newAnnouncement.TargetAudience === audience && styles.optionChipSelected]}
                    onPress={() => setNewAnnouncement({ ...newAnnouncement, TargetAudience: audience })}
                  >
                    <Text style={[styles.optionChipText, newAnnouncement.TargetAudience === audience && styles.optionChipTextSelected]}>
                      {audience}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Priority</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {priorities.map(priority => (
                  <TouchableOpacity
                    key={priority.value}
                    style={[styles.priorityChip, newAnnouncement.Priority === priority.value && { backgroundColor: priority.color }]}
                    onPress={() => setNewAnnouncement({ ...newAnnouncement, Priority: priority.value })}
                  >
                    <MaterialIcons name={priority.icon} size={16} color={newAnnouncement.Priority === priority.value ? COLORS.white : priority.color} />
                    <Text style={[styles.priorityChipText, newAnnouncement.Priority === priority.value && styles.priorityChipTextSelected]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.dateInput} onPress={() => { setPublishTempDate(new Date()); setShowPublishDatePicker(true); }}>
                <MaterialIcons name="event" size={20} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>
                  {newAnnouncement.PublishDate ? formatDateTime(newAnnouncement.PublishDate) : 'Select Publish Date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateInput} onPress={() => { setExpiryTempDate(new Date()); setShowExpiryDatePicker(true); }}>
                <MaterialIcons name="event-busy" size={20} color={COLORS.textSecondary} />
                <Text style={newAnnouncement.ExpiryDate ? styles.dateText : styles.datePlaceholder}>
                  {newAnnouncement.ExpiryDate ? formatDateTime(newAnnouncement.ExpiryDate) : 'Set Expiry Date (Optional)'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {statuses.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.optionChip, newAnnouncement.Status === status && styles.optionChipSelected]}
                    onPress={() => setNewAnnouncement({ ...newAnnouncement, Status: status })}
                  >
                    <Text style={[styles.optionChipText, newAnnouncement.Status === status && styles.optionChipTextSelected]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <MaterialIcons name="email" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.toggleLabel}>Send Email Notification</Text>
                </View>
                <Switch
                  value={newAnnouncement.SendEmailNotification}
                  onValueChange={(val) => setNewAnnouncement({ ...newAnnouncement, SendEmailNotification: val })}
                  trackColor={{ false: COLORS.grey, true: COLORS.primary + '60' }}
                  thumbColor={newAnnouncement.SendEmailNotification ? COLORS.primary : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
                <Text style={styles.submitButtonText}>Create Announcement</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Announcement</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { backgroundColor: COLORS.lightGrey }]}
                placeholder="Announcement ID"
                value={editedAnnouncement.AnnouncementID?.toString()}
                editable={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Title *"
                value={editedAnnouncement.Title}
                onChangeText={(text) => setEditedAnnouncement({ ...editedAnnouncement, Title: text.replace(/[0-9]/g, '') })}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Content *"
                value={editedAnnouncement.Content}
                onChangeText={(text) => setEditedAnnouncement({ ...editedAnnouncement, Content: text })}
                multiline
                numberOfLines={5}
              />

              <Text style={styles.inputLabel}>Target Audience</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {targetAudiences.map(audience => (
                  <TouchableOpacity
                    key={audience}
                    style={[styles.optionChip, editedAnnouncement.TargetAudience === audience && styles.optionChipSelected]}
                    onPress={() => setEditedAnnouncement({ ...editedAnnouncement, TargetAudience: audience })}
                  >
                    <Text style={[styles.optionChipText, editedAnnouncement.TargetAudience === audience && styles.optionChipTextSelected]}>
                      {audience}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Priority</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {priorities.map(priority => (
                  <TouchableOpacity
                    key={priority.value}
                    style={[styles.priorityChip, editedAnnouncement.Priority === priority.value && { backgroundColor: priority.color }]}
                    onPress={() => setEditedAnnouncement({ ...editedAnnouncement, Priority: priority.value })}
                  >
                    <MaterialIcons name={priority.icon} size={16} color={editedAnnouncement.Priority === priority.value ? COLORS.white : priority.color} />
                    <Text style={[styles.priorityChipText, editedAnnouncement.Priority === priority.value && styles.priorityChipTextSelected]}>
                      {priority.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.dateInput} onPress={() => { setPublishTempDate(new Date()); setShowPublishDatePicker(true); }}>
                <MaterialIcons name="event" size={20} color={COLORS.textSecondary} />
                <Text style={styles.dateText}>
                  {editedAnnouncement.PublishDate ? formatDateTime(editedAnnouncement.PublishDate) : 'Select Publish Date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dateInput} onPress={() => { setExpiryTempDate(new Date()); setShowExpiryDatePicker(true); }}>
                <MaterialIcons name="event-busy" size={20} color={COLORS.textSecondary} />
                <Text style={editedAnnouncement.ExpiryDate ? styles.dateText : styles.datePlaceholder}>
                  {editedAnnouncement.ExpiryDate ? formatDateTime(editedAnnouncement.ExpiryDate) : 'Set Expiry Date (Optional)'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
                {statuses.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.optionChip, editedAnnouncement.Status === status && styles.optionChipSelected]}
                    onPress={() => setEditedAnnouncement({ ...editedAnnouncement, Status: status })}
                  >
                    <Text style={[styles.optionChipText, editedAnnouncement.Status === status && styles.optionChipTextSelected]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.toggleRow}>
                <View style={styles.toggleTextContainer}>
                  <MaterialIcons name="email" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.toggleLabel}>Send Email Notification</Text>
                </View>
                <Switch
                  value={editedAnnouncement.SendEmailNotification}
                  onValueChange={(val) => setEditedAnnouncement({ ...editedAnnouncement, SendEmailNotification: val })}
                  trackColor={{ false: COLORS.grey, true: COLORS.primary + '60' }}
                  thumbColor={editedAnnouncement.SendEmailNotification ? COLORS.primary : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleUpdate}>
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showPublishDatePicker && (
        <DateTimePicker
          value={publishTempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePublishDateChange}
        />
      )}
      {showPublishTimePicker && (
        <DateTimePicker
          value={publishTempDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePublishTimeChange}
        />
      )}
      {showExpiryDatePicker && (
        <DateTimePicker
          value={expiryTempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleExpiryDateChange}
        />
      )}
      {showExpiryTimePicker && (
        <DateTimePicker
          value={expiryTempDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleExpiryTimeChange}
        />
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
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white, fontFamily: FONTS.bold },
  headerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  headerBadgeText: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.white },
  addButton: { padding: 8 },
  filterSection: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
  },
  filterScroll: { flexDirection: 'row', marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.lightGrey,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 13, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  filterChipTextActive: { color: COLORS.white },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    ...SHADOWS.small,
  },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary, fontFamily: FONTS.bold },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontFamily: FONTS.regular },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
  },
  refreshText: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginLeft: 8, fontFamily: FONTS.medium },
  list: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  announcementInfo: { flex: 1, marginRight: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, flex: 1, marginRight: 8, fontFamily: FONTS.bold },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  priorityText: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.medium },
  content: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 20, fontFamily: FONTS.regular },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  statusContainer: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.medium },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, gap: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center' },
  publishButton: { flexDirection: 'row', alignItems: 'center' },
  archiveButton: { flexDirection: 'row', alignItems: 'center' },
  deleteButton: { flexDirection: 'row', alignItems: 'center' },
  editText: { color: '#F39C12', marginLeft: 6 },
  publishText: { color: '#5CB85C', marginLeft: 6 },
  archiveText: { color: '#3498DB', marginLeft: 6 },
  deleteText: { color: '#E74C3C', marginLeft: 6 },
  notifRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 },
  notifText: { fontSize: 12, color: '#5CB85C', fontFamily: FONTS.regular },
  notifFailed: { fontSize: 12, color: '#E74C3C', fontFamily: FONTS.regular },
  logsButton: { flexDirection: 'row', alignItems: 'center' },
  logsText: { color: '#3498DB', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.white, borderRadius: 16, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, fontFamily: FONTS.bold },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 12, fontFamily: FONTS.medium },
  input: { backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16, fontFamily: FONTS.regular },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.lightGrey, borderRadius: 8, padding: 12, marginBottom: 16, gap: 10 },
  dateText: { fontSize: 14, color: COLORS.text, fontFamily: FONTS.regular },
  datePlaceholder: { fontSize: 14, color: COLORS.grey, fontFamily: FONTS.regular },
  optionScroll: { flexDirection: 'row', marginBottom: 16 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8 },
  optionChipSelected: { backgroundColor: COLORS.primary },
  optionChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  optionChipTextSelected: { color: COLORS.white },
  priorityChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, marginRight: 8, gap: 6 },
  priorityChipText: { fontSize: 14, color: COLORS.textSecondary, fontFamily: FONTS.regular },
  priorityChipTextSelected: { color: COLORS.white },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.lightGrey,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  toggleTextContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontSize: 14, color: COLORS.text, fontFamily: FONTS.regular },
  submitButton: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold', fontFamily: FONTS.bold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontFamily: FONTS.regular },
  addFirstButton: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  addFirstButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '600', fontFamily: FONTS.medium },
});

export default ManageAnnouncements;
