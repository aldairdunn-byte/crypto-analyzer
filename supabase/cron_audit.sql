-- ==============================================================================
-- Supabase pg_cron Heartbeat & Keep-Alive Audit View
-- Crypto Analyzer Pro 24/7 Cloud Architecture (TASK-17)
-- ==============================================================================

-- 1. Ensure the pg_cron keepalive job is scheduled every 5 minutes
SELECT cron.schedule(
    'crypto-analyzer-keepalive',
    '*/5 * * * *',
    $$
    SELECT
      net.http_get(
        url := 'https://crypto-analyzer-bot-p1ri.onrender.com/health',
        headers := '{"Content-Type": "application/json"}'::jsonb
      ) AS request_id;
    $$
);

-- 2. Audit View: Inspect the last 50 keep-alive execution runs and HTTP status codes
CREATE OR REPLACE VIEW public.cron_heartbeat_audit AS
SELECT 
    j.jobname,
    j.schedule,
    d.runid,
    d.job_pid,
    d.database,
    d.username,
    d.command,
    d.status AS execution_status,
    d.return_message,
    d.start_time,
    d.end_time,
    (d.end_time - d.start_time) AS duration
FROM cron.job j
LEFT JOIN cron.job_run_details d ON j.jobid = d.jobid
WHERE j.jobname = 'crypto-analyzer-keepalive'
ORDER BY d.start_time DESC
LIMIT 50;

-- 3. Alert Query: Identify any failed pings in the last 24 hours
-- SELECT * FROM public.cron_heartbeat_audit WHERE execution_status != 'succeeded' AND start_time > NOW() - INTERVAL '24 hours';
