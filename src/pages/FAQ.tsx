import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FAQAccordion } from "@/components/shared/FAQAccordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Footer from "@/components/Footer";

const FAQ = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: faqs, isLoading } = useQuery({
    queryKey: ['published-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faqs')
        .select('id, question, answer, category')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'general', label: 'General' },
    { value: 'booking', label: 'Booking' },
    { value: 'payment', label: 'Payment' },
    { value: 'host', label: 'Host' },
    { value: 'support', label: 'Support' },
  ];

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs?.filter(faq => faq.category === activeCategory);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="container mx-auto px-4 py-16 flex-grow">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about our platform
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full justify-start mb-8 flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.value} 
                value={category.value}
                className="bg-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2"
              >
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-0">
            {isLoading ? (
              <div className="space-y-4 rounded-xl p-6" style={{ backgroundColor: '#F8FAFF' }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-2 bg-white rounded-lg p-4" style={{ border: '1px solid #D5DAE7' }}>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredFaqs && filteredFaqs.length > 0 ? (
              <div className="rounded-xl p-6" style={{ backgroundColor: '#F8FAFF' }}>
                <FAQAccordion faqs={filteredFaqs} />
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#F8FAFF' }}>
                <p className="text-muted-foreground text-lg">
                  No FAQs available in this category.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default FAQ;
