import isValidChild from './isValidChild';
import { TAB_TYPE, TABS_TYPE } from './componentTypes';

export const DROP_TOP = 'DROP_TOP';
export const DROP_RIGHT = 'DROP_RIGHT';
export const DROP_BOTTOM = 'DROP_BOTTOM';
export const DROP_LEFT = 'DROP_LEFT';

// this defines how close the mouse must be to the edge of a component to display
// a sibling type drop indicator
const SIBLING_DROP_THRESHOLD = 20;

export default function getDropPosition(monitor, Component) {
  const {
    depth: componentDepth,
    parentComponent,
    component,
    orientation,
    isDraggingOverShallow,
  } = Component.props;

  const draggingItem = monitor.getItem();

  // if dropped self on self, do nothing
  if (
    !draggingItem ||
    draggingItem.id === component.id ||
    !isDraggingOverShallow
  ) {
    return null;
  }

  const validChild = isValidChild({
    parentType: component.type,
    parentDepth: componentDepth,
    childType: draggingItem.type,
  });

  const parentType = parentComponent && parentComponent.type;
  const parentDepth = // see isValidChild.js for why tabs don't increment child depth
    componentDepth +
    (parentType === TAB_TYPE || parentType === TABS_TYPE ? 0 : -1);

  const validSibling = isValidChild({
    parentType,
    parentDepth,
    childType: draggingItem.type,
  });

  if (!validChild && !validSibling) {
    return null;
  }

  const hasChildren = (component.children || []).length > 0;
  const childDropOrientation =
    orientation === 'row' ? 'vertical' : 'horizontal';
  const siblingDropOrientation =
    orientation === 'row' ? 'horizontal' : 'vertical';

  if (validChild && !validSibling) {
    // easiest case, insert as child
    if (childDropOrientation === 'vertical') {
      return hasChildren ? DROP_RIGHT : DROP_LEFT;
    }
    return hasChildren ? DROP_BOTTOM : DROP_TOP;
  }

  const refBoundingRect = Component.ref.getBoundingClientRect();
  const clientOffset = monitor.getClientOffset();

  // Drop based on mouse position relative to component center
  if (validSibling && !validChild) {
    if (siblingDropOrientation === 'vertical') {
      const refMiddleX =
        refBoundingRect.left +
        (refBoundingRect.right - refBoundingRect.left) / 2;
      return clientOffset.x < refMiddleX ? DROP_LEFT : DROP_RIGHT;
    }
    const refMiddleY =
      refBoundingRect.top + (refBoundingRect.bottom - refBoundingRect.top) / 2;
    return clientOffset.y < refMiddleY ? DROP_TOP : DROP_BOTTOM;
  }

  // either is valid, so choose location based on boundary deltas
  if (validSibling && validChild) {
    const deltaTop = Math.abs(clientOffset.y - refBoundingRect.top);
    const deltaBottom = Math.abs(clientOffset.y - refBoundingRect.bottom);
    const deltaLeft = Math.abs(clientOffset.x - refBoundingRect.left);
    const deltaRight = Math.abs(clientOffset.x - refBoundingRect.right);

    // if near enough to a sibling boundary, drop there
    if (siblingDropOrientation === 'vertical') {
      if (deltaLeft < SIBLING_DROP_THRESHOLD) return DROP_LEFT;
      if (deltaRight < SIBLING_DROP_THRESHOLD) return DROP_RIGHT;
    } else {
      if (deltaTop < SIBLING_DROP_THRESHOLD) return DROP_TOP;
      if (deltaBottom < SIBLING_DROP_THRESHOLD) return DROP_BOTTOM;
    }

    // drop as child
    if (childDropOrientation === 'vertical') {
      return hasChildren ? DROP_RIGHT : DROP_LEFT;
    }
    return hasChildren ? DROP_BOTTOM : DROP_TOP;
  }

  return null;
}
