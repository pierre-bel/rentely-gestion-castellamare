import { useDemoMode } from "@/contexts/DemoContext";
import { demoStorage } from "@/lib/demoStorage";

export const useDemoData = () => {
  const { isDemoMode, demoUserId, migrationComplete } = useDemoMode();

  const getBookings = (filters?: { status?: string }) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getBookings(demoUserId, filters);
  };

  const getBooking = (bookingId: string) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getBooking(demoUserId, bookingId);
  };

  const addBooking = (booking: any) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.addBooking(demoUserId, booking);
  };

  const updateBooking = (bookingId: string, updates: any) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.updateBooking(demoUserId, bookingId, updates);
  };

  const getTransactions = (filters?: { type?: string; status?: string }) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getTransactions(demoUserId, filters);
  };

  const addTransaction = (transaction: any) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.addTransaction(demoUserId, transaction);
  };

  const getGuestDebts = (filters?: { status?: string }) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getGuestDebts(demoUserId, filters);
  };

  const updateGuestDebt = (debtId: string, updates: any) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.updateGuestDebt(demoUserId, debtId, updates);
  };

  const getOrCreateThread = (participant2Id: string, bookingId: string | null, listingId: string | null) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getOrCreateThread(demoUserId, participant2Id, bookingId, listingId);
  };

  const getThreads = (searchQuery?: string | null, sortBy?: string) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getThreads(demoUserId, searchQuery, sortBy);
  };

  const getMessages = (threadId: string) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getMessages(demoUserId, threadId);
  };

  const sendDemoMessage = (threadId: string, toUserId: string, body: string, attachmentUrl?: string, attachmentType?: string) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.sendMessage(demoUserId, threadId, toUserId, body, attachmentUrl, attachmentType);
  };

  const markDemoMessagesAsRead = (threadId: string) => {
    if (!isDemoMode || !demoUserId) return;
    return demoStorage.markMessagesAsRead(demoUserId, threadId);
  };

  const migrateAllDataFromDatabase = async (supabaseClient: any) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.migrateAllDataFromDatabase(demoUserId, supabaseClient);
  };

  const loadAdminSupportDataFromDB = async (supabaseClient: any) => {
    if (!isDemoMode || !demoUserId) return;
    await demoStorage.loadAdminSupportDataFromDB(demoUserId, supabaseClient);
  };

  const storeProfile = (profileId: string, profileData: any) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.storeProfile(demoUserId, profileId, profileData);
  };

  const getDisputeForBooking = (bookingId: string) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getDisputeForBooking(demoUserId, bookingId);
  };

  const createDisputeWithSupportThread = (
    bookingId: string,
    listingId: string,
    category: string,
    subject: string,
    description: string,
    requestedRefundAmount: number | null,
    attachmentUrls: string[]
  ) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.createDisputeWithSupportThread(
      demoUserId,
      bookingId,
      listingId,
      category,
      subject,
      description,
      requestedRefundAmount,
      attachmentUrls
    );
  };

  const getDisputes = (filters?: { status?: string }) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getDisputes(demoUserId, filters);
  };

  const getReviews = (bookingIds?: string[]) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getReviews(demoUserId, bookingIds);
  };

  const addReview = (review: any) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.addReview(demoUserId, review);
  };

  const updateReview = (reviewId: string, updates: any) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.updateReview(demoUserId, reviewId, updates);
  };

  const getProfile = () => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getProfile(demoUserId);
  };

  const updateProfile = (profileUpdates: any) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.updateProfile(demoUserId, profileUpdates);
  };

  // HOST OPERATIONS
  const addListing = (listing: any) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.addListing(demoUserId, listing);
  };

  const updateListing = (listingId: string, updates: any) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.updateListing(demoUserId, listingId, updates);
  };

  const getListing = (listingId: string) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getListing(demoUserId, listingId);
  };

  const getListings = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getListings(demoUserId, filters);
  };

  const getListingsFiltered = (filters?: {
    searchQuery?: string | null;
    statusFilter?: string | null;
    minPrice?: number | null;
    maxPrice?: number | null;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getListingsFiltered(demoUserId, filters || {});
  };

  const deleteListing = (listingId: string) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.deleteListing(demoUserId, listingId);
  };

  const addAvailabilityRules = (listingId: string, rules: any[]) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.addAvailabilityRules(demoUserId, listingId, rules);
  };

  const updateAvailabilityRules = (listingId: string, rules: any[]) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.updateAvailabilityRules(demoUserId, listingId, rules);
  };

  const getAvailabilityRules = (listingId: string) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAvailabilityRules(demoUserId, listingId);
  };

  const getHostBookings = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getHostBookings(demoUserId, filters);
  };

  const getHostBookingsFiltered = (filters?: {
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
  }) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getHostBookingsFiltered(demoUserId, filters || {});
  };

  const getPayouts = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getPayouts(demoUserId, filters);
  };

  const getModerationFeedback = (listingId: string) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getModerationFeedback(demoUserId, listingId);
  };

  const resolveFeedback = (feedbackId: string) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.resolveFeedback(demoUserId, feedbackId);
  };

  // Admin functions
  const getAdminListings = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAdminListings(demoUserId, filters || {});
  };

  const getAdminListing = (listingId: string) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getAdminListing(demoUserId, listingId);
  };

  const updateAdminListingStatus = (listingId: string, status: string, feedback?: any[]) => {
    if (!isDemoMode || !demoUserId) return;
    demoStorage.updateAdminListingStatus(demoUserId, listingId, status, feedback);
  };

  const getAdminSupportThreads = (searchQuery?: string | null, sortBy?: string) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAdminSupportThreads(demoUserId, searchQuery, sortBy);
  };

  const getAdminSupportMessages = (threadId: string) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAdminSupportMessages(demoUserId, threadId);
  };

  const sendAdminSupportMessage = (threadId: string, toUserId: string, body: string) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.sendAdminSupportMessage(demoUserId, threadId, toUserId, body);
  };

  const markAdminSupportThreadAsRead = (threadId: string) => {
    if (!isDemoMode || !demoUserId) return;
    return demoStorage.markAdminSupportThreadAsRead(demoUserId, threadId);
  };

  const getAdminDisputes = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAdminDisputes(demoUserId, filters || {});
  };

  const getAdminDisputeDetails = (disputeId: string) => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getAdminDisputeDetails(demoUserId, disputeId);
  };

  const updateAdminDisputeStatus = (disputeId: string, newStatus: string) => {
    if (!isDemoMode || !demoUserId) return false;
    return demoStorage.updateAdminDisputeStatus(demoUserId, disputeId, newStatus);
  };

  const adminResolveDispute = (
    disputeId: string,
    decision: string | null,
    approvedRefundAmount: number | null,
    resolutionNotes: string | null,
    isSubmit: boolean
  ) => {
    if (!isDemoMode || !demoUserId) return { success: false, error: 'Not in demo mode' };
    return demoStorage.adminResolveDispute(
      demoUserId,
      disputeId,
      decision,
      approvedRefundAmount,
      resolutionNotes,
      isSubmit
    );
  };

  const getAdminUsers = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAdminUsers(demoUserId, filters || {});
  };

  const suspendAdminUser = (targetUserId: string) => {
    if (!isDemoMode || !demoUserId) return false;
    return demoStorage.suspendAdminUser(demoUserId, targetUserId);
  };

  const unsuspendAdminUser = (targetUserId: string) => {
    if (!isDemoMode || !demoUserId) return false;
    return demoStorage.unsuspendAdminUser(demoUserId, targetUserId);
  };

  const deleteAdminUser = (targetUserId: string) => {
    if (!isDemoMode || !demoUserId) return false;
    return demoStorage.deleteAdminUser(demoUserId, targetUserId);
  };

  const getAdminReviews = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAdminReviews(demoUserId, filters || {});
  };

  const updateAdminReviewStatus = (reviewId: string, newStatus: string) => {
    if (!isDemoMode || !demoUserId) return false;
    return demoStorage.updateAdminReviewStatus(demoUserId, reviewId, newStatus);
  };

  const getAdminPayouts = (filters?: any) => {
    if (!isDemoMode || !demoUserId) return [];
    return demoStorage.getAdminPayouts(demoUserId, filters || {});
  };

  const markPayoutAsPaid = (payoutId: string) => {
    if (!isDemoMode || !demoUserId) return { success: false, error: 'Not in demo mode' };
    return demoStorage.markPayoutAsPaid(demoUserId, payoutId);
  };

  // Platform settings
  const getPlatformSettings = () => {
    if (!isDemoMode || !demoUserId) return null;
    return demoStorage.getPlatformSettings(demoUserId);
  };

  const updatePlatformSettings = (settings: {
    default_host_commission_rate: string;
    default_guest_service_fee_rate: string;
    default_tax_rate: string;
  }) => {
    if (!isDemoMode || !demoUserId) {
      return { success: false, error: 'Not in demo mode' };
    }
    return demoStorage.updatePlatformSettings(demoUserId, settings);
  };

  return {
    isDemoMode,
    migrationComplete,
    getBookings,
    getBooking,
    addBooking,
    updateBooking,
    getTransactions,
    addTransaction,
    getGuestDebts,
    updateGuestDebt,
    getOrCreateThread,
    getThreads,
    getMessages,
    sendDemoMessage,
    markDemoMessagesAsRead,
    migrateAllDataFromDatabase,
    loadAdminSupportDataFromDB,
    storeProfile,
    getDisputeForBooking,
    createDisputeWithSupportThread,
    getDisputes,
    getReviews,
    addReview,
    updateReview,
    getProfile,
    updateProfile,
    // Host operations
    addListing,
    updateListing,
    getListing,
    getListings,
    getListingsFiltered,
    deleteListing,
    addAvailabilityRules,
    updateAvailabilityRules,
    getAvailabilityRules,
    getHostBookings,
    getHostBookingsFiltered,
    getPayouts,
    getModerationFeedback,
    resolveFeedback,
    // Admin operations
    getAdminListings,
    getAdminListing,
    updateAdminListingStatus,
    getAdminSupportThreads,
    getAdminSupportMessages,
    sendAdminSupportMessage,
    markAdminSupportThreadAsRead,
    getAdminDisputes,
    getAdminDisputeDetails,
    updateAdminDisputeStatus,
    adminResolveDispute,
    getAdminUsers,
    suspendAdminUser,
    unsuspendAdminUser,
    deleteAdminUser,
    getAdminReviews,
    updateAdminReviewStatus,
    getAdminPayouts,
    markPayoutAsPaid,
    getPlatformSettings,
    updatePlatformSettings,
    // FAQ operations
    getAdminFAQs: (filters: {
      searchQuery?: string | null;
      categoryFilter?: string | null;
      statusFilter?: string | null;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      if (!isDemoMode || !demoUserId) return null;
      return demoStorage.getAdminFAQs(demoUserId, filters);
    },
    createAdminFAQ: (faqData: {
      question: string;
      answer: string;
      category: string;
      status: string;
    }) => {
      if (!isDemoMode || !demoUserId) {
        return { success: false, error: 'Not in demo mode' };
      }
      return demoStorage.createAdminFAQ(demoUserId, faqData);
    },
    updateAdminFAQ: (faqId: string, updates: {
      question?: string;
      answer?: string;
      category?: string;
      status?: string;
    }) => {
      if (!isDemoMode || !demoUserId) {
        return { success: false, error: 'Not in demo mode' };
      }
      return demoStorage.updateAdminFAQ(demoUserId, faqId, updates);
    },
    deleteAdminFAQ: (faqId: string) => {
      if (!isDemoMode || !demoUserId) {
        return { success: false, error: 'Not in demo mode' };
      }
      return demoStorage.deleteAdminFAQ(demoUserId, faqId);
    },
    // Admin support unread count
    getAdminSupportUnreadCount: () => {
      if (!isDemoMode || !demoUserId) return 0;
      return demoStorage.getAdminSupportUnreadCount(demoUserId);
    },
  };
};
