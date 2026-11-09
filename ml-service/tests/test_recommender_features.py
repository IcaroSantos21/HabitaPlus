import numpy as np

from app.core.constants import CATEGORIES
from app.services import recommender_features as rf


def test_vector_follows_the_order_of_categories() -> None:
    vector = rf.build_interest_vector({"moveis": 2}, {}, {})

    assert CATEGORIES[0] == "moveis"
    assert vector.tolist() == [2.0, 0.0, 0.0, 0.0, 0.0]


def test_vector_weights_each_signal() -> None:
    vector = rf.build_interest_vector({"esporte": 4}, {"esporte": 1}, {"esporte": 2})

    by_category = dict(zip(CATEGORIES, vector.tolist(), strict=True))
    expected = 4 * rf.VIEW_WEIGHT + 1 * rf.LISTED_WEIGHT + 2 * rf.CHAT_WEIGHT
    assert by_category["esporte"] == expected


def test_chat_counts_more_than_listing_and_listing_more_than_view() -> None:
    assert rf.CHAT_WEIGHT > rf.LISTED_WEIGHT > rf.VIEW_WEIGHT > 0


def test_empty_profile_is_a_zero_vector() -> None:
    assert not rf.build_interest_vector({}, {}, {}).any()


def test_missing_categories_count_as_zero() -> None:
    vector = rf.build_interest_vector({"moveis": 1}, {"outros": 1}, {})

    assert np.count_nonzero(vector) == 2