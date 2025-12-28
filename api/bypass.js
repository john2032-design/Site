const rateMap = new Map();

const getCurrentTime = () => process.hrtime.bigint();
const formatDuration = (startNs, endNs = process.hrtime.bigint()) => {
  const durationNs = Number(endNs - startNs);
  return `${(durationNs / 1_000_000_000).toFixed(2)}s`;
};

const ALLOWED_ORIGIN = 'https://vortix-world-bypass.vercel.app';
const SITE_SECRET = process.env.SITE_SECRET;
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;

module.exports = async (req, res) => {
  const handlerStart = getCurrentTime();

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket?.remoteAddress ||
    'unknown';

  const now = Date.now();
  const record = rateMap.get(ip) || { count: 0, time: now };
  if (now - record.time > RATE_WINDOW) {
    record.count = 0;
    record.time = now;
  }
  record.count++;
  rateMap.set(ip, record);

  if (record.count > RATE_LIMIT) {
    return res.status(429).json({
      status: 'error',
      result: 'Rate limit exceeded',
      time_taken: formatDuration(handlerStart)
    });
  }

  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const siteToken = req.headers['x-site-token'];

  if (
    origin !== ALLOWED_ORIGIN ||
    !referer.startsWith(ALLOWED_ORIGIN) ||
    siteToken !== SITE_SECRET
  ) {
    return res.status(403).json({
      status: 'error',
      result: 'Unauthorized',
      time_taken: formatDuration(handlerStart)
    });
  }

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-site-token');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      result: 'Method not allowed',
      time_taken: formatDuration(handlerStart)
    });
  }

  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      status: 'error',
      result: 'Missing url',
      time_taken: formatDuration(handlerStart)
    });
  }

  let axios;
  try { axios = require('axios'); } catch {
    return res.status(500).json({
      status: 'error',
      result: 'axios missing',
      time_taken: formatDuration(handlerStart)
    });
  }

  try {
    const r = await axios.get(url, { maxRedirects: 5 });
    const final = r.request?.res?.responseUrl || url;
    return res.json({
      status: 'success',
      result: final,
      time_taken: formatDuration(handlerStart)
    });
  } catch (e) {
    return res.json({
      status: 'error',
      result: 'Bypass Failed :(',
      time_taken: formatDuration(handlerStart)
    });
  }
};
