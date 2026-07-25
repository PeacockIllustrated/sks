import Link from "next/link";
import {
  DataTable,
  EmptyState,
  Money,
  PageHeader,
  ProjectStageBadge,
  Td,
  Th,
} from "@/components/admin/ui";
import { getClients, getProjects } from "@/lib/db/queries";
import { DIVISION_LABELS, toNumber } from "@/lib/db/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, clients] = await Promise.all([getProjects(200), getClients()]);
  const clientNames = new Map(
    clients.map((client) => [
      client.id,
      client.company_name ?? client.contact_name,
    ]),
  );

  return (
    <>
      <PageHeader
        title="Projects"
        description="Every job on the books, from enquiry through to handover."
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body="Projects are created by converting a qualified lead."
          action={
            <Link
              href="/admin/leads"
              className="font-semibold underline underline-offset-4"
            >
              Go to leads
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
              <Th>Division</Th>
              <Th>Stage</Th>
              <Th className="text-right">Value</Th>
              <Th>Starts</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-navy-50">
                <Td>
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {project.reference}
                  </Link>
                </Td>
                <Td>{project.title}</Td>
                <Td className="text-navy-600">
                  {clientNames.get(project.client_id) ?? "Unknown"}
                </Td>
                <Td>{DIVISION_LABELS[project.division]}</Td>
                <Td>
                  <ProjectStageBadge stage={project.stage} />
                </Td>
                <Td className="text-right">
                  {project.contract_value ? (
                    <Money value={toNumber(project.contract_value)} />
                  ) : (
                    <span className="text-navy-400">-</span>
                  )}
                </Td>
                <Td className="text-navy-600 whitespace-nowrap">
                  {project.start_date ? formatDate(project.start_date) : "Not set"}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
