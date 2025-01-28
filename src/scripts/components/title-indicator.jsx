// wordpress dependencies
import { ColorIndicator } from '@wordpress/components'

// internal dependencies
import { mergeClasses } from '../utils.jsx'

// Title Indicator component
const titleIndicatorPrefix = 'zukit-title-indicator'

const TitleIndicator = ({ className, isColor, title, value, colored, boxed, ...props }) => (
	<span className={mergeClasses(titleIndicatorPrefix, className, { [colored]: colored })}>
		{title}
		{value &&
			(isColor ? (
				<ColorIndicator className="__indicator" colorValue={value} {...props} />
			) : (
				<span className={mergeClasses('__indicator', { boxed })} {...props}>
					{value}
				</span>
			))}
	</span>
)

export default TitleIndicator
