
-- Create tenants table for hosts to manage their tenants
CREATE TABLE public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text,
  email text,
  phone text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Hosts can CRUD their own tenants
CREATE POLICY "Hosts can view their own tenants"
ON public.tenants FOR SELECT
USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can create their own tenants"
ON public.tenants FOR INSERT
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their own tenants"
ON public.tenants FOR UPDATE
USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can delete their own tenants"
ON public.tenants FOR DELETE
USING (auth.uid() = host_user_id);

-- Admins can view all
CREATE POLICY "Admins can view all tenants"
ON public.tenants FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
