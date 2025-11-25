const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Manually load .env.local
console.log('🔍 Reading .env.local file...');
const envPath = path.join(__dirname, '..', '.env.local');

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            // Remove quotes and whitespace if present
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            envVars[key] = value;
        }
    });

    const url = envVars['NEXT_PUBLIC_SUPABASE_URL'];
    const key = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    // 2. Check if values exist and print debug info (masked)
    console.log('\n📋 Environment Variables Check:');
    console.log(`NEXT_PUBLIC_SUPABASE_URL:      ${url ? '✅ Found' : '❌ MISSING'}`);
    if (url) console.log(`   Value: ${url}`);

    console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${key ? '✅ Found' : '❌ MISSING'}`);
    if (key) console.log(`   Value: ${key.substring(0, 10)}...`);

    // 3. Check for common errors (spaces)
    if (url && url.startsWith(' ')) console.error('⚠️  WARNING: URL has leading space!');
    if (key && key.startsWith(' ')) console.error('⚠️  WARNING: Key has leading space!');

    if (!url || !key) {
        console.error('\n❌ Missing required environment variables. Please check .env.local');
        process.exit(1);
    }

    // 4. Try to create Supabase client
    console.log('\n🔌 Attempting to connect to Supabase...');
    const supabase = createClient(url, key);

    // 5. Test connection
    async function testConnection() {
        try {
            const { data, error } = await supabase.from('organizations').select('count', { count: 'exact', head: true });

            if (error) {
                console.error('❌ Connection failed with error:', error.message);
                console.error('   Hint: Check if your URL and Key are correct and if the database migration was run.');
            } else {
                console.log('✅ Connection SUCCESSFUL!');
                console.log('   Supabase is reachable and credentials are valid.');
            }
        } catch (err) {
            console.error('❌ Unexpected error:', err.message);
        }
    }

    testConnection();

} catch (err) {
    console.error('❌ Error reading .env.local:', err.message);
}
