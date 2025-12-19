import axios from "axios";
import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  Bounds,
  Center,
  OrbitControls,
  PerspectiveCamera,
  PresentationControls,
  useAnimations,
  useGLTF,
} from "@react-three/drei";

// Allow overriding API base for non-proxied builds: set VITE_API_BASE=http://127.0.0.1:8000
axios.defaults.baseURL = import.meta.env.VITE_API_BASE || "/api";

const BONE_PAIRS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

function HandSkeleton({ frames, fps }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const intervalRef = useRef();

  useEffect(() => {
    setFrameIdx(0);
  }, [frames]);

  useEffect(() => {
    if (!frames || frames.length === 0) {
      return undefined;
    }
    clearInterval(intervalRef.current);
    const ms = 1000 / (fps || 30);
    intervalRef.current = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, ms);
    return () => clearInterval(intervalRef.current);
  }, [frames, fps]);

  const positions = useMemo(() => {
    if (!frames || frames.length === 0) return [];
    const current = frames[frameIdx] || frames[0];
    return current.map(([x, y, z]) => [x, -y, z]); // flip Y for a nicer view
  }, [frames, frameIdx]);

  if (!positions.length) return null;

  const bones = useMemo(() => {
    const results = [];
    for (const [a, b] of BONE_PAIRS) {
      const start = new THREE.Vector3(...positions[a]);
      const end = new THREE.Vector3(...positions[b]);
      const dir = new THREE.Vector3().subVectors(end, start);
      const length = dir.length();
      if (length < 1e-4) continue;
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const quat = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize(),
      );
      results.push({ mid, quat, length });
    }
    return results;
  }, [positions]);

  return (
    <>
      {positions.map((p, idx) => (
        <mesh key={idx} position={p}>
          <sphereGeometry args={[0.015, 16, 16]} />
          <meshStandardMaterial color={idx === 0 ? "#ff7bac" : "#b1f4ff"} />
        </mesh>
      ))}
      {bones.map((bone, idx) => (
        <mesh key={idx} position={bone.mid} quaternion={bone.quat}>
          <cylinderGeometry args={[0.012, 0.012, bone.length, 10]} />
          <meshStandardMaterial color="#7ce7ff" />
        </mesh>
      ))}
    </>
  );
}

function ModelScene({ url }) {
  const gltf = useGLTF(url, true);
  const group = useRef();
  const { actions } = useAnimations(gltf.animations || [], group);

  useEffect(() => {
    if (!actions) return;
    Object.values(actions).forEach((action) => {
      if (action) {
        action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
      }
    });
  }, [actions]);

  if (!gltf?.scene) return null;
  return (
    <group ref={group} scale={[10, 10, 10]}>
      <primitive object={gltf.scene} dispose={null} />
    </group>
  );
}

class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "GLB load/render failed" };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error("GLB load/render failed:", error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return (
          <div className="placeholder">
            <p>GLB failed to load: {this.state.message}</p>
            {this.props.fallback}
          </div>
        );
      }
      return null;
    }
    return this.props.children;
  }
}

function HandViewer({ glbUrl, frames, fps }) {
  const hasFrames = frames && frames.length > 0;
  const nothingToShow = !glbUrl && !hasFrames;

  if (nothingToShow) {
    return (
      <div className="placeholder">
        <p>Upload a video to preview the reconstructed hand motion.</p>
      </div>
    );
  }

  return (
    <ModelBoundary
      fallback={
        <div className="fallback-3d">
          <Canvas className="preview-canvas">
            <color attach="background" args={["#0b1224"]} />
            <ambientLight intensity={0.5} />
            <directionalLight position={[2, 2, 2]} intensity={0.8} />
            <PerspectiveCamera makeDefault position={[1.8, 1.2, 2.2]} />
            <OrbitControls />
            <HandSkeleton frames={frames} fps={fps} />
          </Canvas>
        </div>
      }
    >
      <Canvas className="preview-canvas">
        <color attach="background" args={["#0b1224"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1.0} />
        <PerspectiveCamera makeDefault position={[0, 0, 4]} />
        <OrbitControls target={[0, 0, 0]} />

        <Bounds fit observe margin={1.5}>
          {glbUrl ? (
            <Suspense fallback={null}>
              <PresentationControls global snap>
                <ModelScene url={glbUrl} />
              </PresentationControls>
            </Suspense>
          ) : null}
          {hasFrames ? <HandSkeleton frames={frames} fps={fps} /> : null}
        </Bounds>
      </Canvas>
    </ModelBoundary>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null);
  const [keypoints, setKeypoints] = useState(null);
  const [glbUrl, setGlbUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    return () => {
      if (glbUrl) {
        URL.revokeObjectURL(glbUrl);
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [glbUrl, videoUrl]);

  const handleUpload = (event) => {
    const selected = event.target.files?.[0];
    setFile(selected);
    setError(null);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (selected) setVideoUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select a video file first.");
      return;
    }
    setStatus("processing");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post("/process", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRun(res.data);

      const keyRes = await axios.get(res.data.keypoints_url);
      setKeypoints(keyRes.data);

      const glbRes = await axios.get(res.data.glb_url, {
        responseType: "blob",
      });
      const blobUrl = URL.createObjectURL(glbRes.data);
      setGlbUrl(blobUrl);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err?.response?.data?.detail || err.message);
    }
  };

  return (
    <div className="page">
      <header>
        <div>
          <p className="eyebrow">Hand-to-3D</p>
          <h1>Upload a recorded hand video, preview the tracked motion, download the GLB.</h1>
          <p className="subtle">
            Backend runs MediaPipe for 21-point keypoints, smooths, and emits a stub GLB. Replace the
            exporter with your rigged hand when ready.
          </p>
          <div className="controls">
            <label className="upload-btn">
              <input type="file" accept="video/*" onChange={handleUpload} hidden />
              {file ? `Selected: ${file.name}` : "Choose video"}
            </label>
            <button onClick={handleSubmit} disabled={status === "processing"}>
              {status === "processing" ? "Processing..." : "Process video"}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {run && (
            <div className="meta">
              <span>Run: {run.run_id}</span>
              <span>
                Frames: {run.frames} (detected {run.detected_frames})
              </span>
              <span>FPS: {run.fps}</span>
              {glbUrl && (
                <a href={glbUrl} download={`hand_${run.run_id}.glb`}>
                  Download GLB
                </a>
              )}
            </div>
          )}
        </div>
      </header>
      <main className="panes">
        <section className="pane">
          <div className="pane-head">
            <h2>Source video</h2>
            <span className="muted">{file ? "Previewing selected file" : "Upload to preview"}</span>
          </div>
          {videoUrl ? (
            <video className="video-player" src={videoUrl} controls muted />
          ) : (
            <div className="placeholder">
              <p>Select a video to view it here.</p>
            </div>
          )}
        </section>

        <section className="pane">
          <div className="pane-head">
            <h2>3D reconstruction</h2>
            <span className="muted">
              {glbUrl ? "Showing GLB from backend" : "No GLB yet - skeleton preview if points exist"}
            </span>
          </div>
          <HandViewer glbUrl={glbUrl} frames={keypoints?.frames} fps={keypoints?.fps} />
        </section>
      </main>
      <footer>
        <p>
          Tip: the GLB contains only metadata right now. Add your rig + animation baking in{" "}
          <code>backend/app/processing.py</code>.
        </p>
      </footer>
    </div>
  );
}
