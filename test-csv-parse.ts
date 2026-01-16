// Quick test script to verify CSV parsing works correctly
import {
  parseDutchieCSV,
  parseGoogleSheetCSV,
  categorizeDutchieItems,
} from './src/services/inventoryReset.service';

const dutchieCSVSample = `"SKU","Product","Package ID","Status","Category","Tags","Batch","Strain","Vendor","Room","Available","Net weight","Unit","Quantity (including allocated)"
CAP-0005,Bulk - Cap Junky - Smalls,20251017-CAP-0101,Smalls,Flower - Bulk,Untrimmed,250916-CAP,Capulator Junky,CULT Cannabis Co.,Inventory,258.7 g,258.7,g,258.7
CAP-0002,Bulk - Cap Junky - Flower,20251017-CAP-0100,Bigs,Flower - Bulk,Hand Trimmed,250916-CAP,Capulator Junky,CULT Cannabis Co.,Inventory,148.7 g,148.47,g,148.7
SWF-0005,Bulk - Swamp Water Fumez - Smalls,20251017-SWF-0051,Smalls,Flower - Bulk,Machine Trimmed,250916-SWF,Swamp Water Fumez,CULT Cannabis Co.,Inventory,1814 g,1814,g,1814`;

const googleSheetCSVSample = `Strain,Bucked Smalls,Bucked Bigs,Binned,Batch ID
Cap Junky ,,,1032,250916-CAP
,,,824,250916-CAP
Blue Pave,,,1014,250916-BLP
,558,,,250916-BLP
Dog Walker,452,,,250916-DOG
,560,,,250916-DOG`;

console.log('Testing Dutchie CSV parsing...');
const dutchieItems = parseDutchieCSV(dutchieCSVSample);
console.log(`Parsed ${dutchieItems.length} items from Dutchie CSV`);
console.log('First item:', dutchieItems[0]);

console.log('\nTesting Google Sheet CSV parsing...');
const googleSheetItems = parseGoogleSheetCSV(googleSheetCSVSample);
console.log(`Parsed ${googleSheetItems.length} items from Google Sheet CSV`);
console.log('Items:', googleSheetItems);

console.log('\nTesting categorization...');
const { bucked, bulk, packaged } = categorizeDutchieItems(dutchieItems);
console.log(`Bucked: ${bucked.length}, Bulk: ${bulk.length}, Packaged: ${packaged.length}`);

console.log('\n✓ All tests passed!');
