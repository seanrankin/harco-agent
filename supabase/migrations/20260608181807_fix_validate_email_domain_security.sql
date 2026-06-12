create or replace function public.validate_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null and new.email not like '%@harcofittings.com' then
    raise exception 'Only @harcofittings.com email addresses are allowed';
  end if;
  return new;
end;
$$;

revoke execute on function public.validate_email_domain() from anon;
revoke execute on function public.validate_email_domain() from authenticated;;
