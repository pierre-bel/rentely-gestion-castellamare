import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { Skeleton } from "@/components/ui/skeleton";
export default function FAQSection() {
  const {
    data: faqs,
    isLoading,
    error
  } = useQuery({
    queryKey: ['published-faqs-home'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('faqs').select('id, question, answer, category').eq('status', 'published').in('category', ['general', 'booking', 'payment', 'host']).order('created_at', {
        ascending: false
      }).limit(8);
      if (error) throw error;
      return data;
    }
  });
  if (error) {
    return null; // Silently fail on home page
  }
  return <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium">
            Frequently Asked Questions
          </h2>
          <Link to="/faq" className="text-foreground hover:underline font-medium text-lg inline-flex items-center gap-2 group">
            See All
            
          </Link>
        </div>

        {/* FAQ Accordion */}
        {isLoading ? <div className="space-y-4 rounded-xl p-6" style={{
        backgroundColor: '#F8FAFF'
      }}>
            {[...Array(6)].map((_, i) => <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>)}
          </div> : <div className="rounded-xl p-6" style={{
        backgroundColor: '#F8FAFF'
      }}>
            <FAQAccordion faqs={faqs || []} />
          </div>}
      </div>
    </section>;
}