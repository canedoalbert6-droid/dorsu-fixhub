-- Migration to add start and finish times to reports
USE dorsu_fixhub;

ALTER TABLE reports
ADD COLUMN date_started DATE,
ADD COLUMN time_started TIME,
ADD COLUMN time_finished TIME,
ADD COLUMN date_completed DATE;
