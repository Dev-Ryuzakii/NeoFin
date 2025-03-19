import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Plus } from 'lucide-react';
import { useState } from 'react';

type VirtualCard = {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  status: string;
};

export default function VirtualCardManager() {
  const { toast } = useToast();
  const [showCardDetails, setShowCardDetails] = useState(false);

  const { data: cards = [], isLoading } = useQuery<VirtualCard[]>({
    queryKey: ['/api/virtual-cards'],
  });

  const createCardMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/virtual-cards', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create virtual card');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/virtual-cards'] });
      toast({
        title: 'Virtual Card Created',
        description: 'Your virtual card has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create card',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatCardNumber = (number: string) => {
    return number.match(/.{1,4}/g)?.join(' ') || number;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Virtual Cards
          </div>
          {cards.length === 0 && (
            <Button
              size="sm"
              onClick={() => createCardMutation.mutate()}
              disabled={createCardMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Card
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading cards...
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No virtual cards yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {cards.map((card: VirtualCard) => (
              <div
                key={card.cardNumber}
                className="bg-primary/5 rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <p className="font-mono text-lg">
                    {showCardDetails
                      ? formatCardNumber(card.cardNumber)
                      : '•••• •••• •••• ' + card.cardNumber.slice(-4)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCardDetails(!showCardDetails)}
                  >
                    {showCardDetails ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div>
                    <p>Expires</p>
                    <p className="font-mono">
                      {card.expiryMonth}/{card.expiryYear}
                    </p>
                  </div>
                  <div>
                    <p>CVV</p>
                    <p className="font-mono">{showCardDetails ? card.cvv : '•••'}</p>
                  </div>
                  <div>
                    <p>Status</p>
                    <p className="capitalize">{card.status}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}