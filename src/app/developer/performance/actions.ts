
'use server';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy,getCountFromServer } from 'firebase/firestore';
import { subHours, startOfHour, formatISO } from 'date-fns';
import { unstable_noStore as noStore } from 'next/cache';

export async function getPerformanceMetrics() {
    noStore();
    try {
        const now = new Date();
        const twentyFourHoursAgo = subHours(now, 24);

        const interactionsQuery = query(
            collection(db, 'userEvents'),
            where('timestamp', '>=', twentyFourHoursAgo.getTime())
        );
        const transactionsQuery = query(
            collection(db, 'transactions'),
            where('status', '==', 'completed'),
            where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo))
        );
        const errorsQuery = query(
            collection(db, 'errorLogs'),
            where('timestamp', '>=', Timestamp.fromDate(twentyFourHoursAgo))
        );

        const [
            interactionsCount,
            transactionsCount,
            errorsCount,
            interactionsSnapshot,
            transactionsSnapshot,
            errorsSnapshot
        ] = await Promise.all([
            getCountFromServer(interactionsQuery),
            getCountFromServer(transactionsQuery),
            getCountFromServer(errorsQuery),
            getDocs(interactionsQuery),
            getDocs(transactionsQuery),
            getDocs(errorsQuery)
        ]);

        const totalInteractions = interactionsCount.data().count;
        const totalTransactions = transactionsCount.data().count;
        const totalErrors = errorsCount.data().count;

        const activityByHour = Array.from({ length: 25 }, (_, i) => {
            const hour = startOfHour(subHours(now, i));
            return {
                hour: formatISO(hour),
                interactions: 0,
                transactions: 0,
                errors: 0,
            };
        }).reverse();

        const activityMap = new Map(activityByHour.map(h => [h.hour, h]));

        interactionsSnapshot.forEach(doc => {
            const hour = formatISO(startOfHour(new Date(doc.data().timestamp)));
            if (activityMap.has(hour)) {
                activityMap.get(hour)!.interactions++;
            }
        });

        transactionsSnapshot.forEach(doc => {
            const hour = formatISO(startOfHour(doc.data().createdAt.toDate()));
             if (activityMap.has(hour)) {
                activityMap.get(hour)!.transactions++;
            }
        });

        errorsSnapshot.forEach(doc => {
            const hour = formatISO(startOfHour(doc.data().timestamp.toDate()));
             if (activityMap.has(hour)) {
                activityMap.get(hour)!.errors++;
            }
        });

        return {
            success: true,
            data: {
                totalInteractions,
                totalTransactions,
                totalErrors,
                activityByHour: Array.from(activityMap.values())
            }
        };

    } catch (error: any) {
        console.error("Error fetching performance metrics:", error);
        return { success: false, error: error.message || 'Failed to fetch performance metrics.' };
    }
}
