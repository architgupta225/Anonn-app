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
import { insertPostSchema, insertOrganizationSchema } from "@shared/schema";
import { ThumbsUp, Meh, ThumbsDown, CloudUpload } from "lucide-react";
import type { Organization } from "@shared/schema";

const createReviewSchema = insertPostSchema.extend({
  title: z.string().min(1, "Title is required").max(300, "Title too long"),
  content: z.string().min(1, "Review content is required"),
  organizationId: z.number().min(1, "Please select an organization"),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  isAnonymous: z.boolean().default(false),
}).omit({
  bowlId: true,
  type: true,
  authorId: true,
  imageUrl: true,
});

type CreateReviewForm = z.infer<typeof createReviewSchema>;

interface CreateReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultOrganizationId?: number;
}

export default function CreateReviewModal({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultOrganizationId 
}: CreateReviewModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  const form = useForm<CreateReviewForm>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      title: "",
      content: "",
      organizationId: defaultOrganizationId || undefined,
      sentiment: "positive",
      isAnonymous: false,
    },
  });

  const selectedSentiment = form.watch("sentiment");

  const { data: organizations, isLoading: orgsLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) {
        const response = await fetch("/api/organizations", {
          credentials: "include",
        });
        if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
        return response.json();
      } else {
        const response = await fetch(`/api/organizations/search?q=${encodeURIComponent(searchQuery)}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
        return response.json();
      }
    },
    enabled: open,
    retry: false,
  });

  const createOrganizationMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/organizations", {
        name,
        description: `Organization created by user for review`,
      });
      return response.json();
    },
    onSuccess: (newOrg) => {
      form.setValue("organizationId", newOrg.id);
      setShowCreateOrg(false);
      setSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: "Success",
        description: "Organization created successfully!",
      });
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
        description: "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: CreateReviewForm) => {
      await apiRequest("POST", "/api/posts", {
        ...data,
        type: "review",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Review created successfully! (+5 karma)",
      });
      form.reset();
      onOpenChange(false);
      onSuccess();
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
        description: "Failed to create review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateReviewForm) => {
    createReviewMutation.mutate(data);
  };

  const sentimentOptions = [
    {
      value: "positive",
      label: "Positive",
      icon: ThumbsUp,
      bgColor: "border-positive bg-positive/10",
      textColor: "text-positive",
      description: "Great experience overall"
    },
    {
      value: "neutral",
      label: "Neutral", 
      icon: Meh,
      bgColor: "border-neutral bg-neutral/10",
      textColor: "text-neutral",
      description: "Mixed or average experience"
    },
    {
      value: "negative",
      label: "Negative",
      icon: ThumbsDown,
      bgColor: "border-negative bg-negative/10", 
      textColor: "text-negative",
      description: "Poor experience overall"
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Write a Review</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Organization Selection */}
            <FormField
              control={form.control}
              name="organizationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization *</FormLabel>
                  {!showCreateOrg ? (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Search for organization..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowCreateOrg(true)}
                        >
                          Create New
                        </Button>
                      </div>
                      
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                        disabled={orgsLoading || !!defaultOrganizationId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {organizations?.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="Enter organization name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (searchQuery.trim()) {
                              createOrganizationMutation.mutate(searchQuery.trim());
                            }
                          }}
                          disabled={!searchQuery.trim() || createOrganizationMutation.isPending}
                        >
                          {createOrganizationMutation.isPending ? "Creating..." : "Create"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowCreateOrg(false);
                            setSearchQuery("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sentiment Selection */}
            <FormField
              control={form.control}
              name="sentiment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Experience *</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {sentimentOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = field.value === option.value;
                      
                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant="outline"
                          className={`p-4 h-auto border-2 transition-all ${
                            isSelected 
                              ? `${option.bgColor} ${option.textColor} border-current` 
                              : "border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
                          }`}
                          onClick={() => field.onChange(option.value)}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            <Icon className="h-6 w-6" />
                            <div className="text-sm font-medium">{option.label}</div>
                            <div className="text-xs text-center opacity-70">
                              {option.description}
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Review Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Summarize your experience..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Review Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Share your experience working at this organization..."
                      rows={8}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload Placeholder */}
            <div>
              <FormLabel>Attachments (Optional)</FormLabel>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                <CloudUpload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-1">Drop files here or click to upload</p>
                <p className="text-sm text-gray-500">Images, documents up to 10MB</p>
              </div>
            </div>

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
                disabled={createReviewMutation.isPending}
                className="flex-1 bg-reddit-orange hover:bg-reddit-orange/90 text-white"
              >
                {createReviewMutation.isPending ? "Posting..." : "Post Review (+5 karma)"}
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
