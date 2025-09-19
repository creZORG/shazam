

'use client';

import { notFound, useParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { getInvitationDetails, acceptInvitation } from './actions';
import type { Invitation } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function AcceptInvitePage() {
    const { token } = useParams();
    const { user, loading: authLoading } = useAuth();
    const [invite, setInvite] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (token) {
            getInvitationDetails(token as string).then(result => {
                if (result.success && result.data) {
                    setInvite(result.data);
                } else {
                    setError(result.error || 'Failed to validate invitation.');
                }
                setLoading(false);
            });
        }
    }, [token]);
    
    const handleAccept = () => {
        if (!user) return;
        startTransition(async () => {
            const result = await acceptInvitation(token as string, user.uid);
            if (result.success) {
                // Force a reload to update user role from useAuth hook
                window.location.href = '/profile';
            } else {
                setError(result.error || 'Failed to accept invitation.');
            }
        });
    }

    const renderContent = () => {
        if (loading || authLoading) {
            return <div className="flex items-center justify-center p-12"><Loader2 className="animate-spin h-8 w-8" /></div>;
        }

        if (error) {
            return (
                <div className="text-center text-destructive flex flex-col items-center gap-4">
                    <AlertCircle className="h-12 w-12" />
                    <p className="font-semibold text-xl">Invitation Invalid</p>
                    <p>{error}</p>
                     <Link href="/"><Button variant="outline">Go to Homepage</Button></Link>
                </div>
            );
        }

        if (!user) {
            return (
                <div className="text-center flex flex-col items-center gap-4">
                    <p className="font-semibold text-xl">Please log in to accept</p>
                    <p>You've been invited to join as a <span className="font-bold text-primary">{invite?.role}</span>. Please log in or sign up to continue.</p>
                    <Link href={`/login?email=${invite?.email || ''}`}><Button>Log In or Sign Up</Button></Link>
                </div>
            );
        }
        
         if (invite?.email && user.email !== invite.email) {
            return (
                <div className="text-center text-destructive flex flex-col items-center gap-4">
                    <AlertCircle className="h-12 w-12" />
                    <p className="font-semibold text-xl">Wrong Account</p>
                    <p>This invitation was sent to <span className="font-bold">{invite?.email}</span>, but you are logged in as <span className="font-bold">{user.email}</span>. Please log out and use the correct account.</p>
                </div>
            );
        }

        return (
             <CardFooter className="flex-col gap-4">
                <Button onClick={handleAccept} disabled={isPending} className="w-full" size="lg">
                    {isPending ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>}
                    Accept Invitation
                </Button>
                <p className="text-xs text-muted-foreground text-center">By accepting, your account role will be updated to <span className="font-semibold capitalize">{invite?.role}</span>.</p>
            </CardFooter>
        );
    };

    return (
        <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">You're Invited!</CardTitle>
                    {invite && !error && (
                         <CardDescription>
                            You have been invited to join NaksYetu as a <span className="font-bold capitalize text-primary">{invite.role}</span>
                            {invite.listingName && ` for the event "${invite.listingName}"`}.
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}
