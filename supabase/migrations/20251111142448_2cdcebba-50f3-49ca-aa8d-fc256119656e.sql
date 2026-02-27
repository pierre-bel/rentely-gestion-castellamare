-- Create faqs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_admin_id UUID REFERENCES auth.users(id),
  updated_by_admin_id UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access
CREATE POLICY "Admins can view all FAQs"
ON public.faqs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert FAQs"
ON public.faqs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update FAQs"
ON public.faqs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete FAQs"
ON public.faqs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by_admin_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_faqs_updated_at
BEFORE UPDATE ON public.faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_faqs_updated_at();

-- Create search function for FAQs
CREATE OR REPLACE FUNCTION public.admin_search_faqs(
  search_query TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'created_at',
  sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE(
  id UUID,
  question TEXT,
  answer TEXT,
  category TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the caller is an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can search FAQs';
  END IF;

  RETURN QUERY
  SELECT 
    f.id,
    f.question,
    f.answer,
    f.category,
    f.status,
    f.created_at,
    f.updated_at
  FROM faqs f
  WHERE 
    (search_query IS NULL OR f.question ILIKE '%' || search_query || '%')
    AND (category_filter IS NULL OR f.category = category_filter)
    AND (status_filter IS NULL OR f.status = status_filter)
  ORDER BY
    CASE WHEN sort_by = 'created_at' AND sort_order = 'desc' THEN f.created_at END DESC,
    CASE WHEN sort_by = 'created_at' AND sort_order = 'asc' THEN f.created_at END ASC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'desc' THEN f.updated_at END DESC,
    CASE WHEN sort_by = 'updated_at' AND sort_order = 'asc' THEN f.updated_at END ASC,
    f.created_at DESC;
END;
$$;