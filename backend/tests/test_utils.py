from datetime import date
from app.utils import next_annual_occurrence


def test_U1_future_occurrence_this_year():
    assert next_annual_occurrence(date(2000, 6, 15), date(2026, 5, 1)) == date(2026, 6, 15)


def test_U2_occurrence_today_is_inclusive():
    assert next_annual_occurrence(date(2000, 6, 15), date(2026, 6, 15)) == date(2026, 6, 15)


def test_U3_occurrence_rolls_to_next_year():
    assert next_annual_occurrence(date(2000, 6, 15), date(2026, 6, 16)) == date(2027, 6, 15)


def test_U4_leap_day_non_leap_year():
    # Feb 29 event, 2026 is not a leap year → Feb 28
    assert next_annual_occurrence(date(2000, 2, 29), date(2026, 2, 1)) == date(2026, 2, 28)


def test_U5_leap_day_leap_year():
    # 2028 is a leap year → real Feb 29
    assert next_annual_occurrence(date(2000, 2, 29), date(2028, 1, 1)) == date(2028, 2, 29)


def test_U6_leap_day_this_years_feb28_passed():
    # Feb 28 (this year's stand-in for Feb 29) has passed, 2027 is non-leap → Feb 28 2027
    assert next_annual_occurrence(date(2000, 2, 29), date(2026, 3, 1)) == date(2027, 2, 28)
