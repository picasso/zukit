// WordPress dependencies

const { isNil } = lodash;
const { RawHTML } = wp.element;

// Internal dependencies

import { mergeClasses } from './../utils.js';
import { useLoader } from './../data/use-store.js';

// Loader Component

const Loader = ({
		className,
		loaderHTML,
}) => {

	return ( isNil(loaderHTML) ? null :
		<RawHTML className={ mergeClasses('zu-loader', className) }>
			{ loaderHTML }
		</RawHTML>
	);
}

const WithOptions = ({
		className,
		shape = 'none',
		duration,
		opacity,
}) => {

	const loaderHTML = useLoader(shape, duration, opacity);

	return (
		<Loader className={ className } loaderHTML={ loaderHTML } />
	);
}

Loader.WithOptions = WithOptions;

export default Loader;
