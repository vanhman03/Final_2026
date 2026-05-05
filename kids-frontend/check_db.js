const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://ssfyahfnbbwnvkigejuw.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzZnlhaGZuYmJ3bnZraWdlanV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzNDEyMCwiZXhwIjoyMDgyOTEwMTIwfQ.d_L-RXfWGXisVyCkYJtzFp4_2g6sHEUiuy7UtOW0DxE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function check() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) console.error("Error listing users:", userError);
  console.log("Total users in auth.users:", users?.users?.length);
  if (users?.users?.length > 0) {
    const recent = users.users.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
    console.log("Recent users:", recent.map(u => ({ email: u.email, created_at: u.created_at, confirmed_at: u.confirmed_at })));
  }

  const { data: profiles, error: profileError } = await supabase.from('profiles').select('user_id, display_name').order('updated_at', { ascending: false }).limit(3);
  if (profileError) console.error("Error listing profiles:", profileError);
  console.log("Recent profiles:", profiles);
}

check();
