

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
    salesStart?: string;
    salesEnd?: string;
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
  whatsappGroupLink?: string;
  freeMerch?: {
    productId: string;
    productName: string;
  };
  type: 'event';
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
  whatsappGroupLink?: string;
  type: 'tour';
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

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    imageUrls: string[];
    sizes: string[];
    colors: string[];
    stock: number;
    status: 'active' | 'taken-down';
    createdAt: any;
}

export type MerchOrder = {
    id: string;
    userId?: string;
    userName: string;
    userEmail: string;
    items: {
        productId: string;
        productName: string;
        size: string;
        color: string;
        quantity: number;
        price: number;
    }[];
    total: number;
    status: 'awaiting_pickup' | 'completed';
    confirmationCode: string;
    createdAt: any;
    completedAt?: any;
    transactionId?: string;
}

// Foundational Data Schemas
export type UserRole = 'attendee' | 'organizer' | 'club' | 'influencer' | 'admin' | 'super-admin' | 'verifier' | 'developer';

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
  assignedEvents?: string[]; // For event-specific roles like verifier
  
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
    paymentType: 'full' | 'booking';
    tickets: {
        name: string;
        quantity: number;
        price: number;
    }[];
    freeMerch?: {
        productId: string;
        productName: string;
    };
    subtotal: number;
    discount: number;
    platformFee: number;
    processingFee: number;
    total: number;
    promocodeId?: string;
    trackingLinkId?: string; // To track influencer sub-links
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
  ticketDetails?: { name: string; quantity: number }[];
  deviceInfo?: {
      userAgent: string;
  };
};

export type VerificationScan = {
    id?: string;
    verifierId: string;
    eventId: string;
    ticketId: string;
    status: 'success' | 'error';
    message: string;
    details?: { 
        eventName: string;
        ticketType: string;
        attendeeName: string;
     };
    timestamp: any;
};


export type DeviceToken = {
  uid: string;
  token: string;
  platform: "android" | "ios" | "web";
  createdAt: number;
};

export type FeatureCardContent = {
  title: string;
  description: string;
  href: string;
  cta: string;
  imageUrl: string;
};

export type PartnerSectionContent = {
  title: string;
  description: string;
  href: string;
  cta: string;
  imageUrl: string;
};


export type SiteSettings = {
    platformFee: number;
    processingFee: number;
    processingFeePayer: 'customer' | 'organizer';
    influencerCut: number;
    logoBriefUrl?: string;
    logoLongUrl?: string;
    homepage?: {
      featureCards?: FeatureCardContent[];
      partnerSection?: PartnerSectionContent;
    };
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

export type TrackingLink = {
    id: string;
    name: string;
    clicks: number;
    purchases: number;
    longUrl: string;
    shortId: string;
    createdAt: any;
}

export type PromocodeClick = {
    id?: string;
    promocodeId: string;
    trackingLinkId: string;
    shortId: string;
    timestamp: any;
    userAgent: string;
    ipAddress: string;
}

export type AuditLog = {
    id?: string;
    timestamp: any;
    adminId: string;
    adminName: string;
    action: string; // e.g., 'update_event_status', 'update_user_role'
    targetType: 'event' | 'tour' | 'user' | 'settings' | 'promocode' | 'payout' | 'content' | 'support' | 'invitation';
    targetId: string;
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
    email: string | null;
    role: UserRole;
    token: string;
    expiresAt: any;
    status: 'pending' | 'accepted' | 'void';
    invitedBy: string; // UID of the admin/organizer who sent the invite
    createdAt: any;
    acceptedBy?: {
      uid: string;
      name: string;
      email: string;
      photoURL?: string;
    };
    eventId?: string; // Optional: for event-specific roles like verifier
    listingName?: string; // Optional: name of the event
    shortId: string;
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
    impressions?: number;
    clicks?: number;
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
    replies?: SupportTicketReply[];
}

export type SupportTicketReply = {
  id?: string;
  authorId: string;
  authorName: string;
  message: string;
  createdAt: any;
};

export type StaffNote = {
  id: string;
  message: string;
  type: 'info' | 'warning';
  roles: UserRole[];
  senderId: string;
  senderName: string;
  createdAt: any;
  readBy: {
      userId: string;
      readAt: Date;
  }[];
};

export type Notification = {
    id: string;
    type: 'new_order' | 'new_user' | 'partner_request' | 'ad_submission' | 'payout_request' | 'event_approved' | 'event_rejected';
    message: string;
    link: string;
    createdAt: any;
    readBy: string[]; // Array of user IDs who have read it
    targetRoles: UserRole[]; // Which roles should see this
    targetUsers?: string[]; // Specific users to notify (e.g., the organizer)
};

export type CheckoutFeedback = {
    id?: string;
    orderId: string;
    userId?: string;
    rating: number;
    reason?: string;
    createdAt: any;
}

export type ShortLink = {
    longUrl: string;
    createdAt: any;
}
