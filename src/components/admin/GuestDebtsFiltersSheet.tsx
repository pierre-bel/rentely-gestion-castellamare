import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface GuestDebtsFiltersSheetProps {
  statusFilter: string;
  reasonFilter: string;
  minAmount: number | undefined;
  maxAmount: number | undefined;
  onStatusFilterChange: (value: string) => void;
  onReasonFilterChange: (value: string) => void;
  onMinAmountChange: (value: number | undefined) => void;
  onMaxAmountChange: (value: number | undefined) => void;
  activeFiltersCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GuestDebtsFiltersSheet = ({
  statusFilter,
  reasonFilter,
  minAmount,
  maxAmount,
  onStatusFilterChange,
  onReasonFilterChange,
  onMinAmountChange,
  onMaxAmountChange,
  activeFiltersCount,
  open,
  onOpenChange,
}: GuestDebtsFiltersSheetProps) => {
  const handleClearFilters = () => {
    onStatusFilterChange("all");
    onReasonFilterChange("all");
    onMinAmountChange(undefined);
    onMaxAmountChange(undefined);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Guest Debts</SheetTitle>
          <SheetDescription>
            Refine your search with advanced filters
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason Filter */}
          <div className="space-y-2">
            <Label htmlFor="reason-filter">Reason</Label>
            <Select value={reasonFilter} onValueChange={onReasonFilterChange}>
              <SelectTrigger id="reason-filter">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="property_damage">Property Damage</SelectItem>
                <SelectItem value="cleaning_issues">Cleaning Issues</SelectItem>
                <SelectItem value="noise_complaints">Noise Complaints</SelectItem>
                <SelectItem value="unauthorized_guests">Unauthorized Guests</SelectItem>
                <SelectItem value="smoking_violation">Smoking Violation</SelectItem>
                <SelectItem value="pet_violation">Pet Violation</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Range */}
          <div className="space-y-4">
            <Label>Amount Range</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-amount" className="text-xs text-muted-foreground">
                  Min Amount
                </Label>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="0"
                  value={minAmount ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onMinAmountChange(val ? parseFloat(val) : undefined);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-amount" className="text-xs text-muted-foreground">
                  Max Amount
                </Label>
                <Input
                  id="max-amount"
                  type="number"
                  placeholder="Any"
                  value={maxAmount ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onMaxAmountChange(val ? parseFloat(val) : undefined);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Clear All Filters ({activeFiltersCount})
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GuestDebtsFiltersSheet;
