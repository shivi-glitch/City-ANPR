"""
Single Video / RTSP Ingestion & AI Tracking Runner (Phase 4 & 6 Scaled Pipeline)
Features:
- YOLOv8 Multi-Object Vehicle Detection & ByteTrack
- Real-time Plate Cropping using Sobel Edge Gradients (Accurate Bumper Plate Isolation)
- Real OCR (EasyOCR) extracting genuine text without faking state registration
- Live On-Video Plate Banner (e.g. LR09 FSL)
- Picture-in-Picture ANPR Inspector HUD
- Vertical / Horizontal Virtual Tripwire In/Out Counting
"""

import argparse
import os
import sys
import time
import json
import cv2
import numpy as np
from flask import Flask, Response, request
from flask_cors import CORS
import threading
from queue import Queue

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules.anpr.plate_cropper import PlateCropper
from modules.anpr.plate_ocr import PlateOCR
from modules.speed.speed_estimator import SpeedEstimator
from modules.zones.line_cross_detector import LineCrossDetector
from emitters.http_emitter import HTTPEmitter


# Flask MJPEG Streamer Setup
app = Flask(__name__)
CORS(app)
frame_queue = Queue(maxsize=10)

def generate_frames():
    while True:
        frame = frame_queue.get()
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

def start_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)

def main():
    parser = argparse.ArgumentParser(description="Feed Video / RTSP to AI Detection Engine")
    parser.add_argument(
        "--source",
        type=str,
        default="data/video_testing.mp4",
        help="Path to local .mp4 video file, RTSP URL, or 0 for webcam"
    )
    parser.add_argument(
        "--camera-id",
        type=str,
        default="CAM_01",
        help="Camera identifier (e.g. CAM_01, CAM_SECTOR_17)"
    )
    parser.add_argument(
        "--line-axis",
        type=str,
        default="vertical",
        choices=["vertical", "horizontal"],
        help="Axis of virtual line: 'vertical' for left-to-right traffic, 'horizontal' for up-down traffic"
    )
    parser.add_argument(
        "--line-pos",
        type=int,
        default=380,
        help="Pixel coordinate of virtual line (x for vertical, y for horizontal)"
    )
    parser.add_argument(
        "--speed-limit",
        type=float,
        default=60.0,
        help="Speed limit in km/h for overspeed alerts"
    )
    parser.add_argument(
        "--backend-url",
        type=str,
        default=None,
        help="FastAPI Backend URL (e.g. https://your-backend.onrender.com or http://localhost:8000)"
    )
    parser.add_argument(
        "--show-window",
        action="store_true",
        default=True,
        help="Show live OpenCV display window with HUD"
    )

    args = parser.parse_args()

    print("==================================================")
    print(" SIH 2026: REAL-TIME ANPR & CV PIPELINE RUNNER")
    print("==================================================")
    print(f" Camera ID     : {args.camera_id}")
    print(f" Video Source  : {args.source}")
    print(f" Virtual Line  : {args.line_axis.upper()} at pixel {args.line_pos}")
    print(f" Plate Storage : ai_engine/data/plate_crops/")
    if args.backend_url:
        print(f" Backend URL   : {args.backend_url}")
    print("==================================================")

    from ultralytics import YOLO

    source = 0 if args.source == "0" else args.source
    if isinstance(source, str) and not source.startswith("rtsp://") and not os.path.exists(source):
        print(f"[!] Error: Video file '{source}' not found.")
        return

    # Initialize modules
    cropper = PlateCropper(output_dir="data/plate_crops")
    ocr = PlateOCR(use_easyocr=True) # Real OCR enabled
    speed_est = SpeedEstimator(fps=25.0, meters_per_pixel=0.06, speed_limit_kmh=args.speed_limit)
    line_detector = LineCrossDetector(mode=args.line_axis, position=args.line_pos)
    emitter = HTTPEmitter(backend_url=args.backend_url)

    print("[+] Loading YOLOv8 model (yolov8n.pt)...")
    model = YOLO("yolov8n.pt")

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[!] Error: Failed to open video stream: {source}")
        return

    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 768
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 432

    frame_count = 0
    start_time = time.time()
    VEHICLE_CLASSES = [0, 2, 3, 5, 7] # person, car, motorcycle, bus, truck

    # Real plate cache: track_id -> {"plate": str, "conf": float, "crop": np.ndarray}
    track_plates = {}

    latest_plate_thumb = None
    latest_plate_text = "SCANNING..."
    latest_plate_conf = 0.0
    latest_track_info = "Waiting for vehicles..."


    # Start Flask server in a separate thread
    threading.Thread(target=start_flask, daemon=True).start()
    print("[+] Started Flask MJPEG server on http://0.0.0.0:5000/video_feed")

    print("[+] Stream running. Watch OpenCV window. Press 'q' to stop.\n")

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("[*] End of video stream reached. Looping...")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                continue

            frame_count += 1

            results = model.track(
                source=frame,
                persist=True,
                classes=VEHICLE_CLASSES,
                verbose=False
            )

            annotated_frame = frame.copy()

            # 1. DRAW VIRTUAL LINE & IN/OUT STATS
            if args.line_axis == "vertical":
                p1 = (args.line_pos, 0)
                p2 = (args.line_pos, frame_h)
                line_title = f"LINE [x={args.line_pos}] | L->R: {line_detector.in_count} | R->L: {line_detector.out_count}"
                text_pos = (max(10, args.line_pos - 180), 25)
            else:
                p1 = (0, args.line_pos)
                p2 = (frame_w, args.line_pos)
                line_title = f"LINE [y={args.line_pos}] | IN: {line_detector.in_count} | OUT: {line_detector.out_count}"
                text_pos = (20, max(25, args.line_pos - 10))

            cv2.line(annotated_frame, p1, p2, (0, 0, 255), 2)
            cv2.putText(
                annotated_frame, line_title, text_pos,
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 255), 2
            )

            # 2. PROCESS DETECTIONS & RUN REAL OCR
            if results and len(results) > 0:
                boxes = results[0].boxes
                if boxes is not None:
                    for box in boxes:
                        cls_id = int(box.cls[0].item())
                        cls_name = model.names[cls_id]
                        conf = float(box.conf[0].item())
                        track_id = int(box.id[0].item()) if box.id is not None else -1
                        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]

                        # Speed calculation
                        speed_info = speed_est.update(track_id, [x1, y1, x2, y2], frame_count)
                        speed_kmh = speed_info["speed_kmh"]
                        is_overspeed = speed_info["overspeed"]

                        # Check line crossing
                        crossing = line_detector.check_crossing(track_id, [x1, y1, x2, y2])
                        if crossing["crossed"]:
                            print(f"[!] TRIPWIRE TRIGGERED: Vehicle #{track_id} ({cls_name}) crossed line -> {crossing['direction']} | Total In: {crossing['total_in']}")

                        # Real Plate Extraction & OCR (for vehicles)
                        plate_str = None
                        if cls_name in ["car", "bus", "truck", "motorcycle"] and track_id > 0:
                            # Try reading if not yet cached or if previous attempt had no text
                            if track_id not in track_plates:
                                crop_res = cropper.extract_and_save_plate(frame, [x1, y1, x2, y2], track_id)
                                if crop_res and crop_res["plate_img"] is not None:
                                    ocr_res = ocr.read_plate(crop_res["plate_img"], track_id=track_id)
                                    if ocr_res["plate"]:
                                        plate_str = ocr_res["plate"]
                                        track_plates[track_id] = {
                                            "plate": plate_str,
                                            "conf": ocr_res["confidence"],
                                            "crop": crop_res["plate_img"],
                                            "class": cls_name,
                                            "speed": speed_kmh
                                        }
                                        print(f"[REAL OCR HIT] Vehicle #{track_id} ({cls_name}) -> '{plate_str}' (Conf: {ocr_res['confidence']})")
                                        latest_plate_thumb = crop_res["plate_img"]
                                        latest_plate_text = plate_str
                                        latest_plate_conf = ocr_res["confidence"]
                                        latest_track_info = f"#{track_id} {cls_name} ({speed_kmh} km/h)"
                                        
                                        # Emit to backend
                                        import datetime
                                        emitter.emit_event({
                                            "camera_id": args.camera_id,
                                            "track_id": track_id,
                                            "timestamp": datetime.datetime.utcnow().isoformat(),
                                            "vehicle_class": cls_name,
                                            "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                                            "confidence": conf,
                                            "speed_kmh": speed_kmh,
                                            "plate_number": plate_str,
                                            "plate_confidence": ocr_res["confidence"]
                                        })
                                    else:
                                        latest_plate_thumb = crop_res["plate_img"]
                            else:
                                plate_str = track_plates[track_id]["plate"]

                        # Draw Vehicle Bounding Box
                        box_color = (0, 0, 255) if is_overspeed else (0, 255, 0)
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), box_color, 2)

                        # Top label: Track ID + Class + Speed
                        label = f"#{track_id} {cls_name} {speed_kmh}km/h"
                        cv2.putText(
                            annotated_frame, label, (x1, max(18, y1 - 24)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, box_color, 2
                        )

                        # REAL NUMBER PLATE BADGE ON VEHICLE
                        if plate_str:
                            plate_badge = f"[{plate_str}]"
                            (tw, th), _ = cv2.getTextSize(plate_badge, cv2.FONT_HERSHEY_DUPLEX, 0.5, 1)
                            badge_y1 = max(4, y1 - 22)
                            badge_y2 = badge_y1 + th + 6
                            badge_x2 = x1 + tw + 8
                            # White plate background
                            cv2.rectangle(annotated_frame, (x1, badge_y1), (badge_x2, badge_y2), (255, 255, 255), -1)
                            cv2.rectangle(annotated_frame, (x1, badge_y1), (badge_x2, badge_y2), (0, 0, 0), 1)
                            # Black plate text
                            cv2.putText(
                                annotated_frame, plate_badge, (x1 + 4, badge_y2 - 4),
                                cv2.FONT_HERSHEY_DUPLEX, 0.5, (0, 0, 0), 1
                            )

            # 3. ON-SCREEN HUD: PICTURE-IN-PICTURE FOR NUMBER PLATE
            hud_w, hud_h = 240, 125
            hud_x = frame_w - hud_w - 10
            hud_y = 10
            # Background black box for HUD
            cv2.rectangle(annotated_frame, (hud_x, hud_y), (hud_x + hud_w, hud_y + hud_h), (0, 0, 0), -1)
            cv2.rectangle(annotated_frame, (hud_x, hud_y), (hud_x + hud_w, hud_y + hud_h), (255, 255, 255), 1)
            cv2.putText(annotated_frame, "REAL ANPR INSPECTOR", (hud_x + 8, hud_y + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
            
            # Plate Number Highlight Box in HUD
            cv2.rectangle(annotated_frame, (hud_x + 8, hud_y + 24), (hud_x + hud_w - 8, hud_y + 46), (255, 255, 255), -1)
            cv2.putText(annotated_frame, f"PLATE: {latest_plate_text}", (hud_x + 12, hud_y + 40), cv2.FONT_HERSHEY_DUPLEX, 0.45, (0, 0, 0), 1)

            cv2.putText(annotated_frame, f"INFO: {latest_track_info}", (hud_x + 8, hud_y + 58), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 255, 255), 1)

            # Render Plate Thumbnail
            if latest_plate_thumb is not None and latest_plate_thumb.size > 0:
                try:
                    thumb_resized = cv2.resize(latest_plate_thumb, (220, 55))
                    annotated_frame[hud_y + 64:hud_y + 119, hud_x + 10:hud_x + 230] = thumb_resized
                except Exception:
                    pass


            if args.show_window:
                cv2.imshow(f"SIH 2026 - ANPR & Traffic Intelligence ({args.camera_id})", annotated_frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("[*] Stopped by user.")
                    break
            
            # Push to flask stream
            if not frame_queue.full():
                frame_queue.put(annotated_frame)
            else:
                try:
                    frame_queue.get_nowait()
                    frame_queue.put(annotated_frame)
                except:
                    pass


    except KeyboardInterrupt:
        print("\n[*] Interrupted by user.")
    finally:
        cap.release()
        if args.show_window:
            cv2.destroyAllWindows()

        output_json = "data/detected_plates.json"
        summary_data = []
        for tid, data in track_plates.items():
            summary_data.append({
                "track_id": tid,
                "plate_number": data["plate"],
                "confidence": data["conf"],
                "vehicle_class": data["class"],
                "speed_kmh": data["speed"]
            })
        try:
            with open(output_json, "w") as f:
                json.dump(summary_data, f, indent=2)
            print(f"[+] Exported {len(summary_data)} plates to {output_json}")
        except Exception:
            pass

        print(f"\n==================================================")
        print(f" FINAL SUMMARY:")
        print(f" - Real Plates Detected: {len(track_plates)}")
        print(f" - Line Crossings: {line_detector.in_count} entered, {line_detector.out_count} exited")
        print(f" - Crops Saved in: ai_engine/data/plate_crops/")
        print(f"==================================================")

if __name__ == "__main__":
    main()
