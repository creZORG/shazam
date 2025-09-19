
import { getListings } from '@/app/actions';
import type { Event, Tour, NightlifeEvent } from '@/lib/types';

const URL = 'https://naksyetu.com';

export default async function sitemap() {
  const { listings: events } = await getListings('events');
  const { listings: tours } = await getListings('tours');
  const { listings: nightlifeEvents } = await getListings('nightlifeEvents');

  const eventUrls = (events as Event[]).map((event) => ({
    url: `${URL}/events/${event.slug || event.id}`,
    lastModified: new Date(event.date).toISOString(),
  }));

  const tourUrls = (tours as Tour[]).map((tour) => ({
    url: `${URL}/tours/${tour.slug || tour.id}`,
    lastModified: new Date(tour.startDate).toISOString(),
  }));
  
  const nightlifeUrls = (nightlifeEvents as NightlifeEvent[]).map((event) => ({
    url: `${URL}/nightlife/${event.id}`,
    lastModified: new Date(event.date).toISOString(),
  }));

  const staticRoutes = [
    '',
    '/events',
    '/tours',
    '/nightlife',
    '/shop',
    '/about',
    '/contact',
    '/support',
    '/partner-with-us',
    '/influencers',
    '/privacy-policy',
    '/terms-of-service',
    '/refund-policy'
  ].map((route) => ({
    url: `${URL}${route}`,
    lastModified: new Date().toISOString(),
  }));

  return [...staticRoutes, ...eventUrls, ...tourUrls, ...nightlifeUrls];
}
