import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocTypes } from "@/hooks/use-doc-types";

interface DocTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  allowUnknown?: boolean;
}

export function DocTypeSelect({
  value,
  onChange,
  id,
  disabled,
  placeholder = "Select a document type",
}: DocTypeSelectProps) {
  const { docTypes } = useDocTypes();

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label="Document type">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {docTypes.map((dt) => (
          <SelectItem key={dt.id} value={dt.id}>
            {dt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
