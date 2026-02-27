import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Filter, Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useDemoData } from "@/hooks/useDemoData";
import FAQTable from "./FAQTable";
import FAQFiltersSheet from "./FAQFiltersSheet";
import CreateEditFAQDialog from "./CreateEditFAQDialog";
import type { FAQ } from "./types/content";

export default function FAQManagement() {
  const queryClient = useQueryClient();
  const { isDemoMode, getAdminFAQs, deleteAdminFAQ } = useDemoData();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        const result = deleteAdminFAQ(id);
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete FAQ');
        }
      } else {
        const { error } = await supabase
          .from('faqs')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("FAQ deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete FAQ");
    },
  });

  const { data: faqs = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-faqs', debouncedSearch, categoryFilter, statusFilter, sortValue],
    queryFn: async () => {
      const [sortBy, sortOrder] = sortValue.split('-');
      
      if (isDemoMode) {
        const result = getAdminFAQs({
          searchQuery: debouncedSearch || null,
          categoryFilter,
          statusFilter,
          sortBy,
          sortOrder,
        });
        return result || [];
      } else {
        const { data, error } = await supabase.rpc('admin_search_faqs', {
          search_query: debouncedSearch || null,
          category_filter: categoryFilter,
          status_filter: statusFilter,
          sort_by: sortBy,
          sort_order: sortOrder,
        });

        if (error) throw error;
        return data as FAQ[];
      }
    },
  });

  const handleCreateClick = () => {
    setEditingFAQ(null);
    setDialogOpen(true);
  };

  const handleEditClick = (faq: FAQ) => {
    setEditingFAQ(faq);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingFAQ(null);
    refetch();
  };

  const handleApplyFilters = (filters: { category: string | null; status: string | null }) => {
    setCategoryFilter(filters.category);
    setStatusFilter(filters.status);
    setFiltersOpen(false);
  };

  const handleClearFilters = () => {
    setCategoryFilter(null);
    setStatusFilter(null);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <>
      {/* Controls Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: Search */}
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>

        {/* Right: Filters, Sort, and Create */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(categoryFilter || statusFilter) && (
              <span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {[categoryFilter, statusFilter].filter(Boolean).length}
              </span>
            )}
          </Button>

          <Select value={sortValue} onValueChange={setSortValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="created_at-desc">Newest First</SelectItem>
              <SelectItem value="created_at-asc">Oldest First</SelectItem>
              <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
              <SelectItem value="updated_at-asc">Least Recently Updated</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* FAQ Table */}
      <div className="mt-6">
        <FAQTable
          faqs={faqs}
          isLoading={isLoading}
          onEdit={handleEditClick}
          onDelete={handleDelete}
        />
      </div>

      {/* Filters Sheet */}
      <FAQFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Create/Edit Dialog */}
      <CreateEditFAQDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        faq={editingFAQ}
        onSuccess={handleDialogClose}
        isDemoMode={isDemoMode}
      />
    </>
  );
}
