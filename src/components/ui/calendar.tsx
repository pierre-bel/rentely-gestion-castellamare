import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, modifiersClassNames, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-6 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 border-0",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-10 font-medium text-[0.75rem] uppercase",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected].day-range-start)]:rounded-l-full",
          "[&:has([aria-selected].day-range-end)]:rounded-r-full",
          "[&:has([aria-selected].day-range-middle)]:bg-[#143F3E]/30",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-full hover:bg-accent",
        ),
        day_range_start: "day-range-start !bg-[#143F3E] !text-white hover:!bg-[#143F3E] hover:!text-white rounded-full",
        day_range_end: "day-range-end !bg-[#143F3E] !text-white hover:!bg-[#143F3E] hover:!text-white rounded-full",
        day_selected:
          "bg-[#143F3E] text-white hover:bg-[#143F3E] hover:text-white focus:bg-[#143F3E] focus:text-white rounded-full",
        day_today: "bg-accent text-accent-foreground font-semibold",
        day_outside:
          "day-outside text-muted-foreground/40 opacity-50 pointer-events-none aria-selected:bg-[#143F3E]/30 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground/30 opacity-50 cursor-not-allowed pointer-events-none",
        day_range_middle: 
          "aria-selected:!bg-[#143F3E]/30 aria-selected:text-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      modifiersClassNames={{
        unavailable: "line-through opacity-40 text-muted-foreground cursor-not-allowed pointer-events-none bg-muted/20",
        ...modifiersClassNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
