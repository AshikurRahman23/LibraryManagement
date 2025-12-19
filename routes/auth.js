import express from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../models/userModel.js';

const router = express.Router();

/* ---------- Helper ---------- */
const isApiRequest = (req) => {
  return req.headers.accept?.includes('application/json') || req.originalUrl.startsWith('/api');
};

/* ---------- Signup ---------- */
router.get('/signup', (req, res) => {
  if (isApiRequest(req)) {
    return res.json({ message: 'Signup endpoint' });
  }
  res.render('auth/signup');
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, student_id, mobile_no } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      if (isApiRequest(req)) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/auth/signup');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser(
      name,
      email,
      hashedPassword,
      role,
      student_id,
      mobile_no
    );

    if (isApiRequest(req)) {
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          student_id: user.student_id,
          mobile_no: user.mobile_no
        }
      });
    }

    req.flash('success_msg', 'Account created! Please login.');
    res.redirect('/auth/login');

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});

/* ---------- Login ---------- */
router.get('/login', (req, res) => {
  if (isApiRequest(req)) {
    return res.json({ message: 'Login endpoint' });
  }
  res.render('auth/login');
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      if (isApiRequest(req)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/login');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      if (isApiRequest(req)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/login');
    }

    req.session.user = user;

    if (isApiRequest(req)) {
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          student_id: user.student_id
        }
      });
    }

    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }

    res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

/* ---------- Logout ---------- */
router.get('/logout', (req, res) => {
  req.session.destroy();

  if (isApiRequest(req)) {
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  res.redirect('/auth/login');
});

export default router;
