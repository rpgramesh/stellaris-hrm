import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return new NextResponse('User ID and code are required', { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return new NextResponse('Configuration missing', { status: 500 });
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

    // Update user metadata via ADMIN API to persist the code reliably
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { temp_mfa_code: code } }
    );

    if (error) {
      console.error('Admin metadata update error:', error);
      return new NextResponse(error.message, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('MFA Metadata API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
