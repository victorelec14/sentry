from sentry.api.bases.sentryapps import SentryAppBaseEndpoint
from sentry.api.paginator import OffsetPaginator
from sentry.api.serializers import serialize
from sentry.models import IntegrationFeature
from sentry.models.integrationfeature import IntegrationTypes


class SentryAppFeaturesEndpoint(SentryAppBaseEndpoint):
    def get(self, request, sentry_app):
        features = IntegrationFeature.objects.filter(
            target_id=sentry_app.id, target_type=IntegrationTypes.SENTRY_APP.value
        )

        return self.paginate(
            request=request,
            queryset=features,
            paginator_cls=OffsetPaginator,
            on_results=lambda x: serialize(x, request.user),
        )