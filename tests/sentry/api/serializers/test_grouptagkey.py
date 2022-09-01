from sentry.api.serializers import serialize
from sentry.tagstore.types import GroupTagKey
from sentry.testutils import TestCase
from sentry.testutils.silo import control_silo_test


@control_silo_test
class GroupTagKeySerializerTest(TestCase):
    def test(self):
        user = self.create_user()
        grouptagkey = GroupTagKey(group_id=0, key="key", values_seen=1)

        result = serialize(grouptagkey, user)
        assert result["key"] == "key"
        assert result["uniqueValues"] == 1
