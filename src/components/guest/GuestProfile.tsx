import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FormInput from "@/components/listing/FormInput";
import FormPhoneInput from "@/components/listing/FormPhoneInput";
import FormTextarea from "@/components/listing/FormTextarea";
import { useDemoData } from "@/hooks/useDemoData";

interface Profile {
  first_name: string;
  last_name: string;
  phone: string;
  about: string;
  avatar_url: string;
}

const GuestProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isDemoMode, getProfile, updateProfile: updateDemoProfile } = useDemoData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile>({
    first_name: "",
    last_name: "",
    phone: "",
    about: "",
    avatar_url: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (isDemoMode) {
        // Demo mode: load from localStorage
        const demoProfile = getProfile();
        if (demoProfile) {
          setProfile({
            first_name: demoProfile.first_name || "",
            last_name: demoProfile.last_name || "",
            phone: demoProfile.phone || "",
            about: demoProfile.about || "",
            avatar_url: demoProfile.avatar_url || "",
          });
        }
        setLoading(false);
        return;
      }

      // Real mode: load from Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          phone: data.phone || "",
          about: data.about || "",
          avatar_url: data.avatar_url || "",
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, isDemoMode]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size should be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      if (isDemoMode) {
        // Demo mode: convert to base64 data URL and store in localStorage
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setProfile(prev => ({ ...prev, avatar_url: dataUrl }));
          
          // Update in demo storage
          updateDemoProfile({ avatar_url: dataUrl });
          
          toast({
            title: "Success",
            description: "Avatar updated successfully",
          });
          setUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        };
        reader.onerror = () => {
          toast({
            title: "Error",
            description: "Failed to upload avatar",
            variant: "destructive",
          });
          setUploading(false);
        };
        reader.readAsDataURL(file);
      } else {
        // Real mode: upload to Supabase storage
        // Delete old avatar if exists
        if (profile.avatar_url) {
          const oldPath = profile.avatar_url.split('/').pop();
          if (oldPath) {
            await supabase.storage
              .from('avatars')
              .remove([`${user.id}/${oldPath}`]);
          }
        }

        // Upload new avatar
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile with new avatar URL
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setProfile({ ...profile, avatar_url: publicUrl });

        toast({
          title: "Success",
          description: "Avatar updated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      if (isDemoMode) {
        // Demo mode: update localStorage
        updateDemoProfile(profile);
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      } else {
        // Real mode: update Supabase
        const { error } = await supabase
          .from("profiles")
          .update(profile)
          .eq("id", user.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
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

  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || "U";
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4 pb-2">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profile.avatar_url} alt="Profile picture" />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Change Avatar
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG or GIF. Max size 5MB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="First Name"
              value={profile.first_name}
              onChange={(value) => setProfile({ ...profile, first_name: value })}
            />
            <FormInput
              label="Last Name"
              value={profile.last_name}
              onChange={(value) => setProfile({ ...profile, last_name: value })}
            />
          </div>

          <div className="space-y-2">
            <Input
              value={user?.email || ""}
              disabled
              className="h-14 rounded-full px-6 border-[#D5DAE7] bg-muted text-base"
              placeholder="Email"
            />
            <p className="text-xs text-muted-foreground px-2">
              Email cannot be changed from this page
            </p>
          </div>

          <FormPhoneInput
            label="Phone Number"
            value={profile.phone}
            onChange={(value) => setProfile({ ...profile, phone: value })}
          />

          <FormTextarea
            label="About Me"
            value={profile.about}
            onChange={(value) => setProfile({ ...profile, about: value })}
            rows={4}
          />

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Account Status</Label>
            <p className="text-sm text-muted-foreground">
              Your account is active and in good standing
            </p>
          </div>
          <div className="space-y-2">
            <Label>Privacy Settings</Label>
            <p className="text-sm text-muted-foreground">
              Your profile is visible to hosts when you make bookings
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GuestProfile;
