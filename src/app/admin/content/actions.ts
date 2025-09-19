
'use server';

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, updateDoc, increment, orderBy, Timestamp, deleteDoc, where, query, serverTimestamp } from "firebase/firestore";
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/firebase/server-auth';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import type { TeamMember, BlogPost, ExternalEventPricing, Opportunity, AdSubmission, Product } from '@/lib/types';
import { logAdminAction } from '@/services/audit-service';


const CONTENT_DOC_ID = 'siteContent';

type SiteContent = {
    contact?: {
        phone?: string;
        email?: string;
        location?: string;
        mapsLink?: string;
    },
    socials?: {
        twitter?: string;
        instagram?: string;
        facebook?: string;
    }
}

export type Poster = {
    id: string;
    title: string;
    imageUrl: string;
    ctaLink: string;
    clicks: number;
    shares: number;
    createdAt: any;
    venue?: string;
    date?: string;
    pricingType?: ExternalEventPricing;
}

export async function getSiteContent(): Promise<{ data: SiteContent | null, error: string | null }> {
    noStore();
    try {
        const contentDocRef = doc(db, 'config', CONTENT_DOC_ID);
        const docSnap = await getDoc(contentDocRef);

        if (docSnap.exists()) {
            return { data: docSnap.data() as SiteContent, error: null };
        } else {
            // Return empty object if no content is found
            return { data: {}, error: null };
        }
    } catch (error) {
        console.error("Error fetching site content:", error);
        return { data: null, error: "Failed to fetch site content." };
    }
}

export async function updateSiteContent(content: SiteContent) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }
    
    try {
        const contentDocRef = doc(db, 'config', CONTENT_DOC_ID);
        await setDoc(contentDocRef, content, { merge: true });
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_site_content',
            targetType: 'settings',
            targetId: 'site_content',
            details: { updatedFields: Object.keys(content) }
        });
        
        revalidatePath('/');
        revalidatePath('/contact');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error updating site content:", error);
        return { success: false, error: `Failed to update content. Details: ${error.message}` };
    }
}

export async function createPoster(data: Omit<Poster, 'id' | 'clicks' | 'shares' | 'createdAt'>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }
    
    try {
        const docRef = await addDoc(collection(db, 'posters'), {
            ...data,
            clicks: 0,
            shares: 0,
            createdAt: new Date().toISOString(),
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'create_poster',
            targetType: 'content',
            targetId: docRef.id,
            details: { title: data.title }
        });

        revalidatePath('/admin/content');
        revalidatePath('/');
        revalidatePath('/events');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to create poster. Details: ${error.message}` };
    }
}


export async function getPosters(): Promise<{ data: Poster[], error: string | null }> {
    noStore();
    try {
        const querySnapshot = await getDocs(collection(db, 'posters'));
        const posters = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Poster));
        console.log(`[getPosters] Found ${posters.length} posters in total.`);
        posters.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return { data: posters, error: null };
    } catch (error) {
        console.error("[getPosters] Error fetching posters", error);
        return { data: [], error: 'Failed to fetch posters' };
    }
}

export async function deletePoster(id: string): Promise<{ success: boolean; error?: string }> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const posterDoc = await getDoc(doc(db, 'posters', id));
        const posterTitle = posterDoc.data()?.title;

        await deleteDoc(doc(db, 'posters', id));

         await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'delete_poster',
            targetType: 'content',
            targetId: id,
            details: { title: posterTitle }
        });

        revalidatePath('/admin/content');
        revalidatePath('/');
        revalidatePath('/events');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to delete poster. Details: ${error.message}` };
    }
}


export async function trackPosterInteraction(posterId: string, interactionType: 'clicks' | 'shares') {
    try {
        const posterRef = doc(db, 'posters', posterId);
        await updateDoc(posterRef, {
            [interactionType]: increment(1)
        });
        revalidatePath('/events');
        return { success: true };
    } catch (error) {
        // This is a non-critical action, so we won't surface the error to the user
        console.error(`Failed to track poster ${interactionType}:`, error);
        return { success: false };
    }
}


export async function createTeamMember(data: Omit<TeamMember, 'id'>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }
    
    try {
        const docRef = await addDoc(collection(db, 'team'), { ...data });

         await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'create_team_member',
            targetType: 'content',
            targetId: docRef.id,
            details: { name: data.name, role: data.role }
        });

        revalidatePath('/admin/content');
        revalidatePath('/about/team');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to create team member. Details: ${error.message}` };
    }
}

export async function getTeamMembers(): Promise<{ data: TeamMember[], error: string | null }> {
    noStore();
    try {
        const querySnapshot = await getDocs(collection(db, 'team'));
        const members = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember));
        return { data: members, error: null };
    } catch (error) {
        return { data: [], error: 'Failed to fetch team members' };
    }
}

export async function createBlogPost(data: Omit<BlogPost, 'id' | 'authorId' | 'authorName' | 'createdAt'>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    
    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const docRef = await addDoc(collection(db, 'blog'), { 
            ...data,
            authorId: decodedClaims.uid,
            authorName: decodedClaims.name?.split(' ')[0] || 'Admin',
            createdAt: new Date().toISOString(),
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'create_blog_post',
            targetType: 'content',
            targetId: docRef.id,
            details: { title: data.title }
        });

        revalidatePath('/admin/content');
        revalidatePath('/blog');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to create blog post. Details: ${error.message}` };
    }
}

function serializeDoc(doc: any) {
    const data = doc.data();
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        } else if (data[key] && typeof data[key].toDate === 'function') { // Handle serverTimestamp
            data[key] = data[key].toDate().toISOString();
        }
    }
    return { id: doc.id, ...data };
}


export async function getBlogPosts(): Promise<{ data: BlogPost[], error: string | null }> {
    noStore();
    try {
        const q = query(collection(db, 'blog'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(serializeDoc) as BlogPost[];
        return { data: posts, error: null };
    } catch (error) {
        return { data: [], error: 'Failed to fetch blog posts' };
    }
}

export async function createOpportunity(data: Omit<Opportunity, 'id' | 'createdAt'>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }
    
    try {
        const docRef = await addDoc(collection(db, 'opportunities'), { 
            ...data,
            createdAt: new Date().toISOString(),
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'create_opportunity',
            targetType: 'content',
            targetId: docRef.id,
            details: { title: data.title, type: data.type }
        });

        revalidatePath('/admin/content');
        revalidatePath('/opportunities');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to create opportunity. Details: ${error.message}` };
    }
}

export async function getOpportunities(): Promise<{ data: Opportunity[], error: string | null }> {
    noStore();
    try {
        const q = query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const opportunities = querySnapshot.docs.map(serializeDoc) as Opportunity[];
        return { data: opportunities, error: null };
    } catch (error) {
        return { data: [], error: 'Failed to fetch opportunities' };
    }
}

export async function deleteOpportunity(id: string): Promise<{ success: boolean; error?: string }> {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const oppDoc = await getDoc(doc(db, 'opportunities', id));
        const oppTitle = oppDoc.data()?.title;

        await deleteDoc(doc(db, 'opportunities', id));

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'delete_opportunity',
            targetType: 'content',
            targetId: id,
            details: { title: oppTitle }
        });

        revalidatePath('/admin/content');
        revalidatePath('/opportunities');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to delete opportunity. Details: ${error.message}` };
    }
}


export async function getApprovedAds(): Promise<{ data: AdSubmission[], error: string | null }> {
    noStore();
    try {
        const q = query(collection(db, 'adSubmissions'), where('status', '==', 'approved'));
        const snapshot = await getDocs(q);
        const ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdSubmission));
        console.log(`[getApprovedAds] Found ${ads.length} approved ads.`);
        return { data: ads, error: null };
    } catch (error) {
        console.error("[getApprovedAds] Error fetching approved ads", error);
        return { data: [], error: 'Failed to fetch ads' };
    }
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt'>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }
    
    try {
        const docRef = await addDoc(collection(db, 'products'), {
            ...data,
            createdAt: serverTimestamp(),
        });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'create_product',
            targetType: 'content',
            targetId: docRef.id,
            details: { name: data.name }
        });

        revalidatePath('/admin/shop');
        revalidatePath('/shop');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to create product. Details: ${error.message}` };
    }
}

export async function getProducts(showTakenDown = false): Promise<{ data: Product[], error: string | null }> {
    noStore();
    try {
        let q: any = collection(db, 'products');
        if (!showTakenDown) {
            q = query(q, where('status', '==', 'active'));
        } else {
            // For admin, just sort by date to see everything
            q = query(q, orderBy('createdAt', 'desc'));
        }
        
        const querySnapshot = await getDocs(q);
        const products = querySnapshot.docs.map(serializeDoc(doc) as Product);
        
        // If we didn't sort by date on the server (for the public page), sort here.
        if (!showTakenDown) {
            products.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return { data: products, error: null };
    } catch (error) {
        console.error("Error fetching products:", error);
        return { data: [], error: 'Failed to fetch products' };
    }
}

export async function updateProductStatus(productId: string, status: 'active' | 'taken-down') {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const productRef = doc(db, 'products', productId);
        const productDoc = await getDoc(productRef);
        await updateDoc(productRef, { status: status });

        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_product_status',
            targetType: 'content',
            targetId: productId,
            details: { name: productDoc.data()?.name, newStatus: status }
        });
        
        revalidatePath('/admin/shop');
        revalidatePath('/shop');

        return { success: true };
    } catch (error: any) {
        return { success: false, error: `Failed to update product status. Details: ${error.message}` };
    }
}

export async function updateProduct(productId: string, data: Partial<Omit<Product, 'id' | 'createdAt'>>) {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return { success: false, error: 'Not authenticated' };
    if (!productId) return { success: false, error: 'Product ID is required.' };

    let decodedClaims;
    try {
        if (!auth) throw new Error("Server auth not initialized");
        decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    } catch (e) {
        return { success: false, error: 'Authentication failed.' };
    }

    try {
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, data);
        
        await logAdminAction({
            adminId: decodedClaims.uid,
            adminName: decodedClaims.name || 'Admin',
            action: 'update_product',
            targetType: 'content',
            targetId: productId,
            details: { name: data.name, updatedFields: Object.keys(data) }
        });

        revalidatePath('/admin/shop');
        revalidatePath(`/shop/${productId}`);
        revalidatePath(`/admin/shop/edit/${productId}`);

        return { success: true };
    } catch (error: any) {
        console.error("Error updating product:", error);
        return { success: false, error: `Failed to update product. Details: ${error.message}` };
    }
}