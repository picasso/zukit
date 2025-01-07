// WordPress dependencies
import { ColorIndicator } from '@wordpress/components'

// Internal dependencies
import { mergeClasses } from '../utils.jsx'

// Panel Title Indicator Component

const panelIndicatorPrefix = 'zukit-title-indicator'

const TitleIndicator = ({ className, isColor, title, value, colored, ...props }) => (
	<span className={className}>
		{title}
		{value &&
			(isColor ? (
				<ColorIndicator className={panelIndicatorPrefix} colorValue={value} {...props} />
			) : (
				<span
					className={mergeClasses(panelIndicatorPrefix, { [colored]: colored })}
					{...props}
				>
					{value}
				</span>
			))}
	</span>
)

export default TitleIndicator
