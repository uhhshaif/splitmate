// Client-side or Server-side helper for AI receipt scanning.
// It will POST to the local Next.js API route /api/scan-receipt

export interface ScannedReceiptResult {
  description: string;
  amount: number;
  category: string;
  date: string;
  success: boolean;
  message?: string;
  items?: { name: string; amount: number }[];
  taxPercent?: number;
  chargePercent?: number;
}

export async function scanReceiptWithAI(base64Image: string, fileName?: string): Promise<ScannedReceiptResult> {
  try {
    const response = await fetch('/api/expenses/scan-receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Image, name: fileName }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to scan receipt');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error scanning receipt:', error);
    return {
      description: '',
      amount: 0,
      category: 'general',
      date: new Date().toISOString().split('T')[0],
      items: [],
      success: false,
      message: error.message || 'Unknown error occurred during receipt scan',
    };
  }
}

export interface ParsedNLPResult {
  description: string;
  amount: number;
  paid_by_id: string;
  splits: { profile_id: string; amount: number }[];
  category: string;
  date: string;
  success: boolean;
  message?: string;
}

export async function parseNaturalLanguageWithAI(
  text: string,
  members: { id: string; display_name: string; email: string }[],
  currentUserId: string
): Promise<ParsedNLPResult> {
  try {
    const response = await fetch('/api/expenses/ai-parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        members,
        currentUserId,
        dateContext: new Date().toISOString().split('T')[0],
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to parse text');
    }

    // Map output fields back to client compatibility structures
    const data = await response.json();
    return {
      description: data.title || data.description || '',
      amount: data.amount || 0,
      paid_by_id: data.paid_by || currentUserId,
      splits: data.splits?.map((s: any) => ({
        profile_id: s.user_id,
        amount: s.amount_owed
      })) || [],
      category: data.category || 'general',
      date: data.date || new Date().toISOString().split('T')[0],
      success: data.success,
      message: data.message
    };
  } catch (error: any) {
    console.error('Error parsing NLP text:', error);
    return {
      description: '',
      amount: 0,
      paid_by_id: currentUserId,
      splits: [],
      category: 'general',
      date: new Date().toISOString().split('T')[0],
      success: false,
      message: error.message || 'Unknown error occurred during NLP parsing',
    };
  }
}


