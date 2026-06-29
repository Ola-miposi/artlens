const ALLOWED_ORIGIN = '*';
const GEMINI_MODEL = 'gemini-2.5-flash';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: { message: 'Server is missing GEMINI_API_KEY. Set it in Vercel → Project → Settings → Environment Variables.' },
    });
  }

  try {
    const body = req.body || {};
    const messageContent = body.messages?.[0]?.content || [];

    const imageBlock = messageContent.find((b) => b.type === 'image');
    const textBlock = messageContent.find((b) => b.type === 'text');

    if (!imageBlock || !textBlock) {
      return res.status(400).json({ error: { message: 'Request must include one image block and one text block.' } });
    }

    const geminiBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: imageBlock.source.media_type,
                data: imageBlock.source.data,
              },
            },
            { text: textBlock.text },
          ],
        },
      ],
    };

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: { message: data.error?.message || 'Gemini API request failed' } });
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join(' ')
        .trim() || '';

    if (!text) {
      return res.status(502).json({ error: { message: 'Gemini returned no text. The image or prompt may have been blocked by safety filters.' } });
    }

    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    return res.status(502).json({ error: { message: 'Upstream request failed: ' + err.message } });
  }
  }
