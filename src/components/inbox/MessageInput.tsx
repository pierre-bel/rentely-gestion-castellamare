import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Loader2, X, Lock } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (body: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  onUploadImage: (file: File) => Promise<string | null>;
  disabled?: boolean;
  isLocked?: boolean;
  lockedReason?: string;
}

export const MessageInput = ({
  onSendMessage,
  onUploadImage,
  disabled,
  isLocked = false,
  lockedReason
}: MessageInputProps) => {
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if ((!messageText.trim() && !attachmentFile) || sending || disabled) return;

    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;

      if (attachmentFile) {
        attachmentUrl = await onUploadImage(attachmentFile);
        attachmentType = attachmentFile.type;
      }

      await onSendMessage(messageText, attachmentUrl || undefined, attachmentType || undefined);
      setMessageText("");
      setAttachmentPreview(null);
      setAttachmentFile(null);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setAttachmentFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachmentPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLocked) {
    return (
      <div className="sticky bottom-0 bg-muted/30 p-4 border-t border-border">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Lock className="h-4 w-4" />
          <span>
            This conversation is locked. {lockedReason || "No new messages can be sent."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-white p-4">
      {attachmentPreview && (
        <div className="mb-2 relative inline-block">
          <img src={attachmentPreview} alt="Preview" className="max-h-24 rounded-lg" />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6"
            onClick={clearAttachment}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center gap-3 border border-border rounded-full px-4 py-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploading || disabled}
          className="h-8 w-8 shrink-0 hover:bg-transparent"
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
        <input
          type="text"
          placeholder="Type message here"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
          disabled={sending || disabled}
        />
        <Button
          onClick={handleSend}
          disabled={sending || (!messageText.trim() && !attachmentFile) || disabled}
          size="icon"
          className="bg-[#45CE99] hover:bg-[#45CE99]/90 rounded-full h-8 w-8 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
