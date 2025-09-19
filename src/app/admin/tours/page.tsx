
'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { getAllTours, updateTourStatus } from './actions';
import type { TourWithStats } from './actions';
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
  DollarSign,
  Eye,
  FileText,
  Loader2,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  tourId,
  targetStatus,
  onActionComplete,
  children,
}: {
  tourId: string;
  targetStatus: 'published' | 'rejected' | 'taken-down' | 'archived';
  onActionComplete: () => void;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleAction = async () => {
    startTransition(async () => {
      const result = await updateTourStatus(tourId, targetStatus);
      if (result.success) {
        toast({ title: "Status Updated!", description: `The tour has been ${targetStatus}.` });
        onActionComplete();
      } else {
        toast({ variant: 'destructive', title: "Update Failed", description: result.error });
      }
    });
  };

  let variant: 'outline' | 'destructive' | 'default' | 'secondary' = 'outline';
  if (targetStatus === 'published') variant = 'default';
  if (targetStatus === 'rejected') variant = 'destructive';
  
  return (
    <Button size="sm" variant={variant} className="w-full" onClick={handleAction} disabled={isPending}>
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : children}
    </Button>
  );
}

function ManageActions({ tourId, status, onActionComplete }: { tourId: string; status: string, onActionComplete: () => void; }) {
  switch (status) {
    case 'submitted for review':
      return (
        <div className="grid grid-cols-2 gap-2">
          <ActionButton tourId={tourId} targetStatus="published" onActionComplete={onActionComplete}>
            <Check className="mr-2 h-4 w-4" /> Approve
          </ActionButton>
          <ActionButton tourId={tourId} targetStatus="rejected" onActionComplete={onActionComplete}>
            <X className="mr-2 h-4 w-4" /> Reject
          </ActionButton>
        </div>
      );
    case 'published':
      return (
        <ActionButton tourId={tourId} targetStatus="taken-down" onActionComplete={onActionComplete}>
          <EyeOff className="mr-2 h-4 w-4" /> Take Down
        </ActionButton>
      );
    case 'rejected':
      return (
        <ActionButton tourId={tourId} targetStatus="published" onActionComplete={onActionComplete}>
          <Check className="mr-2 h-4 w-4" /> Re-Approve
        </ActionButton>
      );
    case 'taken-down':
      return (
        <ActionButton tourId={tourId} targetStatus="published" onActionComplete={onActionComplete}>
          <Redo className="mr-2 h-4 w-4" /> Republish
        </ActionButton>
      );
    case 'archived':
      return (
        <ActionButton tourId={tourId} targetStatus="published" onActionComplete={onActionComplete}>
          <Undo className="mr-2 h-4 w-4" /> Unarchive
        </ActionButton>
      );
    default:
      return null;
  }
}

function TourCard({ tour, onActionComplete }: { tour: TourWithStats, onActionComplete: () => void; }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <Link
            href={`/tours/${tour.slug || tour.id}`}
            className="font-medium hover:underline pr-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CardTitle>{tour.name}</CardTitle>
          </Link>
          <StatusBadge status={tour.status || 'draft'} />
        </div>
        <CardDescription>
          By {tour.organizerName} on {tour.startDate ? format(new Date(tour.startDate), 'MMM d, yyyy') : 'N/A'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="font-semibold">
                Ksh {tour.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Views</p>
              <p className="font-semibold">{tour.views.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <ManageActions tourId={tour.id} status={tour.status || 'draft'} onActionComplete={onActionComplete} />
      </CardContent>
      <CardFooter>
         <Link href={`/admin/listings/${tour.id}?type=tour`} className="w-full">
            <Button variant="outline" className="w-full">
                <Settings className="mr-2" /> Manage
            </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function AdminToursPage() {
    const [toursByStatus, setToursByStatus] = useState<Record<string, TourWithStats[]>>({
        all: [],
        review: [],
        published: [],
        'taken-down': [],
        rejected: [],
        archived: [],
    });
    const [loading, setLoading] = useState(true);

    const fetchTours = () => {
         setLoading(true);
        getAllTours().then(result => {
             if (result.success && result.data) {
                const tours = result.data;
                const sortedTours = [...tours].sort((a, b) => {
                    const statusOrder: Record<string, number> = {
                        'submitted for review': 0,
                        'published': 1,
                        'taken-down': 2,
                        'rejected': 3,
                        'archived': 4,
                        'draft': 5,
                    };
                    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
                });
                
                setToursByStatus({
                    all: sortedTours,
                    review: sortedTours.filter((t) => t.status === 'submitted for review'),
                    published: sortedTours.filter((t) => t.status === 'published'),
                    'taken-down': sortedTours.filter((t) => t.status === 'taken-down'),
                    rejected: sortedTours.filter((t) => t.status === 'rejected'),
                    archived: sortedTours.filter((t) => t.status === 'archived'),
                });
             }
             setLoading(false);
        });
    }

    useEffect(() => {
       fetchTours();
    }, []);


  const tabItems: {
    value: keyof typeof toursByStatus;
    label: string;
    icon: React.ElementType;
  }[] = [
    { value: 'review', label: 'In Review', icon: Clock },
    { value: 'published', label: 'Published', icon: Check },
    { value: 'taken-down', label: 'Taken Down', icon: EyeOff },
    { value: 'rejected', label: 'Rejected', icon: X },
    { value: 'archived', label: 'Archived', icon: Archive },
    { value: 'all', label: 'All', icon: FileText },
  ];

  return (
    <div className="space-y-8">
      <CardHeader className="px-0">
        <CardTitle>Manage Tours</CardTitle>
        <CardDescription>
          Oversee all tours listed on the platform. Approve, reject, or manage
          published tours.
        </CardDescription>
      </CardHeader>
       {loading ? (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
      <Tabs defaultValue="review" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
          {tabItems.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label} ({toursByStatus[tab.value].length})
            </TabsTrigger>
          ))}
        </TabsList>
        {tabItems.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {toursByStatus[tab.value].length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {toursByStatus[tab.value].map((tour) => (
                  <TourCard key={tour.id} tour={tour} onActionComplete={fetchTours} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <p>No tours in this category.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      )}
    </div>
  );
}
