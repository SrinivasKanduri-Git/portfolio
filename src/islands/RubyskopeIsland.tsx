import { createRoot } from 'react-dom/client';
import Waterfall from './vendor/rubyskope/Waterfall.jsx';

const SAMPLE_EVENTS = [
  { id: 1, node_kind: 'start', title: 'Session started', occurred_at: '2026-07-07T06:12:03Z' },
  { id: 2, node_kind: 'read', title: 'GET /api/orders', occurred_at: '2026-07-07T06:12:05Z', http_method: 'get', path: '/api/orders', response_status: 200 },
  { id: 3, node_kind: 'job', title: 'job ExportReport enqueued', occurred_at: '2026-07-07T06:12:06Z' },
  { id: 4, node_kind: 'update', title: 'Order#total changed', occurred_at: '2026-07-07T06:12:11Z' },
  { id: 5, node_kind: 'exception', title: 'NoMethodError in OrdersController', occurred_at: '2026-07-07T06:12:12Z' },
];

export function mountRubyskopeIsland(el: HTMLElement): void {
  createRoot(el).render(
    <div className="island-rubyskope">
      <Waterfall events={SAMPLE_EVENTS} dataUrl={undefined} userId={undefined} onOpenEvent={() => {}} />
    </div>,
  );
}
