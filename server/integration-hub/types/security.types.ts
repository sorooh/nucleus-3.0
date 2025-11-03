/**
 * ═══════════════════════════════════════════════════════════
 * Integration Hub - Security Types
 * ═══════════════════════════════════════════════════════════
 * أنواع الأمان والصلاحيات
 * Built from absolute zero - Abu Sham Vision
 */

/**
 * المستخدمون والصلاحيات - Users & Permissions
 */
export interface HubUser {
  id: string;
  email: string;
  name: string;
  arabicName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export type UserRole = 
  | 'EMPEROR'      // الإمبراطور - كل الصلاحيات
  | 'ADMIN'        // المسؤول - صلاحيات إدارية
  | 'MAINTAINER'   // صاحب صلاحية النشر
  | 'REVIEWER'     // المراجع - مراجعة فقط
  | 'READER';      // القارئ - قراءة فقط

export interface Permission {
  resource: string;
  actions: ('READ' | 'WRITE' | 'DELETE' | 'EXECUTE')[];
  conditions?: Record<string, any>;
}

/**
 * السجلات الأمنية - Audit Logs
 */
export interface AuditLog {
  id: string;
  timestamp: Date;
  action: string;
  userId: string;
  userRole: UserRole;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

/**
 * السياسات الأمنية - Security Policies
 */
export interface SecurityPolicy {
  id: string;
  name: string;
  arabicName: string;
  version: string;
  rules: PolicyRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  arabicDescription: string;
}

export interface RuleCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GT' | 'LT';
  value: any;
}
