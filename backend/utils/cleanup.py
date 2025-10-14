import os
import shutil
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..database import SessionLocal, Session as DbSession

def cleanup_old_sessions(hours_old: int = 24):
    """
    Delete sessions and associated files older than specified hours.

    Args:
        hours_old: Delete sessions older than this many hours (default 24)
    """
    db = SessionLocal()
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_old)

        # Find old sessions
        old_sessions = db.query(DbSession).filter(
            DbSession.created_at < cutoff_time
        ).all()

        deleted_count = 0
        for session in old_sessions:
            # Delete physical files
            if session.images_dir and os.path.exists(session.images_dir):
                try:
                    shutil.rmtree(session.images_dir)
                    print(f"Deleted directory: {session.images_dir}")
                except Exception as e:
                    print(f"Error deleting directory {session.images_dir}: {e}")

            # Delete from database (cascade will handle related records)
            db.delete(session)
            deleted_count += 1

        db.commit()
        print(f"Cleanup completed: Deleted {deleted_count} old sessions")
        return deleted_count

    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
        return 0
    finally:
        db.close()

def cleanup_orphaned_files():
    """
    Delete upload directories that don't have a corresponding database entry.
    """
    db = SessionLocal()
    try:
        uploads_dir = "uploads"
        if not os.path.exists(uploads_dir):
            return 0

        # Get all session IDs from database
        session_ids = {session.id for session in db.query(DbSession.id).all()}

        # Get all directories in uploads
        deleted_count = 0
        for dir_name in os.listdir(uploads_dir):
            dir_path = os.path.join(uploads_dir, dir_name)
            if os.path.isdir(dir_path) and dir_name not in session_ids:
                try:
                    shutil.rmtree(dir_path)
                    print(f"Deleted orphaned directory: {dir_path}")
                    deleted_count += 1
                except Exception as e:
                    print(f"Error deleting orphaned directory {dir_path}: {e}")

        print(f"Orphaned file cleanup completed: Deleted {deleted_count} directories")
        return deleted_count

    except Exception as e:
        print(f"Error during orphaned file cleanup: {e}")
        return 0
    finally:
        db.close()

if __name__ == "__main__":
    print("Running cleanup tasks...")
    cleanup_old_sessions(24)
    cleanup_orphaned_files()
