import * as React from "react";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import {
  LEAD_STATUS_LABELS,
  PROJECT_STAGE_LABELS,
  QUOTE_STATUS_LABELS,
  type LeadStatus,
  type ProjectStage,
  type QuoteStatus,
} from "@/lib/db/types";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-navy-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border border-navy-200 bg-white", className)}>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs font-semibold tracking-[0.15em] text-navy-500 uppercase">
        {label}
      </p>
      <p className="font-display mt-2 text-3xl font-bold text-navy-800">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-navy-500">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block border border-navy-200 bg-white p-5 hover:border-navy-800"
      >
        {inner}
      </Link>
    );
  }

  return <div className="border border-navy-200 bg-white p-5">{inner}</div>;
}

/**
 * Status colours are borders and tinted backgrounds, never colour alone: the
 * label always carries the meaning too.
 */
const toneClasses = {
  neutral: "border-navy-300 bg-navy-50 text-navy-700",
  active: "border-gold-300 bg-gold-50 text-gold-800",
  good: "border-green-300 bg-green-50 text-green-900",
  bad: "border-red-300 bg-red-50 text-red-900",
} as const;

type Tone = keyof typeof toneClasses;

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}

const leadTones: Record<LeadStatus, Tone> = {
  NEW: "active",
  CONTACTED: "neutral",
  QUALIFIED: "neutral",
  QUOTED: "neutral",
  WON: "good",
  LOST: "bad",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <Pill tone={leadTones[status]}>{LEAD_STATUS_LABELS[status]}</Pill>;
}

const stageTones: Record<ProjectStage, Tone> = {
  ENQUIRY: "neutral",
  SURVEY: "neutral",
  QUOTED: "neutral",
  SCHEDULED: "active",
  IN_PROGRESS: "active",
  SNAGGING: "active",
  COMPLETE: "good",
  ON_HOLD: "bad",
  CANCELLED: "bad",
};

export function ProjectStageBadge({ stage }: { stage: ProjectStage }) {
  return <Pill tone={stageTones[stage]}>{PROJECT_STAGE_LABELS[stage]}</Pill>;
}

const quoteTones: Record<QuoteStatus, Tone> = {
  DRAFT: "neutral",
  SENT: "active",
  ACCEPTED: "good",
  DECLINED: "bad",
  EXPIRED: "bad",
  SUPERSEDED: "neutral",
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <Pill tone={quoteTones[status]}>{QUOTE_STATUS_LABELS[status]}</Pill>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-navy-300 bg-white p-10 text-center">
      <h2 className="text-lg">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-navy-600">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Money({ value }: { value: number }) {
  return <span className="tabular-nums">{formatCurrency(value)}</span>;
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-navy-200 bg-white">
      <table className="w-full min-w-3xl border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-navy-200 px-4 py-3 text-left text-xs font-semibold tracking-[0.1em] text-navy-500 uppercase",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-navy-100 px-4 py-3 align-top", className)}>
      {children}
    </td>
  );
}
