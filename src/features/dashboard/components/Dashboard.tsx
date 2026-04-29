import { Home } from './home/Home';

/**
 * COO/CEO question-rack home per home_redesign_brief_v2
 * (business_context id 5c07c4db, signed off 2026-04-27 session 386).
 * Cell registry: home_cell_manifest_v1 (id 3c083141).
 *
 * Eight sections: Header, Revenue, Cash (placeholder), Coverage,
 * Floor Plan (body), Pipeline, Conversion, Fulfillment, Exceptions.
 * Cost section deferred until finance views land.
 *
 * onSelectOrder is preserved on the type signature for App.tsx import
 * compatibility but is intentionally unused on this surface.
 */
export function Dashboard(_props: { onSelectOrder: (orderId: string) => void }) {
  return <Home />;
}
