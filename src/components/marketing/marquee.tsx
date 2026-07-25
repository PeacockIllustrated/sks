/**
 * Capability ticker.
 *
 * Two identical runs side by side, translated by half the track width, so the
 * loop is seamless without measuring anything. Decorative, and hidden from
 * assistive technology: everything named here is a link somewhere else.
 */

const ITEMS = [
  "Extensions",
  "Refurbishment",
  "Groundwork",
  "Loft conversions",
  "Staircases",
  "Fitted furniture",
  "Timber windows",
  "Pitched roofing",
  "Flat roofing",
  "Leadwork",
  "Commercial fit-out",
];

function Run() {
  return (
    <span className="flex shrink-0 items-center">
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center">
          <span className="anno px-6 py-4 text-navy-200">{item}</span>
          <span aria-hidden="true" className="text-gold-400">
            &#9670;
          </span>
        </span>
      ))}
    </span>
  );
}

export function Marquee() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden border-b border-navy-700 bg-navy-900"
    >
      <div className="marquee-track">
        <Run />
        <Run />
      </div>
    </div>
  );
}
