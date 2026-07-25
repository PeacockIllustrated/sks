import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, LeadStatusBadge, PageHeader } from "@/components/admin/ui";
import { getLead, getProjects, getStaff } from "@/lib/db/queries";
import { DIVISION_LABELS, LEAD_SOURCES } from "@/lib/db/types";
import { formatDate } from "@/lib/utils";
import {
  ConvertControl,
  OwnerControl,
  StatusControl,
} from "./lead-controls";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [staff, projects] = await Promise.all([getStaff(), getProjects(200)]);
  const linkedProject = projects.find((project) => project.lead_id === lead.id);

  const staffOptions = staff.map((member) => ({
    id: member.id,
    name: member.full_name ?? member.email,
  }));

  const sourceLabel = (LEAD_SOURCES as readonly string[]).includes(lead.source)
    ? lead.source.charAt(0) + lead.source.slice(1).toLowerCase()
    : lead.source;

  return (
    <>
      <Link
        href="/admin/leads"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-navy-600 hover:text-navy-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to leads
      </Link>

      <PageHeader
        title={lead.name}
        description={`${lead.reference} - received ${formatDate(lead.created_at)}`}
        action={<LeadStatusBadge status={lead.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">The enquiry</h2>
            </div>
            <div className="px-6 py-5">
              <p className="whitespace-pre-wrap text-navy-700">{lead.message}</p>
            </div>
            <dl className="grid grid-cols-1 gap-px border-t border-navy-200 bg-navy-200 sm:grid-cols-2">
              {[
                { label: "Email", value: lead.email, href: `mailto:${lead.email}` },
                {
                  label: "Phone",
                  value: lead.phone ?? "Not given",
                  href: lead.phone ? `tel:${lead.phone}` : undefined,
                },
                { label: "Postcode", value: lead.postcode ?? "Not given" },
                {
                  label: "Division",
                  value: lead.division
                    ? DIVISION_LABELS[lead.division]
                    : "Not sure yet",
                },
                { label: "Source", value: sourceLabel },
                {
                  label: "First contacted",
                  value: lead.contacted_at
                    ? formatDate(lead.contacted_at)
                    : "Not yet",
                },
              ].map((item) => (
                <div key={item.label} className="bg-white px-6 py-4">
                  <dt className="text-xs font-semibold tracking-[0.1em] text-navy-500 uppercase">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm text-navy-800">
                    {item.href ? (
                      <a href={item.href} className="underline underline-offset-4">
                        {item.value}
                      </a>
                    ) : (
                      item.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {lead.lost_reason ? (
              <div className="border-t border-navy-200 bg-red-50 px-6 py-4">
                <p className="text-xs font-semibold tracking-[0.1em] text-red-900 uppercase">
                  Lost because
                </p>
                <p className="mt-1 text-sm text-red-900">{lead.lost_reason}</p>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Status</h2>
            </div>
            <div className="px-6 py-5">
              <StatusControl leadId={lead.id} status={lead.status} />
            </div>
          </Card>

          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Ownership</h2>
            </div>
            <div className="px-6 py-5">
              <OwnerControl
                leadId={lead.id}
                ownerId={lead.owner_id}
                staff={staffOptions}
              />
            </div>
          </Card>

          <Card>
            <div className="border-b border-navy-200 px-6 py-4">
              <h2 className="text-lg">Project</h2>
            </div>
            <div className="px-6 py-5">
              {linkedProject ? (
                <p className="text-sm text-navy-700">
                  Converted to{" "}
                  <Link
                    href={`/admin/projects/${linkedProject.id}`}
                    className="font-medium underline underline-offset-4"
                  >
                    {linkedProject.reference}
                  </Link>
                  , {linkedProject.title}.
                </p>
              ) : (
                <ConvertControl
                  leadId={lead.id}
                  defaultTitle={
                    lead.division
                      ? `${DIVISION_LABELS[lead.division]} - ${lead.name}`
                      : lead.name
                  }
                  defaultDivision={lead.division}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
