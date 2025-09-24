
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getBlogPosts } from "@/app/admin/content/actions";
import { format } from "date-fns";
import type { BlogPost } from "@/lib/types";
import { ExternalLink } from "@/components/layout/ExternalLink";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Mov33',
  description: 'News, stories, and updates from the heart of Nakuru\'s entertainment scene.',
};


function BlogPostCard({ post }: { post: BlogPost }) {
    const hasExpired = post.expiresAt && new Date(post.expiresAt) < new Date();

    if (hasExpired) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>
                    Posted by {post.authorName} on {format(new Date(post.createdAt), 'PP')}
                    {post.expiresAt && ` | Archived on ${format(new Date(post.expiresAt), 'PP')}`}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {post.tldr && (
                    <blockquote className="mt-6 border-l-2 pl-6 italic">
                        "{post.tldr}"
                    </blockquote>
                )}
                <div className="text-muted-foreground leading-relaxed">
                    <ExternalLink text={post.content} />
                </div>
            </CardContent>
        </Card>
    )
}

export default async function BlogPage() {
  const { data: posts, error } = await getBlogPosts();

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Mov33 Blog</h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-2">
            News, stories, and updates from the heart of Nakuru's entertainment scene.
        </p>
      </div>

        {error && <p className="text-destructive text-center">{error}</p>}
        
        <div className="space-y-8 max-w-4xl mx-auto">
            {posts && posts.length > 0 ? (
                posts.map(post => <BlogPostCard key={post.id} post={post} />)
            ) : (
                 <p className="text-muted-foreground text-center py-12">No blog posts yet. Check back soon!</p>
            )}
        </div>
      
    </div>
  );
}
