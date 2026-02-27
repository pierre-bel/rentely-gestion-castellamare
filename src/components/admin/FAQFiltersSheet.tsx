import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FAQ_CATEGORIES } from "./types/content";

interface FAQFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryFilter: string | null;
  statusFilter: string | null;
  onApplyFilters: (filters: { category: string | null; status: string | null }) => void;
  onClearFilters: () => void;
}

export default function FAQFiltersSheet({
  open,
  onOpenChange,
  categoryFilter,
  statusFilter,
  onApplyFilters,
  onClearFilters,
}: FAQFiltersSheetProps) {
  const [tempCategory, setTempCategory] = useState<string | null>(categoryFilter);
  const [tempStatus, setTempStatus] = useState<string | null>(statusFilter);

  useEffect(() => {
    if (open) {
      setTempCategory(categoryFilter);
      setTempStatus(statusFilter);
    }
  }, [open, categoryFilter, statusFilter]);

  const handleApply = () => {
    onApplyFilters({
      category: tempCategory,
      status: tempStatus,
    });
  };

  const handleClear = () => {
    setTempCategory(null);
    setTempStatus(null);
    onClearFilters();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter FAQs</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Category Filter */}
          <div className="space-y-3">
            <Label>Category</Label>
            <RadioGroup value={tempCategory || "all"} onValueChange={(value) => setTempCategory(value === "all" ? null : value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="cat-all" />
                <Label htmlFor="cat-all" className="font-normal cursor-pointer">
                  All Categories
                </Label>
              </div>
              {FAQ_CATEGORIES.map((category) => (
                <div key={category.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={category.value} id={`cat-${category.value}`} />
                  <Label htmlFor={`cat-${category.value}`} className="font-normal cursor-pointer">
                    {category.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label>Status</Label>
            <RadioGroup value={tempStatus || "all"} onValueChange={(value) => setTempStatus(value === "all" ? null : value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="status-all" />
                <Label htmlFor="status-all" className="font-normal cursor-pointer">
                  All Statuses
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="draft" id="status-draft" />
                <Label htmlFor="status-draft" className="font-normal cursor-pointer">
                  Draft
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="published" id="status-published" />
                <Label htmlFor="status-published" className="font-normal cursor-pointer">
                  Published
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
