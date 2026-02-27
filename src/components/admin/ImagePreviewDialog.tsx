import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ImagePreviewDialogProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ImagePreviewDialog = ({ imageUrl, onClose }: ImagePreviewDialogProps) => {
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        {imageUrl && (
          <img src={imageUrl} alt="Dispute attachment" className="w-full h-auto rounded-lg" />
        )}
      </DialogContent>
    </Dialog>
  );
};
