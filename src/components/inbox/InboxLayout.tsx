import { ReactNode } from "react";

interface InboxLayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
  showMobileSidebar: boolean;
}

export const InboxLayout = ({ sidebar, main, showMobileSidebar }: InboxLayoutProps) => {
  return (
    <div className="bg-white rounded-lg overflow-hidden h-[calc(100vh-200px)] min-h-[600px]">
      <div className="flex h-full gap-4">
        {/* Desktop: Always show sidebar */}
        <div className="hidden md:block md:w-[400px]">
          {sidebar}
        </div>

        {/* Mobile: Toggle between sidebar and main */}
        <div className={`md:hidden w-full ${showMobileSidebar ? 'block' : 'hidden'}`}>
          {sidebar}
        </div>
        <div className={`md:hidden w-full ${!showMobileSidebar ? 'block' : 'hidden'}`}>
          {main}
        </div>

        {/* Desktop: Always show main */}
        <div className="hidden md:flex md:flex-1">
          {main}
        </div>
      </div>
    </div>
  );
};
