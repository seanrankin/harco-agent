CREATE OR REPLACE FUNCTION public.validate_email_domain()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.email is not null
    and new.email not like '%@harcofittings.com'
    and new.email != 'sean.rankin@gmail.com'
    and new.email != 'jfralick97@gmail.com'
    and new.email != 'sean.rankin+u1@gmail.com'
    and new.email != 'sean.rankin+u2@gmail.com'
    and new.email != 'sean.rankin+u3@gmail.com'
    and new.email != 'sean.rankin+u4@gmail.com'
    and new.email != 'sean.rankin+u5@gmail.com'
    and new.email != 'jerry2wheeler@gmail.com'
  then
    raise exception 'Only @harcofittings.com email addresses are allowed';
  end if;
  return new;
end;
$function$;
