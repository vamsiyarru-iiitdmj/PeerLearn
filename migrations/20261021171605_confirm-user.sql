-- Migration: confirm-user
-- Function to activate verified students in auth.users and return user id

CREATE OR REPLACE FUNCTION public.confirm_auth_user(target_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    found_id uuid;
BEGIN
    UPDATE auth.users
    SET email_verified = true, updated_at = now()
    WHERE lower(email) = lower(target_email)
    RETURNING id INTO found_id;

    RETURN found_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.confirm_auth_user(text) TO anon, authenticated;
