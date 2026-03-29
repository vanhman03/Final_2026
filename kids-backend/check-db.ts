import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: profilesColumns, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  console.log('--- Profiles Table ---');
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else if (profilesColumns && profilesColumns.length > 0) {
    console.log('Columns:', Object.keys(profilesColumns[0]));
  } else {
    console.log('Profiles table is empty.');
  }

  const { data: ordersColumns, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  console.log('\n--- Orders Table ---');
  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
  } else if (ordersColumns && ordersColumns.length > 0) {
    console.log('Columns:', Object.keys(ordersColumns[0]));
  }

  // Check foreign keys
  const { data: fks, error: fkError } = await supabase
    .rpc('get_foreign_keys', { table_name: 'orders' });
  
  if (fkError) {
    console.log('Note: get_foreign_keys RPC not found or failed.');
  } else {
    console.log('Order FKs:', fks);
  }
}

checkSchema();
