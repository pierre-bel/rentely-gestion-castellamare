interface MessageThread {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  booking_id: string | null;
  listing_id: string | null;
  last_message_at: string;
  created_at: string;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_reason?: string | null;
}

interface Message {
  id: string;
  thread_id: string;
  from_user_id: string;
  to_user_id: string;
  body: string;
  attachment_url: string | null;
  attachment_type: string | null;
  read: boolean;
  created_at: string;
}

interface DemoSnapshot {
  bookings: any[];
  transactions: any[];
  profile: any;
  reviews: any[];
  guestDebts: any[];
  disputes: any[];
  messageThreads: MessageThread[];
  messages: Message[];
  profiles: Record<string, any>; // Store other users' profiles (hosts, etc.)
  
  // Host-specific data
  listings: any[];
  hostBookings: any[];
  payouts: any[];
  listingAvailability: any[];
  hostTransactions: any[];
  moderationFeedback: any[];
  
  // Admin-specific data
  adminListings: any[];
  adminProfiles: Record<string, any>;
  adminModerationActions: any[];
  adminSupportThreads: any[];
  adminSupportMessages: any[];
  adminUsers: any[];
  adminReviews: any[];
  adminPayouts: any[];
  adminFAQs: any[];
  
  // Platform configuration
  platformSettings: {
    default_host_commission_rate: string;
    default_guest_service_fee_rate: string;
    default_tax_rate: string;
  };
  
  lastUpdated: string;
}

// Demo host data for display
const DEMO_HOST = {
  id: 'ba93e2d9-3d04-4e69-8c7d-48dcbd2520a1',
  first_name: 'Demo',
  last_name: 'Host',
  email: 'host@demo.com'
};

const DEMO_STORAGE_KEY = "demo_snapshot";

export const demoStorage = {
  // Save the complete snapshot
  saveSnapshot: (userId: string, data: Partial<DemoSnapshot>) => {
    const key = `${DEMO_STORAGE_KEY}_${userId}`;
    const existing = demoStorage.getSnapshot(userId);
    const snapshot: DemoSnapshot = {
      ...existing,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(snapshot));
  },

  // Get the complete snapshot
  getSnapshot: (userId: string): DemoSnapshot => {
    const key = `${DEMO_STORAGE_KEY}_${userId}`;
    const stored = localStorage.getItem(key);
    if (!stored) {
      return {
        bookings: [],
        transactions: [],
        profile: null,
        reviews: [],
        guestDebts: [],
        disputes: [],
        messageThreads: [],
        messages: [],
        profiles: {},
        listings: [],
        hostBookings: [],
        payouts: [],
        listingAvailability: [],
        hostTransactions: [],
        moderationFeedback: [],
        adminListings: [],
        adminProfiles: {},
        adminUsers: [],
        adminReviews: [],
        adminPayouts: [],
        adminModerationActions: [],
        adminSupportThreads: [],
        adminSupportMessages: [],
        adminFAQs: [],
        platformSettings: {
          default_host_commission_rate: "0.15",
          default_guest_service_fee_rate: "0.10",
          default_tax_rate: "0.08",
        },
        lastUpdated: new Date().toISOString(),
      };
    }
    return JSON.parse(stored);
  },

  // Clear snapshot
  clearSnapshot: (userId: string) => {
    const key = `${DEMO_STORAGE_KEY}_${userId}`;
    localStorage.removeItem(key);
  },

  // Booking operations
  addBooking: (userId: string, booking: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    // Ensure booking has a listings object for display
    if (!booking.listings && booking.listing_id) {
      // This will be populated by the calling code
      console.warn('Booking added without listing details');
    }
    snapshot.bookings.push(booking);
    demoStorage.saveSnapshot(userId, snapshot);
  },

  updateBooking: (userId: string, bookingId: string, updates: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Update in bookings array (guest view)
    const index = snapshot.bookings.findIndex((b) => b.id === bookingId);
    if (index !== -1) {
      snapshot.bookings[index] = { ...snapshot.bookings[index], ...updates };
    }
    
    // Update in hostBookings array (host view)
    const hostIndex = snapshot.hostBookings.findIndex((b: any) => b.id === bookingId);
    if (hostIndex !== -1) {
      snapshot.hostBookings[hostIndex] = { ...snapshot.hostBookings[hostIndex], ...updates };
    }
    
    demoStorage.saveSnapshot(userId, snapshot);
  },

  getBooking: (userId: string, bookingId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    // Check guest bookings first, then host bookings
    const guestBooking = snapshot.bookings.find((b) => b.id === bookingId);
    if (guestBooking) return guestBooking;
    
    const hostBooking = snapshot.hostBookings.find((b: any) => b.id === bookingId);
    return hostBooking || null;
  },

  getBookings: (userId: string, filters?: { status?: string }) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let bookings = snapshot.bookings;
    
    if (filters?.status) {
      bookings = bookings.filter((b) => b.status === filters.status);
    }
    
    return bookings;
  },

  // Transaction operations
  addTransaction: (userId: string, transaction: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    snapshot.transactions.push(transaction);
    demoStorage.saveSnapshot(userId, snapshot);
  },

  getTransactions: (userId: string, filters?: { type?: string; status?: string }) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let transactions = snapshot.transactions;
    
    if (filters?.type) {
      transactions = transactions.filter((t) => t.type === filters.type);
    }
    
    if (filters?.status) {
      transactions = transactions.filter((t) => t.status === filters.status);
    }
    
    return transactions;
  },

  // Guest debt operations
  getGuestDebts: (userId: string, filters?: { status?: string }) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let debts = snapshot.guestDebts;
    
    if (filters?.status) {
      debts = debts.filter((d) => d.status === filters.status);
    }
    
    return debts;
  },

  updateGuestDebt: (userId: string, debtId: string, updates: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const index = snapshot.guestDebts.findIndex((d) => d.id === debtId);
    if (index !== -1) {
      snapshot.guestDebts[index] = { ...snapshot.guestDebts[index], ...updates };
      demoStorage.saveSnapshot(userId, snapshot);
    }
  },

  // Store a profile for another user (e.g., host profile when creating thread)
  storeProfile: (userId: string, profileId: string, profileData: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    if (!snapshot.profiles[profileId]) {
      snapshot.profiles[profileId] = profileData;
      demoStorage.saveSnapshot(userId, snapshot);
    }
  },

  // Dispute operations
  getDisputeForBooking: (userId: string, bookingId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    return snapshot.disputes.find((dispute: any) => 
      dispute.booking_id === bookingId && 
      ['open', 'in_progress', 'escalated'].includes(dispute.status)
    );
  },

  createDisputeWithSupportThread: (
    userId: string, 
    bookingId: string,
    listingId: string,
    category: string,
    subject: string,
    description: string,
    requestedRefundAmount: number | null,
    attachmentUrls: string[]
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Create dispute ID
    const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create support thread (participant_2_id is a fake "support" user)
    const SUPPORT_USER_ID = '00000000-0000-0000-0000-000000000001';
    const threadId = demoStorage.getOrCreateThread(userId, SUPPORT_USER_ID, bookingId, listingId);
    
    if (!threadId) {
      throw new Error("Failed to create support thread");
    }
    
    // CRITICAL: Refresh snapshot to get the thread that was just created and saved
    const refreshedSnapshot = demoStorage.getSnapshot(userId);
    Object.assign(snapshot, refreshedSnapshot);
    
    // Detect user role by checking if user owns the listing
    const listing = snapshot.listings.find((l: any) => l.id === listingId);
    const isHost = listing && listing.host_user_id === userId;
    const userRole = isHost ? 'host' : 'guest';
    
    // Create the dispute
    const newDispute = {
      id: disputeId,
      booking_id: bookingId,
      listing_id: listingId,
      support_thread_id: threadId,
      category: category,
      status: 'open',
      subject: subject,
      description: description,
      requested_refund_amount: requestedRefundAmount,
      initiated_by_user_id: userId,
      user_role: userRole,
      assigned_admin_id: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_refund_amount: null,
      resolved_by_admin_id: null,
      refund_transaction_id: null,
      attachment_urls: attachmentUrls,
      resolution_notes: null,
      admin_decision: null
    };
    
    snapshot.disputes.push(newDispute);
    
    // Store support user profile if not exists
    if (!snapshot.profiles[SUPPORT_USER_ID]) {
      snapshot.profiles[SUPPORT_USER_ID] = {
        id: SUPPORT_USER_ID,
        first_name: 'Support',
        last_name: 'Team',
        email: 'support@demo.com',
        avatar_url: null
      };
    }
    
    // Get booking details for listing title
    // Check both guest bookings and host bookings
    let booking = snapshot.bookings.find((b: any) => b.id === bookingId);
    let listingTitle = 'Unknown Property';
    
    if (booking?.listings?.title) {
      // Guest booking with nested listings object
      listingTitle = booking.listings.title;
    } else if (!booking) {
      // Try host bookings array
      booking = snapshot.hostBookings.find((b: any) => b.id === bookingId);
      if (booking?.listing_title) {
        listingTitle = booking.listing_title;
      }
    }
    
    // Format initial message (matching RPC function format)
    const categoryLabel = category.replace(/_/g, ' ');
    let formattedMessage = `Category: ${categoryLabel}\n\n${description}`;
    
    if (requestedRefundAmount !== null) {
      formattedMessage += `\n\nRequested Refund: $${requestedRefundAmount}`;
    }
    
    formattedMessage += `\n\nProperty: ${listingTitle}`;
    
    // Create initial text message
    const initialMessage: Message = {
      id: crypto.randomUUID(),
      thread_id: threadId,
      from_user_id: userId,
      to_user_id: SUPPORT_USER_ID,
      body: formattedMessage,
      attachment_url: null,
      attachment_type: null,
      read: false,
      created_at: new Date().toISOString(),
    };
    
    snapshot.messages.push(initialMessage);
    
    // Create separate messages for each attachment image
    attachmentUrls.forEach(url => {
      const attachmentMessage: Message = {
        id: crypto.randomUUID(),
        thread_id: threadId,
        from_user_id: userId,
        to_user_id: SUPPORT_USER_ID,
        body: '',
        attachment_url: url,
        attachment_type: 'image/jpeg',
        read: false,
        created_at: new Date().toISOString(),
      };
      snapshot.messages.push(attachmentMessage);
    });
    
    // Update thread's last_message_at to reflect the new messages
    const threadIndex = snapshot.messageThreads.findIndex(t => t.id === threadId);
    if (threadIndex !== -1) {
      snapshot.messageThreads[threadIndex].last_message_at = initialMessage.created_at;
    }
    
    demoStorage.saveSnapshot(userId, snapshot);
    
    return {
      success: true,
      thread_id: threadId,
      dispute_id: disputeId
    };
  },

  getDisputes: (userId: string, filters?: { status?: string }) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let disputes = snapshot.disputes || [];
    
    if (filters?.status) {
      disputes = disputes.filter((d: any) => d.status === filters.status);
    }
    
    return disputes;
  },

  // Review operations
  getReviews: (userId: string, bookingIds?: string[]) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let reviews = snapshot.reviews || [];
    
    if (bookingIds && bookingIds.length > 0) {
      reviews = reviews.filter((r: any) => bookingIds.includes(r.booking_id));
    }
    
    return reviews;
  },

  addReview: (userId: string, review: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Create review with generated ID and timestamps
    const newReview = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      booking_id: review.booking_id,
      listing_id: review.listing_id,
      author_user_id: userId,
      rating: review.rating,
      text: review.text || null,
      status: 'pending', // Match real mode - reviews need approval
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    snapshot.reviews.push(newReview);
    demoStorage.saveSnapshot(userId, snapshot);
    
    return newReview;
  },

  updateReview: (userId: string, reviewId: string, updates: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const index = snapshot.reviews.findIndex((r: any) => r.id === reviewId);
    
    if (index !== -1) {
      snapshot.reviews[index] = {
        ...snapshot.reviews[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      demoStorage.saveSnapshot(userId, snapshot);
      return snapshot.reviews[index];
    }
    
    return null;
  },

  // Profile operations (user's own profile)
  getProfile: (userId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    return snapshot.profile || null;
  },

  updateProfile: (userId: string, profileUpdates: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    snapshot.profile = {
      ...snapshot.profile,
      ...profileUpdates,
      updated_at: new Date().toISOString()
    };
    demoStorage.saveSnapshot(userId, snapshot);
    return snapshot.profile;
  },

  // Message Thread operations
  getOrCreateThread: (userId: string, participant2Id: string, bookingId: string | null, listingId: string | null): string => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Ensure participant IDs are in consistent order (smaller UUID first)
    const minId = userId < participant2Id ? userId : participant2Id;
    const maxId = userId < participant2Id ? participant2Id : userId;
    
    // Find existing thread matching participants and context
    const existingThread = snapshot.messageThreads.find(t => 
      t.participant_1_id === minId && 
      t.participant_2_id === maxId &&
      (t.booking_id === bookingId || (t.booking_id === null && bookingId === null)) &&
      (t.listing_id === listingId || (t.listing_id === null && listingId === null))
    );
    
    if (existingThread) {
      return existingThread.id;
    }
    
    // Create new thread
    const newThread: MessageThread = {
      id: crypto.randomUUID(),
      participant_1_id: minId,
      participant_2_id: maxId,
      booking_id: bookingId,
      listing_id: listingId,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      is_locked: false,
      locked_at: null,
      locked_reason: null,
    };
    
    snapshot.messageThreads.push(newThread);
    demoStorage.saveSnapshot(userId, snapshot);
    
    return newThread.id;
  },

  getThreads: (userId: string, searchQuery?: string | null, sortBy?: string): any[] => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Filter threads where user is participant
    let threads = snapshot.messageThreads.filter(
      t => t.participant_1_id === userId || t.participant_2_id === userId
    );
    
    // Enrich threads with display data
    const enrichedThreads = threads.map(thread => {
      const otherUserId = thread.participant_1_id === userId ? thread.participant_2_id : thread.participant_1_id;
      
      // Get other user info from stored profiles
      let otherUserName = 'Unknown User';
      if (snapshot.profiles[otherUserId]) {
        const profile = snapshot.profiles[otherUserId];
        otherUserName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Unknown User';
      }
      
      // Get listing info from booking if available
      let listingTitle = 'No listing';
      let listingAddress = '';
      
      if (thread.booking_id) {
        // Check guest bookings first
        let booking = snapshot.bookings.find(b => b.id === thread.booking_id);
        if (booking?.listings) {
          listingTitle = booking.listings.title;
          listingAddress = `${booking.listings.city}, ${booking.listings.country}`;
        } else {
          // Try host bookings array
          booking = snapshot.hostBookings?.find((b: any) => b.id === thread.booking_id);
          if (booking?.listing_title) {
            listingTitle = booking.listing_title;
            // Try to get listing details from listings array if available
            const listing = snapshot.listings.find((l: any) => l.id === booking.listing_id);
            if (listing) {
              listingAddress = `${listing.city}, ${listing.country}`;
            }
          }
        }
      } else if (thread.listing_id) {
        // If no booking but has listing_id, get listing directly
        const listing = snapshot.listings.find((l: any) => l.id === thread.listing_id);
        if (listing) {
          listingTitle = listing.title;
          listingAddress = `${listing.city}, ${listing.country}`;
        }
      }
      
      // Get last message
      const threadMessages = snapshot.messages
        .filter(m => m.thread_id === thread.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const lastMessage = threadMessages[0]?.body || '';
      
      // Count unread messages
      const unreadCount = snapshot.messages.filter(
        m => m.thread_id === thread.id && m.to_user_id === userId && !m.read
      ).length;
      
      return {
        thread_id: thread.id,
        other_user_id: otherUserId,
        other_user_name: otherUserName,
        listing_title: listingTitle,
        listing_address: listingAddress,
        last_message: lastMessage,
        last_message_time: thread.last_message_at,
        unread_count: unreadCount,
        booking_id: thread.booking_id,
        is_locked: thread.is_locked || false,
        locked_at: thread.locked_at,
        locked_reason: thread.locked_reason,
      };
    });
    
    // Apply search filter
    let filteredThreads = enrichedThreads;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredThreads = enrichedThreads.filter(
        t => t.other_user_name.toLowerCase().includes(query) ||
             t.listing_title.toLowerCase().includes(query) ||
             t.last_message.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortBy === 'oldest') {
      filteredThreads.sort((a, b) => 
        new Date(a.last_message_time).getTime() - new Date(b.last_message_time).getTime()
      );
    } else {
      // Default: most recent first
      filteredThreads.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );
    }
    
    return filteredThreads;
  },

  getMessages: (userId: string, threadId: string): Message[] => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Get messages for thread
    const threadMessages = snapshot.messages
      .filter(m => m.thread_id === threadId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Mark messages as read
    demoStorage.markMessagesAsRead(userId, threadId);
    
    return threadMessages;
  },

  sendMessage: (userId: string, threadId: string, toUserId: string, body: string, attachmentUrl?: string, attachmentType?: string): Message => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    const newMessage: Message = {
      id: crypto.randomUUID(),
      thread_id: threadId,
      from_user_id: userId,
      to_user_id: toUserId,
      body,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
      read: false,
      created_at: new Date().toISOString(),
    };
    
    snapshot.messages.push(newMessage);
    
    // Update thread's last_message_at
    const threadIndex = snapshot.messageThreads.findIndex(t => t.id === threadId);
    if (threadIndex !== -1) {
      snapshot.messageThreads[threadIndex].last_message_at = newMessage.created_at;
    }
    
    demoStorage.saveSnapshot(userId, snapshot);
    
    return newMessage;
  },

  markMessagesAsRead: (userId: string, threadId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Mark messages as read where user is recipient
    snapshot.messages = snapshot.messages.map(m => 
      m.thread_id === threadId && m.to_user_id === userId && !m.read
        ? { ...m, read: true }
        : m
    );
    
    demoStorage.saveSnapshot(userId, snapshot);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('demo-messages-updated'));
  },

  // HOST LISTING OPERATIONS
  addListing: (userId: string, listing: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    snapshot.listings.push(listing);
    demoStorage.saveSnapshot(userId, snapshot);
  },

  updateListing: (userId: string, listingId: string, updates: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const index = snapshot.listings.findIndex((l: any) => l.id === listingId);
    if (index !== -1) {
      snapshot.listings[index] = { ...snapshot.listings[index], ...updates };
      demoStorage.saveSnapshot(userId, snapshot);
    }
  },

  getListing: (userId: string, listingId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    return snapshot.listings.find((l: any) => l.id === listingId) || null;
  },

  getListings: (userId: string, filters?: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let listings = snapshot.listings;
    
    if (filters?.status) {
      listings = listings.filter((l: any) => l.status === filters.status);
    }
    
    return listings;
  },

  getListingsFiltered: (
    userId: string, 
    filters: {
      searchQuery?: string | null;
      statusFilter?: string | null;
      minPrice?: number | null;
      maxPrice?: number | null;
      sortBy?: string;
      sortOrder?: string;
    }
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let listings = [...snapshot.listings];
    
    // 1. Apply search query (title, description, city, address)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      listings = listings.filter(listing => 
        listing.title?.toLowerCase().includes(query) ||
        listing.description?.toLowerCase().includes(query) ||
        listing.city?.toLowerCase().includes(query) ||
        listing.address?.toLowerCase().includes(query)
      );
    }
    
    // 2. Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      listings = listings.filter(l => l.status === filters.statusFilter);
    }
    
    // 3. Apply price range filter
    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      listings = listings.filter(l => l.base_price >= filters.minPrice!);
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      listings = listings.filter(l => l.base_price <= filters.maxPrice!);
    }
    
    // 4. Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    listings.sort((a, b) => {
      let aValue = a[sortBy as keyof typeof a];
      let bValue = b[sortBy as keyof typeof b];
      
      // Handle date strings
      if (sortBy.includes('_at')) {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string values
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (sortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    
    return listings;
  },

  deleteListing: (userId: string, listingId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    snapshot.listings = snapshot.listings.filter((l: any) => l.id !== listingId);
    demoStorage.saveSnapshot(userId, snapshot);
  },

  // LISTING AVAILABILITY OPERATIONS
  addAvailabilityRules: (userId: string, listingId: string, rules: any[]) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const rulesWithListingId = rules.map(rule => ({
      ...rule,
      listing_id: listingId,
      id: `avail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    snapshot.listingAvailability.push(...rulesWithListingId);
    demoStorage.saveSnapshot(userId, snapshot);
  },

  updateAvailabilityRules: (userId: string, listingId: string, rules: any[]) => {
    const snapshot = demoStorage.getSnapshot(userId);
    snapshot.listingAvailability = snapshot.listingAvailability.filter(
      (r: any) => r.listing_id !== listingId
    );
    const rulesWithListingId = rules.map(rule => ({
      ...rule,
      listing_id: listingId,
      id: rule.id || `avail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: rule.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    snapshot.listingAvailability.push(...rulesWithListingId);
    demoStorage.saveSnapshot(userId, snapshot);
  },

  getAvailabilityRules: (userId: string, listingId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    return snapshot.listingAvailability.filter((r: any) => r.listing_id === listingId);
  },

  // HOST BOOKING OPERATIONS
  getHostBookings: (userId: string, filters?: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    return snapshot.hostBookings;
  },

  getHostBookingsFiltered: (
    userId: string,
    filters: {
      searchQuery?: string | null;
      statusFilter?: string | null;
      minPrice?: number | null;
      maxPrice?: number | null;
      checkinStart?: string | null;
      checkinEnd?: string | null;
      checkoutStart?: string | null;
      checkoutEnd?: string | null;
      sortBy?: string;
      sortOrder?: string;
    }
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let bookings = [...snapshot.hostBookings];
    
    // 1. Apply search query (booking ID, listing title, guest name, guest email)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase().trim();
      bookings = bookings.filter((booking: any) => {
        const id = (booking.id || '').toLowerCase();
        const listingTitle = (booking.listing_title || '').toLowerCase();
        const guestName = (booking.guest_name || '').toLowerCase();
        const guestEmail = (booking.guest_email || '').toLowerCase();
        
        return id.includes(query) ||
               listingTitle.includes(query) ||
               guestName.includes(query) ||
               guestEmail.includes(query);
      });
    }
    
    // 2. Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      bookings = bookings.filter((b: any) => b.status === filters.statusFilter);
    }
    
    // 3. Apply price range filter (on host_payout_gross)
    if (filters.minPrice !== null && filters.minPrice !== undefined) {
      bookings = bookings.filter((b: any) => b.host_payout_gross >= filters.minPrice!);
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined) {
      bookings = bookings.filter((b: any) => b.host_payout_gross <= filters.maxPrice!);
    }
    
    // 4. Apply check-in date range filter
    if (filters.checkinStart) {
      bookings = bookings.filter((b: any) => {
        const checkinDate = new Date(b.checkin_date);
        const startDate = new Date(filters.checkinStart!);
        return checkinDate >= startDate;
      });
    }
    if (filters.checkinEnd) {
      bookings = bookings.filter((b: any) => {
        const checkinDate = new Date(b.checkin_date);
        const endDate = new Date(filters.checkinEnd!);
        return checkinDate <= endDate;
      });
    }
    
    // 5. Apply check-out date range filter
    if (filters.checkoutStart) {
      bookings = bookings.filter((b: any) => {
        const checkoutDate = new Date(b.checkout_date);
        const startDate = new Date(filters.checkoutStart!);
        return checkoutDate >= startDate;
      });
    }
    if (filters.checkoutEnd) {
      bookings = bookings.filter((b: any) => {
        const checkoutDate = new Date(b.checkout_date);
        const endDate = new Date(filters.checkoutEnd!);
        return checkoutDate <= endDate;
      });
    }
    
    // 6. Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    bookings.sort((a: any, b: any) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date strings
      if (sortBy.includes('_date') || sortBy.includes('_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string values
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (sortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    
    return bookings;
  },

  // PAYOUT OPERATIONS
  getPayouts: (userId: string, filters?: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let payouts = snapshot.payouts;
    
    if (filters?.status) {
      payouts = payouts.filter((p: any) => p.status === filters.status);
    }
    
    return payouts;
  },

  // MODERATION FEEDBACK OPERATIONS
  addModerationFeedback: (userId: string, listingId: string, feedback: any) => {
    const snapshot = demoStorage.getSnapshot(userId);
    snapshot.moderationFeedback.push({
      ...feedback,
      listing_id: listingId,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    });
    demoStorage.saveSnapshot(userId, snapshot);
  },

  getModerationFeedback: (userId: string, listingId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    return snapshot.moderationFeedback.filter((f: any) => f.listing_id === listingId && !f.is_resolved);
  },

  resolveFeedback: (userId: string, feedbackId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const feedback = snapshot.moderationFeedback.find((f: any) => f.id === feedbackId);
    if (feedback) {
      feedback.is_resolved = true;
      demoStorage.saveSnapshot(userId, snapshot);
    }
  },

  // Clear corrupted demo data
  clearDemoData: (userId: string) => {
    const key = `${DEMO_STORAGE_KEY}_${userId}`;
    localStorage.removeItem(key);
    console.log('🗑️ Cleared demo data for:', userId);
  },

  // Migrate all data from database to localStorage (one-time operation)
  migrateAllDataFromDatabase: async (userId: string, supabaseClient: any) => {
    if (!userId) {
      return { migrated: false, error: 'User ID is required' };
    }
    
    // Check user role to determine what to migrate
    const { data: userProfile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();
    
    const isHostDemo = userProfile?.email === 'host@demo.com';
    const isGuestDemo = userProfile?.email === 'guest@demo.com';
    const isAdminDemo = userProfile?.email === 'admin@demo.com';
    
    // Check if already migrated
    const existing = demoStorage.getSnapshot(userId);
    if (isHostDemo && (existing.listings.length > 0 || existing.hostBookings.length > 0)) {
      console.log('✅ Host demo data already exists, skipping migration');
      return { migrated: false, reason: 'Data already migrated' };
    }
    if (isGuestDemo && (existing.bookings.length > 0 || existing.messageThreads.length > 0)) {
      console.log('✅ Guest demo data already exists, skipping migration');
      return { migrated: false, reason: 'Data already migrated' };
    }
    if (isAdminDemo && existing.adminListings.length > 0) {
      console.log('✅ Admin demo data already exists, skipping migration');
      return { migrated: false, reason: 'Data already migrated' };
    }
    
    try {
      if (isAdminDemo) {
        // MIGRATE ADMIN DATA - Fetch real listings for admin review
        // Fetch ~20 most recent listings with mixed statuses
        const { data: dbListings, error: listingsError } = await supabaseClient
          .from('listings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (listingsError) throw listingsError;
        
        // Get unique host IDs
        const hostIds = [...new Set((dbListings || []).map((l: any) => l.host_user_id))];
        
        // Fetch host profiles
        const { data: dbProfiles, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', hostIds);
        
        if (profilesError) throw profilesError;
        
        // Map profiles to admin profiles
        const adminProfilesMap: Record<string, any> = {};
        (dbProfiles || []).forEach((p: any) => {
          adminProfilesMap[p.id] = p;
        });
        
        // Enrich listings with host info
        const enrichedListings = (dbListings || []).map((listing: any) => {
          const host = adminProfilesMap[listing.host_user_id];
          return {
            ...listing,
            host_first_name: host?.first_name,
            host_last_name: host?.last_name,
          };
        });
        
        // Fetch existing moderation feedback for these listings
        const listingIds = (dbListings || []).map((l: any) => l.id);
        let dbFeedback = [];
        
        if (listingIds.length > 0) {
          const { data: feedback, error: feedbackError } = await supabaseClient
            .from('listing_moderation_feedback')
            .select('*')
            .in('listing_id', listingIds);
          
          if (!feedbackError) {
            dbFeedback = feedback || [];
          }
        }
        
        // Save admin snapshot
        demoStorage.saveSnapshot(userId, {
          adminListings: enrichedListings,
          adminProfiles: adminProfilesMap,
          adminModerationActions: [],
          moderationFeedback: dbFeedback,
          adminSupportThreads: [],
          adminSupportMessages: [],
          adminFAQs: [],
          bookings: [],
          transactions: [],
          profile: userProfile,
          reviews: [],
          guestDebts: [],
          disputes: [],
          messageThreads: [],
          messages: [],
          profiles: {},
          listings: [],
          hostBookings: [],
          payouts: [],
          listingAvailability: [],
          hostTransactions: [],
        });
        
        console.log('✅ Admin demo data migrated:', {
          listings: enrichedListings.length,
          profiles: Object.keys(adminProfilesMap).length,
          feedback: dbFeedback.length,
        });
        
        // Load real support data from database
        console.log('📥 Loading real admin support data from database...');
        await demoStorage.loadAdminSupportDataFromDB(userId, supabaseClient);
        
        return {
          migrated: true,
          counts: {
            listings: enrichedListings.length,
            profiles: Object.keys(adminProfilesMap).length,
            feedback: dbFeedback.length,
          }
        };
      }
      
      if (isHostDemo) {
        // MIGRATE HOST DATA
        const { data: dbListings, error: listingsError } = await supabaseClient
          .from('listings')
          .select('*')
          .eq('host_user_id', userId)
          .order('created_at', { ascending: false });
        
        if (listingsError) throw listingsError;
        
        const listingIds = (dbListings || []).map((l: any) => l.id);
        let dbAvailability = [];
        
        if (listingIds.length > 0) {
          const { data: avail, error: availError } = await supabaseClient
            .from('listing_availability')
            .select('*')
            .in('listing_id', listingIds)
            .order('start_date', { ascending: true });
          
          if (availError) throw availError;
          dbAvailability = avail || [];
        }
        
        let dbHostBookings = [];
        if (listingIds.length > 0) {
          const { data: bookings, error: bookingsError } = await supabaseClient
            .from('bookings')
            .select(`
              *,
              listings (
                id, title, city, country, cover_image, host_user_id
              )
            `)
            .in('listing_id', listingIds)
            .order('created_at', { ascending: false });
          
          if (bookingsError) throw bookingsError;
          dbHostBookings = bookings || [];
        }
        
        const { data: dbPayouts, error: payoutsError } = await supabaseClient
          .from('payouts')
          .select('*')
          .eq('host_user_id', userId)
          .order('created_at', { ascending: false });
        
        if (payoutsError) throw payoutsError;
        
        let dbFeedback = [];
        if (listingIds.length > 0) {
          const { data: feedback, error: feedbackError } = await supabaseClient
            .from('listing_moderation_feedback')
            .select('*')
            .in('listing_id', listingIds);
          
          if (feedbackError) throw feedbackError;
          dbFeedback = feedback || [];
        }
        
        const { data: dbThreads, error: threadsError } = await supabaseClient
          .from('message_threads')
          .select('*')
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
          .order('last_message_at', { ascending: false });
        
        if (threadsError) throw threadsError;
        
        const threadIds = (dbThreads || []).map((t: any) => t.id);
        let dbMessages = [];
        
        if (threadIds.length > 0) {
          const { data: msgs, error: msgsError } = await supabaseClient
            .from('messages')
            .select('*')
            .in('thread_id', threadIds)
            .order('created_at', { ascending: true });
          
          if (msgsError) throw msgsError;
          dbMessages = msgs || [];
        }
        
        const guestIds = new Set<string>();
        (dbThreads || []).forEach((thread: any) => {
          if (thread.participant_1_id !== userId) guestIds.add(thread.participant_1_id);
          if (thread.participant_2_id !== userId) guestIds.add(thread.participant_2_id);
        });
        dbHostBookings.forEach((booking: any) => {
          if (booking.guest_user_id) guestIds.add(booking.guest_user_id);
        });
        
        const profiles: Record<string, any> = {};
        
        if (guestIds.size > 0) {
          const { data: guestProfiles, error: profilesError } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, email, avatar_url')
            .in('id', Array.from(guestIds));
          
          if (!profilesError && guestProfiles) {
            guestProfiles.forEach((profile: any) => {
              profiles[profile.id] = profile;
            });
          }
        }
        
        const { data: hostProfile } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        // Transform hostBookings to match the expected format (flat structure with listing_title, guest_name, etc.)
        const transformedHostBookings = dbHostBookings.map((booking: any) => {
          const listing = booking.listings;
          const guestProfile = profiles[booking.guest_user_id];
          
          return {
            id: booking.id,
            listing_id: booking.listing_id,
            listing_title: listing?.title || 'Unknown Listing',
            guest_user_id: booking.guest_user_id,
            guest_name: guestProfile ? `${guestProfile.first_name || ''} ${guestProfile.last_name || ''}`.trim() || null : null,
            guest_email: guestProfile?.email || '',
            guest_avatar: guestProfile?.avatar_url || null,
            checkin_date: booking.checkin_date,
            checkout_date: booking.checkout_date,
            nights: booking.nights,
            guests: booking.guests,
            host_payout_gross: booking.host_payout_gross || booking.host_payout_net || 0,
            status: booking.status,
            created_at: booking.created_at,
          };
        });
        
        demoStorage.saveSnapshot(userId, {
          listings: dbListings || [],
          listingAvailability: dbAvailability,
          hostBookings: transformedHostBookings,
          payouts: dbPayouts || [],
          moderationFeedback: dbFeedback,
          messageThreads: dbThreads || [],
          messages: dbMessages,
          profiles,
          profile: hostProfile,
          bookings: [],
          transactions: [],
          reviews: [],
          guestDebts: [],
          disputes: [],
          hostTransactions: [],
          adminListings: [],
          adminProfiles: {},
          adminModerationActions: [],
          adminSupportThreads: [],
          adminSupportMessages: [],
          adminFAQs: [],
        });
        
        console.log('✅ Host demo data migrated:', {
          listings: dbListings?.length || 0,
          availability: dbAvailability.length,
          bookings: dbHostBookings.length,
          payouts: dbPayouts?.length || 0,
          feedback: dbFeedback.length,
          threads: dbThreads?.length || 0,
          messages: dbMessages.length,
        });
        
        return {
          migrated: true,
          counts: {
            listings: dbListings?.length || 0,
            availability: dbAvailability.length,
            bookings: dbHostBookings.length,
            payouts: dbPayouts?.length || 0,
            feedback: dbFeedback.length,
            threads: dbThreads?.length || 0,
            messages: dbMessages.length,
          }
        };
      }
      
      // MIGRATE GUEST DATA
      // 1. Migrate Bookings with listing details
      const { data: dbBookings, error: bookingsError } = await supabaseClient
        .from('bookings')
        .select(`
          *,
          listings (
            id, title, city, country, cover_image, host_user_id
          )
        `)
        .eq('guest_user_id', userId)
        .order('created_at', { ascending: false });
      
      if (bookingsError) throw bookingsError;
      
      // 2. Migrate Transactions with booking/listing details
      const { data: dbTransactions, error: transError } = await supabaseClient
        .from('transactions')
        .select(`
          *,
          bookings (
            id, checkin_date, checkout_date, nights, guests, total_price, guest_user_id,
            listings (title, city, country, cover_image)
          ),
          disputes!transactions_dispute_id_fkey (id, category, status)
        `)
        .in('booking_id', (dbBookings || []).map((b: any) => b.id))
        .order('created_at', { ascending: false });
      
      if (transError) throw transError;
      
      // 3. Migrate Guest Debts with booking/listing details
      const { data: dbDebts, error: debtsError } = await supabaseClient
        .from('guest_debts')
        .select(`
          *,
          bookings (
            id, checkin_date, checkout_date,
            listings (title, city, country)
          ),
          disputes!guest_debts_dispute_id_fkey (id, category, status)
        `)
        .eq('guest_user_id', userId);
      
      if (debtsError) throw debtsError;
      
      // 4. Migrate Disputes
      const { data: dbDisputes, error: disputesError } = await supabaseClient
        .from('disputes')
        .select('*')
        .eq('initiated_by_user_id', userId);
      
      if (disputesError && disputesError.code !== 'PGRST116') throw disputesError;
      
      // 5. Migrate Message Threads
      const { data: dbThreads, error: threadsError } = await supabaseClient
        .from('message_threads')
        .select('*')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });
      
      if (threadsError) throw threadsError;
      
      // 6. Migrate Messages
      const threadIds = (dbThreads || []).map((t: any) => t.id);
      let dbMessages = [];
      
      if (threadIds.length > 0) {
        const { data: msgs, error: msgsError } = await supabaseClient
          .from('messages')
          .select('*')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: true });
        
        if (msgsError) throw msgsError;
        dbMessages = msgs || [];
      }
      
  // 7. Migrate host profiles for all threads
      const hostIds = new Set<string>();
      (dbThreads || []).forEach((thread: any) => {
        // Add both participants to fetch their profiles
        if (thread.participant_1_id !== userId) hostIds.add(thread.participant_1_id);
        if (thread.participant_2_id !== userId) hostIds.add(thread.participant_2_id);
      });
      
      const profiles: Record<string, any> = {};
      
      // First, try to get profiles from profiles table
      if (hostIds.size > 0) {
        const { data: hostProfiles, error: profilesError } = await supabaseClient
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', Array.from(hostIds));
        
        if (!profilesError && hostProfiles) {
          hostProfiles.forEach((profile: any) => {
            profiles[profile.id] = profile;
          });
        }
      }
      
      // Second, for hosts without profiles, create fallback from listing data
      const missingHostIds = Array.from(hostIds).filter(id => !profiles[id]);
      if (missingHostIds.length > 0 && dbBookings) {
        dbBookings.forEach((booking: any) => {
          if (booking.listings && missingHostIds.includes(booking.listings.host_user_id)) {
            // Create a minimal profile from available data
            profiles[booking.listings.host_user_id] = {
              id: booking.listings.host_user_id,
              first_name: 'Host',
              last_name: `#${booking.listings.host_user_id.substring(0, 8)}`,
              email: null,
              avatar_url: null
            };
          }
        });
      }
      
      // 7.5. Create Support Team profiles for support threads from disputes
      const SUPPORT_USER_IDS = new Set<string>();
      (dbDisputes || []).forEach((dispute: any) => {
        if (dispute.support_thread_id) {
          // Find the thread
          const supportThread = (dbThreads || []).find((t: any) => t.id === dispute.support_thread_id);
          if (supportThread) {
            // The support user is the participant that is NOT the current user
            const supportUserId = supportThread.participant_1_id === userId 
              ? supportThread.participant_2_id 
              : supportThread.participant_1_id;
            SUPPORT_USER_IDS.add(supportUserId);
          }
        }
      });
      
      // Create Support Team profiles for all support users found
      SUPPORT_USER_IDS.forEach(supportUserId => {
        if (!profiles[supportUserId]) {
          profiles[supportUserId] = {
            id: supportUserId,
            first_name: 'Support',
            last_name: 'Team',
            email: 'support@demo.com',
            avatar_url: null
          };
        }
      });
      
      // 8. Migrate user's own Profile
      const { data: dbProfile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      
      const updatedSnapshot: DemoSnapshot = {
        bookings: dbBookings || [],
        transactions: dbTransactions || [],
        guestDebts: dbDebts || [],
        disputes: dbDisputes || [],
        messageThreads: (dbThreads || []).map((t: any) => ({
          id: t.id,
          participant_1_id: t.participant_1_id,
          participant_2_id: t.participant_2_id,
          booking_id: t.booking_id,
          listing_id: t.listing_id,
          last_message_at: t.last_message_at,
          created_at: t.created_at,
          is_locked: t.is_locked || false,
          locked_at: t.locked_at,
          locked_reason: t.locked_reason
        })),
        messages: dbMessages.map((m: any) => ({
          id: m.id,
          thread_id: m.thread_id,
          from_user_id: m.from_user_id,
          to_user_id: m.to_user_id,
          body: m.body,
          attachment_url: m.attachment_url,
          attachment_type: m.attachment_type,
          read: m.read,
          created_at: m.created_at
        })),
        profile: dbProfile || {},
        profiles: profiles,
        reviews: [],
        listings: [],
        hostBookings: [],
        payouts: [],
        listingAvailability: [],
        hostTransactions: [],
        moderationFeedback: [],
        adminListings: [],
        adminProfiles: {},
        adminModerationActions: [],
        adminSupportThreads: [],
        adminSupportMessages: [],
        adminUsers: [],
        adminReviews: [],
        adminPayouts: [],
        adminFAQs: [],
        platformSettings: {
          default_host_commission_rate: "0.15",
          default_guest_service_fee_rate: "0.10",
          default_tax_rate: "0.08",
        },
        lastUpdated: new Date().toISOString(),
      };
      
      demoStorage.saveSnapshot(userId, updatedSnapshot);
      
      return { 
        migrated: true,
        counts: {
          bookings: (dbBookings || []).length,
          transactions: (dbTransactions || []).length,
          debts: (dbDebts || []).length,
          disputes: (dbDisputes || []).length,
          threads: (dbThreads || []).length,
          messages: dbMessages.length
        }
      };
      
    } catch (error) {
      console.error('Migration error:', error);
      return { migrated: false, error };
    }
  },

  // Admin-specific functions
  getAdminListings: (userId: string, filters?: {
    searchQuery?: string | null;
    statusFilter?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let listings = [...snapshot.adminListings];
    
    // Apply search
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      listings = listings.filter(l => 
        l.title?.toLowerCase().includes(query) ||
        l.city?.toLowerCase().includes(query) ||
        l.country?.toLowerCase().includes(query) ||
        `${l.host_first_name || ''} ${l.host_last_name || ''}`.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filters?.statusFilter) {
      listings = listings.filter(l => l.status === filters.statusFilter);
    }
    
    // Apply price filters
    if (filters?.minPrice !== null && filters?.minPrice !== undefined) {
      listings = listings.filter(l => l.base_price >= filters.minPrice!);
    }
    if (filters?.maxPrice !== null && filters?.maxPrice !== undefined) {
      listings = listings.filter(l => l.base_price <= filters.maxPrice!);
    }
    
    // Apply sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    
    listings.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy.includes('_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    
    return listings;
  },

  getAdminListing: (userId: string, listingId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const listing = snapshot.adminListings.find(l => l.id === listingId);
    if (!listing) return null;
    
    const host = snapshot.adminProfiles[listing.host_user_id];
    return { listing, host };
  },

  updateAdminListingStatus: (
    userId: string, 
    listingId: string, 
    status: string, 
    feedback?: any[]
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const listing = snapshot.adminListings.find(l => l.id === listingId);
    
    if (listing) {
      listing.status = status;
      listing.reviewed_at = new Date().toISOString();
      listing.updated_at = new Date().toISOString();
      
      // Track moderation action
      snapshot.adminModerationActions.push({
        id: crypto.randomUUID(),
        listing_id: listingId,
        action: status,
        feedback: feedback || [],
        admin_user_id: userId,
        created_at: new Date().toISOString(),
      });
      
      // If feedback provided, store it
      if (feedback && feedback.length > 0) {
        feedback.forEach((f: any) => {
          snapshot.moderationFeedback.push({
            ...f,
            id: crypto.randomUUID(),
            listing_id: listingId,
            admin_user_id: userId,
            created_at: new Date().toISOString(),
            is_resolved: false,
          });
        });
      }
      
      demoStorage.saveSnapshot(userId, snapshot);
    }
  },

  getAdminSupportThreads: (userId: string, searchQuery?: string | null, sortBy?: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let threads = [...snapshot.adminSupportThreads];
    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase();
      threads = threads.filter(t => 
        t.user_name?.toLowerCase().includes(query) || 
        t.user_email?.toLowerCase().includes(query) ||
        t.last_message?.toLowerCase().includes(query)
      );
    }
    threads.sort((a, b) => sortBy === 'oldest' 
      ? new Date(a.last_message_time).getTime() - new Date(b.last_message_time).getTime()
      : new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
    );
    return threads;
  },

  getAdminDisputes: (userId: string, filters?: {
    searchQuery?: string | null;
    statusFilter?: string | null;
    categoryFilter?: string | null;
    minAmount?: number | null;
    maxAmount?: number | null;
    createdStart?: string | null;
    createdEnd?: string | null;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let disputes = [...(snapshot.disputes || [])];
    
    // Add enriched data (guest, host, booking, listing info)
    disputes = disputes.map(d => {
      const listing = snapshot.adminListings.find(l => l.id === d.listing_id);
      const hostUserId = listing?.host_user_id;
      
      return {
        ...d,
        // Get guest info
        guest_name: snapshot.adminProfiles[d.initiated_by_user_id]?.full_name || 'Unknown',
        guest_email: snapshot.adminProfiles[d.initiated_by_user_id]?.email || '',
        guest_avatar: snapshot.adminProfiles[d.initiated_by_user_id]?.avatar_url || null,
        guest_user_id: d.initiated_by_user_id,
        // Get booking info
        booking_display_id: `BK${d.booking_id.slice(0,8).toUpperCase()}`,
        // Get listing info
        listing_title: listing?.title || 'Unknown',
        listing_city: listing?.city || '',
        listing_country: listing?.country || '',
        // Get host info
        host_user_id: hostUserId,
        host_name: hostUserId ? (snapshot.adminProfiles[hostUserId]?.full_name || 'Unknown') : 'Unknown',
        host_email: hostUserId ? (snapshot.adminProfiles[hostUserId]?.email || '') : '',
        host_avatar: hostUserId ? (snapshot.adminProfiles[hostUserId]?.avatar_url || null) : null,
        // Format dispute display ID
        dispute_display_id: `DS${d.id.slice(0,8).toUpperCase()}`,
      };
    });
    
    // Apply search filter
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      disputes = disputes.filter(d =>
        d.dispute_display_id?.toLowerCase().includes(query) ||
        d.booking_display_id?.toLowerCase().includes(query) ||
        d.guest_name?.toLowerCase().includes(query) ||
        d.host_name?.toLowerCase().includes(query) ||
        d.subject?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filters?.statusFilter) {
      disputes = disputes.filter(d => d.status === filters.statusFilter);
    }
    
    // Apply category filter
    if (filters?.categoryFilter) {
      disputes = disputes.filter(d => d.category === filters.categoryFilter);
    }
    
    // Apply amount filters
    if (filters?.minAmount !== null && filters?.minAmount !== undefined) {
      disputes = disputes.filter(d => (d.requested_refund_amount || 0) >= filters.minAmount!);
    }
    if (filters?.maxAmount !== null && filters?.maxAmount !== undefined) {
      disputes = disputes.filter(d => (d.requested_refund_amount || 0) <= filters.maxAmount!);
    }
    
    // Apply date filters
    if (filters?.createdStart) {
      disputes = disputes.filter(d => d.created_at >= filters.createdStart!);
    }
    if (filters?.createdEnd) {
      disputes = disputes.filter(d => d.created_at <= filters.createdEnd!);
    }
    
    // Apply sorting
    const sortBy = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';
    
    disputes.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy.includes('_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    
    return disputes;
  },

  getAdminDisputeDetails: (userId: string, disputeId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const dispute = snapshot.disputes.find(d => d.id === disputeId);
    if (!dispute) return null;
    
    // Find related booking (look in bookings array, which admins can see all bookings)
    const booking = snapshot.bookings?.find(b => b.id === dispute.booking_id) || 
                    snapshot.hostBookings?.find(b => b.id === dispute.booking_id);
    
    // Find listing
    const listing = snapshot.adminListings.find(l => l.id === dispute.listing_id);
    
    // Enrich dispute with full data
    return {
      dispute: {
        ...dispute,
        dispute_display_id: `DS${dispute.id.slice(0,8).toUpperCase()}`,
        guest_name: snapshot.adminProfiles[dispute.initiated_by_user_id]?.full_name || 'Unknown',
        guest_email: snapshot.adminProfiles[dispute.initiated_by_user_id]?.email || '',
        host_name: listing?.host_user_id ? (snapshot.adminProfiles[listing.host_user_id]?.full_name || 'Unknown') : 'Unknown',
        host_email: listing?.host_user_id ? (snapshot.adminProfiles[listing.host_user_id]?.email || '') : '',
      },
      booking: booking ? {
        ...booking,
        booking_display_id: `BK${booking.id.slice(0,8).toUpperCase()}`,
      } : null,
      guest: dispute.initiated_by_user_id ? snapshot.adminProfiles[dispute.initiated_by_user_id] : null,
      host: listing?.host_user_id ? snapshot.adminProfiles[listing.host_user_id] : null,
      listing: listing || null,
    };
  },

  updateAdminDisputeStatus: (userId: string, disputeId: string, newStatus: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const dispute = snapshot.disputes.find(d => d.id === disputeId);
    
    if (dispute) {
      dispute.status = newStatus;
      dispute.updated_at = new Date().toISOString();
      demoStorage.saveSnapshot(userId, snapshot);
      return true;
    }
    return false;
  },

  adminResolveDispute: (
    userId: string,
    disputeId: string,
    decision: string | null,
    approvedRefundAmount: number | null,
    resolutionNotes: string | null,
    isSubmit: boolean
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const dispute = snapshot.disputes.find(d => d.id === disputeId);
    
    if (!dispute) {
      return { success: false, error: 'Dispute not found' };
    }
    
    // Update dispute fields
    dispute.admin_decision = decision;
    dispute.approved_refund_amount = approvedRefundAmount;
    dispute.resolution_notes = resolutionNotes;
    dispute.updated_at = new Date().toISOString();
    
    if (isSubmit) {
      // Determine final status based on decision
      if (decision === 'approved') {
        dispute.status = 'resolved_approved';
      } else if (decision === 'declined') {
        dispute.status = 'resolved_declined';
      } else if (decision === 'on_hold') {
        dispute.status = 'on_hold';
      }
      dispute.resolved_at = new Date().toISOString();
      dispute.resolved_by_admin_id = userId;
      
      // If approved, create refund transaction and guest debt (if partial)
      if (decision === 'approved' && approvedRefundAmount && approvedRefundAmount > 0) {
        const booking = snapshot.bookings?.find(b => b.id === dispute.booking_id) || 
                        snapshot.hostBookings?.find(b => b.id === dispute.booking_id);
        
        // Create refund transaction
        const refundTxn = {
          id: crypto.randomUUID(),
          booking_id: dispute.booking_id,
          type: 'refund',
          amount: approvedRefundAmount,
          status: 'completed',
          provider: 'demo',
          currency: 'USD',
          created_at: new Date().toISOString(),
          dispute_id: disputeId,
        };
        if (!snapshot.transactions) snapshot.transactions = [];
        snapshot.transactions.push(refundTxn);
        dispute.refund_transaction_id = refundTxn.id;
        
        // If partial refund (less than requested), create guest debt for difference
        const requestedAmount = dispute.requested_refund_amount || 0;
        if (approvedRefundAmount < requestedAmount) {
          const debtAmount = requestedAmount - approvedRefundAmount;
          const guestDebt = {
            id: crypto.randomUUID(),
            guest_user_id: dispute.initiated_by_user_id,
            dispute_id: disputeId,
            booking_id: dispute.booking_id,
            amount: debtAmount,
            status: 'outstanding',
            reason: 'Approved refund less than requested amount',
            currency: 'USD',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            paid_at: null,
            waived_at: null,
            waived_by_admin_id: null,
            payment_transaction_id: null,
            notes: null,
          };
          if (!snapshot.guestDebts) snapshot.guestDebts = [];
          snapshot.guestDebts.push(guestDebt);
        }
      }
    }
    
    demoStorage.saveSnapshot(userId, snapshot);
    return { success: true };
  },

  getAdminSupportMessages: (userId: string, threadId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const msgs = snapshot.adminSupportMessages.filter(m => m.thread_id === threadId);
    return msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  sendAdminSupportMessage: (userId: string, threadId: string, toUserId: string, body: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const msg = { 
      id: crypto.randomUUID(), 
      thread_id: threadId, 
      from_user_id: '00000000-0000-0000-0000-000000000001', 
      to_user_id: toUserId, 
      body, 
      attachment_url: null, 
      attachment_type: null, 
      read: false, 
      created_at: new Date().toISOString() 
    };
    snapshot.adminSupportMessages.push(msg);
    const thread = snapshot.adminSupportThreads.find(t => t.thread_id === threadId);
    if (thread) { 
      thread.last_message = body; 
      thread.last_message_time = msg.created_at; 
    }
    demoStorage.saveSnapshot(userId, snapshot);
    return msg;
  },

  loadAdminSupportDataFromDB: async (userId: string, supabaseClient: any) => {
    const SUPPORT_USER_ID = '00000000-0000-0000-0000-000000000001';
    
    // Fetch all support threads (thread_type = 'user_to_support')
    const { data: dbThreads, error: threadsError } = await supabaseClient
      .from('message_threads')
      .select('*')
      .eq('thread_type', 'user_to_support')
      .order('last_message_at', { ascending: false })
      .limit(20);
    
    if (threadsError) {
      console.error('Error loading support threads:', threadsError);
      return;
    }
    
    if (!dbThreads || dbThreads.length === 0) {
      console.log('No support threads found in database');
      return;
    }
    
    const threadIds = dbThreads.map((t: any) => t.id);
    
    // Fetch messages for these threads
    const { data: dbMessages } = await supabaseClient
      .from('messages')
      .select('*')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: true });
    
    // Fetch user profiles for all thread participants
    const userIds = new Set<string>();
    dbThreads.forEach((thread: any) => {
      if (thread.participant_1_id !== SUPPORT_USER_ID) {
        userIds.add(thread.participant_1_id);
      }
      if (thread.participant_2_id !== SUPPORT_USER_ID) {
        userIds.add(thread.participant_2_id);
      }
    });
    
    const { data: dbProfiles } = await supabaseClient
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .in('id', Array.from(userIds));
    
    // Get current snapshot
    const snapshot = demoStorage.getSnapshot(userId);
    
    // Transform to adminSupportThreads format
    snapshot.adminSupportThreads = dbThreads.map((thread: any) => {
      const userId = thread.participant_1_id === SUPPORT_USER_ID 
        ? thread.participant_2_id 
        : thread.participant_1_id;
      
      const userProfile = (dbProfiles || []).find((p: any) => p.id === userId);
      const threadMessages = (dbMessages || []).filter((m: any) => m.thread_id === thread.id);
      const lastMessage = threadMessages.length > 0 
        ? threadMessages[threadMessages.length - 1]
        : null;
      
      const unreadCount = threadMessages.filter(
        (m: any) => m.to_user_id === SUPPORT_USER_ID && !m.read
      ).length;
      
      return {
        thread_id: thread.id,
        user_id: userId,
        user_name: userProfile 
          ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() 
          : userId.substring(0, 8),
        user_email: userProfile?.email || '',
        user_avatar: userProfile?.avatar_url || null,
        last_message: lastMessage?.body || '',
        last_message_time: thread.last_message_at,
        unread_count: unreadCount,
        is_locked: thread.is_locked || false,
        locked_at: thread.locked_at,
        locked_reason: thread.locked_reason
      };
    });
    
    // Store messages
    snapshot.adminSupportMessages = dbMessages || [];
    
    // Store user profiles
    (dbProfiles || []).forEach((profile: any) => {
      snapshot.adminProfiles[profile.id] = profile;
    });
    
    // Ensure support user profile exists
    if (!snapshot.adminProfiles[SUPPORT_USER_ID]) {
      snapshot.adminProfiles[SUPPORT_USER_ID] = {
        id: SUPPORT_USER_ID,
        first_name: 'Support',
        last_name: 'Team',
        email: 'support@demo.com',
        avatar_url: null
      };
    }
    
    // Fetch all disputes from database
    const { data: dbDisputes, error: disputesError } = await supabaseClient
      .from('disputes')
      .select(`
        *,
        bookings!inner(
          id,
          checkin_date,
          checkout_date,
          total_price,
          status,
          guest_user_id,
          listing_id
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (disputesError) {
      console.error('Error loading disputes:', disputesError);
    } else if (dbDisputes && dbDisputes.length > 0) {
      // Extract unique booking IDs and listing IDs
      const bookingIds = new Set(dbDisputes.map((d: any) => d.booking_id));
      const listingIds = new Set(dbDisputes.map((d: any) => d.listing_id));
      
      // Fetch booking details
      const { data: dbBookings } = await supabaseClient
        .from('bookings')
        .select('*')
        .in('id', Array.from(bookingIds));
      
      // Fetch listing details
      const { data: dbListings } = await supabaseClient
        .from('listings')
        .select('*')
        .in('id', Array.from(listingIds));
      
      // Extract all user IDs (guests + hosts)
      const disputeUserIds = new Set<string>();
      dbDisputes.forEach((dispute: any) => {
        disputeUserIds.add(dispute.initiated_by_user_id);
      });
      dbBookings?.forEach((booking: any) => {
        disputeUserIds.add(booking.guest_user_id);
      });
      dbListings?.forEach((listing: any) => {
        disputeUserIds.add(listing.host_user_id);
      });
      
      // Fetch user profiles for all dispute-related users
      const { data: disputeProfiles } = await supabaseClient
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', Array.from(disputeUserIds));
      
      // Store profiles in adminProfiles
      (disputeProfiles || []).forEach((profile: any) => {
        snapshot.adminProfiles[profile.id] = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          email: profile.email,
          avatar_url: profile.avatar_url
        };
      });
      
      // Store bookings in snapshot and create map for dispute enrichment
      const bookingsMap: Record<string, any> = {};
      (dbBookings || []).forEach((booking: any) => {
        const enrichedBooking = {
          ...booking,
          booking_display_id: `BK${booking.id.slice(0, 8).toUpperCase()}`
        };
        bookingsMap[booking.id] = enrichedBooking;
        
        // Add to snapshot.bookings if not already there
        const existingIndex = snapshot.bookings.findIndex((b: any) => b.id === booking.id);
        if (existingIndex === -1) {
          snapshot.bookings.push(enrichedBooking);
        }
      });
      
      // Store listings in adminListings if not already there
      (dbListings || []).forEach((listing: any) => {
        const existingIndex = snapshot.adminListings.findIndex((l: any) => l.id === listing.id);
        if (existingIndex === -1) {
          snapshot.adminListings.push(listing);
        }
      });
      
      // Store disputes with enriched data
      snapshot.disputes = dbDisputes.map((dispute: any) => ({
        ...dispute,
        booking_display_id: bookingsMap[dispute.booking_id]?.booking_display_id || 
                            `BK${dispute.booking_id.slice(0, 8).toUpperCase()}`
      }));
      
      console.log('✅ Admin disputes loaded:', {
        disputes: snapshot.disputes.length,
        bookings: Object.keys(bookingsMap).length,
        listings: (dbListings || []).length,
        profiles: disputeUserIds.size
      });
    }
    
    // Fetch all users from get_admin_users function
    const { data: dbUsers, error: usersError } = await supabaseClient
      .rpc('get_admin_users');

    if (usersError) {
      console.error('Error loading users:', usersError);
    } else if (dbUsers && dbUsers.length > 0) {
      snapshot.adminUsers = dbUsers;
      console.log('✅ Admin users loaded:', snapshot.adminUsers.length);
    }

    // Fetch all reviews using admin_search_reviews RPC
    const { data: dbReviews, error: reviewsError } = await supabaseClient
      .rpc('admin_search_reviews', {
        search_query: null,
        status_filter: null,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

    if (reviewsError) {
      console.error('Error loading reviews:', reviewsError);
    } else if (dbReviews && dbReviews.length > 0) {
      snapshot.adminReviews = dbReviews;
      console.log('✅ Admin reviews loaded:', snapshot.adminReviews.length);
    }

    // Fetch all payouts using admin_search_payouts RPC
    const { data: dbPayouts, error: payoutsError } = await supabaseClient
      .rpc('admin_search_payouts', {
        search_query: null,
        transaction_type_filter: null,
        status_filter: null,
        min_amount: null,
        max_amount: null,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

    if (payoutsError) {
      console.error('Error loading payouts:', payoutsError);
    } else if (dbPayouts && dbPayouts.length > 0) {
      snapshot.adminPayouts = dbPayouts;
      console.log('✅ Admin payouts loaded:', snapshot.adminPayouts.length);
    }

    // Fetch platform settings
    console.log('Fetching platform settings...');
    const { data: platformSettingsData, error: platformSettingsError } = await supabaseClient
      .from('platform_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'default_host_commission_rate',
        'default_guest_service_fee_rate',
        'default_tax_rate'
      ])
      .eq('is_active', true);

    if (platformSettingsError) {
      console.error('Error fetching platform settings:', platformSettingsError);
    } else {
      // Convert array to object
      const settingsObj = (platformSettingsData || []).reduce((acc, item) => {
        acc[item.setting_key] = item.setting_value;
        return acc;
      }, {} as Record<string, string>);
      
      snapshot.platformSettings = {
        default_host_commission_rate: settingsObj.default_host_commission_rate || "0.15",
        default_guest_service_fee_rate: settingsObj.default_guest_service_fee_rate || "0.10",
        default_tax_rate: settingsObj.default_tax_rate || "0.08",
      };
      
      console.log(`✅ Loaded platform settings:`, snapshot.platformSettings);
    }

    // Fetch all FAQs using admin_search_faqs RPC
    const { data: dbFAQs, error: faqsError } = await supabaseClient
      .rpc('admin_search_faqs', {
        search_query: null,
        category_filter: null,
        status_filter: null,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

    if (faqsError) {
      console.error('Error loading FAQs:', faqsError);
    } else if (dbFAQs && dbFAQs.length > 0) {
      snapshot.adminFAQs = dbFAQs;
      console.log('✅ Admin FAQs loaded:', snapshot.adminFAQs.length);
    } else {
      snapshot.adminFAQs = [];
    }
    
    demoStorage.saveSnapshot(userId, snapshot);
    
    console.log('✅ Admin support data loaded:', {
      threads: snapshot.adminSupportThreads.length,
      messages: snapshot.adminSupportMessages.length,
      profiles: Object.keys(snapshot.adminProfiles).length,
      disputes: (snapshot.disputes || []).length,
      users: snapshot.adminUsers.length,
      reviews: snapshot.adminReviews.length,
      payouts: snapshot.adminPayouts.length,
      faqs: snapshot.adminFAQs.length,
      platformSettings: 'loaded'
    });
  },

  // Admin Users Management
  getAdminUsers: (
    userId: string,
    filters: {
      searchQuery?: string | null;
      roleFilter?: string | null;
      statusFilter?: string | null;
      sortBy?: string;
      sortOrder?: string;
    }
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let users = [...snapshot.adminUsers];

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      users = users.filter((user: any) => 
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (filters.roleFilter && filters.roleFilter !== 'all') {
      users = users.filter((user: any) => user.primary_role === filters.roleFilter);
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      users = users.filter((user: any) => user.status === filters.statusFilter);
    }

    // Apply sorting
    if (filters.sortBy) {
      const sortBy = filters.sortBy;
      const sortOrder = filters.sortOrder || 'asc';
      
      users.sort((a: any, b: any) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        // Handle null/undefined values
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // String comparison
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return users;
  },

  suspendAdminUser: (userId: string, targetUserId: string): boolean => {
    const snapshot = demoStorage.getSnapshot(userId);
    const userIndex = snapshot.adminUsers.findIndex((u: any) => u.id === targetUserId);
    
    if (userIndex === -1) return false;
    
    snapshot.adminUsers[userIndex] = {
      ...snapshot.adminUsers[userIndex],
      status: 'suspended'
    };
    
    demoStorage.saveSnapshot(userId, snapshot);
    return true;
  },

  unsuspendAdminUser: (userId: string, targetUserId: string): boolean => {
    const snapshot = demoStorage.getSnapshot(userId);
    const userIndex = snapshot.adminUsers.findIndex((u: any) => u.id === targetUserId);
    
    if (userIndex === -1) return false;
    
    snapshot.adminUsers[userIndex] = {
      ...snapshot.adminUsers[userIndex],
      status: 'active'
    };
    
    demoStorage.saveSnapshot(userId, snapshot);
    return true;
  },

  deleteAdminUser: (userId: string, targetUserId: string): boolean => {
    const snapshot = demoStorage.getSnapshot(userId);
    const userIndex = snapshot.adminUsers.findIndex((u: any) => u.id === targetUserId);
    
    if (userIndex === -1) return false;
    
    // Soft delete by anonymizing the user
    snapshot.adminUsers[userIndex] = {
      ...snapshot.adminUsers[userIndex],
      status: 'inactive',
      first_name: 'Deleted',
      last_name: 'User',
      full_name: 'Deleted User',
      email: `deleted_${targetUserId.slice(0, 8)}@example.com`,
      avatar_url: null
    };
    
    demoStorage.saveSnapshot(userId, snapshot);
    return true;
  },

  // Admin Reviews Management
  getAdminReviews: (
    userId: string,
    filters: {
      searchQuery?: string | null;
      statusFilter?: string | null;
      ratingFilter?: number | null;
      sortBy?: string;
      sortOrder?: string;
    }
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let reviews = [...snapshot.adminReviews];

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      reviews = reviews.filter((review: any) => 
        review.guest_name?.toLowerCase().includes(query) ||
        review.listing_title?.toLowerCase().includes(query) ||
        review.text?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      reviews = reviews.filter((review: any) => review.status === filters.statusFilter);
    }

    // Apply rating filter
    if (filters.ratingFilter !== null && filters.ratingFilter !== undefined) {
      reviews = reviews.filter((review: any) => review.rating === filters.ratingFilter);
    }

    // Apply sorting
    if (filters.sortBy) {
      const sortBy = filters.sortBy;
      const sortOrder = filters.sortOrder || 'asc';
      
      reviews.sort((a: any, b: any) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        // Handle null/undefined values
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        // String comparison
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return reviews;
  },

  updateAdminReviewStatus: (userId: string, reviewId: string, newStatus: string): boolean => {
    const snapshot = demoStorage.getSnapshot(userId);
    const reviewIndex = snapshot.adminReviews.findIndex((r: any) => r.id === reviewId);
    
    if (reviewIndex === -1) return false;
    
    snapshot.adminReviews[reviewIndex] = {
      ...snapshot.adminReviews[reviewIndex],
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    
    demoStorage.saveSnapshot(userId, snapshot);
    return true;
  },

  markAdminSupportThreadAsRead: (userId: string, threadId: string) => {
    const snapshot = demoStorage.getSnapshot(userId);
    const SUPPORT_USER_ID = '00000000-0000-0000-0000-000000000001';
    
    // Mark all unread messages in this thread as read (for admin)
    snapshot.adminSupportMessages = snapshot.adminSupportMessages.map(msg => 
      msg.thread_id === threadId && 
      msg.to_user_id === SUPPORT_USER_ID && 
      !msg.read
        ? { ...msg, read: true }
        : msg
    );
    
    // Update thread's unread_count to 0
    const thread = snapshot.adminSupportThreads.find(t => t.thread_id === threadId);
    if (thread) {
      thread.unread_count = 0;
    }
    
    demoStorage.saveSnapshot(userId, snapshot);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('demo-messages-updated'));
  },

  // Get total unread count for admin support threads
  getAdminSupportUnreadCount: (userId: string): number => {
    try {
      const snapshot = demoStorage.getSnapshot(userId);
      const threads = snapshot.adminSupportThreads || [];
      
      // Sum up all unread_count values from threads
      const totalUnread = threads.reduce((sum, thread) => sum + (thread.unread_count || 0), 0);
      
      console.log(`📊 Demo admin unread count: ${totalUnread}`);
      return totalUnread;
    } catch (error) {
      console.error('❌ Error getting admin unread count:', error);
      return 0;
    }
  },

  // Admin Payouts Management
  getAdminPayouts: (
    userId: string,
    filters: {
      searchQuery?: string | null;
      transactionTypeFilter?: string | null;
      statusFilter?: string | null;
      minAmount?: number | null;
      maxAmount?: number | null;
      sortBy?: string;
      sortOrder?: string;
    }
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let payouts = [...snapshot.adminPayouts];

    // Apply search filter (host name, host email, listing title, booking ID)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      payouts = payouts.filter((payout: any) => 
        payout.host_name?.toLowerCase().includes(query) ||
        payout.host_email?.toLowerCase().includes(query) ||
        payout.listing_title?.toLowerCase().includes(query) ||
        payout.booking_id?.toLowerCase().includes(query)
      );
    }

    // Apply transaction type filter
    if (filters.transactionTypeFilter && filters.transactionTypeFilter !== 'all') {
      payouts = payouts.filter((payout: any) => payout.transaction_type === filters.transactionTypeFilter);
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      payouts = payouts.filter((payout: any) => payout.status === filters.statusFilter);
    }

    // Apply amount range filter
    if (filters.minAmount !== null && filters.minAmount !== undefined) {
      payouts = payouts.filter((payout: any) => payout.amount >= filters.minAmount!);
    }
    if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
      payouts = payouts.filter((payout: any) => payout.amount <= filters.maxAmount!);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    payouts.sort((a: any, b: any) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date strings
      if (sortBy.includes('_date') || sortBy.includes('_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string values
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (sortOrder === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    return payouts;
  },

  markPayoutAsPaid: (userId: string, payoutId: string): { success: boolean; error?: string } => {
    const snapshot = demoStorage.getSnapshot(userId);
    const payoutIndex = snapshot.adminPayouts.findIndex((p: any) => p.id === payoutId);
    
    if (payoutIndex === -1) {
      return { success: false, error: 'Payout not found' };
    }
    
    // Update payout status and date
    snapshot.adminPayouts[payoutIndex] = {
      ...snapshot.adminPayouts[payoutIndex],
      status: 'completed',
      payout_date: new Date().toISOString()
    };
    
    demoStorage.saveSnapshot(userId, snapshot);
    return { success: true };
  },

  // Platform settings operations
  getPlatformSettings(userId: string) {
    const snapshot = this.getSnapshot(userId);
    return snapshot.platformSettings || {
      default_host_commission_rate: "0.15",
      default_guest_service_fee_rate: "0.10",
      default_tax_rate: "0.08",
    };
  },

  updatePlatformSettings(
    userId: string, 
    settings: {
      default_host_commission_rate: string;
      default_guest_service_fee_rate: string;
      default_tax_rate: string;
    }
  ): { success: boolean; error?: string } {
    try {
      const snapshot = this.getSnapshot(userId);
      
      // Validate that all values are valid decimals between 0 and 1
      const validateRate = (rate: string) => {
        const num = parseFloat(rate);
        return !isNaN(num) && num >= 0 && num <= 1;
      };

      if (!validateRate(settings.default_host_commission_rate) ||
          !validateRate(settings.default_guest_service_fee_rate) ||
          !validateRate(settings.default_tax_rate)) {
        return { 
          success: false, 
          error: "Invalid rate values. Must be between 0 and 1." 
        };
      }

      snapshot.platformSettings = {
        default_host_commission_rate: settings.default_host_commission_rate,
        default_guest_service_fee_rate: settings.default_guest_service_fee_rate,
        default_tax_rate: settings.default_tax_rate,
      };

      this.saveSnapshot(userId, snapshot);
      console.log('✅ Platform settings updated in demo mode:', settings);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating platform settings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  // FAQ Management Operations
  getAdminFAQs: (
    userId: string,
    filters: {
      searchQuery?: string | null;
      categoryFilter?: string | null;
      statusFilter?: string | null;
      sortBy?: string;
      sortOrder?: string;
    }
  ) => {
    const snapshot = demoStorage.getSnapshot(userId);
    let faqs = [...snapshot.adminFAQs];

    // Apply search filter (question, answer)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      faqs = faqs.filter((faq: any) => 
        faq.question?.toLowerCase().includes(query) ||
        faq.answer?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filters.categoryFilter) {
      faqs = faqs.filter((faq: any) => faq.category === filters.categoryFilter);
    }

    // Apply status filter
    if (filters.statusFilter) {
      faqs = faqs.filter((faq: any) => faq.status === filters.statusFilter);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    faqs.sort((a: any, b: any) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle date strings
      if (sortBy.includes('_at')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      // Handle string values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return faqs;
  },

  createAdminFAQ: (
    userId: string,
    faqData: {
      question: string;
      answer: string;
      category: string;
      status: string;
    }
  ): { success: boolean; error?: string; data?: any } => {
    try {
      const snapshot = demoStorage.getSnapshot(userId);
      
      const newFAQ = {
        id: crypto.randomUUID(),
        question: faqData.question,
        answer: faqData.answer,
        category: faqData.category,
        status: faqData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      snapshot.adminFAQs.push(newFAQ);
      demoStorage.saveSnapshot(userId, snapshot);
      
      console.log('✅ FAQ created in demo mode:', newFAQ.id);
      return { success: true, data: newFAQ };
    } catch (error) {
      console.error('❌ Error creating FAQ:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  updateAdminFAQ: (
    userId: string,
    faqId: string,
    updates: {
      question?: string;
      answer?: string;
      category?: string;
      status?: string;
    }
  ): { success: boolean; error?: string } => {
    try {
      const snapshot = demoStorage.getSnapshot(userId);
      const faqIndex = snapshot.adminFAQs.findIndex((f: any) => f.id === faqId);
      
      if (faqIndex === -1) {
        return { success: false, error: 'FAQ not found' };
      }

      snapshot.adminFAQs[faqIndex] = {
        ...snapshot.adminFAQs[faqIndex],
        ...updates,
        updated_at: new Date().toISOString(),
      };

      demoStorage.saveSnapshot(userId, snapshot);
      
      console.log('✅ FAQ updated in demo mode:', faqId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating FAQ:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  deleteAdminFAQ: (userId: string, faqId: string): { success: boolean; error?: string } => {
    try {
      const snapshot = demoStorage.getSnapshot(userId);
      const faqIndex = snapshot.adminFAQs.findIndex((f: any) => f.id === faqId);
      
      if (faqIndex === -1) {
        return { success: false, error: 'FAQ not found' };
      }

      snapshot.adminFAQs.splice(faqIndex, 1);
      demoStorage.saveSnapshot(userId, snapshot);
      
      console.log('✅ FAQ deleted in demo mode:', faqId);
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting FAQ:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
};
