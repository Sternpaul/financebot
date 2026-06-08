import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
engine = create_engine(os.getenv("SUPABASE_URL"))
with engine.begin() as conn:
    # Grant permissions to Supabase anonymous role
    conn.execute(text("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;"))
    conn.execute(text("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;"))
    
    # Insert default sources if empty
    res = conn.execute(text("SELECT count(*) FROM content_sources")).scalar()
    if res == 0:
        conn.execute(text("INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ('telegram', 'WalterBloomberg', true, true);"))
        conn.execute(text("INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ('telegram', 'ZoomerfiedNews', true, true);"))
        print("Inserted defaults!")
print("Permissions granted!")
