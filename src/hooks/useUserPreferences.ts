import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserPreferences {
  id?: string;
  user_id?: string;
  dietary_restrictions: string[];
  cuisine_preferences: string[];
  calorie_goal: number;
  protein_goal: number;
  allergies: string[];
  meal_count: number;
}

const defaultPreferences: UserPreferences = {
  dietary_restrictions: [],
  cuisine_preferences: [],
  calorie_goal: 2000,
  protein_goal: 50,
  allergies: [],
  meal_count: 3,
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPreferences(data as UserPreferences);
      }
    } catch (err: any) {
      console.error("Error fetching preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPrefs: Partial<UserPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const updatedPrefs = { ...preferences, ...newPrefs };

      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_preferences")
          .update(updatedPrefs)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_preferences")
          .insert({ ...updatedPrefs, user_id: user.id });
        if (error) throw error;
      }

      setPreferences(updatedPrefs);
      toast({ title: "Preferences saved" });
    } catch (err: any) {
      toast({ title: "Error saving preferences", description: err.message, variant: "destructive" });
    }
  };

  return { preferences, loading, savePreferences, refetch: fetchPreferences };
}
