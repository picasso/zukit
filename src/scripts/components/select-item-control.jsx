import {
	defaults,
	every,
	has,
	isFunction,
	isPlainObject,
	map,
	omit,
	pick,
	upperFirst,
} from 'lodash-es'

// WordPress dependencies
import { BaseControl, Button, ButtonGroup, Tooltip } from '@wordpress/components'

// Internal dependencies
import { getKey, mergeClasses } from '../utils.jsx'
import ConditionalWrap from './conditional-wrap.jsx'

// Select Item Component
const cname = 'zukit-select-item'
const buttonPossibleProps = [
	'accessibleWhenDisabled',
	'description',
	'disabled',
	'href',
	'icon',
	'iconPosition',
	'iconSize',
	'isBusy',
	'isDestructive',
	'isPressed',
	'label',
	'shortcut',
	'showTooltip',
	'text',
	'tooltipPosition',
	'target',
]

const SelectItemControl = ({
	className,
	columns = 2,
	isSecondary = true,
	isSmall = true,
	withoutControl, // if true the control will be wrapped in regular <div>, otherwise in <BaseControl>
	fillMissing, // if true then 'empty & disabled' items will be added to the required number based on the number of columns
	fillNull, // if true then convert 'null' value to 'striped' button
	recap, // maybe true (then default options will be used) or object with options (label, value, style, isDisabled)
	options, // array of object with keys 'value' and 'label' [{ label: 'Name', value: 2 }]
	// could be array of values - then it will be transformed to array of objects
	selectedItem, // value of selected item -> should be the same as in options
	transformValue, // if function -> then will be used to transform value to React component
	beforeItem, // if presented will be added before elements from options
	afterItem, // if presented will be added after elements from options
	label, // will be used as label and aria-label for ButtonGroup
	help, // will be used as help string under the control
	buttonStyle, // added as style to each Button, supports 'smart style' { isDisabled, isSelected }
	buttonClass, // added as class to each Button
	withLabels, // if true -> Buttons will be with labels (from options array)
	withTooltip, // if true -> Buttons will be with Toopltip (from options array)
	onClick,
	...additionalProps // all additional props go to Button
}) => {
	// fill 'missing' items with 'empty' slots if requested
	const missingCount = fillMissing
		? Math.ceil(options.length / columns) * columns - options.length
		: 0
	const missing = Array(missingCount)
		.fill()
		.map((_, i) => ({ value: `slot${i}`, isDisabled: true, isSlot: true }))
	// select the style depending on the button state (taken into account 'isDisabled' and 'isSelected')
	const smartStyle = (style, isDisabled, value, selectedItem) => {
		if (isDisabled && has(style, 'isDisabled')) return style['isDisabled']
		if (selectedItem === value && !isDisabled && has(style, 'isSelected'))
			return style['isSelected']
		return omit(style, ['isSelected', 'isDisabled'])
	}
	const makeItem = ({ label, value, style, isDisabled, isSlot, ...more }) => (
		<ConditionalWrap
			condition={withTooltip}
			wrap={Tooltip}
			text={label}
			key={getKey(value, label)}
		>
			<div
				key={getKey(value, label)}
				className={mergeClasses(`${cname}__button-wrapper`, `${cname}__${value}`, {
					'is-selected': selectedItem === value && !isDisabled,
					'is-disabled': isDisabled,
					'is-slot': isSlot,
					'is-null': fillNull && value === null,
				})}
			>
				<Button
					className={mergeClasses(`${cname}__button`, buttonClass, `${cname}__${value}`, {
						'is-selected': selectedItem === value && !isDisabled,
						// 'is-clickable': fillNull && value === null,
					})}
					variant={isSecondary ? 'secondary' : 'primary'}
					size={isSmall ? 'small' : 'default'}
					onClick={() => (isDisabled ? false : onClick(value))}
					style={style || smartStyle(buttonStyle, isDisabled, value, selectedItem)}
					__next40pxDefaultSize
					{...pick(additionalProps, buttonPossibleProps)}
				>
					{fillNull && value === null ? (
						<span className="is-null" />
					) : isSlot ? null : isFunction(transformValue) ? (
						transformValue(value, label, style, more)
					) : (
						value
					)}
				</Button>
				{!isSlot && withLabels && (
					<div className="block-editor-block-styles__item-label">{label}</div>
				)}
			</div>
		</ConditionalWrap>
	)

	const defaultRecapOptions = {
		label: upperFirst(selectedItem),
		value: selectedItem,
		style: null,
		isDisabled: true,
	}
	const recapOptions = isPlainObject(recap)
		? defaults(recap, defaultRecapOptions)
		: defaultRecapOptions
	const selectOptions = every(options, (o) => isPlainObject(o))
		? options
		: map(options, (o) => ({ label: upperFirst(o), value: o }))
	const baseClassName = mergeClasses(
		className,
		'components-base-control',
		cname,
		`__${columns}columns`,
		{ __recap: recap },
	)

	return (
		<ConditionalWrap
			condition={!withoutControl}
			wrap={BaseControl}
			className={baseClassName}
			label={label}
			help={help}
			__nextHasNoMarginBottom={true}
		>
			<ConditionalWrap condition={withoutControl} wrap="<div>" className={baseClassName}>
				<ButtonGroup aria-label={label}>
					{beforeItem}
					{recap && makeItem(recapOptions)}
					{map(selectOptions, makeItem)}
					{map(missing, makeItem)}
					{afterItem}
				</ButtonGroup>
			</ConditionalWrap>
		</ConditionalWrap>
	)
}

export default SelectItemControl
