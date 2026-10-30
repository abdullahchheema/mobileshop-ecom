import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Labelled input with its first validation error underneath. */
export function Field({
  label,
  name,
  error,
  hint,
  className,
  ...props
}: { label: string; name: string; error?: string[]; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={Boolean(error)} className="h-11" {...props} />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError messages={error} />
    </div>
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}
