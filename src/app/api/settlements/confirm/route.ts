import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { settlementId, action } = body;

    if (!settlementId || !action) {
      return NextResponse.json({ error: 'Missing settlementId or action' }, { status: 400 });
    }

    const isMock = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_project_url' || supabaseAnonKey === 'your_anon_key';
    if (isMock) {
      return NextResponse.json({ success: true, message: 'Mock action completed (Mock Mode).' });
    }

    // Use service role key to bypass RLS entirely for server-side operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

    if (action === 'confirm') {
      const { data: settlement, error: fetchErr } = await supabase
        .from('settlements')
        .select('*')
        .eq('id', settlementId)
        .single();

      if (fetchErr || !settlement) {
        console.error('Error fetching settlement:', fetchErr);
        return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
      }

      const { error: updateErr } = await supabase
        .from('settlements')
        .update({ settled: true })
        .eq('id', settlementId);

      if (updateErr) {
        console.error('Error updating settlement:', updateErr);
        throw new Error('Failed to update settlement status');
      }

      const { data: fromUser } = await supabase.from('users').select('name').eq('id', settlement.from_user).single();
      const { data: toUser } = await supabase.from('users').select('name').eq('id', settlement.to_user).single();
      const fromName = fromUser?.name || 'Someone';
      const toName = toUser?.name || 'Someone';

      const { data: newExpense, error: expErr } = await supabase
        .from('expenses')
        .insert([{
          title: `Settlement: ${fromName} paid ${toName}`,
          amount: parseFloat(settlement.amount),
          paid_by: settlement.from_user,
          group_id: settlement.group_id,
          split_type: 'settlement',
          category: 'settlement',
          date: new Date().toISOString().split('T')[0],
          created_by: settlement.to_user
        }])
        .select()
        .single();

      if (expErr || !newExpense) {
        console.error('Error creating visual expense:', expErr);
        throw new Error('Failed to create visual expense for settlement');
      }

      const { error: splitErr } = await supabase
        .from('expense_splits')
        .insert([{
          expense_id: newExpense.id,
          user_id: settlement.to_user,
          amount_owed: parseFloat(settlement.amount)
        }]);

      if (splitErr) {
        console.error('Error creating splits:', splitErr);
        throw new Error('Failed to create split for settlement');
      }

      return NextResponse.json({ success: true, message: 'Settlement confirmed and expense logged successfully.' });

    } else if (action === 'reject') {
      const { error: delErr } = await supabase
        .from('settlements')
        .delete()
        .eq('id', settlementId);

      if (delErr) {
        console.error('Error deleting settlement:', delErr);
        throw new Error('Failed to decline settlement');
      }

      return NextResponse.json({ success: true, message: 'Settlement declined successfully.' });
    } else {
      return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('API /api/settlements/confirm error:', error);
    return NextResponse.json({ error: error.message || 'Server error confirming settlement' }, { status: 500 });
  }
}
