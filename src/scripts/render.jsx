import { defaultsDeep, forEach, get, has, map, set } from 'lodash-es'

// WordPress dependencies
import { Button, SelectControl } from '@wordpress/components'
import { createRoot } from '@wordpress/element'
import { __ } from '@wordpress/i18n'

// Internal dependencies
import ZukitDivider from './components/divider.jsx'
import ZukitSkeleton from './components/skeleton.jsx'
import ZukitToggle from './components/toggle.jsx'
import { setRestBasics } from './fetch.js'
import { checkDependency, externalData, simpleMarkdown } from './utils.jsx'

export function externalDataSettings(pageId) {
	return externalData(`${pageId}_settings`)
}

export function renderPage(pageId, settings = {}) {
	const pageData = externalDataSettings(pageId)

	// restRouter serves to identify the plugin/theme that currently uses the REST API
	setRestBasics(pageData)

	if (get(settings, 'panels') !== undefined) {
		// Get 'debug_group' options key
		const debugPanelKey = get(pageData, 'inhouse.debug_group', null)
		// Add 'Debug Actions' panel defaults if 'debug_group' key is found
		if (debugPanelKey !== null) {
			defaultsDeep(settings.panels, {
				[debugPanelKey]: { label: __('Debug Plugin', 'zukit'), value: false },
			})
		}
		// Sync 'panels' with saved 'options' if presented
		const panels = get(pageData, ['options', get(pageData, 'inhouse.panels_group')], [])
		forEach(panels, (value, key) => set(settings, `panels.${key}.value`, value))
	}

	const pageEl = document.getElementById(pageId)
	if (pageEl !== null) {
		const root = createRoot(pageEl)
		root.render(<ZukitSkeleton id={pageId} {...pageData} {...settings} />)
	}
}

function checkDivider(item) {
	return has(item, 'divider') ? true : null
}

export function toggleOption(toggleData, options, updateOptions, withPath = null) {
	const fullKey = (k) => (withPath ? `${withPath}.${k}` : k)
	const optionValue = (k) => get(options, fullKey(k)) //  withPath ? `${withPath}.${k}` : k

	return map(
		toggleData,
		(item, key) =>
			checkDependency(item, options, false, withPath) && (
				<ZukitToggle
					key={key}
					withDivider={checkDivider(item) && item.divider}
					label={item.label}
					help={item.help}
					checked={!!optionValue(key)}
					onChange={() => updateOptions({ [fullKey(key)]: !optionValue(key) })}
				/>
			),
	)
}

export function selectOption(optionData, options, updateOptions, withPath = null) {
	const { id = '?', options: selectOptions = [], label = '', help, defaultValue } = optionData
	const selectId = withPath ? `${withPath}.${id}` : id
	const value = get(options, selectId, defaultValue)

	return (
		checkDependency(optionData, options, false, withPath) && (
			<>
				{checkDivider(optionData) && <ZukitDivider size={optionData.divider} />}
				<label className="components-base-control__label __select_label" htmlFor={id}>
					{label}
				</label>
				<div className="__select_block">
					<div className="__select_control">
						<SelectControl
							id={id}
							value={value}
							onChange={(value) => updateOptions({ [selectId]: value })}
							options={selectOptions}
						/>
						{defaultValue !== undefined && (
							<Button
								isSecondary
								className="__reset"
								onClick={() => updateOptions({ [selectId]: defaultValue })}
							>
								{__('Reset', 'zukit')}
							</Button>
						)}
					</div>
					<p className="components-base-control__help">
						{simpleMarkdown(help, { br: true })}
					</p>
				</div>
			</>
		)
	)
}

export function testComponentWithUpdate(component, updateOptions) {
	const TestComponent = get(wp, `zukit.components.${component}`)
	return !TestComponent ? null : <TestComponent updateOptions={updateOptions} />
}

// Subset of functions for 'zukit-blocks'
export const blocksSet = {
	toggleOption,
	selectOption,
}
