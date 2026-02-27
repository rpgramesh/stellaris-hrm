'use server'

import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
import { emailService } from '@/services/emailService';

const generateSecurePassword = (length: number = 14): string => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*()-_=+[]{}<>?';
  const all = upper + lower + digits + specials;

  const pick = (chars: string): string => {
    const byte = randomBytes(1)[0];
    return chars[byte % chars.length];
  };

  const passwordChars: string[] = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(specials),
  ];

  for (let i = 0; i < length - 4; i++) {
    passwordChars.push(pick(all));
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const byte = randomBytes(1)[0];
    const j = byte % (i + 1);
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
};

const hashPasswordForMetadata = (password: string): string => {
  return createHash('sha256').update(password).digest('hex');
};

export async function createUser(email: string, fullName: string) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return { error: 'Admin configuration missing (SUPABASE_SERVICE_ROLE_KEY)' };
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const temporaryPassword = generateSecurePassword(14);
    const initialHash = hashPasswordForMetadata(temporaryPassword);

    // Using admin API to create user directly and confirm email
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        initial_password_hash: initialHash,
        password_initialized_at: new Date().toISOString(),
      },
    });

    if (error) {
      return { error: error.message };
    }

    const userId = data.user?.id;
    if (userId) {
      try {
        await emailService.sendWelcomeEmail({
          email,
          fullName,
          username: email,
          temporaryPassword,
        });
      } catch (e) {
        console.error('Failed to trigger welcome email:', e);
      }
    }

    return { userId, temporaryPassword };
  } catch (e: any) {
    return { error: e.message || 'An unexpected error occurred' };
  }
}
