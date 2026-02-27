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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const temporaryPassword = generateSecurePassword(14);
    const initialHash = hashPasswordForMetadata(temporaryPassword);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: temporaryPassword,
      options: {
        data: {
          full_name: fullName,
          initial_password_hash: initialHash,
          password_initialized_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      const message =
        typeof error.message === 'string' && error.message.length > 0
          ? error.message
          : JSON.stringify(error);
      return { error: message };
    }

    const userId = data.user?.id;
    if (!userId && !error) {
      return { error: 'Unknown auth response from Supabase signUp' };
    }

    if (userId) {
      try {
        await emailService.sendWelcomeEmail({
          email,
          fullName,
          username: email,
          temporaryPassword,
        });
      } catch (e) {
        console.error('Failed to trigger welcome email.', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return { userId, temporaryPassword };
  } catch (e: any) {
    const message =
      e instanceof Error
        ? e.message
        : typeof e === 'string'
        ? e
        : JSON.stringify(e);
    return { error: message };
  }
}
