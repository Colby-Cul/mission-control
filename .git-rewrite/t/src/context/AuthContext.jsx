import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Whitelist of allowed emails
const ALLOWED_EMAILS = [
  "colby@culbertsonandgray.com",
  "colby@culbertsonandculbertson.com",
  "colbyculbertson@gmail.com",
  "jarvis.culbertson@agentmail.to",
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        validateUser(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        validateUser(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function validateUser(authUser) {
    const email = authUser.email?.toLowerCase();
    if (ALLOWED_EMAILS.includes(email)) {
      setUser(authUser);
      setError(null);
    } else {
      setUser(null);
      setError(`Access denied for ${email}.`);
      supabase.auth.signOut();
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) setError(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
