-- Migration: confirm-user-password
-- Update confirm_auth_user to support setting password hash on auth.users

CREATE OR REPLACE FUNCTION public.confirm_auth_user(target_email text, new_password text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    found_id uuid;
BEGIN
    IF new_password IS NOT NULL AND length(new_password) > 0 THEN
      UPDATE auth.users
      SET email_verified = true,
          password = crypt(new_password, gen_salt('bf', 10)),
          updated_at = now()
      WHERE lower(email) = lower(target_email)
      RETURNING id INTO found_id;
    ELSE
      UPDATE auth.users
      SET email_verified = true, updated_at = now()
      WHERE lower(email) = lower(target_email)
      RETURNING id INTO found_id;
    END IF;

    RETURN found_id;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.confirm_auth_user(text, text) TO anon, authenticated;
