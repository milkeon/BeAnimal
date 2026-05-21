from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

import cv2

from .animals import ORDER, animal_label
from .filter import apply_filter_to_frame, draw_ui


ANIMAL_ALIASES = {
    "capybara": "capybara",
    "cat": "cat",
    "hamster": "hamster",
    "polar_bear": "polar_bear",
    "bear": "polar_bear",
    "jindo": "jindo",
    "dog": "jindo",
    "tiger": "tiger",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="BeAnimal webcam recorder")
    parser.add_argument("--camera", type=int, default=0, help="camera index")
    parser.add_argument("--animal", type=str, default=None, help="capybara|cat|hamster|polar_bear|jindo|tiger")
    parser.add_argument("--output-dir", type=Path, default=Path("recordings"), help="recording directory")
    return parser.parse_args()


def choose_animal(initial: str | None) -> str:
    if initial:
        key = ANIMAL_ALIASES.get(initial.lower().strip())
        if key:
            return key
        print(f"Unknown animal: {initial}")

    print("Choose an animal filter:")
    for idx, key in enumerate(ORDER, start=1):
        print(f"  {idx}. {animal_label(key)} ({key})")

    while True:
        raw = input("Select 1-6 or type name: ").strip().lower()
        if raw.isdigit() and 1 <= int(raw) <= len(ORDER):
            return ORDER[int(raw) - 1]
        if raw in ANIMAL_ALIASES:
            return ANIMAL_ALIASES[raw]
        print("Please enter 1-6 or one of capybara/cat/hamster/bear/jindo/tiger.")


def make_writer(path: Path, fps: float, size: tuple[int, int]) -> cv2.VideoWriter:
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    return cv2.VideoWriter(str(path), fourcc, max(1.0, fps), size)


def main() -> None:
    args = parse_args()
    animal_key = choose_animal(args.animal)

    capture = cv2.VideoCapture(args.camera)
    if not capture.isOpened():
        raise SystemExit(f"Could not open camera index {args.camera}")

    fps = capture.get(cv2.CAP_PROP_FPS)
    if not fps or fps < 1:
        fps = 30.0

    writer = None
    recording = False
    output_path = None
    args.output_dir.mkdir(parents=True, exist_ok=True)

    print("Controls: 1-6 animal switch | r record | q quit")
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                print("Camera frame unavailable.")
                break

            frame = cv2.flip(frame, 1)
            apply_filter_to_frame(frame, animal_key)
            draw_ui(frame, animal_key, recording, str(output_path) if output_path else None)

            if recording and writer is not None:
                writer.write(frame)

            cv2.imshow("BeAnimal", frame)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            if key == ord("r"):
                if recording:
                    recording = False
                    if writer is not None:
                        writer.release()
                        writer = None
                    print(f"Saved: {output_path}")
                else:
                    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
                    output_path = args.output_dir / f"beanimal-{animal_key}-{stamp}.mp4"
                    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or frame.shape[1])
                    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or frame.shape[0])
                    writer = make_writer(output_path, fps, (width, height))
                    recording = True
                    print(f"Recording: {output_path}")
            elif key in map(ord, "123456"):
                idx = int(chr(key)) - 1
                if idx < len(ORDER):
                    animal_key = ORDER[idx]
                    print(f"Animal: {animal_label(animal_key)}")
    finally:
        if writer is not None:
            writer.release()
        capture.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
