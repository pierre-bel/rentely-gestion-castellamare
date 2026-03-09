// Pre-populated demo data for all 3 demo roles
// This seeds localStorage on first demo activation so users see content immediately

import { demoStorage } from "./demoStorage";

const GUEST_ID = "demo-guest-0000-0000-000000000001";
const HOST_ID = "demo-host-0000-0000-000000000002";
const ADMIN_ID = "demo-admin-0000-0000-000000000003";

// Fake host for guest bookings
const FAKE_HOST_ID = "fake-host-1111-1111-111111111111";
// Fake guests for host bookings
const FAKE_GUEST_1 = "fake-guest-2222-2222-222222222222";
const FAKE_GUEST_2 = "fake-guest-3333-3333-333333333333";
const FAKE_GUEST_3 = "fake-guest-4444-4444-444444444444";

const LISTING_1 = "demo-listing-0001-0001-000000000001";
const LISTING_2 = "demo-listing-0002-0002-000000000002";
const LISTING_3 = "demo-listing-0003-0003-000000000003";
const LISTING_4 = "demo-listing-0004-0004-000000000004";

const BOOKING_1 = "demo-booking-0001-0001-000000000001";
const BOOKING_2 = "demo-booking-0002-0002-000000000002";
const BOOKING_3 = "demo-booking-0003-0003-000000000003";
const BOOKING_4 = "demo-booking-0004-0004-000000000004";
const BOOKING_5 = "demo-booking-0005-0005-000000000005";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysAgo(days: number): string {
  return daysFromNow(-days);
}

function isoAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
];

// ──── LISTINGS (owned by HOST_ID) ────

const hostListings = [
  {
    id: LISTING_1,
    title: "Villa Méditerranée avec Piscine",
    description: "Magnifique villa avec vue mer, piscine privée et jardin luxuriant. Idéale pour des vacances en famille.",
    address: "12 Chemin des Oliviers",
    city: "Nice",
    state: "Provence-Alpes-Côte d'Azur",
    country: "France",
    type: "villa",
    status: "approved",
    base_price: 220,
    cleaning_fee: 80,
    security_deposit: 500,
    guests_max: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 3,
    size_sqft: 180,
    cover_image: COVER_IMAGES[0],
    images: COVER_IMAGES,
    amenities: ["wifi", "pool", "parking", "air_conditioning", "kitchen", "washer"],
    rating_avg: 4.7,
    rating_count: 23,
    host_user_id: HOST_ID,
    min_nights: 3,
    max_nights: 21,
    currency: "EUR",
    cancellation_policy_id: "00000000-0000-0000-0000-000000000001",
    latitude: 43.7102,
    longitude: 7.2620,
    created_at: isoAgo(180),
    updated_at: isoAgo(5),
  },
  {
    id: LISTING_2,
    title: "Chalet Cozy en Montagne",
    description: "Chalet traditionnel au cœur des Alpes, parfait pour le ski en hiver et les randonnées en été.",
    address: "45 Route du Col",
    city: "Chamonix",
    state: "Auvergne-Rhône-Alpes",
    country: "France",
    type: "chalet",
    status: "approved",
    base_price: 180,
    cleaning_fee: 60,
    security_deposit: 400,
    guests_max: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    size_sqft: 120,
    cover_image: COVER_IMAGES[1],
    images: [COVER_IMAGES[1], COVER_IMAGES[2]],
    amenities: ["wifi", "fireplace", "parking", "kitchen", "washer", "heating"],
    rating_avg: 4.9,
    rating_count: 41,
    host_user_id: HOST_ID,
    min_nights: 2,
    max_nights: 14,
    currency: "EUR",
    cancellation_policy_id: "00000000-0000-0000-0000-000000000001",
    latitude: 45.9237,
    longitude: 6.8694,
    created_at: isoAgo(300),
    updated_at: isoAgo(2),
  },
  {
    id: LISTING_3,
    title: "Appartement Parisien Haussmannien",
    description: "Superbe appartement rénové dans un immeuble haussmannien, à deux pas des Champs-Élysées.",
    address: "8 Rue de Rivoli",
    city: "Paris",
    state: "Île-de-France",
    country: "France",
    type: "apartment",
    status: "approved",
    base_price: 150,
    cleaning_fee: 50,
    security_deposit: 300,
    guests_max: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    size_sqft: 75,
    cover_image: COVER_IMAGES[2],
    images: [COVER_IMAGES[2], COVER_IMAGES[3]],
    amenities: ["wifi", "air_conditioning", "kitchen", "washer", "elevator"],
    rating_avg: 4.5,
    rating_count: 67,
    host_user_id: HOST_ID,
    min_nights: 2,
    max_nights: 30,
    currency: "EUR",
    cancellation_policy_id: "00000000-0000-0000-0000-000000000001",
    latitude: 48.8566,
    longitude: 2.3522,
    created_at: isoAgo(400),
    updated_at: isoAgo(1),
  },
  {
    id: LISTING_4,
    title: "Maison de Pêcheur Rénovée",
    description: "Charmante maison de pêcheur rénovée avec goût, à 50m du port. Vue sur l'océan.",
    address: "3 Quai des Pêcheurs",
    city: "Saint-Jean-de-Luz",
    state: "Nouvelle-Aquitaine",
    country: "France",
    type: "house",
    status: "draft",
    base_price: 130,
    cleaning_fee: 45,
    security_deposit: 250,
    guests_max: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1,
    size_sqft: 90,
    cover_image: COVER_IMAGES[3],
    images: [COVER_IMAGES[3]],
    amenities: ["wifi", "kitchen", "washer", "ocean_view"],
    rating_avg: 0,
    rating_count: 0,
    host_user_id: HOST_ID,
    min_nights: 3,
    max_nights: 14,
    currency: "EUR",
    cancellation_policy_id: "00000000-0000-0000-0000-000000000001",
    latitude: 43.3880,
    longitude: -1.6601,
    created_at: isoAgo(10),
    updated_at: isoAgo(1),
  },
];

// ──── Profiles ────

const profiles: Record<string, any> = {
  [HOST_ID]: {
    id: HOST_ID,
    first_name: "Demo",
    last_name: "Host",
    email: "host@demo.com",
    avatar_url: null,
    phone: "+33 6 12 34 56 78",
  },
  [GUEST_ID]: {
    id: GUEST_ID,
    first_name: "Demo",
    last_name: "Guest",
    email: "guest@demo.com",
    avatar_url: null,
    phone: "+33 6 98 76 54 32",
  },
  [FAKE_HOST_ID]: {
    id: FAKE_HOST_ID,
    first_name: "Jean-Pierre",
    last_name: "Martin",
    email: "jpmartin@example.com",
    avatar_url: null,
  },
  [FAKE_GUEST_1]: {
    id: FAKE_GUEST_1,
    first_name: "Sophie",
    last_name: "Durand",
    email: "sophie.durand@example.com",
    avatar_url: null,
  },
  [FAKE_GUEST_2]: {
    id: FAKE_GUEST_2,
    first_name: "Marc",
    last_name: "Lefèvre",
    email: "marc.lefevre@example.com",
    avatar_url: null,
  },
  [FAKE_GUEST_3]: {
    id: FAKE_GUEST_3,
    first_name: "Camille",
    last_name: "Bernard",
    email: "camille.bernard@example.com",
    avatar_url: null,
  },
};

// ──── GUEST BOOKINGS (guest views) ────

const guestBookings = [
  {
    id: BOOKING_1,
    listing_id: LISTING_1,
    guest_user_id: GUEST_ID,
    checkin_date: daysFromNow(12),
    checkout_date: daysFromNow(19),
    nights: 7,
    guests: 4,
    subtotal: 1540,
    cleaning_fee: 80,
    service_fee: 154,
    taxes: 142,
    total_price: 1916,
    status: "confirmed",
    created_at: isoAgo(30),
    updated_at: isoAgo(30),
    access_token: "demo-token-1",
    currency: "EUR",
    listings: {
      id: LISTING_1,
      title: "Villa Méditerranée avec Piscine",
      address: "12 Chemin des Oliviers",
      city: "Nice",
      state: "Provence-Alpes-Côte d'Azur",
      country: "France",
      cover_image: COVER_IMAGES[0],
      type: "villa",
      size_sqft: 180,
      host_user_id: FAKE_HOST_ID,
    },
  },
  {
    id: BOOKING_2,
    listing_id: LISTING_2,
    guest_user_id: GUEST_ID,
    checkin_date: daysAgo(60),
    checkout_date: daysAgo(53),
    nights: 7,
    guests: 2,
    subtotal: 1260,
    cleaning_fee: 60,
    service_fee: 126,
    taxes: 116,
    total_price: 1562,
    status: "completed",
    created_at: isoAgo(90),
    updated_at: isoAgo(53),
    access_token: "demo-token-2",
    currency: "EUR",
    listings: {
      id: LISTING_2,
      title: "Chalet Cozy en Montagne",
      address: "45 Route du Col",
      city: "Chamonix",
      state: "Auvergne-Rhône-Alpes",
      country: "France",
      cover_image: COVER_IMAGES[1],
      type: "chalet",
      size_sqft: 120,
      host_user_id: FAKE_HOST_ID,
    },
  },
  {
    id: BOOKING_3,
    listing_id: LISTING_3,
    guest_user_id: GUEST_ID,
    checkin_date: daysAgo(120),
    checkout_date: daysAgo(115),
    nights: 5,
    guests: 2,
    subtotal: 750,
    cleaning_fee: 50,
    service_fee: 75,
    taxes: 70,
    total_price: 945,
    status: "completed",
    created_at: isoAgo(150),
    updated_at: isoAgo(115),
    access_token: "demo-token-3",
    currency: "EUR",
    listings: {
      id: LISTING_3,
      title: "Appartement Parisien Haussmannien",
      address: "8 Rue de Rivoli",
      city: "Paris",
      state: "Île-de-France",
      country: "France",
      cover_image: COVER_IMAGES[2],
      type: "apartment",
      size_sqft: 75,
      host_user_id: FAKE_HOST_ID,
    },
  },
];

// ──── HOST BOOKINGS (host views) ────

const hostBookings = [
  {
    id: BOOKING_4,
    listing_id: LISTING_1,
    listing_title: "Villa Méditerranée avec Piscine",
    listing_city: "Nice",
    listing_country: "France",
    guest_user_id: FAKE_GUEST_1,
    guest_name: "Sophie Durand",
    guest_email: "sophie.durand@example.com",
    checkin_date: daysFromNow(5),
    checkout_date: daysFromNow(12),
    nights: 7,
    guests: 3,
    subtotal: 1540,
    cleaning_fee: 80,
    service_fee: 154,
    taxes: 142,
    total_price: 1916,
    host_payout_net: 1386,
    host_commission_amount: 234,
    status: "confirmed",
    created_at: isoAgo(20),
    updated_at: isoAgo(20),
    access_token: "demo-token-4",
    currency: "EUR",
    booking_display_id: "BK-2026-001",
  },
  {
    id: BOOKING_5,
    listing_id: LISTING_2,
    listing_title: "Chalet Cozy en Montagne",
    listing_city: "Chamonix",
    listing_country: "France",
    guest_user_id: FAKE_GUEST_2,
    guest_name: "Marc Lefèvre",
    guest_email: "marc.lefevre@example.com",
    checkin_date: daysFromNow(20),
    checkout_date: daysFromNow(27),
    nights: 7,
    guests: 5,
    subtotal: 1260,
    cleaning_fee: 60,
    service_fee: 126,
    taxes: 116,
    total_price: 1562,
    host_payout_net: 1131,
    host_commission_amount: 189,
    status: "confirmed",
    created_at: isoAgo(10),
    updated_at: isoAgo(10),
    access_token: "demo-token-5",
    currency: "EUR",
    booking_display_id: "BK-2026-002",
  },
  {
    id: "demo-booking-0006-0006-000000000006",
    listing_id: LISTING_3,
    listing_title: "Appartement Parisien Haussmannien",
    listing_city: "Paris",
    listing_country: "France",
    guest_user_id: FAKE_GUEST_3,
    guest_name: "Camille Bernard",
    guest_email: "camille.bernard@example.com",
    checkin_date: daysAgo(14),
    checkout_date: daysAgo(9),
    nights: 5,
    guests: 2,
    subtotal: 750,
    cleaning_fee: 50,
    service_fee: 75,
    taxes: 70,
    total_price: 945,
    host_payout_net: 680,
    host_commission_amount: 120,
    status: "completed",
    created_at: isoAgo(45),
    updated_at: isoAgo(9),
    access_token: "demo-token-6",
    currency: "EUR",
    booking_display_id: "BK-2026-003",
  },
];

// ──── REVIEWS ────

const guestReviews = [
  {
    id: "demo-review-0001",
    booking_id: BOOKING_2,
    listing_id: LISTING_2,
    author_user_id: GUEST_ID,
    rating: 5,
    text: "Séjour incroyable ! Le chalet est encore plus beau en vrai. Vue magnifique et équipements au top.",
    status: "approved",
    created_at: isoAgo(50),
    updated_at: isoAgo(50),
  },
  {
    id: "demo-review-0002",
    booking_id: BOOKING_3,
    listing_id: LISTING_3,
    author_user_id: GUEST_ID,
    rating: 4,
    text: "Très bel appartement, bien situé. Un peu bruyant la nuit mais sinon parfait.",
    status: "approved",
    created_at: isoAgo(110),
    updated_at: isoAgo(110),
  },
];

const hostReviews = [
  {
    id: "demo-review-0003",
    booking_id: "demo-booking-0006-0006-000000000006",
    listing_id: LISTING_3,
    author_user_id: FAKE_GUEST_3,
    author_name: "Camille Bernard",
    rating: 5,
    text: "Appartement magnifique, hôte très accueillant. On reviendra !",
    status: "approved",
    created_at: isoAgo(7),
    updated_at: isoAgo(7),
  },
  {
    id: "demo-review-0004",
    booking_id: BOOKING_4,
    listing_id: LISTING_1,
    author_user_id: FAKE_GUEST_2,
    author_name: "Marc Lefèvre",
    rating: 4,
    text: "Superbe villa, la piscine est un vrai plus. Quelques détails à améliorer mais très satisfait.",
    status: "approved",
    created_at: isoAgo(30),
    updated_at: isoAgo(30),
  },
];

// ──── PAYOUTS (host) ────

const hostPayouts = [
  {
    id: "demo-payout-0001",
    booking_id: "demo-booking-0006-0006-000000000006",
    host_user_id: HOST_ID,
    amount: 680,
    commission_amount: 120,
    status: "completed",
    payout_date: daysAgo(7),
    currency: "EUR",
    transaction_type: "payout",
    created_at: isoAgo(7),
    updated_at: isoAgo(7),
    booking_display_id: "BK-2026-003",
    listing_title: "Appartement Parisien Haussmannien",
    guest_name: "Camille Bernard",
  },
  {
    id: "demo-payout-0002",
    booking_id: BOOKING_4,
    host_user_id: HOST_ID,
    amount: 1386,
    commission_amount: 234,
    status: "pending",
    payout_date: daysFromNow(14),
    currency: "EUR",
    transaction_type: "payout",
    created_at: isoAgo(20),
    updated_at: isoAgo(20),
    booking_display_id: "BK-2026-001",
    listing_title: "Villa Méditerranée avec Piscine",
    guest_name: "Sophie Durand",
  },
];

// ──── TRANSACTIONS (guest) ────

const guestTransactions = [
  {
    id: "demo-tx-0001",
    booking_id: BOOKING_1,
    user_id: GUEST_ID,
    amount: 1916,
    type: "payment",
    status: "completed",
    description: "Paiement réservation - Villa Méditerranée",
    created_at: isoAgo(30),
  },
  {
    id: "demo-tx-0002",
    booking_id: BOOKING_2,
    user_id: GUEST_ID,
    amount: 1562,
    type: "payment",
    status: "completed",
    description: "Paiement réservation - Chalet Cozy",
    created_at: isoAgo(90),
  },
  {
    id: "demo-tx-0003",
    booking_id: BOOKING_3,
    user_id: GUEST_ID,
    amount: 945,
    type: "payment",
    status: "completed",
    description: "Paiement réservation - Appartement Parisien",
    created_at: isoAgo(150),
  },
];

// ──── ADMIN DATA ────

const adminUsers = [
  {
    id: HOST_ID,
    email: "host@demo.com",
    first_name: "Demo",
    last_name: "Host",
    role: "host",
    status: "active",
    created_at: isoAgo(365),
    listings_count: 4,
    bookings_count: 3,
  },
  {
    id: GUEST_ID,
    email: "guest@demo.com",
    first_name: "Demo",
    last_name: "Guest",
    role: "guest",
    status: "active",
    created_at: isoAgo(200),
    listings_count: 0,
    bookings_count: 3,
  },
  {
    id: FAKE_GUEST_1,
    email: "sophie.durand@example.com",
    first_name: "Sophie",
    last_name: "Durand",
    role: "guest",
    status: "active",
    created_at: isoAgo(150),
    listings_count: 0,
    bookings_count: 1,
  },
  {
    id: FAKE_GUEST_2,
    email: "marc.lefevre@example.com",
    first_name: "Marc",
    last_name: "Lefèvre",
    role: "guest",
    status: "active",
    created_at: isoAgo(100),
    listings_count: 0,
    bookings_count: 1,
  },
  {
    id: FAKE_GUEST_3,
    email: "camille.bernard@example.com",
    first_name: "Camille",
    last_name: "Bernard",
    role: "guest",
    status: "active",
    created_at: isoAgo(80),
    listings_count: 0,
    bookings_count: 1,
  },
];

const adminListings = hostListings.map((l) => ({
  ...l,
  host_name: "Demo Host",
  host_email: "host@demo.com",
}));

const adminReviews = [...guestReviews, ...hostReviews].map((r) => ({
  ...r,
  author_name:
    r.author_user_id === GUEST_ID
      ? "Demo Guest"
      : profiles[r.author_user_id]?.first_name + " " + profiles[r.author_user_id]?.last_name,
  listing_title: hostListings.find((l) => l.id === r.listing_id)?.title || "Unknown",
}));

const adminPayouts = hostPayouts;

const adminFAQs = [
  {
    id: "demo-faq-0001",
    question: "Comment annuler une réservation ?",
    answer: "Vous pouvez annuler votre réservation depuis votre tableau de bord guest, dans la section 'Mes réservations'. Les conditions de remboursement dépendent de la politique d'annulation du propriétaire.",
    category: "bookings",
    status: "published",
    created_at: isoAgo(200),
    updated_at: isoAgo(50),
  },
  {
    id: "demo-faq-0002",
    question: "Comment devenir hôte ?",
    answer: "Cliquez sur 'Devenir hôte' dans le menu principal. Vous pourrez alors créer votre première annonce en quelques minutes.",
    category: "hosting",
    status: "published",
    created_at: isoAgo(200),
    updated_at: isoAgo(100),
  },
  {
    id: "demo-faq-0003",
    question: "Quels sont les frais de service ?",
    answer: "Les frais de service pour les voyageurs sont de 10% du sous-total. Les hôtes ont une commission de 15%.",
    category: "payments",
    status: "published",
    created_at: isoAgo(180),
    updated_at: isoAgo(30),
  },
];

// ──── SEED FUNCTIONS ────

export function seedGuestData(userId: string) {
  const snapshot = demoStorage.getSnapshot(userId);
  // Don't re-seed if data already exists
  if (snapshot.bookings.length > 0) return;

  demoStorage.saveSnapshot(userId, {
    bookings: guestBookings,
    transactions: guestTransactions,
    reviews: guestReviews,
    profile: {
      id: GUEST_ID,
      first_name: "Demo",
      last_name: "Guest",
      email: "guest@demo.com",
      phone: "+33 6 98 76 54 32",
      avatar_url: null,
      created_at: isoAgo(200),
    },
    profiles,
    disputes: [],
    guestDebts: [],
    messageThreads: [],
    messages: [],
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
  });
}

export function seedHostData(userId: string) {
  const snapshot = demoStorage.getSnapshot(userId);
  if (snapshot.listings.length > 0) return;

  demoStorage.saveSnapshot(userId, {
    bookings: [],
    transactions: [],
    reviews: hostReviews,
    profile: {
      id: HOST_ID,
      first_name: "Demo",
      last_name: "Host",
      email: "host@demo.com",
      phone: "+33 6 12 34 56 78",
      avatar_url: null,
      created_at: isoAgo(365),
    },
    profiles,
    disputes: [],
    guestDebts: [],
    messageThreads: [],
    messages: [],
    listings: hostListings,
    hostBookings,
    payouts: hostPayouts,
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
  });
}

export function seedAdminData(userId: string) {
  const snapshot = demoStorage.getSnapshot(userId);
  if (snapshot.adminUsers.length > 0) return;

  demoStorage.saveSnapshot(userId, {
    bookings: [],
    transactions: [],
    reviews: [],
    profile: {
      id: ADMIN_ID,
      first_name: "Demo",
      last_name: "Admin",
      email: "admin@demo.com",
      avatar_url: null,
      created_at: isoAgo(500),
    },
    profiles,
    disputes: [],
    guestDebts: [],
    messageThreads: [],
    messages: [],
    listings: [],
    hostBookings: [],
    payouts: [],
    listingAvailability: [],
    hostTransactions: [],
    moderationFeedback: [],
    adminListings,
    adminProfiles: profiles,
    adminModerationActions: [],
    adminSupportThreads: [],
    adminSupportMessages: [],
    adminUsers,
    adminReviews,
    adminPayouts,
    adminFAQs,
    platformSettings: {
      default_host_commission_rate: "0.15",
      default_guest_service_fee_rate: "0.10",
      default_tax_rate: "0.08",
    },
    lastUpdated: new Date().toISOString(),
  });
}

export function seedDemoData(role: string, userId: string) {
  switch (role) {
    case "guest":
      seedGuestData(userId);
      break;
    case "host":
      seedHostData(userId);
      break;
    case "admin":
      seedAdminData(userId);
      break;
  }
}
