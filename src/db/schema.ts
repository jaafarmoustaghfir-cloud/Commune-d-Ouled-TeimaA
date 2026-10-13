import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table (Citizens, Employees, Admins)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase UID or local unique string
  email: text('email').unique().notNull(),
  password: text('password'), // Encrypted local password (for employees, and optional citizen email login)
  role: text('role').notNull().default('citizen'), // 'citizen', 'employee', 'admin' (Super Admin)
  name: text('name'), // Full Name
  cin: text('cin'), // National Identity Card (CIN)
  phone: text('phone'),
  address: text('address'),
  dateOfBirth: text('date_of_birth'), // Format: YYYY-MM-DD
  placeOfBirth: text('place_of_birth'),
  
  // Birth registration information for citizens
  birthRegNum: text('birth_reg_num'), // Birth Registration Number (e.g., 234/78)
  birthRegYear: text('birth_reg_year'),
  birthRegOffice: text('birth_reg_office'),

  // Uploaded documents
  cinFrontUrl: text('cin_front_url'),
  cinBackUrl: text('cin_back_url'),

  // Account verification status for citizens
  verifiedStatus: text('verified_status').default('pending'), // 'pending', 'approved', 'missing_documents', 'rejected'
  
  // Flag for default development accounts that requires changing password on first login
  forcePasswordChange: boolean('force_password_change').default(false),
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Civil Status Requests Table
export const civilStatusRequests = pgTable('civil_status_requests', {
  id: serial('id').primaryKey(),
  requestNumber: text('request_number').unique().notNull(), // Unique generated request number
  citizenId: integer('citizen_id').references(() => users.id), // The requesting citizen
  
  // Citizens request details (can be entered manually or auto-filled from profile)
  fullName: text('full_name').notNull(),
  cin: text('cin').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  placeOfBirth: text('place_of_birth').notNull(),
  birthRegNum: text('birth_reg_num'), // Optional/required depending on doc
  birthRegYear: text('birth_reg_year'),
  birthRegOffice: text('birth_reg_office'),
  phone: text('phone').notNull(),
  email: text('email'),
  address: text('address').notNull(),

  // Document details
  typeOfDocument: text('type_of_document').notNull(), // 'extrait_naissance', 'copie_integrale', 'acte_deces', 'declaration_naissance', 'rectification'
  numberOfCopies: integer('number_of_copies').notNull().default(1),
  modeOfDelivery: text('mode_of_delivery').notNull(), // 'pickup' (commune), 'mail' (post)
  
  // Status workflow
  status: text('status').notNull().default('submitted'), // 'submitted', 'under_review', 'missing_documents', 'approved', 'ready_for_pickup', 'delivered', 'rejected'
  rejectionReason: text('rejection_reason'),
  missingDocsDescription: text('missing_docs_description'),
  internalNotes: text('internal_notes'),

  // Uploads
  cinFrontUrl: text('cin_front_url'),
  cinBackUrl: text('cin_back_url'),
  additionalDocUrl: text('additional_doc_url'), // in case they need to upload something else

  // Security & metadata
  qrCodeContent: text('qr_code_content'),
  pdfUrl: text('pdf_url'), // link to the generated document PDF receipt or certificate
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Official Birth Records Registry (for Employee Verification)
export const birthRecords = pgTable('birth_records', {
  id: serial('id').primaryKey(),
  recordNumber: text('record_number').notNull(),
  recordYear: text('record_year').notNull(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  fatherNameAr: text('father_name_ar').notNull(),
  fatherNameFr: text('father_name_fr').notNull(),
  motherNameAr: text('mother_name_ar').notNull(),
  motherNameFr: text('mother_name_fr').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  placeOfBirth: text('place_of_birth').notNull(),
  gender: text('gender').notNull(), // 'M', 'F'
  createdAt: timestamp('created_at').defaultNow(),
});

// Official Death Records Registry (for Employee Verification)
export const deathRecords = pgTable('death_records', {
  id: serial('id').primaryKey(),
  recordNumber: text('record_number').notNull(),
  recordYear: text('record_year').notNull(),
  nameAr: text('name_ar').notNull(),
  nameFr: text('name_fr').notNull(),
  dateOfDeath: text('date_of_death').notNull(),
  placeOfDeath: text('place_of_death').notNull(),
  causeOfDeath: text('cause_of_death'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Official Marriage Records Registry (for Employee Verification)
export const marriageRecords = pgTable('marriage_records', {
  id: serial('id').primaryKey(),
  recordNumber: text('record_number').notNull(),
  recordYear: text('record_year').notNull(),
  husbandNameAr: text('husband_name_ar').notNull(),
  husbandNameFr: text('husband_name_fr').notNull(),
  wifeNameAr: text('wife_name_ar').notNull(),
  wifeNameFr: text('wife_name_fr').notNull(),
  dateOfMarriage: text('date_of_marriage').notNull(),
  placeOfMarriage: text('place_of_marriage').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Online Appointments Table
export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  citizenId: integer('citizen_id').references(() => users.id),
  fullName: text('full_name').notNull(),
  cin: text('cin').notNull(),
  phone: text('phone').notNull(),
  serviceType: text('service_type').notNull(), // e.g. 'extrait_naissance', 'legalisation', etc.
  appointmentDate: text('appointment_date').notNull(), // YYYY-MM-DD
  appointmentTime: text('appointment_time').notNull(), // HH:MM
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications Table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  titleAr: text('title_ar').notNull(),
  titleFr: text('title_fr').notNull(),
  messageAr: text('message_ar').notNull(),
  messageFr: text('message_fr').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  type: text('type').notNull().default('dashboard'), // 'dashboard', 'email', 'sms'
  createdAt: timestamp('created_at').defaultNow(),
});

// News & Announcements Table
export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  titleAr: text('title_ar').notNull(),
  titleFr: text('title_fr').notNull(),
  contentAr: text('content_ar').notNull(),
  contentFr: text('content_fr').notNull(),
  category: text('category').notNull().default('announcement'), // 'news', 'announcement', 'notice'
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit Logs Table (For security compliance)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').references(() => users.id),
  actorName: text('actor_name').notNull(),
  action: text('action').notNull(), // e.g. 'LOGIN', 'APPROVE_REQUEST', etc.
  details: text('details').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// System Settings Table
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Table Relations
export const usersRelations = relations(users, ({ many }) => ({
  requests: many(civilStatusRequests),
  appointments: many(appointments),
  notifications: many(notifications),
  logs: many(auditLogs),
  complaints: many(complaints),
}));

export const civilStatusRequestsRelations = relations(civilStatusRequests, ({ one }) => ({
  citizen: one(users, {
    fields: [civilStatusRequests.citizenId],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  citizen: one(users, {
    fields: [appointments.citizenId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

// Complaints Table
export const complaints = pgTable('complaints', {
  id: serial('id').primaryKey(),
  complaintNumber: text('complaint_number').unique().notNull(),
  citizenId: integer('citizen_id').references(() => users.id),
  citizenName: text('citizen_name').notNull(),
  cin: text('cin').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  category: text('category').notNull(),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  supportingDocUrl: text('supporting_doc_url'), // base64 or attachment path
  status: text('status').notNull().default('new'), // 'new', 'under_review', 'waiting_citizen', 'resolved', 'closed', 'rejected'
  assignedEmployeeId: integer('assigned_employee_id').references(() => users.id),
  assignedEmployeeName: text('assigned_employee_name'),
  resolutionNotes: text('resolution_notes'),
  internalNotes: text('internal_notes'),
  replyMessage: text('reply_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const complaintsRelations = relations(complaints, ({ one }) => ({
  citizen: one(users, {
    fields: [complaints.citizenId],
    references: [users.id],
  }),
  assignedEmployee: one(users, {
    fields: [complaints.assignedEmployeeId],
    references: [users.id],
  }),
}));
