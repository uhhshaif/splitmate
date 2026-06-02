import { NextResponse } from 'next/server';

interface Member {
  id: string;
  display_name: string;
  email: string;
}

export async function POST(request: Request) {
  let text = '';
  let members: Member[] = [];
  let currentUserId = '';
  let dateContext = '';

  try {
    const body = await request.json();
    text = body.text;
    members = body.members || [];
    currentUserId = body.currentUserId;
    dateContext = body.dateContext;

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiApiKey2 = process.env.GEMINI_API_KEY_2;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = geminiApiKey || anthropicApiKey || geminiApiKey2;

    // LOCAL HEURISTIC FALLBACK (For offline/mock mode)
    if (!apiKey || apiKey.startsWith('your_')) {
      console.log('No ANTHROPIC_API_KEY configured. Running local heuristic parser.');
      
      const lowerText = text.toLowerCase();
      const today = dateContext || new Date().toISOString().split('T')[0];
      
      let amount = 0.0;
      let title = 'Expense';
      let paidBy = currentUserId;
      let category = 'general';
      let splitWithIds: string[] = members.map((m: Member) => m.id);
      
      const rmRegex = /(?:rm|rm\s*|ringgit\s*)(\d+(?:\.\d+)?)/i;
      const amountRegex = /(\d+(?:\.\d+)?)\s*(?:rm|ringgit)/i;
      
      let amountMatch = lowerText.match(rmRegex) || lowerText.match(amountRegex);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1]);
      } else {
        const numberRegex = /\b(\d+(?:\.\d+)?)\b/;
        const numberMatch = lowerText.match(numberRegex);
        if (numberMatch) amount = parseFloat(numberMatch[1]);
      }

      const forRegex = /\b(?:for|buying|at|on)\s+([^,.\n]+)/i;
      const forMatch = text.match(forRegex);
      if (forMatch) {
        title = forMatch[1].trim();
      } else {
        const paidWords = text.split(/\bpaid\b/i);
        if (paidWords.length > 1 && paidWords[1].trim()) {
          title = paidWords[1].replace(rmRegex, '').replace(/\d+/g, '').replace(/\bfor\b/i, '').trim();
        }
      }

      title = title
        .replace(/\b(?:me|and|split|equally|everyone|all|shared)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!title) title = 'Shared Expense';

      title = title.charAt(0).toUpperCase() + title.slice(1);

      let payerFound = false;
      for (const member of members) {
        const nameParts = member.display_name.toLowerCase().split(' ');
        for (const part of nameParts) {
          if (part.length > 2 && lowerText.startsWith(part)) {
            paidBy = member.id;
            payerFound = true;
            break;
          }
        }
        if (payerFound) break;
      }

      if (!payerFound && (lowerText.includes('i paid') || lowerText.includes('me paid') || lowerText.startsWith('i ') || lowerText.startsWith('me '))) {
        paidBy = currentUserId;
      }

      const mentionedMembers: string[] = [];
      members.forEach((m: Member) => {
        const displayNameLower = m.display_name.toLowerCase();
        const firstName = displayNameLower.split(' ')[0];
        if (lowerText.includes(displayNameLower) || (firstName.length > 2 && lowerText.includes(firstName))) {
          mentionedMembers.push(m.id);
        }
      });

      if (lowerText.includes('me') || lowerText.includes(' i ') || lowerText.includes('myself')) {
        if (!mentionedMembers.includes(currentUserId)) {
          mentionedMembers.push(currentUserId);
        }
      }

      if (mentionedMembers.length > 0) {
        splitWithIds = Array.from(new Set(mentionedMembers));
      }

      if (lowerText.includes('dinner') || lowerText.includes('lunch') || lowerText.includes('food') || lowerText.includes('makan') || lowerText.includes('drink') || lowerText.includes('starbucks') || lowerText.includes('mcd') || lowerText.includes('kfc')) {
        category = 'food';
      } else if (lowerText.includes('taxi') || lowerText.includes('grab') || lowerText.includes('fuel') || lowerText.includes('petrol') || lowerText.includes('bus') || lowerText.includes('train')) {
        category = 'transport';
      } else if (lowerText.includes('rent') || lowerText.includes('room') || lowerText.includes('deposit')) {
        category = 'housing';
      } else if (lowerText.includes('bill') || lowerText.includes('water') || lowerText.includes('electric') || lowerText.includes('wifi') || lowerText.includes('internet')) {
        category = 'utilities';
      } else if (lowerText.includes('hotel') || lowerText.includes('stay') || lowerText.includes('airbnb') || lowerText.includes('hostel')) {
        category = 'lodging';
      } else if (lowerText.includes('movie') || lowerText.includes('cinema') || lowerText.includes('concert') || lowerText.includes('karaoke')) {
        category = 'entertainment';
      }

      const share = amount / splitWithIds.length;
      const splits = splitWithIds.map(id => ({
        user_id: id,
        amount_owed: Math.round(share * 100) / 100
      }));

      if (splits.length > 0) {
        const sum = splits.reduce((acc, s) => acc + s.amount_owed, 0);
        const diff = amount - sum;
        if (Math.abs(diff) > 0.01) {
          splits[splits.length - 1].amount_owed = Math.round((splits[splits.length - 1].amount_owed + diff) * 100) / 100;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 800));

      return NextResponse.json({
        title,
        amount,
        paid_by: paidBy,
        splits,
        category,
        date: today,
        success: true,
        message: 'Locally parsed description (Offline/Mock Mode).'
      });
    }

    // CLAUDE AI LLM PARSING
    const groupMemberProfiles = members.map((m: Member) => `${m.display_name} (ID: ${m.id})`).join(', ');

    const systemPrompt = `You are a precise Natural Language processing assistant for an expense splitting app called Splitmate.
Your task is to parse a text message describing an expense in a group of Malaysian students and extract:
1. "title": A concise merchant or expense name (e.g. "Dinner at Mamak", "Grab ride").
2. "amount": The total amount of the transaction as a floating-point number. Treat Malaysian Ringgit (RM) as the primary currency (e.g. RM45 = 45.00).
   - If a tax, service charge, or tip is mentioned (e.g. "there was a 10 percent service tax"), assume it is ALREADY INCLUDED in the total amount mentioned, UNLESS the user explicitly says to "add" or "plus" it (e.g. "plus 10% tax", "add 3% tip").
   - If the tax is included in the total, calculate the individual shares so that they sum up EXACTLY to the total amount provided. Do not arbitrarily increase the total amount unless explicitly told to "add" the tax on top.
3. "paid_by": The ID of the member who paid. Look at the group members list and match the name. 
   - Words like "I", "me", "myself" refer to the Current User (ID: ${currentUserId}).
   - If the name is mentioned, find the closest matching member display name.
4. "splits": An array of objects: { "user_id": string, "amount_owed": float } representing who is split into the expense.
   - If the text specifies who participated, split only among them.
   - If individual items or meals are specified (e.g., "i spent rm 28 and shaif spent the rest"), calculate each person's base share first. 
   - IMPORTANT TAX RULE: If a tax/service charge is mentioned (e.g. "10 percent service tax") and is ALREADY INCLUDED in the total amount, you must STILL apply that tax percentage to each person's individual base share to get their final "amount_owed". For example, if total is 55, your meal is 28, and tax is 10%, your final share is 28 * 1.10 = 30.80. Ensure the sum of all final splits equals the total amount.
5. "category": Must be one of: "food", "housing", "transport", "entertainment", "utilities", "lodging", "general".
6. "date": Extract the date if mentioned, otherwise default to today's date (${dateContext || new Date().toISOString().split('T')[0]}).

Group members available to match:
${groupMemberProfiles}

Current User ID: ${currentUserId}

Return ONLY a raw JSON object. Do not include markdown wraps like \`\`\`json.
Example output format:
{
  "title": "Nasi Lemak Dinner",
  "amount": 45.0,
  "paid_by": "u1",
  "splits": [
    { "user_id": "u1", "amount_owed": 15.0 },
    { "user_id": "u2", "amount_owed": 15.0 },
    { "user_id": "u3", "amount_owed": 15.0 }
  ],
  "category": "food",
  "date": "2026-05-23"
}`;

    let textContent = '';

    if (geminiApiKey && !geminiApiKey.startsWith('your_')) {
      let response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `Parse this phrase: "${text}"` }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });
      } catch (err) {
        console.warn('Gemini 2.5-flash fetch failed, attempting fallback...', err);
      }

      // Fallback to second API key if the primary request failed or returned an error status (like 503)
      if ((!response || !response.ok) && geminiApiKey2 && !geminiApiKey2.startsWith('your_')) {
        console.warn('Primary Gemini key unavailable or returned error. Retrying with GEMINI_API_KEY_2...');
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey2}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: systemPrompt },
                  { text: `Parse this phrase: "${text}"` }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API Error Response:', errorText);
        throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey || '',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Parse this phrase: "${text}"`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned status ${response.status}`);
      }

      const data = await response.json();
      textContent = data.content?.[0]?.text || '';
    }

    try {
      const jsonStart = textContent.indexOf('{');
      const jsonEnd = textContent.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsed = JSON.parse(textContent.slice(jsonStart, jsonEnd));
        return NextResponse.json({
          title: parsed.title || 'Shared Expense',
          amount: parseFloat(parsed.amount) || 0.0,
          paid_by: parsed.paid_by || currentUserId,
          splits: parsed.splits || [],
          category: parsed.category || 'general',
          date: parsed.date || new Date().toISOString().split('T')[0],
          success: true
        });
      } else {
        throw new Error('Claude response did not contain JSON');
      }
    } catch (parseErr) {
      console.error('Failed parsing Claude NLP response:', textContent, parseErr);
      throw new Error('Failed to extract structured data from NLP model');
    }

  } catch (error: any) {
    console.warn('[Fallback] Gemini/Claude API failed or returned error. Running local heuristic parser fallback. Error details:', error.message);
    
    try {
      const lowerText = text.toLowerCase();
      const today = dateContext || new Date().toISOString().split('T')[0];
      
      let amount = 0.0;
      let title = 'Expense';
      let paidBy = currentUserId;
      let category = 'general';
      let splitWithIds: string[] = members.map((m: Member) => m.id);
      
      const rmRegex = /(?:rm|rm\s*|ringgit\s*)(\d+(?:\.\d+)?)/i;
      const amountRegex = /(\d+(?:\.\d+)?)\s*(?:rm|ringgit)/i;
      
      let amountMatch = lowerText.match(rmRegex) || lowerText.match(amountRegex);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1]);
      } else {
        const numberRegex = /\b(\d+(?:\.\d+)?)\b/;
        const numberMatch = lowerText.match(numberRegex);
        if (numberMatch) amount = parseFloat(numberMatch[1]);
      }

      const forRegex = /\b(?:for|buying|at|on)\s+([^,.\n]+)/i;
      const forMatch = text.match(forRegex);
      if (forMatch) {
        title = forMatch[1].trim();
      } else {
        const paidWords = text.split(/\bpaid\b/i);
        if (paidWords.length > 1 && paidWords[1].trim()) {
          title = paidWords[1].replace(rmRegex, '').replace(/\d+/g, '').replace(/\bfor\b/i, '').trim();
        }
      }

      title = title
        .replace(/\b(?:me|and|split|equally|everyone|all|shared)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!title) title = 'Shared Expense';
      title = title.charAt(0).toUpperCase() + title.slice(1);

      let payerFound = false;
      for (const member of members) {
        const nameParts = member.display_name.toLowerCase().split(' ');
        for (const part of nameParts) {
          if (part.length > 2 && lowerText.startsWith(part)) {
            paidBy = member.id;
            payerFound = true;
            break;
          }
        }
        if (payerFound) break;
      }

      if (!payerFound && (lowerText.includes('i paid') || lowerText.includes('me paid') || lowerText.startsWith('i ') || lowerText.startsWith('me '))) {
        paidBy = currentUserId;
      }

      const mentionedMembers: string[] = [];
      members.forEach((m: Member) => {
        const displayNameLower = m.display_name.toLowerCase();
        const firstName = displayNameLower.split(' ')[0];
        if (lowerText.includes(displayNameLower) || (firstName.length > 2 && lowerText.includes(firstName))) {
          mentionedMembers.push(m.id);
        }
      });

      if (lowerText.includes('me') || lowerText.includes(' i ') || lowerText.includes('myself')) {
        if (!mentionedMembers.includes(currentUserId)) {
          mentionedMembers.push(currentUserId);
        }
      }

      if (mentionedMembers.length > 0) {
        splitWithIds = Array.from(new Set(mentionedMembers));
      }

      if (lowerText.includes('dinner') || lowerText.includes('lunch') || lowerText.includes('food') || lowerText.includes('makan') || lowerText.includes('drink') || lowerText.includes('starbucks') || lowerText.includes('mcd') || lowerText.includes('kfc')) {
        category = 'food';
      } else if (lowerText.includes('taxi') || lowerText.includes('grab') || lowerText.includes('fuel') || lowerText.includes('petrol') || lowerText.includes('bus') || lowerText.includes('train')) {
        category = 'transport';
      } else if (lowerText.includes('rent') || lowerText.includes('room') || lowerText.includes('deposit')) {
        category = 'housing';
      } else if (lowerText.includes('bill') || lowerText.includes('water') || lowerText.includes('electric') || lowerText.includes('wifi') || lowerText.includes('internet')) {
        category = 'utilities';
      } else if (lowerText.includes('hotel') || lowerText.includes('stay') || lowerText.includes('airbnb') || lowerText.includes('hostel')) {
        category = 'lodging';
      } else if (lowerText.includes('movie') || lowerText.includes('cinema') || lowerText.includes('concert') || lowerText.includes('karaoke')) {
        category = 'entertainment';
      }

      const share = amount / splitWithIds.length;
      const splits = splitWithIds.map(id => ({
        user_id: id,
        amount_owed: Math.round(share * 100) / 100
      }));

      if (splits.length > 0) {
        const sum = splits.reduce((acc, s) => acc + s.amount_owed, 0);
        const diff = amount - sum;
        if (Math.abs(diff) > 0.01) {
          splits[splits.length - 1].amount_owed = Math.round((splits[splits.length - 1].amount_owed + diff) * 100) / 100;
        }
      }

      return NextResponse.json({
        title,
        amount,
        paid_by: paidBy,
        splits,
        category,
        date: today,
        success: true,
        message: 'Locally parsed description (API Fallback).'
      });
    } catch (fallbackErr: any) {
      return NextResponse.json({ error: 'Server error parsing NLP text' }, { status: 500 });
    }
  }
}

