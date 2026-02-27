import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { FAQ } from "./types/content";

interface FAQTableProps {
  faqs: FAQ[];
  isLoading: boolean;
  onEdit: (faq: FAQ) => void;
  onDelete: (id: string) => void;
}

export default function FAQTable({ faqs, isLoading, onEdit, onDelete }: FAQTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQ | null>(null);

  const handleDeleteClick = (faq: FAQ) => {
    setFaqToDelete(faq);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (faqToDelete) {
      onDelete(faqToDelete.id);
      setDeleteDialogOpen(false);
      setFaqToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (faqs.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold w-[28%]">Question</TableHead>
            <TableHead className="font-semibold w-[12%]">Category</TableHead>
            <TableHead className="font-semibold w-[22%]">Answer</TableHead>
            <TableHead className="font-semibold w-[10%]">Status</TableHead>
            <TableHead className="font-semibold w-[10%]">Created</TableHead>
            <TableHead className="font-semibold w-[10%]">Updated</TableHead>
            <TableHead className="font-semibold w-[8%]">Actions</TableHead>
          </TableRow>
        </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No FAQs found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold w-[28%]">Question</TableHead>
              <TableHead className="font-semibold w-[12%]">Category</TableHead>
              <TableHead className="font-semibold w-[22%]">Answer</TableHead>
              <TableHead className="font-semibold w-[10%]">Status</TableHead>
              <TableHead className="font-semibold w-[10%]">Created</TableHead>
              <TableHead className="font-semibold w-[10%]">Updated</TableHead>
              <TableHead className="font-semibold w-[8%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
          {faqs.map((faq) => (
            <TableRow key={faq.id}>
              <TableCell className="font-medium">
                {faq.question}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {faq.category}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="line-clamp-2 text-sm text-muted-foreground">
                  {faq.answer}
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={faq.status === 'published' ? 'approved' : 'draft'} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(faq.created_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(faq.updated_at), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(faq)}
                    className="hover:bg-accent"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(faq)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FAQ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
