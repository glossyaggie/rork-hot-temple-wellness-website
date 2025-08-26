import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Calendar, 
  Clock,
  X,
  Save,
  Settings,
  Mail,
  MessageSquare,
  Bell,
  Upload,
  BarChart3,
  TrendingUp
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { ClassSlot, Instructor, Notification } from '@/types';
import NotificationBanner from '@/components/NotificationBanner';
import { useBookings } from '@/hooks/useBookings';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { requireStaff, requireAdmin } from '@/utils/api';

const MOCK_INSTRUCTORS: Instructor[] = [
  {
    id: '1',
    name: 'Sarah',
    email: 'sarah@hottemple.com',
    phone: '+61 400 123 456',
    specialties: ['Hot Yoga', 'Vinyasa'],
    bio: 'Certified yoga instructor with 8+ years experience',
    isActive: true,
  },
  {
    id: '2',
    name: 'Mike',
    email: 'mike@hottemple.com',
    phone: '+61 400 123 457',
    specialties: ['Hot Pilates', 'HIIT'],
    bio: 'Former athlete turned wellness coach',
    isActive: true,
  },
  {
    id: '3',
    name: 'Emma',
    email: 'emma@hottemple.com',
    phone: '+61 400 123 458',
    specialties: ['Hot Yoga', 'Meditation'],
    bio: 'Mindfulness and movement specialist',
    isActive: true,
  },
  {
    id: '4',
    name: 'Lisa',
    email: 'lisa@hottemple.com',
    phone: '+61 400 123 459',
    specialties: ['Hot Pilates', 'Barre'],
    bio: 'Dance and fitness fusion expert',
    isActive: true,
  },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['5:30 AM', '6:00 AM', '8:00 AM', '9:30 AM', '11:00 AM', '12:30 PM', '4:00 PM', '4:30 PM', '6:00 PM', '6:30 PM'];

export default function AdminScreen() {
  const { user, isStaff, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'classes' | 'instructors' | 'notifications' | 'contacts'>('classes');
  
  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.tabTitle}>Loading...</Text>
      </View>
    );
  }
  
  // Block access for non-staff users
  if (!isStaff) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={[styles.tabTitle, { textAlign: 'center', marginBottom: 16 }]}>Access Denied</Text>
        <Text style={[styles.comingSoonText, { textAlign: 'center' }]}>
          You need admin or instructor privileges to access this section.
        </Text>
      </View>
    );
  }
  const [showClassModal, setShowClassModal] = useState(false);
  const [showInstructorModal, setShowInstructorModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [editingClass, setEditingClass] = useState<ClassSlot | null>(null);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [instructors, setInstructors] = useState<Instructor[]>(MOCK_INSTRUCTORS);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });

  const { classes } = useBookings();
  const { 
    notifications, 
    campaigns, 
    contacts,
    sendNotification: sendNotificationHook, 
    getNotificationAnalytics,
    getSmsStats,
    getRecentNotifications,
    importContacts
  } = useNotifications();
  const analytics = getNotificationAnalytics();
  const smsStats = getSmsStats();
  const recentNotifications = getRecentNotifications();

  const [newClass, setNewClass] = useState<{
    day: string;
    time: string;
    type: 'Hot Yoga' | 'Hot Pilates';
    instructor: string;
    maxCapacity: string;
    isRecurring: boolean;
    description: string;
  }>({
    day: 'Monday',
    time: '5:30 AM',
    type: 'Hot Yoga',
    instructor: 'Sarah',
    maxCapacity: '20',
    isRecurring: true,
    description: '',
  });

  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'general' as 'class_reminder' | 'class_cancelled' | 'promotion' | 'general',
    channels: ['push'] as ('push' | 'email' | 'sms')[],
    scheduledFor: new Date().toISOString().split('T')[0],
  });

  const handleImportContacts = async () => {
    if (!csvData.trim()) {
      showNotificationBanner('Please enter CSV data', 'error');
      return;
    }

    try {
      const result = await importContacts(csvData);
      if (result.success) {
        showNotificationBanner(`Successfully imported ${result.imported} contacts!`, 'success');
        setShowImportModal(false);
        setCsvData('');
      } else {
        showNotificationBanner(result.message, 'error');
      }
    } catch (error) {
      console.error('Import error:', error);
      showNotificationBanner('Failed to import contacts', 'error');
    }
  };

  const [newInstructor, setNewInstructor] = useState({
    name: '',
    email: '',
    phone: '',
    specialties: [] as string[],
    bio: '',
    isActive: true,
  });

  const showNotificationBanner = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type, visible: true });
  };

  const hideNotificationBanner = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const handleSaveClass = () => {
    // Note: In a real app, this would update the backend and refresh the data
    // For now, we'll just show a success message since we're using mock data
    showNotificationBanner(
      editingClass ? 'Class updated successfully!' : 'Class created successfully!', 
      'success'
    );
    
    setShowClassModal(false);
    setEditingClass(null);
    resetNewClass();
  };

  const handleDeleteClass = (classId: string) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Note: In a real app, this would delete from backend and refresh the data
            showNotificationBanner('Class deleted successfully!', 'success');
          },
        },
      ]
    );
  };

  const handleEditClass = (classData: ClassSlot) => {
    setEditingClass(classData);
    setNewClass({
      day: classData.day,
      time: classData.time,
      type: classData.type,
      instructor: classData.instructor,
      maxCapacity: classData.maxCapacity.toString(),
      isRecurring: classData.isRecurring ?? true,
      description: classData.description || '',
    });
    setShowClassModal(true);
  };

  const resetNewClass = () => {
    setNewClass({
      day: 'Monday',
      time: '5:30 AM',
      type: 'Hot Yoga',
      instructor: 'Sarah',
      maxCapacity: '20',
      isRecurring: true,
      description: '',
    });
  };

  const handleSendNotification = async () => {
    try {
      const result = await sendNotificationHook({
        title: newNotification.title,
        message: newNotification.message,
        type: newNotification.type,
        channels: newNotification.channels,
        scheduledFor: newNotification.scheduledFor,
      });
      
      if (result.success) {
        showNotificationBanner('Notification sent successfully!', 'success');
        setShowNotificationModal(false);
        setNewNotification({
          title: '',
          message: '',
          type: 'general',
          channels: ['push'],
          scheduledFor: new Date().toISOString().split('T')[0],
        });
      } else {
        showNotificationBanner(result.message || 'Failed to send notification', 'error');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showNotificationBanner('Failed to send notification', 'error');
    }
  };

  const handleSaveInstructor = () => {
    if (!newInstructor.name || !newInstructor.email || !newInstructor.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const instructorData: Instructor = {
      id: editingInstructor?.id || Date.now().toString(),
      name: newInstructor.name,
      email: newInstructor.email,
      phone: newInstructor.phone,
      specialties: newInstructor.specialties,
      bio: newInstructor.bio,
      isActive: newInstructor.isActive,
    };

    if (editingInstructor) {
      setInstructors(prev => prev.map(inst => 
        inst.id === editingInstructor.id ? instructorData : inst
      ));
      showNotificationBanner('Instructor updated successfully!', 'success');
    } else {
      setInstructors(prev => [...prev, instructorData]);
      showNotificationBanner('Instructor added successfully!', 'success');
    }

    setShowInstructorModal(false);
    setEditingInstructor(null);
    resetNewInstructor();
  };

  const handleEditInstructor = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setNewInstructor({
      name: instructor.name,
      email: instructor.email,
      phone: instructor.phone,
      specialties: instructor.specialties,
      bio: instructor.bio || '',
      isActive: instructor.isActive,
    });
    setShowInstructorModal(true);
  };

  const resetNewInstructor = () => {
    setNewInstructor({
      name: '',
      email: '',
      phone: '',
      specialties: [],
      bio: '',
      isActive: true,
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setNewInstructor(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const renderClassesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Class Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetNewClass();
            setEditingClass(null);
            setShowClassModal(true);
          }}
        >
          <Plus size={20} color="white" />
          <Text style={styles.addButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
        {DAYS.map(day => {
          const dayClasses = classes.filter(c => c.day === day);
          
          return (
            <View key={day} style={styles.daySection}>
              <Text style={styles.dayTitle}>{day}</Text>
              {dayClasses.length > 0 ? (
                dayClasses.map(classItem => (
                  <View key={classItem.id} style={styles.classCard}>
                    <View style={styles.classInfo}>
                      <View style={styles.classHeader}>
                        <Text style={styles.classTime}>{classItem.time}</Text>
                        <View style={styles.classType}>
                          <Text style={styles.classTypeText}>{classItem.type}</Text>
                        </View>
                      </View>
                      <Text style={styles.classInstructor}>with {classItem.instructor}</Text>
                      <View style={styles.classStats}>
                        <View style={styles.statItem}>
                          <Users size={14} color={theme.colors.textSecondary} />
                          <Text style={styles.statText}>{classItem.bookings}/{classItem.maxCapacity}</Text>
                        </View>
                        {classItem.isRecurring && (
                          <View style={styles.recurringBadge}>
                            <Text style={styles.recurringText}>Weekly</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.classActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditClass(classItem)}
                      >
                        <Edit3 size={16} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteClass(classItem.id)}
                      >
                        <Trash2 size={16} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noClassesText}>No classes scheduled</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderInstructorsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Instructors</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => {
            resetNewInstructor();
            setEditingInstructor(null);
            setShowInstructorModal(true);
          }}
        >
          <Plus size={20} color="white" />
          <Text style={styles.addButtonText}>Add Instructor</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.instructorList} showsVerticalScrollIndicator={false}>
        {instructors.map(instructor => (
          <View key={instructor.id} style={styles.instructorCard}>
            <View style={styles.instructorInfo}>
              <Text style={styles.instructorName}>{instructor.name}</Text>
              <Text style={styles.instructorEmail}>{instructor.email}</Text>
              <Text style={styles.instructorPhone}>{instructor.phone}</Text>
              <View style={styles.specialties}>
                {instructor.specialties.map(specialty => (
                  <View key={specialty} style={styles.specialtyTag}>
                    <Text style={styles.specialtyText}>{specialty}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.instructorActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleEditInstructor(instructor)}
              >
                <Edit3 size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Notifications & Marketing</Text>
      </View>

      <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.sendNotificationButton, { flex: 1 }]}
            onPress={() => setShowNotificationModal(true)}
          >
            <Bell size={20} color="white" />
            <Text style={styles.sendNotificationButtonText}>Send Notification</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.notificationSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <Mail size={24} color={theme.colors.primary} />
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>Email Campaign</Text>
              <Text style={styles.quickActionDesc}>Send promotional emails to members</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <MessageSquare size={24} color={theme.colors.success} />
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>SMS Blast</Text>
              <Text style={styles.quickActionDesc}>Send SMS to all active members</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionCard}>
            <Bell size={24} color={theme.colors.warning} />
            <View style={styles.quickActionInfo}>
              <Text style={styles.quickActionTitle}>Class Reminder</Text>
              <Text style={styles.quickActionDesc}>Remind members about upcoming classes</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.notificationSection}>
          <Text style={styles.sectionTitle}>Analytics Overview</Text>
          <View style={styles.analyticsContainer}>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.totalSent}</Text>
                <Text style={styles.analyticsLabel}>Total Sent</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{analytics.thisWeek}</Text>
                <Text style={styles.analyticsLabel}>This Week</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{contacts.length}</Text>
                <Text style={styles.analyticsLabel}>Contacts</Text>
              </View>
            </View>
            
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{smsStats.total}</Text>
                <Text style={styles.analyticsLabel}>SMS Sent</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>{smsStats.deliveryRate}%</Text>
                <Text style={styles.analyticsLabel}>Delivery Rate</Text>
              </View>
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsNumber}>${smsStats.totalCost}</Text>
                <Text style={styles.analyticsLabel}>SMS Cost</Text>
              </View>
            </View>
            
            <View style={styles.channelBreakdown}>
              <Text style={styles.breakdownTitle}>Channel Performance</Text>
              <View style={styles.channelStats}>
                <View style={styles.channelStat}>
                  <Text style={styles.channelLabel}>Push:</Text>
                  <Text style={styles.channelValue}>{analytics.byChannel.push}</Text>
                </View>
                <View style={styles.channelStat}>
                  <Text style={styles.channelLabel}>Email:</Text>
                  <Text style={styles.channelValue}>{analytics.byChannel.email}</Text>
                </View>
                <View style={styles.channelStat}>
                  <Text style={styles.channelLabel}>SMS:</Text>
                  <Text style={styles.channelValue}>{analytics.byChannel.sms}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.notificationSection}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          {recentNotifications.length > 0 ? (
            <View style={styles.notificationHistory}>
              {recentNotifications.map(notification => (
                  <View key={notification.id} style={styles.notificationHistoryCard}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <View style={[
                        styles.notificationStatus,
                        { backgroundColor: notification.sent ? theme.colors.success : theme.colors.warning }
                      ]}>
                        <Text style={styles.notificationStatusText}>
                          {notification.sent ? 'Sent' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <View style={styles.notificationMeta}>
                      <Text style={styles.notificationDate}>
                        {new Date(notification.sentAt || notification.createdAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      <View style={styles.notificationChannels}>
                        {notification.channels.map(channel => (
                          <View key={channel} style={styles.channelBadge}>
                            <Text style={styles.channelBadgeText}>{channel.toUpperCase()}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {notification.recipientCount && (
                      <View style={styles.notificationStats}>
                        <Text style={styles.notificationStatsText}>
                          Sent to {notification.recipientCount} recipients
                        </Text>
                        {notification.deliveredCount !== undefined && (
                          <Text style={styles.notificationStatsText}>
                            • {notification.deliveredCount} delivered
                          </Text>
                        )}
                      </View>
                    )}
                    <View style={styles.notificationTypeContainer}>
                      <Text style={styles.notificationType}>
                        {notification.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      <Text style={styles.notificationTarget}>
                        {notification.targetAudience || (notification.userId ? 'Individual' : 'Broadcast')}
                      </Text>
                    </View>
                  </View>
                ))
              }
            </View>
          ) : (
            <Text style={styles.comingSoonText}>
              No notifications sent yet. Send your first notification above!
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderContactsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.tabHeader}>
        <Text style={styles.tabTitle}>Contact Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowImportModal(true)}
        >
          <Upload size={20} color="white" />
          <Text style={styles.addButtonText}>Import CSV</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contactList} showsVerticalScrollIndicator={false}>
        <View style={styles.contactStats}>
          <View style={styles.contactStatsRow}>
            <View style={styles.contactStatCard}>
              <Text style={styles.contactStatNumber}>{contacts.length}</Text>
              <Text style={styles.contactStatLabel}>Total Contacts</Text>
            </View>
            <View style={styles.contactStatCard}>
              <Text style={styles.contactStatNumber}>
                {contacts.filter(c => c.smsOptIn && !c.unsubscribed).length}
              </Text>
              <Text style={styles.contactStatLabel}>SMS Enabled</Text>
            </View>
            <View style={styles.contactStatCard}>
              <Text style={styles.contactStatNumber}>
                {contacts.filter(c => c.emailOptIn && !c.unsubscribed).length}
              </Text>
              <Text style={styles.contactStatLabel}>Email Enabled</Text>
            </View>
          </View>
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>All Contacts</Text>
          {contacts.length > 0 ? (
            <View style={styles.contactHistory}>
              {contacts.slice(0, 20).map(contact => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    {contact.email && (
                      <Text style={styles.contactDetail}>{contact.email}</Text>
                    )}
                    {contact.phone && (
                      <Text style={styles.contactDetail}>{contact.phone}</Text>
                    )}
                    <View style={styles.contactTags}>
                      {contact.tags.map(tag => (
                        <View key={tag} style={styles.contactTag}>
                          <Text style={styles.contactTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.contactStatus}>
                    {contact.smsOptIn && !contact.unsubscribed && (
                      <View style={[styles.statusBadge, { backgroundColor: theme.colors.success }]}>
                        <Text style={styles.statusBadgeText}>SMS</Text>
                      </View>
                    )}
                    {contact.emailOptIn && !contact.unsubscribed && (
                      <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary }]}>
                        <Text style={styles.statusBadgeText}>EMAIL</Text>
                      </View>
                    )}
                    {contact.unsubscribed && (
                      <View style={[styles.statusBadge, { backgroundColor: theme.colors.error }]}>
                        <Text style={styles.statusBadgeText}>UNSUB</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              {contacts.length > 20 && (
                <Text style={styles.moreContactsText}>
                  ... and {contacts.length - 20} more contacts
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.comingSoonText}>
              No contacts yet. Import your first batch of contacts above!
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'classes' && styles.activeTab]}
          onPress={() => setActiveTab('classes')}
        >
          <Calendar size={20} color={activeTab === 'classes' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'classes' && styles.activeTabText]}>Classes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'instructors' && styles.activeTab]}
          onPress={() => setActiveTab('instructors')}
        >
          <Users size={20} color={activeTab === 'instructors' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'instructors' && styles.activeTabText]}>Instructors</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Bell size={20} color={activeTab === 'notifications' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>Marketing</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
          onPress={() => setActiveTab('contacts')}
        >
          <Users size={20} color={activeTab === 'contacts' ? theme.colors.primary : theme.colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>Contacts</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'classes' && renderClassesTab()}
      {activeTab === 'instructors' && renderInstructorsTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
      {activeTab === 'contacts' && renderContactsTab()}

      {/* Class Modal */}
      <Modal
        visible={showClassModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClassModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingClass ? 'Edit Class' : 'Add New Class'}
            </Text>
            <TouchableOpacity onPress={() => setShowClassModal(false)}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Day</Text>
              <View style={styles.pickerContainer}>
                {DAYS.map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.pickerOption, newClass.day === day && styles.selectedOption]}
                    onPress={() => setNewClass(prev => ({ ...prev, day }))}
                  >
                    <Text style={[styles.pickerText, newClass.day === day && styles.selectedText]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Time</Text>
              <View style={styles.pickerContainer}>
                {TIMES.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.pickerOption, newClass.time === time && styles.selectedOption]}
                    onPress={() => setNewClass(prev => ({ ...prev, time }))}
                  >
                    <Text style={[styles.pickerText, newClass.time === time && styles.selectedText]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Class Type</Text>
              <View style={styles.typeContainer}>
                <TouchableOpacity
                  style={[styles.typeOption, newClass.type === 'Hot Yoga' && styles.selectedOption]}
                  onPress={() => setNewClass(prev => ({ ...prev, type: 'Hot Yoga' }))}
                >
                  <Text style={[styles.typeText, newClass.type === 'Hot Yoga' && styles.selectedText]}>
                    Hot Yoga
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeOption, newClass.type === 'Hot Pilates' && styles.selectedOption]}
                  onPress={() => setNewClass(prev => ({ ...prev, type: 'Hot Pilates' }))}
                >
                  <Text style={[styles.typeText, newClass.type === 'Hot Pilates' && styles.selectedText]}>
                    Hot Pilates
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Instructor</Text>
              <View style={styles.pickerContainer}>
                {instructors.map(instructor => (
                  <TouchableOpacity
                    key={instructor.id}
                    style={[styles.instructorOption, newClass.instructor === instructor.name && styles.selectedOption]}
                    onPress={() => setNewClass(prev => ({ ...prev, instructor: instructor.name }))}
                  >
                    <Text style={[styles.pickerText, newClass.instructor === instructor.name && styles.selectedText]}>
                      {instructor.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Max Capacity</Text>
              <TextInput
                style={styles.textInput}
                value={newClass.maxCapacity}
                onChangeText={(text) => setNewClass(prev => ({ ...prev, maxCapacity: text }))}
                keyboardType="numeric"
                placeholder="20"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newClass.description}
                onChangeText={(text) => setNewClass(prev => ({ ...prev, description: text }))}
                placeholder="Class description..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveClass}
            >
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {editingClass ? 'Update Class' : 'Create Class'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send Notification</Text>
            <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={newNotification.title}
                onChangeText={(text) => setNewNotification(prev => ({ ...prev, title: text }))}
                placeholder="Notification title..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newNotification.message}
                onChangeText={(text) => setNewNotification(prev => ({ ...prev, message: text }))}
                placeholder="Your message here..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeContainer}>
                {['general', 'promotion', 'class_reminder', 'class_cancelled'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeOption, newNotification.type === type && styles.selectedOption]}
                    onPress={() => setNewNotification(prev => ({ ...prev, type: type as any }))}
                  >
                    <Text style={[styles.typeText, newNotification.type === type && styles.selectedText]}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Send Via</Text>
              <View style={styles.channelContainer}>
                {['push', 'email', 'sms'].map(channel => (
                  <TouchableOpacity
                    key={channel}
                    style={[
                      styles.channelOption,
                      newNotification.channels.includes(channel as any) && styles.selectedOption
                    ]}
                    onPress={() => {
                      setNewNotification(prev => ({
                        ...prev,
                        channels: prev.channels.includes(channel as any)
                          ? prev.channels.filter(c => c !== channel)
                          : [...prev.channels, channel as any]
                      }));
                    }}
                  >
                    <Text style={[
                      styles.channelText,
                      newNotification.channels.includes(channel as any) && styles.selectedText
                    ]}>
                      {channel.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSendNotification}
            >
              <Bell size={20} color="white" />
              <Text style={styles.saveButtonText}>Send Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Instructor Modal */}
      <Modal
        visible={showInstructorModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInstructorModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}
            </Text>
            <TouchableOpacity onPress={() => setShowInstructorModal(false)}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                value={newInstructor.name}
                onChangeText={(text) => setNewInstructor(prev => ({ ...prev, name: text }))}
                placeholder="Enter instructor's full name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.textInput}
                value={newInstructor.email}
                onChangeText={(text) => setNewInstructor(prev => ({ ...prev, email: text }))}
                placeholder="instructor@hottemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.textInput}
                value={newInstructor.phone}
                onChangeText={(text) => setNewInstructor(prev => ({ ...prev, phone: text }))}
                placeholder="+61 400 123 456"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Specialties</Text>
              <View style={styles.specialtyContainer}>
                {['Hot Yoga', 'Hot Pilates', 'Vinyasa', 'HIIT', 'Barre', 'Meditation'].map(specialty => (
                  <TouchableOpacity
                    key={specialty}
                    style={[
                      styles.specialtyOption,
                      newInstructor.specialties.includes(specialty) && styles.selectedOption
                    ]}
                    onPress={() => toggleSpecialty(specialty)}
                  >
                    <Text style={[
                      styles.specialtyOptionText,
                      newInstructor.specialties.includes(specialty) && styles.selectedText
                    ]}>
                      {specialty}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bio (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={newInstructor.bio}
                onChangeText={(text) => setNewInstructor(prev => ({ ...prev, bio: text }))}
                placeholder="Brief bio about the instructor..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusContainer}>
                <TouchableOpacity
                  style={[styles.statusOption, newInstructor.isActive && styles.selectedOption]}
                  onPress={() => setNewInstructor(prev => ({ ...prev, isActive: true }))}
                >
                  <Text style={[styles.statusText, newInstructor.isActive && styles.selectedText]}>
                    Active
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusOption, !newInstructor.isActive && styles.selectedOption]}
                  onPress={() => setNewInstructor(prev => ({ ...prev, isActive: false }))}
                >
                  <Text style={[styles.statusText, !newInstructor.isActive && styles.selectedText]}>
                    Inactive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveInstructor}
            >
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {editingInstructor ? 'Update Instructor' : 'Add Instructor'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import Contacts Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Contacts</Text>
            <TouchableOpacity onPress={() => setShowImportModal(false)}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>CSV Format Instructions</Text>
              <View style={styles.instructionsCard}>
                <Text style={styles.instructionsText}>
                  Expected columns: name, email, phone, marketing_opt_in, sms_opt_in, email_opt_in, tags
                </Text>
                <Text style={styles.instructionsExample}>
                  Example:
                  name,email,phone,marketing_opt_in,sms_opt_in,email_opt_in,tags
                  John Doe,john@example.com,+61400123456,true,true,true,vip;member
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Paste CSV Data</Text>
              <TextInput
                style={[styles.textInput, styles.csvTextArea]}
                value={csvData}
                onChangeText={setCsvData}
                placeholder="Paste your CSV data here..."
                multiline
                numberOfLines={10}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleImportContacts}
            >
              <Upload size={20} color="white" />
              <Text style={styles.saveButtonText}>Import Contacts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <NotificationBanner
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotificationBanner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  classList: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  daySection: {
    marginBottom: theme.spacing.xl,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  classInfo: {
    flex: 1,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  classTime: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  classType: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  classTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  classInstructor: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  classStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  recurringBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recurringText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  classActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.sm,
  },
  noClassesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  instructorList: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  instructorCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  instructorEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  instructorPhone: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  specialtyTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  specialtyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  instructorActions: {
    justifyContent: 'center',
  },
  notificationList: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  notificationSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  quickActionInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  quickActionDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  comingSoonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  pickerOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selectedOption: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pickerText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  selectedText: {
    color: 'white',
    fontWeight: '600',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  typeOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  typeText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  instructorOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  channelContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  channelOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  channelText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '600',
  },
  modalFooter: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  specialtyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  specialtyOption: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  specialtyOptionText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statusOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  sendNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  sendNotificationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsContainer: {
    marginBottom: theme.spacing.lg,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  analyticsLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  channelBreakdown: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  channelStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  channelStat: {
    alignItems: 'center',
  },
  channelLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  channelValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  notificationHistory: {
    gap: theme.spacing.md,
  },
  notificationHistoryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  notificationStatus: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  notificationStatusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  notificationMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  notificationDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  notificationChannels: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  channelBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  channelBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
  },
  notificationTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationType: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  notificationTarget: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  notificationStats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  notificationStatsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  contactList: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  contactStats: {
    marginBottom: theme.spacing.xl,
  },
  contactStatsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  contactStatCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  contactStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  contactStatLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  contactSection: {
    marginBottom: theme.spacing.xl,
  },
  contactHistory: {
    gap: theme.spacing.md,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  contactDetail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  contactTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  contactTag: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contactTagText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  contactStatus: {
    alignItems: 'flex-end',
    gap: theme.spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '600',
  },
  moreContactsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  instructionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  instructionsText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  instructionsExample: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  csvTextArea: {
    height: 200,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
});