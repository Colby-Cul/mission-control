import { useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { C } from "../data/constants";

const PlaidLink = ({ onSuccess, products = ["transactions"], accountScope = "personal", entityId = null, buttonLabel = "Connect Bank Account", buttonStyle = {} }) => {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createLinkToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      });
      const data = await response.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
      } else {
        setError(data.error || "Failed to create link token");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [products]);

  const handleSuccess = useCallback(async (publicToken, metadata) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token: publicToken,
          account_scope: accountScope,
          entity_id: entityId,
          products,
        }),
      });
      const data = await response.json();
      if (data.success) {
        onSuccess?.(data);
      } else {
        setError(data.error || "Failed to link account");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLinkToken(null);
    }
  }, [accountScope, entityId, products, onSuccess]);

  const config = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: () => setLinkToken(null),
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = () => {
    if (linkToken && ready) {
      open();
    } else {
      createLinkToken();
    }
  };

  // Auto-open when link token is ready
  if (linkToken && ready) {
    open();
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          background: C.accent,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 20px",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          ...buttonStyle,
        }}
      >
        {loading ? "Connecting..." : buttonLabel}
      </button>
      {error && (
        <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
};

export default PlaidLink;
