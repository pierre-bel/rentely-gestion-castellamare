import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HostPaymentsBookingsList } from "./HostPaymentsBookingsList";
import { HostPaymentSettings } from "./HostPaymentSettings";
import { BankTransactionsList } from "./BankTransactionsList";

export default function HostPayments() {
  return (
    <Tabs defaultValue="bookings" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="bookings">Réservations</TabsTrigger>
        <TabsTrigger value="bank">Virements bancaires</TabsTrigger>
        <TabsTrigger value="settings">Paramètres</TabsTrigger>
      </TabsList>

      <TabsContent value="bookings">
        <HostPaymentsBookingsList />
      </TabsContent>

      <TabsContent value="bank">
        <BankTransactionsList />
      </TabsContent>

      <TabsContent value="settings">
        <HostPaymentSettings />
      </TabsContent>
    </Tabs>
  );
}
