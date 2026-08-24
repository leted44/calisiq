alter table calibration_samples
  add column if not exists knee_angle numeric,
  add column if not exists shoulder_flexion_angle numeric;
