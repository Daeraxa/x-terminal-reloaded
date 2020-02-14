/** @babel */
/** @module atom-xterm */
/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Copyright 2017-2018 Andres Mejia <amejia004@gmail.com>. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import '../styles/atom-xterm.sass'

import { CompositeDisposable } from 'atom'

import atomXtermConfig from './atom-xterm-config'
import { AtomXtermElement } from './atom-xterm-element'
import { AtomXtermModel, isAtomXtermModel } from './atom-xterm-model'
import { ATOM_XTERM_BASE_URI, AtomXtermProfilesSingleton } from './atom-xterm-profiles'
import { AtomXtermProfileMenuElement } from './atom-xterm-profile-menu-element'
import { AtomXtermProfileMenuModel } from './atom-xterm-profile-menu-model'
import { AtomXtermDeleteProfileElement } from './atom-xterm-delete-profile-element'
import { AtomXtermDeleteProfileModel } from './atom-xterm-delete-profile-model'
import { AtomXtermOverwriteProfileElement } from './atom-xterm-overwrite-profile-element'
import { AtomXtermOverwriteProfileModel } from './atom-xterm-overwrite-profile-model'
import { AtomXtermSaveProfileElement } from './atom-xterm-save-profile-element'
import { AtomXtermSaveProfileModel } from './atom-xterm-save-profile-model'

import { URL } from 'whatwg-url'

const AtomXtermSingletonSymbol = Symbol('AtomXtermSingleton sentinel')

class AtomXtermSingleton {
	constructor (symbolCheck) {
		if (AtomXtermSingletonSymbol !== symbolCheck) {
			throw new Error('AtomXtermSingleton cannot be instantiated directly.')
		}
	}

	static get instance () {
		if (!this[AtomXtermSingletonSymbol]) {
			this[AtomXtermSingletonSymbol] = new AtomXtermSingleton(AtomXtermSingletonSymbol)
		}
		return this[AtomXtermSingletonSymbol]
	}

	activate (state) {
		// Load profiles configuration.
		this.profilesSingleton = AtomXtermProfilesSingleton.instance

		// Reset base profile in case this package was deactivated then
		// reactivated.
		this.profilesSingleton.resetBaseProfile()

		// Disposables for this plugin.
		this.disposables = new CompositeDisposable()

		// Set holding all terminals available at any moment.
		this.terminals_set = new Set()

		// Monitor for changes to all config values.
		const configKeys = [
			'atom-xterm.spawnPtySettings.command',
			'atom-xterm.spawnPtySettings.args',
			'atom-xterm.spawnPtySettings.name',
			'atom-xterm.spawnPtySettings.cwd',
			'atom-xterm.spawnPtySettings.env',
			'atom-xterm.spawnPtySettings.setEnv',
			'atom-xterm.spawnPtySettings.deleteEnv',
			'atom-xterm.spawnPtySettings.encoding',
			'atom-xterm.terminalSettings.fontSize',
			'atom-xterm.terminalSettings.fontFamily',
			'atom-xterm.terminalSettings.colors.theme',
			'atom-xterm.terminalSettings.colors.foreground',
			'atom-xterm.terminalSettings.colors.background',
			'atom-xterm.terminalSettings.colors.cursor',
			'atom-xterm.terminalSettings.colors.cursorAccent',
			'atom-xterm.terminalSettings.colors.selection',
			'atom-xterm.terminalSettings.colors.black',
			'atom-xterm.terminalSettings.colors.red',
			'atom-xterm.terminalSettings.colors.green',
			'atom-xterm.terminalSettings.colors.yellow',
			'atom-xterm.terminalSettings.colors.blue',
			'atom-xterm.terminalSettings.colors.magenta',
			'atom-xterm.terminalSettings.colors.cyan',
			'atom-xterm.terminalSettings.colors.white',
			'atom-xterm.terminalSettings.colors.brightBlack',
			'atom-xterm.terminalSettings.colors.brightRed',
			'atom-xterm.terminalSettings.colors.brightGreen',
			'atom-xterm.terminalSettings.colors.brightYellow',
			'atom-xterm.terminalSettings.colors.brightBlue',
			'atom-xterm.terminalSettings.colors.brightMagenta',
			'atom-xterm.terminalSettings.colors.brightCyan',
			'atom-xterm.terminalSettings.colors.brightWhite',
			'atom-xterm.terminalSettings.leaveOpenAfterExit',
			'atom-xterm.terminalSettings.allowRelaunchingTerminalsOnStartup',
			'atom-xterm.terminalSettings.relaunchTerminalOnStartup',
			'atom-xterm.terminalSettings.title',
			'atom-xterm.terminalSettings.xtermOptions',
			'atom-xterm.terminalSettings.promptToStartup',
		]
		for (const key of configKeys) {
			this.disposables.add(atom.config.onDidChange(key, ({ newValue, oldValue }) => {
				this.profilesSingleton.resetBaseProfile()
			}))
		}

		// Register view provider for terminal emulator item.
		this.disposables.add(atom.views.addViewProvider(AtomXtermModel, (atomXtermModel) => {
			const atomXtermElement = new AtomXtermElement()
			atomXtermElement.initialize(atomXtermModel)
			return atomXtermElement
		}))

		// Register view provider for terminal emulator profile menu item.
		this.disposables.add(atom.views.addViewProvider(AtomXtermProfileMenuModel, (atomXtermProfileMenuModel) => {
			const atomXtermProfileMenuElement = new AtomXtermProfileMenuElement()
			atomXtermProfileMenuElement.initialize(atomXtermProfileMenuModel)
			return atomXtermProfileMenuElement
		}))

		// Register view profile for modal items.
		this.disposables.add(atom.views.addViewProvider(AtomXtermDeleteProfileModel, (atomXtermDeleteProfileModel) => {
			const atomXtermDeleteProfileElement = new AtomXtermDeleteProfileElement()
			atomXtermDeleteProfileElement.initialize(atomXtermDeleteProfileModel)
			return atomXtermDeleteProfileElement
		}))
		this.disposables.add(atom.views.addViewProvider(AtomXtermOverwriteProfileModel, (atomXtermOverwriteProfileModel) => {
			const atomXtermOverwriteProfileElement = new AtomXtermOverwriteProfileElement()
			atomXtermOverwriteProfileElement.initialize(atomXtermOverwriteProfileModel)
			return atomXtermOverwriteProfileElement
		}))
		this.disposables.add(atom.views.addViewProvider(AtomXtermSaveProfileModel, (atomXtermSaveProfileModel) => {
			const atomXtermSaveProfileElement = new AtomXtermSaveProfileElement()
			atomXtermSaveProfileElement.initialize(atomXtermSaveProfileModel)
			return atomXtermSaveProfileElement
		}))

		// Add opener for terminal emulator item.
		this.disposables.add(atom.workspace.addOpener((uri) => {
			if (uri.startsWith(ATOM_XTERM_BASE_URI)) {
				const item = new AtomXtermModel({
					uri: uri,
					terminals_set: this.terminals_set,
				})
				return item
			}
		}))

		// Set callback to run on current and future panes.
		this.disposables.add(atom.workspace.observePanes((pane) => {
			// In callback, set another callback to run on current and future items.
			this.disposables.add(pane.observeItems((item) => {
				// In callback, set current pane for terminal items.
				if (isAtomXtermModel(item)) {
					item.setNewPane(pane)
				}
			}))
		}))

		// Add callbacks to run for current and future active items on active panes.
		this.disposables.add(atom.workspace.observeActivePaneItem((item) => {
			// In callback, focus specifically on terminal when item is terminal item.
			if (isAtomXtermModel(item)) {
				item.focusOnTerminal()
			}
		}))

		// Add commands.
		this.disposables.add(atom.commands.add('atom-workspace', {
			'atom-xterm:open': () => {
				this.openInCenterOrDock(atom.workspace)
			},
			'atom-xterm:open-split-up': () => this.open(
				this.profilesSingleton.generateNewUri(),
				{ split: 'up' },
			),
			'atom-xterm:open-split-down': () => this.open(
				this.profilesSingleton.generateNewUri(),
				{ split: 'down' },
			),
			'atom-xterm:open-split-left': () => this.open(
				this.profilesSingleton.generateNewUri(),
				{ split: 'left' },
			),
			'atom-xterm:open-split-right': () => this.open(
				this.profilesSingleton.generateNewUri(),
				{ split: 'right' },
			),
			'atom-xterm:open-split-bottom-dock': () => {
				this.openInCenterOrDock(atom.workspace.getBottomDock())
			},
			'atom-xterm:open-split-left-dock': () => {
				this.openInCenterOrDock(atom.workspace.getLeftDock())
			},
			'atom-xterm:open-split-right-dock': () => {
				this.openInCenterOrDock(atom.workspace.getRightDock())
			},
			'atom-xterm:toggle-profile-menu': () => this.toggleProfileMenu(),
			'atom-xterm:reorganize': () => this.reorganize('current'),
			'atom-xterm:reorganize-top': () => this.reorganize('top'),
			'atom-xterm:reorganize-bottom': () => this.reorganize('bottom'),
			'atom-xterm:reorganize-left': () => this.reorganize('left'),
			'atom-xterm:reorganize-right': () => this.reorganize('right'),
			'atom-xterm:reorganize-bottom-dock': () => this.reorganize('bottom-dock'),
			'atom-xterm:reorganize-left-dock': () => this.reorganize('left-dock'),
			'atom-xterm:reorganize-right-dock': () => this.reorganize('right-dock'),
			'atom-xterm:close-all': () => this.exitAllTerminals(),
		}))
		this.disposables.add(atom.commands.add('atom-xterm', {
			'atom-xterm:close': () => this.close(),
			'atom-xterm:restart': () => this.restart(),
			'atom-xterm:copy': () => this.copy(),
			'atom-xterm:paste': () => this.paste(),
			'atom-xterm:open-link': () => this.openLink(),
			'atom-xterm:copy-link': () => this.copyLink(),
		}))
	}

	deactivate () {
		this.exitAllTerminals()
		this.disposables.dispose()
	}

	deserializeAtomXtermModel (serializedModel, atomEnvironment) {
		const pack = atom.packages.enablePackage('atom-xterm')
		pack.preload()
		pack.activateNow()
		const allowRelaunchingTerminalsOnStartup = atom.config.get('atom-xterm.terminalSettings.allowRelaunchingTerminalsOnStartup')
		if (!allowRelaunchingTerminalsOnStartup) {
			return
		}
		const url = new URL(serializedModel.uri)
		const relaunchTerminalOnStartup = url.searchParams.get('relaunchTerminalOnStartup')
		if (relaunchTerminalOnStartup === 'false') {
			return
		}
		return new AtomXtermModel({
			uri: url.href,
			terminals_set: this.terminals_set,
		})
	}

	openInCenterOrDock (centerOrDock) {
		const options = {}
		const pane = centerOrDock.getActivePane()
		if (pane) {
			options.pane = pane
		}
		this.open(
			this.profilesSingleton.generateNewUri(),
			options,
		)
	}

	refitAllTerminals () {
		const currentActivePane = atom.workspace.getActivePane()
		const currentActiveItem = currentActivePane.getActiveItem()
		for (const terminal of this.terminals_set) {
			// To refit, simply bring the terminal in focus in order for the
			// resize event to refit the terminal.
			const paneActiveItem = terminal.pane.getActiveItem()
			terminal.pane.getElement().focus()
			terminal.pane.setActiveItem(terminal)
			terminal.pane.setActiveItem(paneActiveItem)
		}
		currentActivePane.getElement().focus()
		currentActivePane.setActiveItem(currentActiveItem)
	}

	exitAllTerminals () {
		for (const terminal of this.terminals_set) {
			terminal.exit()
		}
	}

	async open (uri, options = {}) {
		const url = new URL(uri)
		let relaunchTerminalOnStartup = url.searchParams.get('relaunchTerminalOnStartup')
		if (relaunchTerminalOnStartup === null) {
			relaunchTerminalOnStartup = this.profilesSingleton.getBaseProfile().relaunchTerminalOnStartup
			if (!relaunchTerminalOnStartup) {
				url.searchParams.set('relaunchTerminalOnStartup', false)
			}
		}
		return atom.workspace.open(url.href, options)
	}

	/**
   * Service function which is a wrapper around 'atom.workspace.open()'. The
   * only difference with this function from 'atom.workspace.open()' is that it
   * accepts a profile Object as the first argument.
   *
   * @async
   * @function
   * @param {Object} profile Profile data to use when opening terminal.
   * @param {Object} options Options to pass to call to 'atom.workspace.open()'.
   * @return {AtomXtermModel} Instance of AtomXtermModel.
   */
	async openTerminal (profile, options = {}) {
		return this.open(
			AtomXtermProfilesSingleton.instance.generateNewUrlFromProfileData(profile),
			options,
		)
	}

	/**
   * Function providing service functions offered by 'atom-xterm' package.
   *
   * @function
   * @returns {Object} Object holding service functions.
   */
	provideAtomXtermService () {
		return {
			openTerminal: async (...args) => {
				return this.openTerminal(...args)
			},
		}
	}

	performOperationOnItem (operation) {
		const item = atom.workspace.getActivePaneItem()
		if (isAtomXtermModel(item)) {
			switch (operation) {
			case 'close':
				item.exit()
				break
			case 'restart':
				item.restartPtyProcess()
				break
			case 'copy':
				atom.clipboard.write(item.copyFromTerminal())
				break
			case 'paste':
				item.pasteToTerminal(atom.clipboard.read())
				break
			case 'open-link':
				item.openHoveredLink()
				break
			case 'copy-link': {
				const link = item.getHoveredLink()
				if (link) {
					atom.clipboard.write(link)
				}
				break
			}
			default:
				throw new Error('Unknown operation: ' + operation)
			}
		}
	}

	close () {
		this.performOperationOnItem('close')
	}

	restart () {
		this.performOperationOnItem('restart')
	}

	copy () {
		this.performOperationOnItem('copy')
	}

	paste () {
		this.performOperationOnItem('paste')
	}

	openLink () {
		this.performOperationOnItem('open-link')
	}

	copyLink () {
		this.performOperationOnItem('copy-link')
	}

	toggleProfileMenu () {
		const item = atom.workspace.getActivePaneItem()
		if (isAtomXtermModel(item)) {
			item.toggleProfileMenu()
		}
	}

	reorganize (orientation) {
		if (this.terminals_set.size === 0) {
			return
		}
		const activePane = atom.workspace.getActivePane()
		let activeItem = activePane.getActiveItem()
		let newPane
		switch (orientation) {
		case 'current':
			newPane = activePane
			break
		case 'top':
			newPane = activePane.findTopmostSibling().splitUp()
			break
		case 'bottom':
			newPane = activePane.findBottommostSibling().splitDown()
			break
		case 'left':
			newPane = activePane.findLeftmostSibling().splitLeft()
			break
		case 'right':
			newPane = activePane.findRightmostSibling().splitRight()
			break
		case 'bottom-dock':
			newPane = atom.workspace.getBottomDock().getActivePane()
			break
		case 'left-dock':
			newPane = atom.workspace.getLeftDock().getActivePane()
			break
		case 'right-dock':
			newPane = atom.workspace.getRightDock().getActivePane()
			break
		default:
			throw new Error('Unknown orientation: ' + orientation)
		}
		for (const item of this.terminals_set) {
			item.pane.moveItemToPane(item, newPane, -1)
		}
		if (isAtomXtermModel(activeItem)) {
			if (atom.workspace.getPanes().length > 1) {
				// When reorganizing still leaves more than one pane in the
				// workspace, another pane that doesn't include the newly
				// reorganized terminal tabs needs to be focused in order for
				// the terminal views to get properly resized in the new pane.
				// All this is yet another quirk.
				for (const pane of atom.workspace.getPanes()) {
					if (pane !== activeItem.pane) {
						pane.getElement().focus()
						break
					}
				}
			}
			activeItem.pane.getElement().focus()
			activeItem.pane.setActiveItem(activeItem)
		} else if (activeItem instanceof HTMLElement) {
			activeItem.focus()
		} else if (typeof activeItem.getElement === 'function') {
			activeItem = activeItem.getElement()
			activeItem.focus()
		}
	}
}

function configOrder (obj) {
	let order = 1
	for (const name in obj) {
		obj[name].order = order++
		if (obj[name].type === 'object' && 'properties' in obj[name]) {
			configOrder(obj[name].properties)
		}
	}
	return obj
}

export const config = configOrder({
	spawnPtySettings: {
		title: 'Shell Process Settings',
		description: 'Settings related to the process running the shell.',
		type: 'object',
		properties: {
			command: {
				title: 'Command',
				description: 'Command to run',
				type: 'string',
				default: atomXtermConfig.getDefaultShellCommand(),
			},
			args: {
				title: 'Arguments',
				description: 'Arguments to pass to command, must be in a JSON array.',
				type: 'string',
				default: atomXtermConfig.getDefaultArgs(),
			},
			name: {
				title: 'Terminal Type',
				description: 'The terminal type to use.',
				type: 'string',
				default: atomXtermConfig.getDefaultTermType(),
			},
			cwd: {
				title: 'Working Directory',
				description: 'The working directory to use when launching command.',
				type: 'string',
				default: atomXtermConfig.getDefaultCwd(),
			},
			env: {
				title: 'Environment',
				description: 'The environment to use when launching command, must be in a JSON object. If not set, defaults to the current environment.',
				type: 'string',
				default: atomXtermConfig.getDefaultEnv(),
			},
			setEnv: {
				title: 'Environment Overrides',
				description: 'Environment variables to use in place of the atom process environment, must be in a JSON object.',
				type: 'string',
				default: atomXtermConfig.getDefaultSetEnv(),
			},
			deleteEnv: {
				title: 'Environment Deletions',
				description: 'Environment variables to delete from original environment, must be in a JSON array.',
				type: 'string',
				default: atomXtermConfig.getDefaultDeleteEnv(),
			},
			encoding: {
				title: 'Character Encoding',
				description: 'Character encoding to use in spawned terminal.',
				type: 'string',
				default: atomXtermConfig.getDefaultEncoding(),
			},
		},
	},
	terminalSettings: {
		title: 'Terminal Emulator Settings',
		description: 'Settings for the terminal emulator.',
		type: 'object',
		properties: {
			fontSize: {
				title: 'Font Size',
				description: 'Font size used in terminal emulator.',
				type: 'integer',
				default: atomXtermConfig.getDefaultFontSize(),
				minimum: atomXtermConfig.getMinimumFontSize(),
				maximum: atomXtermConfig.getMaximumFontSize(),
			},
			fontFamily: {
				title: 'Font Family',
				description: 'Font family used in terminal emulator.',
				type: 'string',
				default: atomXtermConfig.getDefaultFontFamily(),
			},
			colors: {
				title: 'Colors',
				description: 'Settings for the terminal colors.',
				type: 'object',
				properties: {
					theme: {
						title: 'Theme',
						description: 'Theme used in terminal emulator.',
						type: 'string',
						enum: [
							'Custom',
							'Atom Dark',
							'Atom Light',
							'Base16 Tomorrow Dark',
							'Base16 Tomorrow Light',
							'Christmas',
							'City Lights',
							'Dracula',
							'Grass',
							'Homebrew',
							'Inverse',
							'Linux',
							'Man Page',
							'Novel',
							'Ocean',
							'One Dark',
							'One Light',
							'Predawn',
							'Pro',
							'Red Sands',
							'Red',
							'Silver Aerogel',
							'Solarized Dark',
							'Solarized Light',
							'Solid Colors',
							'Standard',
						],
						default: atomXtermConfig.getDefaultTheme(),
					},
					foreground: {
						title: 'Text Color',
						description: 'This will be overridden if the theme is not \'Custom\'.',
						type: 'color',
						default: atomXtermConfig.getDefaultColorForeground(),
					},
					background: {
						title: 'Background Color',
						description: 'This will be overridden if the theme is not \'Custom\'.',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBackground(),
					},
					cursor: {
						title: 'Cursor Color',
						description: 'Can be transparent. This will be overridden if the theme is not \'Custom\'.',
						type: 'color',
						default: atomXtermConfig.getDefaultColorCursor(),
					},
					cursorAccent: {
						title: 'Cursor Text Color',
						description: 'Can be transparent. This will be overridden if the theme is not \'Custom\'.',
						type: 'color',
						default: atomXtermConfig.getDefaultColorCursorAccent(),
					},
					selection: {
						title: 'Selection Background Color',
						description: 'Can be transparent. This will be overridden if the theme is not \'Custom\'.',
						type: 'color',
						default: atomXtermConfig.getDefaultColorSelection(),
					},
					black: {
						title: 'ANSI Black',
						description: '`\\x1b[30m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBlack(),
					},
					red: {
						title: 'ANSI Red',
						description: '`\\x1b[31m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorRed(),
					},
					green: {
						title: 'ANSI Green',
						description: '`\\x1b[32m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorGreen(),
					},
					yellow: {
						title: 'ANSI Yellow',
						description: '`\\x1b[33m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorYellow(),
					},
					blue: {
						title: 'ANSI Blue',
						description: '`\\x1b[34m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBlue(),
					},
					magenta: {
						title: 'ANSI Magenta',
						description: '`\\x1b[35m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorMagenta(),
					},
					cyan: {
						title: 'ANSI Cyan',
						description: '`\\x1b[36m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorCyan(),
					},
					white: {
						title: 'ANSI White',
						description: '`\\x1b[37m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorWhite(),
					},
					brightBlack: {
						title: 'ANSI Bright Black',
						description: '`\\x1b[1;30m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightBlack(),
					},
					brightRed: {
						title: 'ANSI Bright Red',
						description: '`\\x1b[1;31m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightRed(),
					},
					brightGreen: {
						title: 'ANSI Bright Green',
						description: '`\\x1b[1;32m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightGreen(),
					},
					brightYellow: {
						title: 'ANSI Bright Yellow',
						description: '`\\x1b[1;33m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightYellow(),
					},
					brightBlue: {
						title: 'ANSI Bright Blue',
						description: '`\\x1b[1;34m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightBlue(),
					},
					brightMagenta: {
						title: 'ANSI Bright Magenta',
						description: '`\\x1b[1;35m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightMagenta(),
					},
					brightCyan: {
						title: 'ANSI Bright Cyan',
						description: '`\\x1b[1;36m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightCyan(),
					},
					brightWhite: {
						title: 'ANSI Bright White',
						description: '`\\x1b[1;37m`',
						type: 'color',
						default: atomXtermConfig.getDefaultColorBrightWhite(),
					},
				},
			},
			leaveOpenAfterExit: {
				title: 'Leave Open After Exit',
				description: 'Whether to leave terminal emulators open after their shell processes have exited.',
				type: 'boolean',
				default: atomXtermConfig.getDefaultLeaveOpenAfterExit(),
			},
			allowRelaunchingTerminalsOnStartup: {
				title: 'Allow relaunching terminals on startup',
				description: 'Whether to allow relaunching terminals on startup.',
				type: 'boolean',
				default: atomXtermConfig.getDefaultAllowRelaunchingTerminalsOnStartup(),
			},
			relaunchTerminalOnStartup: {
				title: 'Relaunch terminal on startup',
				description: 'Whether to relaunch terminal on startup.',
				type: 'boolean',
				default: atomXtermConfig.getDefaultRelaunchTerminalOnStartup(),
			},
			title: {
				title: 'Terminal tab title',
				description: 'Title to use for terminal tabs.',
				type: 'string',
				default: atomXtermConfig.getDefaultTitle(),
			},
			xtermOptions: {
				title: 'xterm.js Terminal Options',
				description: 'Options to apply to xterm.js Terminal objects. (https://xtermjs.org/docs/api/terminal/interfaces/iterminaloptions/#properties)',
				type: 'string',
				default: atomXtermConfig.getDefaultXtermOptions(),
			},
			promptToStartup: {
				title: 'Prompt to start command',
				description: 'Whether to prompt to start command in terminal on startup.',
				type: 'boolean',
				default: atomXtermConfig.getDefaultPromptToStartup(),
			},
		},
	},
})

export function activate (state) {
	return AtomXtermSingleton.instance.activate(state)
}

export function deactivate () {
	return AtomXtermSingleton.instance.deactivate()
}

export function deserializeAtomXtermModel (serializedModel, atomEnvironment) {
	return AtomXtermSingleton.instance.deserializeAtomXtermModel(
		serializedModel,
		atomEnvironment,
	)
}

export function provideAtomXtermService () {
	return AtomXtermSingleton.instance.provideAtomXtermService()
}
