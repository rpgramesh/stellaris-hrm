
// import { organizationService } from './src/services/organizationService';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Mock supabase client not needed if we import the service which uses the real one?
// Wait, we need to run this in node.
// organizationService imports @/lib/supabase which might fail in node if not configured.
// But we saw earlier that ts-node had issues resolving aliases.

// Let's copy the logic we just wrote into a test script to verify it runs without errors.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFix() {
  console.log('--- Verifying Fix ---');

  try {
      // 1. Fetch Departments with Branch relation
      console.log('Fetching departments...');
      let query = supabase
        .from('departments')
        .select(`
          *,
          branches (name)
        `)
        .order('name');

      const { data: departments, error } = await query;
      if (error) throw error;
      console.log(`Fetched ${departments.length} departments.`);

      // 2. Manual Join for Managers
      const managerIds = [...new Set(departments
        .map((d: any) => d.manager_id)
        .filter((id: any) => id)
      )] as string[];
      
      console.log(`Found ${managerIds.length} unique managers.`);

      let managersMap: Record<string, any> = {};

      if (managerIds.length > 0) {
        const { data: managers, error: managersError } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', managerIds);
          
        if (!managersError && managers) {
          managersMap = managers.reduce((acc: any, curr: any) => {
            acc[curr.id] = curr;
            return acc;
          }, {});
          console.log('Managers fetched successfully.');
        } else {
          console.warn('Failed to fetch manager details:', managersError);
        }
      }

      // 3. Map and Merge Data
      const result = departments.map((d: any) => {
        const manager = d.manager_id ? managersMap[d.manager_id] : null;
        return {
          id: d.id,
          name: d.name,
          branchId: d.branch_id || null,
          branchName: d.branches?.name || null,
          managerId: d.manager_id || null,
          managerName: manager ? `${manager.first_name} ${manager.last_name}` : null,
          location: d.location
        };
      });
      
      console.log('Final mapped result sample:', JSON.stringify(result[0], null, 2));

  } catch (err: any) {
    console.error('Error in verification:', err);
  }
}

verifyFix();
