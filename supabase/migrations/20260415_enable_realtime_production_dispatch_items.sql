-- Enable realtime for production_dispatch_items so cross-screen state stays in sync.
-- The "In Queue" badge on InventoryDrawer / QuickDispatchModal needs to refresh
-- when items are cancelled or completed on ProductionHub (another screen) without
-- requiring the user to close and reopen the drawer.
ALTER PUBLICATION supabase_realtime ADD TABLE public.production_dispatch_items;
