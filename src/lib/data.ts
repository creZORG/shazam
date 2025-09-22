
import type { Event, Organizer, Tour, NightlifeEvent } from './types';
import { PlaceHolderImages } from './placeholder-images';

export const eventCategories = [
    "Music",
    "Food & Drink",
    "Arts & Culture",
    "Tech",
    "Sports & Fitness",
    "Community",
];

export const ageCategories = ["Kids", "Teenagers", "Young Adults", "Youths", "Seniors", "All"];
export const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];


export const featureCards = [
    {
        title: 'Events',
        description: 'From music festivals to tech conferences, find your next experience.',
        icon: 'Ticket',
        href: '/events',
        cta: 'Browse Events',
        imageUrl: 'https://picsum.photos/seed/cat-event/800/600',
        imageHint: 'concert crowd',
    },
    {
        title: 'Tours',
        description: 'Explore the beauty of Nakuru with our curated local tours.',
        icon: 'Mountain',
        href: '/tours',
        cta: 'Discover Tours',
        imageUrl: 'https://picsum.photos/seed/cat-tour/800/600',
        imageHint: 'safari landscape',
    },
    {
        title: 'Nightlife',
        description: 'Discover the hottest parties, DJ sets, and club events happening tonight.',
        icon: 'PartyPopper',
        href: '/nightlife',
        cta: 'Explore Nightlife',
        imageUrl: 'https://picsum.photos/seed/cat-night/800/600',
        imageHint: 'nightclub lights',
    }
];
