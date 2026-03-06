do $$
begin
  if not exists (select 1 from user_roles where name = 'Super Admin') then
    insert into user_roles (name, description, permissions, level, is_active, created_at, updated_at)
    values ('Super Admin', 'Full system access', null, 0, true, now(), now());
  end if;
end $$;

