
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getTeamMembers } from "@/app/admin/content/actions";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { TeamMember } from "@/lib/types";

function TeamMemberCard({ member }: { member: TeamMember }) {
    return (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-accent rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-gradient-x"></div>
            <Card className="relative h-full">
                <CardContent className="pt-8 text-center">
                    <Avatar className="h-24 w-24 mx-auto border-2 border-primary">
                        <AvatarImage src={member.imageUrl} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="mt-4 text-xl font-bold">{member.name}</h3>
                    <p className="text-primary">{member.role}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{member.bio}</p>
                </CardContent>
            </Card>
        </div>
    )
}


export default async function TeamPage() {
    const { data: teamMembers, error } = await getTeamMembers();

    if (error) {
        return <p className="text-center text-destructive py-12">{error}</p>
    }

    const markAllan: TeamMember = {
        id: 'static-mark-allan',
        name: 'Mark Allan',
        role: 'Lead Software Developer',
        imageUrl: 'https://pbs.twimg.com/media/G06_u1TWsAAP7xe?format=jpg&name=900x900',
        bio: 'Building the future of Nakuru\'s event scene, one line of code at a time.'
    };

    return (
        <div className="container mx-auto px-4 py-8 md:py-12">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Meet Our Team</h1>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto mt-2">
                    The passionate individuals behind Mov33, dedicated to bringing you the best of Nakuru.
                </p>
            </div>
            
            {(teamMembers && teamMembers.length > 0) || markAllan ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <TeamMemberCard key={markAllan.id} member={markAllan} />
                    {teamMembers && teamMembers.map(member => (
                        <TeamMemberCard key={member.id} member={member} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-12">Team members will be listed here soon.</p>
            )}
           
        </div>
    );
}
