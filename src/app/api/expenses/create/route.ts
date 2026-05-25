import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      groupId,
      tripId,
      title,
      amount,
      date,
      paidBy,
      category,
      splits,
      splitType = 'equal',
      receiptUrl,
      createdBy
    } = body;

    if (!groupId || !title || !amount || !paidBy || !splits || splits.length === 0) {
      return NextResponse.json({ error: 'Missing required expense fields' }, { status: 400 });
    }

    // Mock Mode Fallback
    const isMock = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_project_url' || supabaseAnonKey === 'your_anon_key';
    if (isMock) {
      return NextResponse.json({
        id: `e-${Date.now()}`,
        success: true,
        message: 'Mock expense created successfully (Mock Mode).'
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

    // 1. Create the expense row
    const { data: newExpense, error: expErr } = await supabase
      .from('expenses')
      .insert([{
        group_id: groupId,
        trip_id: tripId || null,
        title,
        amount,
        date: date || new Date().toISOString().split('T')[0],
        paid_by: paidBy,
        category: category || 'general',
        split_type: splitType,
        receipt_url: receiptUrl || null,
        created_by: createdBy || paidBy
      }])
      .select()
      .single();

    if (expErr || !newExpense) {
      console.error('Error inserting expense:', expErr);
      throw new Error(expErr?.message || 'Failed to insert expense record');
    }

    // 2. Insert splits
    const splitInserts = splits.map((s: { userId: string; amountOwed: number }) => ({
      expense_id: newExpense.id,
      user_id: s.userId,
      amount_owed: s.amountOwed
    }));

    const { error: splitErr } = await supabase
      .from('expense_splits')
      .insert(splitInserts);

    if (splitErr) {
      console.error('Error inserting splits:', splitErr);
      // Rollback expense row if splits insertion fails (delete manual fallback since not a transaction block)
      await supabase.from('expenses').delete().eq('id', newExpense.id);
      throw new Error(splitErr.message || 'Failed to insert splits');
    }

    return NextResponse.json({
      id: newExpense.id,
      success: true
    });

  } catch (error: any) {
    console.error('API /api/expenses/create error:', error);
    return NextResponse.json({ error: error.message || 'Server error creating expense' }, { status: 500 });
  }
}

