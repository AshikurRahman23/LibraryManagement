import express from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../models/userModel.js';

const router = express.Router();

/* ---------- Signup ---------- */
router.get('/signup', (req, res) => {
  res.render('auth/signup');
});

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, student_id, mobile_no } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/auth/signup');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await createUser(
      name,
      email,
      hashedPassword,
      role,
      student_id,
      mobile_no
    );

    req.flash('success_msg', 'Account created! Please login.');
    res.redirect('/auth/login');

  } catch (err) {
    console.error('Signup error:', err);
    req.flash('error_msg', 'Signup failed');
    res.redirect('/auth/signup');
  }
});

/* ---------- Login ---------- */
router.get('/login', (req, res) => {
  res.render('auth/login');
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/login');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/login');
    }

    req.session.user = user;

    if (user.role === 'admin') {
      return res.redirect('/admin/dashboard');
    }

    res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    req.flash('error_msg', 'Login failed');
    res.redirect('/auth/login');
  }
});

/* ---------- Logout ---------- */
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/login');
});

export default router;
