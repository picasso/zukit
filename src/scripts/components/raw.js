// wordpress dependencies
import { createElement } from '@wordpress/element'

// alternative RawHTML component
const RawHTML = ({ tag = 'p', children, ...props }) => {
	return createElement(tag, {
		dangerouslySetInnerHTML: { __html: children },
		...props,
	})
}

export default RawHTML
