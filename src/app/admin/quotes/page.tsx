import Link from "next/link";
import {
  DataTable,
  EmptyState,
  Money,
  PageHeader,
  QuoteStatusBadge,
  Td,
  Th,
} from "@/components/admin/ui";
import { getClients, getQuotes } from "@/lib/db/queries";
import { toNumber } from "@/lib/db/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const [quotes, clients] = await Promise.all([
    getQuotes({ limit: 200 }),
    getClients(),
  ]);

  const clientNames = new Map(
    clients.map((client) => [
      client.id,
      client.company_name ?? client.contact_name,
    ]),
  );

  const outstanding = quotes
    .filter((quote) => quote.status === "SENT")
    .reduce((sum, quote) => sum + toNumber(quote.total), 0);

  return (
    <>
      <PageHeader
        title="Quotes"
        description={
          quotes.length > 0
            ? `${quotes.filter((q) => q.status === "SENT").length} out with customers, worth ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(outstanding)}.`
            : undefined
        }
      />

      {quotes.length === 0 ? (
        <EmptyState
          title="No quotes yet"
          body="Quotes are raised from a project, so the job and the paperwork stay attached."
          action={
            <Link
              href="/admin/projects"
              className="font-semibold underline underline-offset-4"
            >
              Go to projects
            </Link>
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>Title</Th>
              <Th>Client</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
              <Th>Valid until</Th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-navy-50">
                <Td>
                  <Link
                    href={`/admin/quotes/${quote.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {quote.reference} v{quote.version}
                  </Link>
                </Td>
                <Td>{quote.title}</Td>
                <Td className="text-navy-600">
                  {clientNames.get(quote.client_id) ?? "Unknown"}
                </Td>
                <Td>
                  <QuoteStatusBadge status={quote.status} />
                </Td>
                <Td className="text-right">
                  <Money value={toNumber(quote.total)} />
                </Td>
                <Td className="text-navy-600 whitespace-nowrap">
                  {quote.valid_until ? formatDate(quote.valid_until) : "-"}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
