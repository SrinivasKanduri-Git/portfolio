import { useState } from 'react';
import { Home, Newspaper, MessageSquare, ShieldCheck, Layers, Search, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { createRoot } from 'react-dom/client';
import { CredibilityBadge } from './vendor/ai-reporter/CredibilityBadge';
import { cn } from './vendor/ai-reporter/cn';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'library', label: 'News Library', icon: Newspaper },
  { id: 'chatbot', label: 'Research Chat', icon: MessageSquare },
  { id: 'fact-check', label: 'Fact Checker', icon: ShieldCheck },
  { id: 'slop-detector', label: 'Slop Detector', icon: Layers },
];

const ARTICLES = [
  { title: 'Monsoon Wrap: Grid Demand Rises Across Coastal Districts', source: 'Reuters', score: 91, age: '2 hours ago' },
  { title: 'Launch Window Set For Next Regional Satellite Cluster', source: 'PTI', score: 84, age: '5 hours ago' },
  { title: 'Markets Steady As Rate Decision Looms Next Week', source: 'Bloomberg', age: '1 day ago', score: 77 },
];

function AiReporterDashboard() {
  const [active, setActive] = useState('library');

  return (
    <div className="flex h-full bg-[#0F1117] text-[#E2E8F0] text-sm rounded-lg overflow-hidden">
      <aside className="hidden md:flex flex-col w-48 bg-[#0A1628] border-r border-[#2D3748] shrink-0">
        <div className="p-4">
          <h1 className="text-sm font-extrabold tracking-tighter text-white">THE AI REPORTER</h1>
        </div>
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn(
                'flex items-center w-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-colors',
                active === item.id ? 'bg-[#E65C00] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-[#2D3748] flex items-center justify-between px-4 shrink-0">
          <div className="relative w-40 sm:w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              readOnly
              value="Search global intelligence nodes…"
              className="w-full pl-7 pr-2 py-1.5 bg-[#16162A] border border-transparent rounded text-[11px] text-gray-400 outline-none"
            />
          </div>
          <button className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-[#E65C00] text-white text-[10px] font-black uppercase tracking-widest rounded">
            <Plus className="w-3 h-3" /> New
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3">
            {ARTICLES.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#1A1A2E] border border-[#2D3748] rounded-lg p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-white text-xs leading-snug">{a.title}</h3>
                  <CredibilityBadge score={a.score} size={26} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                  <span className="font-bold text-[#E65C00] uppercase">{a.source}</span>
                  <span>·</span>
                  <span>{a.age}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export function mountAiReporterIsland(el: HTMLElement): void {
  createRoot(el).render(<AiReporterDashboard />);
}
