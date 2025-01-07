import { castArray, map } from 'lodash-es'

// WordPress dependencies
import { Button, Icon, Modal } from '@wordpress/components'
import { Fragment } from '@wordpress/element'
import { __ } from '@wordpress/i18n'

// Internal dependencies
import { error as errorIcon, info as infoIcon, warning as warningIcon } from '../icons.jsx'
import { mergeClasses, simpleMarkdown } from '../utils.jsx'

const ModalMessage = ({
	className,
	icon,
	message,
	links,
	withoutCloseButton,
	isOpen,
	onClose,
	children,
}) => {
	const modalIcon = icon === 'warning' ? warningIcon : icon === 'error' ? errorIcon : infoIcon

	return (
		isOpen && (
			<Modal
				className={mergeClasses('zukit-modal', className)}
				title={__('Warning', 'zu-contact')}
				closeLabel={__('Close')}
				onRequestClose={onClose}
			>
				<div className="__content-wrapper">
					<Icon className="__icon" icon={modalIcon} />
					<div>{simpleMarkdown(message, { links })}</div>
				</div>
				<div className="__button-wrapper">
					{map(castArray(children || []), (button, key) => (
						<Fragment key={key}>{button}</Fragment>
					))}
					{!withoutCloseButton && (
						<Button isPrimary onClick={onClose}>
							{__('Close')}
						</Button>
					)}
				</div>
			</Modal>
		)
	)
}

export default ModalMessage
