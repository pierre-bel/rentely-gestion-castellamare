interface ChatHeaderProps {
  userName: string;
  listingTitle: string;
  listingAddress: string;
}

export const ChatHeader = ({
  userName,
  listingTitle,
  listingAddress
}: ChatHeaderProps) => {
  return (
    <div className="sticky top-0 bg-white border-b border-border p-4 z-10">
      <h2 className="text-lg font-semibold text-foreground">{userName}</h2>
      <p className="text-sm text-[#64748B] truncate">
        {listingTitle} • {listingAddress}
      </p>
    </div>
  );
};
