import { Container } from "@/components/layout";

/**
 * How a job runs, in four steps.
 *
 * The icons are stroked rather than filled so the reveal observer can draw them
 * on, which keeps the whole page speaking the same line language as the hero.
 */

const STEPS = [
  {
    n: "01",
    title: "Talk it through",
    body: "Tell us what you need. We will say early if it is not work we should be doing.",
    icon: (
      <>
        <path d="M14 22h60v38H44L28 74V60H14z" />
        <line x1="28" y1="36" x2="60" y2="36" />
        <line x1="28" y1="47" x2="50" y2="47" />
      </>
    ),
  },
  {
    n: "02",
    title: "Site visit and survey",
    body: "We measure, check the constraints and agree the scope in writing.",
    icon: (
      <>
        <line x1="44" y1="30" x2="44" y2="52" />
        <circle cx="44" cy="24" r="7" />
        <path d="M26 74l18-22 18 22" />
        <line x1="16" y1="74" x2="72" y2="74" />
        <line x1="16" y1="66" x2="16" y2="74" />
        <line x1="72" y1="66" x2="72" y2="74" />
      </>
    ),
  },
  {
    n: "03",
    title: "One written quote",
    body: "Every division priced together, with the programme and the assumptions stated.",
    icon: (
      <>
        <path d="M20 12h34l14 14v50H20z" />
        <path d="M54 12v14h14" />
        <line x1="30" y1="42" x2="58" y2="42" />
        <line x1="30" y1="53" x2="58" y2="53" />
        <line x1="30" y1="64" x2="46" y2="64" />
      </>
    ),
  },
  {
    n: "04",
    title: "Build and hand over",
    body: "One point of contact throughout, and the certificates and paperwork at the end.",
    icon: (
      <>
        <path d="M12 44L44 16l32 28" />
        <path d="M20 40v34h48V40" />
        <path d="M34 62l7 7 14-16" />
      </>
    ),
  },
];

export function Process() {
  return (
    <section className="border-b border-navy-200 bg-white py-16 sm:py-24">
      <Container className="max-w-7xl">
        <div className="max-w-2xl">
          <p className="anno mb-4 text-gold-600">How it works</p>
          <h2 className="text-3xl sm:text-4xl">
            What to expect, start to finish
          </h2>
        </div>

        <ol className="mt-12 grid gap-px border border-navy-200 bg-navy-200 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.n} className="reveal bg-white p-7">
              <div className="text-gold-500">
                <svg
                  viewBox="0 0 88 88"
                  className="draw-ic size-14"
                  aria-hidden="true"
                >
                  {step.icon}
                </svg>
              </div>
              <p className="anno mt-6 text-navy-400">Step {step.n}</p>
              <h3 className="mt-2 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
