
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE public.control_metrics (
  id INT PRIMARY KEY DEFAULT 1,
  patients INT NOT NULL DEFAULT 220,
  nurses INT NOT NULL DEFAULT 84,
  staff INT NOT NULL DEFAULT 40,
  flu_cases INT NOT NULL DEFAULT 12,
  tb_cases INT NOT NULL DEFAULT 3,
  ems_active INT NOT NULL DEFAULT 4,
  ems_eta_min INT NOT NULL DEFAULT 7,
  panado_units INT NOT NULL DEFAULT 67,
  amoxil_units INT NOT NULL DEFAULT 42,
  icu_load INT NOT NULL DEFAULT 78,
  er_wait_min INT NOT NULL DEFAULT 22,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.control_metrics (id) VALUES (1);

GRANT SELECT ON public.control_metrics TO anon, authenticated;
GRANT ALL ON public.control_metrics TO service_role;

ALTER TABLE public.control_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read control metrics"
  ON public.control_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.control_metrics;
ALTER TABLE public.control_metrics REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.tick_control_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j INT;
BEGIN
  UPDATE public.control_metrics SET
    patients      = GREATEST(150, LEAST(320, patients      + (floor(random()*7)::int - 3))),
    nurses        = GREATEST(60,  LEAST(120, nurses        + (floor(random()*3)::int - 1))),
    staff         = GREATEST(20,  LEAST(80,  staff         + (floor(random()*3)::int - 1))),
    flu_cases     = GREATEST(0,   LEAST(60,  flu_cases     + (floor(random()*3)::int - 1))),
    tb_cases      = GREATEST(0,   LEAST(20,  tb_cases      + (floor(random()*3)::int - 1))),
    ems_active    = GREATEST(0,   LEAST(12,  ems_active    + (floor(random()*3)::int - 1))),
    ems_eta_min   = GREATEST(2,   LEAST(25,  ems_eta_min   + (floor(random()*3)::int - 1))),
    panado_units  = GREATEST(0,   LEAST(500, panado_units  + (floor(random()*5)::int - 3))),
    amoxil_units  = GREATEST(0,   LEAST(500, amoxil_units  + (floor(random()*5)::int - 3))),
    icu_load      = GREATEST(20,  LEAST(100, icu_load      + (floor(random()*5)::int - 2))),
    er_wait_min   = GREATEST(2,   LEAST(90,  er_wait_min   + (floor(random()*5)::int - 2))),
    updated_at    = now()
  WHERE id = 1;
END;
$$;

SELECT cron.schedule(
  'tick-control-metrics',
  '5 seconds',
  $$ SELECT public.tick_control_metrics(); $$
);
