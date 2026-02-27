import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemoData } from "@/hooks/useDemoData";
import type { FAQ, FAQFormData } from "./types/content";
import { FAQ_CATEGORIES, FAQ_STATUSES } from "./types/content";

const faqFormSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters"),
  answer: z.string().min(20, "Answer must be at least 20 characters"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(['draft', 'published']),
});

interface CreateEditFAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq: FAQ | null;
  onSuccess: () => void;
  isDemoMode: boolean;
}

export default function CreateEditFAQDialog({
  open,
  onOpenChange,
  faq,
  onSuccess,
  isDemoMode,
}: CreateEditFAQDialogProps) {
  const isEditing = !!faq;
  const { createAdminFAQ, updateAdminFAQ } = useDemoData();

  const form = useForm<FAQFormData>({
    resolver: zodResolver(faqFormSchema),
    defaultValues: {
      question: "",
      answer: "",
      category: "general",
      status: "draft",
    },
  });

  useEffect(() => {
    if (faq) {
      form.reset({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        status: faq.status,
      });
    } else {
      form.reset({
        question: "",
        answer: "",
        category: "general",
        status: "draft",
      });
    }
  }, [faq, form]);

  const onSubmit = async (data: FAQFormData) => {
    try {
      if (isDemoMode) {
        // Demo mode: Use localStorage
        if (isEditing) {
          const result = updateAdminFAQ(faq.id, data);
          if (!result.success) {
            throw new Error(result.error || 'Failed to update FAQ');
          }
          toast.success("FAQ updated successfully");
        } else {
          const result = createAdminFAQ(data);
          if (!result.success) {
            throw new Error(result.error || 'Failed to create FAQ');
          }
          toast.success("FAQ created successfully");
        }
      } else {
        // Real mode: Use Supabase
        if (isEditing) {
          const { error } = await supabase
            .from('faqs')
            .update(data)
            .eq('id', faq.id);

          if (error) throw error;
          toast.success("FAQ updated successfully");
        } else {
          const { error } = await supabase
            .from('faqs')
            .insert([data]);

          if (error) throw error;
          toast.success("FAQ created successfully");
        }
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]" style={{ backgroundColor: '#F8FAFF' }}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit FAQ" : "Create New FAQ"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white">
                      {FAQ_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value} className="bg-white hover:bg-accent">
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter the FAQ question" 
                      className="bg-white"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Answer</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the answer to the question"
                      className="min-h-[120px] bg-white"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white">
                      {FAQ_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value} className="bg-white hover:bg-accent">
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {isEditing ? "Save Changes" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
