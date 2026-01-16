import { createClient } from '@supabase/supabase-js';
import { Database } from './src/lib/database.types';

const supabaseUrl = 'https://fonreynkfeqywshijqpi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvbnJleW5rZmVxeXdzaGlqcXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNjI3NzQsImV4cCI6MjA3NTYzODc3NH0.hNyNUziIrtRM_eMXNTZKYF0klV0kZHmpSfRXt6Qv2Po';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

type Product = Database['public']['Tables']['products']['Row'];

interface ConversionReport {
  productName: string;
  category: string;
  oldPricePerGram: number;
  newPricePerPound: number;
  pricingUnit: string;
  allowsFractional: boolean;
}

async function convertBulkProductPricing() {
  console.log('Starting bulk product pricing conversion...\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('product_category', 'bulk');

  if (error) {
    console.error('Error fetching bulk products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('No bulk products found to convert.');
    return;
  }

  console.log(`Found ${products.length} bulk products to convert.\n`);

  const conversionReport: ConversionReport[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const oldPricePerGram = product.price_per_unit;

    const calculatedPricePerPound = oldPricePerGram * 454;

    const newPricePerPound = Math.ceil(calculatedPricePerPound / 100) * 100;

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          price_per_unit: newPricePerPound,
          pricing_unit: 'lb',
          allows_fractional_quantity: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`Error updating product ${product.name}:`, updateError);
        errorCount++;
        continue;
      }

      conversionReport.push({
        productName: product.name,
        category: product.product_category,
        oldPricePerGram: oldPricePerGram,
        newPricePerPound: newPricePerPound,
        pricingUnit: 'lb',
        allowsFractional: true
      });

      successCount++;
    } catch (err) {
      console.error(`Error processing product ${product.name}:`, err);
      errorCount++;
    }
  }

  console.log('\n=== CONVERSION REPORT ===\n');
  console.log(`Total Products Processed: ${products.length}`);
  console.log(`Successfully Converted: ${successCount}`);
  console.log(`Errors: ${errorCount}\n`);

  console.log('Detailed Conversion Report:');
  console.log('─'.repeat(120));
  console.log(
    'Product Name'.padEnd(50) +
    'Old ($/g)'.padEnd(15) +
    'Calculated'.padEnd(15) +
    'New ($/lb)'.padEnd(15) +
    'Category'.padEnd(15) +
    'Fractional'
  );
  console.log('─'.repeat(120));

  conversionReport.forEach(item => {
    const calculated = (item.oldPricePerGram * 454).toFixed(2);
    console.log(
      item.productName.substring(0, 48).padEnd(50) +
      `$${item.oldPricePerGram.toFixed(2)}`.padEnd(15) +
      `$${calculated}`.padEnd(15) +
      `$${item.newPricePerPound.toFixed(2)}`.padEnd(15) +
      item.category.padEnd(15) +
      (item.allowsFractional ? 'Yes' : 'No')
    );
  });

  console.log('─'.repeat(120));
  console.log('\n=== SUMMARY BY PRICE RANGE ===\n');

  const priceRanges = {
    'Under $500': conversionReport.filter(p => p.newPricePerPound < 500).length,
    '$500-$1000': conversionReport.filter(p => p.newPricePerPound >= 500 && p.newPricePerPound < 1000).length,
    '$1000-$1500': conversionReport.filter(p => p.newPricePerPound >= 1000 && p.newPricePerPound < 1500).length,
    '$1500+': conversionReport.filter(p => p.newPricePerPound >= 1500).length,
  };

  Object.entries(priceRanges).forEach(([range, count]) => {
    console.log(`${range}: ${count} products`);
  });

  console.log('\n=== NEXT STEPS ===\n');
  console.log('1. Review the conversion report above');
  console.log('2. Verify that the rounded prices are acceptable');
  console.log('3. Test order creation with the new pricing');
  console.log('4. Check existing orders to ensure they display correctly');
  console.log('\nConversion complete!');
}

convertBulkProductPricing().catch(console.error);
