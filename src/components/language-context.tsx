'use client';

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from 'react';

type Locale = 'en' | 'ar';

interface LanguageContextType {
  locale: Locale;
  isRTL: boolean;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'viora-locale';

const translationsEn: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  roles: 'Roles & Permissions',
  ranks: 'System Ranks',
  rooms: 'Voice Rooms',
  store: 'Store',
  reports: 'Reports',
  support: 'Support Tickets',
  moderation: 'Moderation',
  settings: 'Settings',
  logout: 'Logout',
  profile: 'Profile',
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  loading: 'Loading...',
  error: 'An error occurred',
  retry: 'Retry',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  search: 'Search',
  filter: 'Filter',
  export: 'Export',
  back: 'Back',
  close: 'Close',
  confirm: 'Confirm',
  actions: 'Actions',
  status: 'Status',
  noData: 'No data available',
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  resolved: 'Resolved',
  username: 'Username',
  email: 'Email',
  password: 'Password',
  login: 'Login',
  welcome: 'Welcome back',
  totalUsers: 'Total Users',
  activeReports: 'Active Reports',
  openTickets: 'Open Tickets',
  activeSanctions: 'Active Sanctions',
  serverUptime: 'Server Uptime',
  memoryUsage: 'Memory Usage',
  connections: 'Active Connections',
  viewDetails: 'View Details',
  assignRole: 'Assign Role',
  adjustBalance: 'Adjust Balance',
  banUser: 'Ban User',
  searchUsers: 'Search users...',
  all: 'All',
  createRole: 'Create Role',
  permissions: 'Permissions',
  priority: 'Priority',
  description: 'Description',
  open: 'Open',
  inProgress: 'In Progress',
  closed: 'Closed',
  subject: 'Subject',
  message: 'Message',
  reply: 'Reply',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
  ban: 'Ban',
  mute: 'Mute',
  addStrike: 'Add Strike',
  reason: 'Reason',
  duration: 'Duration',
  hours: 'Hours',
  days: 'Days',
  view: 'View',
  details: 'Details',
  createdAt: 'Created',
  updatedAt: 'Updated',
  collapse: 'Collapse',
  name: 'Name',
  assigned: 'Assigned',
  available: 'Available',
  select: 'Select a role',
  activityOverview: 'Activity Overview',
  memoryHistory: 'Memory History',
  heap: 'Heap',
  permissionsDescription: 'Manage system permissions and access rights.',
  rolesDescription: 'Manage roles and permissions for your administrative network.',
  searchPermissions: 'Search permissions...',
  createPermission: 'Create Permission',
  deletePermission: 'Delete Permission',
  deletePermissionConfirm: 'Are you sure you want to delete this permission?',
  copied: 'Copied!',
  copyAll: 'Copy All',
  showing: 'Showing',
  of: 'of',
  noPermissionsFound: 'No permissions found.',
  creating: 'Creating...',
  permissionCode: 'Permission Code',
  permissionType: 'Permission Type',
  perms: 'Permissions',
  usersList: 'Users',
  assignPermissions: 'Assign Permissions',
  assignUsers: 'Assign Users',
  assignPermission: 'Assign',
  revokePermission: 'Revoke',
  assigning: 'Assigning...',
  revoking: 'Revoking...',
  managePermissions: 'Manage Permissions',
  currentPermissions: 'Current Permissions',
  choose: 'Choose...',
  selectUser: 'Select User',
  selectPermission: 'Select Permission',
  selectRole: 'Select Role',
  assignUser: 'Assign User',
  revokeUser: 'Remove User',
  noRoles: 'No roles found.',
  noRolesMatch: 'No roles match your search criteria.',
  editRole: 'Edit Role',
  viewRole: 'View Role',
  deleteRole: 'Delete Role',
  saveChanges: 'Save Changes',
  assignedPermissions: 'Assigned Permissions',
  noPermissions: 'No permissions assigned',
  systemRole: 'System Role',
  restricted: 'Restricted',
  comingSoon: 'Coming soon',
  newItem: 'New Item',
  newBundle: 'New Bundle',
  createItem: 'Create Item',
  createBundle: 'Create Bundle',
  allScopes: 'All Scopes',
  allGames: 'All Games',
  allSlots: 'All Slots',
  receivedGifts: 'Received Gifts',
  inventory: 'Inventory',
  purchase: 'Purchase',
  equip: 'Equip',
  unequip: 'Unequip',
  useItem: 'Use Item',
  sendGift: 'Send Gift',
};

const translationsAr: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  users: 'المستخدمون',
  roles: 'الأدوار والصلاحيات',
  ranks: 'الترتيب',
  rooms: 'الغرف الصوتية',
  store: 'المتجر',
  reports: 'التقارير',
  support: 'الدعم الفني',
  moderation: 'الإشراف',
  settings: 'الإعدادات',
  logout: 'تسجيل الخروج',
  profile: 'الملف الشخصي',
  light: 'فاتح',
  dark: 'داكن',
  system: 'النظام',
  loading: 'جاري التحميل...',
  error: 'حدث خطأ',
  retry: 'إعادة المحاولة',
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  edit: 'تعديل',
  create: 'إنشاء',
  search: 'بحث',
  filter: 'تصفية',
  export: 'تصدير',
  back: 'رجوع',
  close: 'إغلاق',
  confirm: 'تأكيد',
  actions: 'الإجراءات',
  status: 'الحالة',
  noData: 'لا توجد بيانات',
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'معلق',
  resolved: 'محلول',
  username: 'اسم المستخدم',
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  login: 'تسجيل الدخول',
  welcome: 'مرحباً بعودتك',
  totalUsers: 'إجمالي المستخدمين',
  activeReports: 'التقارير النشطة',
  openTickets: 'التذاكر المفتوحة',
  activeSanctions: 'العقوبات النشطة',
  serverUptime: 'وقت تشغيل الخادم',
  memoryUsage: 'استخدام الذاكرة',
  connections: 'الاتصالات النشطة',
  viewDetails: 'عرض التفاصيل',
  assignRole: 'تعيين دور',
  adjustBalance: 'تعديل الرصيد',
  banUser: 'حظر المستخدم',
  searchUsers: 'بحث عن المستخدمين...',
  all: 'الكل',
  createRole: 'إنشاء دور',
  permissions: 'الصلاحيات',
  priority: 'الأولوية',
  description: 'الوصف',
  open: 'مفتوح',
  inProgress: 'قيد التنفيذ',
  closed: 'مغلق',
  subject: 'الموضوع',
  message: 'الرسالة',
  reply: 'رد',
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  urgent: 'عاجل',
  ban: 'حظر',
  mute: 'كتم',
  addStrike: 'إضافة تحذير',
  reason: 'السبب',
  duration: 'المدة',
  hours: 'ساعات',
  days: 'أيام',
  view: 'عرض',
  details: 'التفاصيل',
  createdAt: 'تاريخ الإنشاء',
  updatedAt: 'تاريخ التحديث',
  collapse: 'طي',
  name: 'الاسم',
  assigned: 'مُعين',
  available: 'متاح',
  select: 'اختر دور',
  activityOverview: 'نظرة عامة على النشاط',
  memoryHistory: 'سجل الذاكرة',
  heap: 'Heap',
  permissionsDescription: 'إدارة صلاحيات النظام وحقوق الوصول.',
  rolesDescription: 'إدارة الأدوار والصلاحيات لشبكتك الإدارية.',
  searchPermissions: 'البحث في الصلاحيات...',
  createPermission: 'إنشاء صلاحية',
  deletePermission: 'حذف الصلاحية',
  deletePermissionConfirm: 'هل أنت متأكد من حذف هذه الصلاحية؟',
  copied: 'تم النسخ!',
  copyAll: 'نسخ الكل',
  showing: 'عرض',
  of: 'من',
  noPermissionsFound: 'لم يتم العثور على صلاحيات.',
  creating: 'جاري الإنشاء...',
  permissionCode: 'رمز الصلاحية',
  permissionType: 'نوع الصلاحية',
  perms: 'الصلاحيات',
  usersList: 'المستخدمون',
  assignPermissions: 'تعيين الصلاحيات',
  assignUsers: 'تعيين المستخدمين',
  assignPermission: 'تعيين',
  revokePermission: 'إلغاء',
  assigning: 'جاري التعيين...',
  revoking: 'جاري الإلغاء...',
  managePermissions: 'إدارة الصلاحيات',
  currentPermissions: 'الصلاحيات الحالية',
  choose: 'اختر...',
  selectUser: 'اختر مستخدم',
  selectPermission: 'اختر صلاحية',
  selectRole: 'اختر الدور',
  assignUser: 'تعيين مستخدم',
  revokeUser: 'إزالة مستخدم',
  noRoles: 'لا توجد أدوار.',
  noRolesMatch: 'لا توجد أدوار تطابق معايير البحث.',
  editRole: 'تعديل الدور',
  viewRole: 'عرض الدور',
  deleteRole: 'حذف الدور',
  saveChanges: 'حفظ التغييرات',
  assignedPermissions: 'الصلاحيات المعينة',
  noPermissions: 'لا توجد صلاحيات معينة',
  systemRole: 'دور نظام',
  restricted: 'محدد',
  comingSoon: 'قريباً',
  newItem: 'عنصر جديد',
  newBundle: 'حزمة جديدة',
  createItem: 'إنشاء عنصر',
  createBundle: 'إنشاء حزمة',
  allScopes: 'جميع النطاقات',
  allGames: 'جميع الألعاب',
  allSlots: 'جميع الفتحات',
  receivedGifts: 'الهدايا المستلمة',
  inventory: 'المخزون',
  purchase: 'شراء',
  equip: 'تجهيز',
  unequip: 'إلغاء التجهيز',
  useItem: 'استخدام العنصر',
  sendGift: 'إرسال هدية',
};

const translations: Record<Locale, Record<string, string>> = {
  en: translationsEn,
  ar: translationsAr,
};

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ar') return stored;
  return 'en';
}

function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const browserLang = navigator.language?.split('-')[0];
  return browserLang === 'ar' ? 'ar' : 'en';
}

export function LanguageProvider({
  children,
  locale: initialLocale,
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale) return initialLocale;
    if (typeof window !== 'undefined') {
      return getStoredLocale() || getBrowserLocale();
    }
    return 'en';
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, getBrowserLocale());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLocale;
    },
    []
  );

  const t = useCallback(
    (key: string): string => {
      return translations[locale][key] || key;
    },
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        isRTL: locale === 'ar',
        setLocale,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      locale: 'en' as Locale,
      isRTL: false,
      setLocale: () => {},
      t: (key: string) => key,
    };
  }
  return context;
}
