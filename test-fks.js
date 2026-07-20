const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://txcivsdgjkmlrjxramos.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ');

async function test() {
  const { data, error } = await supabase.rpc('get_foreign_keys');
  console.log('Error:', error);
  // Without RPC, we can just fetch all tables and see if we can find references.
  // Actually, we can just fetch from 'khoxe' where so_don_hang = 'some_order'
  
}
test();
