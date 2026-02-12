
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { organizationService } from './src/services/organizationService';
import { supabase } from './src/lib/supabase';

// Mock performance.now for Node environment if needed
if (typeof performance === 'undefined') {
    (global as any).performance = { now: () => Date.now() };
}

async function testHierarchy() {
    console.log('--- Testing Organization Hierarchy Loading ---');
    try {
        const result = await organizationService.getOrganizationHierarchy();
        
        console.log('\nStats:');
        console.log(JSON.stringify(result.stats, null, 2));

        console.log('\nHierarchy Structure (Sample):');
        // Print first branch to see structure
        if (result.hierarchy.length > 0) {
            const sample = result.hierarchy[0];
            console.log(`Branch: ${sample.name} (${sample.id})`);
            console.log(`  Departments: ${sample.departments.length}`);
            if (sample.departments.length > 0) {
                const dept = sample.departments[0];
                console.log(`    Dept: ${dept.name} (${dept.id})`);
                console.log(`      Managers: ${dept.managers.length}`);
                if (dept.managers.length > 0) {
                    console.log(`        Manager: ${dept.managers[0].fullName}`);
                }
            }
        } else {
            console.log('No branches found.');
        }

        console.log('\n--- Testing Validation ---');
        // Pick valid IDs if available
        if (result.hierarchy.length > 0 && result.hierarchy[0].departments.length > 0) {
            const branchId = result.hierarchy[0].id;
            const deptId = result.hierarchy[0].departments[0].id;
            
            console.log(`Validating Branch ${branchId} -> Dept ${deptId}...`);
            const validResult = await organizationService.validateHierarchy(branchId, deptId);
            console.log('Result:', validResult);

            console.log(`Validating Branch ${branchId} -> Invalid Dept...`);
            const invalidResult = await organizationService.validateHierarchy(branchId, '00000000-0000-0000-0000-000000000000');
            console.log('Result:', invalidResult);
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testHierarchy();
