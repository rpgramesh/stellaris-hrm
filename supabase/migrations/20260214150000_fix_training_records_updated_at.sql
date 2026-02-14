-- Add updated_at column to training_records if it doesn't exist
ALTER TABLE training_records 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_training_records_updated_at ON training_records;

CREATE TRIGGER update_training_records_updated_at
    BEFORE UPDATE ON training_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
