import { relations } from 'drizzle-orm';
import { boolean, integer, json, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: varchar('role', { length: 50 }).notNull().default('student'),
  passwordHash: text('password_hash'), // Nullable for Google Auth users
  mfaEnabled: boolean('mfa_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  permissions: json('permissions').notNull().default([]), // array of strings
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull(),
  device: varchar('device', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, published, archived, closed
  code: varchar('code', { length: 50 }),
  isCodeActive: boolean('is_code_active').default(true),
  isPublic: boolean('is_public').default(false),
  resultsReleased: boolean('results_released').default(false),
  timeLimit: integer('time_limit'), // in minutes, null means no limit
  startTime: timestamp('start_time'), // quiz available from
  endTime: timestamp('end_time'), // quiz available until
  allowedAttempts: integer('allowed_attempts').default(1), // max attempts allowed per participant
  authorId: integer('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  securitySettings: json('security_settings').default({
    fullscreen: false,
    tabBlur: false,
    copyPaste: false,
    randomizeQuestions: false,
    randomizeOptions: false,
    deviceTracking: false,
    showCorrectAnswersAfterSubmit: false,
  }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('multiple_choice'),
  points: integer('points').notNull().default(1),
  content: text('content').notNull(),
});

export const options = pgTable('options', {
  id: serial('id').primaryKey(),
  questionId: integer('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
  content: text('content').notNull(),
});

export const attempts = pgTable('attempts', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  participantName: text('participant_name'),
  score: integer('score').default(0),
  status: varchar('status', { length: 50 }).notNull().default('in_progress'), // joined, in_progress, submitted, auto_submitted
  violations: integer('violations').default(0),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  startedAt: timestamp('started_at').defaultNow(),
  calculatedEndTime: timestamp('calculated_end_time'), // specific end time for this attempt based on quiz availability
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const answers = pgTable('answers', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: integer('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  optionId: integer('option_id').references(() => options.id, { onDelete: 'cascade' }).notNull(),
});

export const quizActivityLogs = pgTable('quiz_activity_logs', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'tab_switch', 'fullscreen_exit', 'multiple_login', 'window_blur'
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const certificates = pgTable('certificates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  quizId: integer('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  certificateId: varchar('certificate_id', { length: 255 }).unique().notNull(),
  issuedAt: timestamp('issued_at').defaultNow(),
});

export const certificateTemplates = pgTable('certificate_templates', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  enabled: boolean('enabled').default(false),
  passingPercentage: integer('passing_percentage').default(70),
  backgroundImage: text('background_image'),
  layoutConfig: json('layout_config').default({
    studentName: { x: 148.5, y: 100, fontSize: 24, color: '#000000', align: 'center', enabled: true },
    studentEmail: { x: 148.5, y: 110, fontSize: 14, color: '#666666', align: 'center', enabled: false },
    quizTitle: { x: 148.5, y: 130, fontSize: 18, color: '#000000', align: 'center', enabled: true },
    score: { x: 148.5, y: 150, fontSize: 16, color: '#000000', align: 'center', enabled: true },
    percentage: { x: 148.5, y: 160, fontSize: 16, color: '#000000', align: 'center', enabled: false },
    rank: { x: 148.5, y: 170, fontSize: 16, color: '#000000', align: 'center', enabled: false },
    issueDate: { x: 70, y: 180, fontSize: 14, color: '#000000', align: 'left', enabled: true },
    certificateId: { x: 227, y: 180, fontSize: 10, color: '#666666', align: 'right', enabled: true }
  }),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actor: text('actor').notNull(), // userId or 'system'
  action: text('action').notNull(),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id').references(() => quizzes.id, { onDelete: 'cascade' }).notNull(),
  metricsJson: json('metrics_json').notNull().default({}),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  quizzes: many(quizzes),
  attempts: many(attempts),
  certificates: many(certificates),
}));
