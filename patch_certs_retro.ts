import { db } from './src/db/index.js';
import { certificateTemplates, quizAttempts, quizzes, certificates } from './src/db/schema.js';
import { eq, and, isNull, leftJoin } from 'drizzle-orm';
import crypto from 'crypto';

// testing logic for retroactive
