CREATE OR REPLACE FUNCTION public.create_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_organization_id UUID;
  organization_name TEXT;
BEGIN
  organization_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NEW.email) || '''s Organization';

  INSERT INTO public.organizations (name, description)
  VALUES (
    organization_name,
    'Default organization created automatically'
  )
  RETURNING id INTO new_organization_id;

  INSERT INTO public.user_organizations (user_id, organization_id, role, invited_by)
  VALUES (NEW.id, new_organization_id, 'owner', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_organization();
