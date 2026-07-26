/**
 * Pure display helpers. Lives apart from the search modules so client
 * components can import it without dragging the Exa client into the bundle.
 */

function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** "$3,400,000,000" -> "$3.4B". Keeps axis ticks and tooltips readable. */
export function formatValue(value: number, unit: string): string {
  if (unit === "%") return `${trim(value)}%`;

  const abs = Math.abs(value);
  const scaled: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];

  for (const [factor, suffix] of scaled) {
    if (abs >= factor) return `${unit}${trim(value / factor)}${suffix}`;
  }

  return `${unit}${trim(value)}`;
}
