
export type EventTicketingType = 'naksyetu' | 'external';
export type ExternalEventPricing = 'Free' | 'Paid' | 'RSVP' | 'Online';

export type Organizer = {
    id: string;
    name: string;
    bio: string;
    imageUrl: string;
    rating?: {
        average: number;
        count: number;
    };
    gallery?: string[];
}

type GalleryImage = {
    imageUrl: string;
    imageHint: string;
}

type ListingStatus = 'draft' | 'submitted for review' | 'published' | 'rejected' | 'archived' | 'taken-down';

export type TicketDefinition = {
    name: string;
    price: number;
    quantity: number;
    description?: string;
    discountQuantity?: number;
    discountPercentage?: number;
}

export type Event = {
  id: string;
  name:string;
  date: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
  venue: string;
  subCounty: string;
  price: number;
  remainingTickets: number;
  imageUrl: string;
  imageHint?: string;
  description: string;
  ticketingType: EventTicketingType;
  externalPrice?: ExternalEventPricing;
  category: string;
  ageCategory: 'Kids' | 'Teenagers' | 'Young Adults' | 'Youths' | 'Seniors' | 'All';
  organizer?: Organizer;
  organizerId?: string;
  gallery?: string[];
  tickets?: TicketDefinition[];
  slug?: string;
  organizerName?: string;
  status?: ListingStatus;
  rating?: {
    average: number;
    count: number;
  };
};

export type Tour = {
  id: string;
  name: string;
  destination: string;
  duration?: string; // This can be calculated
  startDate: string;
  endDate:string;
  price: number;
  bookingFee: number;
  imageUrl: string;
  imageHint?: string;
  description: string;
  organizer: Organizer;
  organizerId?: string;
  availability: string;
  startingPoint: string;
  endPoint: string;
  itinerary: { value: string }[] | string[];
  inclusions: { value: string }[] | string[];
  exclusions: { value: string }[] | string[];
  slug?: string;
  organizerName?: string;
  status?: ListingStatus;
};

export type NightlifeEvent = {
  id: string;
  clubId: string;
  clubName: string;
  eventName: string;
  date: string;
  imageUrl: string;
  imageHint?: string;
  description: string;
  entranceFee: string;
  specialAppearances: string[];
  musicPolicy: string[];
  dressCode: string;
  status?: ListingStatus;
};

// Foundational Data Schemas
export type UserRole = 'attendee' | 'organizer' | 'club' | 'influencer' | 'admin' | 'super-admin' | 'verifier';

export type FirebaseUser = {
  uid: string;
  name: string; // This will now store the username
  fullName?: string; // Full name as in ID
  email: string | null;
  phone: string | null;
  profilePicture?: string;
  role: UserRole;
  createdAt: any;
  lastLogin: string | number;
  bookmarkedEvents?: string[];
  assignedEvents?: string[]; // For event-specific verifiers
  
  // Analytics fields
  userAgent?: string;
  referrer?: string;

  // Organizer/Club specific fields
  organizerName?: string;
  about?: string;
  gallery?: string[];
  status?: 'active' | 'pending_review' | 'suspended';
  payouts?: { 
      balance: number;
      pending: number;
  };
  rating?: {
    average: number;
    count: number;
  };

  // Influencer specific fields
  socials?: {
    twitter?: string;
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    linkedin?: string;
  };
  privacy?: {
    showStats: boolean;
    showCampaigns: boolean;
  };
};

export type Order = {
    id: string;
    userId?: string; // Optional for guest checkouts
    userEmail: string;
    userName: string; // Name for the ticket, can be guest's or user's
    userPhone: string;
    listingId: string;
    organizerId: string;
    listingType: 'event' | 'tour';
    tickets: {
        name: string;
        quantity: number;
        price: number;
    }[];
    subtotal: number;
    discount: number;
    platformFee: number;
    processingFee: number;
    total: number;
    promocodeId?: string;
    createdAt: any;
    updatedAt: any;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    
    // Analytics Fields
    channel: "direct" | "referral" | "ad" | "search" | "organic_social";
    deviceInfo: {
        userAgent: string;
        ipAddress?: string; // Collected server-side
    };
    timeToPurchase?: number; // Milliseconds from first interaction to purchase
}

export type Ticket = {
  id?: string;
  orderId: string;
  userId?: string; // Optional for guest tickets
  userName: string; // Name provided at checkout
  listingId: string;
  ticketType: string;
  qrCode: string; // The unique string for the QR code
  status: 'valid' | 'used' | 'invalid';
  createdAt: any;
  validatedAt?: any;
  validatedBy?: string; // UID of the verifier
  generatedBy?: 'online_sale' | 'organizer';
};


export type Transaction = {
    id?: string;
    orderId: string;
    userId?: string;
    amount: number;
    createdAt: any;
    updatedAt: any;
    status: 'pending' | 'completed' | 'failed';
    method: 'mpesa' | 'card' | 'manual';
    
    // M-Pesa Specific
    mpesaCheckoutRequestId?: string;
    mpesaCallbackData?: any;
    mpesaConfirmationCode?: string;
    
    // Analytics
    failReason?: string;
    retryCount: number;
    ipAddress?: string;
    networkInfo?: any; // Could store network type if available
}

export type UserEvent = {
  uid: string;
  action: "click_event" | "hover_event" | "bookmark_event" | "share_event" | "start_checkout" | "abandon_checkout";
  eventId: string;
  timestamp: number;
  durationMs?: number;
  deviceInfo?: {
      userAgent: string;
  };
};

export type DeviceToken = {
  uid: string;
  token: string;
  platform: "android" | "ios" | "web";
  createdAt: number;
};

export type SiteSettings = {
    platformFee: number;
    processingFee: number;
    processingFeePayer: 'customer' | 'organizer';
    influencerCut: number;
}
    
export type Promocode = {
    id: string;
    organizerId: string;
    listingId?: string; // Optional for sitewide coupons
    listingName: string; // Will be "All Events" for sitewide
    listingType: 'event' | 'tour' | 'all';
    influencerId?: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    commissionType?: 'percentage' | 'fixed';
    commissionValue?: number;
    usageLimit: number;
    usageCount: number;
    revenueGenerated: number;
    expiresAt: string | null;
    isActive: boolean;
    influencerStatus?: 'pending' | 'accepted' | 'rejected';
    createdAt: any;
    updatedAt: any;
}

export type AuditLog = {
    id?: string;
    adminId: string;
    adminName: string;
    action: string; // e.g., 'update_event_status', 'update_user_role'
    targetType: 'event' | 'tour' | 'user' | 'settings' | 'promocode' | 'payout' | 'content' | 'support';
    targetId: string;
    timestamp: any;
    details: Record<string, any>; // e.g., { from: 'draft', to: 'published', eventName: 'NaxVegas' }
}

export type EarningsAudit = {
    sourceId: string; // e.g., promocode ID
    sourceName: string; // e.g., "NAKS10 for NaxVegas"
    amount: number;
    ticketsSold: number;
    revenue: number;
}

export type PayoutRequest = {
    id: string;
    userId: string; // UID of influencer or organizer
    userRole: 'influencer' | 'organizer';
    amountRequested: number;
    amountDisbursed?: number;
    status: 'pending' | 'accepted' | 'partially_accepted' | 'rejected';
    requestedAt: any;
    processedAt?: any;
    processorId?: string; // UID of admin who processed it
    rejectionReason?: string;
    
    // User-confirmed details at time of request
    payoutDetails: {
        fullName: string;
        mpesaNumber: string;
        bankDetails?: {
            accountName: string;
            accountNumber: string;
            bank: string;
            branch: string;
        };
    };

    // Snapshot of earnings at time of request
    earningsAudit: EarningsAudit[];
}

export type Invitation = {
    id?: string;
    email: string;
    role: UserRole;
    token: string;
    expiresAt: any;
    status: 'pending' | 'accepted';
    invitedBy: string; // UID of the admin/organizer who sent the invite
    createdAt: any;
    eventId?: string; // Optional: for event-specific roles like verifier
    listingName?: string; // Optional: name of the event
};

export type TeamMember = {
    id: string;
    name: string;
    role: string;
    imageUrl: string;
    bio?: string;
}

export type BlogPost = {
    id: string;
    title: string;
    tldr: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: any;
    expiresAt: any;
}
    
export type Opportunity = {
    id: string;
    title: string;
    description: string;
    type: 'Job' | 'Partnership' | 'Volunteer';
    ctaLink: string;
    createdAt: any;
}

export type PartnerRequest = {
    id: string;
    userId: string;
    user: {
        name: string;
        email: string | null;
        profilePicture?: string;
    }
    requestedRole: UserRole;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    processedAt?: any;
    processorId?: string;
}

export type AdSubmission = {
    id: string;
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
    campaignName: string;
    imageUrls: string[];
    ctaText: string;
    ctaLink: string;
    priority: number;
    duration: string;
    isAdultContent: boolean;
}

export type SupportTicket = {
    id: string;
    userId?: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    status: 'open' | 'closed';
    createdAt: any;
}
