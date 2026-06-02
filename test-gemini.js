import fetch from 'node-fetch';

async function testGemini() {
  const geminiApiKey = 'AIzaSyC52A0hDz29CIqkZvrpvg29hptBilQ3s4o';
  const systemPrompt = `You are a precise Natural Language processing assistant for an expense splitting app called Splitmate.
Your task is to parse a text message describing an expense in a group of Malaysian students and extract:
1. "title": A concise merchant or expense name (e.g. "Dinner at Mamak", "Grab ride").
2. "amount": The total amount of the transaction as a floating-point number. Treat Malaysian Ringgit (RM) as the primary currency (e.g. RM45 = 45.00).
   - If a tax, service charge, or tip is mentioned (e.g. "there was a 10 percent service tax"), assume it is ALREADY INCLUDED in the total amount mentioned, UNLESS the user explicitly says to "add" or "plus" it (e.g. "plus 10% tax", "add 3% tip").
3. "paid_by": The ID of the member who paid. Look at the group members list and match the name. 
   - Words like "I", "me", "myself" refer to the Current User (ID: u1).
   - If the name is mentioned, find the closest matching member display name.
4. "splits": An array of objects: { "user_id": string, "amount_owed": float } representing who is split into the expense.
   - If the text specifies who participated, split only among them.
   - If individual items or meals are specified (e.g., "i spent rm 28 and shaif spent the rest"), calculate each person's base share first. 
   - IMPORTANT TAX RULE: If a tax/service charge is mentioned (e.g. "10 percent service tax") and is ALREADY INCLUDED in the total amount, you must STILL apply that tax percentage to each person's individual base share to get their final "amount_owed". For example, if total is 55, your meal is 28, and tax is 10%, your final share is 28 * 1.10 = 30.80. Ensure the sum of all final splits equals the total amount.
5. "category": Must be one of: "food", "housing", "transport", "entertainment", "utilities", "lodging", "general".
6. "date": Extract the date if mentioned, otherwise default to today's date (2026-06-01).

Group members available to match:
Test Account (ID: u1), Shaif Ahmad (ID: u2)

Current User ID: u1

Return ONLY a raw JSON object. Do not include markdown wraps like \`\`\`json.`;

  const text = "i spend RM 55 on dinner for both of us I spent rm 28 and shaif spent the rest there was a 10 percent service tax";

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`, {
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

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

testGemini();
