"""
Deprecated: Streamlit UI entrypoint has been removed.

Use the FastAPI backend and the React frontend instead.

- Backend: uvicorn backend.main:app --host 0.0.0.0 --port 8000
- Frontend: cd frontend && npm install && npm run dev (default 5173)
"""

if __name__ == "__main__":
    print("Streamlit UI removed. Start FastAPI and React instead.")
    print("Backend: uvicorn backend.main:app --host 0.0.0.0 --port 8000")
    print("Frontend: cd frontend && npm install && npm run dev")

