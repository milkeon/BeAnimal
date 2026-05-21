import numpy as np

from beanimal.filter import apply_filter_to_face


FACE_BOX = (180, 100, 180, 220)


def test_animal_filter_draws_something_for_each_animal():
    for key in ("capybara", "cat", "hamster", "polar_bear", "jindo", "tiger"):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        apply_filter_to_face(frame, FACE_BOX, key)
        assert frame.sum() > 0, key


def test_apply_filter_draws_on_likely_face_region():
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    apply_filter_to_face(frame, FACE_BOX, "cat")
    assert frame[120:360, 150:410].sum() > 0
