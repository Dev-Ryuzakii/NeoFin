import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { insertBillPaymentSchema } from "@shared/schema";

const billTypes = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "cable_tv", label: "Cable TV" },
  { value: "internet", label: "Internet" },
];

const providers = {
  electricity: [
    { value: "eko", label: "Eko Electric" },
    { value: "ikeja", label: "Ikeja Electric" },
  ],
  water: [
    { value: "lagos_water", label: "Lagos Water Corporation" },
  ],
  cable_tv: [
    { value: "dstv", label: "DSTV" },
    { value: "gotv", label: "GOtv" },
  ],
  internet: [
    { value: "spectranet", label: "Spectranet" },
    { value: "smile", label: "Smile" },
  ],
};

export default function BillPaymentForm() {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(insertBillPaymentSchema),
    defaultValues: {
      billType: "",
      provider: "",
      billNumber: "",
      amount: "",
    },
  });

  const billType = form.watch("billType");

  const payBillMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bills/pay", data);
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to Paystack checkout
      window.location.href = data.authorization_url;
    },
    onError: (error: Error) => {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => payBillMutation.mutate(data))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="billType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bill type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {billTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
          name="provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!billType}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {billType &&
                    providers[billType as keyof typeof providers].map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
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
          name="billNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill/Meter Number</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter your bill/meter number" />
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
                <Input {...field} placeholder="Enter amount" type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={payBillMutation.isPending}
        >
          {payBillMutation.isPending ? "Processing..." : "Pay Bill"}
        </Button>
      </form>
    </Form>
  );
}
