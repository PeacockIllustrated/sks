import { Container } from "@/components/layout";

/* ===========================================================================
   The programme comparison.

   The argument the whole site rests on is that multi-trade jobs lose their time
   in the handovers, not in the work. That is a claim about a shape, so it is
   drawn as one: the same three trades, on the same week axis, run twice.

   The weeks are illustrative and labelled as such. They are a shape, not a
   quotation, and the caption says so.
   =========================================================================== */

const WEEKS = 18;

type Trade = "Construction" | "Roofing" | "Joinery";

const TRADE_TONE: Record<Trade, string> = {
  Construction: "bg-gold-400",
  Roofing: "bg-[color:var(--color-blueprint)]",
  Joinery: "bg-navy-300",
};

type Bar = { trade: Trade; from: number; to: number };
type Wait = { trade: Trade; from: number; to: number };

const SPLIT: { bars: Bar[]; waits: Wait[]; total: number } = {
  bars: [
    { trade: "Construction", from: 0, to: 6 },
    { trade: "Roofing", from: 8, to: 12 },
    { trade: "Joinery", from: 14, to: 18 },
  ],
  waits: [
    { trade: "Roofing", from: 6, to: 8 },
    { trade: "Joinery", from: 12, to: 14 },
  ],
  total: 18,
};

const SINGLE: { bars: Bar[]; waits: Wait[]; total: number } = {
  bars: [
    { trade: "Construction", from: 0, to: 6 },
    { trade: "Roofing", from: 5, to: 9 },
    { trade: "Joinery", from: 7, to: 11 },
  ],
  waits: [],
  total: 11,
};

const TRADES: Trade[] = ["Construction", "Roofing", "Joinery"];

const pct = (week: number) => `${(week / WEEKS) * 100}%`;

function Scenario({
  eyebrow,
  title,
  plan,
  tone,
}: {
  eyebrow: string;
  title: string;
  plan: typeof SPLIT;
  tone: "muted" | "strong";
}) {
  return (
    <div
      className={
        tone === "strong"
          ? "border border-gold-400 bg-navy-950 p-6 sm:p-8"
          : "border border-navy-700 bg-navy-900 p-6 sm:p-8"
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="anno text-navy-400">{eyebrow}</p>
          <h3 className="mt-2 text-xl text-white">{title}</h3>
        </div>
        <p
          className={
            tone === "strong"
              ? "font-display text-3xl font-bold text-gold-300"
              : "font-display text-3xl font-bold text-navy-300"
          }
        >
          {plan.total} weeks
        </p>
      </div>

      <div className="mt-7 space-y-3">
        {TRADES.map((trade) => {
          const bar = plan.bars.find((b) => b.trade === trade);
          const wait = plan.waits.find((w) => w.trade === trade);
          return (
            <div key={trade} className="flex items-center gap-4">
              <span className="anno w-24 shrink-0 text-navy-300">{trade}</span>
              <div className="relative h-7 flex-1 border border-navy-700 bg-navy-950">
                {/* Week ruling, every two weeks. */}
                <div className="absolute inset-0 flex" aria-hidden="true">
                  {Array.from({ length: WEEKS / 2 - 1 }, (_, i) => (
                    <span
                      key={i}
                      className="border-r border-navy-800"
                      style={{ width: pct(2) }}
                    />
                  ))}
                </div>

                {wait ? (
                  <span
                    data-grow
                    className="absolute inset-y-1 border border-dashed border-navy-500"
                    style={{
                      left: pct(wait.from),
                      width: pct(wait.to - wait.from),
                    }}
                  >
                    <span className="sr-only">
                      Waiting for the previous trade, weeks {wait.from} to{" "}
                      {wait.to}
                    </span>
                  </span>
                ) : null}

                {bar ? (
                  <span
                    data-grow
                    className={`absolute inset-y-0.5 ${TRADE_TONE[trade]}`}
                    style={{
                      left: pct(bar.from),
                      width: pct(bar.to - bar.from),
                    }}
                  >
                    <span className="sr-only">
                      {trade} on site, weeks {bar.from} to {bar.to}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 pl-28">
        <div className="anno flex flex-1 justify-between text-navy-500">
          <span>Week 0</span>
          <span>Week {WEEKS}</span>
        </div>
      </div>
    </div>
  );
}

export function Programme() {
  return (
    <section className="border-b border-navy-700 bg-navy-900 py-16 sm:py-24">
      <Container className="max-w-7xl">
        <div className="max-w-2xl">
          <p className="anno mb-4 text-gold-300">Why one firm</p>
          <h2 className="text-3xl text-white sm:text-4xl">
            The gaps between trades are where jobs go wrong
          </h2>
          <p className="mt-5 text-lg text-navy-200">
            Almost nothing is lost while a trade is working. It is lost in the
            fortnight after they leave, waiting on the next firm&apos;s diary.
            Same three trades, same work, drawn twice.
          </p>
        </div>

        <div className="reveal mt-12 grid gap-6 lg:grid-cols-2">
          <Scenario
            eyebrow="The usual way"
            title="Three firms, three programmes"
            plan={SPLIT}
            tone="muted"
          />
          <Scenario
            eyebrow="With us"
            title="One firm, one programme"
            plan={SINGLE}
            tone="strong"
          />
        </div>

        <p className="mt-6 max-w-2xl text-sm text-navy-400">
          Illustrative programme for a typical multi-trade job. Your own dates
          come from the survey, and they go in the quote in writing.
        </p>
      </Container>
    </section>
  );
}
