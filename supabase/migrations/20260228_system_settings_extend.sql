                                            -- Ensure system_settings exists with required columns
                                            create extension if not exists pgcrypto;
                                            create table if not exists system_settings (
                                            id uuid primary key default gen_random_uuid(),
                                            company_name text,
                                            tax_id text,
                                            company_address text,
                                            currency text,
                                            time_zone text,
                                            date_format text,
                                            email_notifications boolean default true,
                                            push_notifications boolean default false,
                                            two_factor_auth boolean default false,
                                            session_timeout text,
                                            created_at timestamptz default now(),
                                            updated_at timestamptz default now()
                                            );

                                            -- Add columns if they do not exist
                                            do $$
                                            begin
                                            if not exists (select 1 from information_schema.columns where table_name='system_settings' and column_name='company_name') then
                                                alter table system_settings add column company_name text;
                                            end if;
                                            if not exists (select 1 from information_schema.columns where table_name='system_settings' and column_name='tax_id') then
                                                alter table system_settings add column tax_id text;
                                            end if;
                                            if not exists (select 1 from information_schema.columns where table_name='system_settings' and column_name='company_address') then
                                                alter table system_settings add column company_address text;
                                            end if;
                                            if not exists (select 1 from information_schema.columns where table_name='system_settings' and column_name='created_at') then
                                                alter table system_settings add column created_at timestamptz default now();
                                            end if;
                                            if not exists (select 1 from information_schema.columns where table_name='system_settings' and column_name='updated_at') then
                                                alter table system_settings add column updated_at timestamptz default now();
                                            end if;
                                            end $$;

                                            create or replace function trg_set_updated_at()
                                            returns trigger as $$
                                            begin
                                            new.updated_at = now();
                                            return new;
                                            end;
                                            $$ language plpgsql;

                                            drop trigger if exists set_system_settings_updated_at on system_settings;
                                            create trigger set_system_settings_updated_at
                                            before update on system_settings
                                            for each row execute function trg_set_updated_at();
