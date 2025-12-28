const getCurrentTime = () => process.hrtime.bigint();
const formatDuration = (startNs, endNs = process.hrtime.bigint()) => {
  const durationNs = Number(endNs - startNs);
  const durationSec = durationNs / 1000000000;
  return `${durationSec.toFixed(2)}s`;
};

const ALLOWED_ORIGIN = 'https://vortix-world-bypass.vercel.app';
const SITE_SECRET = process.env.SITE_SECRET || '';
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';
const ABYSM_API_KEY = process.env.ABYSM_API_KEY || '';

module.exports = async (req, res) => {
  const handlerStart = getCurrentTime();

  const origin = (req.headers.origin || '').toString();
  const referer = (req.headers.referer || '').toString();
  const siteToken = (req.headers['x-site-token'] || '').toString();

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-user-id,x-site-token,x-hcaptcha-token,Origin,Referer');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SITE_SECRET) {
    return res.status(500).json({ status: 'error', result: 'SITE_SECRET not configured', time_taken: formatDuration(handlerStart) });
  }

  if (!HCAPTCHA_SECRET) {
    return res.status(500).json({ status: 'error', result: 'HCAPTCHA_SECRET not configured', time_taken: formatDuration(handlerStart) });
  }

  if (!ABYSM_API_KEY) {
    return res.status(500).json({ status: 'error', result: 'ABYSM_API_KEY not configured', time_taken: formatDuration(handlerStart) });
  }

  if (origin !== ALLOWED_ORIGIN || !referer.startsWith(ALLOWED_ORIGIN) || siteToken !== SITE_SECRET) {
    return res.status(403).json({ status: 'error', result: 'Unauthorized', time_taken: formatDuration(handlerStart) });
  }

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ status: 'error', result: 'Method not allowed', time_taken: formatDuration(handlerStart) });
  }

  const url = req.method === 'GET' ? req.query.url : req.body?.url;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ status: 'error', result: 'Missing url parameter', time_taken: formatDuration(handlerStart) });
  }

  const incomingHcaptcha = (req.headers['x-hcaptcha-token'] || req.body?.hcaptcha_token || '').toString();

  if (!incomingHcaptcha) {
    return res.status(400).json({ status: 'error', result: 'Missing hcaptcha token', time_taken: formatDuration(handlerStart) });
  }

  let axios;
  try { axios = require('axios'); } catch {
    return res.status(500).json({ status: 'error', result: 'axios missing', time_taken: formatDuration(handlerStart) });
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', HCAPTCHA_SECRET);
    params.append('response', incomingHcaptcha);
    const verify = await axios.post('https://hcaptcha.com/siteverify', params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (!verify.data?.success) {
      return res.status(403).json({ status: 'error', result: 'hCaptcha verification failed', time_taken: formatDuration(handlerStart) });
    }
  } catch {
    return res.status(502).json({ status: 'error', result: 'hCaptcha verification failed', time_taken: formatDuration(handlerStart) });
  }

  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    const m = url.match(/https?:\/\/([^\/?#]+)/i);
    hostname = m ? m[1].toLowerCase() : '';
  }

  if (!hostname) {
    return res.status(400).json({ status: 'error', result: 'Invalid URL', time_taken: formatDuration(handlerStart) });
  }

  const voltarOnly = ['pandadevelopment.net','auth.plato','work.ink','link4m.com','keyrblx.com','link4sub.com','linkify.ru','sub4unlock.io','sub2unlock','sub2get.com','sub2unlock.net'];
  const abysmOnly = ['rentry.org','paster.so','loot-link.com','loot-links.com','lootlink.org','lootlinks.co','lootdest.info','lootdest.org','lootdest.com','links-loot.com','linksloot.net'];

  const isVoltarOnly = voltarOnly.some(d => hostname === d || hostname.endsWith('.' + d));
  const isAbysmOnly = abysmOnly.some(d => hostname === d || hostname.endsWith('.' + d));

  const voltarBase = 'http://77.110.121.76:3000';

  const tryVoltar = async () => {
    const start = getCurrentTime();
    try {
      const createRes = await axios.post(`${voltarBase}/bypass/createTask`, { url, cache: true });
      if (createRes.data?.status !== 'success' || !createRes.data?.taskId) return { success: false };
      const taskId = createRes.data.taskId;
      for (let i = 0; i < 140; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const resultRes = await axios.get(`${voltarBase}/bypass/getTaskResult/${taskId}`);
        if (resultRes.data?.status === 'success' && resultRes.data?.result) {
          res.json({ status: 'success', result: resultRes.data.result, time_taken: formatDuration(start) });
          return { success: true };
        }
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  };

  const tryAbysm = async () => {
    const start = getCurrentTime();
    try {
      const r = await axios.get(`https://api.abysm.lat/v2/bypass?url=${encodeURIComponent(url)}`, {
        headers: { 'x-api-key': ABYSM_API_KEY, 'accept': 'application/json' }
      });
      if (r.data?.status === 'success' && r.data?.result) {
        res.json({ status: 'success', result: r.data.result, time_taken: formatDuration(start) });
        return { success: true };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  };

  if (isVoltarOnly) {
    const r = await tryVoltar();
    if (r.success) return;
    return res.json({ status: 'error', result: 'Bypass Failed :(', time_taken: formatDuration(handlerStart) });
  }

  if (isAbysmOnly) {
    const r = await tryAbysm();
    if (r.success) return;
    return res.json({ status: 'error', result: 'Bypass Failed :(', time_taken: formatDuration(handlerStart) });
  }

  const voltarResult = await tryVoltar();
  if (voltarResult.success) return;

  const abysmResult = await tryAbysm();
  if (abysmResult.success) return;

  return res.json({ status: 'error', result: 'Bypass Failed :(', time_taken: formatDuration(handlerStart) });
};
