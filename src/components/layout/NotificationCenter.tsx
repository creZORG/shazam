

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { dismissStaffNote, dismissAllStaffNotes } from '@/app/actions';
import type { StaffNote, Notification } from '@/lib/types';
import { Bell, Info, AlertTriangle, X, MailCheck, EyeOff, Handshake, Megaphone, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { collection, query, where, onSnapshot, orderBy, Timestamp, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from '@/lib/firebase/config';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import Link from 'next/link';

type CombinedNotification = (
    { itemType: 'staffNote'; data: StaffNote } | 
    { itemType: 'notification'; data: Notification }
) & { createdAt: Date, id: string };


export function NotificationCenter() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showModalForNote, setShowModalForNote] = useState<StaffNote | null>(null);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [modalShown, setModalShown] = useState(false);
  
  useEffect(() => {
    if (!dbUser?.role || !user?.uid) return;

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Listener for staff notes
    const notesQuery = query(
        collection(db, 'staffNotes'),
        where('roles', 'array-contains', dbUser.role),
        orderBy('createdAt', 'desc')
    );
    const notesUnsubscribe = onSnapshot(notesQuery, (snapshot) => {
        const fetchedNotes = snapshot.docs.map(doc => {
             const data = doc.data();
             return {
                ...data,
                id: doc.id,
                createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
             } as StaffNote
        });
        setNotes(fetchedNotes);
        
        if (!modalShown) {
            const newestUnread = fetchedNotes.find(note => {
                const isUnread = !note.readBy || !note.readBy.some(reader => reader.userId === user?.uid);
                const isRecent = new Date(note.createdAt) > twoDaysAgo;
                return isUnread && isRecent;
            });
            if (newestUnread) {
                setShowModalForNote(newestUnread);
                setModalShown(true);
            }
        }
    });

    // Listener for dynamic notifications
    const notificationsQuery = query(
        collection(db, 'notifications'),
        where('targetRoles', 'array-contains', dbUser.role),
        orderBy('createdAt', 'desc')
    );
     const notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
        const fetchedNotifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
        } as Notification));
        setNotifications(fetchedNotifications);
    });

    return () => {
        notesUnsubscribe();
        notificationsUnsubscribe();
    }
  }, [dbUser?.role, user?.uid, modalShown]);
  
  const combinedFeed: CombinedNotification[] = [
    ...notes.map(n => ({ itemType: 'staffNote' as const, data: n, createdAt: n.createdAt as Date, id: n.id })),
    ...notifications.map(n => ({ itemType: 'notification' as const, data: n, createdAt: n.createdAt as Date, id: n.id })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const unreadItems = combinedFeed.filter(item => {
    if (!user?.uid) return false;
    if (item.itemType === 'staffNote') {
        return !item.data.readBy || !item.data.readBy.some(reader => reader.userId === user.uid);
    }
    // Notification type
    return !item.data.readBy.includes(user.uid);
  });
  
  const handleDismissStaffNote = (noteId: string) => {
    if (!user) return;
    
    dismissStaffNote(noteId, user.uid).then(result => {
        if(result.success) {
            toast({ title: 'Note dismissed.'});
            if(showModalForNote?.id === noteId) {
                setShowModalForNote(null);
            }
        } else {
            toast({ variant: 'destructive', title: "Error", description: result.error });
        }
    });
  };

  const handleDismissNotification = async (notificationId: string) => {
    if (!user) return;
    try {
        const noteRef = doc(db, 'notifications', notificationId);
        await updateDoc(noteRef, { readBy: arrayUnion(user.uid) });
    } catch (e) {
        toast({ variant: 'destructive', title: "Error", description: "Could not mark notification as read." });
    }
  }

  const handleMarkAllAsRead = () => {
    if (!user || unreadItems.length === 0) return;

    const unreadNoteIds = unreadItems.filter(i => i.itemType === 'staffNote').map(i => i.id);
    if(unreadNoteIds.length > 0) {
      dismissAllStaffNotes(user.uid, unreadNoteIds);
    }
    
    const unreadNotificationIds = unreadItems.filter(i => i.itemType === 'notification').map(i => i.id);
    unreadNotificationIds.forEach(id => handleDismissNotification(id));
    
    toast({ title: 'All notifications marked as read.'});
  };
  
  const NoteItem = ({ note }: { note: StaffNote }) => {
    const isUnread = !note.readBy || !note.readBy.some(r => r.userId === user?.uid);
    const Icon = note.type === 'warning' ? AlertTriangle : Info;
    return (
        <DropdownMenuItem className={cn("flex flex-col items-start gap-2 whitespace-normal", isUnread && "bg-muted")}>
            <div className="flex justify-between w-full">
                <div className="flex items-center gap-2">
                    <Icon className={cn("h-4 w-4", note.type === 'warning' ? "text-destructive" : "text-primary")} />
                    <span className="font-semibold text-foreground">{note.senderName}</span>
                </div>
                 <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
            </div>
            <p className="text-sm text-muted-foreground">{note.message}</p>
             {isUnread && (
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={(e) => { e.preventDefault(); handleDismissStaffNote(note.id);}}>
                    Mark as read
                </Button>
            )}
        </DropdownMenuItem>
    )
  }
  
  const NotificationItem = ({ notification }: { notification: Notification }) => {
      const isUnread = user?.uid ? !notification.readBy.includes(user.uid) : false;
      const icons = {
          'partner_request': Handshake,
          'ad_submission': Megaphone,
          'new_order': ShoppingCart,
          'default': Info,
      };
      const Icon = icons[notification.type as keyof typeof icons] || icons.default;
      
      const content = (
         <div className={cn("flex flex-col items-start gap-2 whitespace-normal w-full", isUnread && "bg-muted/50")}>
            <div className="flex justify-between w-full">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-sm text-muted-foreground flex-grow">{notification.message}</p>
                </div>
                 <span className="text-xs text-muted-foreground flex-shrink-0">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
            </div>
             {isUnread && (
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={(e) => { e.preventDefault(); handleDismissNotification(notification.id);}}>
                    Mark as read
                </Button>
            )}
        </div>
      );
      
      return (
        <DropdownMenuItem asChild>
            <Link href={notification.link}>{content}</Link>
        </DropdownMenuItem>
      )
  }

  const displayedItems = showOnlyUnread ? unreadItems : combinedFeed;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadItems.length > 0 && (
              <span className="absolute top-1 right-1 h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
                Notifications
                <div className="flex items-center gap-2">
                     <Label htmlFor="hide-read" className="text-xs font-normal text-muted-foreground">Unread Only</Label>
                     <Switch id="hide-read" checked={showOnlyUnread} onCheckedChange={setShowOnlyUnread} className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span[data-state=checked]]:translate-x-3" />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[400px]">
                 {displayedItems.length > 0 ? (
                    displayedItems.map(item => item.itemType === 'staffNote' 
                        ? <NoteItem key={item.id} note={item.data} />
                        : <NotificationItem key={item.id} notification={item.data} />
                    )
                ) : (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                        {showOnlyUnread ? "No unread notifications." : "No notifications yet."}
                    </p>
                )}
            </ScrollArea>
             {unreadItems.length > 0 && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                         <Button variant="ghost" size="sm" className="w-full" onClick={handleMarkAllAsRead}>
                            <MailCheck className="mr-2" /> Mark all as read
                        </Button>
                    </DropdownMenuItem>
                </>
            )}
        </DropdownMenuContent>
      </DropdownMenu>

        {showModalForNote && (
            <Dialog open={!!showModalForNote} onOpenChange={(open) => !open && setShowModalForNote(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                             {showModalForNote.type === 'warning' ? <AlertTriangle className="text-destructive"/> : <Info className="text-primary"/>}
                            A message from {showModalForNote.senderName}
                        </DialogTitle>
                        <DialogDescription className="text-left pt-2">
                            {showModalForNote.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => handleDismissStaffNote(showModalForNote.id)}>
                            <X className="mr-2" /> Got it, dismiss
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
    </>
  );
}
