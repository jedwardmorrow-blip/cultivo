import { createClient } from '@supabase/supabase-js';
import { Database } from './src/lib/database.types';

/**
 * Historical Order Import Script
 *
 * This script imports historical orders from Dutchie to maintain sales records.
 * It's safe to re-run this script - duplicate orders will be skipped automatically.
 *
 * Orders are marked with: internal_notes = "Imported from Dutchie (Invoice #XX)"
 *
 * Usage:
 *   npx tsx scripts/import-orders.ts
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Open orders data (October orders only)
const openOrders = [
  {
    invoiceNum: '60',
    title: 'TJK250926',
    customer: 'Tree Junky',
    startDate: '09/26/2025',
    items: [
      { product: 'Bulk - Georgia Apple Pie - Flower', sku: 'GAP-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - White Burgundy - Flower', sku: 'WHB-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cap Junky - Flower', sku: 'CAP-0002', price: 0.88, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '69',
    title: 'ANC251007',
    customer: 'ANC',
    startDate: '10/07/2025',
    items: [
      { product: 'Bulk - Gas Face - Flower', sku: 'GAS-0001', price: 2.20, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cherry Paloma - Flower', sku: 'CHP-0001', price: 2.20, quantity: 454, unit: 'g' },
      { product: 'Bulk - Z Marker - Flower', sku: 'ZMK-0001', price: 2.20, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '71',
    title: 'TBD100925',
    customer: 'The Best Dispensary',
    startDate: '10/09/2025',
    items: [
      { product: 'Packaged - Dog Walker - Flower 3.5g', sku: 'DOG-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Flower 3.5g', sku: 'CHL-0003', price: 17.50, quantity: 32, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '75',
    title: 'Sol-251014',
    customer: 'Sol Flower',
    startDate: '10/14/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 17.50, quantity: 864, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '72',
    title: 'SUP251009',
    customer: 'The Superior Dispensary',
    startDate: '10/09/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Swamp Water Fumez - Flower 3.5g', sku: 'SWF-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Flower 3.5g', sku: 'CHL-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Dog Walker - Flower 3.5g', sku: 'DOG-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Pre-Roll - Lemondary - 1g', sku: '42792679', price: 4.00, quantity: 10, unit: 'qty' },
      { product: 'Pre-Roll - Cherry Paloma - 1g', sku: '02945696', price: 4.00, quantity: 20, unit: 'qty' },
      { product: 'Pre-Roll - Z Marker - 1g', sku: '40382185', price: 4.00, quantity: 10, unit: 'qty' },
      { product: 'Pre-Roll - Tahoe Larry - 1g', sku: '59523373', price: 4.00, quantity: 10, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '74',
    title: 'AZO251010',
    customer: 'Arizona Organix',
    startDate: '10/10/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 12.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Dog Walker - Flower 3.5g', sku: 'DOG-0003', price: 12.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Swamp Water Fumez - Flower 3.5g', sku: 'SWF-0003', price: 12.50, quantity: 32, unit: 'qty' }
    ]
  }
];

// Completed orders data (September-October 2025)
const completedOrders = [
  {
    invoiceNum: '39',
    title: 'NMD-250821',
    customer: 'Nature Med',
    startDate: '08/21/2025',
    completedDate: '10/06/2025',
    items: [
      { product: 'Packaged - Cherry Paloma - Flower 3.5g', sku: 'CHP-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Lemondary - Flower 3.5g', sku: 'LMD-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Tahoe Larry - Flower 3.5g', sku: 'THL-0003', price: 17.50, quantity: 64, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '41',
    title: 'TBD250829',
    customer: 'The Best Dispensary',
    startDate: '08/28/2025',
    completedDate: '09/01/2025',
    items: [
      { product: 'Packaged - Gas Face - Flower 3.5g', sku: 'GAS-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Magic Marker - Flower 3.5g', sku: 'MGM-0002', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Z Marker - Flower 3.5g', sku: 'ZMK-0003', price: 17.50, quantity: 32, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '68',
    title: 'NMD251008',
    customer: 'Nature Med',
    startDate: '10/08/2025',
    completedDate: '10/09/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Flower 3.5g', sku: 'CHL-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Dog Walker - Flower 3.5g', sku: 'DOG-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Swamp Water Fumez - Flower 3.5g', sku: 'SWF-0003', price: 17.50, quantity: 64, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '70',
    title: 'STO251008',
    customer: 'Story - Litchfield',
    startDate: '10/08/2025',
    completedDate: '10/09/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Smalls 14g', sku: 'ASU-0002', price: 50.00, quantity: 30, unit: 'qty' },
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Smalls 14g', sku: 'CHL-0002', price: 50.00, quantity: 20, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Flower 3.5g', sku: 'CHL-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Dog Walker - Flower 3.5g', sku: 'DOG-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Peanut Butter Breath - Flower 3.5g', sku: 'PPB-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Swamp Water Fumez - Flower 3.5g', sku: 'SWF-0003', price: 17.50, quantity: 64, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '42',
    title: 'SOG25',
    customer: 'Sea of Green LLC (TruBliss Organics)',
    startDate: '08/28/2025',
    completedDate: '09/01/2025',
    items: [
      { product: 'Packaged - Cherry Paloma - Flower 3.5g', sku: 'CHP-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Lemondary - Flower 3.5g', sku: 'LMD-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Rainbow Inferno - Flower 3.5g', sku: 'RBI-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Z Marker - Flower 3.5g', sku: 'ZMK-0003', price: 17.50, quantity: 64, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '43',
    title: 'FWA250829',
    customer: 'FWA, INC (Farm Fresh)',
    startDate: '08/29/2025',
    completedDate: '09/02/2025',
    items: [
      { product: 'Bulk - Gas Face - Flower', sku: 'GAS-0001', price: 2.64, quantity: 454, unit: 'g' },
      { product: 'Bulk - Gas Face - Flower', sku: 'GAS-0001', price: 2.64, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 2.64, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 2.64, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 2.09, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 2.09, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 2.64, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 2.64, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '44',
    title: 'PLP250829-01',
    customer: 'Prime Leaf at Park - Total Accountability Patient Care',
    startDate: '08/29/2025',
    completedDate: '09/02/2025',
    items: [
      { product: 'Packaged - Gas Face - Flower 3.5g', sku: 'GAS-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Magic Marker - Flower 3.5g', sku: 'MGM-0002', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Rainbow Inferno - Flower 3.5g', sku: 'RBI-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Z Marker - Flower 3.5g', sku: 'ZMK-0003', price: 17.50, quantity: 32, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '45',
    title: 'PLS250829-02',
    customer: 'Prime Leaf at Speedway- Rainbow Collective Inc',
    startDate: '08/29/2025',
    completedDate: '09/02/2025',
    items: [
      { product: 'Packaged - Gas Face - Flower 3.5g', sku: 'GAS-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Magic Marker - Flower 3.5g', sku: 'MGM-0002', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Rainbow Inferno - Flower 3.5g', sku: 'RBI-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Z Marker - Flower 3.5g', sku: 'ZMK-0003', price: 17.50, quantity: 32, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '47',
    title: 'AG250829',
    customer: 'Allgreens Dispensary',
    startDate: '08/29/2025',
    completedDate: '09/02/2025',
    items: [
      { product: 'Packaged - Cherry Paloma - Flower 3.5g', sku: 'CHP-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Lemondary - Flower 3.5g', sku: 'LMD-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Magic Marker - Flower 3.5g', sku: 'MGM-0002', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Z Marker - Flower 3.5g', sku: 'ZMK-0003', price: 17.50, quantity: 32, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '48',
    title: 'TJK-250829',
    customer: 'Tree Junky',
    startDate: '08/29/2025',
    completedDate: '09/04/2025',
    items: [
      { product: 'Bulk - Chembanger - Flower', sku: 'CHB-0001', price: 0.66, quantity: 454, unit: 'g' },
      { product: 'Bulk - Chembanger - Flower', sku: 'CHB-0001', price: 0.66, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 0.66, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 1.46, quantity: 205.3, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 1.13, quantity: 265.4, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.32, quantity: 454, unit: 'g' },
      { product: 'Bulk - White Burgundy - Flower', sku: 'WHB-0001', price: 0.66, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '49',
    title: 'TRU250901',
    customer: 'Trulieve Hub - Green Sky Patient Center of Scottsdale',
    startDate: '09/01/2025',
    completedDate: '09/02/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Smalls 14g', sku: 'ASU-0002', price: 40.00, quantity: 160, unit: 'qty' },
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 17.50, quantity: 352, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Smalls 14g', sku: 'CHL-0002', price: 40.00, quantity: 10, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '51',
    title: 'SOG250911',
    customer: 'Sea of Green LLC (TruBliss Organics)',
    startDate: '09/11/2025',
    completedDate: '09/15/2025',
    items: [
      { product: 'Packaged - Cherry Paloma - Flower 3.5g', sku: 'CHP-0003', price: 17.50, quantity: 32, unit: 'qty' },
      { product: 'Packaged - Gas Face - Flower 3.5g', sku: 'GAS-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Rainbow Inferno - Flower 3.5g', sku: 'RBI-0003', price: 17.50, quantity: 64, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '52',
    title: 'TFS250916',
    customer: 'The Flower Shop - Nature\'s Healing Center Inc',
    startDate: '09/16/2025',
    completedDate: '09/17/2025',
    items: [
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 2.42, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 2.42, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 2.42, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 2.42, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 2.42, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 2.42, quantity: 454, unit: 'g' },
      { product: 'Bulk - Devil Driver - Flower', sku: 'DD-0005', price: 2.42, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '53',
    title: 'KDM250912',
    customer: 'Kind Meds - Kind Meds Inc',
    startDate: '09/12/2025',
    completedDate: '10/06/2025',
    items: [
      { product: 'Bulk - Georgia Apple Pie - Flower', sku: 'GAP-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 1.76, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '57',
    title: 'KDM250919',
    customer: 'Kind Meds - Kind Meds Inc',
    startDate: '09/19/2025',
    completedDate: '09/22/2025',
    items: [
      { product: 'Bulk - Georgia Apple Pie - Flower', sku: 'GAP-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Z Chem - Flower', sku: 'ZCH-0001', price: 1.76, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '58',
    title: 'PON250922',
    customer: 'Ponderosa Botanical Care Inc.',
    startDate: '09/22/2025',
    completedDate: '10/06/2025',
    items: [
      { product: 'Bulk - Z Marker - Fresh Frozen', sku: 'ZMK-0008', price: 0.22, quantity: 36758, unit: 'g' },
      { product: 'Bulk - Donny Burger - Fresh Frozen', sku: 'DON-0006', price: 0.22, quantity: 16488, unit: 'g' },
      { product: 'Bulk - Z Chem - Fresh Frozen', sku: 'ZCH-0008', price: 0.22, quantity: 20312, unit: 'g' },
      { product: 'Bulk - Lemondary - Fresh Frozen', sku: 'LMD-0009', price: 0.22, quantity: 16734, unit: 'g' }
    ]
  },
  {
    invoiceNum: '62',
    title: 'TJK250930',
    customer: 'Tree Junky',
    startDate: '09/30/2025',
    completedDate: '10/02/2025',
    items: [
      { product: 'Bulk - Cap Junky - Flower', sku: 'CAP-0002', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cap Junky - Flower', sku: 'CAP-0002', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Blue Pave - Flower', sku: 'BLP-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Blue Pave - Flower', sku: 'BLP-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Blue Pave - Flower', sku: 'BLP-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Blue Pave - Flower', sku: 'BLP-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Chembanger - Flower', sku: 'CHB-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cherry Paloma - Flower', sku: 'CHP-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cherry Paloma - Flower', sku: 'CHP-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cherry Paloma - Flower', sku: 'CHP-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cherry Paloma - Flower', sku: 'CHP-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Fugazi Funk - Flower', sku: 'FGF-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Fugazi Funk - Flower', sku: 'FGF-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Lemondary - Flower', sku: 'LMD-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 0.88, quantity: 227, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Peanut Butter Breath - Flower', sku: 'PPB-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 0.88, quantity: 227, unit: 'g' },
      { product: 'Bulk - Sour Diesel - Flower', sku: 'SOD-0001', price: 0.88, quantity: 227, unit: 'g' },
      { product: 'Bulk - Sour Diesel - Flower', sku: 'SOD-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Sour Diesel - Flower', sku: 'SOD-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Tahoe Larry - Flower', sku: 'THL-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Tahoe Larry - Flower', sku: 'THL-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Tahoe Larry - Flower', sku: 'THL-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Tahoe Larry - Flower', sku: 'THL-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - White Burgundy - Flower', sku: 'WHB-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Cherry Zoda - Flower', sku: 'CZD-0001', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Devil Driver - Flower', sku: 'DD-0005', price: 0.88, quantity: 454, unit: 'g' },
      { product: 'Bulk - Fugazi Funk - Flower', sku: 'FGF-0006', price: 0.88, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '67',
    title: 'KDM251002',
    customer: 'Kind Meds - Kind Meds Inc',
    startDate: '10/02/2025',
    completedDate: '10/06/2025',
    items: [
      { product: 'Bulk - Magic Marker - Flower', sku: 'MGM-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Rainbow Inferno - Flower', sku: 'RBI-0001', price: 1.76, quantity: 454, unit: 'g' },
      { product: 'Bulk - Z Chem - Flower', sku: 'ZCH-0001', price: 1.76, quantity: 454, unit: 'g' }
    ]
  },
  {
    invoiceNum: '68',
    title: 'NMD251008',
    customer: 'Nature Med - Arizona Golden Leaf Wellness',
    startDate: '10/08/2025',
    completedDate: '10/09/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Flower 3.5g', sku: 'CHL-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Dog Walker - Flower 3.5g', sku: 'DOG-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Swamp Water Fumez - Flower 3.5g', sku: 'SWF-0003', price: 17.50, quantity: 64, unit: 'qty' }
    ]
  },
  {
    invoiceNum: '70',
    title: 'STO251008',
    customer: 'Story Litchfield - Joint Junkies I LLC - MCCSE29, LLC',
    startDate: '10/08/2025',
    completedDate: '10/09/2025',
    items: [
      { product: 'Packaged - Animal Tsunami - Smalls 14g', sku: 'ASU-0002', price: 50.00, quantity: 30, unit: 'qty' },
      { product: 'Packaged - Animal Tsunami - Flower 3.5g', sku: 'ASU-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Smalls 14g', sku: 'CHL-0002', price: 50.00, quantity: 20, unit: 'qty' },
      { product: 'Packaged - Chemlatto - Flower 3.5g', sku: 'CHL-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Dog Walker - Flower 3.5g', sku: 'DOG-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Peanut Butter Breath - Flower 3.5g', sku: 'PPB-0003', price: 17.50, quantity: 64, unit: 'qty' },
      { product: 'Packaged - Swamp Water Fumez - Flower 3.5g', sku: 'SWF-0003', price: 17.50, quantity: 64, unit: 'qty' }
    ]
  }
];

function parseDate(dateStr: string): string {
  const [month, day, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function importOrders() {
  console.log('Starting order import...');

  // First, get all customers and create a map
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, name');

  if (customerError) {
    console.error('Error fetching customers:', customerError);
    return;
  }

  // Create a flexible customer map that handles name variations
  const customerMap = new Map();
  customers.forEach(c => {
    // Add exact match
    customerMap.set(c.name, c.id);
    // Add normalized version (lowercase, trim whitespace)
    const normalized = c.name.toLowerCase().trim();
    customerMap.set(normalized, c.id);
  });

  // Helper function to find customer by name (flexible matching)
  function findCustomerId(name: string): string | undefined {
    // Try exact match first
    if (customerMap.has(name)) return customerMap.get(name);

    // Try normalized match
    const normalized = name.toLowerCase().trim();
    if (customerMap.has(normalized)) return customerMap.get(normalized);

    // Try partial match (check if customer name contains the search term or vice versa)
    for (const [customerName, customerId] of customerMap.entries()) {
      const nameNorm = customerName.toLowerCase();
      const searchNorm = normalized;
      if (nameNorm.includes(searchNorm) || searchNorm.includes(nameNorm)) {
        return customerId as string;
      }
    }

    return undefined;
  }

  // Get all products
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, name, sku');

  if (productError) {
    console.error('Error fetching products:', productError);
    return;
  }

  const productMapBySku = new Map(products.map(p => [p.sku, p]));

  let importedCount = 0;
  let skippedCount = 0;

  // Import completed orders
  for (const order of completedOrders) {
    const customerId = findCustomerId(order.customer);
    if (!customerId) {
      console.log(`Skipping order ${order.title} - customer not found: ${order.customer}`);
      skippedCount++;
      continue;
    }

    const orderDate = parseDate(order.startDate);
    const deliveryDate = order.completedDate ? parseDate(order.completedDate) : null;

    // Create the order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: order.title,
        customer_id: customerId,
        status: 'completed',
        priority: 'medium',
        order_date: orderDate,
        requested_delivery_date: deliveryDate,
        scheduled_delivery_date: deliveryDate,
        internal_notes: `Imported from Dutchie (Invoice #${order.invoiceNum})`,
        order_source: 'dutchie'
      })
      .select()
      .single();

    if (orderError) {
      console.error(`Error creating order ${order.title}:`, orderError);
      skippedCount++;
      continue;
    }

    // Create order items
    for (const item of order.items) {
      const product = productMapBySku.get(item.sku);
      if (!product) {
        console.log(`Skipping item ${item.sku} in order ${order.title} - product not found`);
        continue;
      }

      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: newOrder.id,
          product_id: product.id,
          quantity: item.quantity,
          unit_price: item.price,
          status: 'ready_for_delivery'
        });

      if (itemError) {
        console.error(`Error creating order item for ${order.title}:`, itemError);
      }
    }

    console.log(`Imported completed order: ${order.title}`);
    importedCount++;
  }

  // Import open orders
  for (const order of openOrders) {
    const customerId = findCustomerId(order.customer);
    if (!customerId) {
      console.log(`Skipping order ${order.title} - customer not found: ${order.customer}`);
      skippedCount++;
      continue;
    }

    const orderDate = parseDate(order.startDate);

    // Create the order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: order.title,
        customer_id: customerId,
        status: 'submitted',
        priority: 'medium',
        order_date: orderDate,
        internal_notes: `Imported from Dutchie (Invoice #${order.invoiceNum})`,
        order_source: 'dutchie'
      })
      .select()
      .single();

    if (orderError) {
      console.error(`Error creating order ${order.title}:`, orderError);
      skippedCount++;
      continue;
    }

    // Create order items
    for (const item of order.items) {
      const product = productMapBySku.get(item.sku);
      if (!product) {
        console.log(`Skipping item ${item.sku} in order ${order.title} - product not found`);
        continue;
      }

      const { error: itemError} = await supabase
        .from('order_items')
        .insert({
          order_id: newOrder.id,
          product_id: product.id,
          quantity: item.quantity,
          unit_price: item.price,
          status: 'trimming'
        });

      if (itemError) {
        console.error(`Error creating order item for ${order.title}:`, itemError);
      }
    }

    console.log(`Imported open order: ${order.title}`);
    importedCount++;
  }

  console.log(`\nImport complete! Imported: ${importedCount}, Skipped: ${skippedCount}`);
}

importOrders().catch(console.error);
