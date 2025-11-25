const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://adxdfotbnvyrujyrmjhv.supabase.co';
const supabaseKey = 'sbp_2569732535f7dc50f9912ca114ba1cd4c6976e1e';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('📦 Reading migration file...');
    const sql = fs.readFileSync('./supabase/migrations/001_initial_schema.sql', 'utf8');

    console.log('🚀 Executing database migration...');
    console.log('This will create:');
    console.log('  - Enums (member_role, activity_type)');
    console.log('  - Tables (organizations, organization_members, teams, team_members, activity_logs)');
    console.log('  - Indexes for performance');
    console.log('  - RLS policies for security');
    console.log('  - Triggers for timestamps');
    console.log('');

    try {
        // Execute the SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

        if (error) {
            console.error('❌ Migration failed:', error.message);
            console.log('\n⚠️  You need to run this SQL manually in Supabase dashboard:');
            console.log('1. Go to https://supabase.com/dashboard/project/adxdfotbnvyrujyrmjhv/sql');
            console.log('2. Click "New Query"');
            console.log('3. Copy the SQL from supabase/migrations/001_initial_schema.sql');
            console.log('4. Paste and click "Run"');
            process.exit(1);
        }

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('  1. Run: npm run dev');
        console.log('  2. Open: http://localhost:3000');
        console.log('  3. Sign up to create your first organization');

    } catch (err) {
        console.error('❌ Error:', err.message);
        console.log('\n⚠️  Please run the migration manually in Supabase dashboard:');
        console.log('1. Go to https://supabase.com/dashboard/project/adxdfotbnvyrujyrmjhv/sql');
        console.log('2. Click "New Query"');
        console.log('3. Copy the SQL from supabase/migrations/001_initial_schema.sql');
        console.log('4. Paste and click "Run"');
    }
}

runMigration();
