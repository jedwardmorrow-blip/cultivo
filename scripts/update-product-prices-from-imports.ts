import { createClient } from '@supabase/supabase-js';
import { Database } from './src/lib/database.types';

const supabaseUrl = 'https://fonreynkfeqywshijqpi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvbnJleW5rZmVxeXdzaGlqcXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjI3NzQsImV4cCI6MjA3NTYzODc3NH0.hNyNUziIrtRM_eMXNTZKYF0klV0kZHmpSfRXt6Qv2Po';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

const bulkPrices = [
  { sku: 'GAS-0001', pricePerGram: 2.20 },
  { sku: 'CHP-0001', pricePerGram: 2.20 },
  { sku: 'ZMK-0001', pricePerGram: 2.20 },
  { sku: 'GAP-0001', pricePerGram: 0.88 },
  { sku: 'WHB-0001', pricePerGram: 0.88 },
  { sku: 'CAP-0002', pricePerGram: 0.88 },
  { sku: 'LMD-0001', pricePerGram: 2.42 },
  { sku: 'MGM-0001', pricePerGram: 2.42 },
  { sku: 'PPB-0001', pricePerGram: 2.64 },
  { sku: 'CHB-0001', pricePerGram: 0.66 },
  { sku: 'RBI-0001', pricePerGram: 1.32 },
  { sku: 'BLP-0001', pricePerGram: 1.76 },
  { sku: 'FGF-0001', pricePerGram: 0.88 },
  { sku: 'SOD-0001', pricePerGram: 0.88 },
  { sku: 'THL-0001', pricePerGram: 0.88 },
  { sku: 'CZD-0001', pricePerGram: 0.88 },
  { sku: 'DD-0005', pricePerGram: 2.42 },
  { sku: 'ZCH-0001', pricePerGram: 1.76 },
  { sku: 'FGF-0006', pricePerGram: 0.88 },
  { sku: 'ZMK-0008', pricePerGram: 0.22 },
  { sku: 'DON-0006', pricePerGram: 0.22 },
  { sku: 'ZCH-0008', pricePerGram: 0.22 },
  { sku: 'LMD-0009', pricePerGram: 0.22 },
];

const packagedPrices = [
  { sku: 'DOG-0003', pricePerUnit: 17.50 },
  { sku: 'CHL-0003', pricePerUnit: 17.50 },
  { sku: 'ASU-0003', pricePerUnit: 17.50 },
  { sku: 'SWF-0003', pricePerUnit: 17.50 },
  { sku: 'GAS-0003', pricePerUnit: 17.50 },
  { sku: 'MGM-0002', pricePerUnit: 17.50 },
  { sku: 'ZMK-0003', pricePerUnit: 17.50 },
  { sku: 'CHP-0003', pricePerUnit: 17.50 },
  { sku: 'LMD-0003', pricePerUnit: 17.50 },
  { sku: 'THL-0003', pricePerUnit: 17.50 },
  { sku: 'RBI-0003', pricePerUnit: 17.50 },
  { sku: 'PPB-0003', pricePerUnit: 17.50 },
  { sku: 'ASU-0002', pricePerUnit: 50.00 },
  { sku: 'CHL-0002', pricePerUnit: 50.00 },
];

const prerollPrices = [
  { sku: '42792679', pricePerUnit: 4.00 },
  { sku: '02945696', pricePerUnit: 4.00 },
  { sku: '40382185', pricePerUnit: 4.00 },
  { sku: '59523373', pricePerUnit: 4.00 },
];

async function updateProductPrices() {
  console.log('Starting product price updates...\n');

  let bulkUpdated = 0;
  let packagedUpdated = 0;
  let prerollUpdated = 0;

  console.log('=== UPDATING BULK PRODUCT PRICES ===\n');
  for (const item of bulkPrices) {
    const pricePerPound = item.pricePerGram * 454;
    const roundedPrice = Math.ceil(pricePerPound / 100) * 100;

    console.log(`${item.sku}: $${item.pricePerGram}/g → $${pricePerPound.toFixed(2)}/lb → $${roundedPrice}/lb (rounded up)`);

    const { error } = await supabase
      .from('products')
      .update({
        price_per_unit: roundedPrice,
        pricing_unit: 'lb',
        product_category: 'bulk',
        allows_fractional_quantity: true
      })
      .eq('sku', item.sku);

    if (error) {
      console.error(`  Error updating ${item.sku}:`, error.message);
    } else {
      bulkUpdated++;
    }
  }

  console.log(`\n=== UPDATING PACKAGED PRODUCT PRICES ===\n`);
  for (const item of packagedPrices) {
    console.log(`${item.sku}: $${item.pricePerUnit}/unit`);

    const { error } = await supabase
      .from('products')
      .update({
        price_per_unit: item.pricePerUnit,
        pricing_unit: 'unit',
        product_category: 'packaged',
        allows_fractional_quantity: false
      })
      .eq('sku', item.sku);

    if (error) {
      console.error(`  Error updating ${item.sku}:`, error.message);
    } else {
      packagedUpdated++;
    }
  }

  console.log(`\n=== UPDATING PRE-ROLL PRODUCT PRICES ===\n`);
  for (const item of prerollPrices) {
    console.log(`${item.sku}: $${item.pricePerUnit}/unit`);

    const { error } = await supabase
      .from('products')
      .update({
        price_per_unit: item.pricePerUnit,
        pricing_unit: 'unit',
        product_category: 'preroll',
        allows_fractional_quantity: false
      })
      .eq('sku', item.sku);

    if (error) {
      console.error(`  Error updating ${item.sku}:`, error.message);
    } else {
      prerollUpdated++;
    }
  }

  console.log('\n=== SUMMARY ===\n');
  console.log(`Bulk products updated: ${bulkUpdated}/${bulkPrices.length}`);
  console.log(`Packaged products updated: ${packagedUpdated}/${packagedPrices.length}`);
  console.log(`Pre-roll products updated: ${prerollUpdated}/${prerollPrices.length}`);
  console.log(`\nTotal products updated: ${bulkUpdated + packagedUpdated + prerollUpdated}`);
  console.log('\nPrice update complete!');
}

updateProductPrices().catch(console.error);
