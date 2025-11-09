import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PenSquare, Star } from "lucide-react";

const createReviewSchema = z.object({
  workLifeBalance: z.number().min(1).max(5),
  cultureValues: z.number().min(1).max(5),
  careerOpportunities: z.number().min(1).max(5),
  compensation: z.number().min(1).max(5),
  management: z.number().min(1).max(5),
});

type CreateReviewData = z.infer<typeof createReviewSchema>;

interface CreateReviewDialogProps {
  organizationId: number;
  organizationName: string;
  trigger?: React.ReactNode;
}

export default function CreateReviewDialog({ organizationId, organizationName, trigger }: CreateReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateReviewData>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: {
      workLifeBalance: 3,
      cultureValues: 3,
      careerOpportunities: 3,
      compensation: 3,
      management: 3,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateReviewData) => {
      const postData = {
        ...data,
        type: "review",
        organizationId,
        title: "Review", // Default title since we removed the title field
        content: "Star rating review", // Default content since we removed the content field
        sentiment: "neutral", // Default sentiment since we removed the sentiment field
        isAnonymous: false, // Always false since we removed the option
      };
      const response = await apiRequest("POST", "/api/posts", postData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Review submitted!",
        description: "Your review has been posted successfully",
      });
      
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          if (!Array.isArray(key)) return false;
          
          return (
            key[0] === "/api/posts" ||
            key[0] === "/api/organizations" ||
            (key[0] === "/api/organizations" && key[1] === organizationId.toString())
          );
        }
      });
      
      // Force immediate refetch of organization data
      queryClient.refetchQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "/api/organizations";
        }
      });
      
      // Also invalidate any search queries that might include this organization
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "/api/organizations/search";
        }
      });
      
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateReviewData) => {
    createMutation.mutate(data);
  };

  const watchedRatings = {
    workLifeBalance: form.watch("workLifeBalance"),
    cultureValues: form.watch("cultureValues"),
    careerOpportunities: form.watch("careerOpportunities"),
    compensation: form.watch("compensation"),
    management: form.watch("management"),
  };

  const defaultTrigger = (
    <Button className="bg-reddit-orange hover:bg-reddit-orange/90 text-white">
      <PenSquare className="h-4 w-4 mr-2" />
      Write Review
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review {organizationName}</DialogTitle>
          <DialogDescription>
            Rate your experience working at this organization
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Category-based Star Ratings */}
            <div className="space-y-4">
              <FormLabel className="text-base font-semibold">Rate each category *</FormLabel>
              
              {[
                { name: 'workLifeBalance', label: 'Work/Life Balance' },
                { name: 'cultureValues', label: 'Culture & Values' },
                { name: 'careerOpportunities', label: 'Career Opportunities' },
                { name: 'compensation', label: 'Compensation' },
                { name: 'management', label: 'Management' },
              ].map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name as keyof CreateReviewData}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm font-medium">{label}</FormLabel>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                type="button"
                                onClick={() => field.onChange(rating)}
                                className="p-1"
                              >
                                <Star
                                  className={`h-4 w-4 ${
                                    rating <= (watchedRatings[name as keyof typeof watchedRatings] || 0)
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[2rem]">
                            {watchedRatings[name as keyof typeof watchedRatings]}/5
                          </span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            

            
            {/* Anonymous Review option removed */}

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                className="bg-reddit-orange hover:bg-reddit-orange/90"
              >
                {createMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}