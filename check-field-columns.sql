SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Field' AND table_schema = 'public';
SELECT typname FROM pg_type WHERE typname = 'FieldStatus';
