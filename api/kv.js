import { createClient } from 'redis';

let clientPromise;

function getClient() {
  if (!clientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (err) => console.error('Redis Client Error', err));
    clientPromise = client.connect().then(() => client);
  }
  return clientPromise;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const client = await getClient();

    if (req.method === 'GET') {
      const { action, key, prefix } = req.query;

      if (action === 'list') {
        const keys = await client.keys(`${prefix || ''}*`);
        res.status(200).json({ keys });
        return;
      }

      if (!key) {
        res.status(400).json({ error: 'missing key' });
        return;
      }
      const value = await client.get(key);
      res.status(200).json({ value: value ?? null });
      return;
    }

    if (req.method === 'POST') {
      const { key, value } = req.body || {};
      if (!key) {
        res.status(400).json({ error: 'missing key' });
        return;
      }
      await client.set(key, value);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
