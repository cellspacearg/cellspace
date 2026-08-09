-- Fix: SELECT INTO sin filas dejaba prev=NULL (no 0). Uso subquery escalar + coalesce.
create or replace function public.apply_credit_movement() returns trigger
language plpgsql security definer set search_path = public as $$
declare prev numeric;
begin
  prev := coalesce((select balance_after from public.technician_credit_movements
                    where technician_id = new.technician_id
                    order by created_at desc, id desc limit 1), 0);
  if new.type in ('asignacion','devolucion') then new.balance_after := prev + new.amount;
  elsif new.type = 'uso'                       then new.balance_after := prev - new.amount;
  elsif new.type = 'ajuste'                    then new.balance_after := new.amount;
  else new.balance_after := prev;
  end if;
  if new.created_by is null then new.created_by := auth.uid(); end if;
  return new;
end $$;
