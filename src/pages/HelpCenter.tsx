import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Home, CreditCard, MessageSquare, Shield, FileText } from "lucide-react";
import Footer from "@/components/Footer";

const HelpCenter = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = [
    { value: 'all', label: 'All Topics', icon: BookOpen },
    { value: 'getting-started', label: 'Getting Started', icon: Home },
    { value: 'booking', label: 'Booking', icon: FileText },
    { value: 'payments', label: 'Payments', icon: CreditCard },
    { value: 'communication', label: 'Communication', icon: MessageSquare },
    { value: 'safety', label: 'Safety & Security', icon: Shield },
  ];

  const articles = [
    {
      category: 'getting-started',
      title: 'How to Create an Account',
      description: 'Learn how to sign up and set up your profile on our platform.',
      content: 'Creating an account is simple. Click the Sign Up button in the top right corner, enter your email address and create a password. You\'ll receive a confirmation email to verify your account.'
    },
    {
      category: 'getting-started',
      title: 'Understanding Your Dashboard',
      description: 'Navigate through your personal dashboard and manage your activities.',
      content: 'Your dashboard is your central hub for all activities. From here you can view bookings, messages, payments, and update your profile settings.'
    },
    {
      category: 'booking',
      title: 'How to Make a Booking',
      description: 'Step-by-step guide to booking a property on our platform.',
      content: 'To book a property, search for your destination, select your dates, choose a property from the results, and click Book Now. Review the details and complete the payment to confirm your booking.'
    },
    {
      category: 'booking',
      title: 'Cancellation Policy',
      description: 'Learn about our cancellation policies and refund process.',
      content: 'Cancellation policies vary by property. You can view the specific policy for each listing on its detail page. Generally, cancellations made more than 7 days before check-in receive a full refund.'
    },
    {
      category: 'booking',
      title: 'Modifying Your Booking',
      description: 'How to change dates or details of your existing booking.',
      content: 'To modify your booking, go to your bookings page, select the booking you want to change, and contact the host through the messaging system to discuss changes.'
    },
    {
      category: 'payments',
      title: 'Payment Methods',
      description: 'Accepted payment methods and how to add them to your account.',
      content: 'We accept major credit cards, debit cards, and digital payment methods. You can securely save your payment information in your account settings for faster checkout.'
    },
    {
      category: 'payments',
      title: 'Payment Schedule',
      description: 'When and how payments are processed.',
      content: 'Payment is typically charged when you confirm your booking. For hosts, payouts are processed after the guest checks in, according to the platform\'s payout schedule.'
    },
    {
      category: 'payments',
      title: 'Refund Process',
      description: 'How refunds work and when to expect them.',
      content: 'Refunds are processed according to the cancellation policy. Once approved, refunds typically take 5-10 business days to appear in your account, depending on your payment method.'
    },
    {
      category: 'communication',
      title: 'Messaging Hosts and Guests',
      description: 'How to communicate through our messaging system.',
      content: 'Use our secure messaging system to communicate with hosts or guests. Access messages from your inbox. All booking-related communications should happen through our platform.'
    },
    {
      category: 'communication',
      title: 'Notifications Settings',
      description: 'Manage your email and push notification preferences.',
      content: 'Control your notification preferences in your account settings. You can choose to receive notifications for bookings, messages, reminders, and promotional content.'
    },
    {
      category: 'safety',
      title: 'Platform Safety Guidelines',
      description: 'Best practices for staying safe on our platform.',
      content: 'Always communicate through our platform, verify property details, read reviews from previous guests, and report any suspicious activity to our support team immediately.'
    },
    {
      category: 'safety',
      title: 'Dispute Resolution',
      description: 'How to file and resolve disputes.',
      content: 'If you encounter an issue with a booking, you can file a dispute through your booking page. Our support team will review the case and work with both parties to reach a fair resolution.'
    },
  ];

  const filteredArticles = activeCategory === 'all' 
    ? articles 
    : articles.filter(article => article.category === activeCategory);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="container mx-auto px-4 py-16 flex-grow">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-4">
            Help Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse our comprehensive guides and articles
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full justify-start mb-8 flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger 
                  key={category.value} 
                  value={category.value}
                  className="bg-white data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeCategory} className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, index) => (
                <Card 
                  key={index} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <CardHeader>
                    <CardTitle className="text-xl">{article.title}</CardTitle>
                    <CardDescription>{article.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {article.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredArticles.length === 0 && (
              <div className="text-center py-12 rounded-xl" style={{ backgroundColor: '#F8FAFF' }}>
                <p className="text-muted-foreground text-lg">
                  No articles available in this category.
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

export default HelpCenter;
