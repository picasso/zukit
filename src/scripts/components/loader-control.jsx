import { reduce } from 'lodash-es'

// WordPress dependencies
import { BaseControl, ToggleControl } from '@wordpress/components'
import { useCallback, useEffect, useState } from '@wordpress/element'
import { __ } from '@wordpress/i18n'

// Internal dependencies
import { alterClassWithClientId, cssWithClientId } from '../jquery-helpers.js'
import { mergeClasses } from '../utils.jsx'
import Loader from './loader.jsx'
import SelectItemControl from './select-item-control.jsx'

// Loader Control Component

const cprefix = 'zukit-loader-control'

const LoaderControl = ({
	clientId,
	className,
	editClassName = '__edit-mode',
	label,
	shape = 'none',
	loaders,
	setAttributes,
}) => {
	const [revealLoader, setRevealLoader] = useState(false)

	const onReveal = useCallback(() => {
		setRevealLoader(!revealLoader)
	}, [revealLoader])

	const onChange = useCallback(
		(loader) => {
			if (loaders === null) return
			setAttributes({
				loader,
				loaderHTML: loaders[loader] || '',
			})
		},
		[loaders, setAttributes],
	)

	// Clear all DOM modifications on unmount
	useEffect(() => {
		return () => {
			alterClassWithClientId(clientId, '> :first-child', editClassName)
			// cssWithClientId(clientId, 'opacity', undefined, `.${editClassName}`); // '.zu-gallery__edit'
			cssWithClientId(clientId, 'opacity', undefined, '.zu-loader')
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		alterClassWithClientId(
			clientId,
			'> :first-child',
			revealLoader ? null : editClassName,
			revealLoader ? editClassName : null,
		)
		// cssWithClientId(clientId, 'opacity', revealLoader ? 0.2 : undefined, `.${editClassName}`); // '.zu-gallery__edit'
		cssWithClientId(clientId, 'opacity', revealLoader ? 1 : undefined, '.zu-loader')
	}, [clientId, revealLoader, shape, editClassName])

	if (loaders === null) return null

	const loaderOptions = reduce(
		loaders,
		(options, _val, key) => {
			options.push({ value: String(key), label: String(key) })
			return options
		},
		[{ value: 'none', label: __('Without Loader', 'zukit') }],
	)

	/* translators: loader selection */
	const noLoader = <span>{__('none', 'zukit')}</span>

	return (
		<BaseControl className={mergeClasses(cprefix, className)} label={label}>
			<SelectItemControl
				withoutControl
				columns={3}
				options={loaderOptions}
				selectedItem={String(shape)}
				onClick={onChange}
				transformValue={(value) =>
					value === 'none' ? (
						noLoader
					) : (
						<Loader loaderHTML={loaders[parseInt(value, 10)]} />
					)
				}
			/>
			<ToggleControl
				label={__('Reveal Loader', 'zukit')}
				checked={revealLoader}
				onChange={onReveal}
			/>
		</BaseControl>
	)
}

export default LoaderControl
