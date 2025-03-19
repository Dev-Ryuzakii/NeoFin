import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

type Notification = {
  type: 'transaction' | 'fraud_alert' | 'budget_alert';
  title: string;
  message: string;
  timestamp: string;
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Use relative WebSocket URL with dedicated /ws path
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsConnection = new WebSocket(`${protocol}//${window.location.host}/ws`);
    setWs(wsConnection);

    wsConnection.onopen = () => {
      console.log('WebSocket connected to /ws endpoint');
      // Authenticate WebSocket connection
      wsConnection.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
      }));
    };

    wsConnection.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        console.log('Received notification:', notification);
        setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    };

    wsConnection.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsConnection.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (user) {
          console.log('Attempting to reconnect WebSocket...');
          setWs(null); // This will trigger a reconnect through the useEffect
        }
      }, 5000);
    };

    return () => {
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.close();
      }
    };
  }, [user, !ws]); // Depend on !ws to trigger reconnection when ws is null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications {notifications.length > 0 && `(${notifications.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No new notifications
            </p>
          ) : (
            notifications.map((notification, index) => (
              <div
                key={`${notification.timestamp}-${index}`}
                className={`p-4 rounded-lg ${
                  notification.type === 'fraud_alert'
                    ? 'bg-destructive/10'
                    : notification.type === 'budget_alert'
                    ? 'bg-warning/10'
                    : 'bg-card'
                }`}
              >
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}