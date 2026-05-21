from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

import cv2
import numpy as np

Color = Tuple[int, int, int]
FaceBox = Tuple[int, int, int, int]


@dataclass(frozen=True)
class AnimalStyle:
    label: str
    base: Color
    accent: Color
    ear: Color
    nose: Color
    cheek: Color
    stripe: Color
    eye_white: Color = (245, 245, 245)
    pupil: Color = (20, 20, 20)


ANIMALS: Dict[str, AnimalStyle] = {
    "capybara": AnimalStyle(
        label="카피바라",
        base=(150, 120, 90),
        accent=(110, 85, 60),
        ear=(165, 135, 105),
        nose=(90, 70, 55),
        cheek=(180, 150, 120),
        stripe=(120, 95, 70),
    ),
    "cat": AnimalStyle(
        label="고양이",
        base=(160, 145, 120),
        accent=(90, 80, 65),
        ear=(170, 155, 130),
        nose=(180, 120, 150),
        cheek=(210, 200, 175),
        stripe=(95, 85, 70),
    ),
    "hamster": AnimalStyle(
        label="햄스터",
        base=(170, 160, 140),
        accent=(125, 115, 95),
        ear=(190, 180, 160),
        nose=(120, 90, 95),
        cheek=(200, 185, 165),
        stripe=(130, 120, 100),
    ),
    "polar_bear": AnimalStyle(
        label="백곰",
        base=(235, 235, 230),
        accent=(185, 190, 205),
        ear=(245, 245, 242),
        nose=(110, 120, 135),
        cheek=(255, 255, 255),
        stripe=(180, 190, 205),
    ),
    "jindo": AnimalStyle(
        label="진돗개",
        base=(225, 210, 185),
        accent=(150, 130, 100),
        ear=(205, 180, 150),
        nose=(65, 60, 60),
        cheek=(238, 228, 208),
        stripe=(145, 125, 95),
    ),
    "tiger": AnimalStyle(
        label="호랑이",
        base=(60, 140, 230),
        accent=(20, 20, 20),
        ear=(55, 120, 205),
        nose=(35, 35, 35),
        cheek=(85, 165, 245),
        stripe=(20, 20, 20),
    ),
}

ORDER = ["capybara", "cat", "hamster", "polar_bear", "jindo", "tiger"]


def _clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def _pt(x: int, y: int, w: int, h: int, dx: float, dy: float) -> tuple[int, int]:
    return int(x + w * dx), int(y + h * dy)


def _draw_ear_pair(frame, x, y, w, h, style: AnimalStyle, kind: str) -> None:
    if kind in {"cat", "jindo", "tiger"}:
        left = [
            _pt(x, y, w, h, 0.12, 0.00),
            _pt(x, y, w, h, 0.27, -0.26),
            _pt(x, y, w, h, 0.38, 0.02),
        ]
        right = [
            _pt(x, y, w, h, 0.62, 0.02),
            _pt(x, y, w, h, 0.73, -0.26),
            _pt(x, y, w, h, 0.88, 0.00),
        ]
        cv2.fillConvexPoly(frame, np.array(left, dtype=np.int32), style.ear)
        cv2.fillConvexPoly(frame, np.array(right, dtype=np.int32), style.ear)
        inner_left = [
            _pt(x, y, w, h, 0.18, 0.02),
            _pt(x, y, w, h, 0.27, -0.18),
            _pt(x, y, w, h, 0.34, 0.02),
        ]
        inner_right = [
            _pt(x, y, w, h, 0.66, 0.02),
            _pt(x, y, w, h, 0.73, -0.18),
            _pt(x, y, w, h, 0.82, 0.02),
        ]
        cv2.fillConvexPoly(frame, np.array(inner_left, dtype=np.int32), style.cheek)
        cv2.fillConvexPoly(frame, np.array(inner_right, dtype=np.int32), style.cheek)
        return

    if kind == "hamster":
        cv2.circle(frame, _pt(x, y, w, h, 0.24, 0.06), int(min(w, h) * 0.08), style.ear, -1, cv2.LINE_AA)
        cv2.circle(frame, _pt(x, y, w, h, 0.76, 0.06), int(min(w, h) * 0.08), style.ear, -1, cv2.LINE_AA)
        return

    if kind == "polar_bear":
        cv2.circle(frame, _pt(x, y, w, h, 0.20, 0.03), int(min(w, h) * 0.09), style.ear, -1, cv2.LINE_AA)
        cv2.circle(frame, _pt(x, y, w, h, 0.80, 0.03), int(min(w, h) * 0.09), style.ear, -1, cv2.LINE_AA)
        return

    # capybara
    cv2.circle(frame, _pt(x, y, w, h, 0.22, 0.04), int(min(w, h) * 0.07), style.ear, -1, cv2.LINE_AA)
    cv2.circle(frame, _pt(x, y, w, h, 0.78, 0.04), int(min(w, h) * 0.07), style.ear, -1, cv2.LINE_AA)


def _draw_tiger_stripes(frame, x, y, w, h, style: AnimalStyle) -> None:
    for dx in (0.24, 0.38, 0.55, 0.70):
        p1 = _pt(x, y, w, h, dx, 0.12)
        p2 = _pt(x, y, w, h, dx + 0.06, 0.22)
        cv2.line(frame, p1, p2, style.stripe, 6, cv2.LINE_AA)
    cv2.ellipse(frame, _pt(x, y, w, h, 0.50, 0.66), (int(w * 0.20), int(h * 0.18)), 0, 0, 180, style.stripe, 4, cv2.LINE_AA)


def apply_animal_filter(frame, face_box: FaceBox, animal_key: str) -> None:
    style = ANIMALS[animal_key]
    x, y, w, h = face_box
    x = _clamp(x, 0, frame.shape[1] - 1)
    y = _clamp(y, 0, frame.shape[0] - 1)
    w = max(1, min(w, frame.shape[1] - x - 1))
    h = max(1, min(h, frame.shape[0] - y - 1))

    cx = x + w // 2
    cy = y + int(h * 0.58)
    rx = max(1, int(w * 0.42))
    ry = max(1, int(h * 0.50))

    _draw_ear_pair(frame, x, y, w, h, style, animal_key)
    cv2.ellipse(frame, (cx, cy), (rx, ry), 0, 0, 360, style.base, -1, cv2.LINE_AA)

    # Muzzle / cheeks
    cv2.ellipse(frame, (cx, y + int(h * 0.68)), (int(w * 0.25), int(h * 0.20)), 0, 0, 360, style.cheek, -1, cv2.LINE_AA)

    # Eyes
    eye_y = y + int(h * 0.42)
    eye_dx = int(w * 0.15)
    eye_r = max(2, int(min(w, h) * 0.05))
    cv2.circle(frame, (cx - eye_dx, eye_y), eye_r + 2, style.eye_white, -1, cv2.LINE_AA)
    cv2.circle(frame, (cx + eye_dx, eye_y), eye_r + 2, style.eye_white, -1, cv2.LINE_AA)
    cv2.circle(frame, (cx - eye_dx, eye_y), eye_r, style.pupil, -1, cv2.LINE_AA)
    cv2.circle(frame, (cx + eye_dx, eye_y), eye_r, style.pupil, -1, cv2.LINE_AA)

    # Nose and mouth
    nose_y = y + int(h * 0.58)
    nose_w = max(2, int(w * 0.06))
    cv2.circle(frame, (cx, nose_y), nose_w, style.nose, -1, cv2.LINE_AA)
    cv2.line(frame, (cx, nose_y + nose_w), (cx - int(w * 0.06), nose_y + int(h * 0.09)), style.accent, 2, cv2.LINE_AA)
    cv2.line(frame, (cx, nose_y + nose_w), (cx + int(w * 0.06), nose_y + int(h * 0.09)), style.accent, 2, cv2.LINE_AA)

    # Whiskers / details
    whisker_y = y + int(h * 0.62)
    for offset in (-0.15, 0.0, 0.15):
        start_left = (cx - int(w * 0.05), whisker_y + int(h * offset * 0.15))
        end_left = (cx - int(w * 0.26), whisker_y + int(h * offset * 0.12))
        start_right = (cx + int(w * 0.05), whisker_y + int(h * offset * 0.15))
        end_right = (cx + int(w * 0.26), whisker_y + int(h * offset * 0.12))
        if animal_key in {"cat", "jindo", "capybara"}:
            cv2.line(frame, start_left, end_left, style.accent, 2, cv2.LINE_AA)
            cv2.line(frame, start_right, end_right, style.accent, 2, cv2.LINE_AA)

    if animal_key == "capybara":
        cv2.rectangle(frame, (cx - int(w * 0.06), nose_y + int(h * 0.08)), (cx + int(w * 0.01), nose_y + int(h * 0.16)), style.eye_white, -1)
        cv2.rectangle(frame, (cx + int(w * 0.01), nose_y + int(h * 0.08)), (cx + int(w * 0.08), nose_y + int(h * 0.16)), style.eye_white, -1)
        cv2.rectangle(frame, (cx - int(w * 0.06), nose_y + int(h * 0.08)), (cx + int(w * 0.08), nose_y + int(h * 0.16)), style.accent, 1, cv2.LINE_AA)

    if animal_key == "hamster":
        cv2.circle(frame, (cx - int(w * 0.22), y + int(h * 0.63)), int(min(w, h) * 0.09), style.cheek, -1, cv2.LINE_AA)
        cv2.circle(frame, (cx + int(w * 0.22), y + int(h * 0.63)), int(min(w, h) * 0.09), style.cheek, -1, cv2.LINE_AA)

    if animal_key == "polar_bear":
        cv2.ellipse(frame, (cx, nose_y + int(h * 0.03)), (int(w * 0.12), int(h * 0.09)), 0, 0, 360, style.eye_white, -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, nose_y + int(h * 0.03)), max(2, int(min(w, h) * 0.03)), style.nose, -1, cv2.LINE_AA)

    if animal_key == "jindo":
        cv2.ellipse(frame, (cx, y + int(h * 0.23)), (int(w * 0.24), int(h * 0.14)), 0, 0, 180, style.stripe, 3, cv2.LINE_AA)

    if animal_key == "tiger":
        _draw_tiger_stripes(frame, x, y, w, h, style)
        cv2.ellipse(frame, (cx, y + int(h * 0.30)), (int(w * 0.18), int(h * 0.09)), 0, 0, 180, style.base, -1, cv2.LINE_AA)
        cv2.circle(frame, (cx, nose_y), max(2, int(min(w, h) * 0.025)), style.stripe, -1, cv2.LINE_AA)


def animal_label(key: str) -> str:
    return ANIMALS[key].label
