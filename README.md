# Hand Video to 3D Scaffold

Prototype pipeline for uploading a recorded hand video, extracting 21-point keypoints with MediaPipe, and previewing/downloading a stub GLB animation.

## Backend (FastAPI + MediaPipe)
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Endpoints:
- `POST /process` (multipart `file`) → returns `run_id`, `glb_url`, `keypoints_url`
- `GET /runs/{run_id}/glb` → downloads the GLB stub
- `GET /runs/{run_id}/keypoints` → JSON keypoints for preview

## Frontend (Vite + React + Three.js)
```
cd frontend
npm install
npm run dev
```
Vite is proxied to the backend at `http://127.0.0.1:8000` via `/api`.

## Notes
- The GLB exporter is a stub in `backend/app/processing.py` (no rigged mesh yet). Replace `export_stub_glb` with your rig + animation baking.
- Hand preview uses the JSON keypoints; bones follow the MediaPipe topology.
