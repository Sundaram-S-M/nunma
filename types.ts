
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

export interface StatCardData {
  label: string;
  value: string | number;
}

export interface Zone {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Expert';
  price: string;
  currency: 'USD' | 'INR' | 'EUR';
  type: 'live-course' | 'course';
  status: 'In Progress' | 'Completed' | 'Pending';
  createdAt: string;
  students: number;
  image: string;
}

export interface Product {
  id: string;
  title: string;
  type: 'material' | 'service';
  price: string;
  currency: 'USD' | 'INR' | 'EUR';
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

export type ExamType = 'online' | 'offline';

export interface Exam {
  id: string;
  zoneId: string;
  name: string;
  date: string; // ISO string
  time: string; // HH:mm
  type: ExamType;
  maxMark: number;
  minMark: number;
  questions?: Question[]; // Only for online exams
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
}
