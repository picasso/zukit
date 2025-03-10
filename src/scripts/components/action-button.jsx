// wordpress dependencies
import { Button, PanelRow, Spinner } from '@wordpress/components'
import { forwardRef } from '@wordpress/element'

// internal dependencies
import { mergeClasses, simpleMarkdown } from '../utils.jsx'

// Zukit Action Button component
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
					variant="secondary"
					onClick={() => onClick(value)}
					ref={ref}
					__next40pxDefaultSize
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
