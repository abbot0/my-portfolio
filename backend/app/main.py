import json
import shutil
import tempfile
from pathlib import Path
from typing import Dict, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .processing import ProcessedRun, process_video_to_glb

app = FastAPI(
    title="Hand Capture Backend",
    version="0.1.0",
    description="Uploads a recorded hand video, extracts keypoints, and returns a stub GLB.",
)

# Allow local dev frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RUN_CACHE: Dict[str, ProcessedRun] = {}


def get_run(run_id: str) -> ProcessedRun:
    run = RUN_CACHE.get(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


def cleanup_path(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/process")
async def process(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    fps: Optional[int] = None,
):
    """Accept a video upload, run MediaPipe, and stash outputs for download."""
    suffix = Path(file.filename or "upload.mp4").suffix
    temp_dir = Path(tempfile.mkdtemp(prefix="upload-hand-"))
    upload_path = temp_dir / f"input{suffix if suffix else '.mp4'}"
    try:
        data = await file.read()
        upload_path.write_bytes(data)

        run = process_video_to_glb(upload_path, target_fps=fps or 30)
        RUN_CACHE[run.run_id] = run

        # Clean up upload temp dir once processing finishes
        background_tasks.add_task(cleanup_path, temp_dir)

        return {
            "run_id": run.run_id,
            "fps": run.fps,
            "frames": run.frames,
            "detected_frames": run.detected_frames,
            "glb_url": f"/runs/{run.run_id}/glb",
            "keypoints_url": f"/runs/{run.run_id}/keypoints",
            "note": "GLB is a stub; wire your rig + animation baking next.",
        }
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/runs/{run_id}/glb")
def download_glb(run: ProcessedRun = Depends(get_run)):
    if not run.glb_path.exists():
        raise HTTPException(status_code=404, detail="GLB not found")
    return FileResponse(
        path=run.glb_path,
        media_type="model/gltf-binary",
        filename=f"hand_{run.run_id}.glb",
    )


@app.get("/runs/{run_id}/keypoints")
def fetch_keypoints(run: ProcessedRun = Depends(get_run)):
    if not run.keypoints_path.exists():
        raise HTTPException(status_code=404, detail="Keypoints not found")
    content = json.loads(run.keypoints_path.read_text())
    return JSONResponse(content=content)


@app.on_event("shutdown")
def cleanup_runs():
    for run in RUN_CACHE.values():
        cleanup_path(run.workdir)
    RUN_CACHE.clear()
