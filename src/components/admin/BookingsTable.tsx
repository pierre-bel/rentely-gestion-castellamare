import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Home, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { AdminBooking } from "./types/bookings";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import AdminContactDialog from "./AdminContactDialog";
import { useDemoData } from "@/hooks/useDemoData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_USER_ID } from "@/types/support-inbox";
import { demoStorage } from "@/lib/demoStorage";
import { useToast } from "@/hooks/use-toast";

interface BookingsTableProps {
  bookings: AdminBooking[];
  loading: boolean;
}

export default function BookingsTable({ bookings, loading }: BookingsTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isDemoMode } = useDemoData();
  const { user } = useAuth();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactTarget, setContactTarget] = useState<{
    userId: string;
    userName: string;
    bookingId: string;
    listingId: string;
    listingTitle: string;
    type: 'host' | 'guest';
  } | null>(null);

  const handleContactHost = async (booking: AdminBooking) => {
    const target = {
      userId: booking.host_user_id,
      userName: booking.host_name,
      bookingId: booking.id,
      listingId: booking.listing_id,
      listingTitle: booking.listing_title,
      type: 'host' as const
    };

    // Check if thread already exists
    let existingThreadId: string | null = null;

    if (isDemoMode && user) {
      // Demo mode: check localStorage
      const snapshot = demoStorage.getSnapshot(user.id);
      // First try to find thread by user_id AND booking_id (new threads)
      let thread = snapshot.adminSupportThreads?.find(
        (t: any) => t.user_id === target.userId && t.booking_id === target.bookingId
      );
      // If not found, fallback to just user_id for backward compatibility (old threads)
      if (!thread) {
        thread = snapshot.adminSupportThreads?.find(
          (t: any) => t.user_id === target.userId
        );
      }
      if (thread) {
        existingThreadId = thread.thread_id;
      }
    } else {
      // Real mode: check database
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('thread_type', 'user_to_support')
        .eq('booking_id', booking.id)
        .or(`participant_1_id.eq.${SUPPORT_USER_ID},participant_2_id.eq.${SUPPORT_USER_ID}`)
        .or(`participant_1_id.eq.${target.userId},participant_2_id.eq.${target.userId}`)
        .single();

      if (existingThread) {
        existingThreadId = existingThread.id;
      }
    }

    // If thread exists, navigate directly. Otherwise open dialog
    if (existingThreadId) {
      navigate(`/admin/support?thread=${existingThreadId}`);
    } else {
      setContactTarget(target);
      setContactDialogOpen(true);
    }
  };

  const handleContactGuest = async (booking: AdminBooking) => {
    const target = {
      userId: booking.guest_user_id,
      userName: booking.guest_name,
      bookingId: booking.id,
      listingId: booking.listing_id,
      listingTitle: booking.listing_title,
      type: 'guest' as const
    };

    // Check if thread already exists
    let existingThreadId: string | null = null;

    if (isDemoMode && user) {
      // Demo mode: check localStorage
      const snapshot = demoStorage.getSnapshot(user.id);
      // First try to find thread by user_id AND booking_id (new threads)
      let thread = snapshot.adminSupportThreads?.find(
        (t: any) => t.user_id === target.userId && t.booking_id === target.bookingId
      );
      // If not found, fallback to just user_id for backward compatibility (old threads)
      if (!thread) {
        thread = snapshot.adminSupportThreads?.find(
          (t: any) => t.user_id === target.userId
        );
      }
      if (thread) {
        existingThreadId = thread.thread_id;
      }
    } else {
      // Real mode: check database
      const { data: existingThread } = await supabase
        .from('message_threads')
        .select('id')
        .eq('thread_type', 'user_to_support')
        .eq('booking_id', booking.id)
        .or(`participant_1_id.eq.${SUPPORT_USER_ID},participant_2_id.eq.${SUPPORT_USER_ID}`)
        .or(`participant_1_id.eq.${target.userId},participant_2_id.eq.${target.userId}`)
        .single();

      if (existingThread) {
        existingThreadId = existingThread.id;
      }
    }

    // If thread exists, navigate directly. Otherwise open dialog
    if (existingThreadId) {
      navigate(`/admin/support?thread=${existingThreadId}`);
    } else {
      setContactTarget(target);
      setContactDialogOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Booking ID</TableHead>
              <TableHead className="font-semibold">Listing</TableHead>
              <TableHead className="font-semibold">Host</TableHead>
              <TableHead className="font-semibold">Guest</TableHead>
              <TableHead className="font-semibold">Dates</TableHead>
              <TableHead className="font-semibold text-right">Nights</TableHead>
              <TableHead className="font-semibold text-right">Total</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-[#F8FAFF]" : ""}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground text-lg">No bookings found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden xl:block rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">Booking ID</TableHead>
              <TableHead className="font-semibold">Listing</TableHead>
              <TableHead className="font-semibold">Host</TableHead>
              <TableHead className="font-semibold">Guest</TableHead>
              <TableHead className="font-semibold">Dates</TableHead>
              <TableHead className="font-semibold text-right">Nights</TableHead>
              <TableHead className="font-semibold text-right">Total</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking, index) => (
              <TableRow key={booking.id} className={index % 2 === 0 ? "bg-[#F8FAFF] hover:bg-muted/50" : "hover:bg-muted/50"}>
                <TableCell className="font-mono text-xs">{booking.booking_display_id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{booking.listing_title}</span>
                    <span className="text-xs text-muted-foreground">
                      {booking.listing_city}, {booking.listing_country}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={booking.host_avatar || ""} />
                      <AvatarFallback>{booking.host_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{booking.host_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={booking.guest_avatar || ""} />
                      <AvatarFallback>{booking.guest_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{booking.guest_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm whitespace-nowrap">
                    {format(new Date(booking.checkin_date), "MMM d")} - {format(new Date(booking.checkout_date), "MMM d, yyyy")}
                  </span>
                </TableCell>
                <TableCell className="text-right">{booking.nights}</TableCell>
                <TableCell className="text-right font-semibold">${booking.total_price.toFixed(2)}</TableCell>
                <TableCell>
                  <StatusBadge status={booking.status as any} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/listing/${booking.listing_id}`)}>
                        <Home className="h-4 w-4 mr-2" />
                        View Listing
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleContactHost(booking)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Host
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleContactGuest(booking)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Contact Guest
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="xl:hidden space-y-4">
        {bookings.map((booking) => (
          <div key={booking.id} className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-sm mb-1">{booking.listing_title}</div>
                <div className="text-xs text-muted-foreground">
                  {booking.listing_city}, {booking.listing_country}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">ID: {booking.booking_display_id}</div>
              </div>
              <StatusBadge status={booking.status as any} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Host</div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={booking.host_avatar || ""} />
                    <AvatarFallback>{booking.host_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{booking.host_name}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Guest</div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={booking.guest_avatar || ""} />
                    <AvatarFallback>{booking.guest_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{booking.guest_name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Check-in</div>
                <div>{format(new Date(booking.checkin_date), "MMM dd")}</div>
              </div>
              <div className="text-xs text-muted-foreground">→</div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Check-out</div>
                <div>{format(new Date(booking.checkout_date), "MMM dd")}</div>
              </div>
              <div className="text-sm">
                <div className="text-xs text-muted-foreground">Nights</div>
                <div className="text-center">{booking.nights}</div>
              </div>
              <div className="text-sm font-semibold">
                <div className="text-xs text-muted-foreground">Total</div>
                <div>${booking.total_price.toFixed(2)}</div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate(`/listing/${booking.listing_id}`)}>
                  <Home className="h-4 w-4 mr-2" />
                  View Listing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleContactHost(booking)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Host
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleContactGuest(booking)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Guest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <AdminContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        target={contactTarget}
      />
    </>
  );
}
