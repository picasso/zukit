import { includes } from 'lodash-es'

import { mergeClasses, toRange } from '../utils.jsx'

// Zukit Divider Component

const defaultUnit = 'em'
const defaultSize = 2

const ZukitDivider = ({ className, size = defaultSize, unit = defaultUnit, bottomHalf }) => {
	const sizeUnit = includes(unit, ['px', 'em', 'rem', '%']) ? unit : defaultUnit
	const sizeValue = toRange(size, 0, 100)
	const style =
		sizeValue === 0
			? null
			: {
					marginBottom: `${bottomHalf ? sizeValue / 2 : sizeValue}${sizeUnit}`,
					paddingTop: `${sizeValue}${sizeUnit}`,
				}

	return <div className={mergeClasses('zukit-divider', className)} style={style} />
}

export default ZukitDivider
