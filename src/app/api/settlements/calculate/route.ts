import { NextResponse } from 'next/server';
import { simplifyDebts } from '@/lib/debt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { balances } = body;

    if (!balances) {
      return NextResponse.json({ error: 'Missing balances for debt calculation' }, { status: 400 });
    }

    const transactions = simplifyDebts(balances);

    return NextResponse.json({
      transactions,
      success: true
    });
  } catch (error: any) {
    console.error('API /api/settlements/calculate error:', error);
    return NextResponse.json({ error: error.message || 'Server error calculating debts' }, { status: 500 });
  }
}

