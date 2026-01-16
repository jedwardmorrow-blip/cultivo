/*
  # Populate Dispensary Customer Data

  1. Changes
    - Clears existing customers table
    - Populates with all dispensary partners from CSV
    - Handles multi-location dispensaries (Story locations)
    - Includes contact information for each location

  2. Data
    - Primary dispensaries with single locations
    - Story dispensaries with 11 locations (North Chandler, South Chandler, Bell, Havasu, Tolleson, Grand, McDowell, Williams, Bullhead City, 7th St., Dunlap)
    - Contact names, emails, phones, and addresses where available
*/

-- Clear existing customers (safe since we're populating from source data)
TRUNCATE TABLE customers CASCADE;

-- Insert all dispensary customers
INSERT INTO customers (name, contact_name, email, phone, address, notes) VALUES
  -- Sol Flower
  ('Sol Flower', 'Matthew (Operations Analyst), Joshua Stolp (Temp Buyer)', 'MatthewB@copperstatefarms.com, JoshuaS@livewithsol.com', NULL, '2424 W University Dr, Tempe, AZ 85281', 'Email buyer with delivery dates within 24hrs after scheduling on online scheduler. East from building, very close (2 miles away)'),
  
  -- All Greens
  ('All Greens', 'Dusty (Buyer)', 'edibles@allgreensaz.com', NULL, '10032 W Bell Rd #100, Sun City, AZ 85351', 'Email Dusty to schedule. West from the building'),
  
  -- Deeply Rooted
  ('Deeply Rooted', 'Able Ochao (Buyer/CEO)', 'abel@azdeeplyrooted.com', '480-708-0296', '11725 NW Grand Ave, El Mirage, AZ 85335', 'Email Able to schedule (paused account). West from the building'),
  
  -- The Green Halo
  ('The Green Halo', 'Dominique Gamboa (Buyer/Operations Man), Juaquin Barreda, Charles Olvera', 'dominique.gamboa@thegreenhalo.com, juaquin@thegreenhalo.com, charles@thegreenhalo.com', '520-732-4187', '7710 S Wilmot Rd, Tucson, AZ 85756', 'Email Dom, Juaquin and Charles in one email to schedule. South from building'),
  
  -- Kind Meds
  ('Kind Meds', 'Gabe Gomez (Buyer/CEO)', 'gabe@kindmedsaz.com', NULL, '2152 S Vineyard STE 120, Mesa, AZ 85210', 'Email Gabe directly. Gabe prefers at least 24 hr notice and prefers a text with copy of invoice and COAs. West from building'),
  
  -- Sticky Saguaro
  ('Sticky Saguaro', 'Amanda Swims (Buyer), Brandon, Leah Woods, Jennifer Wallace', 'aswim@stickysaguaro.com, bkneuss@stickysaguaro.com, lwoody@stickysaguaro.com, jwallace@stickysaguaro.com', '928-514-6185', '12338 E Riggs Rd, Chandler, AZ 85249', 'Email Amanda and cc Brandon, Leah and Jennifer. 24 to 48hrs notice preferred. South from building'),
  
  -- ANC
  ('ANC', 'Cory (Buyer)', 'arizonanaturalconcepts@gmail.com', NULL, '1039 E Carefree Hwy, Phoenix, AZ 85085', 'Email arizonanaturalconcepts.com. Team will let you know when Cory is available. 24hr notice. North of building'),
  
  -- Arizona Organix
  ('Arizona Organix', 'Kelly (Temp buyer - Ops Manager), Bryce Quiroz, Enya Resendiz', 'kelly@arizonaorganix.org, bquiroz@arizonaorganix.org, e.resendiz@arizonaorganix.org', NULL, '5301 W Glendale Ave, Glendale, AZ 85301', 'Email newest buyer after scheduling on online scheduler. West of the building'),
  
  -- Prime at Park
  ('Prime at Park', 'John Jameson, Jack Lambe', 'john@theprimeleaf.com, jack@theprimeleaf.com, ops.park@theprimeleaf.com', NULL, '1525 N Park Ave, Tucson, AZ 85719', 'Email John and cc Lucas and Jack. One email with invoices and COAs works for both locations. Team is in Tucson, coordinate with other Tucson deliveries. South from building'),
  
  -- Prime at Speedway
  ('Prime at Speedway', 'Lucas Shuta', 'lucas@theprimeleaf.com, ops.speedway@theprimeleaf.com', NULL, '4220 E Speedway Blvd, Tucson, AZ 85712', 'Email John and cc Lucas and Jack. One email with invoices and COAs works for both locations. Team is in Tucson'),
  
  -- Sunday Goods
  ('Sunday Goods', 'Mistie Hallenback (Retail Supply Chain Specialist)', 'MHallenback@thepharmaz.com, JHowell@thepharmaz.com, RClora@thepharmaz.com, inventory@sundaygoods.com', '602-459-6179', '4417 W Buckeye Rd, Phoenix, AZ 85043', 'Email Misty within 24hrs to schedule delivery and to submit invoice and COAs. West from the building'),
  
  -- The Flower Shop
  ('The Flower Shop', 'Tyler Thompson (Buyer)', 'TylerT@theflowershopusa.com', NULL, '3155 E Mcdowell Rd Suite 2, Phoenix, Az 85008', 'Use online scheduler to schedule delivery. Send documents to Tyler. North of the building'),
  
  -- Trulieve
  ('Trulieve', 'July Shay (Wholesale Regional Buyer)', 'july.shay@trulieve.com, Ian.Frye@trulieve.com, dustin.buesser@trulieve.com, aztesting@harvestinc.com', NULL, '2512 E Magnolia St, Phoenix, AZ 85034', 'Use online scheduler. Email July, Dustin, Ian, Az Testing and cc Greg and Justin within 48hrs. Very strict on timeframe for paperwork. West of building, close by (7 miles)'),
  
  -- Ponderosa
  ('Ponderosa', 'Daniel Escobedo (Buyer), Andrew Rodriguez', 'daniel.escobedo@sonoranroots.com, andrew.rodriguez@sonoranroots.com, kayla.ballesteros@sonoranroots.com, retail-purchasing@sonoranroots.com', '480-650-9480', '2055 E 5th St. STE 101, Tempe, AZ 85281', 'Email Daniel within 24-48hrs to schedule delivery. Monday-Friday 6am-1:45pm. East from building'),
  
  -- Timeless
  ('Timeless', 'Dominick Gowen (Project Manager)', 'DomGowen@timelessrefinery.com, tanner@timelessrefinery.com, accounting@timelessaz.com', '310-220-5716', '2424 W University Dr, Tempe, AZ 85281', 'Email Dom to schedule delivery 24-48hrs. 30 days ACH payment. Delivery is behind the Sol Flower University location. East of building, very close (2 miles)'),
  
  -- The Best Dispensary
  ('The Best Dispensary', 'Reed Steigerwalt (Inventory Manager)', 'reeds@bestdispensary.com, accounting@bestdispensary.com, daniel@bestdispensary.com', '623-264-2378', '1962 N Higley Rd, Mesa, AZ 85205', 'Email Reed and CC accounting team and Daniel. Notify team 48 hrs in advance. East from building'),
  
  -- Noble Herb
  ('Noble Herb', 'Michael Ischinger (Buyer)', 'michael@nobleherbaz.com', NULL, '522 E Rte 66, Flagstaff, AZ 86001', 'North of the building'),
  
  -- Story locations (11 locations)
  ('Story - North Chandler', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, mlopez@storypartners.com, aromero@storypartners.com, Egarcia-gomez@storypartners.com', '602-598-4190', '17006 S Weber Dr, Chandler, AZ 85226', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. South of building, 15 mins away'),
  
  ('Story - South Chandler', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, awhaley@storypartners.com, ajohnson4@storypartners.com, aromero@storypartners.com', '602-598-4190', '26427 S Arizona Ave, Chandler, AZ 85248', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. South of building, 26 mins away'),
  
  ('Story - Bell', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, tsioata@storypartners.com, dhardy@storypartners.com, aromero@storypartners.com, dpierce@storypartners.com', '602-598-4190', '6676 W Bell Rd, Glendale, AZ 85308', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. North of building, 34 mins away'),
  
  ('Story - Havasu', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, jlindbom@storypartners.com, aromero@storypartners.com', '602-598-4190', '200 London Bridge Rd, Lake Havasu City, AZ 86403', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. Far NW, 3.15 hrs away'),
  
  ('Story - Tolleson', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, aromero@storypartners.com, jhansen@storypartners.com, bvillalobos@storypartners.com, dhardy@storypartners.com', '602-598-4190', '9897 W McDowell Rd #720, Tolleson, AZ 85353', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. East of building, 22 mins away'),
  
  ('Story - Grand', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, olongchamps@storypartners.com, jabbott@storypartners.com, cvelasquez@storypartners.com, aromero@storypartners.com', '602-598-4190', '6840 Grand Ave, Glendale, AZ 85301', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. NW from building, 27 mins away'),
  
  ('Story - McDowell', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, eortiz@storypartners.com, aromero@storypartners.com, mtomchak@storypartners.com', '602-598-4190', '2439 W McDowell Rd, Phoenix, AZ 85009', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. West of building, 13 mins away'),
  
  ('Story - Williams', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, dhoward@storypartners.com, aromero@storypartners.com, nbouska@storypartners.com', '602-598-4190', '341 E Rte 66, Williams, AZ 86046', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. North from building, 185 miles away (2hrs 45 mins)'),
  
  ('Story - Bullhead City', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, jcastellon@storypartners.com, twhite@storypartners.com, aromero@storypartners.com, mgraham@storypartners.com', '602-598-4190', '3550 North Ln #110, Bullhead City, AZ 86442', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. North of building, 248 miles (4.25 hrs)'),
  
  ('Story - 7th Ave', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, jhipkins@storypartners.com, jcorrea@storypartners.com', '602-598-4190', '3830 N 7th St, Phoenix, AZ 85014', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. North of building, 9.3 miles (16 mins)'),
  
  ('Story - Dunlap', 'Nialetti Delay (Buyer)', 'ndaley@storypartners.com, mmele@storypartners.com, anacua@storypartners.com, opickering@storypartners.com, tfelker@storypartners.com, awarren@storypartners.com', '602-598-4190', '701 E Dunlap Ave Suite 9, Phoenix, AZ 85020', 'Include Nialetti on all emails. Send all paperwork 48hrs in advance. North of building, 15 miles (23 mins)'),
  
  -- Superior Dispensary
  ('Superior Dispensary', 'Dan Lemmer (Buyer), Melissa Bath (Compliance)', 'daniellemmer@thesuperiordispensary.com, melissa@thesuperiordispensary.com', NULL, '211 S 57th Dr, Phoenix, AZ 85043', 'Email both Dan and Melissa. Prefer 24hr notice. Have special coversheets for labels. West from building. Melissa very big on compliance but loves samples'),
  
  -- Sea of Green LLC
  ('Sea of Green LLC', 'Heidi Cross (Buyer)', 'purchasing@trubliss.com', NULL, NULL, NULL);
