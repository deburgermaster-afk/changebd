import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { PollForm } from "@/components/poll-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InsertPoll } from "@shared/schema";

export default function CreatePollPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const createPoll = useMutation({
    mutationFn: async (data: InsertPoll) => {
      return apiRequest("POST", "/api/polls", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      toast({ 
        title: "Poll created!", 
        description: "Your poll is now live for voting." 
      });
      navigate("/vote");
    },
    onError: (error) => {
      toast({ 
        title: "Creation failed", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <PollForm 
        onSubmit={async (data) => {
          await createPoll.mutateAsync(data);
        }}
        isSubmitting={createPoll.isPending}
      />
    </div>
  );
}
