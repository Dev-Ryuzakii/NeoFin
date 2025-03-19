import { useAuth } from "@/hooks/use-auth";
import AccountSummary from "@/components/AccountSummary";
import TransactionList from "@/components/TransactionList";
import TransferForm from "@/components/TransferForm";
import BillPaymentForm from "@/components/BillPaymentForm";
import AirtimePurchaseForm from "@/components/AirtimePurchaseForm";
import KycVerificationForm from "@/components/KycVerificationForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, LogOut, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation("/auth"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span className="font-semibold text-lg bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
              NeoFin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.fullName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!user?.kycVerified && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-orange-500 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verify Your Identity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Complete your KYC verification to unlock all features and higher transaction limits.
              </p>
              <KycVerificationForm />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-6">
            <AccountSummary user={user!} />

            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="transfer">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="transfer">Send Money</TabsTrigger>
                    <TabsTrigger value="bills">Pay Bills</TabsTrigger>
                    <TabsTrigger value="airtime">Buy Airtime</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="transfer">
                    <TransferForm />
                  </TabsContent>

                  <TabsContent value="bills">
                    {user?.kycVerified ? (
                      <BillPaymentForm />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Complete KYC verification to access bill payments
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="airtime">
                    <AirtimePurchaseForm />
                  </TabsContent>

                  <TabsContent value="history">
                    <TransactionList userId={user!.id} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="hidden md:block">
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">KYC Status</p>
                    <p className="font-medium flex items-center gap-2">
                      <Shield className={`h-4 w-4 ${user?.kycVerified ? "text-green-500" : "text-orange-500"}`} />
                      {user?.kycVerified ? "Verified" : "Pending Verification"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Type</p>
                    <p className="font-medium capitalize">{user?.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}