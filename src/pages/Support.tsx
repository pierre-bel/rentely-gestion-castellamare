import Footer from "@/components/Footer";
const Support = () => {
  return <div className="min-h-screen bg-white flex flex-col">
      <div className="container mx-auto px-4 py-16 flex-grow">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium mb-4">
            Support Center
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We're here to help you with any questions or concerns
          </p>
        </div>

        {/* Additional Info */}
        <div className="rounded-xl p-8 text-center" style={{
        backgroundColor: '#F8FAFF'
      }}>
          <h3 className="text-xl font-semibold mb-4">Need Immediate Assistance?</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            For urgent matters related to active bookings, safety concerns, or payment issues, please contact us 
          </p>
        </div>
      </div>

      <Footer />
    </div>;
};
export default Support;