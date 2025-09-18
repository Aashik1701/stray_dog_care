export function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

export function isExpired(token, skewSeconds = 30) {
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return false;
  const now = Date.now() / 1000;
  return decoded.exp < (now + skewSeconds);
}
