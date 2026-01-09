ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS technical_responsible_name text,
ADD COLUMN IF NOT EXISTS technical_responsible_crea text,
ADD COLUMN IF NOT EXISTS technical_responsible_phone text,
ADD COLUMN IF NOT EXISTS technical_responsible_email text,
ADD COLUMN IF NOT EXISTS technical_responsible_signature_url text;
