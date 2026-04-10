import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Settings {
  currency: string;
}

const DEFAULT_CURRENCY = "GBP";

export function useSettings(): { currency: string } {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("settings").select("data").eq("user_id", user.id).single();
      if (data?.data) {
        const settings = data.data as Partial<Settings>;
        if (settings.currency) setCurrency(settings.currency);
      }
    }
    load();
  }, []);

  return { currency };
}
