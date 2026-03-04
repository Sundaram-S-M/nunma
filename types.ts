
import React from 'react';

export enum UserRole {
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR'
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export interface StudentProfileData {
  isComplete: boolean;
  phoneNumber?: string;
  educationLevel?: string;
  primaryInterests?: string[];
}

export interface TutorProfileData {
  isComplete: boolean;
  phoneNumber?: string;
  primarySubject?: string;
  academyName?: string;
  payoutInfo?: {
    accountHolderName: string;
    bankIdentifier: string;
  };
}

export interface StatCardData {
  label: string;
  value: string | number;
}

export type ZoneType = 'Class Management' | 'Course' | 'Workshop';

export interface Zone {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
  price: string;
  currency: 'USD' | 'INR' | 'EUR';
  type: 'live-course' | 'course'; // Legacy type field, keeping for compatibility
  zoneType: ZoneType;
  status: 'In Progress' | 'Completed' | 'Pending';
  createdAt: string;
  students: number;
  image: string;
  landingPageConfig?: LandingPageConfig;
  postSessionSurvey?: PostSessionSurveyConfig;
}

export interface LandingPageConfig {
  paid: boolean;
  paymentLink?: string;
  enableCalendar: boolean;
  emailSubject: string;
  emailBody: string;
  customFields: string[];
}

export interface PostSessionSurveyConfig {
  enabled: boolean;
  ratingSystem: boolean;
  npsTracking: boolean;
  feedbackText: boolean;
}

export interface Product {
  id: string;
  title: string;
  type: 'material' | 'service';
  price?: string; // Legacy
  currency?: 'USD' | 'INR' | 'EUR'; // Legacy
  priceUSD: string;
  priceINR: string;
  duration?: string;
  availability?: { day: string; time: string }[] | null;
  createdAt: string;
}

export interface LiveSession {
  id: string;
  zoneId: string;
  title: string;
  startTime: string; // ISO string
  duration: number; // minutes
  status: 'scheduled' | 'live' | 'ended';
  coHosts?: string[];
}


export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  avatar: string;
  durationInSession: number;
  engagementScore: number;
  status: 'Present' | 'Absent' | 'Logged Absent';
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}

export type ExamType = 'online-test' | 'online-mcq' | 'offline';

export interface Exam {
  id: string;
  zoneId: string;
  name: string;
  date: string; // ISO string
  time: string; // HH:mm
  type: ExamType;
  maxMark: number;
  minMark: number;
  questions?: Question[]; // Only for online-mcq
  pdfUrl?: string; // For online-test or offline downlaod
  excelTemplateUrl?: string; // For offline download
  status: 'scheduled' | 'active' | 'completed';
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  marks: number;
  status: 'passed' | 'failed' | 'ongoing' | 'reported';
  warnings: number;
  completedAt?: string;
  answerSheetUrl?: string; // URL to uploaded PDF (online-test) or Excel (offline)
}

export interface AttendanceHistory {
  sessionId: string;
  status: 'Present' | 'Absent' | 'Late' | 'Pending';
  date: string;
}

export interface Student {
  id: string;
  name: string;
  avatar: string;
  joinedAt: string;
  status: 'Present' | 'Absent' | 'Late' | 'Pending';
  joinTimestamp?: number;
  durationInSession?: number;
  engagementScore: number;
  email?: string;
  phone?: string;
  attendanceHistory?: AttendanceHistory[];
  current_tier?: 'STARTER' | 'STANDARD' | 'PREMIUM';
  subscription_entitlements?: {
    storageLimit: number;
    storageUsed: number;
    studentCapacity: number;
    studentsEnrolled: number;
  };
}

export interface Addon {
  id: string;
  name: string;
  monthlyPrice: number;
  startDate: string; // ISO string
  quantity: number;
}

export interface Subscription {
  id: string;
  userId: string;
  basePrice: number;
  billing_cycle_anchor: number; // 1-31
  active_addons: Addon[];
  next_billing_amount: number; // For the upcoming automated charge
  currency: string;
}
