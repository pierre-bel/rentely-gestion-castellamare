import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import MonthRangePicker from "./MonthRangePicker";

interface EarningsReportFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startMonth: Date | null;
  endMonth: Date | null;
  minGross: string;
  maxGross: string;
  minNet: string;
  maxNet: string;
  onApply: (filters: {
    startMonth: Date | null;
    endMonth: Date | null;
    minGross: string;
    maxGross: string;
    minNet: string;
    maxNet: string;
  }) => void;
  onClear: () => void;
}

const EarningsReportFiltersSheet = ({
  open,
  onOpenChange,
  startMonth,
  endMonth,
  minGross,
  maxGross,
  minNet,
  maxNet,
  onApply,
  onClear,
}: EarningsReportFiltersSheetProps) => {
  const [localStartMonth, setLocalStartMonth] = useState<Date | null>(startMonth);
  const [localEndMonth, setLocalEndMonth] = useState<Date | null>(endMonth);
  const [localMinGross, setLocalMinGross] = useState(minGross);
  const [localMaxGross, setLocalMaxGross] = useState(maxGross);
  const [localMinNet, setLocalMinNet] = useState(minNet);
  const [localMaxNet, setLocalMaxNet] = useState(maxNet);

  useEffect(() => {
    setLocalStartMonth(startMonth);
    setLocalEndMonth(endMonth);
    setLocalMinGross(minGross);
    setLocalMaxGross(maxGross);
    setLocalMinNet(minNet);
    setLocalMaxNet(maxNet);
  }, [startMonth, endMonth, minGross, maxGross, minNet, maxNet]);

  const handleApply = () => {
    onApply({
      startMonth: localStartMonth,
      endMonth: localEndMonth,
      minGross: localMinGross,
      maxGross: localMaxGross,
      minNet: localMinNet,
      maxNet: localMaxNet,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalStartMonth(null);
    setLocalEndMonth(null);
    setLocalMinGross("");
    setLocalMaxGross("");
    setLocalMinNet("");
    setLocalMaxNet("");
    onClear();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtrer le rapport de revenus</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Période</Label>
            <MonthRangePicker
              startMonth={localStartMonth}
              endMonth={localEndMonth}
              onStartMonthChange={setLocalStartMonth}
              onEndMonthChange={setLocalEndMonth}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Fourchette revenus bruts</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={localMinGross}
                  onChange={(e) => setLocalMinGross(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={localMaxGross}
                  onChange={(e) => setLocalMaxGross(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Fourchette revenus nets</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={localMinNet}
                  onChange={(e) => setLocalMinNet(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={localMaxNet}
                  onChange={(e) => setLocalMaxNet(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Réinitialiser
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Appliquer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default EarningsReportFiltersSheet;
