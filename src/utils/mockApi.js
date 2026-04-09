import {
  mockAccounts,
  mockCryptoHoldings,
  mockHoldings,
  mockProperties,
  mockSummary,
  mockTransactions,
} from "../data/mockFinancialData";

const mockApiPayloads = {
  "/api/plaid/summary": () => mockSummary,
  "/api/plaid/accounts": () => ({ accounts: mockAccounts }),
  "/api/plaid/transactions": (url) => {
    const requestedAccountId = url.searchParams.get("account_id");
    const limit = Number(url.searchParams.get("limit") || mockTransactions.length);
    const transactions = requestedAccountId
      ? mockTransactions.filter((txn) => txn.account_id === requestedAccountId)
      : mockTransactions;
    return { transactions: transactions.slice(0, limit) };
  },
  "/api/plaid/holdings": () => ({ holdings: mockHoldings }),
  "/api/coinbase/holdings": () => ({ holdings: mockCryptoHoldings }),
  "/api/properties": () => ({ properties: mockProperties }),
};

function normalizeUrl(input) {
  if (typeof input === "string") {
    return new URL(input, window.location.origin);
  }

  if (input instanceof URL) {
    return input;
  }

  return new URL(String(input?.url || ""), window.location.origin);
}

function buildResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
  };
}

export async function fetchWithMockFallback(input, init) {
  const url = normalizeUrl(input);
  const resolver = mockApiPayloads[url.pathname];

  try {
    const response = await fetch(input, init);
    if (response.ok || !resolver || response.status !== 404) {
      return response;
    }
  } catch (error) {
    if (!resolver) {
      throw error;
    }
  }

  return buildResponse(resolver(url));
}

export function getMockApiPayload(path, search = "") {
  const url = new URL(`${path}${search}`, window.location.origin);
  const resolver = mockApiPayloads[url.pathname];
  return resolver ? resolver(url) : null;
}
