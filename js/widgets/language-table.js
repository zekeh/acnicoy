"use strict";

const dateFormat = require("dateformat");

class LanguageTable extends Widget {

    static get observedAttributes() {
        return ["interactive-mode"];
    }

    constructor() {
        super("language-table");
        this.$("table").hide();
        this.$("update-content-status-button").hide();
        for (const element of this.$$(".interactive-only")) {
            element.hide();
        }
        this.languageConfigs = [];
        this.languageToConfig = new Map();
        this.rowToConfig = new WeakMap();
        this.interactiveMode = false;
        this.settingsSubsection = null;
        this.handledDownloadStreams = new WeakSet();
        this.updatingContentStatus = new WeakSet();
        // this.retryContentStatusUpdateDelay = 30000;
        // Quick access to language content elements for each language
        this.contentDownloadProgressFrames = new WeakMap();
        this.contentDownloadProgressBars = new WeakMap();
        this.contentDownloadProgressTexts = new WeakMap();
        this.contentStatusLabelFrames = new WeakMap();
        this.contentLoadStatusLabels = new WeakMap();
        this.contentStatusLabels = new WeakMap();
        this.programUpdateRecommendedIcons = new WeakMap();
        this.programUpdateRequiredIcons = new WeakMap();
        this.contentUpdateRequiredIcons = new WeakMap();
        this.connectingSpinners = new WeakMap();
        // Adding a new language
        this.$("add-language-button").addEventListener("click", async () => {
            const config = await overlays.open("add-lang");
            if (config === null) return;
            if (this.languageToConfig.has(config.language)) {
                dialogWindow.info("You cannot add a language twice!"); 
                return;
            }
            if (this.interactiveMode) {
                await dataManager.languages.add(
                    config.language, config.settings);
                await dataManager.load(config.language);
                events.emit("language-added", config.language);
                config.default = false;
            }
            config.interactiveMode = this.interactiveMode;
            this.addTableRow(config);
            if (this.interactiveMode) {
                events.emit("update-content-status",
                    { language: config.language,
                      secondary: config.settings.secondary });
            }
        });
        // Updating language content status
        this.$("update-content-status-button").addEventListener("click", () => {
            for (const config of this.languageConfigs) {
                events.emit("update-content-status",
                    { language: config.language,
                      secondary: config.settings.secondary });
            }
        });
        // When a readings checkbox is clicked, update config
        this.$("table-body").addEventListener("click", (target) => {
            if (!event.target.classList.contains("readings-checkbox")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            if (this.interactiveMode) {
                dataManager.languageSettings.setFor(
                    config.language, "readings", event.target.checked);
                this.settingsSubsection.broadcastLanguageSetting("readings");
            }
            config.settings.readings = event.target.checked;
        });
        // Allow user to change SRS scheme and migrate items for a language
        this.$("table-body").addEventListener("click", (event) => {
            if (!this.interactiveMode) return;
            if (!event.target.classList.contains("scheme-button")) return;
            const label = event.target;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            overlays.open("migrate-srs", "switch-scheme", {
                language: config.language,
                schemeName: config.settings.srs.scheme
            }).then((migrated) => {
                if (!migrated) return;
                label.textContent = dataManager.languageSettings
                                    .getFor(config.language, "srs.scheme");
            });
        });
        // Functionality for loading/unloading language content
        this.$("table-body").addEventListener("click", (target) => {
            if (!event.target.classList.contains("content-load-status-label"))
                return;
            const row = event.target.parentNode.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            const language = config.language;
            const secondary = config.settings.secondary;
            if (!dataManager.content.isLoadedFor(language, secondary)) {
                main.loadLanguageContent(language, secondary);
                event.target.textContent = "Unload";
            } else {
                dataManager.content.unload(language);
                main.adjustToLanguageContent(language, secondary);
                event.target.textContent = "Load";
            }
        });
        // Functionality for downloading language content
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("content-status-label")) return
            const row = event.target.parentNode.parentNode.parentNode; // Oh god
            const config = this.rowToConfig.get(row);
            if (!config.downloadReady) return;
            events.emit("start-content-download", {
                language: config.language,
                secondaryLanguage: config.settings.secondary
            });
        });
        // Functionality for setting language opened by default
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("default-language-checkbox"))
                return;
            if (event.target.checked === false) {
                event.target.checked = true;
                return;
            }
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            const defaultLanguageCheckboxes =
                this.$$("#table-body .default-language-checkbox");
            for (const checkbox of defaultLanguageCheckboxes) {
                if (checkbox.checked && checkbox !== event.target) {
                    checkbox.checked = false;
                    break;
                }
            }
            dataManager.settings.languages.default = config.language;
        });
        // Activate hidden mode for language if eye-button is clicked
        this.$("table-body").addEventListener("click", (event) => {
            if (!event.target.classList.contains("hide-button")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            const hidden = !dataManager.languageSettings
                            .getFor(config.language, "hidden");
            dataManager.languageSettings.setFor(
                config.language, "hidden", hidden);
            row.classList.toggle("hidden", hidden);
            this.settingsSubsection.broadcastLanguageSetting("visibility");
            events.emit("language-visibility-changed", config.language);
        });
        // Remove language if a remove-icon is clicked
        this.$("table-body").addEventListener("click", async (event) => {
            if (!event.target.classList.contains("remove-button")) return;
            const row = event.target.parentNode.parentNode;
            const config = this.rowToConfig.get(row);
            if (this.interactiveMode) {
                const confirmed = await dialogWindow.confirm(
                    `Are you sure you want to remove the language ` +
                    `'${config.language}' and delete all its data?`);
                if (!confirmed) return;
                const languages = dataManager.languages.all.slice();
                languages.remove(config.language);
                events.emit("language-removed", config.language);
                // If the removed language is the current one, switch to another
                if (config.language === dataManager.currentLanguage) {
                    if (languages.length > 0) {
                        const switched = await main.setLanguage(languages[0]);
                        if (!switched) return;
                    }
                }
                await dataManager.languages.remove(config.language);
                const defaultLang = dataManager.settings.languages.default;
                if (config.language === defaultLang && languages.length > 0) {
                    if (languages.length === 1) {
                        // Set single remaining language as default
                        const rows = this.$("table-body").children;
                        for (const row of rows) {
                            if (this.rowToConfig.get(row).language !==
                                    config.language) {
                                row.querySelectorAll(
                                        ".default-language-checkbox")[0]
                                .checked = true;
                                dataManager.settings.languages.default =
                                    this.rowToConfig.get(row).language;
                            }
                        }
                    } else {
                        // Let user choose new default language
                        await app.initDefaultLang();
                        app.openWindow("main");
                        return;
                    }
                }
            }
            this.languageConfigs.remove(config);
            this.languageToConfig.delete(config.language);
            this.$("table-body").removeChild(row);
            if (this.languageConfigs.length === 0) {
                if (this.interactiveMode) {
                    await app.initLanguages();
                    await app.initDefaultLang();
                    app.openWindow("main");
                } else {
                    this.$("table").hide();
                }
            }
        });
    }

    registerCentralEventListeners() {
        events.on("start-content-download", ({ language, secondary }) => {
            if (!this.interactiveMode) return;
            const config = this.languageToConfig.get(language);
            config.downloading = true;
            config.downloadReady = false;
            this.updateContentStatus(language);
        });
        events.on("language-content-loaded", ({ language, secondary }) => {
            if (!this.interactiveMode) return;
            // If language content is already loaded at program launch, this
            // event will be emitted before the language table has been filled
            if (!this.languageToConfig.has(language)) return;
            const config = this.languageToConfig.get(language);
            const loadStatusLabel = this.contentLoadStatusLabels.get(config);
            loadStatusLabel.textContent = "Unload";
        });
        events.on("update-content-status", async ({ language, secondary }) => {
            if (!this.interactiveMode) return;
            await this.updateContentStatus(language, false);
            window.setTimeout(() => events.emit("update-content-status",
                { language, secondary }), main.statusUpdateInterval * 1000);
        });
    }

    addTableRow(config) {
        const language = config.language;
        const secondary = config.settings.secondary;
        config.downloading = networkManager.content.getDownloadStatus(
                language, secondary) !== null;
        config.downloadReady = false;
        config.lastUpdateTime = -1;
        this.languageConfigs.push(config);
        this.languageToConfig.set(language, config);
        const template = templates.get("language-table-entry");
        const row = utility.fragmentFromString(template(config)).children[0];
        this.$("table-body").appendChild(row);
        this.rowToConfig.set(row, config);
        this.$("table").show();
        const loadStatusLabel = row.querySelector(".content-load-status-label");
        loadStatusLabel.textContent =
            dataManager.content.isLoadedFor(language,secondary)?"Unload":"Load";
        this.contentLoadStatusLabels.set(config, loadStatusLabel);
        this.contentDownloadProgressFrames.set(
            config, row.querySelector(".content-download-progress-frame"));
        this.contentDownloadProgressBars.set(
            config, row.querySelector(".content-download-progress-bar"));
        this.contentDownloadProgressTexts.set(
            config, row.querySelector(".content-download-progress-label"));
        this.contentStatusLabelFrames.set(
            config, row.querySelector(".content-status-label-frame"));
        this.contentStatusLabels.set(
            config, row.querySelector(".content-status-label"));
        this.programUpdateRecommendedIcons.set(
            config, row.querySelector(".program-update-recommended-icon"));
        this.programUpdateRequiredIcons.set(
            config, row.querySelector(".program-update-required-icon"));
        this.contentUpdateRequiredIcons.set(
            config, row.querySelector(".content-update-required-icon"));
        this.connectingSpinners.set(
            config, row.querySelector(".connecting-spinner"));
        if (config.interactiveMode) {
            this.updateContentStatus(language);
        }
    }

    async updateContentStatus(language, useCache=true) {
        const config = this.languageToConfig.get(language);
        if (this.updatingContentStatus.has(config)) return;
        this.updatingContentStatus.add(config);
        const secondary = config.settings.secondary;
        const cacheKey = `cache.contentVersionInfo.${language}.${secondary}`;
        // Get HTML elements for this table row and update their status
        const progressFrame = this.contentDownloadProgressFrames.get(config);
        const progressBar = this.contentDownloadProgressBars.get(config);
        const progressText = this.contentDownloadProgressTexts.get(config);
        const statusFrame = this.contentStatusLabelFrames.get(config);
        const statusLabel = this.contentStatusLabels.get(config);
        const loadStatusLabel = this.contentLoadStatusLabels.get(config);
        const programUpdateRecommendedIcon =
            this.programUpdateRecommendedIcons.get(config);
        const programUpdateRequiredIcon =
            this.programUpdateRequiredIcons.get(config);
        const contentUpdateRequiredIcon =
            this.contentUpdateRequiredIcons.get(config);
        const connectingSpinner = this.connectingSpinners.get(config);
        progressFrame.hide();
        loadStatusLabel.hide();
        statusFrame.hide();
        connectingSpinner.show();
        programUpdateRecommendedIcon.hide();
        programUpdateRequiredIcon.hide();
        contentUpdateRequiredIcon.hide();
        statusLabel.classList.remove("button");
        statusLabel.classList.remove("up-to-date");
        // If some content is already downloaded, check whether it's compatible
        const contentAvailable =
            dataManager.content.isAvailableFor(language, secondary);
        if (contentAvailable) {
            const contentUpdateRequired =
                dataManager.content.updateRequired(language, secondary);
            const programUpdateRequired =
                dataManager.content.programUpdateRequired(language, secondary);
            if (contentUpdateRequired) {
                contentUpdateRequiredIcon.show();
            } else if (programUpdateRequired) {
                programUpdateRequiredIcon.show();
            } else {
                loadStatusLabel.show();
            }
        }
        try {
            // If a download has already been started, continue it
            if (config.downloading) {
                const downloadStream =
                    await networkManager.content.startDownload(
                        language, secondary)
                if (!this.handledDownloadStreams.has(downloadStream)) {
                    this.handledDownloadStreams.add(downloadStream);
                    const { totalSize, downloaded, percentage } =
                        networkManager.content.getDownloadStatus(
                            language, secondary);
                    progressBar.max = totalSize;
                    progressBar.value = downloaded;
                    progressText.textContent = `${percentage.toFixed(0)} %`;
                    downloadStream.on("progressing", (status) => {
                        progressBar.value = status.downloaded;
                        progressText.textContent =
                            `${status.percentage.toFixed(0)} %`;
                    });
                    downloadStream.on("finished", () => {
                        config.downloading = false;
                        if (dataManager.content.isLoadedFor(language,secondary))
                            loadStatusLabel.textContent = "Reload";
                        else
                            loadStatusLabel.textContent = "Load";
                        events.emit("content-download-finished",
                            { language, secondary });
                        storage.set(`${cacheKey}.updateAvailable`, false);
                        this.updateContentStatus(language);
                    });
                    downloadStream.on("connection-lost", () => {
                        this.updateContentStatus(language);
                    });
                    progressFrame.show();
                }
            } else {
                if (!useCache) {
                    const info = await networkManager.content.getStatus(
                            language, secondary);
                    info.lastUpdateTime = utility.getTime();
                    const cachedInfo = storage.get(cacheKey);
                    storage.set(cacheKey, info);
                    if ((cachedInfo === undefined && info.updateAvailable)
                            || (cachedInfo !== undefined &&
                                !cachedInfo.updateAvailable &&
                                info.updateAvailable)) {
                        main.addNotification("content-update-available",
                            { language, secondary });
                    }
                }
                if (storage.has(cacheKey)) {
                    const { programUpdateRecommended, updateAvailable,
                        lastUpdateTime } = storage.get(cacheKey);
                    statusLabel.classList.remove("error");
                    if (updateAvailable) {
                        if (contentAvailable) {
                            statusLabel.textContent = "Update";
                        } else {
                            statusLabel.textContent = "Download";
                        }
                    } else {
                        if (contentAvailable) {
                            statusLabel.textContent = "Up to date";
                            statusLabel.classList.add("up-to-date");
                        } else {
                            statusLabel.textContent = "n.a.";
                        }
                    }
                    statusFrame.show();
                    statusLabel.classList.toggle("button", updateAvailable);
                    config.downloadReady = updateAvailable;
                    programUpdateRecommendedIcon.toggleDisplay(
                        programUpdateRecommended);
                    config.lastUpdateTime = lastUpdateTime;
                    // Set last-update-label to the smallest last-update-time
                    const minLastUpdateTime = Math.min(...
                        this.languageConfigs.map((c) => c.lastUpdateTime*1000));
                    if (minLastUpdateTime > 0) {
                        const lastUpdateString = "Last update:  " + dateFormat(
                            minLastUpdateTime, "HH:MM:ss, mmm dS, yyyy");
                        this.$("last-content-status-update-time").textContent =
                            lastUpdateString;
                    }
                }
            }
        } catch (error) {
            if (error instanceof networkManager.NoServerConnectionError ||
                    error instanceof networkManager.ServerRequestFailedError) {
                progressFrame.hide();
                statusFrame.show();
                programUpdateRecommendedIcon.hide();
                if (error instanceof networkManager.NoServerConnectionError) {
                    statusLabel.textContent = "Connection error";
                }
                if (error instanceof networkManager.ServerRequestFailedError) {
                    statusLabel.textContent = "Server error";
                }
                statusLabel.classList.add("error");
                // Frequently try to reconnect
                // window.setTimeout(() => this.updateContentStatus(language),
                //     this.retryContentStatusUpdateDelay);
            } else {
                throw error;
            }
        } finally {
            connectingSpinner.hide();
            this.updatingContentStatus.delete(config);
        }
    }

    clear() {
        this.languageConfigs.length = 0;
        this.languageToConfig.clear();
        this.$("table").hide();
        this.$("table-body").empty();
    }

    getLanguageConfigs() {
        const copy = JSON.parse(JSON.stringify(this.languageConfigs));
        return copy;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "interactive-mode") {
            this.interactiveMode = (newValue !== null);
            for (const element of this.$$(".interactive-only")) {
                element.toggleDisplay(this.interactiveMode, "table-cell");
            }
            this.$("update-content-status-button").toggleDisplay(
                this.interactiveMode);
        }
    }
}

customElements.define("language-table", LanguageTable);
module.exports = LanguageTable;
