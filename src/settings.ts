import { PluginSettingTab, Setting, App } from 'obsidian';
import type RubiksCubePlugin from './main';

export interface RubiksCubeSettings {
	defaultPuzzle: string;
	showFaceLabels: boolean;
	darkBackground: boolean;
}

export const DEFAULT_SETTINGS: RubiksCubeSettings = {
	defaultPuzzle: '3x3',
	showFaceLabels: true,
	darkBackground: true,
};

const PUZZLE_OPTIONS: Record<string, string> = {
	'3x3': '三阶魔方 (3x3x3)',
	'2x2': '二阶魔方 (2x2x2)',
	'4x4': '四阶魔方 (4x4x4)',
	'5x5': '五阶魔方 (5x5x5)',
	'6x6': '六阶魔方 (6x6x6)',
	'7x7': '七阶魔方 (7x7x7)',
	'pyraminx': '金字塔魔方 (Pyraminx)',
	'skewb': '斜转魔方 (Skewb)',
	'clock': '魔表 (Clock)',
	'square-one': 'SQ1 魔方 (Square-1)',
	'megaminx': '五魔方 (Megaminx)',
	'random': '随机',
};

export class RubiksCubeSettingTab extends PluginSettingTab {
	plugin: RubiksCubePlugin;

	constructor(app: App, plugin: RubiksCubePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Rubik\'s Cube Viewer - 设置' });

		// Default puzzle type
		new Setting(containerEl)
			.setName('默认魔方类型')
			.setDesc('当 cube 代码块未指定 cube: 键时使用的默认魔方')
			.addDropdown(dropdown => {
				for (const [key, label] of Object.entries(PUZZLE_OPTIONS)) {
					dropdown.addOption(key, label);
				}
				dropdown.setValue(this.plugin.settings.defaultPuzzle);
				dropdown.onChange(async (value) => {
					this.plugin.settings.defaultPuzzle = value;
					await this.plugin.saveSettings();
				});
			});

		// Show face labels
		new Setting(containerEl)
			.setName('显示面标签')
			.setDesc('在魔方渲染图中显示每个面的字母标签（U/F/R 等）')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.showFaceLabels);
				toggle.onChange(async (value) => {
					this.plugin.settings.showFaceLabels = value;
					await this.plugin.saveSettings();
				});
			});

		// Dark background
		new Setting(containerEl)
			.setName('深色背景')
			.setDesc('使用深色背景渲染魔方面（适合深色主题）')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.darkBackground);
				toggle.onChange(async (value) => {
					this.plugin.settings.darkBackground = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl('hr');

		containerEl.createEl('h3', { text: '支持的魔方类型' });
		const infoBox = containerEl.createDiv({ cls: 'cube-settings-info' });
		infoBox.createEl('p', {
			text: '在代码块中使用 cube: 键指定魔方类型，支持以下关键词（不区分大小写）：',
		});
		const list = infoBox.createEl('ul');
		const items = [
			'3x3 / 3 — 三阶魔方',
			'2x2 / 2 — 二阶魔方',
			'4x4 / 4 到 7x7 / 7 — 四到七阶魔方',
			'mega / minx / megaminx — 五魔方',
			'pyra / pyram / pyraminx — 金字塔魔方',
			'clock — 魔表',
			'sq1 / sq-1 / square-one — SQ1 魔方',
			'skewb / skb — 斜转魔方',
			'random — 随机选择',
		];
		for (const item of items) {
			list.createEl('li', { text: item });
		}
	}
}
