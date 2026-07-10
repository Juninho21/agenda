
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yhahkuzhcxuvwlheyhdo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloYWhrdXpoY3h1dndsaGV5aGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDE4MTMsImV4cCI6MjA4MzQ3NzgxM30.tOdpy5zfEVDrdVOlYpl4QexlN-9KeOfd_UejH_jyjB8'

export const supabase = createClient(supabaseUrl, supabaseKey)
