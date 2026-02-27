import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useDemoData } from "@/hooks/useDemoData";

interface CommissionFormValues {
  hostCommissionRate: string;
  guestServiceFeeRate: string;
  taxRate: string;
}

const CommissionsManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { 
    isDemoMode, 
    getPlatformSettings, 
    updatePlatformSettings 
  } = useDemoData();

  const form = useForm<CommissionFormValues>({
    defaultValues: {
      hostCommissionRate: "",
      guestServiceFeeRate: "",
      taxRate: "",
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      let settings: Record<string, string>;

      if (isDemoMode) {
        // Demo mode: Get from localStorage
        const demoSettings = getPlatformSettings();
        if (demoSettings) {
          settings = {
            default_host_commission_rate: demoSettings.default_host_commission_rate,
            default_guest_service_fee_rate: demoSettings.default_guest_service_fee_rate,
            default_tax_rate: demoSettings.default_tax_rate,
          };
        } else {
          throw new Error('Demo settings not found');
        }
      } else {
        // Real mode: Fetch from Supabase
        const { data, error } = await supabase
          .from("platform_settings")
          .select("setting_key, setting_value")
          .in("setting_key", [
            "default_host_commission_rate",
            "default_guest_service_fee_rate",
            "default_tax_rate",
          ])
          .eq("is_active", true);

        if (error) throw error;

        settings = (data || []).reduce((acc, item) => {
          acc[item.setting_key] = item.setting_value;
          return acc;
        }, {} as Record<string, string>);
      }

      // Convert to percentages and set form values
      form.reset({
        hostCommissionRate: (parseFloat(settings.default_host_commission_rate || "0") * 100).toFixed(2),
        guestServiceFeeRate: (parseFloat(settings.default_guest_service_fee_rate || "0") * 100).toFixed(2),
        taxRate: (parseFloat(settings.default_tax_rate || "0") * 100).toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load commission settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: CommissionFormValues) => {
    setSaving(true);
    try {
      // Convert percentages to decimals
      const updates = {
        default_host_commission_rate: (parseFloat(values.hostCommissionRate) / 100).toString(),
        default_guest_service_fee_rate: (parseFloat(values.guestServiceFeeRate) / 100).toString(),
        default_tax_rate: (parseFloat(values.taxRate) / 100).toString(),
      };

      if (isDemoMode) {
        // Demo mode: Save to localStorage
        const result = updatePlatformSettings(updates);
        if (!result.success) {
          throw new Error(result.error || 'Failed to update settings');
        }
      } else {
        // Real mode: Update Supabase
        for (const [key, value] of Object.entries(updates)) {
          const { error } = await supabase
            .from("platform_settings")
            .update({ 
              setting_value: value,
              updated_at: new Date().toISOString()
            })
            .eq("setting_key", key)
            .eq("is_active", true);

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Commission rates updated successfully",
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Error",
        description: "Failed to update commission settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Commission Settings</CardTitle>
        <CardDescription>
          Manage the default commission rates and fees applied to all bookings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="hostCommissionRate"
              rules={{
                required: "Host commission rate is required",
                min: { value: 0, message: "Rate must be at least 0%" },
                max: { value: 100, message: "Rate cannot exceed 100%" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host Commission Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="15.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Percentage charged to hosts from their payout
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestServiceFeeRate"
              rules={{
                required: "Guest service fee rate is required",
                min: { value: 0, message: "Rate must be at least 0%" },
                max: { value: 100, message: "Rate cannot exceed 100%" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest Service Fee Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="10.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Percentage charged to guests on top of the booking subtotal
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="taxRate"
              rules={{
                required: "Tax rate is required",
                min: { value: 0, message: "Rate must be at least 0%" },
                max: { value: 100, message: "Rate cannot exceed 100%" },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="8.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tax percentage applied to the total booking amount
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CommissionsManagement;
