import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTransactionSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const transferSchema = z.object({
  toUserId: z.string().transform((val) => parseInt(val, 10)),
  amount: z.string().transform((val) => parseFloat(val)),
}).superRefine((data, ctx) => {
  if (data.amount <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Amount must be greater than 0",
      path: ["amount"],
    });
  }
});

type TransferFormData = z.infer<typeof transferSchema>;

export default function TransferForm() {
  const { toast } = useToast();
  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toUserId: "",
      amount: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      const res = await apiRequest("POST", "/api/transfer", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh user balance
      form.reset();
      toast({
        title: "Transfer successful",
        description: "The money has been sent successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => transferMutation.mutate(data))}
        className="space-y-4 py-4"
      >
        <FormField
          control={form.control}
          name="toUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient ID</FormLabel>
              <FormControl>
                <Input placeholder="Enter recipient ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ($)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter amount"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={transferMutation.isPending}
        >
          {transferMutation.isPending ? "Processing..." : "Send Money"}
        </Button>
      </form>
    </Form>
  );
}