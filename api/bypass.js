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
  const linkvertiseHost = 'linkvertise.com';
  const cutyHost = 'cuty.io';
  const abysmOnlyExclusive = ['loot-link.com','lootlink.org','lootlinks.co','lootdest.info','lootdest.org','lootdest.com','links-loot.com','loot-links.com','lootlinks.com','loot-labs.com','lootlabs.com','mboost.me',''];
  const isLinkvertise = hostname === linkvertiseHost || hostname.endsWith('.' + linkvertiseHost);
  const isCuty = hostname === cutyHost || hostname.endsWith('.' + cutyHost);
  const isAbysmOnly = abysmOnlyExclusive.some(d => hostname === d || hostname.endsWith('.' + d));
  let incomingUserId = '';
  if (req.method === 'POST') {
    incomingUserId = (req.body && (req.body['x_user_id'] || req.body['x-user-id'] || req.body.xUserId)) || '';
  } else {
    incomingUserId = (req.headers && (req.headers['x-user-id'] || req.headers['x_user_id'] || req.headers['x-userid'])) || '';
  }
  const ABYSM_KEY = 'ABYSM-185EF369-E519-4670-969E-137F07BB52B8';
  const TRW_KEY = 'TRW_FREE-GAY-15a92945-9b04-4c75-8337-f2a6007281e9';
  const tryRtao = async () => {
    const start = getCurrentTime();
    try {
      const rtaoUrl = `https://rtao.lol/free/bypass?url=${encodeURIComponent(url)}`;
      const r = await axios.get(rtaoUrl, { headers: { 'accept': 'application/json' }, timeout: 0 });
      const d = r.data || {};
      if (d.status === 'success') {
        let link = '';
        if (typeof d.result === 'string') link = d.result;
        else if (d.data && typeof d.data === 'object' && typeof d.data.result === 'string') link = d.data.result;
        else if (typeof d.url === 'string') link = d.url;
        if (link) {
          res.json({ status: 'success', result: link, x_user_id: incomingUserId || '', time_taken: formatDuration(start) });
          return { success: true };
        }
        return { success: false };
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
  const tryTrw = async () => {
    const start = getCurrentTime();
    try {
      const trwUrl = `https://trw.lat/api/bypass?url=${encodeURIComponent(url)}`;
      const r = await axios.get(trwUrl, { headers: { 'x-api-key': TRW_KEY, 'accept': 'application/json' }, timeout: 0 });
      const d = r.data || {};
      if (d.status === 'success') {
        let link = '';
        if (typeof d.result === 'string') link = d.result;
        else if (d.data && typeof d.data === 'object' && typeof d.data.result === 'string') link = d.data.result;
        else if (typeof d.url === 'string') link = d.url;
        if (link) {
          res.json({ status: 'success', result: link, x_user_id: incomingUserId || '', time_taken: formatDuration(start) });
          return { success: true };
        }
        return { success: false };
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
  if (isLinkvertise) {
    const rtaoResult = await tryRtao();
    if (rtaoResult.success) return;
    const trwResult = await tryTrw();
    if (trwResult.success) return;
    const abysmResult = await tryAbysm();
    if (abysmResult.success) return;
    return res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
  }
  if (isCuty) {
    const trwResult = await tryTrw();
    if (trwResult.success) return;
    const abysmResult = await tryAbysm();
    if (abysmResult.success) return;
    return res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
  }
  if (hostname === 'auth.platorelay.com' || hostname.endsWith('.auth.platorelay.com')) {
    const abysmResult = await tryAbysm();
    if (abysmResult.success) return;
    return res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
  }
  const abysmResult = await tryAbysm();
  if (abysmResult.success) return;
  res.json({ status: 'error', result: 'Bypass Failed :(', x_user_id: incomingUserId || '', time_taken: formatDuration(handlerStart) });
};