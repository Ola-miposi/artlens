/**
 * ArtLens proxy — Vercel Serverless Function
 * --------------------------------------------
 * Forwards requests from the ArtLens HTML page to the Anthropic API,
 * attaching your API key server-side so it's never exposed in the
 * page's source code.
 *
 * This file lives at: api/transform.js
 * Once deployed on Vercel, it becomes available at:
 *   https://YOUR-PROJECT-NAME.vercel.app/api/transform
 */

const ANTHROPIC_VERSION = '2023-06-01';
const ALLOWED_ORIGIN = '*'; // tighten this to your domain once you have one

export default async function handler(req, res) {
  // CORS headers on every response
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: { message: 'Server is missing ANTHROPIC_API_KEY. Set it in Vercel → Project → Settings → Environment Variables.' },
    });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: { message: 'Upstream request failed: ' + err.message } });
  }
      }
