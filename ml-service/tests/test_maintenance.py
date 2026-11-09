from fastapi.testclient import TestClient

from app.schemas.maintenance import MaintenanceAnalysisRequest
from app.services.maintenance_analyzer import MaintenanceAnalyzer


TICKETS = [
    {"ticketId": 1, "openedAt": "2026-08-03", "equipment": "Elevador", "area": "Bloco B"},
    {"ticketId": 2, "openedAt": "2026-09-01", "equipment": "elevador", "area": "bloco b"},
    {"ticketId": 3, "openedAt": "2026-10-15", "equipment": "elevador", "area": "bloco b"},
    {"ticketId": 4, "openedAt": "2026-10-01", "equipment": "bomba", "area": "casa de máquinas"},
    {"ticketId": 5, "openedAt": "2026-01-01", "equipment": "portao", "area": "entrada"},
]


def test_analyzer_filters_window_and_calculates_interval() -> None:
    request = MaintenanceAnalysisRequest.model_validate(
        {"tickets": TICKETS, "referenceDate": "2026-10-31"}
    )

    response = MaintenanceAnalyzer().analyze(request)

    elevator = next(group for group in response.groups if group.equipment == "elevador")
    assert elevator.area == "bloco b"
    assert elevator.occurrence_count == 3
    assert elevator.frequency_per_30_days == 1.0
    assert elevator.average_interval_days == 36.5
    assert elevator.recurring is True
    assert len(response.recurring_items) == 1


def test_analyzer_keeps_equipment_and_area_as_separate_groups() -> None:
    request = MaintenanceAnalysisRequest.model_validate(
        {
            "tickets": [
                {"ticketId": 1, "openedAt": "2026-10-01", "equipment": "elevador", "area": "A"},
                {"ticketId": 2, "openedAt": "2026-10-02", "equipment": "elevador", "area": "B"},
            ],
            "referenceDate": "2026-10-31",
        }
    )

    groups = MaintenanceAnalyzer().analyze(request).groups

    assert {(group.equipment, group.area) for group in groups} == {("elevador", "a"), ("elevador", "b")}
    assert all(group.recurring is False for group in groups)


def test_endpoint_returns_camel_case_and_preventive_suggestion(client: TestClient) -> None:
    response = client.post(
        "/analyze/maintenance",
        json={"tickets": TICKETS, "referenceDate": "2026-10-31"},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"referenceDate", "windowDays", "recurrenceThreshold", "groups", "recurringItems"}
    recurring = body["recurringItems"][0]
    assert recurring["occurrenceCount"] == 3
    assert "preventiveMaintenanceSuggestion" in recurring


def test_endpoint_rejects_ticket_without_equipment_or_area(client: TestClient) -> None:
    response = client.post(
        "/analyze/maintenance",
        json={"tickets": [{"ticketId": 1, "openedAt": "2026-10-31"}]},
    )

    assert response.status_code == 422


def test_endpoint_uses_custom_threshold(client: TestClient) -> None:
    response = client.post(
        "/analyze/maintenance",
        json={
            "tickets": TICKETS,
            "referenceDate": "2026-10-31",
            "recurrenceThreshold": 4,
        },
    )

    assert response.status_code == 200
    assert response.json()["recurringItems"] == []
