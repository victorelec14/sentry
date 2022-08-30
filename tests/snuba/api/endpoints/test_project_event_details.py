from unittest import mock

from django.urls import reverse

from sentry.event_manager import _pull_out_data
from sentry.testutils import APITestCase, SnubaTestCase
from sentry.testutils.helpers.datetime import before_now, iso_format
from sentry.types.issues import GroupType


class ProjectEventDetailsTest(APITestCase, SnubaTestCase):
    def setUp(self):
        super().setUp()
        self.login_as(user=self.user)
        project = self.create_project()

        one_min_ago = iso_format(before_now(minutes=1))
        two_min_ago = iso_format(before_now(minutes=2))
        three_min_ago = iso_format(before_now(minutes=3))
        four_min_ago = iso_format(before_now(minutes=4))

        self.prev_event = self.store_event(
            data={"event_id": "a" * 32, "timestamp": four_min_ago, "fingerprint": ["group-1"]},
            project_id=project.id,
        )
        self.cur_event = self.store_event(
            data={"event_id": "b" * 32, "timestamp": three_min_ago, "fingerprint": ["group-1"]},
            project_id=project.id,
        )
        self.next_event = self.store_event(
            data={
                "event_id": "c" * 32,
                "timestamp": two_min_ago,
                "fingerprint": ["group-1"],
                "environment": "production",
                "tags": {"environment": "production"},
            },
            project_id=project.id,
        )

        # Event in different group
        self.store_event(
            data={
                "event_id": "d" * 32,
                "timestamp": one_min_ago,
                "fingerprint": ["group-2"],
                "environment": "production",
                "tags": {"environment": "production"},
            },
            project_id=project.id,
        )

    def test_simple(self):
        url = reverse(
            "sentry-api-0-project-event-details",
            kwargs={
                "event_id": self.cur_event.event_id,
                "project_slug": self.cur_event.project.slug,
                "organization_slug": self.cur_event.project.organization.slug,
            },
        )
        response = self.client.get(url, format="json")

        assert response.status_code == 200, response.content
        assert response.data["id"] == str(self.cur_event.event_id)
        assert response.data["nextEventID"] == str(self.next_event.event_id)
        assert response.data["previousEventID"] == str(self.prev_event.event_id)
        assert response.data["groupID"] == str(self.cur_event.group.id)

    def test_snuba_no_prev(self):
        url = reverse(
            "sentry-api-0-project-event-details",
            kwargs={
                "event_id": self.prev_event.event_id,
                "project_slug": self.prev_event.project.slug,
                "organization_slug": self.prev_event.project.organization.slug,
            },
        )
        response = self.client.get(url, format="json")

        assert response.status_code == 200, response.content
        assert response.data["id"] == str(self.prev_event.event_id)
        assert response.data["previousEventID"] is None
        assert response.data["nextEventID"] == self.cur_event.event_id
        assert response.data["groupID"] == str(self.prev_event.group.id)

    def test_snuba_with_environment(self):
        url = reverse(
            "sentry-api-0-project-event-details",
            kwargs={
                "event_id": self.cur_event.event_id,
                "project_slug": self.cur_event.project.slug,
                "organization_slug": self.cur_event.project.organization.slug,
            },
        )
        response = self.client.get(
            url, format="json", data={"environment": ["production", "staging"]}
        )

        assert response.status_code == 200, response.content
        assert response.data["id"] == str(self.cur_event.event_id)
        assert response.data["previousEventID"] is None
        assert response.data["nextEventID"] == self.next_event.event_id
        assert response.data["groupID"] == str(self.prev_event.group.id)

    def test_ignores_different_group(self):
        url = reverse(
            "sentry-api-0-project-event-details",
            kwargs={
                "event_id": self.next_event.event_id,
                "project_slug": self.next_event.project.slug,
                "organization_slug": self.next_event.project.organization.slug,
            },
        )
        response = self.client.get(url, format="json")

        assert response.status_code == 200, response.content
        assert response.data["id"] == str(self.next_event.event_id)
        assert response.data["nextEventID"] is None


class ProjectEventDetailsTransactionTest(APITestCase, SnubaTestCase):
    def setUp(self):
        super().setUp()
        self.login_as(user=self.user)
        project = self.create_project()

        one_min_ago = iso_format(before_now(minutes=1))
        two_min_ago = iso_format(before_now(minutes=2))
        three_min_ago = iso_format(before_now(minutes=3))
        four_min_ago = iso_format(before_now(minutes=4))

        def hack_pull_out_data(jobs, projects):
            _pull_out_data(jobs, projects)
            for job in jobs:
                job["event"].group_ids = [self.group.id]
            return jobs, projects

        with mock.patch("sentry.event_manager._pull_out_data", hack_pull_out_data):
            self.prev_transaction_event = self.store_event(
                data={"event_id": "a" * 32, "timestamp": four_min_ago, "fingerprint": ["group-1"]},
                project_id=project.id,
            )

        with mock.patch("sentry.event_manager._pull_out_data", hack_pull_out_data):
            self.cur_transaction_event = self.store_event(
                data={"event_id": "b" * 32, "timestamp": three_min_ago, "fingerprint": ["group-1"]},
                project_id=project.id,
            )

        with mock.patch("sentry.event_manager._pull_out_data", hack_pull_out_data):
            self.next_transaction_event = self.store_event(
                data={
                    "event_id": "c" * 32,
                    "timestamp": two_min_ago,
                    "fingerprint": ["group-1"],
                    "environment": "production",
                    "tags": {"environment": "production"},
                },
                project_id=project.id,
            )

        with mock.patch("sentry.event_manager._pull_out_data", hack_pull_out_data):
            # Event in different group
            self.store_event(
                data={
                    "event_id": "d" * 32,
                    "timestamp": one_min_ago,
                    "fingerprint": ["group-2"],
                    "environment": "production",
                    "tags": {"environment": "production"},
                },
                project_id=project.id,
            )

        self.group.update(type=GroupType.PERFORMANCE_SLOW_SPAN.value)

    def test_transaction_event(self):
        """Test that you can look up a transaction event w/ a prev and next event"""
        url = reverse(
            "sentry-api-0-project-event-details",
            kwargs={
                "event_id": self.cur_transaction_event.event_id,
                "project_slug": self.cur_transaction_event.project.slug,
                "organization_slug": self.cur_transaction_event.project.organization.slug,
            },
        )
        response = self.client.get(url, format="json", data={"group_id": self.group.id})

        assert response.status_code == 200, response.content
        assert response.data["id"] == str(self.cur_transaction_event.event_id)
        assert response.data["nextEventID"] == str(self.next_transaction_event.event_id)
        assert response.data["previousEventID"] == str(self.prev_transaction_event.event_id)
        assert response.data["groupID"] == str(self.cur_transaction_event.group.id)


class ProjectEventJsonEndpointTest(APITestCase, SnubaTestCase):
    def setUp(self):
        super().setUp()
        self.login_as(user=self.user)
        self.event_id = "c" * 32
        self.fingerprint = ["group_2"]
        self.min_ago = iso_format(before_now(minutes=1))
        self.event = self.store_event(
            data={
                "event_id": self.event_id,
                "timestamp": self.min_ago,
                "fingerprint": self.fingerprint,
                "user": {"email": self.user.email},
            },
            project_id=self.project.id,
        )
        self.url = reverse(
            "sentry-api-0-event-json",
            kwargs={
                "organization_slug": self.organization.slug,
                "project_slug": self.project.slug,
                "event_id": self.event_id,
            },
        )

    def assert_event(self, data):
        assert data["event_id"] == self.event_id
        assert data["user"]["email"] == self.user.email
        assert data["datetime"][:19] == self.min_ago
        assert data["fingerprint"] == self.fingerprint

    def test_simple(self):
        response = self.client.get(self.url, format="json")
        assert response.status_code == 200, response.content
        self.assert_event(response.data)

    def test_event_does_not_exist(self):
        self.url = reverse(
            "sentry-api-0-event-json",
            kwargs={
                "organization_slug": self.organization.slug,
                "project_slug": self.project.slug,
                "event_id": "no" * 16,
            },
        )
        response = self.client.get(self.url, format="json")
        assert response.status_code == 404, response.content
        assert response.data == {"detail": "Event not found"}

    def test_user_unauthorized(self):
        user = self.create_user()
        self.login_as(user)

        response = self.client.get(self.url, format="json")
        assert response.status_code == 403, response.content
        assert response.data == {"detail": "You do not have permission to perform this action."}

    def test_project_not_associated_with_event(self):
        project2 = self.create_project(organization=self.organization)
        url = reverse(
            "sentry-api-0-event-json",
            kwargs={
                "organization_slug": self.organization.slug,
                "project_slug": project2.slug,
                "event_id": self.event_id,
            },
        )
        response = self.client.get(url, format="json")
        assert response.status_code == 404, response.content
        assert response.data == {"detail": "Event not found"}
