const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration Values
const config = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://adxdfotbnvyrujyrmjhv.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeGRmb3RibnZ5cnVqeXJtamh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjM0NjYsImV4cCI6MjA3OTYzOTQ2Nn0.WKM3zz_s-IApag0ktOnzmH-5EryolVZMBXyfrRW4UuE',
    SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkeGRmb3RibnZ5cnVqeXJtamh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDA2MzQ2NiwiZXhwIjoyMDc5NjM5NDY2fQ.GxncQacTZUrDwXS4UefJH4hL0yoL6M1HWQKqvPvUWv0'
};

const envPath = path.join(__dirname, '..', '.env.local');

async function setup() {
    console.log('🛠️  Fixing .env.local file...');

    // 1. Create the file content
    const content = Object.entries(config)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    // 2. Write file with UTF-8 encoding
    try {
        fs.writeFileSync(envPath, content, 'utf8');
        console.log('✅ Successfully wrote .env.local');
    } catch (err) {
        console.error('❌ Failed to write file:', err.message);
        process.exit(1);
    }

    // 3. Verify connection
    console.log('\n🔌 Testing connection to Supabase...');

    const supabase = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    try {
        const { data, error } = await supabase.from('organizations').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Connection failed:', error.message);
            console.log('⚠️  The database might not be set up yet. Did you run the migration?');
        } else {
            console.log('✅ Connection SUCCESSFUL!');
            console.log('   Supabase is reachable and credentials are valid.');
            console.log('\n🚀 READY TO START!');
            console.log('   Please restart your server now:');
            console.log('   1. Press Ctrl+C to stop the current server');
            console.log('   2. Run: npm run dev');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
    }
}

setup();
