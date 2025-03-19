import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertExternalTransferSchema } from "@shared/schema";
import type { z } from "zod";

type Bank = {
  id: number;
  bankName: string;
  bankCode: string;
};

type FormData = z.infer<typeof insertExternalTransferSchema>;

export default function ExternalTransferForm() {
  const { toast } = useToast();
  const form = useForm<FormData>({
    resolver: zodResolver(insertExternalTransferSchema),
    defaultValues: {
      bankId: undefined,
      recipientName: "",
      recipientAccount: "",
      amount: undefined,
    },
  });

  const { data: banks, isLoading: isBanksLoading } = useQuery<Bank[]>({
    queryKey: ['/api/banks'],
  });

  const transferMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/external-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to process transfer");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      form.reset();
      toast({
        title: "Transfer Initiated",
        description: "Your transfer has been initiated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => transferMutation.mutate(data))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="bankId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Bank</FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient's bank" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {banks?.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id.toString()}>
                      {bank.bankName}
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
          name="recipientAccount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter recipient's account number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter recipient's name" />
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
              <FormLabel>Amount (₦)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  placeholder="Enter amount to transfer"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={transferMutation.isPending || isBanksLoading}
        >
          {transferMutation.isPending ? "Processing..." : "Send Money"}
        </Button>
      </form>
    </Form>
  );
}
