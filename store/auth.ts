import { supabase } from "@/lib/supabase";
import { AuthError, Session } from "@supabase/supabase-js";
import { create } from "zustand";

type AuthErrorResponse = {
  error: AuthError | null;
};

type AuthState = {
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null; isAdmin?: boolean }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: {
    full_name?: string;
    avatar_url?: string;
    seasonal_allergies?: string[];
    medications?: string[];
    blood_type?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }) => Promise<{ error: Error | null }>;
};

// Admin credentials
const ADMIN_EMAIL = "admin@health-app.com";
const ADMIN_PASSWORD = "admin123456";

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isLoading: true,
  isAdmin: false,
  error: null,

  setSession: (session) => set({ session, isLoading: false }),

  signIn: async (
    email,
    password
  ): Promise<{ error: AuthError | null; isAdmin?: boolean }> => {
    set({ isLoading: true, error: null });
    try {
      // Check for admin login
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });

        if (error) throw error;

        set({
          session: data.session,
          isAdmin: true,
        });
        return { error: null, isAdmin: true };
      }

      // Regular user login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({
        session: data.session,
        isAdmin: false,
      });
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      set({ error: authError.message });
      return { error: authError };
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (
    email,
    password,
    fullName
  ): Promise<{ error: AuthError | null }> => {
    set({ isLoading: true, error: null });
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      set({ session: data.session });
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      set({ error: authError.message });
      return { error: authError };
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      return;
    }
    set({ session: null, isAdmin: false });
  },

  resetPassword: async (email): Promise<{ error: AuthError | null }> => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.EXPO_PUBLIC_APP_URL}/auth/reset-password`,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      const authError = error as AuthError;
      set({ error: authError.message });
      return { error: authError };
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates): Promise<{ error: AuthError | null }> => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) throw new Error("No user is currently logged in");

      // Only include defined fields in the update
      const updateData: Record<string, any> = {};

      if (updates.full_name !== undefined)
        updateData.full_name = updates.full_name;
      if (updates.avatar_url !== undefined)
        updateData.avatar_url = updates.avatar_url;
      if (updates.seasonal_allergies !== undefined)
        updateData.seasonal_allergies = updates.seasonal_allergies;
      if (updates.medications !== undefined)
        updateData.medications = updates.medications;
      if (updates.blood_type !== undefined)
        updateData.blood_type = updates.blood_type;
      if (updates.emergency_contact_name !== undefined)
        updateData.emergency_contact_name = updates.emergency_contact_name;
      if (updates.emergency_contact_phone !== undefined)
        updateData.emergency_contact_phone = updates.emergency_contact_phone;

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: updateData,
      });

      if (authError) throw authError;

      // Update profiles table
      const { error: profileError } = await supabase.rpc(
        "update_user_profile",
        {
          p_user_id: currentUser.id,
          p_full_name: updateData.full_name || null,
          p_blood_type: updateData.blood_type || null,
          p_seasonal_allergies: updateData.seasonal_allergies || null,
          p_medications: updateData.medications || null,
          p_emergency_contact_name: updateData.emergency_contact_name || null,
          p_emergency_contact_phone: updateData.emergency_contact_phone || null,
        }
      );

      if (profileError) {
        console.error("Database error:", profileError);
        // If the RPC fails, try a direct update as fallback
        const { error: directUpdateError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: currentUser.id,
              ...updateData,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "id",
            }
          );

        if (directUpdateError) throw directUpdateError;
      }

      // Refresh session to get the latest data
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      // Update the local session state
      set({ session });

      return { error: null };
    } catch (error) {
      console.error("Error updating profile:", error);
      const authError = error as AuthError;
      set({ error: authError.message });
      return { error: authError };
    } finally {
      set({ isLoading: false });
    }
  },
}));

// Initialize the auth state
const initializeAuth = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  useAuthStore.getState().setSession(session);

  // Listen for changes in auth state
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });

  return () => {
    subscription?.unsubscribe();
  };
};

initializeAuth();
