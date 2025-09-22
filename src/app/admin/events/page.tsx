
'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { getAllEvents, updateEventStatus } from './actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Check,
  X,
  EyeOff,
  Archive,
  Undo,
  Redo,
  Clock,
  FileText,
  Loader2,
  Settings,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState, useTransition, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const statusConfig: Record<
  string,
  {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    label: string;
    icon: React.ElementType;
  }
> = {
  published: {
    variant: 'default',
    className: 'bg-green-500/20 text-green-300 border-green-500/30',
    label: 'Published',
    icon: Check,
  },
  draft: {
    variant: 'secondary',
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    label: 'Draft',
    icon: FileText,
  },
  'submitted for review': {
    variant: 'secondary',
    className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    label: 'In Review',
    icon: Clock,
  },
    'pending_admin_approval': {
    variant: 'secondary',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    label: 'Pending Admin Approval',
    icon: UserCheck,
  },
  rejected: {
    variant: 'destructive',
    className: 'bg-red-500/20 text-red-300 border-red-500/30',
    label: 'Rejected',
    icon: X,
  },
  archived: {
    variant: 'outline',
    className: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
    label: 'Archived',
    icon: Archive,
  },
  'taken-down': {
    variant: 'outline',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    label: 'Taken Down',
    icon: EyeOff,
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    variant: 'secondary',
    className: '',
    label: status,
    icon: FileText,
  };
  return (
    <Badge variant={config.variant} className={config.className}>
      <config.icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ActionButton({
  eventId,
  targetStatus,
  onActionComplete,
  children,
  disabled = false,
  tooltipContent,
}: {
  eventId: string;
  targetStatus: 'published' | 'rejected' | 'taken-down' | 'archived';
  onActionComplete: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  tooltipContent?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAction = async () => {
    startTransition(async () => {
      const result = await updateEventStatus(eventId, targetStatus);
      if (result.success) {
        toast({
          title: 'Status Updated!',
          description: `The event has been ${targetStatus}.`,
        });
        onActionComplete();
      } else {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: result.error,
        });
      }
    });
  };

  let variant: 'outline' | 'destructive' | 'default' | 'secondary' = 'outline';
  if (targetStatus === 'published') variant = 'default';
  if (targetStatus === 'rejected') variant = 'destructive';

  const button = (
    <Button
      size="sm"
      variant={variant}
      className="w-full"
      onClick={handleAction}
      disabled={isPending || disabled}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </Button>
  );

  if (tooltipContent) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipContent}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
  }

  return button;
}

function ManageActions({
  event,
  onActionComplete,
}: {
  event: Event & { id: string; status: string, lastUpdatedBy?: string };
  onActionComplete: () => void;
}) {
  const { user } = useAuth();
  const isSelfApprove = user?.uid === event.lastUpdatedBy;

  switch (event.status) {
    case 'submitted for review':
      return (
        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            eventId={event.id}
            targetStatus="published"
            onActionComplete={onActionComplete}
          >
            <Check className="mr-2 h-4 w-4" /> Approve
          </ActionButton>
          <ActionButton
            eventId={event.id}
            targetStatus="rejected"
            onActionComplete={onActionComplete}
          >
            <X className="mr-2 h-4 w-4" /> Reject
          </ActionButton>
        </div>
      );
    case 'pending_admin_approval':
         return (
             <div className="grid grid-cols-2 gap-2">
                 <ActionButton
                    eventId={event.id}
                    targetStatus="published"
                    onActionComplete={onActionComplete}
                    disabled={isSelfApprove}
                    tooltipContent={isSelfApprove ? "Another admin must approve your changes." : undefined}
                >
                    <ShieldCheck className="mr-2 h-4 w-4" /> Approve
                </ActionButton>
                <ActionButton
                    eventId={event.id}
                    targetStatus="rejected"
                    onActionComplete={onActionComplete}
                >
                    <X className="mr-2 h-4 w-4" /> Reject
                </ActionButton>
            </div>
        );
    case 'published':
      return (
        <ActionButton
          eventId={event.id}
          targetStatus="taken-down"
          onActionComplete={onActionComplete}
        >
          <EyeOff className="mr-2 h-4 w-4" /> Take Down
        </ActionButton>
      );
    case 'rejected':
      return (
        <ActionButton
          eventId={event.id}
          targetStatus="published"
          onActionComplete={onActionComplete}
        >
          <Check className="mr-2 h-4 w-4" /> Re-Approve
        </ActionButton>
      );
    case 'taken-down':
      return (
        <ActionButton
          eventId={event.id}
          targetStatus="published"
          onActionComplete={onActionComplete}
        >
          <Redo className="mr-2 h-4 w-4" /> Republish
        </ActionButton>
      );
    case 'archived':
      return (
        <ActionButton
          eventId={event.id}
          targetStatus="published"
          onActionComplete={onActionComplete}
        >
          <Undo className="mr-2 h-4 w-4" /> Unarchive
        </ActionButton>
      );
    default:
      return null;
  }
}

function EventCard({ event, onActionComplete }: { event: Event & { id: string; status: string }, onActionComplete: () => void; }) {
  return (
    <Card className="flex flex-col bg-card/50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <Link
            href={`/events/${event.slug || event.id}`}
            className="font-medium hover:underline pr-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CardTitle>{event.name}</CardTitle>
          </Link>
          <StatusBadge status={event.status || 'draft'} />
        </div>
        <CardDescription>
          By {event.organizerName} on{' '}
          {event.date ? format(new Date(event.date), 'MMM d, yyyy') : 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <ManageActions
          event={event}
          onActionComplete={onActionComplete}
        />
      </CardContent>
      <CardFooter>
         <Link href={`/organizer/events/create?id=${event.id}&type=event`} className="w-full">
            <Button variant="outline" className="w-full">
                <Settings className="mr-2" /> Manage
            </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function AdminEventsPage() {
  const [eventsByStatus, setEventsByStatus] = useState<
    Record<string, (Event & { id: string; status: string })[]>
  >({
    all: [],
    review: [],
    admin_approval: [],
    published: [],
    'taken-down': [],
    rejected: [],
    archived: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('review');

  const fetchEvents = () => {
    setLoading(true);
    getAllEvents().then((result) => {
      if (result.success && result.data) {
        const events = result.data;
        const sortedEvents = [...events].sort((a, b) => {
            const statusOrder: Record<string, number> = {
                'submitted for review': 0,
                'pending_admin_approval': 1,
                'published': 2,
                'taken-down': 3,
                'rejected': 4,
                'archived': 5,
                'draft': 6,
            };
            return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
        });

        setEventsByStatus({
          all: sortedEvents,
          review: sortedEvents.filter(
            (e) => e.status === 'submitted for review'
          ),
          admin_approval: sortedEvents.filter(
            (e) => e.status === 'pending_admin_approval'
          ),
          published: sortedEvents.filter((e) => e.status === 'published'),
          'taken-down': sortedEvents.filter((e) => e.status === 'taken-down'),
          rejected: sortedEvents.filter((e) => e.status === 'rejected'),
          archived: sortedEvents.filter((e) => e.status === 'archived'),
        });
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const tabItems = useMemo(() => [
    { value: 'review', label: 'Organizer Submissions', icon: Clock, count: eventsByStatus.review.length },
    { value: 'admin_approval', label: 'Admin Approval', icon: UserCheck, count: eventsByStatus.admin_approval.length },
    { value: 'published', label: 'Published', icon: Check, count: eventsByStatus.published.length },
    { value: 'taken-down', label: 'Taken Down', icon: EyeOff, count: eventsByStatus['taken-down'].length },
    { value: 'rejected', label: 'Rejected', icon: X, count: eventsByStatus.rejected.length },
    { value: 'archived', label: 'Archived', icon: Archive, count: eventsByStatus.archived.length },
    { value: 'all', label: 'All', icon: FileText, count: eventsByStatus.all.length },
  ], [eventsByStatus]);

  return (
    <div className="space-y-8">
      <CardHeader className="px-0">
        <CardTitle>Manage Events</CardTitle>
        <CardDescription>
          Oversee all events listed on the platform. Approve, reject, or manage
          published events.
        </CardDescription>
      </CardHeader>
      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="review" onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center">
            <TabsList className="p-1.5 h-auto rounded-full bg-background border shadow-md">
              {tabItems.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'rounded-full px-3 py-1.5 flex items-center gap-2 transition-all duration-300',
                    'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm',
                    'data-[state=inactive]:text-muted-foreground',
                    'sm:w-auto',
                    activeTab === tab.value
                      ? 'sm:w-auto'
                      : 'sm:w-10 sm:justify-center'
                  )}
                >
                  <tab.icon className="h-5 w-5 flex-shrink-0" />
                  <span
                    className={cn(
                      'overflow-hidden transition-all duration-300',
                      'sm:max-w-xs',
                      activeTab === tab.value ? 'max-w-xs' : 'max-w-0 sm:max-w-0'
                    )}
                  >
                    {tab.label} ({tab.count || 0})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {tabItems.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-6">
              {eventsByStatus[tab.value]?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventsByStatus[tab.value].map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onActionComplete={fetchEvents}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <p>No events in this category.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
