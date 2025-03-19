import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

const transferSchema = z.object({
  toUserId: z.string().transform((val) => parseInt(val, 10)),
  amount: z.string().transform((val, ctx) => {
    const amount = parseFloat(val);
    if (isNaN(amount)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid number",
      });
      return NaN;
    }
    return amount;
  }),
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
  const { user } = useAuth();
  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toUserId: "",
      amount: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      // Check balance before making the request
      const currentBalance = parseFloat(user?.balance || "0");
      if (data.amount > currentBalance) {
        throw new Error(`Insufficient funds. Your current balance is $${currentBalance.toFixed(2)}`);
      }
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
              <FormDescription>
                Ask the recipient to share their ID from their dashboard.
                You can find your own ID displayed above to share with others.
              </FormDescription>
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
              <FormDescription>
                Your available balance is ${parseFloat(user?.balance || "0").toFixed(2)}
              </FormDescription>
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