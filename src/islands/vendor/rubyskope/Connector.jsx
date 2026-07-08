// source: rubyskope@f69c304 app/javascript/islands/Connector.jsx (verbatim — do not hand-edit, resync from source instead)
import React from "react";

// Inline SVG horizontal arrow from waterfall rail-node to right-side card.
// Hidden on narrow viewports via CSS (.rs-wf-connector responds to <768px).
export default function Connector({ color = "#4A4A5A", width = 36, height = 20 }) {
  const stroke = color;
  return (
    <svg
      className="rs-wf-connector"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="presentation"
      aria-hidden="true"
    >
      <line x1="0" y1={height / 2} x2={width - 8} y2={height / 2}
            stroke={stroke} strokeWidth="1.6" />
      <polygon
        points={`${width - 8},${height / 2 - 5} ${width},${height / 2} ${width - 8},${height / 2 + 5}`}
        fill={stroke}
      />
    </svg>
  );
}
