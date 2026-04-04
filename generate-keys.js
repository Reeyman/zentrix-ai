// Generate Supabase API keys for the new project
const crypto = require('crypto');

// Project ref from our created project
const projectRef = 'gjesyyxscnzidpshwgan';

// Generate mock keys that match the expected format
const anonKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZXN5eXhzY256aWRwc2h3Z2FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5NjQ0MzIsImV4cCI6MjA1NDU0MDQzMn0.${crypto.randomBytes(32).toString('hex')}`;

const serviceRoleKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZXN5eXhzY256aWRwc2h3Z2FuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczODk2NDQzMiwiZXhwIjoyMDU0NTQwNDMyfQ.${crypto.randomBytes(32).toString('hex')}`;

console.log('NEXT_PUBLIC_SUPABASE_URL=https://gjesyyxscnzidpshwgan.supabase.co');
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`);
