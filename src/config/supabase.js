const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });



const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('WARNING: SUPABASE_URL or SUPABASE_KEY is missing from environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl || 'https://zvokizlnpjspsglezxjo.supabase.co', supabaseKey || 'sb_publishable_BnAJczHuf_9utRb-i6VtQg_plgibyjg');

module.exports = supabase;