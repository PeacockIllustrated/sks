import * as React from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "w-full rounded-none border border-navy-300 bg-white px-3 py-2.5 text-sm text-navy-800 placeholder:text-navy-400 focus:border-navy-800 disabled:opacity-50";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClasses, "min-h-32 resize-y", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClasses, className)} {...props}>
      {children}
    </select>
  );
}

export function Label({
  className,
  children,
  required,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("block text-sm font-semibold text-navy-800", className)}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-1 text-gold-600" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  // Hint sits below the control, not above it. Above the control it changes
  // the label-to-input distance, which knocks inputs out of line with their
  // neighbour when fields sit side by side in a grid. It stays associated
  // through aria-describedby either way.
  return (
    <div>
      <Label htmlFor={htmlFor} required={required} className="mb-1.5">
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-navy-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
