create or replace function public.validate_email_domain()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.email is not null and new.email not like '%@harcofittings.com' then
    raise exception 'Only @harcofittings.com email addresses are allowed';
  end if;
  return new;
end;
$$;

create trigger validate_user_email_domain
  before insert on auth.users
  for each row
  execute function public.validate_email_domain();;
