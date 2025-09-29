import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xghtgushlaxzphffyzbj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnaHRndXNobGF4enBoZmZ5emJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTQxMDEsImV4cCI6MjA3NDU3MDEwMX0.B7Dzk4wI9fckEAT2rDerZT4phq-m7gIbsR9aDTEvu_I'; // copy from Supabase dashboard

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
