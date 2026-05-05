const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ssfyahfnbbwnvkigejuw.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzZnlhaGZuYmJ3bnZraWdlanV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzNDEyMCwiZXhwIjoyMDgyOTEwMTIwfQ.d_L-RXfWGXisVyCkYJtzFp4_2g6sHEUiuy7UtOW0DxE';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function check() {
  const { data, error } = await supabase.rpc('get_triggers', {});
  console.log("Triggers:", data, error);
  // Actually we can just try running a raw query using the rest API or something, but we don't have a direct postgres connection string.
}
check();
