import json
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
from mediapipe import solutions
from pygltflib import (
    ELEMENT_ARRAY_BUFFER,
    ARRAY_BUFFER,
    Accessor,
    Animation,
    AnimationChannel,
    AnimationChannelTarget,
    AnimationSampler,
    Asset,
    Buffer,
    BufferView,
    GLTF2,
    Material,
    Mesh,
    Node,
    Primitive,
    Scene,
    Skin,
)

# 21-point MediaPipe hand topology in order
JOINT_NAMES = [
    "wrist",
    "thumb_cmc",
    "thumb_mcp",
    "thumb_ip",
    "thumb_tip",
    "index_mcp",
    "index_pip",
    "index_dip",
    "index_tip",
    "middle_mcp",
    "middle_pip",
    "middle_dip",
    "middle_tip",
    "ring_mcp",
    "ring_pip",
    "ring_dip",
    "ring_tip",
    "pinky_mcp",
    "pinky_pip",
    "pinky_dip",
    "pinky_tip",
]


@dataclass
class ProcessedRun:
    run_id: str
    workdir: Path
    glb_path: Path
    keypoints_path: Path
    fps: float
    frames: int
    detected_frames: int


def process_video_to_glb(video_path: Path, target_fps: int = 30) -> ProcessedRun:
    """High-level entry: extract hand keypoints, smooth, and export a stub GLB."""
    keypoints, input_fps = extract_hand_keypoints(video_path, target_fps=target_fps)
    detected_frames = sum(1 for f in keypoints if f is not None)
    filled = interpolate_missing_frames(keypoints)
    normalized = [normalize_frame(frame) for frame in filled]
    smoothed = smooth_sequence(normalized, window=5)

    run_id = uuid.uuid4().hex
    workdir = Path(tempfile.mkdtemp(prefix=f"hand-run-{run_id}-"))
    keypoints_path = workdir / "keypoints.json"
    glb_path = workdir / "hand.glb"

    payload = {"fps": target_fps, "input_fps": input_fps, "frames": smoothed}
    keypoints_path.write_text(json.dumps(payload))

    rig_path = Path(__file__).resolve().parent / ".." / "assets" / "hand_rig.glb"
    if rig_path.exists():
        export_with_rig_glb(glb_path, smoothed, target_fps, rig_path)
    else:
        export_rigged_glb(glb_path, smoothed, target_fps)

    return ProcessedRun(
        run_id=run_id,
        workdir=workdir,
        glb_path=glb_path,
        keypoints_path=keypoints_path,
        fps=target_fps,
        frames=len(smoothed),
        detected_frames=detected_frames,
    )


def extract_hand_keypoints(
    video_path: Path, target_fps: int = 30
) -> Tuple[List[Optional[List[List[float]]]], float]:
    """Run MediaPipe Hands over a video and return per-frame 21 keypoints."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video at {video_path}")

    input_fps = cap.get(cv2.CAP_PROP_FPS) or target_fps
    stride = max(int(round(input_fps / target_fps)), 1)

    frames: List[Optional[List[List[float]]]] = []
    frame_idx = 0
    with solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as hands:
        while True:
            success, frame = cap.read()
            if not success:
                break
            if frame_idx % stride != 0:
                frame_idx += 1
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = hands.process(rgb)
            if result.multi_hand_landmarks:
                lm = result.multi_hand_landmarks[0]
                coords = [[p.x, p.y, p.z] for p in lm.landmark]
                frames.append(coords)
            else:
                frames.append(None)
            frame_idx += 1
    cap.release()
    return frames, input_fps


def interpolate_missing_frames(
    frames: List[Optional[List[List[float]]]]
) -> List[List[List[float]]]:
    """Fill gaps with linear interpolation and repeat edges."""
    if not frames:
        return []

    # Precompute indices of valid frames
    valid_indices = [i for i, f in enumerate(frames) if f is not None]
    if not valid_indices:
        # Nothing detected; return zeros to keep downstream happy
        zeros = [[0.0, 0.0, 0.0] for _ in JOINT_NAMES]
        return [zeros for _ in frames]

    filled: List[List[List[float]]] = []
    last_valid = valid_indices[0]
    for i, frame in enumerate(frames):
        if frame is not None:
            filled.append(frame)
            last_valid = i
            continue

        # Find next valid
        next_valid = next((idx for idx in valid_indices if idx > i), None)
        if next_valid is None:
            # Extend last valid forward
            filled.append(frames[last_valid])
            continue

        alpha = (i - last_valid) / (next_valid - last_valid)
        prev_frame = np.array(frames[last_valid])
        next_frame = np.array(frames[next_valid])
        interp = prev_frame * (1 - alpha) + next_frame * alpha
        filled.append(interp.tolist())
    return filled


def normalize_frame(frame: List[List[float]]) -> List[List[float]]:
    """Root at wrist and scale by wrist-middle_mcp distance for stability."""
    arr = np.array(frame)
    wrist = arr[0]
    middle_mcp = arr[9]
    scale = np.linalg.norm(middle_mcp - wrist)
    if scale < 1e-6:
        scale = 1.0
    HAND_SCALE = 5.0  # bump overall size so the viewer auto-fit is readable
    normalized = ((arr - wrist) / scale) * HAND_SCALE
    return normalized.tolist()


def smooth_sequence(
    frames: List[List[List[float]]], window: int = 5
) -> List[List[List[float]]]:
    """Apply a simple moving average for temporal smoothing."""
    if window <= 1 or len(frames) <= 2:
        return frames
    pad = window // 2
    padded = [frames[0]] * pad + frames + [frames[-1]] * pad

    smoothed: List[List[List[float]]] = []
    for i in range(len(frames)):
        slice_frames = padded[i : i + window]
        arr = np.array(slice_frames)
        avg = np.mean(arr, axis=0)
        smoothed.append(avg.tolist())
    return smoothed


def export_stub_glb(output_path: Path, frames: List[List[List[float]]], fps: int) -> None:
    """Create a minimal GLB with scene + metadata so the pipeline runs end-to-end."""
    gltf = GLTF2(
        asset=Asset(version="2.0"),
        scenes=[Scene(nodes=[0])],
        nodes=[Node(name="hand_root", translation=[0, 0, 0])],
    )
    gltf.extras = {
        "note": "Stub GLB; replace with a rigged hand + animation baking.",
        "frames": len(frames),
        "fps": fps,
        "joints": JOINT_NAMES,
    }
    gltf.scene = 0
    gltf.save_binary(str(output_path))


def export_rigged_glb(output_path: Path, frames: List[List[List[float]]], fps: int) -> None:
    """
    Export a lightweight GLB with:
    - Skinned, low-poly hand mesh bound to MediaPipe joints
    - Nodes for each joint (MediaPipe topology)
    - Translation animation per joint (one sampler/channel each)
    """
    if not frames:
        export_stub_glb(output_path, frames, fps)
        return

    frame_count = len(frames)
    times = np.arange(frame_count, dtype=np.float32) / float(fps)
    data = bytearray()
    buffer_views: List[BufferView] = []
    accessors: List[Accessor] = []

    def pad4():
        padding = (4 - (len(data) % 4)) % 4
        if padding:
            data.extend(b"\x00" * padding)

    def add_view(raw: bytes, target: Optional[int] = None) -> int:
        offset = len(data)
        data.extend(raw)
        pad4()
        buffer_views.append(
            BufferView(
                buffer=0,
                byteOffset=offset,
                byteLength=len(raw),
                target=target,
            )
        )
        return len(buffer_views) - 1

    def add_accessor(
        view_idx: int,
        component_type: int,
        count: int,
        type_str: str,
        min_vals: Optional[List[float]] = None,
        max_vals: Optional[List[float]] = None,
    ) -> int:
        accessors.append(
            Accessor(
                bufferView=view_idx,
                componentType=component_type,
                count=count,
                type=type_str,
                min=min_vals,
                max=max_vals,
            )
        )
        return len(accessors) - 1

    # Shared input times accessor for all samplers
    time_view = add_view(times.tobytes(), target=None)
    time_accessor = add_accessor(
        time_view,
        component_type=5126,  # FLOAT
        count=frame_count,
        type_str="SCALAR",
        min_vals=[float(times.min())],
        max_vals=[float(times.max())],
    )

    frames_np = np.array(frames, dtype=np.float32)  # (F, 21, 3)

    # Build per-joint output accessors
    output_accessors: List[int] = []
    for j in range(len(JOINT_NAMES)):
        coords = frames_np[:, j, :]  # (F,3)
        view = add_view(coords.tobytes(), target=None)
        mins = coords.min(axis=0).tolist()
        maxs = coords.max(axis=0).tolist()
        output_accessors.append(
            add_accessor(
                view,
                component_type=5126,  # FLOAT
                count=frame_count,
                type_str="VEC3",
                min_vals=mins,
                max_vals=maxs,
            )
        )

    # Low-poly hand mesh (palm + simple finger strips), skinned to joints
    palm = [
        (-0.25, 0.0, 0.0),
        (0.25, 0.0, 0.0),
        (-0.25, 0.35, 0.0),
        (0.25, 0.35, 0.0),
    ]

    fingers = []
    finger_x = [-0.18, -0.09, 0.0, 0.09, 0.18]
    finger_tip_y = [0.6, 0.75, 0.8, 0.75, 0.7]
    finger_width = 0.035
    finger_joint_targets = [
        (2, 4),  # thumb mcp -> tip
        (5, 8),  # index mcp -> tip
        (9, 12),  # middle
        (13, 16),  # ring
        (17, 20),  # pinky
    ]
    for x, tip_y in zip(finger_x, finger_tip_y):
        fingers.extend(
            [
                (x - finger_width, 0.35, 0.0),
                (x + finger_width, 0.35, 0.0),
                (x - finger_width, tip_y, 0.0),
                (x + finger_width, tip_y, 0.0),
            ]
        )

    positions_list = palm + fingers
    positions = np.array(positions_list, dtype=np.float32)
    normals = np.tile(np.array([0.0, 0.0, 1.0], dtype=np.float32), (positions.shape[0], 1))

    # Triangles: palm + each finger quad
    indices = [
        0,
        1,
        2,
        2,
        1,
        3,  # palm
    ]
    finger_base = len(palm)
    for i in range(5):
        offset = finger_base + i * 4
        indices.extend(
            [
                offset,
                offset + 1,
                offset + 2,
                offset + 2,
                offset + 1,
                offset + 3,
            ]
        )
    indices = np.array(indices, dtype=np.uint16)

    # Skin weights: palm -> wrist (0); fingers -> respective tip joint
    joints_attr = []
    weights_attr = []
    # palm
    for _ in palm:
        joints_attr.append([0, 0, 0, 0])
        weights_attr.append([1.0, 0.0, 0.0, 0.0])
    # fingers
    for idx, _ in enumerate(fingers):
        finger_idx = idx // 4  # 0..4
        base_joint, tip_joint = finger_joint_targets[finger_idx]
        # base verts (0,1) -> base joint; tip verts (2,3) -> tip joint
        is_tip_vert = (idx % 4) >= 2
        joint_target = tip_joint if is_tip_vert else base_joint
        joints_attr.append([joint_target, 0, 0, 0])
        weights_attr.append([1.0, 0.0, 0.0, 0.0])

    joints_arr = np.array(joints_attr, dtype=np.uint16)
    weights_arr = np.array(weights_attr, dtype=np.float32)

    pos_view = add_view(positions.tobytes(), target=ARRAY_BUFFER)
    norm_view = add_view(normals.tobytes(), target=ARRAY_BUFFER)
    idx_view = add_view(indices.tobytes(), target=ELEMENT_ARRAY_BUFFER)
    joints_view = add_view(joints_arr.tobytes(), target=ARRAY_BUFFER)
    weights_view = add_view(weights_arr.tobytes(), target=ARRAY_BUFFER)

    pos_accessor = add_accessor(
        pos_view,
        component_type=5126,  # FLOAT
        count=len(positions),
        type_str="VEC3",
        min_vals=positions.min(axis=0).tolist(),
        max_vals=positions.max(axis=0).tolist(),
    )
    norm_accessor = add_accessor(
        norm_view,
        component_type=5126,  # FLOAT
        count=len(normals),
        type_str="VEC3",
        min_vals=normals.min(axis=0).tolist(),
        max_vals=normals.max(axis=0).tolist(),
    )
    idx_accessor = add_accessor(
        idx_view,
        component_type=5123,  # UNSIGNED_SHORT
        count=len(indices),
        type_str="SCALAR",
    )
    joints_accessor = add_accessor(
        joints_view,
        component_type=5123,  # UNSIGNED_SHORT
        count=len(joints_arr),
        type_str="VEC4",
    )
    weights_accessor = add_accessor(
        weights_view,
        component_type=5126,  # FLOAT
        count=len(weights_arr),
        type_str="VEC4",
    )

    mesh = Mesh(
        primitives=[
            Primitive(
                attributes={
                    "POSITION": pos_accessor,
                    "NORMAL": norm_accessor,
                    "JOINTS_0": joints_accessor,
                    "WEIGHTS_0": weights_accessor,
                },
                indices=idx_accessor,
                material=0,
                mode=4,  # TRIANGLES
            )
        ]
    )

    # Node hierarchy matching MediaPipe hand
    parents = {
        0: None,  # wrist
        1: 0,
        2: 1,
        3: 2,
        4: 3,
        5: 0,
        6: 5,
        7: 6,
        8: 7,
        9: 0,
        10: 9,
        11: 10,
        12: 11,
        13: 0,
        14: 13,
        15: 14,
        16: 15,
        17: 0,
        18: 17,
        19: 18,
        20: 19,
    }

    nodes: List[Node] = [
        Node(name=JOINT_NAMES[i], children=[], translation=frames_np[0, i, :].tolist())
        for i in range(len(JOINT_NAMES))
    ]
    root_nodes: List[int] = []
    for idx, parent in parents.items():
        if parent is None:
            root_nodes.append(idx)
        else:
            nodes[parent].children.append(idx)

    # Skin (identity inverse bind)
    ibm = np.repeat(np.eye(4, dtype=np.float32)[None, ...], len(JOINT_NAMES), axis=0).reshape(-1)
    ibm_view = add_view(ibm.tobytes(), target=None)
    ibm_accessor = add_accessor(
        ibm_view,
        component_type=5126,  # FLOAT
        count=len(JOINT_NAMES),
        type_str="MAT4",
    )
    skin = Skin(
        inverseBindMatrices=ibm_accessor,
        joints=list(range(len(JOINT_NAMES))),
        skeleton=0,  # wrist
    )

    # Mesh node skinned to the joints
    mesh_node_index = len(nodes)
    nodes.append(
        Node(
            name="hand_mesh",
            mesh=0,
            skin=0,
        )
    )

    # Animation with per-joint translation channels
    anim_samplers: List[AnimationSampler] = []
    anim_channels: List[AnimationChannel] = []
    for j, out_accessor in enumerate(output_accessors):
        sampler_idx = len(anim_samplers)
        anim_samplers.append(
            AnimationSampler(
                input=time_accessor,
                output=out_accessor,
                interpolation="LINEAR",
            )
        )
        anim_channels.append(
            AnimationChannel(
                sampler=sampler_idx,
                target=AnimationChannelTarget(node=j, path="translation"),
            )
        )

    gltf = GLTF2(
        asset=Asset(version="2.0"),
        buffers=[Buffer(byteLength=len(data))],
        bufferViews=buffer_views,
        accessors=accessors,
        meshes=[mesh],
        materials=[Material(pbrMetallicRoughness={"baseColorFactor": [0.8, 0.9, 1.0, 1.0]}, doubleSided=True)],
        nodes=nodes,
        scenes=[Scene(nodes=[mesh_node_index] + root_nodes)],
        animations=[Animation(samplers=anim_samplers, channels=anim_channels)],
        skins=[skin],
    )
    gltf.extras = {
        "note": "Procedural skinned hand GLB (low-poly mesh bound to MediaPipe joints). Replace with a detailed skinned hand as needed.",
        "frames": frame_count,
        "fps": fps,
        "joints": JOINT_NAMES,
    }
    gltf.scene = 0
    gltf.set_binary_blob(data)
    gltf.save_binary(str(output_path))


def export_with_rig_glb(
    output_path: Path, frames: List[List[List[float]]], fps: int, rig_path: Path
) -> None:
    """Retarget keypoints onto a provided skinned hand rig GLB."""
    if not frames:
        export_stub_glb(output_path, frames, fps)
        return

    gltf = GLTF2().load_binary(str(rig_path))
    if gltf.bufferViews is None:
        gltf.bufferViews = []
    if gltf.accessors is None:
        gltf.accessors = []
    if gltf.animations is None:
        gltf.animations = []

    name_to_idx = {n.name: i for i, n in enumerate(gltf.nodes or []) if n and n.name}
    # Mapping MediaPipe joints -> rig node names
    rig_map = [
        (0, "hand.R_02"),  # wrist
        (1, "thumb_base.R_03"),
        (2, "thumb_01.R_08"),
        (3, "thumb_02.R_09"),
        (4, "thumb_03.R_010"),
        (5, "index_base.R_012"),
        (6, "index_01.R_017"),
        (7, "index_02.R_018"),
        (8, "index_03.R_019"),
        (9, "middle_base.R_020"),
        (10, "middle_01.R_025"),
        (11, "middle_02.R_026"),
        (12, "middle_03.R_027"),
        (13, "ring_base.R_028"),
        (14, "ring_01.R_033"),
        (15, "ring_02.R_034"),
        (16, "ring_03.R_035"),
        (17, "pinky_base.R_036"),
        (18, "pinky_01.R_041"),
        (19, "pinky_02.R_042"),
        (20, "pinky_03.R_043"),
    ]

    mapped = []
    for mp_idx, name in rig_map:
        if name not in name_to_idx:
            raise RuntimeError(f"Rig node '{name}' not found in {rig_path}")
        mapped.append((mp_idx, name_to_idx[name]))

    frames_np = np.array(frames, dtype=np.float32)  # (F,21,3)
    frame_count = len(frames_np)
    times = np.arange(frame_count, dtype=np.float32) / float(fps)

    data = bytearray(gltf.binary_blob() or b"")
    buffer_idx = 0

    def pad4():
        padding = (4 - (len(data) % 4)) % 4
        if padding:
            data.extend(b"\x00" * padding)

    def add_view(raw: bytes, target: Optional[int] = None) -> int:
        offset = len(data)
        data.extend(raw)
        pad4()
        gltf.bufferViews.append(
            BufferView(
                buffer=buffer_idx,
                byteOffset=offset,
                byteLength=len(raw),
                target=target,
            )
        )
        return len(gltf.bufferViews) - 1

    def add_accessor(
        view_idx: int,
        component_type: int,
        count: int,
        type_str: str,
        min_vals: Optional[List[float]] = None,
        max_vals: Optional[List[float]] = None,
    ) -> int:
        gltf.accessors.append(
            Accessor(
                bufferView=view_idx,
                componentType=component_type,
                count=count,
                type=type_str,
                min=min_vals,
                max=max_vals,
            )
        )
        return len(gltf.accessors) - 1

    time_view = add_view(times.tobytes(), target=None)
    time_accessor = add_accessor(
        time_view,
        component_type=5126,
        count=frame_count,
        type_str="SCALAR",
        min_vals=[float(times.min())],
        max_vals=[float(times.max())],
    )

    anim_samplers: List[AnimationSampler] = []
    anim_channels: List[AnimationChannel] = []

    for mp_idx, node_idx in mapped:
        coords = frames_np[:, mp_idx, :]  # (F,3)
        view = add_view(coords.tobytes(), target=None)
        mins = coords.min(axis=0).tolist()
        maxs = coords.max(axis=0).tolist()
        out_accessor = add_accessor(
            view,
            component_type=5126,
            count=frame_count,
            type_str="VEC3",
            min_vals=mins,
            max_vals=maxs,
        )
        samp_idx = len(anim_samplers)
        anim_samplers.append(
            AnimationSampler(
                input=time_accessor,
                output=out_accessor,
                interpolation="LINEAR",
            )
        )
        anim_channels.append(
            AnimationChannel(
                sampler=samp_idx,
                target=AnimationChannelTarget(node=node_idx, path="translation"),
            )
        )

    gltf.animations = [
        Animation(
            samplers=anim_samplers,
            channels=anim_channels,
            name="mediapipe_translation",
        )
    ]

    gltf.buffers[buffer_idx].byteLength = len(data)
    gltf.set_binary_blob(data)
    gltf.save_binary(str(output_path))
