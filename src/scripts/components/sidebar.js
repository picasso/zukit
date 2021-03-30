// WordPress dependencies

const { get, map, isEmpty, isNil, omitBy, pickBy } = lodash;
const { __ } = wp.i18n;
const { Fragment, useCallback } = wp.element;
const { PanelBody, PanelRow, Button, ExternalLink, ToggleControl, Spinner } = wp.components;

// Internal dependencies

import { mergeClasses, checkDependency, simpleMarkdown } from './../utils.js';

// Zukit Sidebar Component

function availablePanels(panels, options) {
	return pickBy(panels, p => checkDependency(p, options));
}

const ZukitSidebar = ({
		// id,
		// wp,
		version,
		title,
		author,
		link,
		description,
		icon = null,
		more,

		actions,
		actionLoading,
		debug,
		ajaxAction,

		options,
		updateOptions,

		getPanel,
		setPanel,
}) => {

	const panels = availablePanels(getPanel(), options);
	const moreItems = omitBy(more, isNil);
	const pluginActions = pickBy(omitBy(actions, isNil), ({depends}) => checkDependency(depends, options, true));

	const hasMoreItems = !isEmpty(moreItems);
	const hasActions = !isEmpty(pluginActions);
	const hasPanels = !isEmpty(panels);

	const debugSet = get(debug, 'prefix', null);
	const debugOptions = debugSet ? get(debug, 'options') : null;
	const debugActions =  debugSet ? omitBy(get(debug, 'actions'), isNil) : null;
	const hasDebug = (!isEmpty(debugActions) || !isEmpty(debugOptions)) && get(panels, `${debugSet}.value`) === true;
	const debugValue = k => get(options, debugSet ? `${debugSet}.${k}` : k);

	const toggleDebugOptions = useCallback(key => {
		updateOptions({ [`${debugSet}.${key}`]: !get(options, `${debugSet}.${key}`) })
	}, [debugSet, options, updateOptions]);

	const resetOptions = useCallback(() => {
		ajaxAction('reset_options', options => updateOptions(options, true));
	}, [ajaxAction, updateOptions]);

	return (
		<div className="block-editor-block-inspector">
			<div className="block-editor-block-card">
				{ icon }
				<div className="block-editor-block-card__content">
					<h2 className="block-editor-block-card__title">
						{ title }
					</h2>
					<span className="block-editor-block-card__description">
					{ description }
					</span>
				</div>
			</div>
			<PanelBody title={ __('Plugin Info', 'zukit') } initialOpen={ false }>
				<PanelRow>
					<span>{ __('Version', 'zukit') }</span>
					<span>{ version }</span>
				</PanelRow>
				<PanelRow>
					<span>{ __('Author', 'zukit') }</span>
					<ExternalLink href={ link }>{ author }</ExternalLink>
				</PanelRow>
				{ hasMoreItems && map(moreItems, ({ label, value, link }, moreKey) =>
						<PanelRow key={ moreKey }>
							<span>{ label }</span>
							{ link ?
								<ExternalLink href={ link }>{ value }</ExternalLink>
								:
								<span>{ value }</span>
							}
						</PanelRow>
				) }
				<PanelRow>
					<Button
						className="__plugin_actions admin-blue"
						icon={ 'admin-settings' }
						isSecondary
						onClick={ resetOptions }
					>
						{ __('Reset Plugin Options', 'zukit') }
					</Button>
				</PanelRow>
			</PanelBody>
			{ hasActions &&
				<PanelBody title={ __('Actions', 'zukit') } initialOpen={ true }>
					{ map(pluginActions, ({ label, value, icon, color, help, depends }, actionKey) => (
						checkDependency(depends, options, true) &&
							<Fragment key={ actionKey }>
								<PanelRow>
									<Button
										className={ mergeClasses('__plugin_actions', {
											[color]: color,
											'is-loading': get(actionLoading, value),
											})
										}
										icon={ icon }
										isSecondary
										onClick={ () => ajaxAction(value) }
									>
										{ label }
										{ get(actionLoading, value) && <Spinner/> }
									</Button>
								</PanelRow>
								{ help &&
									<p className={ mergeClasses('__help', { [color]: color }) }>
										{ simpleMarkdown(help, { br: true }) }
									</p>
								}
							</Fragment>
						)
					) }
				</PanelBody>
			}
			{ hasPanels &&
				<PanelBody title={ __('Screen Options', 'zukit') } initialOpen={ false }>
					{ map(panels, ({ label, value, help }, panelKey) =>
						<ToggleControl
							key={ panelKey }
							label={ label }
							help={ help  }
							checked={ value }
							onChange={ () => setPanel({ [panelKey]: !value }) }
						/>
					) }
				</PanelBody>
			}
			{ hasDebug &&
				<PanelBody title={ getPanel({ type: 'title', id: debugSet }) } initialOpen={ false }>
					{ map(debugOptions, ({ label, help }, key) =>
						<ToggleControl
							key={ key }
							label={ label }
							help={ help  }
							checked={ !!debugValue(key) }
							onChange={ () => toggleDebugOptions(key) }
						/>
					) }
					{ map(debugActions, ({ label, value, icon, color }, actionKey) =>
						<PanelRow key={ actionKey }>
							<Button
								className={ mergeClasses('__plugin_actions', {
									[color]: color,
									'is-loading': get(actionLoading, value),
									})
								}
								icon={ icon }
								isSecondary
								onClick={ () => ajaxAction(value) }
							>
								{ label }
								{ get(actionLoading, value) && <Spinner/> }
							</Button>
						</PanelRow>
					) }
				</PanelBody>
			}
		</div>
	);
}

export default ZukitSidebar;
