import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BarChart3, Plus, Trash2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
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
import { insertPollSchema, type InsertPoll } from "@shared/schema";
import { z } from "zod";

interface PollFormProps {
  onSubmit: (data: InsertPoll) => Promise<void>;
  isSubmitting?: boolean;
}

const formSchema = z.object({
  question: z.string().min(10).max(300),
  options: z.array(z.object({ value: z.string().min(1, "Option cannot be empty") })).min(2).max(6),
  expiresInHours: z.number().min(1).max(168),
});

type FormData = z.infer<typeof formSchema>;

export function PollForm({ onSubmit, isSubmitting }: PollFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: "",
      options: [{ value: "" }, { value: "" }],
      expiresInHours: 24,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const handleSubmit = async (data: FormData) => {
    const pollData: InsertPoll = {
      question: data.question,
      options: data.options.map(o => o.value),
      expiresInHours: data.expiresInHours,
    };
    await onSubmit(pollData);
  };

  return (
    <Card className="max-w-2xl mx-auto" data-testid="card-poll-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Create a Poll
        </CardTitle>
        <CardDescription>
          Create an anonymous poll to gather community opinions on any topic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="What would you like to ask the community?"
                      {...field}
                      data-testid="input-poll-question"
                    />
                  </FormControl>
                  <FormDescription>
                    Ask a clear, specific question (10-300 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Options</FormLabel>
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`options.${index}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input 
                            placeholder={`Option ${index + 1}`}
                            {...field}
                            data-testid={`input-poll-option-${index}`}
                          />
                        </FormControl>
                        {fields.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-option-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              {fields.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ value: "" })}
                  className="gap-1"
                  data-testid="button-add-option"
                >
                  <Plus className="h-4 w-4" />
                  Add Option
                </Button>
              )}
              <FormDescription>
                Add 2-6 options for voters to choose from
              </FormDescription>
            </div>

            <FormField
              control={form.control}
              name="expiresInHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(parseInt(v))} 
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-poll-duration">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">1 day</SelectItem>
                      <SelectItem value="48">2 days</SelectItem>
                      <SelectItem value="72">3 days</SelectItem>
                      <SelectItem value="168">1 week</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How long the poll will remain active
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full gap-2" 
              size="lg"
              disabled={isSubmitting}
              data-testid="button-submit-poll"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Creating..." : "Create Poll"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
