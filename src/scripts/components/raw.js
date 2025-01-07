// WordPress dependencies
import { createElement } from '@wordpress/element'

// Alternative RawHTML Component

const RawHTML = ({ tag = 'p', children, ...props }) => {
	return createElement(tag, {
		dangerouslySetInnerHTML: { __html: children },
		...props,
	})
}

export default RawHTML
