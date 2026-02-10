const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function inspect() {
    const { data, error } = await supabase.from('vulnerabilities').select('*').limit(1);
    if (!error) {
        const cols = Object.keys(data[0] || {});
        console.log('Columns:', cols);
        if (cols.includes('organization_id')) {
            console.log('Table "vulnerabilities" HAS organization_id');
        } else {
            console.log('Table "vulnerabilities" DOES NOT HAVE organization_id');
        }
    } else {
        console.error('Error:', error.message);
    }
}

inspect();
