import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  DataTable,
  Money,
  PageHeader,
  ProjectStageBadge,
  QuoteStatusBadge,
  Td,
  Th,
} from "@/components/admin/ui";
import {
  getClient,
  getProfileNames,
  getProject,
  getQuotes,
} from "@/lib/db/queries";
import { DIVISION_LABELS, toNumber } from "@/lib/db/types";
import { formatDate } from "@/lib/utils";
import { NewQuoteControl, ProjectForm } from "./project-controls";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [client, quotes, names] = await Promise.all([
    getClient(project.client_id),
    getQuotes({ projectId: project.id }),
    getProfileNames(),
  ]);

  const accepted = quotes.find((quote) => quote.status === "ACCEPTED");

  return (
    <>
      <Link
        href="/admin/projects"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-navy-600 hover:text-navy-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to projects
      </Link>

      <PageHeader
        title={project.title}
        description={`${project.reference} - ${DIVISION_LABELS[project.division]}`}
        action={<ProjectStageBadge stage={project.stage} />}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <Card>
            <div className="flex items-center justify-between border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Quotes</h2>
              <NewQuoteControl
                projectId={project.id}
                defaultTitle={project.title}
              />
            </div>

            {quotes.length === 0 ? (
              <p className="px-6 py-8 text-sm text-navy-600">
                No quotes yet. Create a draft, add the line items, then send it.
              </p>
            ) : (
              <DataTable>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Title</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <Td>
                        <Link
                          href={`/admin/quotes/${quote.id}`}
                          className="font-medium underline underline-offset-4"
                        >
                          {quote.reference} v{quote.version}
                        </Link>
                      </Td>
                      <Td>{quote.title}</Td>
                      <Td>
                        <QuoteStatusBadge status={quote.status} />
                      </Td>
                      <Td className="text-right">
                        <Money value={toNumber(quote.total)} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            )}
          </Card>

          {project.description ? (
            <Card>
              <div className="border-b border-navy-200 px-6 py-4">
                <h2 className="text-lg">Original enquiry</h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm whitespace-pre-wrap text-navy-700">
                  {project.description}
                </p>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Client</h2>
            </div>
            <div className="px-6 py-5 text-sm">
              {client ? (
                <>
                  <p className="font-medium text-navy-800">
                    {client.company_name ?? client.contact_name}
                  </p>
                  {client.company_name ? (
                    <p className="text-navy-600">{client.contact_name}</p>
                  ) : null}
                  <p className="mt-2">
                    <a
                      href={`mailto:${client.email}`}
                      className="underline underline-offset-4"
                    >
                      {client.email}
                    </a>
                  </p>
                  {client.phone ? (
                    <p>
                      <a
                        href={`tel:${client.phone}`}
                        className="underline underline-offset-4"
                      >
                        {client.phone}
                      </a>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-navy-600">Client record not available.</p>
              )}

              <dl className="mt-4 space-y-2 border-t border-navy-100 pt-4 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-navy-500">Manager</dt>
                  <dd className="text-navy-800">
                    {project.manager_id
                      ? (names.get(project.manager_id) ?? "Unknown")
                      : "Unassigned"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-navy-500">Created</dt>
                  <dd className="text-navy-800">{formatDate(project.created_at)}</dd>
                </div>
                {accepted ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-navy-500">Accepted quote</dt>
                    <dd className="text-navy-800">
                      {accepted.reference} v{accepted.version}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </Card>

          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Details</h2>
            </div>
            <div className="px-6 py-5">
              <ProjectForm
                projectId={project.id}
                stage={project.stage}
                startDate={project.start_date}
                endDate={project.end_date}
                contractValue={project.contract_value}
                siteAddress={project.site_address}
              />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
