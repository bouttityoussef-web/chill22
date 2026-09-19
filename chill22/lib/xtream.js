export async function createM3ULine({ sub = 12, pack = 64313, note = '', country = '' }) {
  const baseUrl = process.env.XTREAM_API_BASE_URL;
  const apiKey = process.env.XTREAM_RESELLER_API_KEY;

  const params = new URLSearchParams({
    action: 'new',
    type: 'm3u',
    sub: String(sub),
    pack: String(pack),
    api_key: apiKey,
  });

  if (note) params.append('notes', note);
  if (country) params.append('country', country);

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  const rawText = await response.text();

  let item;
  try {
    const data = JSON.parse(rawText);
    item = Array.isArray(data) ? data[0] : data;
  } catch {
    throw new Error(`Panel non-JSON (${response.status}): ${rawText.slice(0, 300)}`);
  }

  if (!item || item.status === 'error') {
    throw new Error(item?.result || item?.message || `Panel error: ${JSON.stringify(item)}`);
  }

  // Panel embeds username/password inside the URL
  // e.g. http://host/get.php?username=abc&password=xyz&type=m3u_plus
  const m3uUrl = item.url || '';
  let username = item.username || null;
  let password = item.password || null;

  if (!username && m3uUrl) {
    try {
      const urlObj = new URL(m3uUrl);
      username = urlObj.searchParams.get('username');
      password = urlObj.searchParams.get('password');
    } catch {
      // fallback: regex extract
      const uMatch = m3uUrl.match(/username=([^&]+)/);
      const pMatch = m3uUrl.match(/password=([^&]+)/);
      username = uMatch?.[1] || null;
      password = pMatch?.[1] || null;
    }
  }

  if (!username) {
    throw new Error(`Could not extract username. Response: ${JSON.stringify(item)}`);
  }

  // Not every panel documents the id field; take whichever one it returns.
  const userId = item.user_id ?? item.id ?? item.line_id ?? null;

  return { username, password, m3uUrl, userId, raw: item };
}

// Generic panel call for actions we don't have a dedicated helper for.
// Never throws: returns { action, params, httpStatus, body } or { action, params, error }
// so a failing optional call can't break line creation.
export async function panelRequest(action, params = {}, label = action) {
  const baseUrl = process.env.XTREAM_API_BASE_URL;
  const apiKey = process.env.XTREAM_RESELLER_API_KEY;

  const query = new URLSearchParams({ action, api_key: apiKey });
  for (const [k, v] of Object.entries(params)) query.append(k, String(v));

  try {
    const response = await fetch(`${baseUrl}?${query.toString()}`, { signal: AbortSignal.timeout(8000) });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { action, label, params, httpStatus: response.status, body };
  } catch (err) {
    return { action, label, params, error: err.message };
  }
}

export async function getDeviceInfo({ username, password }) {
  const baseUrl = process.env.XTREAM_API_BASE_URL;
  const apiKey = process.env.XTREAM_RESELLER_API_KEY;

  const params = new URLSearchParams({
    action: 'device_info',
    username,
    password,
    api_key: apiKey,
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

export async function renewLine({ username, password, sub = 12 }) {
  const baseUrl = process.env.XTREAM_API_BASE_URL;
  const apiKey = process.env.XTREAM_RESELLER_API_KEY;

  const params = new URLSearchParams({
    action: 'renew',
    type: 'm3u',
    username,
    password,
    sub: String(sub),
    api_key: apiKey,
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}
