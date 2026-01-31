interface BooleanCellProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
}

export function BooleanCell({ value, onChange }: BooleanCellProps) {
  return (
    <div className="flex items-center justify-center min-h-[1.5rem] px-2 py-1">
      <input
        type="checkbox"
        className="checkbox checkbox-sm checkbox-primary"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}
