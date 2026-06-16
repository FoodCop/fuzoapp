-- Migration 036: Fix Points RPC Permissions
-- Explicitly grant usage on the private schema to postgres and authenticated users
-- to prevent the "permission denied for schema private" error when awarding points.

DO $$
BEGIN
    -- Check if the private schema exists before granting
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA private TO postgres;';
        EXECUTE 'GRANT USAGE ON SCHEMA private TO authenticated;';
        EXECUTE 'GRANT USAGE ON SCHEMA private TO service_role;';
    END IF;
END
$$;
