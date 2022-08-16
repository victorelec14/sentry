# Generated by Django 2.2.28 on 2022-07-08 02:18

from django.db import migrations

from sentry.new_migrations.migrations import CheckedMigration
from sentry.utils.query import RangeQuerySetWrapperWithProgressBar


def backfill_alert_owners(apps, schema_editor):
    AlertRule = apps.get_model("sentry", "AlertRule")
    OrganizationMember = apps.get_model("sentry", "OrganizationMember")
    User = apps.get_model("sentry", "User")
    Team = apps.get_model("sentry", "Team")

    for alert_rule in RangeQuerySetWrapperWithProgressBar(
        AlertRule.objects_with_snapshots.select_related("owner").all()
    ):
        owner = alert_rule.owner
        if not owner:
            continue

        valid_owner = False
        if owner.type == 1:  # Actor is a User
            user = User.objects.get(actor_id=owner.id)
            if OrganizationMember.objects.filter(
                organization_id=alert_rule.organization_id, user_id=user.id
            ).exists():
                valid_owner = True
        else:  # Actor is a Team
            if Team.objects.filter(
                actor_id=owner.id, organization_id=alert_rule.organization_id
            ).exists():
                valid_owner = True

        if not valid_owner:
            alert_rule.owner = None
            alert_rule.save()


class Migration(CheckedMigration):
    # This flag is used to mark that a migration shouldn't be automatically run in production. For
    # the most part, this should only be used for operations where it's safe to run the migration
    # after your code has deployed. So this should not be used for most operations that alter the
    # schema of a table.
    # Here are some things that make sense to mark as dangerous:
    # - Large data migrations. Typically we want these to be run manually by ops so that they can
    #   be monitored and not block the deploy for a long period of time while they run.
    # - Adding indexes to large tables. Since this can take a long time, we'd generally prefer to
    #   have ops run this and not block the deploy. Note that while adding an index is a schema
    #   change, it's completely safe to run the operation after the code has deployed.
    is_dangerous = False

    # This flag is used to decide whether to run this migration in a transaction or not. Generally
    # we don't want to run in a transaction here, since for long running operations like data
    # back-fills this results in us locking an increasing number of rows until we finally commit.
    atomic = False

    dependencies = [
        ("sentry", "0296_alertrule_type_not_null"),
    ]

    operations = [
        migrations.RunPython(
            backfill_alert_owners,
            migrations.RunPython.noop,
            hints={"tables": ["sentry_alertrule"]},
        ),
    ]