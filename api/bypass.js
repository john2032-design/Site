const getCurrentTime = () => process.hrtime.bigint();
const formatDuration = (startNs, endNs = process.hrtime.bigint()) => {
  const durationNs = Number(endNs - startNs);
  const durationSec = durationNs / 1_000_000_000;
  return `${durationSec.toFixed(2)}s`;
};
const ALLOWED_ORIGIN = 'https://vortix-world-bypass.vercel.app';
const SITE_SECRET = process.env.SITE_SECRET || '';
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';
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
    const verify = await axios.post('https://hcaptcha.com/siteverify', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000
    });
    const v = verify.data || {};
    if (!v.success) {
      return res.status(403).json({ status: 'error', result: 'hCaptcha verification failed', time_taken: formatDuration(handlerStart) });
    }
  } catch (e) {
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
  const voltarOnlyExclusive = ['work.ink','pandadevelopment.net','keyrblx.com','airflowscript.com','blox-script.com','neoxsoftworks.eu','cuty.io','cety.io'];
  const abysmOnlyExclusive = ['loot-link.com','lootlink.org','lootlinks.co','lootdest.info','lootdest.org','lootdest.com','links-loot.com','loot-links.com','lootlinks.com','loot-labs.com','lootlabs.com','mboost.me','linkvertise.com'];
  const isVoltarOnly = voltarOnlyExclusive.some(d => hostname === d || hostname.endsWith('.' + d));
  const isAbysmOnly = abysmOnlyExclusive.some(d => hostname === d || hostname.endsWith('.' + d));
  const voltarBase = 'https://api.voltar.lol';
  let incomingUserId = '';
  if (req.method === 'POST') {
    incomingUserId = (req.body && (req.body['x_user_id'] || req.body['x-user-id'] || req.body.xUserId)) || '';
  } else {
    incomingUserId = (req.headers && (req.headers['x-user-id'] || req.headers['x_user_id'] || req.headers['x-userid'])) || '';
  }
  const voltarHeaders = {
    'x-user-id': incomingUserId || '',
    'x-api-key': '3f9c1e10-7f3e-4a67-939b-b42c18e4d7aa',
    'Content-Type': 'application/json'
  };
  const ABYSM_KEY = '';
  const tryVoltar = async () => {
    const start = getCurrentTime();
    try {
      const createPayload = { url, cache: true };
      if (incomingUserId) createPayload.x_user_id = incomingUserId;
      const createRes = await axios.post(`${voltarBase}/bypass/createTask`, createPayload, { headers: voltarHeaders, timeout: 0 });
      if (createRes.data.status !== 'success' || !createRes.data.taskId) return { success: false, unsupported: true };
      const taskId = createRes.data.taskId;
      while (true) {
        await new Promise(r => setTimeout(r, 500));
        try {
          const resultRes = await axios.get(`${voltarBase}/bypass/getTaskResult/${taskId}`, {
            headers: {
              'x-api-key': voltarHeaders['x-api-key'],
              'x-user-id': voltarHeaders['x-user-id']
            },
            timeout: 0
          });
          if (resultRes.data.status === 'success' && resultRes.data.result) {
            res.json({ status: 'success', result: resultRes.data.result, x_user_id: incomingUserId || '', time_taken: formatDuration(start) });
            return { success: true };
          }
        } catch {}
      }
    } catch (e) {
      if (e.response?.data?.message && /unsupported|invalid|not supported/i.test(e.response.data.message)) {
        return { success: false, unsupported: true };
      }
      return { success: false };
    }
  };
  const tryAbysm = async () => {
    const start = getCurrentTime();
    try {
      const abysmUrl = `https://api.abysm.lat/v2/bypass?url=${encodeURIComponent(url)}`;
      const r = await axios.get(abysmUrl, { headers: { 'x-api-key': ABYSM_KEY, 'accept': 'application/json' }, timeout: 0 });
      const d = r.data || {};
      if (d.status === 'success') {
        const link = d.data && typeof d.data === 'object' && typeof d.data.result === 'string' ? d.data.result : '';
        res.json({ status: 'success', result: link, x_user_id: incomingUserId || '', time_taken: formatDuration(start) });
        return { success: true };
      }
      if (d.status === 'fail') {
        return { success: false, fail: true };
      }
      const msg = d?.message || d?.error || d?.result || '';
      if (/unsupported|not supported|missing_url/i.test(String(msg))) {
        return { success: false, unsupported: true };
      }
      return { success: false };
    } catch (e) {
      if (e.response?.data) {
        const dd = e.response.data;
        if (dd?.status === 'fail') return { success: false, fail: true };
        const msg = dd?.message || dd?.error || dd?.result || '';
        if (/unsupported|not supported|missing_url/i.test(String(msg))) {
          return { success: false, unsupported: true };
        }
      }
      return { success: false };
    }
  };
  if (isAbysmOnly) {
    const abysmResult = await tryAbysm();
    if (abysmResult.success) return;
    return res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
  }
  if (isVoltarOnly) {
    const voltarResult = await tryVoltar();
    if (voltarResult.success) return;
    return res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
  }
  if (hostname === 'auth.platorelay.com' || hostname.endsWith('.auth.platorelay.com')) {
    const abysmResult = await tryAbysm();
    if (abysmResult.success) return;
    if (abysmResult.fail) {
      const voltarResult = await tryVoltar();
      if (voltarResult.success) return;
      return res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
    }
    return res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
  }
  const voltarResult = await tryVoltar();
  if (voltarResult.success) return;
  const abysmResult = await tryAbysm();
  if (abysmResult.success) return;
  res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
};
