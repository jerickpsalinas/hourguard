-- Sync full_name: when hg_members.full_name changes, update portal_users too.
-- Single source of truth for the name is hg_members (where the user edits it);
-- portal_users is kept in sync automatically.

create or replace function hg_sync_full_name()
returns trigger
language plpgsql security definer
as $$
begin
  if new.full_name is distinct from old.full_name then
    update portal_users
    set full_name = new.full_name
    where auth_user_id = new.auth_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists hg_sync_full_name_trigger on hg_members;

create trigger hg_sync_full_name_trigger
  after update on hg_members
  for each row
  execute function hg_sync_full_name();
