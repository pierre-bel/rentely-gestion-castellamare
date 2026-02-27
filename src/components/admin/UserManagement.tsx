import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { UsersTable } from "./UsersTable";
import { UsersFiltersSheet } from "./UsersFiltersSheet";
import ReviewsManagement from "./ReviewsManagement";
import { useDemoData } from "@/hooks/useDemoData";

const UserManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);
  const { isDemoMode, getAdminUsers } = useDemoData();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, roleFilter, statusFilter, sortValue, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) {
        const [sortBy, sortOrder] = sortValue.split("-");
        return getAdminUsers({
          searchQuery: debouncedSearch || null,
          statusFilter: statusFilter === "all" ? null : statusFilter,
          roleFilter: roleFilter === "all" ? null : roleFilter,
          sortBy,
          sortOrder,
        });
      }
      
      const [sortBy, sortOrder] = sortValue.split("-");
      const { data, error } = await supabase.rpc("admin_search_users", {
        search_query: debouncedSearch || null,
        status_filter: statusFilter === "all" ? null : (statusFilter as "active" | "inactive" | "suspended"),
        role_filter: roleFilter === "all" ? null : (roleFilter as "admin" | "host" | "guest"),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (error) throw error;
      return data;
    },
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (roleFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    return count;
  }, [roleFilter, statusFilter]);

  const hasActiveFilters = Boolean(searchQuery || roleFilter !== "all" || statusFilter !== "all");

  return (
    <Card className="w-full">
      <CardContent className="py-6">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Left: Search */}
              <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>

              {/* Right: Filters and Sort */}
              <div className="flex items-center gap-2">
                <UsersFiltersSheet
                  roleFilter={roleFilter}
                  statusFilter={statusFilter}
                  onRoleFilterChange={setRoleFilter}
                  onStatusFilterChange={setStatusFilter}
                  activeFilterCount={activeFilterCount}
                  open={filtersOpen}
                  onOpenChange={setFiltersOpen}
                />

                <Select value={sortValue} onValueChange={setSortValue}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at-desc">Newest First</SelectItem>
                    <SelectItem value="created_at-asc">Oldest First</SelectItem>
                    <SelectItem value="full_name-asc">Name A-Z</SelectItem>
                    <SelectItem value="full_name-desc">Name Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <UsersTable
              users={users}
              loading={isLoading}
              hasActiveFilters={hasActiveFilters}
            />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsManagement />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
