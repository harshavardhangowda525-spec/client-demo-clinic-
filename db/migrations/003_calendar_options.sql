alter table clinic_settings add column if not exists calendar_include_patient_name boolean not null default false;
