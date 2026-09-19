// Reseller pack used for every subscription line.
export const SUBSCRIPTION_PACK = 64313;

// Subscription length in months -> the panel's "sub" value, and the label shown to clients.
export const SUB_BY_MONTHS = { 1: 1, 3: 3, 6: 6, 12: 12 };
export const PLAN_LABEL_BY_MONTHS = { 1: '1 Month', 3: '3 Months', 6: '6 Months', 12: '1 Year' };

// Pass `months` (1 / 3 / 6 / 12) to pick the length; it is mapped to the panel's sub value.
// `sub` is still accepted for callers that already have a raw panel value (e.g. create-client).
export async function createM3ULine({ months, sub = 12, pack = SUBSCRIPTION_PACK, note = '', country = '' }) {
  if (months !== undefined) {
    if (!Object.hasOwn(SUB_BY_MONTHS, months)) {
      throw new Error(`Unsupported duration: ${months} months (use 1, 3, 6 or 12)`);
    }
    sub = SUB_BY_MONTHS[months];
  }

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

  return { username, password, m3uUrl };
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
