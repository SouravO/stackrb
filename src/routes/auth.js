import { Router } from 'express';
import { supabase, supabaseAdmin } from '../supabase.js';
import { otpStore } from '../otpStore.js';
import { sendOtpEmail } from '../email.js';
import crypto from 'crypto';

const router = Router();

router.post('/signup', async (req, res, next) => {
  try {
    const { email, name, phone } = req.body;

    if (!email || !name || !phone) {
      return res.status(400).json({ error: 'Email, name and phone are required' });
    }

    const otp = otpStore.set(email, { name, phone });

    await sendOtpEmail({ to: email, otp, name });

    res.status(201).json({ message: 'OTP sent to email' });
  } catch (err) {
    next(err);
  }
});

router.post('/verify', async (req, res, next) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email and token are required' });
    }

    const entry = otpStore.get(email);
    if (!entry) {
      return res.status(400).json({ error: 'OTP expired or not found. Request a new one.' });
    }

    if (entry.otp !== token) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    otpStore.remove(email);

    const tempPassword = crypto.randomBytes(16).toString('hex');

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: entry.name, phone: entry.phone },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: data.user.id,
      email,
      name: entry.name,
      phone: entry.phone,
      role: 'NORMAL_USER',
    });

    if (insertError) {
      console.error('Failed to insert user profile:', insertError);
    }

    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: tempPassword,
    });

    if (signInError) {
      return res.status(500).json({ error: 'Account created but could not sign in' });
    }

    res.status(201).json({
      message: 'Account created successfully',
      session: sessionData.session,
      user: sessionData.user,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/resend', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existing = otpStore.get(email);
    if (!existing) {
      return res.status(400).json({ error: 'No OTP request found. Please sign up first.' });
    }

    const otp = otpStore.set(email, {
      name: existing.name,
      phone: existing.phone,
    });

    await sendOtpEmail({ to: email, otp, name: existing.name });

    res.json({ message: 'OTP resent to email' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.json({ user: { id: user.id, email: user.email, role: 'NORMAL_USER' } });
    }

    res.json({ user: profile });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Login successful',
      session: data.session,
      user: data.user,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
