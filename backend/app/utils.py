from datetime import date


def next_annual_occurrence(event_date: date, today: date) -> date:
    try:
        candidate = event_date.replace(year=today.year)
    except ValueError:
        candidate = event_date.replace(year=today.year, day=28)
    if candidate < today:
        try:
            candidate = event_date.replace(year=today.year + 1)
        except ValueError:
            candidate = event_date.replace(year=today.year + 1, day=28)
    return candidate
