
'use server';
/**
 * @fileOverview An AI agent for querying all admin-related data, including audit logs, users, events, and transactions.
 *
 * - queryAdminData - A function that handles natural language queries about the platform's data.
 * - AdminQueryInput - The input type for the queryAdminData function.
 * - AdminQueryOutput - The return type for the queryAdminData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { AuditLog, Event, FirebaseUser, Transaction, Order, UserRole } from '@/lib/types';
import { getAdminDashboardData } from '@/app/admin/actions';

function serializeData(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}


// --- Tool for Date Ranges ---
const getDateRangeTool = ai.defineTool(
    {
        name: 'getDateRange',
        description: 'Returns a start and end date for a given time period description (e.g., "today", "yesterday", "last 7 days").',
        inputSchema: z.object({
            period: z.string().describe('A description of the time period, like "today", "yesterday", "this week", "last_7_days", "this_month", or a specific date like "2024-07-26".'),
        }),
        outputSchema: z.object({
            startDate: z.string().describe('The start date in ISO format.'),
            endDate: z.string().describe('The end date in ISO format.'),
        }),
    },
    async ({ period }) => {
        const now = new Date();
        let startDate, endDate;

        switch (period.toLowerCase().replace(' ', '_')) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                endDate = new Date(now.setHours(23, 59, 59, 999));
                break;
            case 'yesterday':
                const yesterday = new Date();
                yesterday.setDate(now.getDate() - 1);
                startDate = new Date(yesterday.setHours(0, 0, 0, 0));
                endDate = new Date(yesterday.setHours(23, 59, 59, 999));
                break;
            case 'last_7_days':
                endDate = new Date();
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                break;
            default:
                const specificDate = new Date(period);
                if (!isNaN(specificDate.getTime())) {
                    startDate = new Date(specificDate.setHours(0,0,0,0));
                    endDate = new Date(specificDate.setHours(23,59,59,999));
                } else {
                    throw new Error('Unsupported time period. Use "today", "yesterday", "last_7_days", or a specific date in YYYY-MM-DD format.');
                }
        }
        return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }
);


// --- Tool for Audit Logs ---
const getLogsTool = ai.defineTool(
    {
        name: 'getLogs',
        description: 'Retrieves audit logs based on filters for security and activity analysis. All parameters are optional.',
        inputSchema: z.object({
            adminName: z.string().optional().describe("Filter by the name of the admin who performed the action."),
            action: z.string().optional().describe("Filter by action type, e.g., 'update_user_status'."),
            targetType: z.string().optional().describe("Filter by the type of entity changed, e.g., 'user', 'event'."),
            targetId: z.string().optional().describe("Filter by the ID of the entity changed."),
            startDate: z.string().optional().describe("Start date in ISO format. Use getDateRange tool."),
            endDate: z.string().optional().describe("End date in ISO format. Use getDateRange tool."),
        }),
        outputSchema: z.array(z.any()),
    },
    async (input) => {
        let q: any = collection(db, 'auditLogs');
        if (input.adminName) q = query(q, where('adminName', '>=', input.adminName), where('adminName', '<=', input.adminName + '\uf8ff'));
        if (input.action) q = query(q, where('action', '==', input.action));
        if (input.targetType) q = query(q, where('targetType', '==', input.targetType));
        if (input.targetId) q = query(q, where('targetId', '==', input.targetId));
        if (input.startDate) q = query(q, where('timestamp', '>=', Timestamp.fromDate(new Date(input.startDate))));
        if (input.endDate) q = query(q, where('timestamp', '<=', Timestamp.fromDate(new Date(input.endDate))));
        
        const finalQuery = query(q, orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(finalQuery);
        return snapshot.docs.map(doc => ({ ...doc.data(), timestamp: (doc.data().timestamp as Timestamp).toDate().toISOString() }));
    }
);

// --- Tool for Dashboard Stats ---
const getDashboardStatsTool = ai.defineTool(
    {
        name: 'getDashboardStats',
        description: 'Retrieves high-level dashboard statistics like total revenue, total users, and total events.',
        inputSchema: z.object({}),
        outputSchema: z.object({
            totalUsers: z.number(),
            totalRevenue: z.number(),
            totalEvents: z.number(),
        }),
    },
    async () => {
        const result = await getAdminDashboardData();
        if (!result.success || !result.data) throw new Error("Failed to fetch dashboard stats.");
        return {
            totalUsers: result.data.totalUsers,
            totalRevenue: result.data.totalRevenue,
            totalEvents: result.data.totalEvents,
        };
    }
);

// --- Tool for Users ---
const getUsersTool = ai.defineTool(
    {
        name: 'getUsers',
        description: 'Searches for users by name, email, or role.',
        inputSchema: z.object({
            name: z.string().optional().describe("Full or partial name of the user."),
            email: z.string().optional().describe("The user's email address."),
            role: z.string().optional().describe("The user's role (e.g., 'organizer', 'attendee')."),
        }),
        outputSchema: z.array(z.any()),
    },
    async (input) => {
        let q: any = collection(db, 'users');
        if (input.name) q = query(q, where('name', '>=', input.name), where('name', '<=', input.name + '\uf8ff'));
        if (input.email) q = query(q, where('email', '==', input.email));
        if (input.role) q = query(q, where('role', '==', input.role));
        
        const snapshot = await getDocs(query(q, limit(20)));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
);

// --- Tool for Events ---
const getEventsTool = ai.defineTool(
    {
        name: 'getEvents',
        description: "Retrieves event information.",
        inputSchema: z.object({
            name: z.string().optional().describe("Search by event name."),
            status: z.string().optional().describe("Filter by status: 'published', 'draft', 'rejected' etc."),
            organizerName: z.string().optional().describe("Filter by the organizer's name."),
        }),
        outputSchema: z.array(z.any()),
    },
    async (input) => {
        let q: any = collection(db, 'events');
        if (input.name) q = query(q, where('name', '==', input.name));
        if (input.status) q = query(q, where('status', '==', input.status));
        if (input.organizerName) q = query(q, where('organizerName', '==', input.organizerName));

        const snapshot = await getDocs(query(q, limit(20)));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
);

const getTransactionsTool = ai.defineTool(
    {
        name: 'getTransactions',
        description: "Retrieves transaction information for a user.",
        inputSchema: z.object({
            userId: z.string().optional().describe("The ID of the user."),
            userName: z.string().optional().describe("The name of the user."),
            status: z.string().optional().describe("Filter by status: 'completed', 'pending', 'failed' etc."),
        }),
        outputSchema: z.array(z.any()),
    },
    async (input) => {
        let userId = input.userId;
        if (input.userName && !input.userId) {
            const userQuery = query(collection(db, 'users'), where('name', '==', input.userName));
            const userSnapshot = await getDocs(userQuery);
            if (!userSnapshot.empty) {
                userId = userSnapshot.docs[0].id;
            } else {
                return [];
            }
        }

        if (!userId) return [];

        let q: any = collection(db, 'transactions');
        q = query(q, where('userId', '==', userId));
        if (input.status) {
            q = query(q, where('status', '==', input.status));
        }

        const snapshot = await getDocs(query(q, limit(20)));
        const transactions = snapshot.docs.map(doc => serializeData(doc));
        
        // Sort in-memory to avoid composite index requirement
        transactions.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return transactions;
    }
);


// --- Main Flow Definition ---
const AdminQueryInputSchema = z.object({
  question: z.string().describe("The user's question about platform data."),
  history: z.array(z.any()).optional().describe("The conversation history."),
  currentUser: z.object({
      uid: z.string(),
      name: z.string(),
      role: z.string()
  }).describe("Information about the user who is asking the question.")
});
export type AdminQueryInput = z.infer<typeof AdminQueryInputSchema>;

const AdminQueryOutputSchema = z.object({
  answer: z.string().describe('A clear, concise, and helpful answer to the user\'s question, derived from the provided data. Summarize the findings. Be friendly and conversational.'),
});
export type AdminQueryOutput = z.infer<typeof AdminQueryOutputSchema>;


const adminAssistantPrompt = ai.definePrompt({
    name: 'adminAssistantPrompt',
    tools: [getLogsTool, getDateRangeTool, getDashboardStatsTool, getUsersTool, getEventsTool, getTransactionsTool],
    input: { schema: AdminQueryInputSchema },
    output: { schema: AdminQueryOutputSchema },
    system: `You are the NaksYetu AI, a specialized assistant for the NaksYetu platform, created by Mark Allan. Your expertise covers two main areas: data analysis and procedural guidance. You have READ-ONLY access to the database via your tools. You CANNOT perform actions like navigating pages or clicking buttons, but you MUST know and explain HOW they are performed and PROVIDE a link to the correct page.

    **Current User Information:**
    The user asking the question is:
    - Name: {{{currentUser.name}}}
    - Role: {{{currentUser.role}}}
    - User ID: {{{currentUser.uid}}}
    When asked "Who am I?" or similar questions, use this information to respond.

    **Core Persona:**
    - **Expert Guide**: You are the single source of truth for "how-to" questions about any part of the NaksYetu platform for any user role.
    - **Data Analyst**: You can query, correlate, and summarize any data on the platform.
    - **Conversational & Witty**: Be helpful and engaging, not a robot.

    **KNOWLEDGE BASE: NAKSYETU WEBSITE STRUCTURE & LINKS**
    You have perfect knowledge of the entire website structure and its URLs.
    
    1.  **Public Pages (for everyone):**
        - Main Navigation: Events (/events), Tours (/tours), Nightlife (/nightlife), Shop (/shop).
        - Footer Links: About (/about), Contact (/contact), Support (/support), Partner with Us (/partner-with-us), Influencers (/influencers), Privacy Policy (/privacy-policy), Terms of Service (/terms-of-service), etc.
    
    2.  **User Profile (/profile):**
        - This is for regular users (attendees).
        - Tabs include: My Tickets, Attended & Rate, Bookmarked, Viewed.
        - Users can upgrade to an "Organizer" or "Influencer" from here.

    3.  **Organizer Dashboard (/organizer):**
        - Overview: /organizer
        - My Listings: /organizer/listings
        - Create New: /organizer/events/create
        - Attendance: /organizer/attendance
        - Promocodes: /organizer/promocodes
        - Profile: /organizer/profile
        - Guide: /organizer/guide

    4.  **Influencer Dashboard (/influencer):**
        - Overview: /influencer
        - Campaigns: /influencer/campaigns
        - Payouts: /influencer/payouts
        - Profile: /influencer/profile
        - Guide: /influencer/guide
    
    5.  **Club Dashboard (/club):**
        - My Events: /club
        - Create Event: /club/events/create
        - Settings: /club/settings
    
    6.  **Verification Portal (/verify):**
        - Dashboard: /verify
        - Scan: /verify/scan/[eventId]
        - Guide: /verify/guide
    
    7.  **Admin Portal (/admin):**
        - Dashboard: /admin
        - Listings (Events): /admin/events
        - Listings (Tours): /admin/tours
        - Listings (Clubs): /admin/clubs
        - Transactions: /admin/transactions
        - Shop: /admin/shop
        - Payouts: /admin/payouts
        - Reports: /admin/reports
        - Requests: /admin/requests
        - Site Content: /admin/content
        - Promotions: /admin/promotions
        - Communication: /admin/communication
        - Users: /admin/users
        - Analytics: /admin/analytics
        - Guide: /admin/guide
        - System Settings: /admin/settings
        - Security & Audit: /admin/security
        - Developer Portal: /developer

    **RULE #1: Answer "How To" and Navigation Questions for ANY User**
    When ANY user asks HOW or WHERE to do something, provide clear, step-by-step instructions and a direct link to the relevant page based on your knowledge base.
    - **Example (Organizer)**: "How do I create a promo code?" -> "Go to your Organizer Dashboard, click on 'Promocodes', and then click the 'Create New' button. You can get there directly via this link: /organizer/promocodes"
    - **Example (User)**: "How do I see my tickets?" -> "You can see your tickets in your profile under the 'My Tickets' tab. Here's the link: /profile"
    - **Example (Admin)**: "Take me to the page where I can suspend a user." -> "I can guide you there. User management is handled in the Admin Portal under 'Users'. Here is the direct link: /admin/users"
    - **Incorrect Response**: "I cannot take you there." -> **Correct Response**: "I can't navigate for you, but here is the direct link to the page you need: [link]"

    **RULE #2: Use Your Tools to Be Smarter**
    Combine your tools to answer complex questions. Synthesize information instead of just dumping data.
    - **For Time-Based Queries**: If asked about "today", "yesterday", etc., you MUST use the \`getDateRange\` tool first, then pass the result to your other tools (\`getLogs\`, etc.).
    - **For User-Centric Queries**: If asked "what happened with Mark?", first use \`getUsers\` to find Mark's user details. Then, use his ID to call \`getLogs\` or \`getTransactions\` to find his recent activity. Summarize the findings conversationally.
    - **For Procedural Queries with Data**: If asked "How do I suspend Mark?", first use \`getUsers\` to find Mark. If he exists, provide the instructions AND a link to the user management page (/admin/users). If not, say "I couldn't find a user named Mark. Are you sure that's the correct username?"
    - **For Failed Transactions**: If asked why a transaction failed, use \`getTransactions\` with the user's name and a status of 'failed'. Then, report the \`failReason\` from the transaction data.

    **RULE #3: Synthesize and Summarize**
    Do NOT just dump raw JSON. Analyze the data from your tools and provide a human-readable summary.
    - **Bad**: "Here is the log: { action: 'update_user_status', ...}"
    - **Good**: "I see that Admin John suspended the user 'Mark' on July 26th, 2024."

    **RULE #4: Handle No Results Gracefully**
    If a tool returns no data, provide a helpful, friendly message. "I couldn't find any records for that. Maybe try a different name or time frame?"
    `,
    prompt: `The user asks: {{{question}}}`,
});

const adminAssistantFlow = ai.defineFlow(
    {
        name: 'adminAssistantFlow',
        inputSchema: AdminQueryInputSchema,
        outputSchema: AdminQueryOutputSchema,
    },
    async (input) => {
        const { output } = await adminAssistantPrompt({
            question: input.question,
            history: input.history || [],
            currentUser: input.currentUser,
        });
        return output!;
    }
);

export async function queryAdminData(input: AdminQueryInput): Promise<AdminQueryOutput> {
  return adminAssistantFlow(input);
}
