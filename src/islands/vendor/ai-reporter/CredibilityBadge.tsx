// source: ai_reporter_v1_AG@3f26be2 components/shared/CredibilityBadge.tsx
// (verbatim — only the `cn` import path is adapted from Next's `@/lib/utils` alias,
// and the tooltip's `var(--bg-card)`-style theme tokens are inlined to their
// dark-mode literal values since AI Reporter's app/globals.css isn't vendored)
import { cn } from './cn';

interface CredibilityBadgeProps {
  score: number;
  size?: number;
  className?: string;
}

export function CredibilityBadge({ score, size = 32, className = '' }: CredibilityBadgeProps) {
  let bgColor = '#B71C1C'; // red — 0-49
  if (score >= 80) {
    bgColor = '#1A6B3A'; // green
  } else if (score >= 50) {
    bgColor = '#B45309'; // amber
  }

  return (
    <div className={cn('relative group inline-block', className)}>
      <div
        className="cursor-help"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: bgColor,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: '#FFFFFF',
            fontFamily: "'Inter', sans-serif",
            fontSize: size * 0.375,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {Math.round(score)}
        </span>
      </div>

      <div className="absolute z-[100] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-[#1A1A2E] text-[#E2E8F0] border border-[#2D3748] p-4 rounded-xl shadow-2xl pointer-events-none transform translate-y-1 group-hover:translate-y-0 text-left">
        <div className="font-bold mb-2 pb-2 border-b border-[#2D3748] flex justify-between items-center text-xs uppercase tracking-tighter">
          <span>Credibility Rating</span>
          <span style={{ color: bgColor }}>{Math.round(score)}/100</span>
        </div>
        <ul className="flex flex-col gap-2 text-[10px] uppercase font-bold tracking-tight">
          <li className={score >= 80 ? 'text-[#1A6B3A]' : 'text-[#64748B]'}>● 80–100: Verified Data</li>
          <li className={score >= 50 && score < 80 ? 'text-[#B45309]' : 'text-[#64748B]'}>● 50–79: Probable Reporting</li>
          <li className={score < 50 ? 'text-[#B71C1C]' : 'text-[#64748B]'}>● 0–49: Contested Logic</li>
        </ul>
      </div>
    </div>
  );
}
