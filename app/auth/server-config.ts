function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

export function getAuthBaseUrl(): string {
  const candidates = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return "http://localhost:3000";
}

export function getJwtVerificationConfig() {
  const authBaseUrl = getAuthBaseUrl();

  return {
    issuer: authBaseUrl,
    audience: authBaseUrl,
  };
}

export function getJwksUrl(): string {
  if (process.env.ZERO_AUTH_JWKS_URL) {
    const normalized = normalizeUrl(process.env.ZERO_AUTH_JWKS_URL);
    if (normalized) {
      return normalized;
    }
  }

  return `${getAuthBaseUrl()}/api/auth/jwks`;
}
