
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { MessageCircle, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { queryAdminData } from '@/ai/flows/audit-log-flow';
import type { FirebaseUser } from '@/lib/types';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export function ChatBubble({ user }: { user: FirebaseUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    startTransition(async () => {
        try {
            const history = messages.map(msg => ({ role: msg.role, content: [{text: msg.content}]}));
            const response = await queryAdminData({ 
              question: input, 
              history,
              currentUser: {
                uid: user.uid,
                name: user.name,
                role: user.role
              }
            });

            if (response.navigationPath) {
                router.push(response.navigationPath);
            }

            const assistantMessage: ChatMessage = { role: 'assistant', content: response.answer };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = { role: 'system', content: "Sorry, I encountered an error. Please try again." };
            setMessages(prev => [...prev, errorMessage]);
        }
    });
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg"
        size="icon"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles className="h-8 w-8" />
        <span className="sr-only">Open NaksYetu AI</span>
      </Button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Card className="w-[400px] h-[600px] flex flex-col shadow-2xl">
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
                <AvatarFallback className="bg-gradient-to-r from-primary to-accent"><Sparkles className="text-white"/></AvatarFallback>
            </Avatar>
            <div>
                 <CardTitle>NaksYetu AI</CardTitle>
                 <CardDescription>Ask me anything about the platform.</CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          <ScrollArea className="h-full p-6">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn('flex items-end gap-2', {
                    'justify-end': message.role === 'user',
                  })}
                >
                  {message.role === 'assistant' && <Avatar className="h-6 w-6"><AvatarFallback className="bg-gradient-to-r from-primary to-accent text-xs"><Sparkles className="text-white"/></AvatarFallback></Avatar>}
                  <div
                    className={cn('max-w-[75%] rounded-lg p-3 text-sm', {
                      'bg-primary text-primary-foreground': message.role === 'user',
                      'bg-muted': message.role === 'assistant',
                      'bg-destructive/10 text-destructive text-center w-full': message.role === 'system',
                    })}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
               {isPending && (
                    <div className="flex items-end gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="bg-gradient-to-r from-primary to-accent text-xs"><Sparkles className="text-white"/></AvatarFallback></Avatar>
                        <div className="bg-muted p-3 rounded-lg"><Loader2 className="animate-spin" /></div>
                    </div>
               )}
            </div>
          </ScrollArea>
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center space-x-2">
            <Input
              placeholder="e.g., How much revenue did we make today?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isPending}
            />
            <Button onClick={handleSend} disabled={isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
