from __future__ import annotations

from pathlib import Path

import cv2

from .animals import apply_animal_filter, animal_label

FACE_CASCADE = cv2.CascadeClassifier(
    str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml")
)


def detect_faces(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    return sorted(faces, key=lambda box: box[2] * box[3], reverse=True)


def draw_ui(frame, animal_key: str, recording: bool, output_path: str | None) -> None:
    label = animal_label(animal_key)
    status = "REC ●" if recording else "READY"
    color = (0, 0, 255) if recording else (60, 220, 120)
    cv2.rectangle(frame, (12, 12), (420, 96), (20, 20, 20), -1)
    cv2.rectangle(frame, (12, 12), (420, 96), color, 2)
    cv2.putText(frame, f"BeAnimal  |  {label}", (28, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, f"{status}  |  1-6 animal switch  |  r record  |  q quit", (28, 72), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (230, 230, 230), 1, cv2.LINE_AA)
    if output_path:
        tail = output_path if len(output_path) <= 52 else f"...{output_path[-49:]}"
        cv2.putText(frame, f"save: {tail}", (28, 94), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (210, 210, 210), 1, cv2.LINE_AA)


def apply_filter_to_face(frame, face_box, animal_key: str):
    apply_animal_filter(frame, tuple(int(v) for v in face_box), animal_key)


def apply_filter_to_frame(frame, animal_key: str):
    faces = detect_faces(frame)
    if len(faces):
        apply_animal_filter(frame, tuple(int(v) for v in faces[0]), animal_key)
    return faces
