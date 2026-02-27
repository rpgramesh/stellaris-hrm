import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/services/emailService';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return new NextResponse('Email is required', { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      // If no admin key, we have to fallback to standard Supabase reset
      // which sends its own email.
      return new NextResponse('Admin key missing. Use standard reset.', { status: 501 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Check if user exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      // Don't reveal that user doesn't exist for security
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // 2. Generate reset link
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${new URL(request.url).origin}/reset-password`,
      }
    });

    if (linkError) throw linkError;

    // 3. Get employee name
    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('first_name, last_name')
      .eq('email', email)
      .maybeSingle();

    const fullName = employee ? `${employee.first_name} ${employee.last_name}`.trim() : email;
    const resetLink = data.properties.action_link;

    // 4. Send templated email
    await emailService.sendPasswordResetEmail(email, fullName, resetLink);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
