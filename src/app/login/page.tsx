
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Metadata } from 'next';
import Link from "next/link";

// This page is a client component, so we can't export metadata directly.
// We'd set this in a parent layout if we needed dynamic metadata based on auth state.
// For now, a static title can be set in the root layout or here for documentation.
// export const metadata: Metadata = {
//   title: 'Login or Sign Up | Mov33',
// };


const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signUpSchema = z.object({
    username: z.string().min(3, { message: "Username must be at least 3 characters." }),
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60 * 1000; // 1 minute

export default function LoginPage() {
  const { user, signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({ userAgent: '', referrer: '' });
  const [isSuspended, setIsSuspended] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);

  useEffect(() => {
    if (searchParams.get('reason') === 'suspended') {
        setIsSuspended(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setAnalyticsData({
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
    });
  }, []);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: searchParams.get('email') || "", password: "" },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      username: `user_${Math.random().toString(36).substring(2, 9)}`,
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });


  useEffect(() => {
    if (user) {
      router.push("/profile");
    }
  }, [user, router]);
  
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setIsSuspended(false);
    try {
      await signInWithGoogle(analyticsData);
      router.push("/profile");
    } catch (error: any) {
      setError(error.message);
      setIsGoogleLoading(false);
    }
  };

  const onSignInSubmit = async (values: z.infer<typeof signInSchema>) => {
    if (isLockedOut) {
        setError("Too many failed login attempts. Please wait a minute before trying again.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setIsSuspended(false);
    try {
      const result = await signInWithEmail(values.email, values.password);
      if (result?.status === 'suspended') {
        setIsSuspended(true);
        setIsLoading(false);
        return;
      }
      setLoginAttempts(0); // Reset on success
      router.push("/profile");
    } catch (error: any) {
      setError("Invalid login credentials. Please try again.");
      const newAttemptCount = loginAttempts + 1;
      setLoginAttempts(newAttemptCount);
      if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
          setIsLockedOut(true);
          setTimeout(() => {
              setIsLockedOut(false);
              setLoginAttempts(0);
          }, LOCKOUT_DURATION_MS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUpSubmit = async (values: z.infer<typeof signUpSchema>) => {
    setIsLoading(true);
    setError(null);
    setIsSuspended(false);
    try {
      await signUpWithEmail(values.email, values.password, values.username, analyticsData);
      router.push("/profile");
    } catch (error: any) {
      setError(error.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' : 'Failed to create an account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const onForgotPasswordSubmit = async (values: z.infer<typeof forgotPasswordSchema>) => {
    setIsLoading(true);
    setError(null);
    setIsSuspended(false);
    try {
      await resetPassword(values.email);
    } catch (error: any) {
      // Intentionally do not set an error message to prevent user enumeration
      console.error("Password reset error:", error);
    } finally {
      // Always show success to prevent enumeration
      toast({
        title: "Password Reset Requested",
        description: "If an account with this email exists, a password reset link has been sent.",
      });
      setShowResetForm(false);
      forgotPasswordForm.reset();
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
             {showResetForm ? "Reset Password" : "Welcome to Mov33"}
          </CardTitle>
          <CardDescription>
            {showResetForm ? "Enter your email to receive a reset link" : "Sign in or create an account to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuspended && (
             <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Suspended</AlertTitle>
              <AlertDescription>Your account has been suspended by an administrator. Please contact support for assistance.</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showResetForm ? (
             <Form {...forgotPasswordForm}>
             <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
               <FormField
                 control={forgotPasswordForm.control}
                 name="email"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Email</FormLabel>
                     <FormControl>
                       <Input placeholder="you@example.com" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-white" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Send Reset Link
               </Button>
               <Button variant="link" className="w-full" onClick={() => setShowResetForm(false)}>
                 Back to Sign In
               </Button>
             </form>
           </Form>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(onSignInSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-white" disabled={isLoading || isLockedOut}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                   <Button variant="link" size="sm" className="w-full" onClick={() => setShowResetForm(true)}>
                    Forgot Password?
                  </Button>
                </form>
              </Form>
            </TabsContent>
            <TabsContent value="signup">
               <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={signUpForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="your_username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                           <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-white" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          )}

          {!showResetForm && (
            <>
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                        Or
                        </span>
                    </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                    {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.3 64.5c-24.3-23.6-58.2-38.3-96.6-38.3-83.3 0-151.5 68.2-151.5 151.5s68.2 151.5 151.5 151.5c97.1 0 134-60.8 138.6-93.6H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path></svg>}
                    Continue with Google
                </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
