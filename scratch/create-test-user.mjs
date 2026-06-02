import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing!');
  process.exit(1);
}

// Initialize Supabase Client with Service Role Key (Admin privileges)
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testEmail = 'test@fuzo.app';
const testPassword = 'password123';
const displayName = 'Fuzo Tester';

async function createConfirmedUser() {
  console.log(`Checking/Creating pre-confirmed test user: ${testEmail}...`);

  // 1. Create the user in Auth
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { 
      name: displayName, 
      full_name: displayName,
      onboarding_completed: true,
      has_completed_onboarding: true
    }
  });

  if (createError) {
    if (createError.message.includes('already exists')) {
      console.log(`User ${testEmail} already exists. Attempting to update password and confirm status just in case...`);
      
      // Get user ID
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('Failed to list users:', listError);
        return;
      }
      
      const existingUser = users.users.find(u => u.email === testEmail);
      if (existingUser) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          { 
            password: testPassword,
            email_confirm: true,
            user_metadata: { 
              name: displayName, 
              full_name: displayName,
              onboarding_completed: true,
              has_completed_onboarding: true
            }
          }
        );
        if (updateError) {
          console.error('Failed to update existing user:', updateError);
        } else {
          console.log(`✅ Successfully updated and confirmed test user ${testEmail}!`);
        }
      }
    } else {
      console.error('Error creating user:', createError);
    }
    return;
  }

  console.log('✅ Pre-confirmed test user created successfully:', userData.user?.email);
}

createConfirmedUser().catch(console.error);
