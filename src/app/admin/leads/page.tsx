import Link from "next/link";
import {
  DataTable,
  EmptyState,
  LeadStatusBadge,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { getLeads, getProfileNames } from "@/lib/db/queries";
import {
  DIVISION_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/db/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isLeadStatus(value: string | undefined): value is LeadStatus {
  return !!value && (LEAD_STATUSES as readonly string[]).includes(value);
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = isLeadStatus(status) ? status : "ALL";

  const [leads, names] = await Promise.all([
    getLeads({ status: active, limit: 200 }),
    getProfileNames(),
  ]);

  const filters: { key: LeadStatus | "ALL"; label: string }[] = [
    { key: "ALL", label: "All" },
    ...LEAD_STATUSES.map((value) => ({
      key: value,
      label: LEAD_STATUS_LABELS[value],
    })),
  ];

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every enquiry, and who owns it. Nothing here should sit still."
      />

      <nav aria-label="Filter by status" className="mb-5">
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <li key={filter.key}>
              <Link
                href={
                  filter.key === "ALL"
                    ? "/admin/leads"
                    : `/admin/leads?status=${filter.key}`
                }
                aria-current={active === filter.key ? "true" : undefined}
                className={cn(
                  "inline-block border px-3 py-1.5 text-sm font-medium",
                  active === filter.key
                    ? "border-navy-800 bg-navy-800 text-white"
                    : "border-navy-300 bg-white text-navy-700 hover:border-navy-800",
                )}
              >
                {filter.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {leads.length === 0 ? (
        <EmptyState
          title="Nothing here"
          body={
            active === "ALL"
              ? "Website enquiries appear here as soon as they are submitted."
              : `No leads with the status ${LEAD_STATUS_LABELS[active].toLowerCase()}.`
          }
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Reference</Th>
              <Th>Name</Th>
              <Th>Division</Th>
              <Th>Postcode</Th>
              <Th>Owner</Th>
              <Th>Status</Th>
              <Th>Received</Th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-navy-50">
                <Td>
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {lead.reference}
                  </Link>
                </Td>
                <Td>
                  <span className="block">{lead.name}</span>
                  <span className="block text-xs text-navy-500">{lead.email}</span>
                </Td>
                <Td>{lead.division ? DIVISION_LABELS[lead.division] : "Not sure"}</Td>
                <Td>{lead.postcode ?? "-"}</Td>
                <Td className="text-navy-600">
                  {lead.owner_id ? (names.get(lead.owner_id) ?? "Unknown") : "Unassigned"}
                </Td>
                <Td>
                  <LeadStatusBadge status={lead.status} />
                </Td>
                <Td className="text-navy-600 whitespace-nowrap">
                  {formatDate(lead.created_at)}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
