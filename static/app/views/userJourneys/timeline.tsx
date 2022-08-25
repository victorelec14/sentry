import styled from '@emotion/styled';
import moment from 'moment';

import CrumbIcon from 'sentry/components/events/interfaces/breadcrumbs/breadcrumb/type/icon';
import space from 'sentry/styles/space';
import {Crumb} from 'sentry/types/breadcrumbs';

const NOTABLE_CATEGORIES = [
  'ui.click',
  'navigation',
  'sentry.event',
  'sentry.transaction',
  'selection',
  'app.lifecycle',
  'click',
];

interface CrumbGroup {
  active: boolean;
  crumbs: Crumb[];
  timestamp: string;
}

type Props = {
  breadcrumbs: Array<Crumb>;
  onActivateCrumb: (crumb: Crumb) => void;
  activeCrumb?: Crumb;
};

function Timeline({breadcrumbs, onActivateCrumb, activeCrumb}: Props) {
  const notable = extractHighlights(breadcrumbs, activeCrumb);
  notable.reverse();

  return (
    <ScrollContainer>
      <ItemRow>
        {notable.map((group, index) => {
          const handleClick = (event: React.MouseEvent) => {
            event.preventDefault();
            onActivateCrumb(group.crumbs[0]);
          };
          return (
            <CrumbItem
              key={`${group.timestamp}-${index}`}
              group={group}
              onClick={handleClick}
            />
          );
        })}
      </ItemRow>
    </ScrollContainer>
  );
}

type ItemProps = {
  group: CrumbGroup;
  onClick: (event: React.MouseEvent) => void;
};

function CrumbItem({group, onClick}: ItemProps) {
  const icons: any[] = [];
  let i = 0;
  while (icons.length < 5 || !group.crumbs[i]) {
    const crumb = group.crumbs[i];
    if (crumb) {
      icons.push(
        <IconWrapper
          key={`${String(crumb.type)}-${String(i)}`}
          color={crumb.color}
          offset={icons.length}
          id={`timeline-${String(crumb.type)}-${String(crumb.id)}`}
        >
          <CrumbIcon type={crumb.type} size="md" />
        </IconWrapper>
      );
      i++;
    } else {
      break;
    }
  }

  return (
    <ItemContainer onClick={onClick}>
      <AxisLine />
      <IconStack>{icons}</IconStack>
      <ItemTime active={group.active}>
        {moment(group.timestamp).format('HH:mm:ss')}
      </ItemTime>
    </ItemContainer>
  );
}

function extractHighlights(crumbs: Props['breadcrumbs'], active?: Crumb): CrumbGroup[] {
  const keyFormat = 'YYYY-MM-DDTHH:mm:ss';
  const relevant = crumbs.filter(crumb => {
    if (!crumb.category) {
      return false;
    }
    return NOTABLE_CATEGORIES.includes(crumb.category);
  });

  const mapping: Record<string, Crumb[]> = {};
  relevant.forEach((crumb: Crumb) => {
    const timestamp = moment(crumb.timestamp).format(keyFormat);
    if (!timestamp) {
      return;
    }
    if (mapping[timestamp] === undefined) {
      mapping[timestamp] = [];
    }
    mapping[timestamp].push(crumb);
  });

  const grouped: CrumbGroup[] = [];
  const activeTime = active ? moment(active.timestamp).format(keyFormat) : null;

  Object.entries(mapping).forEach(([key, value]) => {
    grouped.push({timestamp: key, crumbs: value, active: activeTime === key});
  });

  return grouped;
}

const AxisLine = styled('div')`
  position: absolute;
  top: 60px;
  left: -${space(1.5)};
  right: -${space(1.5)};
  border-bottom: 1px solid ${p => p.theme.border};
  z-index: 0;
`;

const ItemRow = styled('div')`
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: ${space(3)};
  justify-content: center;
  height: 110px;
`;

const ScrollContainer = styled('div')`
  position: sticky;
  top: -10px;
  background: #fff;
  width: 100%;
  overflow-x: scroll;
  margin-bottom: ${space(3)};
  z-index: 11;
  padding-left: 20px;
  padding-right: 20px;
`;

const ItemContainer = styled('div')`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space(1)};
  cursor: pointer;
`;

const IconWrapper = styled('div')<{color: string; offset: number}>`
  position: absolute;
  width: 38px;
  height: 38px;
  top: ${p => p.offset * -8 + 40}px;
  left: ${p => p.offset * 4}px;
  z-index: ${p => 5 - p.offset};
  opacity: 1;
  filter: saturate(${p => 1.0 - p.offset * 0.15}) brightness(${p => 1.0 + p.offset * 0.2});

  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: ${p => p.theme.white};
  background: ${p => p.theme[p.color] ?? p.color};
  box-shadow: ${p => p.theme.dropShadowLightest};
`;

const ItemTime = styled('span')<{active: boolean}>`
  font-size: ${p => p.theme.fontSizeSmall};
  color: ${p => (p.active ? p.theme.focus : p.theme.subText)};
`;

const IconStack = styled('div')`
  display: flex;
  flex-direction: column-reverse;
  position: relative;
  height: 80px;
  width: 38px;
`;

export default Timeline;
