import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  role: string | null; // 👈 added role here
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // fetch session + role
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user || null;
      setUser(sessionUser);

      if (sessionUser) {
        fetchRole(sessionUser.id); // 👈 grab role if logged in
      }
    };
    getSession();

    // listen for auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user || null;
        setUser(sessionUser);

        if (sessionUser) {
          fetchRole(sessionUser.id);
        } else {
          setRole(null); // reset when signed out
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // separate fn to fetch role
  const fetchRole = async (userId: string) => {
    const { data, error } = await supabase
      .from("users") // 👈 make sure this is your custom table
      .select("role")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching role:", error.message);
      setRole(null);
    } else {
      setRole(data.role);
    }
  };

  const signOutUser = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, signOut: signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
