import { isNil } from 'lodash-es'

// WordPress dependencies
import { RawHTML } from '@wordpress/element'

// Internal dependencies
import { useLoaders } from '../data/use-store.js'
import { mergeClasses } from '../utils.jsx'

// Loader Component

const Loader = ({ className, loaderHTML }) => {
	return isNil(loaderHTML) ? null : (
		<RawHTML className={mergeClasses('zu-loader', className)}>{loaderHTML}</RawHTML>
	)
}

const WithOptions = ({ className, id = 'none', duration }) => {
	const loaderHTML = useLoaders(id, duration)
	return <Loader className={className} loaderHTML={loaderHTML} />
}

Loader.WithOptions = WithOptions

export default Loader
