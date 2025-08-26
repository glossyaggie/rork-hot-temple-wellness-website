export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  emergencyContact?: string;
  waiverSigned?: boolean;
  passType: PassType;
  credits: number;
  unlimitedUntil?: string;
  membershipTier: MembershipTier;
  role: UserRole;
  qrCode?: string;
  createdAt: string;
  lastAttendance?: string;
  totalAttendance: number;
  marketingOptIn: boolean;
  smsOptIn?: boolean;
  emailOptIn?: boolean;
}

export interface ClassSlot {
  id: string;
  day: string;
  time: string;
  type: 'Hot Yoga' | 'Hot Pilates';
  instructor: string;
  bookings: number;
  maxCapacity: number;
  bookedBy?: string[];
  isRecurring?: boolean;
  recurringPattern?: 'weekly' | 'daily';
  startDate?: string;
  endDate?: string;
  cancelled?: boolean;
  description?: string;
}

export interface Booking {
  id: string;
  userId: string;
  classId: string;
  date: string;
  time: string;
  classType: string;
  instructor: string;
  status: 'booked' | 'attended' | 'cancelled' | 'checked-in';
  checkedInAt?: string;
  qrCodeUsed?: boolean;
}

export interface Pass {
  id: string;
  name: string;
  price: number;
  credits: number;
  description: string;
  isUnlimited: boolean;
  duration?: number; // days
}

export type PassType = 'none' | 'single' | '5-class' | '10-class' | '25-class' | 'monthly-unlimited' | 'weekly-unlimited' | 'vip-monthly' | 'vip-yearly';

export type MembershipTier = 'basic' | 'premium' | 'vip' | 'founder';

export type UserRole = 'member' | 'instructor' | 'admin';

export interface Instructor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  bio?: string;
  avatar?: string;
  isActive: boolean;
}

export interface ClassTemplate {
  id: string;
  name: string;
  type: 'Hot Yoga' | 'Hot Pilates';
  duration: number; // minutes
  maxCapacity: number;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  temperature: number; // celsius
}

export interface Notification {
  id: string;
  userId?: string; // if null, it's a broadcast
  title: string;
  message: string;
  type: 'class_reminder' | 'class_cancelled' | 'promotion' | 'general';
  scheduledFor: string;
  sent: boolean;
  sentAt?: string;
  channels: ('push' | 'email' | 'sms')[];
  targetAudience?: string;
  recipientCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  sentBy: string; // admin user id
  createdAt: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  subject: string;
  message: string;
  type: 'email' | 'sms' | 'push';
  targetAudience: 'all' | 'new_members' | 'inactive' | 'vip';
  scheduledFor: string;
  sent: boolean;
  createdAt: string;
}

export interface CheckInRecord {
  id: string;
  userId: string;
  classId: string;
  bookingId: string;
  checkedInAt: string;
  method: 'qr_code' | 'manual' | 'app';
  location?: string;
}

export interface AttendanceRecord {
  date: string;
  attended: boolean;
  classType?: string;
}

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  marketingOptIn: boolean;
  smsOptIn: boolean;
  emailOptIn: boolean;
  unsubscribed: boolean;
  source: 'import' | 'signup' | 'manual';
  createdAt: string;
  lastContactedAt?: string;
}

export interface SMSMessage {
  id: string;
  to: string;
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  cost?: number;
  provider: string;
  campaignId?: string;
  createdAt: string;
}