import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface UsersFiltersSheetProps {
  roleFilter: string;
  statusFilter: string;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  activeFilterCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsersFiltersSheet({
  roleFilter,
  statusFilter,
  onRoleFilterChange,
  onStatusFilterChange,
  activeFilterCount,
  open,
  onOpenChange,
}: UsersFiltersSheetProps) {
  const [pendingRoleFilter, setPendingRoleFilter] = useState(roleFilter);
  const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);

  // Sync local state when sheet opens or parent filters change
  useEffect(() => {
    if (open) {
      setPendingRoleFilter(roleFilter);
      setPendingStatusFilter(statusFilter);
    }
  }, [open, roleFilter, statusFilter]);

  const handleClearFilters = () => {
    setPendingRoleFilter("all");
    setPendingStatusFilter("all");
    onRoleFilterChange("all");
    onStatusFilterChange("all");
  };

  const handleApply = () => {
    onRoleFilterChange(pendingRoleFilter);
    onStatusFilterChange(pendingStatusFilter);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Filter Users</SheetTitle>
          <SheetDescription>
            Apply filters to refine your user search results
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Role Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Role</Label>
            <RadioGroup value={pendingRoleFilter} onValueChange={setPendingRoleFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="role-all" />
                <Label htmlFor="role-all" className="font-normal cursor-pointer">
                  All Roles
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="admin" id="role-admin" />
                <Label htmlFor="role-admin" className="font-normal cursor-pointer">
                  Admin
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="host" id="role-host" />
                <Label htmlFor="role-host" className="font-normal cursor-pointer">
                  Host
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="guest" id="role-guest" />
                <Label htmlFor="role-guest" className="font-normal cursor-pointer">
                  Guest
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <RadioGroup value={pendingStatusFilter} onValueChange={setPendingStatusFilter}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="font-normal cursor-pointer">
                  All Statuses
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="status-active" />
                <Label htmlFor="status-active" className="font-normal cursor-pointer">
                  Active
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inactive" id="status-inactive" />
                <Label htmlFor="status-inactive" className="font-normal cursor-pointer">
                  Inactive
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suspended" id="status-suspended" />
                <Label htmlFor="status-suspended" className="font-normal cursor-pointer">
                  Suspended
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
