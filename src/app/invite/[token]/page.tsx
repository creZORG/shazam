

'use client';

import { notFound, useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { getInvitationDetails, acceptInvitation } from './actions';
import type { Invitation, UserRole } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const createAccountSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
});


export default function AcceptInvitePage() {
    const { token } = useParams();
    const { user, loading: authLoading, signUpWithEmail } = useAuth();
    const router = useRouter();
    const [invite, setInvite] = useState<Invitation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAccepting, startAccepting] = useTransition();
    const [isCreating, startCreating] = useTransition();

    const form = useForm<z.infer<typeof createAccountSchema>>({
        resolver: zodResolver(createAccountSchema),
        defaultValues: { password: '', confirmPassword: '' }
    });

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
    
    const getRedirectUrl = (role: UserRole) => {
        switch (role) {
            case 'organizer': return '/organizer/guide';
            case 'influencer': return '/influencer/guide';
            case 'verifier': return '/verify/guide';
            case 'admin':
            case 'super-admin': return '/admin/guide';
            case 'club': return '/club';
            default: return '/profile';
        }
    }

    const handleAccept = () => {
        if (!user || !invite) return;
        startAccepting(async () => {
            const result = await acceptInvitation(token as string, user.uid);
            if (result.success) {
                const redirectUrl = getRedirectUrl(invite.role);
                window.location.href = redirectUrl; // Force reload to ensure role update is reflected
            } else {
                setError(result.error || 'Failed to accept invitation.');
            }
        });
    }

    const handleCreateAccount = async (values: z.infer<typeof createAccountSchema>) => {
        if (!invite || !invite.email) return;

        startCreating(async () => {
            try {
                await signUpWithEmail(invite.email!, values.password, invite.email!.split('@')[0], { userAgent: navigator.userAgent, referrer: document.referrer });
                // The onAuthStateChanged listener in useAuth will handle the session.
                // Upon accepting, the user will be redirected.
                handleAccept();
            } catch (err: any) {
                setError(err.message || 'An unknown error occurred during sign-up.');
            }
        });
    };

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

        if (!user && invite?.email) {
            // Not logged in, and it's an email-specific invite -> Show create account form
            return (
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateAccount)} className="space-y-4">
                        <FormField control={form.control} name="email" render={() => (
                             <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input value={invite.email!} disabled />
                                </FormControl>
                             </FormItem>
                        )}/>
                        <FormField control={form.control} name="password" render={({field}) => (
                            <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                         <FormField control={form.control} name="confirmPassword" render={({field}) => (
                            <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <Button type="submit" disabled={isCreating} className="w-full">
                            {isCreating && <Loader2 className="animate-spin mr-2" />}
                            Create Account & Accept
                        </Button>
                         <p className="text-xs text-muted-foreground text-center">Already have an account? <Link href={`/login?email=${invite?.email || ''}`} className="underline">Sign In</Link></p>
                    </form>
                 </Form>
            )
        }

        if (!user) {
             // Not logged in, generic invite
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
                <Button onClick={handleAccept} disabled={isAccepting} className="w-full" size="lg">
                    {isAccepting ? <Loader2 className="animate-spin mr-2"/> : <CheckCircle className="mr-2"/>}
                    Accept Invitation
                </Button>
                <p className="text-xs text-muted-foreground text-center">By accepting, your account role will be updated to <span className="font-semibold capitalize">{invite?.role}</span>. You will be redirected to a guide to help you get started.</p>
            </CardFooter>
        );
    };

    return (
        <div className="container mx-auto flex items-center justify-center min-h-[calc(100vh-200px)]">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <Mail className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="text-2xl mt-4">You're Invited, {invite?.email?.split('@')[0] || 'Guest'}!</CardTitle>
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
