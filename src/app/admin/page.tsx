import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  DataTable,
  EmptyState,
  LeadStatusBadge,
  Money,
  ProjectStageBadge,
  PageHeader,
  StatTile,
  Td,
  Th,
} from "@/components/admin/ui";
import { getDashboardData } from "@/lib/db/queries";
import { DIVISION_LABELS, toNumber } from "@/lib/db/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const {
    counts,
    leads,
    openLeads,
    staleLeads: stale,
    liveProjects,
    outstandingQuotes,
    staleDays: STALE_DAYS,
  } = await getDashboardData();

  const pipelineValue = outstandingQuotes.reduce(
    (sum, quote) => sum + toNumber(quote.total),
    0,
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Where the work is right now, and what is not moving."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="New leads"
          value={counts.NEW ?? 0}
          hint="Not yet contacted"
          href="/admin/leads?status=NEW"
        />
        <StatTile
          label="Open leads"
          value={openLeads.length}
          hint="Anything not won or lost"
          href="/admin/leads"
        />
        <StatTile
          label="Live projects"
          value={liveProjects.length}
          hint="Scheduled, in progress or snagging"
          href="/admin/projects"
        />
        <StatTile
          label="Quotes out"
          value={<Money value={pipelineValue} />}
          hint={`${outstandingQuotes.length} awaiting a decision`}
          href="/admin/quotes"
        />
      </div>

      {stale.length > 0 ? (
        <Card className="mt-8 border-gold-300 bg-gold-50">
          <div className="flex items-start gap-3 p-5">
            <AlertTriangle
              className="mt-0.5 size-5 shrink-0 text-gold-700"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base">
                {stale.length} {stale.length === 1 ? "lead has" : "leads have"} not
                moved in {STALE_DAYS} days
              </h2>
              <p className="mt-1 text-sm text-navy-700">
                These are the ones that quietly turn into lost work.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {stale.slice(0, 5).map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {lead.name}
                    </Link>
                    <span className="text-navy-600">
                      {" "}
                      - {lead.reference}, last touched {formatDate(lead.updated_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl">Latest leads</h2>
          <Link
            href="/admin/leads"
            className="text-sm font-semibold underline underline-offset-4"
          >
            All leads
          </Link>
        </div>

        {leads.length === 0 ? (
          <EmptyState
            title="No leads yet"
            body="Enquiries from the website land here the moment they are submitted."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Name</Th>
                <Th>Division</Th>
                <Th>Status</Th>
                <Th>Received</Th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 8).map((lead) => (
                <tr key={lead.id}>
                  <Td>
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {lead.reference}
                    </Link>
                  </Td>
                  <Td>{lead.name}</Td>
                  <Td>
                    {lead.division ? DIVISION_LABELS[lead.division] : "Not sure"}
                  </Td>
                  <Td>
                    <LeadStatusBadge status={lead.status} />
                  </Td>
                  <Td className="text-navy-600">{formatDate(lead.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl">Live projects</h2>
          <Link
            href="/admin/projects"
            className="text-sm font-semibold underline underline-offset-4"
          >
            All projects
          </Link>
        </div>

        {liveProjects.length === 0 ? (
          <EmptyState
            title="Nothing on site"
            body="Projects appear here once they are scheduled or under way."
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Title</Th>
                <Th>Division</Th>
                <Th>Stage</Th>
                <Th>Starts</Th>
              </tr>
            </thead>
            <tbody>
              {liveProjects.slice(0, 8).map((project) => (
                <tr key={project.id}>
                  <Td>
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      {project.reference}
                    </Link>
                  </Td>
                  <Td>{project.title}</Td>
                  <Td>{DIVISION_LABELS[project.division]}</Td>
                  <Td>
                    <ProjectStageBadge stage={project.stage} />
                  </Td>
                  <Td className="text-navy-600">
                    {project.start_date ? formatDate(project.start_date) : "Not set"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </>
  );
}
