import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role for delete
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('Fetching valid user IDs from profiles...');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('user_id');

  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }

  const validUserIds = profiles.map(p => p.user_id).filter(id => !!id);
  console.log(`Found ${validUserIds.length} valid profiles.`);

  console.log('Fetching all orders to find orphans...');
  const { data: orders, error: oError } = await supabase
    .from('orders')
    .select('id, user_id');

  if (oError) {
    console.error('Error fetching orders:', oError);
    return;
  }

  const orphanedOrders = orders.filter(o => !o.user_id || !validUserIds.includes(o.user_id));
  console.log(`Found ${orphanedOrders.length} orphaned orders.`);

  if (orphanedOrders.length > 0) {
    const orphanIds = orphanedOrders.map(o => o.id);
    console.log(`Deleting ${orphanIds.length} orders...`);
    
    // Delete in chunks if too many, but here we assume it's small
    const { error: dError } = await supabase
      .from('orders')
      .delete()
      .in('id', orphanIds);

    if (dError) {
      console.error('Error deleting orphaned orders:', dError);
    } else {
      console.log('Cleanup successful!');
    }
  } else {
    console.log('No orphaned orders found.');
  }
}

cleanup();
