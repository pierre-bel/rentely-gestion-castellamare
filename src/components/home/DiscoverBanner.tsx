import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface DiscoverBannerProps {
  onExploreClick?: () => void;
}

const DiscoverBanner = ({ onExploreClick }: DiscoverBannerProps) => {
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        {/* Main Banner Container */}
        <div className="bg-primary rounded-3xl lg:rounded-[32px] p-8 md:p-12 lg:p-16 flex flex-col items-center justify-center min-h-[400px] gap-8">
          {/* Inner Text Block */}
          <div className="bg-banner-dark rounded-2xl lg:rounded-3xl p-6 text-center max-w-3xl">
            {/* Heading */}
            <h2 className="text-banner-light text-3xl md:text-4xl lg:text-5xl mb-4 lg:mb-6">
              Discover Your Next Stay
            </h2>
            
            {/* Subheading */}
            <p className="text-banner-light font-sans text-base mb-0">
              Find the perfect destination for your next adventure
            </p>
          </div>
          
          {/* Button */}
          <Button 
            onClick={onExploreClick}
            className="bg-banner-light text-primary hover:bg-banner-light/90 h-[54px] rounded-full px-8 font-display text-base"
          >
            Explore Now
            <Sparkles className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DiscoverBanner;
