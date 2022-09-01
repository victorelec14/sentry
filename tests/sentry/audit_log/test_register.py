from sentry import audit_log
from sentry.testutils import TestCase
from sentry.testutils.silo import control_silo_test


@control_silo_test
class AuditLogEventRegisterTest(TestCase):
    def test_get_api_names(self):
        audit_log_api_name_list = [
            "member.invite",
            "member.add",
            "member.accept-invite",
            "member.edit",
            "member.remove",
            "member.join-team",
            "member.leave-team",
            "member.pending",
            "org.create",
            "org.edit",
            "org.remove",
            "org.restore",
            "team.create",
            "team.edit",
            "team.remove",
            "project.create",
            "project.edit",
            "project.remove",
            "project.request-transfer",
            "project.accept-transfer",
            "project.enable",
            "project.disable",
            "tagkey.remove",
            "projectkey.create",
            "projectkey.edit",
            "projectkey.remove",
            "projectkey.change",
            "sso.enable",
            "sso.disable",
            "sso.edit",
            "sso-identity.link",
            "api-key.create",
            "api-key.edit",
            "api-key.remove",
            "rule.create",
            "rule.edit",
            "rule.remove",
            "servicehook.create",
            "servicehook.edit",
            "servicehook.remove",
            "integration.upgrade",
            "integration.add",
            "integration.edit",
            "integration.remove",
            "sentry-app.add",
            "sentry-app.remove",
            "sentry-app.install",
            "sentry-app.uninstall",
            "monitor.add",
            "monitor.edit",
            "monitor.remove",
            "internal-integration.create",
            "internal-integration.add-token",
            "internal-integration.remove-token",
            "invite-request.create",
            "invite-request.remove",
            "alertrule.create",
            "alertrule.edit",
            "alertrule.remove",
        ]

        assert set(audit_log.get_api_names()) == set(audit_log_api_name_list)
