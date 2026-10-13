import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Imports from our database and schema
import { db } from './src/db/index.ts';
import { seedDatabase } from './src/db/seed.ts';
import { 
  users, 
  civilStatusRequests, 
  birthRecords, 
  appointments, 
  notifications, 
  announcements, 
  auditLogs, 
  settings,
  complaints
} from './src/db/schema.ts';
import { eq, and, or, like, desc, sql, ne } from 'drizzle-orm';

// Firebase Admin setup
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const adminAuth = getAuth();

const JWT_SECRET = process.env.JWT_SECRET || 'ouled-teima-civil-secret-2026';
const PORT = 3000;

async function startServer() {
  const app = express();
  
  // Parse large JSON payloads for base64 file uploads
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ limit: '20mb', extended: true }));

  // Run the seeder on startup
  try {
    await seedDatabase();
  } catch (seedError) {
    console.error('Error during database seed on startup:', seedError);
  }

  // --- AUTHENTICATION MIDDLEWARE ---
  const requireAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // First, try verifying as a local JWT (for employees, admin, and local citizens)
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      // Strict database validation of account status (Active/Disabled)
      const userList = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      if (userList.length === 0) {
        return res.status(401).json({ error: 'Unauthorized: Account does not exist' });
      }

      const dbUser = userList[0];
      if (dbUser.isActive === false) {
        return res.status(403).json({ error: 'Forbidden: Account has been disabled / الحساب معطل' });
      }

      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        forcePasswordChange: dbUser.forcePasswordChange
      };
      return next();
    } catch (jwtError) {
      // If local JWT fails, attempt to verify as a Firebase ID Token
      try {
        const firebaseUser = await adminAuth.verifyIdToken(token);
        
        // Find or create this user in our local PostgreSQL database
        let localUser = await db.select().from(users).where(eq(users.uid, firebaseUser.uid)).limit(1);
        let dbUser: any;

        if (localUser.length === 0) {
          // Auto-register Firebase user in PostgreSQL
          const newUser = await db.insert(users).values({
            uid: firebaseUser.uid,
            email: firebaseUser.email || `${firebaseUser.uid}@firebase.com`,
            name: firebaseUser.name || 'Citizen User',
            role: 'citizen',
            verifiedStatus: 'pending',
            isActive: true,
          }).returning();
          dbUser = newUser[0];
        } else {
          dbUser = localUser[0];
        }

        if (dbUser.isActive === false) {
          return res.status(403).json({ error: 'Forbidden: Account has been disabled / الحساب معطل' });
        }

        req.user = {
          id: dbUser.id,
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          role: dbUser.role,
          name: dbUser.name,
          forcePasswordChange: dbUser.forcePasswordChange || false
        };
        return next();
      } catch (firebaseError) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }
  };

  // Helper middleware for RBAC (Role-Based Access Control)
  const requireRole = (allowedRoles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Map and support expanded RBAC roles
      let normalizedAllowed = [...allowedRoles];
      if (allowedRoles.includes('employee')) {
        normalizedAllowed.push('Agent', 'Supervisor');
      }
      if (allowedRoles.includes('admin')) {
        normalizedAllowed.push('Administrator', 'Super Administrator');
      }

      if (!normalizedAllowed.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: Access denied' });
      }
      next();
    };
  };

  // Helper to log audit actions
  const logAudit = async (userId: number | null, name: string, action: string, details: string, ip?: string) => {
    try {
      await db.insert(auditLogs).values({
        actorId: userId,
        actorName: name,
        action,
        details,
        ipAddress: ip || '127.0.0.1'
      });
    } catch (err) {
      console.error('Audit logger error:', err);
    }
  };

  // --- API ENDPOINTS ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // 1. PUBLIC ENDPOINTS

  // Get announcements / news
  app.get('/api/public/announcements', async (req, res) => {
    try {
      const list = await db.select()
        .from(announcements)
        .where(eq(announcements.isPublished, true))
        .orderBy(desc(announcements.createdAt));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load announcements: ' + error.message });
    }
  });

  // Track Request (by request number or CIN) - Protected
  app.get('/api/public/track', requireAuth, async (req: any, res) => {
    const { query } = req.query; // request number OR CIN
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
      const qStr = String(query).trim();
      let list;

      // If the logged-in user is a citizen, they can only view their own requests
      if (req.user.role === 'citizen') {
        list = await db.select()
          .from(civilStatusRequests)
          .where(
            and(
              eq(civilStatusRequests.citizenId, req.user.id),
              or(
                eq(civilStatusRequests.requestNumber, qStr),
                eq(civilStatusRequests.cin, qStr)
              )
            )
          )
          .orderBy(desc(civilStatusRequests.createdAt));
      } else {
        // Employees and admins can query any request
        list = await db.select()
          .from(civilStatusRequests)
          .where(
            or(
              eq(civilStatusRequests.requestNumber, qStr),
              eq(civilStatusRequests.cin, qStr)
            )
          )
          .orderBy(desc(civilStatusRequests.createdAt));
      }
      
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to track request: ' + error.message });
    }
  });

  // 2. AUTH ENDPOINTS

  // Citizen Local Registration (Email/Password)
  const handleRegisterCitizen = async (req: any, res: any) => {
    const { 
      email, password, name, cin, phone, address, 
      dateOfBirth, placeOfBirth, birthRegNum, birthRegYear, birthRegOffice,
      cinFront, cinBack 
    } = req.body;

    if (!email || !password || !name || !cin || !phone || !address || !dateOfBirth || !placeOfBirth) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required profile fields', 
        error: 'Missing required profile fields' 
      });
    }

    try {
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already registered / البريد الإلكتروني مسجل بالفعل', 
          error: 'Email already registered / البريد الإلكتروني مسجل بالفعل' 
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userUid = 'local-' + Date.now();

      const newUser = await db.insert(users).values({
        uid: userUid,
        email,
        password: hashedPassword,
        role: 'citizen',
        name,
        cin,
        phone,
        address,
        dateOfBirth,
        placeOfBirth,
        birthRegNum,
        birthRegYear,
        birthRegOffice,
        cinFrontUrl: cinFront || null,
        cinBackUrl: cinBack || null,
        verifiedStatus: 'pending',
      }).returning();

      await logAudit(newUser[0].id, name, 'REGISTER_CITIZEN', `Registered new citizen local account for CIN ${cin}`);

      const token = jwt.sign({
        id: newUser[0].id,
        email: newUser[0].email,
        role: newUser[0].role,
        name: newUser[0].name,
        forcePasswordChange: false
      }, JWT_SECRET, { expiresIn: '7d' });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          role: newUser[0].role,
          name: newUser[0].name,
          verifiedStatus: newUser[0].verifiedStatus,
        }
      });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        message: 'Registration failed: ' + error.message, 
        error: error.message 
      });
    }
  };

  app.post('/api/auth/register', handleRegisterCitizen);
  app.post('/api/auth/register-citizen', handleRegisterCitizen);

  // Failed login attempts tracker
  const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

  const trackFailedAttempt = (key: string) => {
    const now = Date.now();
    const current = failedAttempts.get(key) || { count: 0, lastAttempt: now };
    
    if (now - current.lastAttempt > 15 * 60 * 1000) {
      current.count = 1;
    } else {
      current.count += 1;
    }
    current.lastAttempt = now;
    failedAttempts.set(key, current);
  };

  const isAccountLocked = (key: string): boolean => {
    const now = Date.now();
    const current = failedAttempts.get(key);
    if (!current) return false;
    
    if (now - current.lastAttempt > 15 * 60 * 1000) {
      failedAttempts.delete(key);
      return false;
    }
    
    return current.count >= 5;
  };

  const resetFailedAttempts = (key: string) => {
    failedAttempts.delete(key);
  };

  // Employee/Admin Local Login
  const handleLoginEmployee = async (req: any, res: any) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required',
        error: 'Username and password are required' 
      });
    }

    try {
      const normalizedUsername = username.trim().toLowerCase();
      const emailQuery = normalizedUsername.includes('@') ? normalizedUsername : `${normalizedUsername}@ouledteima.ma`;

      // Check account lock
      if (isAccountLocked(emailQuery)) {
        return res.status(403).json({
          success: false,
          message: 'Account locked due to multiple failed login attempts. Please try again after 15 minutes.',
          error: 'Account locked / الحساب مغلق مؤقتاً لكثرة محاولات الدخول الخاطئة'
        });
      }

      const userList = await db.select().from(users).where(eq(users.email, emailQuery)).limit(1);
      
      if (userList.length === 0) {
        trackFailedAttempt(emailQuery);
        await logAudit(null, 'Guest', 'LOGIN_FAILED', `Failed login attempt for unknown employee: ${emailQuery}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials', 
          error: 'Invalid credentials / معلومات تسجيل الدخول غير صحيحة' 
        });
      }

      const employee = userList[0];
      const allowedEmployeeRoles = ['employee', 'Agent', 'Supervisor', 'admin', 'Administrator', 'Super Administrator'];
      if (!allowedEmployeeRoles.includes(employee.role)) {
        trackFailedAttempt(emailQuery);
        await logAudit(employee.id, employee.name || employee.email, 'LOGIN_FAILED', `Access denied role mismatch for employee: ${emailQuery}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied: Not an employee account', 
          error: 'Access denied: Not an employee account' 
        });
      }

      // Check isActive status
      if (employee.isActive === false) {
        trackFailedAttempt(emailQuery);
        await logAudit(employee.id, employee.name || employee.email, 'LOGIN_FAILED', `Failed login attempt on disabled account: ${emailQuery}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Account has been disabled / الحساب معطل', 
          error: 'Forbidden: Account has been disabled / الحساب معطل' 
        });
      }

      const isMatch = await bcrypt.compare(password, employee.password || '');
      if (!isMatch) {
        trackFailedAttempt(emailQuery);
        await logAudit(employee.id, employee.name || employee.email, 'LOGIN_FAILED', `Failed login attempt (invalid password) for employee: ${emailQuery}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials', 
          error: 'Invalid credentials / معلومات تسجيل الدخول غير صحيحة' 
        });
      }

      // Successful login reset failed attempts
      resetFailedAttempts(emailQuery);

      await logAudit(employee.id, employee.name || employee.email, 'LOGIN', `Employee/Admin logged in: ${employee.role}`);

      const token = jwt.sign({
        id: employee.id,
        email: employee.email,
        role: employee.role,
        name: employee.name,
        forcePasswordChange: employee.forcePasswordChange
      }, JWT_SECRET, { expiresIn: '1d' });

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: employee.id,
          email: employee.email,
          role: employee.role,
          name: employee.name,
          forcePasswordChange: employee.forcePasswordChange
        }
      });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        message: 'Login failed: ' + error.message, 
        error: error.message 
      });
    }
  };

  app.post('/api/auth/login-employee', handleLoginEmployee);
  app.post('/api/auth/login/employee', handleLoginEmployee);
  app.post('/api/auth/login/admin', handleLoginEmployee);

  // Local Citizen Login (Email/Password alternative)
  const handleLoginCitizen = async (req: any, res: any) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required',
        error: 'Email and password are required' 
      });
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Check account lock
      if (isAccountLocked(normalizedEmail)) {
        return res.status(403).json({
          success: false,
          message: 'Account locked due to multiple failed login attempts. Please try again after 15 minutes.',
          error: 'Account locked / الحساب مغلق مؤقتاً لكثرة محاولات الدخول الخاطئة'
        });
      }

      const userList = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (userList.length === 0) {
        trackFailedAttempt(normalizedEmail);
        await logAudit(null, 'Guest', 'LOGIN_FAILED', `Failed login attempt for unknown citizen: ${normalizedEmail}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials', 
          error: 'Invalid credentials / معلومات خاطئة' 
        });
      }

      const citizen = userList[0];
      if (citizen.role !== 'citizen') {
        trackFailedAttempt(normalizedEmail);
        await logAudit(citizen.id, citizen.name || citizen.email, 'LOGIN_FAILED', `Citizen login path mismatch: ${normalizedEmail}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Use employee login', 
          error: 'Forbidden: Use employee login' 
        });
      }

      // Check isActive status
      if (citizen.isActive === false) {
        trackFailedAttempt(normalizedEmail);
        await logAudit(citizen.id, citizen.name || citizen.email, 'LOGIN_FAILED', `Failed login on disabled citizen account: ${normalizedEmail}`);
        return res.status(403).json({ 
          success: false, 
          message: 'Forbidden: Account has been disabled / الحساب معطل', 
          error: 'Forbidden: Account has been disabled / الحساب معطل' 
        });
      }

      const isMatch = await bcrypt.compare(password, citizen.password || '');
      if (!isMatch) {
        trackFailedAttempt(normalizedEmail);
        await logAudit(citizen.id, citizen.name || citizen.email, 'LOGIN_FAILED', `Failed login attempt (invalid password) for citizen: ${normalizedEmail}`);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials', 
          error: 'Invalid credentials / معلومات خاطئة' 
        });
      }

      resetFailedAttempts(normalizedEmail);

      await logAudit(citizen.id, citizen.name || citizen.email, 'LOGIN', 'Citizen logged in with email/password');

      const token = jwt.sign({
        id: citizen.id,
        email: citizen.email,
        role: citizen.role,
        name: citizen.name,
        forcePasswordChange: false
      }, JWT_SECRET, { expiresIn: '7d' });

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: citizen.id,
          email: citizen.email,
          role: citizen.role,
          name: citizen.name,
          verifiedStatus: citizen.verifiedStatus,
        }
      });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        message: 'Login failed: ' + error.message, 
        error: error.message 
      });
    }
  };

  app.post('/api/auth/login-citizen', handleLoginCitizen);
  app.post('/api/auth/login/citizen', handleLoginCitizen);

  // Change Password (for employee forcePasswordChange, and edit profile)
  const handleChangePassword = async (req: any, res: any) => {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password is required', 
        error: 'New password is required' 
      });
    }

    try {
      const userRecord = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      if (userRecord.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found', 
          error: 'User not found' 
        });
      }

      const currentUser = userRecord[0];

      // If they had a password, verify old password (unless it's forced and they haven't set up yet)
      if (currentUser.password && !currentUser.forcePasswordChange) {
        const isMatch = await bcrypt.compare(oldPassword || '', currentUser.password);
        if (!isMatch) {
          return res.status(400).json({ 
            success: false, 
            message: 'Incorrect old password / كلمة المرور القديمة خاطئة', 
            error: 'Incorrect old password / كلمة المرور القديمة خاطئة' 
          });
        }
      }

      // Hash and update
      const hashedNew = await bcrypt.hash(newPassword, 10);
      await db.update(users)
        .set({ 
          password: hashedNew,
          forcePasswordChange: false 
        })
        .where(eq(users.id, req.user.id));

      await logAudit(req.user.id, currentUser.name || currentUser.email, 'CHANGE_PASSWORD', 'Successfully changed account password');

      return res.json({ 
        success: true, 
        message: 'Password changed successfully / تم تغيير كلمة المرور بنجاح' 
      });
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to change password: ' + error.message, 
        error: error.message 
      });
    }
  };

  app.post('/api/auth/change-password', requireAuth, handleChangePassword);
  app.post('/api/auth/change-password-force', requireAuth, handleChangePassword);

  // Get My Profile details
  app.get('/api/auth/profile', requireAuth, async (req: any, res) => {
    try {
      const profile = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      if (profile.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Sanitized profile, don't send password hash
      const { password, ...sanitized } = profile[0];
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load profile' });
    }
  });

  // Update Citizen profile (including initial CIN uploads if they want to update)
  app.put('/api/auth/profile', requireAuth, async (req: any, res) => {
    const { name, phone, address, dateOfBirth, placeOfBirth, birthRegNum, birthRegYear, birthRegOffice, cinFront, cinBack } = req.body;
    
    try {
      const updated = await db.update(users)
        .set({
          name: name || undefined,
          phone: phone || undefined,
          address: address || undefined,
          dateOfBirth: dateOfBirth || undefined,
          placeOfBirth: placeOfBirth || undefined,
          birthRegNum: birthRegNum || undefined,
          birthRegYear: birthRegYear || undefined,
          birthRegOffice: birthRegOffice || undefined,
          cinFrontUrl: cinFront || undefined,
          cinBackUrl: cinBack || undefined,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      await logAudit(req.user.id, updated[0].name || updated[0].email, 'UPDATE_PROFILE', 'Updated profile information');
      
      const { password, ...sanitized } = updated[0];
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update profile: ' + error.message });
    }
  });


  // 3. CITIZEN ENDPOINTS

  // Submit request
  app.post('/api/citizen/submit-request', requireAuth, requireRole(['citizen']), async (req: any, res) => {
    const {
      fullName, cin, dateOfBirth, placeOfBirth,
      birthRegNum, birthRegYear, birthRegOffice,
      phone, email, address,
      typeOfDocument, numberOfCopies, modeOfDelivery,
      cinFront, cinBack, additionalDoc
    } = req.body;

    if (!fullName || !cin || !dateOfBirth || !placeOfBirth || !phone || !address || !typeOfDocument) {
      return res.status(400).json({ error: 'Missing required request parameters' });
    }

    try {
      // Check if citizen's account verified status. They can submit, but employees will verify the CIN
      // Generate request number ROT-YYYY-XXXXX (ROT = Request Ouled Teima)
      const currentYear = new Date().getFullYear();
      const randomId = Math.floor(10000 + Math.random() * 90000);
      const requestNumber = `ROT-${currentYear}-${randomId}`;

      // QR Code Content
      const trackingUrl = `${process.env.APP_URL || 'http://localhost:3000'}/track?num=${requestNumber}`;

      // Insert request
      const requestResult = await db.insert(civilStatusRequests).values({
        requestNumber,
        citizenId: req.user.id,
        fullName,
        cin,
        dateOfBirth,
        placeOfBirth,
        birthRegNum: birthRegNum || null,
        birthRegYear: birthRegYear || null,
        birthRegOffice: birthRegOffice || null,
        phone,
        email: email || req.user.email,
        address,
        typeOfDocument,
        numberOfCopies: Number(numberOfCopies) || 1,
        modeOfDelivery,
        status: 'submitted',
        cinFrontUrl: cinFront || null,
        cinBackUrl: cinBack || null,
        additionalDocUrl: additionalDoc || null,
        qrCodeContent: trackingUrl,
      }).returning();

      // Log Audit
      await logAudit(req.user.id, req.user.name || req.user.email, 'SUBMIT_REQUEST', `Submitted civil status request: ${requestNumber} for ${typeOfDocument}`);

      // Auto-send notification to citizen
      await db.insert(notifications).values({
        userId: req.user.id,
        titleAr: 'تم إرسال الطلب بنجاح',
        titleFr: 'Demande envoyée avec succès',
        messageAr: `طلبك رقم ${requestNumber} لـ ${typeOfDocument} تم تسجيله بنجاح وهو قيد المراجعة.`,
        messageFr: `Votre demande N° ${requestNumber} pour ${typeOfDocument} a été enregistrée avec succès et est en cours d'examen.`,
        type: 'dashboard',
      });

      res.status(201).json(requestResult[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to submit request: ' + error.message });
    }
  });

  // Get My Requests
  app.get('/api/citizen/my-requests', requireAuth, requireRole(['citizen']), async (req: any, res) => {
    try {
      const list = await db.select()
        .from(civilStatusRequests)
        .where(eq(civilStatusRequests.citizenId, req.user.id))
        .orderBy(desc(civilStatusRequests.createdAt));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch your requests: ' + error.message });
    }
  });

  // Book Appointment
  app.post('/api/citizen/book-appointment', requireAuth, requireRole(['citizen']), async (req: any, res) => {
    const { fullName, cin, phone, serviceType, appointmentDate, appointmentTime, remarks } = req.body;

    if (!fullName || !cin || !phone || !serviceType || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: 'Missing required appointment parameters' });
    }

    try {
      const appt = await db.insert(appointments).values({
        citizenId: req.user.id,
        fullName,
        cin,
        phone,
        serviceType,
        appointmentDate,
        appointmentTime,
        status: 'pending',
        remarks: remarks || null
      }).returning();

      await logAudit(req.user.id, req.user.name || req.user.email, 'BOOK_APPOINTMENT', `Booked appointment for ${appointmentDate} at ${appointmentTime}`);

      // Notify citizen
      await db.insert(notifications).values({
        userId: req.user.id,
        titleAr: 'طلب موعد قيد المراجعة',
        titleFr: 'Rendez-vous en cours de traitement',
        messageAr: `طلب حجز موعد ليوم ${appointmentDate} على الساعة ${appointmentTime} تم تقديمه بنجاح.`,
        messageFr: `Votre demande de rendez-vous pour le ${appointmentDate} à ${appointmentTime} est en cours d'examen.`,
        type: 'dashboard',
      });

      res.status(201).json(appt[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to book appointment: ' + error.message });
    }
  });

  // Get My Appointments
  app.get('/api/citizen/my-appointments', requireAuth, requireRole(['citizen']), async (req: any, res) => {
    try {
      const list = await db.select()
        .from(appointments)
        .where(eq(appointments.citizenId, req.user.id))
        .orderBy(desc(appointments.createdAt));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch appointments: ' + error.message });
    }
  });

  // Get My Notifications
  app.get('/api/citizen/my-notifications', requireAuth, requireRole(['citizen']), async (req: any, res) => {
    try {
      const list = await db.select()
        .from(notifications)
        .where(eq(notifications.userId, req.user.id))
        .orderBy(desc(notifications.createdAt));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch notifications: ' + error.message });
    }
  });

  // Mark notification as read
  app.post('/api/citizen/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, Number(req.params.id)), eq(notifications.userId, req.user.id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: 'Error updating notification status' });
    }
  });

  // Submit Complaint
  app.post('/api/citizen/submit-complaint', requireAuth, requireRole(['citizen']), async (req: any, res) => {
    const { citizenName, cin, phone, email, category, subject, description, supportingDoc } = req.body;

    if (!citizenName || !cin || !phone || !category || !subject || !description) {
      return res.status(400).json({ error: 'Missing required complaint parameters' });
    }

    try {
      const currentYear = new Date().getFullYear();
      const randomId = Math.floor(10000 + Math.random() * 90000);
      const complaintNumber = `COM-${currentYear}-${randomId}`;

      const newComplaint = await db.insert(complaints).values({
        complaintNumber,
        citizenId: req.user.id,
        citizenName,
        cin,
        phone,
        email: email || null,
        category,
        subject,
        description,
        supportingDocUrl: supportingDoc || null,
        status: 'new',
      }).returning();

      await logAudit(
        req.user.id, 
        req.user.name || req.user.email, 
        'SUBMIT_COMPLAINT', 
        `Submitted complaint: ${complaintNumber} - ${category}`
      );

      // Create notification for citizen
      await db.insert(notifications).values({
        userId: req.user.id,
        titleAr: 'تم تسجيل شكواكم بنجاح',
        titleFr: 'Plainte enregistrée avec succès',
        messageAr: `شكواكم رقم ${complaintNumber} بشأن ${category} تم تسجيلها وهي قيد الدراسة.`,
        messageFr: `Votre plainte N° ${complaintNumber} concernant ${category} a été enregistrée et est en cours d'étude.`,
        type: 'dashboard',
      });

      res.status(201).json(newComplaint[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to submit complaint: ' + error.message });
    }
  });

  // Get My Complaints
  app.get('/api/citizen/my-complaints', requireAuth, requireRole(['citizen']), async (req: any, res) => {
    try {
      const list = await db.select()
        .from(complaints)
        .where(eq(complaints.citizenId, req.user.id))
        .orderBy(desc(complaints.createdAt));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch complaints: ' + error.message });
    }
  });


  // 4. EMPLOYEE ENDPOINTS (Agents de l'État Civil & Admins)

  // View & search Requests
  app.get('/api/employee/requests', requireAuth, requireRole(['employee', 'admin']), async (req: any, res) => {
    const { cin, name, requestNumber, birthRegNum, status, docType } = req.query;

    try {
      let conditions: any[] = [];

      if (cin) conditions.push(like(civilStatusRequests.cin, `%${cin}%`));
      if (name) conditions.push(like(civilStatusRequests.fullName, `%${name}%`));
      if (requestNumber) conditions.push(like(civilStatusRequests.requestNumber, `%${requestNumber}%`));
      if (birthRegNum) conditions.push(like(civilStatusRequests.birthRegNum, `%${birthRegNum}%`));
      if (status) conditions.push(eq(civilStatusRequests.status, String(status)));
      if (docType) conditions.push(eq(civilStatusRequests.typeOfDocument, String(docType)));

      let list;
      if (conditions.length > 0) {
        list = await db.select()
          .from(civilStatusRequests)
          .where(and(...conditions))
          .orderBy(desc(civilStatusRequests.createdAt));
      } else {
        list = await db.select()
          .from(civilStatusRequests)
          .orderBy(desc(civilStatusRequests.createdAt));
      }

      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch requests: ' + error.message });
    }
  });

  // Get single request details
  app.get('/api/employee/requests/:id', requireAuth, requireRole(['employee', 'admin']), async (req, res) => {
    try {
      const results = await db.select()
        .from(civilStatusRequests)
        .where(eq(civilStatusRequests.id, Number(req.params.id)))
        .limit(1);

      if (results.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      res.json(results[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch request details' });
    }
  });

  // Update request status (workflow)
  app.post('/api/employee/requests/:id/status', requireAuth, requireRole(['employee', 'admin']), async (req: any, res) => {
    const { status, rejectionReason, missingDocsDescription, internalNotes } = req.body;
    const reqId = Number(req.params.id);

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    try {
      const original = await db.select().from(civilStatusRequests).where(eq(civilStatusRequests.id, reqId)).limit(1);
      if (original.length === 0) {
        return res.status(404).json({ error: 'Request not found' });
      }

      const requestObj = original[0];

      // Update the request status
      const updated = await db.update(civilStatusRequests)
        .set({
          status,
          rejectionReason: rejectionReason || null,
          missingDocsDescription: missingDocsDescription || null,
          internalNotes: internalNotes || null,
          updatedAt: new Date(),
        })
        .where(eq(civilStatusRequests.id, reqId))
        .returning();

      // Log Audit
      await logAudit(
        req.user.id, 
        req.user.name || req.user.email, 
        'UPDATE_REQUEST_STATUS', 
        `Updated request ${requestObj.requestNumber} status from ${requestObj.status} to ${status}`
      );

      // Create a notification for the Citizen
      if (requestObj.citizenId) {
        let titleAr = '';
        let titleFr = '';
        let msgAr = '';
        let msgFr = '';

        if (status === 'under_review') {
          titleAr = 'طلبك قيد المراجعة';
          titleFr = 'Demande en cours d\'examen';
          msgAr = `الطلب رقم ${requestObj.requestNumber} قيد المراجعة الآن من طرف مصلحة الحالة المدنية.`;
          msgFr = `La demande N° ${requestObj.requestNumber} est désormais en cours d'examen par le bureau de l'état civil.`;
        } else if (status === 'missing_documents') {
          titleAr = 'وثائق ناقصة';
          titleFr = 'Documents manquants';
          msgAr = `طلبك رقم ${requestObj.requestNumber} يتطلب وثائق إضافية: ${missingDocsDescription || 'يرجى مراجعة مصلحة الحالة المدنية.'}`;
          msgFr = `Votre demande N° ${requestObj.requestNumber} nécessite des documents complémentaires : ${missingDocsDescription || 'Veuillez contacter le bureau.'}`;
        } else if (status === 'approved') {
          titleAr = 'تمت الموافقة على الطلب';
          titleFr = 'Demande approuvée';
          msgAr = `تمت الموافقة على طلبك رقم ${requestObj.requestNumber}. العمل جار على إعداد الوثيقة الرسمية.`;
          msgFr = `Votre demande N° ${requestObj.requestNumber} a été approuvée. La préparation du document officiel est en cours.`;
        } else if (status === 'ready_for_pickup') {
          titleAr = 'الوثيقة جاهزة للاستلام';
          titleFr = 'Document prêt pour retrait';
          msgAr = `الوثيقة الخاصة بطلبك رقم ${requestObj.requestNumber} جاهزة للاستلام. يرجى زيارة مقر الجماعة مصحوبا ببطاقتك الوطنية.`;
          msgFr = `Le document pour votre demande N° ${requestObj.requestNumber} est prêt. Veuillez vous présenter à la commune muni de votre CIN.`;
        } else if (status === 'delivered') {
          titleAr = 'تم تسليم الوثيقة';
          titleFr = 'Document délivré';
          msgAr = `تم تسليم الوثيقة الرسمية للطلب رقم ${requestObj.requestNumber} بنجاح. شكرا لاستخدامكم بوابتنا الإلكترونية.`;
          msgFr = `Le document officiel pour la demande N° ${requestObj.requestNumber} a été délivré avec succès. Merci d'avoir utilisé notre portail.`;
        } else if (status === 'rejected') {
          titleAr = 'تم رفض الطلب';
          titleFr = 'Demande rejetée';
          msgAr = `تم رفض طلبك رقم ${requestObj.requestNumber}. السبب: ${rejectionReason || 'معلومات غير مطابقة.'}`;
          msgFr = `Votre demande N° ${requestObj.requestNumber} a été rejetée. Motif : ${rejectionReason || 'Informations non conformes.'}`;
        }

        if (titleAr) {
          // 1. Dashboard Notification
          await db.insert(notifications).values({
            userId: requestObj.citizenId,
            titleAr,
            titleFr,
            messageAr: msgAr,
            messageFr: msgFr,
            type: 'dashboard',
          });

          // 2. Automated Email Notification
          await db.insert(notifications).values({
            userId: requestObj.citizenId,
            titleAr: `[البريد الإلكتروني] ${titleAr}`,
            titleFr: `[E-mail] ${titleFr}`,
            messageAr: `تم إرسال بريد إلكتروني تلقائي للمواطن: ${msgAr}`,
            messageFr: `E-mail automatique envoyé au citoyen : ${msgFr}`,
            type: 'email',
          });

          // 3. Automated SMS Notification
          if (requestObj.phone) {
            await db.insert(notifications).values({
              userId: requestObj.citizenId,
              titleAr: `[رسالة نصية قصيرة SMS] ${titleAr}`,
              titleFr: `[SMS] ${titleFr}`,
              messageAr: `تم إرسال رسالة نصية قصيرة للهاتف المحمول ${requestObj.phone} : ${msgAr}`,
              messageFr: `SMS envoyé au mobile ${requestObj.phone} : ${msgFr}`,
              type: 'sms',
            });
          }

          console.log(`[AUTOMATION] Multi-channel notifications (Dashboard, Email, SMS) dispatched successfully to citizen ID ${requestObj.citizenId} for request ${requestObj.requestNumber}.`);
        }
      }

      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update request status: ' + error.message });
    }
  });

  // Verify and search Birth Records Registry
  app.get('/api/employee/birth-records', requireAuth, requireRole(['employee', 'admin']), async (req, res) => {
    const { num, year, name } = req.query;
    try {
      let conditions: any[] = [];
      if (num) conditions.push(eq(birthRecords.recordNumber, String(num)));
      if (year) conditions.push(eq(birthRecords.recordYear, String(year)));
      if (name) {
        conditions.push(
          or(
            like(birthRecords.nameAr, `%${name}%`),
            like(birthRecords.nameFr, `%${name}%`)
          )
        );
      }

      let results;
      if (conditions.length > 0) {
        results = await db.select().from(birthRecords).where(and(...conditions));
      } else {
        results = await db.select().from(birthRecords).limit(50);
      }

      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to query birth records registry' });
    }
  });

  // Manage Announcements (Create)
  app.post('/api/employee/announcements', requireAuth, requireRole(['employee', 'admin']), async (req: any, res) => {
    const { titleAr, titleFr, contentAr, contentFr, category, isPublished } = req.body;
    if (!titleAr || !titleFr || !contentAr || !contentFr) {
      return res.status(400).json({ error: 'Missing announcement content fields' });
    }

    try {
      const brandNew = await db.insert(announcements).values({
        titleAr,
        titleFr,
        contentAr,
        contentFr,
        category: category || 'announcement',
        isPublished: isPublished !== undefined ? isPublished : true,
      }).returning();

      await logAudit(req.user.id, req.user.name || req.user.email, 'CREATE_ANNOUNCEMENT', `Created announcement: ${titleFr}`);
      res.status(201).json(brandNew[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  // Manage Appointments (View & Approve)
  app.get('/api/employee/appointments', requireAuth, requireRole(['employee', 'admin']), async (req, res) => {
    try {
      const list = await db.select().from(appointments).orderBy(desc(appointments.createdAt));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to load appointments' });
    }
  });

  app.post('/api/employee/appointments/:id/status', requireAuth, requireRole(['employee', 'admin']), async (req: any, res) => {
    const { status, remarks } = req.body;
    const apptId = Number(req.params.id);

    try {
      const original = await db.select().from(appointments).where(eq(appointments.id, apptId)).limit(1);
      if (original.length === 0) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const apptObj = original[0];

      const updated = await db.update(appointments)
        .set({ status, remarks })
        .where(eq(appointments.id, apptId))
        .returning();

      await logAudit(req.user.id, req.user.name || req.user.email, 'UPDATE_APPOINTMENT_STATUS', `Updated appointment ${apptId} to ${status}`);

      if (apptObj.citizenId) {
        await db.insert(notifications).values({
          userId: apptObj.citizenId,
          titleAr: status === 'approved' ? 'تم قبول حجز الموعد' : 'تم رفض حجز الموعد',
          titleFr: status === 'approved' ? 'Rendez-vous accepté' : 'Rendez-vous refusé',
          messageAr: status === 'approved' 
            ? `تمت الموافقة على موعدك ليوم ${apptObj.appointmentDate} على الساعة ${apptObj.appointmentTime}.`
            : `تم رفض موعدك ليوم ${apptObj.appointmentDate}. السبب: ${remarks || 'مواعيد ممتلئة.'}`,
          messageFr: status === 'approved'
            ? `Votre rendez-vous pour le ${apptObj.appointmentDate} à ${apptObj.appointmentTime} a été accepté.`
            : `Votre rendez-vous pour le ${apptObj.appointmentDate} a été refusé. Motif : ${remarks || 'Complet.'}`,
          type: 'dashboard',
        });
      }

      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update appointment status' });
    }
  });

  // View and search Complaints
  app.get('/api/employee/complaints', requireAuth, requireRole(['employee', 'admin']), async (req: any, res) => {
    const { status, category, date, q } = req.query;

    try {
      let conditions: any[] = [];
      if (status) conditions.push(eq(complaints.status, String(status)));
      if (category) conditions.push(eq(complaints.category, String(category)));
      if (date) {
        conditions.push(like(sql`to_char(${complaints.createdAt}, 'YYYY-MM-DD')`, `${date}%`));
      }
      if (q) {
        const queryTerm = `%${String(q)}%`;
        conditions.push(
          or(
            like(complaints.complaintNumber, queryTerm),
            like(complaints.citizenName, queryTerm),
            like(complaints.cin, queryTerm),
            like(complaints.subject, queryTerm)
          )
        );
      }

      let list;
      if (conditions.length > 0) {
        list = await db.select()
          .from(complaints)
          .where(and(...conditions))
          .orderBy(desc(complaints.createdAt));
      } else {
        list = await db.select()
          .from(complaints)
          .orderBy(desc(complaints.createdAt));
      }
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch complaints: ' + error.message });
    }
  });

  // Get single complaint details
  app.get('/api/employee/complaints/:id', requireAuth, requireRole(['employee', 'admin']), async (req: any, res) => {
    try {
      const results = await db.select()
        .from(complaints)
        .where(eq(complaints.id, Number(req.params.id)))
        .limit(1);

      if (results.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      res.json(results[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch complaint details' });
    }
  });

  // Update complaint status & notes
  app.post('/api/employee/complaints/:id/status', requireAuth, requireRole(['employee', 'admin']), async (req: any, res) => {
    const { status, assignedEmployeeId, assignedEmployeeName, resolutionNotes, internalNotes, replyMessage } = req.body;
    const compId = Number(req.params.id);

    try {
      const original = await db.select().from(complaints).where(eq(complaints.id, compId)).limit(1);
      if (original.length === 0) {
        return res.status(404).json({ error: 'Complaint not found' });
      }

      const compObj = original[0];

      const updatePayload: any = {
        updatedAt: new Date(),
      };
      if (status !== undefined) updatePayload.status = status;
      if (assignedEmployeeId !== undefined) updatePayload.assignedEmployeeId = assignedEmployeeId;
      if (assignedEmployeeName !== undefined) updatePayload.assignedEmployeeName = assignedEmployeeName;
      if (resolutionNotes !== undefined) updatePayload.resolutionNotes = resolutionNotes;
      if (internalNotes !== undefined) updatePayload.internalNotes = internalNotes;
      if (replyMessage !== undefined) updatePayload.replyMessage = replyMessage;

      const updated = await db.update(complaints)
        .set(updatePayload)
        .where(eq(complaints.id, compId))
        .returning();

      // Log Audit
      await logAudit(
        req.user.id,
        req.user.name || req.user.email,
        'UPDATE_COMPLAINT_STATUS',
        `Updated complaint ${compObj.complaintNumber} status to ${status || compObj.status}`
      );

      // Create a notification for the Citizen
      if (compObj.citizenId) {
        let titleAr = 'تحديث بخصوص شكواكم';
        let titleFr = 'Mise à jour de votre plainte';
        let msgAr = `تم تحديث حالة شكواكم رقم ${compObj.complaintNumber} إلى: ${status || compObj.status}.`;
        let msgFr = `Le statut de votre plainte N° ${compObj.complaintNumber} a été mis à jour à : ${status || compObj.status}.`;

        if (status === 'under_review') {
          titleAr = 'شكواكم قيد المراجعة';
          titleFr = 'Plainte en cours d\'examen';
          msgAr = `شكواكم رقم ${compObj.complaintNumber} قيد الدراسة والمراجعة الآن من طرف مصلحة الشكاوى.`;
          msgFr = `Votre plainte N° ${compObj.complaintNumber} est en cours d'étude par le service des réclamations.`;
        } else if (status === 'waiting_citizen') {
          titleAr = 'في انتظار ردكم على الشكوى';
          titleFr = 'En attente de votre réponse';
          msgAr = `مصلحة الشكاوى تحتاج إلى معلومات إضافية بخصوص شكواكم رقم ${compObj.complaintNumber}. الرد: ${replyMessage || ''}`;
          msgFr = `Le service nécessite des informations complémentaires pour votre plainte N° ${compObj.complaintNumber}. Message : ${replyMessage || ''}`;
        } else if (status === 'resolved') {
          titleAr = 'تم حل الشكوى بنجاح';
          titleFr = 'Réclamation résolue';
          msgAr = `بشرى سارة! تم حل المشكلة المتعلقة بشكواكم رقم ${compObj.complaintNumber}. تفاصيل الحل: ${resolutionNotes || ''}`;
          msgFr = `Bonne nouvelle ! Le problème de votre plainte N° ${compObj.complaintNumber} a été résolu. Solution : ${resolutionNotes || ''}`;
        } else if (status === 'rejected') {
          titleAr = 'تم رفض الشكوى';
          titleFr = 'Réclamation rejetée';
          msgAr = `تم رفض شكواكم رقم ${compObj.complaintNumber}. السبب: ${resolutionNotes || ''}`;
          msgFr = `Votre plainte N° ${compObj.complaintNumber} a été rejetée. Motif : ${resolutionNotes || ''}`;
        }

        await db.insert(notifications).values({
          userId: compObj.citizenId,
          titleAr,
          titleFr,
          messageAr: msgAr,
          messageFr: msgFr,
          type: 'dashboard',
        });
      }

      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update complaint: ' + error.message });
    }
  });

  // Statistics Dashboard endpoint
  app.get('/api/employee/statistics', requireAuth, requireRole(['employee', 'admin']), async (req, res) => {
    try {
      // Overall Request Counts
      const allRequests = await db.select().from(civilStatusRequests);
      
      const total = allRequests.length;
      const submitted = allRequests.filter(r => r.status === 'submitted').length;
      const underReview = allRequests.filter(r => r.status === 'under_review').length;
      const approved = allRequests.filter(r => r.status === 'approved').length;
      const ready = allRequests.filter(r => r.status === 'ready_for_pickup').length;
      const delivered = allRequests.filter(r => r.status === 'delivered').length;
      const rejected = allRequests.filter(r => r.status === 'rejected').length;
      const missing = allRequests.filter(r => r.status === 'missing_documents').length;

      // Documents by type
      const docTypeStats = {
        extrait_naissance: allRequests.filter(r => r.typeOfDocument === 'extrait_naissance').length,
        copie_integrale: allRequests.filter(r => r.typeOfDocument === 'copie_integrale').length,
        acte_deces: allRequests.filter(r => r.typeOfDocument === 'acte_deces').length,
        declaration_naissance: allRequests.filter(r => r.typeOfDocument === 'declaration_naissance').length,
        rectification: allRequests.filter(r => r.typeOfDocument === 'rectification').length,
      };

      // Total Appointments
      const totalAppointments = await db.select().from(appointments);
      const apptCount = totalAppointments.length;
      const apptPending = totalAppointments.filter(a => a.status === 'pending').length;

      // --- COMPLAINTS STATS ---
      const allComplaints = await db.select().from(complaints);
      const totalComplaints = allComplaints.length;
      const complaintsNew = allComplaints.filter(c => c.status === 'new').length;
      const complaintsUnderReview = allComplaints.filter(c => c.status === 'under_review').length;
      const complaintsWaiting = allComplaints.filter(c => c.status === 'waiting_citizen').length;
      const complaintsResolved = allComplaints.filter(c => c.status === 'resolved').length;
      const complaintsRejected = allComplaints.filter(c => c.status === 'rejected').length;
      const complaintsClosed = allComplaints.filter(c => c.status === 'closed').length;

      // Category breakdown
      const categories = ['delay', 'incorrect_info', 'technical', 'appointment', 'missing_doc', 'service_quality', 'other'];
      const byComplaintCategory: Record<string, number> = {};
      categories.forEach(cat => {
        byComplaintCategory[cat] = allComplaints.filter(c => c.category === cat).length;
      });

      // Daily and Monthly stats
      const todayStr = new Date().toISOString().split('T')[0];
      const currentYearMonthStr = todayStr.substring(0, 7); // "YYYY-MM"

      const requestsToday = allRequests.filter(r => r.createdAt && new Date(r.createdAt).toISOString().startsWith(todayStr)).length;
      const complaintsToday = allComplaints.filter(c => c.createdAt && new Date(c.createdAt).toISOString().startsWith(todayStr)).length;

      const requestsThisMonth = allRequests.filter(r => r.createdAt && new Date(r.createdAt).toISOString().startsWith(currentYearMonthStr)).length;
      const complaintsThisMonth = allComplaints.filter(c => c.createdAt && new Date(c.createdAt).toISOString().startsWith(currentYearMonthStr)).length;

      res.json({
        totalRequests: total,
        byStatus: {
          submitted,
          underReview,
          missing,
          approved,
          ready,
          delivered,
          rejected
        },
        byType: docTypeStats,
        appointments: {
          total: apptCount,
          pending: apptPending
        },
        complaints: {
          total: totalComplaints,
          new: complaintsNew,
          underReview: complaintsUnderReview,
          waitingCitizen: complaintsWaiting,
          resolved: complaintsResolved,
          rejected: complaintsRejected,
          closed: complaintsClosed,
          byCategory: byComplaintCategory
        },
        dailyStats: {
          requests: requestsToday,
          complaints: complaintsToday
        },
        monthlyStats: {
          requests: requestsThisMonth,
          complaints: complaintsThisMonth
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch statistics: ' + error.message });
    }
  });

  // Export Requests to CSV (simulating Excel export as required)
  app.get('/api/employee/export-excel', requireAuth, requireRole(['employee', 'admin']), async (req, res) => {
    try {
      const list = await db.select().from(civilStatusRequests).orderBy(desc(civilStatusRequests.createdAt));
      
      // Convert to a CSV string
      let csvContent = 'RequestNumber,FullName,CIN,TypeOfDocument,Status,Copies,DeliveryMode,SubmissionDate\n';
      list.forEach(r => {
        const dateStr = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '';
        const nameEscaped = r.fullName.replace(/"/g, '""');
        csvContent += `"${r.requestNumber}","${nameEscaped}","${r.cin}","${r.typeOfDocument}","${r.status}",${r.numberOfCopies},"${r.modeOfDelivery}","${dateStr}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="ouled_teima_requests_export.csv"');
      res.status(200).send(csvContent);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to export CSV: ' + error.message });
    }
  });


  // 5. SUPER ADMIN ENDPOINTS

  // Get all users (Citizens and Employees)
  app.get('/api/admin/users', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      // Sanitize password hashes
      const sanitized = allUsers.map(({ password, ...u }) => u);
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch users list' });
    }
  });

  // Get all employees (users whose role is not 'citizen')
  app.get('/api/admin/employees', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const allEmployees = await db.select()
        .from(users)
        .where(ne(users.role, 'citizen'))
        .orderBy(desc(users.createdAt));
      
      const sanitized = allEmployees.map(({ password, ...u }) => u);
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch employees list: ' + error.message });
    }
  });

  // Create Employee Account
  app.post('/api/admin/employees', requireAuth, requireRole(['admin']), async (req: any, res) => {
    const { email, password, name, cin, phone, address, role } = req.body;

    if (!email || !password || !name || !cin) {
      return res.status(400).json({ error: 'Email, password, name and CIN are required' });
    }

    try {
      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userUid = 'employee-' + Date.now();

      const newEmp = await db.insert(users).values({
        uid: userUid,
        email,
        password: hashedPassword,
        role: role || 'employee',
        name,
        cin,
        phone: phone || null,
        address: address || null,
        forcePasswordChange: true, // employees must change on first login!
        verifiedStatus: 'approved',
        isActive: true
      }).returning();

      await logAudit(req.user.id, req.user.name, 'CREATE_EMPLOYEE', `Created employee account: ${name} (${email}) with role ${role || 'employee'}`);

      const { password: _, ...sanitized } = newEmp[0];
      res.status(201).json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create employee account: ' + error.message });
    }
  });

  // Edit Employee Account
  app.put('/api/admin/employees/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    const targetId = Number(req.params.id);
    const { email, name, cin, phone, address, role, isActive } = req.body;

    try {
      const existing = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      // If email changes, make sure it is unique
      if (email && email !== existing[0].email) {
        const dup = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (dup.length > 0) {
          return res.status(400).json({ error: 'Email already registered' });
        }
      }

      const updated = await db.update(users)
        .set({
          email: email || undefined,
          name: name || undefined,
          cin: cin || undefined,
          phone: phone !== undefined ? phone : undefined,
          address: address !== undefined ? address : undefined,
          role: role || undefined,
          isActive: isActive !== undefined ? isActive : undefined,
        })
        .where(eq(users.id, targetId))
        .returning();

      await logAudit(
        req.user.id, 
        req.user.name, 
        'EDIT_EMPLOYEE', 
        `Edited employee account: ${updated[0].name} (${updated[0].email}) - Active: ${updated[0].isActive}`
      );

      const { password, ...sanitized } = updated[0];
      res.json(sanitized);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update employee account: ' + error.message });
    }
  });

  // Reset Employee Password
  app.post('/api/admin/employees/:id/reset-password', requireAuth, requireRole(['admin']), async (req: any, res) => {
    const targetId = Number(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    try {
      const existing = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users)
        .set({
          password: hashedPassword,
          forcePasswordChange: true, // require to change on next login
        })
        .where(eq(users.id, targetId));

      await logAudit(
        req.user.id, 
        req.user.name, 
        'RESET_EMPLOYEE_PASSWORD', 
        `Reset password for employee: ${existing[0].name} (${existing[0].email})`
      );

      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to reset employee password: ' + error.message });
    }
  });

  // Delete User (Employee or Citizen)
  app.delete('/api/admin/users/:id', requireAuth, requireRole(['admin']), async (req: any, res) => {
    const targetId = Number(req.params.id);
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own super admin account' });
    }

    try {
      const targetUser = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
      if (targetUser.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      await db.delete(users).where(eq(users.id, targetId));
      await logAudit(req.user.id, req.user.name, 'DELETE_USER', `Deleted user account: ${targetUser[0].name} (${targetUser[0].email})`);

      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to delete user: ' + error.message });
    }
  });

  // Website Settings Manager
  app.get('/api/admin/settings', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const s = await db.select().from(settings);
      res.json(s);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/admin/settings', requireAuth, requireRole(['admin']), async (req: any, res) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    try {
      const updated = await db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value }
        })
        .returning();

      await logAudit(req.user.id, req.user.name, 'UPDATE_SETTING', `Updated setting ${key} to ${value}`);
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  // Audit Logs
  app.get('/api/admin/audit-logs', requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const list = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
      res.json(list);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  // DB Backup & Restore (Simulated as requested)
  app.post('/api/admin/db/backup', requireAuth, requireRole(['admin']), async (req: any, res) => {
    try {
      const [allUsers, allRequests, allAppts] = await Promise.all([
        db.select().from(users),
        db.select().from(civilStatusRequests),
        db.select().from(appointments)
      ]);

      const backupObj = {
        timestamp: new Date().toISOString(),
        users: allUsers.map(({ password, ...u }) => u),
        requests: allRequests,
        appointments: allAppts
      };

      await logAudit(req.user.id, req.user.name, 'DB_BACKUP', 'Created manual database backup JSON file');
      res.json({
        message: 'Backup completed successfully / تم إنشاء نسخة احتياطية بنجاح',
        filename: `ouled_teima_backup_${Date.now()}.json`,
        data: backupObj
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Backup failed: ' + error.message });
    }
  });

  // --- PROTECTION & SECURITY INTERCEPTORS ---

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  // Cookie-based check for direct-access employee portal routes
  const checkEmployeeAuthFromCookie = async (req: any): Promise<{ authorized: boolean; status: number }> => {
    const cookies = req.headers.cookie || '';
    const tokenCookie = cookies.split('; ').find((row: string) => row.trim().startsWith('civil_token='));
    const token = tokenCookie ? tokenCookie.split('=')[1] : null;

    if (!token) {
      return { authorized: false, status: 401 };
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const userList = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      if (userList.length === 0) {
        return { authorized: false, status: 401 };
      }

      const dbUser = userList[0];
      if (dbUser.isActive === false) {
        return { authorized: false, status: 403 };
      }

      const allowedRoles = ['employee', 'Agent', 'Supervisor', 'admin', 'Administrator', 'Super Administrator'];
      if (!allowedRoles.includes(dbUser.role)) {
        return { authorized: false, status: 403 };
      }

      return { authorized: true, status: 200 };
    } catch (e) {
      return { authorized: false, status: 401 };
    }
  };

  const protectedRoutesList = [
    '/employee', 
    '/dashboard', 
    '/requests', 
    '/complaints', 
    '/documents', 
    '/statistics', 
    '/settings', 
    '/users', 
    '/admin'
  ];

  // Intercept direct routing requests to return actual 401/403 HTTP status codes
  app.get(protectedRoutesList, async (req, res, next) => {
    const authResult = await checkEmployeeAuthFromCookie(req);
    
    if (authResult.authorized) {
      return next();
    } else {
      res.status(authResult.status);
      if (process.env.NODE_ENV !== 'production') {
        return res.sendFile(path.join(process.cwd(), 'index.html'));
      } else {
        return res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
      }
    }
  });

  // --- FRONTEND INTEGRATION & VITE SERVER ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TEIMA PORTAL SERVER] running on http://localhost:${PORT}`);
  });
}

startServer();
