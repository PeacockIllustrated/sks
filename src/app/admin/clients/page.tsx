import Link from "next/link";
import {
  DataTable,
  EmptyState,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { getClients, getProjects } from "@/lib/db/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, projects] = await Promise.all([getClients(), getProjects(500)]);

  const projectCounts = new Map<string, number>();
  for (const project of projects) {
    projectCounts.set(
      project.client_id,
      (projectCounts.get(project.client_id) ?? 0) + 1,
    );
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description="Created automatically when a lead is converted. Repeat customers reuse the same record."
      />

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          body="A client record is created the first time you convert one of their leads."
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
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Email</Th>
              <Th>Phone</Th>
              <Th className="text-right">Projects</Th>
              <Th>Portal</Th>
              <Th>Added</Th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-navy-50">
                <Td className="font-medium">{client.contact_name}</Td>
                <Td className="text-navy-600">{client.company_name ?? "-"}</Td>
                <Td>
                  <a
                    href={`mailto:${client.email}`}
                    className="underline underline-offset-4"
                  >
                    {client.email}
                  </a>
                </Td>
                <Td className="text-navy-600">{client.phone ?? "-"}</Td>
                <Td className="text-right tabular-nums">
                  {projectCounts.get(client.id) ?? 0}
                </Td>
                <Td className="text-navy-600">
                  {client.profile_id ? "Has login" : "No login"}
                </Td>
                <Td className="text-navy-600 whitespace-nowrap">
                  {formatDate(client.created_at)}
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
