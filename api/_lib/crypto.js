const { requireSupabaseConfig } = require("./supabase");

const ENCRYPTION_KEY = process.env.PLAID_TOKEN_ENCRYPTION_KEY;

function requireEncryptionKey() {
  if (!ENCRYPTION_KEY) {
    const error = new Error(
      "Missing PLAID_TOKEN_ENCRYPTION_KEY. Set it in Vercel environment variables."
    );
    error.statusCode = 500;
    throw error;
  }
  return ENCRYPTION_KEY;
}

async function encryptToken(plaintext) {
  const key = requireEncryptionKey();
  const { url, key: serviceKey } = requireSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });

  // Use a direct SQL approach via the PostgREST RPC fallback
  // pgcrypto is in the extensions schema
  const sqlResponse = await fetch(`${url}/rest/v1/rpc/pgp_sym_encrypt`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: plaintext, psw: key }),
  });

  if (!sqlResponse.ok) {
    // Fallback: encrypt using Node.js crypto (AES-256-GCM)
    return encryptLocal(plaintext, key);
  }

  return sqlResponse.json();
}

async function decryptToken(encrypted) {
  const key = requireEncryptionKey();

  // If it was encrypted locally with AES-256-GCM
  if (typeof encrypted === "string" && encrypted.startsWith("aes256:")) {
    return decryptLocal(encrypted, key);
  }

  // For pgcrypto-encrypted data, decrypt in queries using:
  // extensions.pgp_sym_decrypt(column, key)
  const { url, key: serviceKey } = requireSupabaseConfig();

  const sqlResponse = await fetch(`${url}/rest/v1/rpc/pgp_sym_decrypt`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: encrypted, psw: key }),
  });

  if (!sqlResponse.ok) {
    return decryptLocal(encrypted, key);
  }

  return sqlResponse.json();
}

// Local AES-256-GCM encryption as primary method
// More reliable than pgcrypto RPC calls and works consistently
const crypto = require("crypto");

function encryptLocal(plaintext, passphrase) {
  const key = crypto.scryptSync(passphrase, "plaid-token-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return `aes256:${iv.toString("hex")}:${tag}:${encrypted}`;
}

function decryptLocal(encryptedStr, passphrase) {
  const parts = encryptedStr.replace("aes256:", "").split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [ivHex, tagHex, data] = parts;
  const key = crypto.scryptSync(passphrase, "plaid-token-salt", 32);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  encryptToken: async (plaintext) => {
    const key = requireEncryptionKey();
    return encryptLocal(plaintext, key);
  },
  decryptToken: async (encrypted) => {
    const key = requireEncryptionKey();
    return decryptLocal(encrypted, key);
  },
  requireEncryptionKey,
};
