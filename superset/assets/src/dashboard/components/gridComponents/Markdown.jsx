import React from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import AceEditor from 'react-ace';
import 'brace/mode/markdown';
import 'brace/theme/textmate';

import DeleteComponentButton from '../DeleteComponentButton';
import DragDroppable from '../dnd/DragDroppable';
import ResizableContainer from '../resizable/ResizableContainer';
import MarkdownModeDropdown from '../menu/MarkdownModeDropdown';
import WithPopoverMenu from '../menu/WithPopoverMenu';
import { componentShape } from '../../util/propShapes';
import { ROW_TYPE, COLUMN_TYPE } from '../../util/componentTypes';
import {
  GRID_MIN_COLUMN_COUNT,
  GRID_MIN_ROW_UNITS,
  GRID_BASE_UNIT,
} from '../../util/constants';

const propTypes = {
  id: PropTypes.string.isRequired,
  parentId: PropTypes.string.isRequired,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  index: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  editMode: PropTypes.bool.isRequired,

  // grid related
  availableColumnCount: PropTypes.number.isRequired,
  columnWidth: PropTypes.number.isRequired,
  onResizeStart: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  onResizeStop: PropTypes.func.isRequired,

  // dnd
  deleteComponent: PropTypes.func.isRequired,
  handleComponentDrop: PropTypes.func.isRequired,
  updateComponents: PropTypes.func.isRequired,
};

const defaultProps = {};
const markdownPlaceHolder = `### New Markdown
Insert *bold* or _italic_ text, and (urls)[www.url.com] here.`;

class Markdown extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      isFocused: false,
      markdownSource: props.component.meta.code,
      editor: null,
      editorMode: props.component.meta.code ? 'preview' : 'edit', // show edit mode when code is empty
    };

    this.handleChangeFocus = this.handleChangeFocus.bind(this);
    this.handleChangeEditorMode = this.handleChangeEditorMode.bind(this);
    this.handleMarkdownChange = this.handleMarkdownChange.bind(this);
    this.handleDeleteComponent = this.handleDeleteComponent.bind(this);
    this.setEditor = this.setEditor.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.editor &&
      (prevProps.component.meta.width !== this.props.component.meta.width ||
        prevProps.columnWidth !== this.props.columnWidth)
    ) {
      this.state.editor.resize(true);
    }
  }

  setEditor(editor) {
    editor.getSession().setUseWrapMode(true);
    this.setState({
      editor,
    });
  }

  handleChangeFocus(nextFocus) {
    this.setState(() => ({ isFocused: Boolean(nextFocus) }));
  }

  handleChangeEditorMode(mode) {
    if (this.state.editorMode === 'edit') {
      const { updateComponents, component } = this.props;
      if (component.meta.code !== this.state.markdownSource) {
        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              code: this.state.markdownSource,
            },
          },
        });
      }
    }

    this.setState(() => ({
      editorMode: mode,
    }));
  }

  handleMarkdownChange(nextValue) {
    this.setState({
      markdownSource: nextValue,
    });
  }

  handleDeleteComponent() {
    const { deleteComponent, id, parentId } = this.props;
    deleteComponent(id, parentId);
  }

  renderEditMode() {
    return (
      <AceEditor
        mode="markdown"
        theme="textmate"
        onChange={this.handleMarkdownChange}
        width={'100%'}
        height={'100%'}
        editorProps={{ $blockScrolling: true }}
        value={this.state.markdownSource || markdownPlaceHolder}
        readOnly={false}
        onLoad={this.setEditor}
      />
    );
  }

  renderPreviewMode() {
    return (
      <ReactMarkdown source={this.state.markdownSource} escapeHtml={false} />
    );
  }

  render() {
    const { isFocused } = this.state;

    const {
      component,
      parentComponent,
      index,
      depth,
      availableColumnCount,
      columnWidth,
      onResizeStart,
      onResize,
      onResizeStop,
      handleComponentDrop,
      editMode,
    } = this.props;

    // inherit the size of parent columns
    const widthMultiple =
      parentComponent.type === COLUMN_TYPE
        ? parentComponent.meta.width || GRID_MIN_COLUMN_COUNT
        : component.meta.width || GRID_MIN_COLUMN_COUNT;

    return (
      <DragDroppable
        component={component}
        parentComponent={parentComponent}
        orientation={depth % 2 === 1 ? 'column' : 'row'}
        index={index}
        depth={depth}
        onDrop={handleComponentDrop}
        disableDragDrop={isFocused}
        editMode={editMode}
      >
        {({ dropIndicatorProps, dragSourceRef }) => (
          <WithPopoverMenu
            onChangeFocus={this.handleChangeFocus}
            menuItems={[
              <MarkdownModeDropdown
                id={`${component.id}-mode`}
                value={this.state.editorMode}
                onChange={this.handleChangeEditorMode}
              />,
              <DeleteComponentButton onDelete={this.handleDeleteComponent} />,
            ]}
            editMode={editMode}
          >
            <div className="dashboard-markdown">
              <ResizableContainer
                id={component.id}
                adjustableWidth={parentComponent.type === ROW_TYPE}
                adjustableHeight
                widthStep={columnWidth}
                widthMultiple={widthMultiple}
                heightStep={GRID_BASE_UNIT}
                heightMultiple={component.meta.height}
                minWidthMultiple={GRID_MIN_COLUMN_COUNT}
                minHeightMultiple={GRID_MIN_ROW_UNITS}
                maxWidthMultiple={availableColumnCount + widthMultiple}
                onResizeStart={onResizeStart}
                onResize={onResize}
                onResizeStop={onResizeStop}
                editMode={editMode}
              >
                <div
                  ref={dragSourceRef}
                  className="dashboard-component dashboard-component-chart-holder"
                >
                  {editMode && this.state.editorMode === 'edit'
                    ? this.renderEditMode()
                    : this.renderPreviewMode()}
                </div>

                {dropIndicatorProps && <div {...dropIndicatorProps} />}
              </ResizableContainer>
            </div>
          </WithPopoverMenu>
        )}
      </DragDroppable>
    );
  }
}

Markdown.propTypes = propTypes;
Markdown.defaultProps = defaultProps;

export default Markdown;
