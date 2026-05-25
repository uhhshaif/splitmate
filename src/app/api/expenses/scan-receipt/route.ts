import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { image, name } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = geminiApiKey || anthropicApiKey;

    // Fallback: If no API key, simulate scanning and return mock data
    if (!apiKey || apiKey.startsWith('your_')) {
      console.log('No ANTHROPIC_API_KEY configured. Returning mock receipt scan data.');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const lowerName = (name || '').toLowerCase();
      let title = 'Le Mamak Bistro';
      let amount = 68.40;
      let category = 'food';
      let items = [
        { name: 'Nasi Kandar', amount: 25.50 },
        { name: 'Mee Goreng Mamak', amount: 18.00 },
        { name: 'Roti Canai Special', amount: 14.90 },
        { name: 'Teh Tarik Kaw', amount: 10.00 }
      ];
      
      if (lowerName.includes('grab') || lowerName.includes('uber') || lowerName.includes('taxi') || lowerName.includes('cab')) {
        title = 'Grab Ride - Kuala Lumpur';
        amount = 24.50;
        category = 'transport';
        items = [
          { name: 'GrabCar Ride Fare', amount: 19.50 },
          { name: 'Toll Charges', amount: 5.00 }
        ];
      } else if (lowerName.includes('hotel') || lowerName.includes('hostel') || lowerName.includes('airbnb')) {
        title = 'Langkawi Homestay';
        amount = 145.00;
        category = 'lodging';
        items = [
          { name: 'Room Stay Rate', amount: 130.00 },
          { name: 'Tourism Tax', amount: 15.00 }
        ];
      } else if (lowerName.includes('movie') || lowerName.includes('cinema') || lowerName.includes('ticket')) {
        title = 'GSC Cinema Tickets';
        amount = 30.00;
        category = 'entertainment';
        items = [
          { name: 'Standard Seat Ticket x2', amount: 26.00 },
          { name: 'Caramel Popcorn Combo', amount: 4.00 }
        ];
      }

      return NextResponse.json({
        title,
        description: title,
        amount,
        category,
        date: new Date().toISOString().split('T')[0],
        items,
        success: true,
        message: 'Mock scan completed successfully (Mock Mode).'
      });
    }

    // Parse data URL: data:image/png;base64,xxxx
    let mediaType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mediaType = match[1];
        base64Data = match[2];
      }
    }

    let textContent = '';
    const systemPrompt = `You are a precise receipt scanning assistant.
Extract the merchant title, the total amount (as a float), the category (must be one of: food, housing, transport, entertainment, utilities, lodging, general), the receipt date (formatted as YYYY-MM-DD), and the individual line items.
Return ONLY a valid JSON object. Do not include markdown code block syntax. Just return raw JSON.
Example format:
{
  "title": "Starbucks Coffee",
  "amount": 14.50,
  "category": "food",
  "date": "2026-05-23",
  "items": [
    { "name": "Caffe Latte", "amount": 6.50 },
    { "name": "Chocolate Croissant", "amount": 8.00 }
  ]
}`;

    if (geminiApiKey && !geminiApiKey.startsWith('your_')) {
      let response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: mediaType,
                      data: base64Data
                    }
                  },
                  {
                    text: systemPrompt + "\n\nExtract the details from this receipt and return the JSON object."
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json'
            }
          })
        });
      } catch (err) {
        console.warn('Gemini flash-latest fetch failed, attempting fallback...', err);
      }

      // Fallback to gemini-2.5-flash if the primary request failed or returned an error status (like 503)
      if (!response || !response.ok) {
        console.warn('Gemini flash-latest unavailable or returned error. Retrying with gemini-2.5-flash...');
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: mediaType,
                      data: base64Data
                    }
                  },
                  {
                    text: systemPrompt + "\n\nExtract the details from this receipt and return the JSON object."
                  }
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
        throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      textContent = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      // Call Anthropic API
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
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: 'Extract the details from this receipt and return the JSON object.',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Anthropic API Error:', errorText);
        throw new Error(`Anthropic API responded with status ${response.status}`);
      }

      const result = await response.json();
      textContent = result.content?.[0]?.text || '';
    }
    
    try {
      const jsonStart = textContent.indexOf('{');
      const jsonEnd = textContent.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = textContent.slice(jsonStart, jsonEnd);
        const parsed = JSON.parse(jsonStr);
        const matchedTitle = parsed.title || parsed.description || 'Unknown Merchant';
        return NextResponse.json({
          title: matchedTitle,
          description: matchedTitle,
          amount: parseFloat(parsed.amount) || 0.0,
          category: parsed.category || 'general',
          date: parsed.date || new Date().toISOString().split('T')[0],
          items: parsed.items || [],
          success: true
        });
      } else {
        throw new Error('Claude response did not contain JSON');
      }
    } catch (parseErr) {
      console.error('Failed to parse Claude response:', textContent, parseErr);
      throw new Error('Failed to parse receipt data from AI response');
    }
  } catch (error: any) {
    console.error('API /api/expenses/scan-receipt error:', error);
    return NextResponse.json({ error: error.message || 'Server error scanning receipt' }, { status: 500 });
  }
}

