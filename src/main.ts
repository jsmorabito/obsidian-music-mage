import { Plugin, WorkspaceLeaf } from 'obsidian';
import { CircleOfFifthsView, CIRCLE_OF_FIFTHS_VIEW } from './CircleOfFifthsView';
import { ChordDictionaryView, CHORD_DICT_VIEW } from './ChordDictionaryView';
import { ScaleExplorerView, SCALE_EXPLORER_VIEW } from './ScaleExplorerView';
import { SongAnalysisView, SONG_ANALYSIS_VIEW } from './SongAnalysisView';
import { ChordMapView, CHORD_MAP_VIEW } from './ChordMapView';
import { createSongDirectiveHandler } from './SongDirectiveHandler';
import { createTrackDirectiveHandler } from './TrackDirectiveHandler';
import { getDirectivesAPI } from './directives-api';
import { MusicMageSettingTab, MusicMageSettings, DEFAULT_SETTINGS } from './settings';

export default class MusicMagePlugin extends Plugin {
	settings!: MusicMageSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(CIRCLE_OF_FIFTHS_VIEW, (leaf) => new CircleOfFifthsView(leaf));
		this.registerView(CHORD_DICT_VIEW,        (leaf) => new ChordDictionaryView(leaf));
		this.registerView(SCALE_EXPLORER_VIEW,    (leaf) => new ScaleExplorerView(leaf));
		this.registerView(SONG_ANALYSIS_VIEW,     (leaf) => new SongAnalysisView(leaf, this));
		this.registerView(CHORD_MAP_VIEW,         (leaf) => new ChordMapView(leaf, this));

		this.addRibbonIcon('music',       'Circle of Fifths', () => this.openView(CIRCLE_OF_FIFTHS_VIEW));
		this.addRibbonIcon('book-open',   'Chord Dictionary', () => this.openView(CHORD_DICT_VIEW));
		this.addRibbonIcon('layout-list', 'Scale Explorer',   () => this.openView(SCALE_EXPLORER_VIEW));
		this.addRibbonIcon('file-music',  'Song Analysis',    () => this.openView(SONG_ANALYSIS_VIEW));
		this.addRibbonIcon('git-fork',    'Chord Map',        () => this.openView(CHORD_MAP_VIEW));

		this.addCommand({ id: 'open-circle-of-fifths', name: 'Open Circle of Fifths', callback: () => this.openView(CIRCLE_OF_FIFTHS_VIEW) });
		this.addCommand({ id: 'open-chord-dictionary', name: 'Open Chord Dictionary', callback: () => this.openView(CHORD_DICT_VIEW) });
		this.addCommand({ id: 'open-scale-explorer',   name: 'Open Scale Explorer',   callback: () => this.openView(SCALE_EXPLORER_VIEW) });
		this.addCommand({ id: 'open-song-analysis',    name: 'Open Song Analysis',    callback: () => this.openView(SONG_ANALYSIS_VIEW) });
		this.addCommand({ id: 'open-chord-map',        name: 'Open Chord Map',        callback: () => this.openView(CHORD_MAP_VIEW) });

		this.addSettingTab(new MusicMageSettingTab(this.app, this));

		const directivesApi = getDirectivesAPI(this.app);
		if (directivesApi) {
			this.register(directivesApi.addHandler(createSongDirectiveHandler()));
			this.register(directivesApi.addHandler(createTrackDirectiveHandler()));
		}
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(CIRCLE_OF_FIFTHS_VIEW);
		this.app.workspace.detachLeavesOfType(CHORD_DICT_VIEW);
		this.app.workspace.detachLeavesOfType(SCALE_EXPLORER_VIEW);
		this.app.workspace.detachLeavesOfType(SONG_ANALYSIS_VIEW);
		this.app.workspace.detachLeavesOfType(CHORD_MAP_VIEW);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MusicMageSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async openView(viewType: string) {
		const existing = this.app.workspace.getLeavesOfType(viewType);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0] as WorkspaceLeaf);
			return;
		}
		const leaf = (this.app.workspace.getRightLeaf(false)
			?? this.app.workspace.getLeaf('tab')) as WorkspaceLeaf;
		await leaf.setViewState({ type: viewType, active: true });
		this.app.workspace.revealLeaf(leaf);
	}
}
