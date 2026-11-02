"""
Script to create a complete JSON backup of company-related MongoDB collections
and reset the database cleanly for the Company & Branch architecture.
"""

import os
import sys
import json
from datetime import datetime, timezone
from bson import json_util

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from utils.db import Database

def create_backup():
    db = Database.get_db()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backups"))
    os.makedirs(backup_dir, exist_ok=True)
    backup_file = os.path.join(backup_dir, f"db_backup_{timestamp}.json")

    collections_to_backup = [
        "companies",
        "branches",
        "generated_reviews",
        "generation_logs",
        "user_sessions",
        "users",
        "categories"
    ]

    backup_data = {
        "timestamp": timestamp,
        "database": db.name,
        "collections": {}
    }

    total_records = 0
    for col_name in collections_to_backup:
        if col_name in db.list_collection_names():
            docs = list(db[col_name].find({}))
            backup_data["collections"][col_name] = docs
            total_records += len(docs)
            print(f"[BACKUP] Collection '{col_name}': {len(docs)} documents exported.")
        else:
            backup_data["collections"][col_name] = []
            print(f"[BACKUP] Collection '{col_name}': not present, skipped.")

    # Write JSON using bson.json_util to preserve ObjectIds and datetimes
    with open(backup_file, "w", encoding="utf-8") as f:
        f.write(json_util.dumps(backup_data, indent=2))

    file_size_kb = os.path.getsize(backup_file) / 1024
    print(f"\n[BACKUP SUCCESS] Saved {total_records} records to: {backup_file} ({file_size_kb:.2f} KB)")
    return backup_file

def reset_company_data():
    db = Database.get_db()
    print("\n--- INITIATING SAFE COMPANY DATA RESET ---")

    # 1. Collections to reset
    collections_to_clear = [
        "companies",
        "branches",
        "generated_reviews",
        "generation_logs"
    ]

    for col in collections_to_clear:
        count = db[col].count_documents({})
        res = db[col].delete_many({})
        print(f"[RESET] Deleted {res.deleted_count} documents from '{col}' (was: {count}).")

    # 2. Verify preserved collections
    cat_count = db.categories.count_documents({})
    user_count = db.users.count_documents({})
    print(f"[PRESERVED] Categories collection intact: {cat_count} categories.")
    print(f"[PRESERVED] Users collection intact: {user_count} users.")
    print("[RESET COMPLETE] Company and review data reset successfully.")

if __name__ == "__main__":
    backup_path = create_backup()
    if os.path.exists(backup_path) and os.path.getsize(backup_path) > 0:
        reset_company_data()
    else:
        print("[ABORT] Backup verification failed! Reset not performed.")

