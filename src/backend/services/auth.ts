import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { prisma } from '../utils/db';

export const authService = {
  async register(data: any) {
    const { username, email, password } = data;

    if (!username || !email || !password) {
      throw new Error('Email, username and password required');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new Error('Email already exists');
    }

    if (existingUsername) {
      throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    return {
      message: 'User registered',
      user: { id: newUser.id, email: newUser.email },
    };
  },

  async login(data: any) {
    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    return {
      message: 'Login successful',
      user: { id: user.id, email: user.email },
      token,
    };
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't leak whether the email exists or not
      return { message: 'If an account with that email exists, we sent a password reset link.' };
    }

    const { randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiry,
      },
    });

    // In a real setup, we would use the NEXT_PUBLIC_BASE_URL env var, but for testing fallback to localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${email}`;
    
    const { sendPasswordResetEmail } = await import('../utils/mailer');
    await sendPasswordResetEmail(email, resetLink);

    return { message: 'If an account with that email exists, we sent a password reset link.' };
  },

  async resetPassword(data: any) {
    const { email, token, newPassword } = data;

    if (!email || !token || !newPassword) {
      throw new Error('Email, token, and new password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.resetToken || !user.resetTokenExpiry) {
      throw new Error('Invalid or expired reset token');
    }

    if (new Date() > user.resetTokenExpiry) {
      throw new Error('Reset token has expired');
    }

    const isValid = await bcrypt.compare(token, user.resetToken);
    if (!isValid) {
      throw new Error('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password has been successfully reset. You can now login.' };
  }
};