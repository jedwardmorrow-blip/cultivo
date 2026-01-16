import { createClient } from '@supabase/supabase-js';
import { Database } from './src/lib/database.types';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Customer data from CSV
const customerData = [
  { name: 'Allgreens Dispensary', code: '#00000142ESIL74759395', mjStateId: '#00000142ESIL74759395', city: 'Sun City', state: 'AZ', postalCode: '85351' },
  { name: 'Arizona Natural Concepts - RJK Ventures', code: '00000131DCYO00924714', mjStateId: '00000131DCYO00924714', city: 'Phoenix', state: 'AZ', postalCode: '85085' },
  { name: 'Arizona Organix', code: '# 00000099DCPL00826691', mjStateId: '# 00000099DCPL00826691', city: 'Glendale', state: 'AZ', postalCode: '85301' },
  { name: 'Best Dispensary - Jamestown Center', code: '00000046ESTW28902560', mjStateId: '00000046ESTW28902560', city: 'Mesa', state: 'AZ', postalCode: '85747' },
  { name: 'CULT Cannabis Co CULT Cannabis Co.', code: '00000078DCBK00628996', mjStateId: '00000078DCBK00628996', city: 'Phoenix', state: 'AZ', postalCode: '85040' },
  { name: 'FWA, INC (Farm Fresh)', code: '# 00000043DCBC00869823', mjStateId: '# 00000043DCBC00869823', city: 'Lake Havasu City', state: 'AZ', postalCode: '86403' },
  { name: 'Green Sky Patient Center Of Scottsdale', code: '00000081ESLT56066782', mjStateId: '', city: 'Scottsdale', state: 'AZ', postalCode: '85260' },
  { name: 'Hello Live Resin', code: '0000156ESTDP70697204', mjStateId: '', city: 'Phoenix', state: 'AZ', postalCode: '85027' },
  { name: 'High Grade', code: '00000077DCPS00216601', mjStateId: '00000077DCPS00216601', city: 'Phoenix', state: 'AZ', postalCode: '85034' },
  { name: 'Kind Meds - Kind Meds Inc', code: '00000078DCBK00628996', mjStateId: 'AZ', city: 'Mesa', state: 'Az', postalCode: '85210' },
  { name: 'Nature Med - Arizona Golden Leaf Wellness', code: '00000077DCPS00216601', mjStateId: '00000077DCPS00216601', city: 'Tucson', state: 'AZ', postalCode: '85743' },
  { name: "Nature's Healing Center Inc", code: '00000085DCSC00371416', mjStateId: '', city: 'Phoenix', state: 'AZ', postalCode: '85008' },
  { name: 'Ponderosa Botanical Care Inc.', code: '00000066DCBO00410690', mjStateId: '00000066DCBO00410690', city: 'Chandler', state: 'AZ', postalCode: '85224' },
  { name: 'Prime Leaf at Park - Total Accountability Patient Care', code: '00000025DCPT00084389', mjStateId: '00000025DCPT00084389', city: 'Tucson', state: 'AZ', postalCode: '85719' },
  { name: 'Prime Leaf at Speedway- Rainbow Collective Inc', code: '00000039DCVR00320237', mjStateId: '00000039DCVR00320237', city: 'Tucson', state: 'AZ', postalCode: '85712' },
  { name: 'Sea of Green LLC (TruBliss Organics)', code: '#00000113DCUX00454549', mjStateId: '#00000113DCUX00454549', city: 'Mesa', state: 'AZ', postalCode: '85212' },
  { name: 'Sol Flower - Kannaboost Technology Inc', code: '00000118DCKD00426097', mjStateId: '00000118DCKD00426097', city: 'Tempe', state: 'Az', postalCode: '85281' },
  { name: 'Sticky Saguaro - Border Health', code: '00000022ESMC44584355', mjStateId: '00000022ESMC44584355', city: 'Chandler', state: 'Az', postalCode: '85249' },
  { name: 'Story 7th - Jungle Boys - Total Health & Wellness Inc', code: 'EST # 00000060ESTV86857950 - DRC# 00000036DCOP0081', mjStateId: 'EST # 00000060ESTV86857950 - DRC# 00000036DCOP0081', city: '', state: '', postalCode: '' },
  { name: 'Story Bell - Pleasant Plants 1, LLC', code: '0000159ESTFT57497963', mjStateId: '0000159ESTFT57497963', city: 'Glendale', state: 'AZ', postalCode: '85308' },
  { name: 'Story Bullhead - Juicy Joint 1, LLC', code: 'EST # 0000147ESTXX54706468', mjStateId: 'EST # 0000147ESTXX54706468', city: 'Bullhead City', state: 'AZ', postalCode: '86442' },
  { name: 'Story Dunlap - Arizona Natural Pain Solutions, Inc.', code: '', mjStateId: '00000013DCOU00042197 / 00000096ESWI60030184', city: 'Phoenix', state: 'AZ', postalCode: '85020' },
  { name: 'Story Havasu - Curious Cultivators 1, LLC', code: 'EST # 0000155ESTWD37312465', mjStateId: 'EST # 0000155ESTWD37312465', city: 'Lake Havasu City', state: 'AZ', postalCode: '86403' },
  { name: 'Story Litchfield - Joint Junkies I LLC - MCCSE29, LLC', code: '#0000158ESTLH17620655 - #0000149ESTUL49249395', mjStateId: '#0000158ESTLH17620655 - #0000149ESTUL49249395', city: 'Litchfield Park', state: 'AZ', postalCode: '85340' },
  { name: 'Story McDowell - Sixth Street Enterprises, Inc', code: 'DCR# 00000088DCXB00897085 EST#00000092ESKW00353670', mjStateId: 'DCR# 00000088DCXB00897085 EST#00000092ESKW00353670', city: 'Phoenix', state: 'AZ', postalCode: '85009' },
  { name: 'Story North Chandler - Total Health and Wellness, Inc.', code: 'DRC# 00000100DCWU00857159 EST#00000021ESQX24132908', mjStateId: 'DRC# 00000100DCWU00857159 EST#00000021ESQX24132908', city: 'Chandler', state: 'AZ', postalCode: '85226' },
  { name: 'Story South - MCCSE29, LLC', code: 'EST# 0000149ESTUL49249395', mjStateId: 'EST# 0000149ESTUL49249395', city: 'Chandler', state: 'AZ', postalCode: '85248' },
  { name: 'Story South Chandler - MCCSE29 LLC', code: 'EST#0000149ESTUL49249395', mjStateId: 'EST#0000149ESTUL49249395', city: 'Chandler', state: 'AZ', postalCode: '85248' },
  { name: 'Story Tolleson - Cannabis Research Group, Inc', code: 'DRC# 00000055DCDA00381095 - EST# 00000104ESDH57805', mjStateId: 'DRC# 00000055DCDA00381095 - EST# 00000104ESDH57805', city: 'Tolleson', state: 'AZ', postalCode: '85353' },
  { name: 'Story Williams - Joint Junkies 1, LLC', code: 'EST # 0000158ESTLH17620655', mjStateId: 'EST # 0000158ESTLH17620655', city: 'Williams', state: 'AZ', postalCode: '86046' },
  { name: 'Sunday Goods - Cardinal Square, INC', code: '00000114DCPD00232092', mjStateId: '00000114DCPD00232092', city: 'Phoenix', state: 'AZ', postalCode: '85043' },
  { name: 'The Flower Shop - Nature\'s Healing Center Inc', code: '00000085DCSC00371416', mjStateId: '00000085DCSC00371416', city: 'Phoenix', state: 'AZ', postalCode: '85008' },
  { name: 'The Prime Leaf - Speedway - Rainbow Collective, Inc.', code: '00000039DCVR00320237', mjStateId: '00000039DCVR00320237', city: 'Tucson', state: 'Az', postalCode: '85712' },
  { name: 'The Superior Dispensary', code: '#00000065DCLV00799347', mjStateId: '#00000065DCLV00799347', city: 'Phoenix', state: 'AZ', postalCode: '85043' },
  { name: 'Tree Junky - Forever 46 Llc', code: '00000057DCHF00477864', mjStateId: '00000057DCHF00477864', city: 'TUCSON', state: 'AZ', postalCode: '85713' },
  { name: 'Trulieve Hub - Green Sky Patient Center of Scottsdale', code: '00000081ESLT56066782', mjStateId: '00000081ESLT56066782', city: 'Phoenix', state: 'AZ', postalCode: '85747' },
];

async function updateCustomers() {
  console.log('Starting customer update...');

  // Get all existing customers
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, name');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  // Manual mapping between CSV names and database names
  const nameMapping: Record<string, string> = {
    'Allgreens Dispensary': 'All Greens',
    'Arizona Natural Concepts - RJK Ventures': 'ANC',
    'Best Dispensary - Jamestown Center': 'The Best Dispensary',
    'Prime Leaf at Park - Total Accountability Patient Care': 'Prime at Park',
    'Prime Leaf at Speedway- Rainbow Collective Inc': 'Prime at Speedway',
    'The Prime Leaf - Speedway - Rainbow Collective, Inc.': 'Prime at Speedway',
    'Sea of Green LLC (TruBliss Organics)': 'Sea of Green LLC',
    'Sol Flower - Kannaboost Technology Inc': 'Sol Flower',
    'Sticky Saguaro - Border Health': 'Sticky Saguaro',
    'Story 7th - Jungle Boys - Total Health & Wellness Inc': 'Story - 7th Ave',
    'Story Bell - Pleasant Plants 1, LLC': 'Story - Bell',
    'Story Bullhead - Juicy Joint 1, LLC': 'Story - Bullhead City',
    'Story Dunlap - Arizona Natural Pain Solutions, Inc.': 'Story - Dunlap',
    'Story Havasu - Curious Cultivators 1, LLC': 'Story - Havasu',
    'Story Litchfield - Joint Junkies I LLC - MCCSE29, LLC': 'Story - South Chandler',
    'Story McDowell - Sixth Street Enterprises, Inc': 'Story - McDowell',
    'Story North Chandler - Total Health and Wellness, Inc.': 'Story - North Chandler',
    'Story South - MCCSE29, LLC': 'Story - South Chandler',
    'Story South Chandler - MCCSE29 LLC': 'Story - South Chandler',
    'Story Tolleson - Cannabis Research Group, Inc': 'Story - Tolleson',
    'Story Williams - Joint Junkies 1, LLC': 'Story - Williams',
    'Sunday Goods - Cardinal Square, INC': 'Sunday Goods',
    'The Flower Shop - Nature\'s Healing Center Inc': 'The Flower Shop',
    'The Superior Dispensary': 'Superior Dispensary',
    'Tree Junky - Forever 46 Llc': 'Trulieve',
    'Trulieve Hub - Green Sky Patient Center of Scottsdale': 'Trulieve',
  };

  // Create a map for customer lookup
  const customerMap = new Map<string, string>();
  customers.forEach(c => {
    customerMap.set(c.name.toLowerCase().trim(), c.id);
  });

  // Helper function to find customer by name
  function findCustomerId(name: string): string | undefined {
    // Check mapping first
    const mappedName = nameMapping[name];
    if (mappedName) {
      const normalized = mappedName.toLowerCase().trim();
      if (customerMap.has(normalized)) {
        return customerMap.get(normalized);
      }
    }

    // Try exact match
    const normalized = name.toLowerCase().trim();
    if (customerMap.has(normalized)) {
      return customerMap.get(normalized);
    }

    return undefined;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const customer of customerData) {
    const customerId = findCustomerId(customer.name);

    if (!customerId) {
      console.log(`Skipping customer: ${customer.name} - not found in database`);
      skippedCount++;
      continue;
    }

    // Use Code column if available, otherwise use MJ state ID
    const atoNumber = customer.code || customer.mjStateId;

    // Build address from city, state, postal code
    const addressParts = [customer.city, customer.state, customer.postalCode].filter(p => p);
    const address = addressParts.join(', ');

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          ato_number: atoNumber || null,
          city: customer.city || null,
          state: customer.state || null,
          postal_code: customer.postalCode || null,
          address: address || null,
        })
        .eq('id', customerId);

      if (error) {
        console.error(`Error updating customer ${customer.name}:`, error);
        skippedCount++;
      } else {
        console.log(`Updated: ${customer.name}`);
        updatedCount++;
      }
    } catch (error) {
      console.error(`Exception updating customer ${customer.name}:`, error);
      skippedCount++;
    }
  }

  console.log(`\nUpdate complete! Updated: ${updatedCount}, Skipped: ${skippedCount}`);
}

updateCustomers().catch(console.error);
