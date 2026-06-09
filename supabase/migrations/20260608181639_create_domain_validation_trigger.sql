create or replace function public.validate_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null then
    raise exception 'Email is required';
  end if;

  -- Allow hardcoded dev exception
  if new.email = 'sean.rankin@gmail.com' then
    return new;
  end if;

  -- Enforce domain restriction
  if new.email not like '%@harcofittings.com' then
    raise exception 'Only @harcofittings.com email addresses are allowed';
  end if;

  return new;
end;
$$;

-- Revoke execute from public-facing roles
revoke execute on function public.validate_email_domain() from anon;
revoke execute on function public.validate_email_domain() from authenticated;

-- Create trigger (drop first to make idempotent)
drop trigger if exists validate_user_email_domain on auth.users;
create trigger validate_user_email_domain
  before insert on auth.users
  for each row
  execute function public.validate_email_domain();
