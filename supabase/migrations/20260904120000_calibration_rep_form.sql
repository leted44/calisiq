-- Tenue du corps pendant une série, dans les échantillons de calibration.
--
-- Distincte de rep_hip_swing, et les deux sont nécessaires : l'oscillation
-- mesure l'élan, la forme mesure la posture. Une série entièrement cassée à la
-- hanche a une oscillation faible, donc un bon score de contrôle, alors que sa
-- position est mauvaise sur toutes les répétitions.
alter table public.calibration_samples
  add column if not exists rep_form double precision;
