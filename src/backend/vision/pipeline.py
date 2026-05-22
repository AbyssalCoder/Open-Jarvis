"""
Multi-model vision pipeline for JARVIS.

Architecture:
  - YOLO (fast, fixed-class): used for live webcam overlays (~2 FPS, <50ms/frame)
  - GroundingDINO (open-vocabulary): used when user asks about specific objects
    or YOLO can't find anything meaningful
  - Ollama LLM: scene description / reasoning from detection results

Usage:
  from vision.pipeline import VisionPipeline
  pipeline = VisionPipeline()
  detections = await pipeline.detect(image_bytes, query="find the red cup")
  description = await pipeline.analyze(image_bytes, query="what's happening here")
"""

import asyncio
import os
import tempfile
import logging
from typing import Optional

logger = logging.getLogger("jarvis.vision")

# ─── Singleton model caches ───────────────────────────────────────────────────
_yolo_model = None
_gdino_model = None
_gdino_processor = None


def _get_yolo_model():
    """Load YOLOv8 nano model (cached). GPU-accelerated if CUDA available."""
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            import torch

            _yolo_model = YOLO("yolov8n.pt")  # 6MB nano
            if torch.cuda.is_available():
                _yolo_model.to("cuda")
                logger.info("YOLO loaded on CUDA GPU")
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                _yolo_model.to("mps")
                logger.info("YOLO loaded on MPS GPU")
            else:
                logger.info("YOLO loaded on CPU")
        except Exception as e:
            logger.warning(f"YOLO load failed: {e}")
    return _yolo_model


def _get_gdino():
    """Load GroundingDINO model (cached). Downloads weights on first use (~700MB)."""
    global _gdino_model, _gdino_processor
    if _gdino_model is None:
        try:
            from groundingdino.util.inference import load_model
            import torch

            # The groundingdino-py package ships config + auto-downloads weights
            # Use the pre-built loader with HuggingFace weights
            from groundingdino.util.inference import load_model as _load
            from huggingface_hub import hf_hub_download

            # Download GroundingDINO-Tiny (smallest, ~350MB)
            cache_dir = os.path.join(os.path.dirname(__file__), "..", "data", "models")
            os.makedirs(cache_dir, exist_ok=True)

            config_path = hf_hub_download(
                repo_id="IDEA-Research/grounding-dino-tiny",
                filename="config.json",
                cache_dir=cache_dir,
            )

            # Try the standard GroundingDINO loading path
            weights_path = hf_hub_download(
                repo_id="ShilongLiu/GroundingDINO",
                filename="groundingdino_swint_ogc.pth",
                cache_dir=cache_dir,
            )

            # Load with groundingdino
            from groundingdino.models import build_model
            from groundingdino.util.slconfig import SLConfig
            from groundingdino.util.utils import clean_state_dict

            # Use the built-in config from the package
            import groundingdino
            pkg_dir = os.path.dirname(groundingdino.__file__)
            cfg_path = os.path.join(pkg_dir, "config", "GroundingDINO_SwinT_OGC.py")

            if not os.path.exists(cfg_path):
                # Fallback: find config in package
                for root, dirs, files in os.walk(pkg_dir):
                    for f in files:
                        if f.endswith(".py") and "SwinT" in f:
                            cfg_path = os.path.join(root, f)
                            break

            args = SLConfig.fromfile(cfg_path)
            args.device = "cuda" if torch.cuda.is_available() else "cpu"
            model = build_model(args)

            checkpoint = torch.load(weights_path, map_location="cpu", weights_only=False)
            model.load_state_dict(clean_state_dict(checkpoint["model"]), strict=False)
            model.eval()

            if torch.cuda.is_available():
                model = model.cuda()

            _gdino_model = model
            logger.info(f"GroundingDINO loaded on {args.device}")

        except Exception as e:
            logger.warning(f"GroundingDINO load failed: {e}")
            logger.warning("Falling back to YOLO-only mode")
    return _gdino_model


class VisionPipeline:
    """Multi-model vision pipeline combining YOLO + GroundingDINO + LLM."""

    # Object classes that YOLO handles well (COCO 80 classes)
    YOLO_CLASSES = {
        "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train",
        "truck", "boat", "traffic light", "fire hydrant", "stop sign",
        "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep",
        "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella",
        "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard",
        "sports ball", "kite", "baseball bat", "baseball glove", "skateboard",
        "surfboard", "tennis racket", "bottle", "wine glass", "cup", "fork",
        "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
        "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
        "couch", "potted plant", "bed", "dining table", "toilet", "tv",
        "laptop", "mouse", "remote", "keyboard", "cell phone", "microwave",
        "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase",
        "scissors", "teddy bear", "hair drier", "toothbrush",
    }

    def __init__(self):
        self._loop = None

    def _should_use_gdino(self, query: str | None) -> bool:
        """Decide if query needs open-vocabulary detection (GroundingDINO)."""
        if not query:
            return False
        q = query.lower()
        # If the query asks for something specific not in COCO classes → use GDINO
        # Check common patterns
        specific_phrases = [
            "find", "where is", "locate", "look for", "search for",
            "identify", "detect", "spot", "show me", "point out",
            "is there a", "can you see", "do you see",
        ]
        if any(p in q for p in specific_phrases):
            # Extract the target object from query
            target = self._extract_target(q)
            if target and target not in self.YOLO_CLASSES:
                return True
        return False

    def _extract_target(self, query: str) -> str | None:
        """Extract the target object/concept from a natural language query."""
        import re
        # Try common patterns
        patterns = [
            r"(?:find|locate|spot|detect|search for|look for|show me|point out)\s+(?:the\s+|a\s+|an\s+)?(.+?)(?:\s+in|\s+on|\s+near|$|\?)",
            r"(?:where is|where are)\s+(?:the\s+|a\s+|an\s+)?(.+?)(?:\s*\?|$)",
            r"(?:is there|do you see|can you see)\s+(?:a\s+|an\s+)?(.+?)(?:\s*\?|$)",
        ]
        for pat in patterns:
            m = re.search(pat, query, re.IGNORECASE)
            if m:
                return m.group(1).strip().rstrip("?.!")
        return None

    async def detect_yolo(self, image_bytes: bytes, conf: float = 0.3):
        """Fast YOLO detection → list of {label, confidence, x1, y1, x2, y2} (normalized)."""
        model = _get_yolo_model()
        if model is None:
            return []

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(image_bytes)
            temp_path = f.name

        try:
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, lambda: model(temp_path, verbose=False)
            )
        finally:
            try:
                os.unlink(temp_path)
            except OSError:
                pass

        detections = []
        if results and len(results) > 0:
            result = results[0]
            if result.boxes is not None:
                img_h, img_w = result.orig_shape
                for box in result.boxes:
                    c = float(box.conf[0])
                    if c < conf:
                        continue
                    cls_id = int(box.cls[0])
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    detections.append({
                        "label": result.names[cls_id],
                        "confidence": round(c, 2),
                        "x1": round(x1 / img_w, 4),
                        "y1": round(y1 / img_h, 4),
                        "x2": round(x2 / img_w, 4),
                        "y2": round(y2 / img_h, 4),
                        "model": "yolo",
                    })
        return detections

    async def detect_gdino(self, image_bytes: bytes, text_prompt: str,
                           box_threshold: float = 0.25, text_threshold: float = 0.2):
        """Open-vocabulary detection with GroundingDINO.
        text_prompt: dot-separated phrases e.g. "red cup . laptop . headphones"
        Returns list of {label, confidence, x1, y1, x2, y2} (normalized).
        """
        model = _get_gdino()
        if model is None:
            logger.warning("GroundingDINO not available, falling back to YOLO")
            return await self.detect_yolo(image_bytes)

        try:
            import torch
            from PIL import Image
            from groundingdino.util.inference import predict
            import groundingdino.datasets.transforms as T
            import io

            # Load and transform image
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            w, h = pil_image.size

            transform = T.Compose([
                T.RandomResize([800], max_size=1333),
                T.ToTensor(),
                T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])
            image_tensor, _ = transform(pil_image, None)

            # Run inference in thread pool
            loop = asyncio.get_event_loop()

            def _infer():
                with torch.no_grad():
                    boxes, logits, phrases = predict(
                        model=model,
                        image=image_tensor,
                        caption=text_prompt,
                        box_threshold=box_threshold,
                        text_threshold=text_threshold,
                    )
                return boxes, logits, phrases

            boxes, logits, phrases = await loop.run_in_executor(None, _infer)

            detections = []
            for box, logit, phrase in zip(boxes, logits, phrases):
                # GroundingDINO returns cx, cy, w, h (normalized 0-1)
                cx, cy, bw, bh = box.tolist()
                detections.append({
                    "label": phrase.strip(),
                    "confidence": round(float(logit), 2),
                    "x1": round(cx - bw / 2, 4),
                    "y1": round(cy - bh / 2, 4),
                    "x2": round(cx + bw / 2, 4),
                    "y2": round(cy + bh / 2, 4),
                    "model": "gdino",
                })
            return detections

        except Exception as e:
            logger.error(f"GroundingDINO detection failed: {e}")
            return await self.detect_yolo(image_bytes)

    async def detect(self, image_bytes: bytes, query: str | None = None,
                     conf: float = 0.3) -> list[dict]:
        """Smart detection — chooses YOLO or GroundingDINO based on query.

        - No query or generic query → YOLO (fast)
        - Specific object query not in COCO → GroundingDINO (open-vocabulary)
        - Both can run in parallel for best coverage
        """
        use_gdino = self._should_use_gdino(query)

        if use_gdino and query:
            target = self._extract_target(query) or query
            # Format as GroundingDINO text prompt (dot-separated)
            text_prompt = target.replace(",", " .") + " ."

            # Run both in parallel for best coverage
            yolo_task = asyncio.create_task(self.detect_yolo(image_bytes, conf))
            gdino_task = asyncio.create_task(
                self.detect_gdino(image_bytes, text_prompt)
            )

            yolo_dets, gdino_dets = await asyncio.gather(yolo_task, gdino_task)

            # Merge: prefer GDINO for target objects, YOLO for standard objects
            # Deduplicate by IoU
            merged = self._merge_detections(yolo_dets, gdino_dets)
            return merged
        else:
            return await self.detect_yolo(image_bytes, conf)

    async def analyze(self, image_bytes: bytes, query: str = "Describe what you see") -> dict:
        """Full vision analysis: detect objects → describe scene with LLM.
        Returns {"result": str, "detections": list, "model": str}
        """
        # Get detections
        detections = await self.detect(image_bytes, query)

        # Format detection summary
        if detections:
            class_counts: dict[str, int] = {}
            for d in detections:
                name = d["label"]
                class_counts[name] = class_counts.get(name, 0) + 1

            parts = []
            for name, count in sorted(class_counts.items(), key=lambda x: -x[1]):
                parts.append(f"{count} {name}" if count > 1 else name)
            det_summary = "Detected: " + ", ".join(parts)
            models_used = list(set(d.get("model", "yolo") for d in detections))
        else:
            det_summary = "No objects detected."
            models_used = ["yolo"]

        # Get LLM description
        description = await self._llm_describe(det_summary, query)
        model_str = "+".join(models_used) + ("+jarvis" if description else "")

        if description:
            return {
                "result": f"{description}\n\n(Objects detected: {det_summary})",
                "detections": detections,
                "model": model_str,
            }

        return {
            "result": det_summary,
            "detections": detections,
            "model": model_str,
        }

    async def _llm_describe(self, detection_summary: str, query: str) -> str | None:
        """Ask Ollama LLM to describe a scene from detections + query."""
        from config import config
        ollama_url = config.ollama_url

        prompt = (
            f"You are JARVIS, an AI vision assistant. "
            f"A camera captured an image and detection found: {detection_summary}\n\n"
            f"The user asked: \"{query}\"\n\n"
            f"Based on the detected objects, give a natural, helpful description. "
            f"Be conversational and specific. Infer context from object combinations."
        )

        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": "jarvis:latest",
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "num_predict": 300,
                            "temperature": 0.7,
                            "num_gpu": -1,
                            "num_ctx": 2048,
                        },
                    },
                )
                if resp.status_code == 200:
                    return resp.json().get("response", "").strip()
        except Exception:
            pass
        return None

    def _merge_detections(self, yolo_dets: list, gdino_dets: list) -> list:
        """Merge detections from YOLO and GroundingDINO, removing duplicates by IoU."""
        if not gdino_dets:
            return yolo_dets
        if not yolo_dets:
            return gdino_dets

        merged = list(yolo_dets)  # Start with YOLO results

        for gd in gdino_dets:
            is_duplicate = False
            for yd in yolo_dets:
                iou = self._compute_iou(gd, yd)
                if iou > 0.5:  # Same object
                    is_duplicate = True
                    break
            if not is_duplicate:
                merged.append(gd)

        return merged

    @staticmethod
    def _compute_iou(a: dict, b: dict) -> float:
        """Compute IoU between two detection boxes (normalized coords)."""
        x1 = max(a["x1"], b["x1"])
        y1 = max(a["y1"], b["y1"])
        x2 = min(a["x2"], b["x2"])
        y2 = min(a["y2"], b["y2"])

        if x2 <= x1 or y2 <= y1:
            return 0.0

        inter = (x2 - x1) * (y2 - y1)
        area_a = (a["x2"] - a["x1"]) * (a["y2"] - a["y1"])
        area_b = (b["x2"] - b["x1"]) * (b["y2"] - b["y1"])
        union = area_a + area_b - inter

        return inter / union if union > 0 else 0.0


# ─── Module-level singleton ──────────────────────────────────────────────────
_pipeline: VisionPipeline | None = None


def get_vision_pipeline() -> VisionPipeline:
    """Get the singleton VisionPipeline instance."""
    global _pipeline
    if _pipeline is None:
        _pipeline = VisionPipeline()
    return _pipeline
