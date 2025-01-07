// WordPress dependencies
import { PanelBody } from '@wordpress/components'

// Internal dependencies
import { usePanelsContext } from '../hooks/use-panels.js'
import { mergeClasses } from '../utils.jsx'

// Zukit Panel Component

const ZukitPanel = ({ id, className, title, children, options = {}, ...props }) => {
	const getPanel = usePanelsContext()
	if (getPanel({ type: 'hidden', id })) return null
	if (getPanel({ type: 'falsely', id, options })) return null

	return (
		<PanelBody
			title={getPanel({ type: 'title', id }) || title}
			className={mergeClasses('zukit-panel', className)}
			{...props}
		>
			{children}
		</PanelBody>
	)
}

export default ZukitPanel
