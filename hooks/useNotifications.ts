import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Notification, MarketingCampaign, Contact, SMSMessage } from '@/types';
import { useAuth } from './useAuth';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [smsMessages, setSmsMessages] = useState<SMSMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const loadNotifications = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('notifications');
      if (data) {
        setNotifications(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('marketing_campaigns');
      if (data) {
        setCampaigns(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('contacts');
      if (data) {
        setContacts(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }, []);

  const loadSmsMessages = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem('smsMessages');
      if (data) {
        setSmsMessages(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading SMS messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupNotificationPermissions = useCallback(async () => {
    if (Platform.OS === 'web') return;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Get push token for remote notifications
      try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token:', token);
      } catch (tokenError) {
        console.warn('Could not get push token (projectId may be missing):', tokenError);
        // Continue without push token - local notifications will still work
      }
      
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadCampaigns();
    loadContacts();
    loadSmsMessages();
    setupNotificationPermissions();
  }, [loadNotifications, loadCampaigns, loadContacts, loadSmsMessages, setupNotificationPermissions]);

  const saveNotifications = useCallback(async (newNotifications: Notification[]) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
      setNotifications(newNotifications);
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }, []);

  const saveCampaigns = useCallback(async (newCampaigns: MarketingCampaign[]) => {
    try {
      await AsyncStorage.setItem('marketing_campaigns', JSON.stringify(newCampaigns));
      setCampaigns(newCampaigns);
    } catch (error) {
      console.error('Error saving campaigns:', error);
    }
  }, []);

  const saveContacts = useCallback(async (newContacts: Contact[]) => {
    try {
      await AsyncStorage.setItem('contacts', JSON.stringify(newContacts));
      setContacts(newContacts);
    } catch (error) {
      console.error('Error saving contacts:', error);
    }
  }, []);

  const saveSmsMessages = useCallback(async (newSmsMessages: SMSMessage[]) => {
    try {
      await AsyncStorage.setItem('smsMessages', JSON.stringify(newSmsMessages));
      setSmsMessages(newSmsMessages);
    } catch (error) {
      console.error('Error saving SMS messages:', error);
    }
  }, []);

  const sendNotification = useCallback(async ({
    title,
    message,
    type,
    channels,
    targetUsers,
    scheduledFor,
  }: {
    title: string;
    message: string;
    type: 'class_reminder' | 'class_cancelled' | 'promotion' | 'general';
    channels: ('push' | 'email' | 'sms')[];
    targetUsers?: string[]; // user IDs, if null = broadcast
    scheduledFor?: string; // ISO date string
  }): Promise<{ success: boolean; message: string }> => {
    try {
      if (!title || !message) {
        return { success: false, message: 'Title and message are required' };
      }

      const newNotification: Notification = {
        id: Date.now().toString(),
        userId: targetUsers ? targetUsers[0] : undefined,
        title,
        message,
        type,
        scheduledFor: scheduledFor || new Date().toISOString(),
        sent: true,
        sentAt: new Date().toISOString(),
        channels,
        targetAudience: targetUsers ? 'specific' : 'all',
        recipientCount: targetUsers ? targetUsers.length : contacts.length,
        deliveredCount: 0,
        openedCount: 0,
        clickedCount: 0,
        sentBy: user?.id || 'system',
        createdAt: new Date().toISOString(),
      };

      const updatedNotifications = [...notifications, newNotification];
      await saveNotifications(updatedNotifications);

      // Handle SMS sending
      if (channels.includes('sms')) {
        const eligibleContacts = contacts.filter(contact => 
          contact.smsOptIn && !contact.unsubscribed && contact.phone
        );

        const smsPromises = eligibleContacts.map(async (contact) => {
          const smsMessage: SMSMessage = {
            id: `${Date.now()}-${contact.id}`,
            to: contact.phone!,
            message: `${title}\n\n${message}\n\nReply STOP to opt out`,
            status: 'pending',
            provider: 'Twilio',
            campaignId: newNotification.id,
            createdAt: new Date().toISOString(),
          };

          // Simulate SMS sending
          setTimeout(() => {
            smsMessage.status = Math.random() > 0.1 ? 'delivered' : 'failed';
            smsMessage.sentAt = new Date().toISOString();
            smsMessage.deliveredAt = smsMessage.status === 'delivered' ? new Date().toISOString() : undefined;
            smsMessage.cost = 0.08;
          }, Math.random() * 2000);

          return smsMessage;
        });

        const newSmsMessages = await Promise.all(smsPromises);
        await saveSmsMessages([...smsMessages, ...newSmsMessages]);
      }

      // Handle push notifications
      if (Platform.OS !== 'web' && channels.includes('push')) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body: message,
              data: { type, notificationId: newNotification.id },
            },
            trigger: null,
          });
        } catch (notificationError) {
          console.warn('Failed to schedule notification:', notificationError);
        }
      }

      console.log('Notification sent:', newNotification);
      return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }, [notifications, contacts, smsMessages, saveNotifications, saveSmsMessages, user?.id]);

  const getNotificationAnalytics = useCallback(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalSent = notifications.filter(n => n.sent).length;
    const thisWeek = notifications.filter(n => 
      n.sent && new Date(n.createdAt) >= oneWeekAgo
    ).length;
    const pending = notifications.filter(n => !n.sent).length;

    // Count by channel
    const byChannel = notifications.reduce(
      (acc, notification) => {
        if (notification.sent) {
          notification.channels.forEach(channel => {
            acc[channel] = (acc[channel] || 0) + 1;
          });
        }
        return acc;
      },
      { push: 0, email: 0, sms: 0 } as Record<string, number>
    );

    return {
      totalSent,
      thisWeek,
      pending,
      byChannel,
    };
  }, [notifications]);

  const createCampaign = useCallback(async (campaignData: Omit<MarketingCampaign, 'id' | 'createdAt' | 'sent'>) => {
    try {
      const newCampaign: MarketingCampaign = {
        ...campaignData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        sent: false,
      };

      const updatedCampaigns = [...campaigns, newCampaign];
      await saveCampaigns(updatedCampaigns);

      return { success: true, campaign: newCampaign };
    } catch (error) {
      console.error('Error creating campaign:', error);
      return { success: false, message: 'Failed to create campaign' };
    }
  }, [campaigns, saveCampaigns]);

  const importContacts = useCallback(async (csvData: string): Promise<{ success: boolean; imported: number; message: string }> => {
    try {
      const lines = csvData.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return { success: false, imported: 0, message: 'CSV must have at least a header and one data row' };
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newContacts: Contact[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const contactData: any = {};
        
        headers.forEach((header, index) => {
          contactData[header] = values[index] || '';
        });

        const contact: Contact = {
          id: `import-${Date.now()}-${i}`,
          name: contactData.name || `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim() || 'Unknown',
          email: contactData.email || undefined,
          phone: contactData.phone || contactData.mobile || undefined,
          tags: contactData.tags ? contactData.tags.split(';').map((t: string) => t.trim()) : [],
          marketingOptIn: contactData.marketing_opt_in !== 'false' && contactData.marketing_opt_in !== '0',
          smsOptIn: contactData.sms_opt_in !== 'false' && contactData.sms_opt_in !== '0',
          emailOptIn: contactData.email_opt_in !== 'false' && contactData.email_opt_in !== '0',
          unsubscribed: false,
          source: 'import',
          createdAt: new Date().toISOString(),
        };

        if (contact.name !== 'Unknown' && (contact.email || contact.phone)) {
          newContacts.push(contact);
        }
      }

      const updatedContacts = [...contacts, ...newContacts];
      await saveContacts(updatedContacts);
      
      return { 
        success: true, 
        imported: newContacts.length, 
        message: `Successfully imported ${newContacts.length} contacts` 
      };
    } catch (error) {
      console.error('Error importing contacts:', error);
      return { success: false, imported: 0, message: 'Failed to import contacts' };
    }
  }, [contacts, saveContacts]);

  const getSmsStats = useCallback(() => {
    const total = smsMessages.length;
    const delivered = smsMessages.filter(sms => sms.status === 'delivered').length;
    const failed = smsMessages.filter(sms => sms.status === 'failed').length;
    const totalCost = smsMessages.reduce((sum, sms) => sum + (sms.cost || 0), 0);
    
    return {
      total,
      delivered,
      failed,
      totalCost: Math.round(totalCost * 100) / 100,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
    };
  }, [smsMessages]);

  const getRecentNotifications = useCallback(() => {
    return notifications
      .filter(n => n.sent)
      .sort((a, b) => new Date(b.sentAt || b.createdAt).getTime() - new Date(a.sentAt || a.createdAt).getTime())
      .slice(0, 10);
  }, [notifications]);

  return useMemo(() => ({
    notifications,
    campaigns,
    contacts,
    smsMessages,
    isLoading,
    sendNotification,
    createCampaign,
    importContacts,
    getNotificationAnalytics,
    getSmsStats,
    getRecentNotifications,
  }), [notifications, campaigns, contacts, smsMessages, isLoading, sendNotification, createCampaign, importContacts, getNotificationAnalytics, getSmsStats, getRecentNotifications]);
});