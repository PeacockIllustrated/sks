import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  Money,
  PageHeader,
  QuoteStatusBadge,
  Td,
  Th,
} from "@/components/admin/ui";
import {
  getClient,
  getProject,
  getQuote,
  getQuoteLineItems,
  getQuoteVersions,
} from "@/lib/db/queries";
import { toNumber } from "@/lib/db/types";
import { formatDate } from "@/lib/utils";
import {
  AddLineForm,
  NewVersionForm,
  QuoteDetailsForm,
  RemoveLineButton,
  RespondForm,
  SendQuoteForm,
} from "./quote-controls";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(id);
  if (!quote) notFound();

  const [lines, client, project, versions] = await Promise.all([
    getQuoteLineItems(quote.id),
    getClient(quote.client_id),
    quote.project_id ? getProject(quote.project_id) : Promise.resolve(null),
    getQuoteVersions(quote.reference),
  ]);

  const isDraft = quote.status === "DRAFT";
  const isSent = quote.status === "SENT";

  return (
    <>
      <Link
        href="/admin/quotes"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-navy-600 hover:text-navy-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to quotes
      </Link>

      <PageHeader
        title={quote.title}
        description={`${quote.reference} version ${quote.version}${
          client ? ` - ${client.company_name ?? client.contact_name}` : ""
        }`}
        action={<QuoteStatusBadge status={quote.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Line items</h2>
            </div>

            {lines.length === 0 ? (
              <p className="px-6 py-6 text-sm text-navy-600">
                No lines yet. A quote cannot be sent until it has at least one.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <Th>Description</Th>
                      <Th className="text-right">Qty</Th>
                      <Th className="text-right">Unit price</Th>
                      <Th className="text-right">Total</Th>
                      {isDraft ? <Th className="w-10">
                        <span className="sr-only">Remove</span>
                      </Th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id}>
                        <Td>{line.description}</Td>
                        <Td className="text-right tabular-nums">
                          {toNumber(line.quantity)} {line.unit}
                        </Td>
                        <Td className="text-right">
                          <Money value={toNumber(line.unit_price)} />
                        </Td>
                        <Td className="text-right">
                          <Money value={toNumber(line.line_total)} />
                        </Td>
                        {isDraft ? (
                          <Td>
                            <RemoveLineButton
                              quoteId={quote.id}
                              lineId={line.id}
                              description={line.description}
                            />
                          </Td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <dl className="border-t border-navy-200 bg-navy-50 px-6 py-4 text-sm">
              <div className="flex justify-between py-1">
                <dt className="text-navy-600">Subtotal</dt>
                <dd>
                  <Money value={toNumber(quote.subtotal)} />
                </dd>
              </div>
              <div className="flex justify-between py-1">
                <dt className="text-navy-600">
                  VAT at {toNumber(quote.vat_rate)}%
                </dt>
                <dd>
                  <Money value={toNumber(quote.vat_amount)} />
                </dd>
              </div>
              <div className="flex justify-between border-t border-navy-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>
                  <Money value={toNumber(quote.total)} />
                </dd>
              </div>
            </dl>
          </Card>

          {isDraft ? (
            <Card>
              <div className="border-b border-navy-200 px-6 py-4">
                <h2 className="text-lg">Add a line</h2>
              </div>
              <div className="px-6 py-5">
                <AddLineForm quoteId={quote.id} />
              </div>
            </Card>
          ) : null}

          {quote.notes || quote.terms ? (
            <Card>
              <div className="border-b border-navy-200 px-6 py-4">
                <h2 className="text-lg">Notes and terms</h2>
              </div>
              <div className="space-y-4 px-6 py-5 text-sm">
                {quote.notes ? (
                  <div>
                    <h3 className="text-xs font-semibold tracking-[0.1em] text-navy-500 uppercase">
                      Notes
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-navy-700">
                      {quote.notes}
                    </p>
                  </div>
                ) : null}
                {quote.terms ? (
                  <div>
                    <h3 className="text-xs font-semibold tracking-[0.1em] text-navy-500 uppercase">
                      Terms
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-navy-700">
                      {quote.terms}
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Next step</h2>
            </div>
            <div className="px-6 py-5">
              {isDraft ? <SendQuoteForm quoteId={quote.id} /> : null}
              {isSent ? <RespondForm quoteId={quote.id} /> : null}
              {!isDraft && !isSent ? (
                <div className="space-y-4">
                  <p className="text-sm text-navy-600">
                    This quote is {quote.status.toLowerCase()}
                    {quote.responded_at
                      ? `, recorded ${formatDate(quote.responded_at)}`
                      : ""}
                    .
                  </p>
                  {quote.status !== "SUPERSEDED" ? (
                    <NewVersionForm quoteId={quote.id} />
                  ) : null}
                </div>
              ) : null}
              {isSent ? (
                <div className="mt-6 border-t border-navy-100 pt-4">
                  <NewVersionForm quoteId={quote.id} />
                </div>
              ) : null}
            </div>
          </Card>

          {project ? (
            <Card>
              <div className="border-b border-navy-200 px-6 py-4">
                <h2 className="text-lg">Project</h2>
              </div>
              <div className="px-6 py-5 text-sm">
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="font-medium underline underline-offset-4"
                >
                  {project.reference}
                </Link>
                <p className="mt-1 text-navy-600">{project.title}</p>
              </div>
            </Card>
          ) : null}

          {versions.length > 1 ? (
            <Card>
              <div className="border-b border-navy-200 px-6 py-4">
                <h2 className="text-lg">Versions</h2>
              </div>
              <ul className="divide-y divide-navy-100">
                {versions.map((version) => (
                  <li
                    key={version.id}
                    className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
                  >
                    <span>
                      {version.id === quote.id ? (
                        <span className="font-semibold">
                          v{version.version} (this one)
                        </span>
                      ) : (
                        <Link
                          href={`/admin/quotes/${version.id}`}
                          className="underline underline-offset-4"
                        >
                          v{version.version}
                        </Link>
                      )}
                    </span>
                    <span className="flex items-center gap-3">
                      <Money value={toNumber(version.total)} />
                      <QuoteStatusBadge status={version.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {isDraft ? (
            <Card>
              <div className="border-b border-navy-200 px-6 py-4">
                <h2 className="text-lg">Quote details</h2>
              </div>
              <div className="px-6 py-5">
                <QuoteDetailsForm
                  quoteId={quote.id}
                  title={quote.title}
                  vatRate={quote.vat_rate}
                  validUntil={quote.valid_until}
                  notes={quote.notes}
                  terms={quote.terms}
                />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
