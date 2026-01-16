import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface CustomerRecord {
  fullName: string;
  licenseName: string;
  licenseNumber: string;
  city: string;
  state: string;
  postalCode: string;
}

const csvData = `"Full name","Prefix","First name","Middle name","Last name","Suffix","ID","Code","MJ state ID","Status","City","State","Postal code","Phone","Email","Allotment Overriden"
Allgreens Dispensary,,Allgreens Dispensary,,,,2677542,#00000142ESIL74759395,#00000142ESIL74759395,Active,Sun City,AZ,85351,,,No
Arizona Natural Concepts - RJK Ventures,,Arizona Natural Concepts - RJK Ventures,,,,1573823,00000131DCYO00924714,00000131DCYO00924714,Active,Phoenix,AZ,85085,,,No
Arizona Organix,,Arizona Organix,,,,2632254,# 00000099DCPL00826691,# 00000099DCPL00826691,Active,Glendale,AZ,85301,,,No
Best Dispensary - Jamestown Center,Best Dispensary -,Jamestown Center,,,,1546884,00000046ESTW28902560,00000046ESTW28902560,Active,Mesa,AZ,85747,,,No
CULT Cannabis Co CULT Cannabis Co.,,CULT Cannabis Co,,CULT Cannabis Co.,,1262743,00000078DCBK00628996,00000078DCBK00628996,Active,Phoenix,AZ,85040,,,No
"FWA, INC (Farm Fresh)",,"FWA, INC (Farm Fresh)",,,,2676911,# 00000043DCBC00869823,# 00000043DCBC00869823,Active,Lake Havasu City,AZ,86403,,,No
Green Sky Patient Center Of Scottsdale,,Green Sky Patient Center Of Scottsdale,,,,1525711,00000081ESLT56066782,,Active,Scottsdale,AZ,85260,,,No
Hello Live Resin,,Hello Live Resin,,,,1534733,0000156ESTDP70697204,,Active,Phoenix,AZ,85027,,,No
High Grade,,High Grade,,,,1544025,00000077DCPS00216601,00000077DCPS00216601,Active,Phoenix,AZ,85034,,,No
Kind Meds - Kind Meds Inc,,Kind Meds - Kind Meds Inc,,,,1553139,00000078DCBK00628996,AZ,Active,Mesa,Az,85210,,Gabe@kindmedsaz.com,No
Nature Med - Arizona Golden Leaf Wellness,,Nature Med - Arizona Golden Leaf Wellness,,,,2656794,00000077DCPS00216601,00000077DCPS00216601,Active,Tucson,AZ,85743,,,No
Nature's Healing Center Inc,,Nature's Healing Center Inc,,,,1525721,00000085DCSC00371416,,Active,Phoenix,AZ,85008,,,No
Ponderosa Botanical Care Inc.,,Ponderosa Botanical Care Inc.,,,,2760419,00000066DCBO00410690,00000066DCBO00410690,Active,Chandler,AZ,85224,,,No
Prime Leaf at Park - Total Accountability Patient Care,,Prime Leaf at Park - Total Accountability Patient Care,,,,2589163,00000025DCPT00084389,00000025DCPT00084389,Active,Tucson,AZ,85719,,,No
Prime Leaf at Speedway- Rainbow Collective Inc,,Prime Leaf at Speedway- Rainbow Collective Inc,,,,2654179,00000039DCVR00320237,00000039DCVR00320237,Active,Tucson,AZ,85712,,,No
Sea of Green LLC (TruBliss Organics),,Sea of Green LLC (TruBliss Organics),,,,2674096,#00000113DCUX00454549,#00000113DCUX00454549,Active,Mesa,AZ,85212,,,No
Sol Flower - Kannaboost Technology Inc,,Sol Flower - Kannaboost Technology Inc,,,,2978699,00000118DCKD00426097,00000118DCKD00426097,Active,Tempe,Az,85281,,,No
Sticky Saguaro - Border Health,,Sticky Saguaro - Border Health,,,,1587475,00000022ESMC44584355,00000022ESMC44584355,Active,Chandler,Az,85249,,,No
Story 7th - Jungle Boys - Total Health & Wellness Inc,,Story 7th - Jungle Boys - Total Health & Wellness Inc,,,,2610607,EST # 00000060ESTV86857950 - DRC# 00000036DCOP0081,EST # 00000060ESTV86857950 - DRC# 00000036DCOP0081,Active,,,,,,No
"Story Bell - Pleasant Plants 1, LLC",,"Story Bell - Pleasant Plants 1, LLC",,,,1565110,0000159ESTFT57497963,0000159ESTFT57497963,Active,Glendale,AZ,85308,,,No
"Story Bullhead - Juicy Joint 1, LLC",,"Story Bullhead - Juicy Joint 1, LLC",,,,1570625,EST # 0000147ESTXX54706468,EST # 0000147ESTXX54706468,Active,Bullhead City,AZ,86442,,,No
"Story Dunlap - Arizona Natural Pain Solutions, Inc.",,"Story Dunlap - Arizona Natural Pain Solutions, Inc.",,,,1565854,,00000013DCOU00042197 / 00000096ESWI60030184,Active,Phoenix,AZ,85020,,,No
"Story Havasu - Curious Cultivators 1, LLC",,"Story Havasu - Curious Cultivators 1, LLC",,,,2620289,EST # 0000155ESTWD37312465,EST # 0000155ESTWD37312465,Active,Lake Havasu City,AZ,86403,,,No
"Story Litchfield - Joint Junkies I LLC - MCCSE29, LLC",,"Story Litchfield - Joint Junkies I LLC - MCCSE29, LLC",,,,2944220,#0000158ESTLH17620655 - #0000149ESTUL49249395,#0000158ESTLH17620655 - #0000149ESTUL49249395,Active,Litchfield Park,AZ,85340,,,No
"Story McDowell - Sixth Street Enterprises, Inc",,"Story McDowell - Sixth Street Enterprises, Inc",,,,1585074,DCR# 00000088DCXB00897085 EST#00000092ESKW00353670,DCR# 00000088DCXB00897085 EST#00000092ESKW00353670,Active,Phoenix,AZ,85009,,,No
"Story North Chandler - Total Health and Wellness, Inc.",,"Story North Chandler - Total Health and Wellness, Inc.",,,,1566249,DRC# 00000100DCWU00857159 EST#00000021ESQX24132908,DRC# 00000100DCWU00857159 EST#00000021ESQX24132908,Active,Chandler,AZ,85226,,,No
"Story South - MCCSE29, LLC",,"Story South - MCCSE29, LLC",,,,1585132,EST# 0000149ESTUL49249395,EST# 0000149ESTUL49249395,Active,Chandler,AZ,85248,,,No
Story South Chandler - MCCSE29 LLC,,Story South Chandler - MCCSE29 LLC,,,,1566289,EST#0000149ESTUL49249395,EST#0000149ESTUL49249395,Active,Chandler,AZ,85248,,,No
"Story Tolleson - Cannabis Research Group, Inc",,"Story Tolleson - Cannabis Research Group, Inc",,,,1565245,DRC# 00000055DCDA00381095 - EST# 00000104ESDH57805,DRC# 00000055DCDA00381095 - EST# 00000104ESDH57805,Active,Tolleson,AZ,85353,,,No
"Story Williams - Joint Junkies 1, LLC",,"Story Williams - Joint Junkies 1, LLC",,,,2613849,EST # 0000158ESTLH17620655,EST # 0000158ESTLH17620655,Active,Williams,AZ,86046,,,No
"Sunday Goods - Cardinal Square, INC",,"Sunday Goods - Cardinal Square, INC",,,,2588951,00000114DCPD00232092,00000114DCPD00232092,Active,Phoenix,AZ,85043,,,No
The Flower Shop - Nature's Healing Center Inc,,The Flower Shop - Nature's Healing Center Inc,,,,2588958,00000085DCSC00371416,00000085DCSC00371416,Active,Phoenix,AZ,85008,,,No
"The Prime Leaf - Speedway - Rainbow Collective, Inc.",,"The Prime Leaf - Speedway - Rainbow Collective, Inc.",,,,2589137,00000039DCVR00320237,00000039DCVR00320237,Active,Tucson,Az,85712,,,No
The Superior Dispensary,,The Superior Dispensary,,,,2677366,#00000065DCLV00799347,#00000065DCLV00799347,Active,Phoenix,AZ,85043,,,No
Tree Junky - Forever 46 Llc,,Tree Junky - Forever 46 Llc,,,,1589332,00000057DCHF00477864,00000057DCHF00477864,Active,TUCSON,AZ,85713,,,No
Trulieve Hub - Green Sky Patient Center of Scottsdale,Trulieve Hub -,Green Sky Patient Center of Scottsdale,,,,1547831,00000081ESLT56066782,00000081ESLT56066782,Active,Phoenix,AZ,85747,,,No`;

function parseCSV(csv: string): CustomerRecord[] {
  const lines = csv.split('\n').filter(line => line.trim());
  const records: CustomerRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const fullName = values[0] || '';
    const code = values[7] || '';
    const stateId = values[8] || '';
    const city = values[10] || '';
    const state = values[11] || '';
    const postalCode = values[12] || '';

    const licenseNumber = code || stateId;

    let licenseName = '';
    if (fullName.includes(' - ')) {
      const parts = fullName.split(' - ');
      licenseName = parts.slice(1).join(' - ').trim();
    }

    records.push({
      fullName,
      licenseName,
      licenseNumber,
      city,
      state,
      postalCode
    });
  }

  return records;
}

function normalizeCustomerName(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchCustomerName(csvName: string, dbName: string): boolean {
  const csvNormalized = normalizeCustomerName(csvName);
  const dbNormalized = normalizeCustomerName(dbName);

  if (csvNormalized === dbNormalized) return true;

  const csvFirstPart = csvNormalized.split(' ')[0];
  const dbFirstPart = dbNormalized.split(' ')[0];

  if (csvFirstPart.length > 3 && dbFirstPart.length > 3) {
    if (csvNormalized.includes(dbNormalized) || dbNormalized.includes(csvNormalized)) {
      return true;
    }
  }

  return false;
}

async function updateCustomers() {
  console.log('Fetching existing customers...');
  const { data: customers, error: fetchError } = await supabase
    .from('customers')
    .select('id, name, dispensary_code, license_name, license_number');

  if (fetchError) {
    console.error('Error fetching customers:', fetchError);
    return;
  }

  console.log(`Found ${customers?.length || 0} customers in database`);

  const records = parseCSV(csvData);
  console.log(`Parsed ${records.length} records from CSV`);

  let updated = 0;
  let notFound = 0;

  for (const record of records) {
    const customer = customers?.find(c => matchCustomerName(record.fullName, c.name));

    if (customer) {
      console.log(`\nMatching: "${record.fullName}" -> "${customer.name}"`);
      console.log(`  License Name: ${record.licenseName}`);
      console.log(`  License Number: ${record.licenseNumber}`);

      const { error: updateError } = await supabase
        .from('customers')
        .update({
          license_name: record.licenseName || null,
          license_number: record.licenseNumber || null,
          city: record.city || customer.name,
          state: record.state || null,
          postal_code: record.postalCode || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (updateError) {
        console.error(`  Error updating: ${updateError.message}`);
      } else {
        console.log(`  ✓ Updated`);
        updated++;
      }
    } else {
      console.log(`\n✗ Not found: "${record.fullName}"`);
      notFound++;
    }
  }

  console.log(`\n\nSummary:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Not found: ${notFound}`);
  console.log(`  Total processed: ${records.length}`);
}

updateCustomers().catch(console.error);
