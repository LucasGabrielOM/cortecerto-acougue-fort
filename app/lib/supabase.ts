import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://izkopipilegarvbwjxzt.supabase.co";
const supabasePublishableKey = "sb_publishable_YAkorDOGRizPjnNoPi8PoA_sFKsvjUh";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
