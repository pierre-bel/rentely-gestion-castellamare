import { useState } from "react";
import { format } from "date-fns";
import { MoreVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useDemoData } from "@/hooks/useDemoData";

interface User {
  id: string;
  user_display_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  avatar_url: string;
  status: string;
  created_at: string;
  primary_role: string;
  listings_count: number;
  bookings_count: number;
}

interface UsersTableProps {
  users: User[] | undefined;
  loading: boolean;
  hasActiveFilters: boolean;
}

const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "admin":
      return "default";
    case "host":
      return "secondary";
    default:
      return "outline";
  }
};


export function UsersTable({ users, loading, hasActiveFilters }: UsersTableProps) {
  const queryClient = useQueryClient();
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [unsuspendDialogOpen, setUnsuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { isDemoMode, suspendAdminUser, unsuspendAdminUser, deleteAdminUser } = useDemoData();

  const handleSuspendClick = (user: User) => {
    setSelectedUser(user);
    setSuspendDialogOpen(true);
  };

  const handleUnsuspendClick = (user: User) => {
    setSelectedUser(user);
    setUnsuspendDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmSuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    
    if (isDemoMode) {
      const success = suspendAdminUser(selectedUser.id);
      if (success) {
        toast({
          title: "User Suspended",
          description: `${selectedUser.full_name} has been suspended successfully.`,
        });
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      } else {
        toast({
          title: "Error",
          description: "Failed to suspend user",
          variant: "destructive",
        });
      }
      setActionLoading(false);
      setSuspendDialogOpen(false);
      setSelectedUser(null);
      return;
    }
    
    const { data, error } = await supabase.rpc('admin_suspend_user', {
      p_user_id: selectedUser.id
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Suspended",
        description: `${selectedUser.full_name} has been suspended successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
    
    setActionLoading(false);
    setSuspendDialogOpen(false);
    setSelectedUser(null);
  };

  const confirmUnsuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    
    if (isDemoMode) {
      const success = unsuspendAdminUser(selectedUser.id);
      if (success) {
        toast({
          title: "User Unsuspended",
          description: `${selectedUser.full_name} has been unsuspended successfully.`,
        });
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      } else {
        toast({
          title: "Error",
          description: "Failed to unsuspend user",
          variant: "destructive",
        });
      }
      setActionLoading(false);
      setUnsuspendDialogOpen(false);
      setSelectedUser(null);
      return;
    }
    
    const { data, error } = await supabase.rpc('admin_unsuspend_user', {
      p_user_id: selectedUser.id
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Unsuspended",
        description: `${selectedUser.full_name} has been unsuspended successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
    
    setActionLoading(false);
    setUnsuspendDialogOpen(false);
    setSelectedUser(null);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    
    if (isDemoMode) {
      const success = deleteAdminUser(selectedUser.id);
      if (success) {
        toast({
          title: "User Deleted",
          description: `${selectedUser.full_name} has been deleted successfully.`,
        });
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        });
      }
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      return;
    }
    
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase.rpc('admin_delete_user_soft', {
      p_user_id: selectedUser.id,
      p_admin_user_id: currentUser?.id
    });
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "User Deleted",
        description: `${selectedUser.full_name} has been deleted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    }
    
    setActionLoading(false);
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">User ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Email</TableHead>
              <TableHead className="font-semibold text-right hidden 2xl:table-cell">Listings</TableHead>
              <TableHead className="font-semibold text-right hidden 3xl:table-cell">Bookings</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Joined</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-8 w-40" /></TableCell>
                <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-8 w-12" /></TableCell>
                <TableCell className="hidden 3xl:table-cell"><Skeleton className="h-8 w-12" /></TableCell>
                <TableCell className="hidden 3xl:table-cell"><Skeleton className="h-8 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background hover:bg-background">
              <TableHead className="font-semibold">User ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold hidden 2xl:table-cell">Email</TableHead>
              <TableHead className="font-semibold text-right hidden 2xl:table-cell">Listings</TableHead>
              <TableHead className="font-semibold text-right hidden 3xl:table-cell">Bookings</TableHead>
              <TableHead className="font-semibold hidden 3xl:table-cell">Joined</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground 2xl:col-span-8 3xl:col-span-9">
                {hasActiveFilters
                  ? "No users found matching your filters. Try adjusting your search or filters."
                  : "No users found."}
              </TableCell>
            </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="font-semibold">User ID</TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold hidden 2xl:table-cell">Email</TableHead>
            <TableHead className="font-semibold text-right hidden 2xl:table-cell">Listings</TableHead>
            <TableHead className="font-semibold text-right hidden 3xl:table-cell">Bookings</TableHead>
            <TableHead className="font-semibold hidden 3xl:table-cell">Joined</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:nth-child(even)]:bg-[#F8FAFF]">
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-mono text-sm">
                {user.user_display_id}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {(user.first_name?.[0] || "") + (user.last_name?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.full_name}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={getRoleBadgeVariant(user.primary_role)}
                  className="capitalize"
                >
                  {user.primary_role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground hidden 2xl:table-cell">
                {user.email}
              </TableCell>
              <TableCell className="text-right hidden 2xl:table-cell">
                {user.listings_count}
              </TableCell>
              <TableCell className="text-right hidden 3xl:table-cell">
                {user.bookings_count}
              </TableCell>
              <TableCell className="text-muted-foreground hidden 3xl:table-cell">
                {format(new Date(user.created_at), "MMM dd, yyyy")}
              </TableCell>
              <TableCell>
                <StatusBadge status={user.status as any} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:bg-accent rounded p-1">
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {user.status === 'suspended' ? (
                      <DropdownMenuItem onClick={() => handleUnsuspendClick(user)}>
                        Unsuspend User
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleSuspendClick(user)}
                      >
                        Suspend User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteClick(user)}
                    >
                      Delete User
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Suspend Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend <strong>{selectedUser?.full_name}</strong>?
              <br/><br/>
              This will:
              <ul className="list-disc ml-6 mt-2">
                <li>Prevent the user from logging in</li>
                <li>Deactivate all their listings</li>
                <li>Keep all data intact (reversible)</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSuspend}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Suspending..." : "Suspend User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsuspend Confirmation Dialog */}
      <AlertDialog open={unsuspendDialogOpen} onOpenChange={setUnsuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsuspend User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unsuspend <strong>{selectedUser?.full_name}</strong>?
              <br/><br/>
              This will allow the user to log in again. Note that their listings will remain inactive and must be manually re-approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmUnsuspend}
              disabled={actionLoading}
            >
              {actionLoading ? "Unsuspending..." : "Unsuspend User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>?
              <br/><br/>
              This will:
              <ul className="list-disc ml-6 mt-2">
                <li>Anonymize all personal information</li>
                <li>Permanently log them out</li>
                <li>Deactivate all their listings</li>
                <li>Keep booking/payment history for integrity</li>
              </ul>
              <br/>
              <strong className="text-destructive">This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
