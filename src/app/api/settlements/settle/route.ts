import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groupId, fromUser, toUser, amount, settled = true } = body;

    if (!groupId || !fromUser || !toUser || !amount) {
      return NextResponse.json({ error: 'Missing required settlement fields' }, { status: 400 });
    }

    const isMock = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_project_url' || supabaseAnonKey === 'your_anon_key';
    if (isMock) {
      return NextResponse.json({
        success: true,
        message: 'Mock settlement logged successfully (Mock Mode).'
      });
    }

    const authHeader = request.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Insert record in settlements table
    const { data: newSettlement, error: setErr } = await supabase
      .from('settlements')
      .insert([{
        group_id: groupId,
        from_user: fromUser,
        to_user: toUser,
        amount,
        settled,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (setErr) {
      console.error('Error logging settlement in DB:', setErr);
      throw new Error(setErr.message || 'Failed to insert settlement record');
    }

    return NextResponse.json({
      settlement: newSettlement,
      success: true
    });

  } catch (error: any) {
    console.error('API /api/settlements/settle error:', error);
    return NextResponse.json({ error: error.message || 'Server error recording settlement' }, { status: 500 });
  }
}

