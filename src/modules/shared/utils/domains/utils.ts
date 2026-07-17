

/**
 * Dynamically detects the root domain of the application.
 * Returns the domain including port if it's localhost.
 */
export function getRootDomain(host?: string | null) {
  // Deteksi host secara dinamis di client-side jika tidak diberikan
  const currentHost = host || (typeof window !== "undefined" ? window.location.host : null);

  // 1. Tangani localhost untuk development lokal
  if (currentHost && currentHost.includes("localhost")) {
    return "localhost:3000";
  }

  // 2. Jika diset secara eksplisit di env, gunakan (hanya hapus protokol)
  // Abaikan env fallback localhost jika di client dan host aslinya bukan localhost
  if (process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
    const envDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN.replace(/^https?:\/\//, '');
    const isEnvLocalhost = envDomain.includes("localhost") || envDomain.includes("127.0.0.1");
    const isActualLocalhost = currentHost ? (currentHost.includes("localhost") || currentHost.includes("127.0.0.1")) : false;
    
    if (!(isEnvLocalhost && currentHost && !isActualLocalhost)) {
      return envDomain;
    }
  }

  // 3. Jika tidak ada host yang diberikan atau dideteksi, gunakan fallback localhost:3000
  if (!currentHost) return "localhost:3000";

  // 4. Tangani domain produksi (deteksi apex domain)
  const hostname = currentHost.split(":")[0];
  const parts = hostname.split(".");

  if (parts.length >= 3) {
    const last = parts[parts.length - 1].toLowerCase();
    const secondLast = parts[parts.length - 2].toLowerCase();

    // Periksa jika domain menggunakan multi-part TLD (seperti .co.id, .web.id, .co.uk)
    const isMultiPartTld = (last.length <= 3 && secondLast.length <= 3);

    if (isMultiPartTld) {
      return parts.slice(-3).join(".");
    }

    return parts.slice(-2).join(".");
  }
  return hostname;
}

/**
 * Checks if the custom domain is an apex/root domain or a subdomain.
 * Correctly handles multi-part TLDs like co.id, com.co, etc.
 */
export function isApexDomain(domain: string): boolean {
  if (!domain) return false;
  const hostname = domain.split(":")[0].toLowerCase();
  const parts = hostname.split(".");
  if (parts.length <= 2) return true;
  
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  
  if (parts.length === 3) {
    const isMultiPartTld = (last.length <= 3 && secondLast.length <= 3);
    return isMultiPartTld;
  }
  
  return false;
}

/**
 * Returns the appropriate protocol for the current host.
 */
export function getProtocol(host?: string | null) {
  if (typeof window !== "undefined") {
    return window.location.protocol.replace(":", "");
  }
  
  // If on localhost, use http
  if (host?.includes("localhost") || process.env.NODE_ENV === "development") {
    return "http";
  }
  
  return "https";
}

/**
 * Constructs the base URL for the current environment/tenant.
 */
export function getBaseUrl(host?: string | null) {
  if (typeof window !== "undefined") return window.location.origin;
  
  if (host) {
    return `${getProtocol(host)}://${host}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

