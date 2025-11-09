import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InsertBowl } from "@shared/schema";

const createBowlSchema = z.object({
  name: z.string().min(3, "Bowl name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["industries", "job-groups", "general", "user-moderated"]),
});

type CreateBowlData = z.infer<typeof createBowlSchema>;

interface CreateBowlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateBowlModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateBowlModalProps) {
  const { toast } = useToast();
  
  const form = useForm<CreateBowlData>({
    resolver: zodResolver(createBowlSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "general",
    },
  });

  const createBowlMutation = useMutation({
    mutationFn: async (data: CreateBowlData) => {
      const response = await apiRequest("POST", "/api/bowls", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bowls"] });
      toast({
        title: "Bowl created successfully!",
        description: "Your new community bowl is ready for discussions.",
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create bowl",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateBowlData) => {
    createBowlMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">
            Create New Bowl
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bowl Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Software Engineers, Marketing Professionals"
                      className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="industries">Industries</SelectItem>
                      <SelectItem value="job-groups">Job Groups</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="user-moderated">User-Moderated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this community bowl is about..."
                      className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createBowlMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBowlMutation.isPending}
                className="bg-reddit-orange hover:bg-reddit-orange/90 text-white"
              >
                {createBowlMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Bowl"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}