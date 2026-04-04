// Test script pentru verificarea conexiunii Supabase
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testare conexiune Supabase...');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Service Role exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('organizations').select('count');
    
    if (error) {
      console.error('❌ Eroare:', error.message);
    } else {
      console.log('✅ Conexiune reușită!');
    }
  } catch (err) {
    console.error('❌ Eroare generală:', err.message);
  }
}

testConnection();
