// source: rubyskope@f69c304 app/javascript/islands/nodeColors.js (verbatim — do not hand-edit, resync from source instead)
export const NODE_COLORS = {
  read:      "#3B82F6",
  create:    "#10B981",
  update:    "#F59E0B",
  delete:    "#EF4444",
  job:       "#8B5CF6",
  start:     "#6B7280",
  exception: "#DC2626",
};

export const NODE_LABELS = {
  read:      "Read",
  create:    "Create",
  update:    "Update",
  delete:    "Delete",
  job:       "Worker",
  start:     "Start",
  exception: "Exception",
};

export function colorFor(kind) {
  return NODE_COLORS[kind] || "#4A4A5A";
}
