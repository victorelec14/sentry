from sentry.auth.system import SystemToken, is_system_auth
from sentry.testutils import TestCase
from sentry.testutils.silo import customer_silo_test


@customer_silo_test
class TestSystemAuth(TestCase):
    def test_is_system_auth(self):
        token = SystemToken()
        assert is_system_auth(token)
        assert not is_system_auth({})
