import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertPostSchema } from "@shared/schema";
import type { Bowl } from "@shared/schema";
import { ChevronDown } from "lucide-react";

const createPostSchema = insertPostSchema.extend({
  title: z.string().min(1, "Title is required").max(300, "Title too long"),
  content: z.string().min(1, "Content is required"),
  bowlId: z.number().min(1, "Please select a bowl"),
  isAnonymous: z.boolean().default(false),
}).omit({
  organizationId: true,
  sentiment: true,
  type: true,
  authorId: true,
  imageUrl: true,
});

type CreatePostForm = z.infer<typeof createPostSchema>;

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultBowlId?: number;
}

export default function CreatePostModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultBowlId 
}: CreatePostModalProps) {
  const { toast } = useToast();

  const form = useForm<CreatePostForm>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      bowlId: defaultBowlId || undefined,
      isAnonymous: false,
    },
  });

  const { data: bowls, isLoading: bowlsLoading } = useQuery<Bowl[]>({
    queryKey: ["/api/bowls"],
    enabled: open,
    retry: false,
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: CreatePostForm) => {
      await apiRequest("POST", "/api/posts", {
        ...data,
        type: "discussion",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Discussion created successfully!",
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create discussion. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePostForm) => {
    createPostMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-4 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
              <span>Back to Home</span>
            </Button>
          </div>
          <DialogTitle className="text-xl font-semibold">Create Discussion</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Bowl Selection */}
            <FormField
              control={form.control}
              name="bowlId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bowl *</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    disabled={bowlsLoading || !!defaultBowlId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bowl..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bowls?.map((bowl) => (
                        <SelectItem key={bowl.id} value={bowl.id.toString()}>
                          {bowl.name} ({bowl.memberCount} members)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="What would you like to discuss?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your thoughts, questions, or experiences..."
                      rows={8}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Anonymous Option */}
            <FormField
              control={form.control}
              name="isAnonymous"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Post anonymously</FormLabel>
                    <p className="text-sm text-gray-500">
                      Your username will be hidden but you'll still earn karma
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button 
                type="submit" 
                disabled={createPostMutation.isPending}
                className="flex-1 bg-professional-blue hover:bg-professional-blue/90 text-white"
              >
                {createPostMutation.isPending ? "Creating..." : "Create Discussion"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
