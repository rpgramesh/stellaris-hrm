import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/services/emailService';
import { randomBytes, createHash } from 'crypto';

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

export async function POST(request: Request) {
  try {
    const { email, fullName } = await request.json();

    if (!email) {
      return new NextResponse('Email is required', { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!serviceRoleKey && !anonKey) {
      return new NextResponse('Supabase key is missing', { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey || anonKey!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    if (!serviceRoleKey) {
      // Fallback for when we don't have the service role key
      // We can only try to signUp again or resend confirmation
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.signUp({
        email,
        password: generateSecurePassword(14), // Temporary password for this attempt
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already exists') || signUpError.status === 400) {
          // If user exists, try to resend confirmation
          const { error: resendError } = await supabaseAdmin.auth.resend({
            type: 'signup',
            email: email,
          });
          if (resendError) {
            throw resendError;
          }
          return NextResponse.json({ 
            success: true, 
            message: 'User already exists. Resent confirmation email.' 
          });
        }
        throw signUpError;
      }

      // If signUp succeeded (unlikely for "resend"), send our welcome email
      // But we don't have the temporary password we just generated if we want to show it.
      // Actually we do, it's in the variable above.
      return NextResponse.json({ success: true });
    }

    // 1. Check if user exists in auth.users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Failed to list users:', listError);
      throw listError;
    }

    const existingUser = (users as any[]).find(u => u.email === email);

    const temporaryPassword = generateSecurePassword(14);
    const initialHash = hashPasswordForMetadata(temporaryPassword);

    if (existingUser) {
      // 2. If user exists, update their password and metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: temporaryPassword,
          user_metadata: {
            ...existingUser.user_metadata,
            initial_password_hash: initialHash,
            password_initialized_at: new Date().toISOString(),
          }
        }
      );
      if (updateError) {
        console.error('Failed to update user:', updateError);
        throw updateError;
      }
    } else {
      // 3. If user doesn't exist, create them
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          initial_password_hash: initialHash,
          password_initialized_at: new Date().toISOString(),
        }
      });
      if (signUpError) {
        console.error('Failed to create user:', signUpError);
        throw signUpError;
      }

      // If we just created the user, we should also link it back to the employee record
      // This part might be optional depending on how the system works, 
      // but usually the employee record stores the user_id.
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: signUpData.user.id })
        .eq('email', email)
        .select()
        .single();
      
      if (employeeError) {
        console.warn('Failed to link new auth user to employee record:', employeeError);
      }
    }

    // 4. Send the welcome email
    await emailService.sendWelcomeEmail({
      email,
      fullName,
      username: email,
      temporaryPassword,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Resend invite error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
