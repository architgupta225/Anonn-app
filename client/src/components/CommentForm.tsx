import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";

const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be less than 1000 characters"),
});

type CommentData = z.infer<typeof commentSchema>;

interface CommentFormProps {
  postId: number;
  onSuccess?: () => void;
}

export default function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const { toast } = useToast();

  const form = useForm<CommentData>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CommentData) => {
      const response = await apiRequest(
        "POST",
        `/api/posts/${postId}/comments`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Comment posted!",
        description: "Your comment has been added successfully",
      });
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ["/api/posts", postId, "comments"],
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CommentData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex items-center justify-between"
      >
        {/* Left: Yellow box + input */}
        <div className="flex items-center pl-9 py-6 flex-1 pr-4 gap-4">
          {/* Yellow square */}
          <div className="w-[30px] h-[30px] bg-[#FFB82A] flex-shrink-0"></div>

          {/* Text input */}
          <input
            type="text"
            placeholder="post your reply"
            {...form.register("content")}
            className="w-full bg-transparent text-[#525252] text-sm font-spacemono focus:outline-none"
          />
        </div>

        {/* Right: POST button */}
        <Button
          type="submit"
          disabled={createMutation.isPending || !form.watch("content").trim()}
          className="py-10 px-6 flex items-center justify-center text-[#17181C] font-normal bg-gradient-to-r from-[#A0D9FF] to-[#E8EAE9] hover:opacity-90 transition rounded-none"
        >
          {createMutation.isPending ? (
            "Posting..."
          ) : (
            <>
              <img src="/icons/post-button-icon.svg" />
              POST
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
