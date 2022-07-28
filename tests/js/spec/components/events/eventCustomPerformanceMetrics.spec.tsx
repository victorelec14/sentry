import {initializeOrg} from 'sentry-test/initializeOrg';
import {render, screen} from 'sentry-test/reactTestingLibrary';

import EventCustomPerformanceMetrics from 'sentry/components/events/eventCustomPerformanceMetrics';
import {Event} from 'sentry/types/event';

describe('EventCustomPerformanceMetrics', function () {
  it('should not render anything', function () {
    const {router, organization} = initializeOrg();
    render(
      <EventCustomPerformanceMetrics
        location={router.location}
        organization={organization}
        event={{} as Event}
      />
    );
    expect(screen.queryByText('Custom Performance Metrics')).not.toBeInTheDocument();
  });

  it('should not render non custom performance metrics', function () {
    const {router, organization} = initializeOrg();
    const event = TestStubs.Event({
      measurements: {lcp: {value: 10, unit: 'millisecond'}},
    });
    render(
      <EventCustomPerformanceMetrics
        location={router.location}
        organization={organization}
        event={event}
      />
    );
    expect(screen.queryByText('Custom Performance Metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('Largest Contentful Paint')).not.toBeInTheDocument();
  });

  it('should render custom performance metrics', function () {
    const {router, organization} = initializeOrg();
    const event = TestStubs.Event({
      measurements: {
        'custom.count': {unit: 'none', value: 10},
        'custom.duration': {unit: 'millisecond', value: 123},
        'custom.size': {unit: 'kibibyte', value: 456},
        'custom.percentage': {unit: 'ratio', value: 0.3},
        lcp: {value: 10, unit: 'millisecond'},
      },
    });
    render(
      <EventCustomPerformanceMetrics
        location={router.location}
        organization={organization}
        event={event}
      />
    );

    screen.getByText('Custom Performance Metrics');
    screen.getByText('custom.count');
    screen.getByText('custom.duration');
    screen.getByText('custom.size');
    screen.getByText('custom.percentage');
    screen.getByText('10');
    screen.getByText('123.00ms');
    screen.getByText('456.0 KiB');
    screen.getByText('30%');
    expect(screen.queryByText('Largest Contentful Paint')).not.toBeInTheDocument();
  });
});