import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronsUpDown, Check, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tenant } from "./HostTenants";

interface Props {
  tenants: Tenant[];
  value: string;
  onChange: (tenantId: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function TenantSearchCombobox({
  tenants,
  value,
  onChange,
  placeholder = "Choisir un locataire...",
  allowClear = false,
  clearLabel = "Aucun locataire",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = tenants.find((t) => t.id === value);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return tenants;
    const terms = q.split(/\s+/);
    return tenants.filter((t) => {
      const haystack = normalize(
        `${t.first_name || ""} ${t.last_name || ""} ${t.email || ""} ${t.phone || ""}`
      );
      return terms.every((term) => haystack.includes(term));
    });
  }, [tenants, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected
              ? `${selected.first_name} ${selected.last_name || ""}`.trim()
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher (nom, prénom, e-mail, tél.)..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Aucun locataire trouvé</CommandEmpty>
            {allowClear && (
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <UserX className="mr-2 h-4 w-4 text-muted-foreground" />
                  {clearLabel}
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {filtered.map((t) => (
                <CommandItem
                  key={t.id}
                  value={t.id}
                  onSelect={() => {
                    onChange(t.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === t.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.first_name} {t.last_name || ""}
                    </p>
                    {(t.email || t.phone) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {t.email || t.phone}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
