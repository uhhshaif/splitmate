import { NextResponse } from 'next/server';

interface Member {
  id: string;
  display_name: string;
  email: string;
}

export async function POST(request: Request) {
  try {
    const { text, members, currentUserId, dateContext } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = geminiApiKey || anthropicApiKey;

    // LOCAL HEURISTIC FALLBACK (For offline/mock mode)
    if (!apiKey || apiKey.startsWith('your_')) {
      console.log('No ANTHROPIC_API_KEY configured. Running local heuristic parser.');
      
      const lowerText = text.toLowerCase();
      const today = dateContext || new Date().toISOString().split('T')[0];
      
      // Default initial states
      let amount = 0.0;
      let description = 'Expense';
      let paidById = currentUserId;
      let category = 'general';
      let splitWithIds: string[] = members.map((m: Member) => m.id);
      
      // 1. Try to extract RM amount
      const rmRegex = /(?:rm|rm\s*|ringgit\s*)(\d+(?:\.\d+)?)/i;
      const amountRegex = /(\d+(?:\.\d+)?)\s*(?:rm|ringgit)/i;
      
      let amountMatch = lowerText.match(rmRegex) || lowerText.match(amountRegex);
      if (amountMatch) {
        amount = parseFloat(amountMatch[1]);
      } else {
        // Look for any number
        const numberRegex = /\b(\d+(?:\.\d+)?)\b/;
        const numberMatch = lowerText.match(numberRegex);
        if (numberMatch) amount = parseFloat(numberMatch[1]);
      }

      // 2. Extract description (words after "for", "buying", "at")
      const forRegex = /\b(?:for|buying|at|on)\s+([^,.\n]+)/i;
      const forMatch = text.match(forRegex);
      if (forMatch) {
        description = forMatch[1].trim();
      } else {
        // Try words before "paid"
        const paidWords = text.split(/\bpaid\b/i);
        if (paidWords.length > 1 && paidWords[1].trim()) {
          // Default to what's after paid minus numbers/RM
          description = paidWords[1].replace(rmRegex, '').replace(/\d+/g, '').replace(/\bfor\b/i, '').trim();
        }
      }

      // Clean up description
      description = description
        .replace(/\b(?:me|and|split|equally|everyone|all|shared)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!description) description = 'Shared Expense';

      // Capitalize first letter
      description = description.charAt(0).toUpperCase() + description.slice(1);

      // 3. Match who paid
      // Find names in the text
      let payerFound = false;
      for (const member of members) {
        const nameParts = member.display_name.toLowerCase().split(' ');
        for (const part of nameParts) {
          if (part.length > 2 && lowerText.startsWith(part)) {
            paidById = member.id;
            payerFound = true;
            break;
          }
        }
        if (payerFound) break;
      }

      // Check if text says "I paid" or "me paid" or "my payment"
      if (!payerFound && (lowerText.includes('i paid') || lowerText.includes('me paid') || lowerText.startsWith('i ') || lowerText.startsWith('me '))) {
        paidById = currentUserId;
      }

      // 4. Match split participants
      // If text mentions specific names to split with
      const mentionedMembers: string[] = [];
      members.forEach((m: Member) => {
        const displayNameLower = m.display_name.toLowerCase();
        // Check if full display name or first name is in the text
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

      // 5. Category mapping heuristics
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

      // Calculate splits equally
      const share = amount / splitWithIds.length;
      const splits = splitWithIds.map(id => ({
        profile_id: id,
        amount: Math.round(share * 100) / 100
      }));

      // Adjust rounding for the last one
      if (splits.length > 0) {
        const sum = splits.reduce((acc, s) => acc + s.amount, 0);
        const diff = amount - sum;
        if (Math.abs(diff) > 0.01) {
          splits[splits.length - 1].amount = Math.round((splits[splits.length - 1].amount + diff) * 100) / 100;
        }
      }

      // Simulate a small delay for premium UX
      await new Promise((resolve) => setTimeout(resolve, 800));

      return NextResponse.json({
        description,
        amount,
        paid_by_id: paidById,
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
1. "description": A concise merchant or expense name (e.g. "Dinner at Mamak", "Grab ride").
2. "amount": The total amount of the transaction as a floating-point number. Treat Malaysian Ringgit (RM) as the primary currency (e.g. RM45 = 45.00).
3. "paid_by_id": The ID of the member who paid. Look at the group members list and match the name. 
   - Words like "I", "me", "myself" refer to the Current User (ID: ${currentUserId}).
   - If the name is mentioned, find the closest matching member display name.
4. "splits": An array of objects: { "profile_id": string, "amount": float } representing who is split into the expense.
   - If the text specifies who participated (e.g. "me and Reza", "except Jessica"), split only among them.
   - If not specified or says "everyone", "split equally", split among ALL members of the group.
   - Calculate equal division of the total amount. Ensure the sum of splits equals the total amount.
5. "category": Must be one of: "food", "housing", "transport", "entertainment", "utilities", "lodging", "general".
6. "date": Extract the date if mentioned, otherwise default to today's date (${dateContext || new Date().toISOString().split('T')[0]}).

Group members available to match:
${groupMemberProfiles}

Current User ID: ${currentUserId}

Return ONLY a raw JSON object. Do not include markdown wraps like \`\`\`json.
Example output format:
{
  "description": "Nasi Lemak Dinner",
  "amount": 45.0,
  "paid_by_id": "u1",
  "splits": [
    { "profile_id": "u1", "amount": 15.0 },
    { "profile_id": "u2", "amount": 15.0 },
    { "profile_id": "u3", "amount": 15.0 }
  ],
  "category": "food",
  "date": "2026-05-23"
}`;

    let textContent = '';

    if (geminiApiKey && !geminiApiKey.startsWith('your_')) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
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
          description: parsed.description || 'Shared Expense',
          amount: parseFloat(parsed.amount) || 0.0,
          paid_by_id: parsed.paid_by_id || currentUserId,
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
    console.error('API /api/parse-nlp error:', error);
    return NextResponse.json({ error: error.message || 'Server error parsing NLP text' }, { status: 500 });
  }
}

