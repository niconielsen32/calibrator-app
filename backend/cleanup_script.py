#!/usr/bin/env python3
"""
Manual cleanup script for removing old calibration sessions and orphaned files.

Usage:
    python -m backend.cleanup_script [--hours HOURS]

Options:
    --hours HOURS   Delete sessions older than this many hours (default: 24)
"""

import argparse
from .utils.cleanup import cleanup_old_sessions, cleanup_orphaned_files

def main():
    parser = argparse.ArgumentParser(
        description="Cleanup old calibration sessions and orphaned files"
    )
    parser.add_argument(
        "--hours",
        type=int,
        default=24,
        help="Delete sessions older than this many hours (default: 24)"
    )

    args = parser.parse_args()

    print(f"Starting cleanup for sessions older than {args.hours} hours...")
    deleted_sessions = cleanup_old_sessions(args.hours)
    deleted_orphaned = cleanup_orphaned_files()

    print(f"\nCleanup Summary:")
    print(f"  - Sessions deleted: {deleted_sessions}")
    print(f"  - Orphaned directories deleted: {deleted_orphaned}")
    print("\nCleanup completed successfully!")

if __name__ == "__main__":
    main()
