// WordPress dependencies
import { Button, PanelRow, Spinner } from '@wordpress/components'
import { forwardRef } from '@wordpress/element'

// Internal dependencies
import { mergeClasses, simpleMarkdown } from '../utils.jsx'

// Zukit Action Button Component

const ZukitActionButton = (
	{ className, isLoading, icon, color, label, help, value, onClick },
	ref,
) => {
	return (
		<>
			<PanelRow>
				<Button
					className={mergeClasses(
						'__plugin_actions',
						{
							[color]: color,
							'is-loading': isLoading,
						},
						className,
					)}
					icon={icon}
					isSecondary
					onClick={() => onClick(value)}
					ref={ref}
				>
					{label}
					{isLoading && <Spinner />}
				</Button>
			</PanelRow>
			{help && (
				<p className={mergeClasses('__help', '__zu_markdown', { [color]: color })}>
					{simpleMarkdown(help, { br: true })}
				</p>
			)}
		</>
	)
}

const ForwardButton = forwardRef(ZukitActionButton)
export default ForwardButton
