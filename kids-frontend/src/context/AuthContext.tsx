import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from "@supabase/supabase-js";

export type UserRole = "admin" | "parent";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  screenTimeLimit: number;
  totalWatchTime: number;
  videos_watched_count: number;
  points: number;
  badges: string[];
  hasPinSet: boolean;
}

export type PinVerificationError =
  | "NOT_LOGGED_IN"
  | "DATABASE_ERROR"
  | "NO_PIN_SET"
  | "INCORRECT_PIN"
  | "UNKNOWN_ERROR";

export interface PinVerificationResult {
  success: boolean;
  error?: PinVerificationError;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    pin: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  verifyPinWithDetails: (pin: string) => Promise<PinVerificationResult>;
  updatePin: (newPin: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
  requestPinReset: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, videos_watched_count")
        .eq("user_id", supabaseUser.id)
        .maybeSingle();

      const profileData = profile as any;

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", supabaseUser.id)
        .maybeSingle();

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        name:
          profileData?.display_name || supabaseUser.email?.split("@")[0] || "User",
        role: (roleData?.role as UserRole) || "parent",
        avatar: profileData?.avatar_url,
        screenTimeLimit: profileData?.screen_time_limit || 60,
        totalWatchTime: profileData?.total_watch_time || 0,
        videos_watched_count: profileData?.videos_watched_count || 0,
        points: profileData?.points || 0,
        badges: profileData?.badges || [],
        hasPinSet: !!profileData?.pin_hash,
      };

      setUser(userData);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (session?.user) {
        // Defer Supabase calls with setTimeout to prevent deadlock
        setTimeout(() => {
          fetchUserData(session.user);
        }, 0);
      } else {
        setUser(null);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Screen Time Countdown Logic
  useEffect(() => {
    if (!user || user.role === 'admin') return; // Admins don't have limits

    const checkLimit = () => {
      const remaining = user.screenTimeLimit - user.totalWatchTime;
      if (remaining <= 0) {
        alert("Thời gian sử dụng web của bạn đã hết. Bạn sẽ bị đăng xuất.");
        logout();
      }
    };

    // Check immediately on mount/user change
    checkLimit();

    // Set up interval to increment watch time every minute and check limit
    const interval = setInterval(async () => {
      try {
        // Increment watch time in backend
        const { error } = await supabase
          .from("profiles")
          .update({ 
            total_watch_time: user.totalWatchTime + 1,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (!error) {
          // Update local state
          const newTotal = user.totalWatchTime + 1;
          setUser({ ...user, totalWatchTime: newTotal });
          
          if (newTotal >= user.screenTimeLimit) {
            alert("Thời gian sử dụng web của bạn đã hết. Bạn sẽ bị đăng xuất.");
            logout();
          }
        }
      } catch (err) {
        console.error("Error updating screen time:", err);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }

    setIsLoading(false);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    pin: string,
  ) => {
    setIsLoading(true);

    localStorage.removeItem("pin_lockout_until");
    localStorage.removeItem("pin_attempts");

    const redirectUrl = `${window.location.origin}/`;

    // Hash the PIN (simple hash for demo - in production use bcrypt on server)
    const pinHash = await hashPin(pin);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: name,
          role: "parent",
          pin_hash: pinHash,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }

    if (data.user) {
      console.log("User created successfully:", data.user.id);
      console.log(
        "Has session (email confirmed or confirmation disabled):",
        !!data.session,
      );

      if (data.session) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, pin_hash")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        if (profile) {
          console.log(
            "Profile created by trigger. PIN hash set:",
            !!profile.pin_hash,
          );

          if (!profile.pin_hash) {
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ pin_hash: pinHash })
              .eq("user_id", data.user.id);

            if (updateError) {
              console.error("Error updating PIN:", updateError);
            } else {
              console.log("PIN hash updated");
            }
          }
        } else {
          console.warn(
            "Profile not found after signup. Trigger may not be working.",
          );
          console.warn(
            "Please run the SQL migration in Supabase to create/fix the trigger.",
          );
        }
      } else {
        console.log("Email confirmation required.");
        console.log(
          "Profile will be created by database trigger when signup completes.",
        );
        console.log(
          "PIN hash is stored in user metadata and will be saved by trigger.",
        );
      }
    }

    setIsLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (!user) return false;

    const pinHash = await hashPin(pin);

    const { data } = await supabase
      .from("profiles")
      .select("pin_hash")
      .eq("user_id", user.id)
      .maybeSingle();

    return data?.pin_hash === pinHash;
  };

  const verifyPinWithDetails = async (
    pin: string,
  ): Promise<PinVerificationResult> => {
    if (!user) {
      console.error("verifyPinWithDetails: No user logged in");
      return { success: false, error: "NOT_LOGGED_IN" };
    }

    try {
      const pinHash = await hashPin(pin);
      console.log("Verifying PIN for user:", user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("pin_hash")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("PIN verification database error:", error);
        return { success: false, error: "DATABASE_ERROR" };
      }

      if (!data?.pin_hash) {
        console.warn("No PIN set for user:", user.id);
        return { success: false, error: "NO_PIN_SET" };
      }

      if (data.pin_hash !== pinHash) {
        console.log("PIN hash mismatch");
        return { success: false, error: "INCORRECT_PIN" };
      }

      console.log("PIN verified successfully");
      return { success: true };
    } catch (err) {
      console.error("Unexpected error during PIN verification:", err);
      return { success: false, error: "UNKNOWN_ERROR" };
    }
  };

  const updatePin = async (newPin: string): Promise<void> => {
    if (!user) throw new Error("No user logged in");

    const pinHash = await hashPin(newPin);

    const { error } = await supabase
      .from("profiles")
      .update({ pin_hash: pinHash })
      .eq("user_id", user.id);

    if (error) throw error;

    setUser({ ...user, hasPinSet: true });
  };

  const requestPinReset = async (
    email: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-pin`,
      });

      if (error) {
        console.error("PIN reset request error:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error("Unexpected error during PIN reset request:", err);
      return { success: false, error: "Failed to send reset email" };
    }
  };

  const refreshUserData = async () => {
    if (session?.user) {
      await fetchUserData(session.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        login,
        register,
        logout,
        verifyPin,
        verifyPinWithDetails,
        updatePin,
        refreshUserData,
        requestPinReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Simple hash function for PIN (in production, use bcrypt on server-side)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
