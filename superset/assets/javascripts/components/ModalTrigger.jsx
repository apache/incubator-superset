import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';
import cx from 'classnames';
import Button from './Button';

const propTypes = {
  animation: PropTypes.bool,
  triggerNode: PropTypes.node.isRequired,
  modalTitle: PropTypes.node.isRequired,
  modalBody: PropTypes.node,  // not required because it can be generated by beforeOpen
  modalFooter: PropTypes.node,
  beforeOpen: PropTypes.func,
  onExit: PropTypes.func,
  isButton: PropTypes.bool,
  bsSize: PropTypes.string,
  className: PropTypes.string,
  tooltip: PropTypes.string,
};

const defaultProps = {
  animation: true,
  beforeOpen: () => {},
  onExit: () => {},
  isButton: false,
  bsSize: null,
  className: '',
};

export default class ModalTrigger extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showModal: false,
    };
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
  }

  close() {
    this.setState({ showModal: false });
  }

  open(e) {
    e.preventDefault();
    this.props.beforeOpen();
    this.setState({ showModal: true });
  }
  renderModal() {
    return (
      <Modal
        animation={this.props.animation}
        show={this.state.showModal}
        onHide={this.close}
        onExit={this.props.onExit}
        bsSize={this.props.bsSize}
        className={this.props.className}
      >
        <Modal.Header closeButton>
          <Modal.Title>{this.props.modalTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.props.modalBody}
        </Modal.Body>
        {this.props.modalFooter &&
          <Modal.Footer>
            {this.props.modalFooter}
          </Modal.Footer>
        }
      </Modal>
    );
  }

  render() {
    const classNames = cx({
      'btn btn-default btn-sm': this.props.isButton,
    });
    if (this.props.isButton) {
      return (
        <Button
          className="modal-trigger"
          tooltip={this.props.tooltip}
          onClick={this.open}
        >
          {this.props.triggerNode}
          {this.renderModal()}
        </Button>
      );
    }
    /* eslint-disable jsx-a11y/interactive-supports-focus */
    return (
      <span className={classNames} onClick={this.open} role="button">
        {this.props.triggerNode}
        {this.renderModal()}
      </span>
    );
  }
}

ModalTrigger.propTypes = propTypes;
ModalTrigger.defaultProps = defaultProps;
