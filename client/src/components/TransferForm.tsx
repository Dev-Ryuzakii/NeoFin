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
import { Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const transferSchema = z.object({
  recipientAccountNumber: z.string()
    .length(10, "Account number must be exactly 10 digits")
    .regex(/^\d+$/, "Account number must contain only numbers")
    .startsWith("035", "Account number must start with 035"),
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

interface RecipientInfo {
  fullName: string;
  accountNumber: string;
}

export default function TransferForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAmountField, setShowAmountField] = useState(false);

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      recipientAccountNumber: "",
      amount: "",
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Account number copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const verifyAccount = async (accountNumber: string) => {
    try {
      // Validate account number format before making API call
      if (!accountNumber.match(/^035\d{7}$/)) {
        toast({
          title: "Invalid account number",
          description: "Account number must be 10 digits starting with 035",
          variant: "destructive",
        });
        return;
      }

      setIsVerifying(true);
      const res = await apiRequest("GET", `/api/verify-account/${accountNumber}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Failed to verify account";
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch (e) {
          console.error("Error parsing response:", errorText);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      
      if (!data || !data.fullName || !data.accountNumber) {
        throw new Error("Invalid response format from server");
      }
      
      setRecipientInfo(data);
      setShowAmountField(true);
      toast({
        title: "Account verified",
        description: `Recipient: ${data.fullName}`,
      });
    } catch (error) {
      console.error("Verification error:", error);
      const message = error instanceof Error ? error.message : "Account verification failed";
      toast({
        title: "Verification failed",
        description: message,
        variant: "destructive",
      });
      setRecipientInfo(null);
      setShowAmountField(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const transferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      if (!recipientInfo) {
        throw new Error("Please verify the account number first");
      }

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
      setRecipientInfo(null);
      setShowAmountField(false);
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
    <div className="space-y-6 max-w-md mx-auto p-4">
      <Card className="bg-muted shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Account Details</h3>
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Account Number</span>
              <div className="flex items-center gap-2 bg-background rounded-lg p-3">
                <code className="text-lg font-mono flex-1">{user?.accountNumber}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyToClipboard(user?.accountNumber || "")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Copied to clipboard
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Share your account number to receive money
            </p>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => transferMutation.mutate(data))}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name="recipientAccountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Recipient Account Number</FormLabel>
                <div className="flex flex-col sm:flex-row gap-2">
                  <FormControl>
                    <Input 
                      placeholder="Enter recipient's account number (035...)" 
                      {...field}
                      className="font-mono text-lg"
                      disabled={showAmountField}
                      maxLength={10}
                    />
                  </FormControl>
                  {!showAmountField && (
                    <Button
                      type="button"
                      onClick={() => verifyAccount(field.value)}
                      disabled={isVerifying || !field.value.match(/^035\d{7}$/)}
                      className="w-full sm:w-auto"
                    >
                      {isVerifying ? "Verifying..." : "Verify"}
                    </Button>
                  )}
                </div>
                <FormDescription>
                  Account numbers are 10 digits and start with 035
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {recipientInfo && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-600 mb-3">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Account Verified</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Name:</span>{" "}
                    <span className="text-base">{recipientInfo.fullName}</span>
                  </p>
                  <p className="text-sm font-mono">
                    <span className="font-medium font-sans">Account:</span>{" "}
                    {recipientInfo.accountNumber}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setRecipientInfo(null);
                    setShowAmountField(false);
                    form.setValue("recipientAccountNumber", "");
                  }}
                >
                  Change Account
                </Button>
              </CardContent>
            </Card>
          )}

          {showAmountField && (
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        placeholder="0.00"
                        {...field}
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-7 text-lg"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Available balance: ${parseFloat(user?.balance || "0").toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {showAmountField && (
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Send Money"
              )}
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}