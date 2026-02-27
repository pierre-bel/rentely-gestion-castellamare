import { ChevronDown } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface FAQAccordionProps {
  faqs: FAQ[];
  className?: string;
}

export function FAQAccordion({ faqs, className }: FAQAccordionProps) {
  if (!faqs || faqs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No FAQs available at the moment.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className={className}>
      <div className="space-y-4">
        {faqs.map((faq) => (
          <AccordionItem 
            key={faq.id} 
            value={faq.id}
            className="bg-white rounded-lg px-4 py-1 border-0"
            style={{ border: '1px solid #D5DAE7' }}
          >
            <AccordionTrigger className="py-3 text-left hover:no-underline">
              <span className="text-lg font-semibold text-foreground pr-4">
                {faq.question}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-3 pt-0">
              <p className="text-base text-foreground leading-relaxed">
                {faq.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </div>
    </Accordion>
  );
}
