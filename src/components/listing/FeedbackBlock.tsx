import { CheckCircle2, AlertCircle } from "lucide-react";
interface FeedbackBlockProps {
  status: "approved" | "rejected" | null;
  comment: string | null;
  sectionName: string;
}
const FeedbackBlock = ({
  status,
  comment,
  sectionName
}: FeedbackBlockProps) => {
  if (!status) return null;
  if (status === "approved") {
    return <div className="mt-6 mb-4 p-4 border border-green-200 bg-green-50 rounded-lg flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-900">This section was approved by the moderator</p>
        </div>
      </div>;
  }
  return <div className="mt-6 mb-4 p-4 border border-red-200 bg-red-50 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900 mb-2">
            ⚠ This section requires changes
          </p>
          {comment && <p className="text-sm text-red-800 whitespace-pre-wrap">{comment}</p>}
        </div>
      </div>
    </div>;
};
export default FeedbackBlock;