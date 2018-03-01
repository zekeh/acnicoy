"use strict";

const path = require("path");
const fs = require("fs-extra");
const os = require("os");
const { remote } = require("electron");

module.exports = function (basePath) {
    const paths = {};

    paths.standardDataPathPrefix = path.resolve(os.homedir(), "Documents");
    paths.dataPathPrefix = null;
    paths.base = basePath;
    let dataPath = null;
    let langPath = null;

    // Return true if location for user data is set
    paths.existsDataPath = function () {
        return localStorage.getItem("data-path") !== null;
    };
    // Set location for folder to store user data in
    paths.setDataPath = function (prefix) { 
        localStorage.setItem("data-path", prefix);
        paths.init();
    };

    // Initialize paths for user data
    paths.init = function() {
        if (!paths.existsDataPath())
            throw Error("Path for user data has not been set!");
        let prefix = localStorage.getItem("data-path");
        if (prefix[prefix.length - 1] == "\n")
            prefix = prefix.slice(0, prefix.length - 1);
        const previousPath = dataPath;
        const dataPathBaseName = `${app.name}Data`;
        const newPath = path.resolve(prefix, dataPathBaseName);
        paths.dataPathPrefix = prefix;
        paths.data = dataPath = newPath;
        paths.languages = langPath = path.resolve(dataPath, "Languages");
        paths.globalSettings = path.resolve(dataPath, "settings.json");
        paths.srsSchemes = path.resolve(dataPath, "srs-schemes.json")
        paths.achievementsUnlocked = path.resolve(dataPath, "achievements.json")
        paths.notifications = path.resolve(dataPath, "notifications.json");
        if (previousPath === null) {
            // Create folders if they do not exist yet
            if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);
            if (!fs.existsSync(langPath)) fs.mkdirSync(langPath);
        } else {
            // Copy previous data to new location
            if (fs.existsSync(newPath)) {
                fs.removeSync(newPath);
            }
            fs.renameSync(previousPath, newPath);
        }
    };

    // Local storage
    const userDataPath = remote.app.getPath("userData");
    const storagePath = path.resolve(userDataPath, "storage");
    const contentPath = path.resolve(storagePath, "Content");
    const backupsPath = path.resolve(storagePath, "Backups");
    const downloadsPath = path.resolve(storagePath, "Downloads");
    paths.downloadsInfo = path.resolve(downloadsPath, "info.json");
    paths.backups = backupsPath;
    // Create storage paths if necessary
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath);
    if (!fs.existsSync(contentPath)) fs.mkdirSync(contentPath);
    if (!fs.existsSync(backupsPath)) fs.mkdirSync(backupsPath);
    if (!fs.existsSync(downloadsPath)) fs.mkdirSync(downloadsPath);
    if (!fs.existsSync(paths.downloadsInfo))
        fs.writeFileSync(paths.downloadsInfo, "{}");
    // Set path for electron-settings module
    storage.setPath(path.resolve(storagePath, "storage.json"));

    // Global data
    paths.packageInfo = path.resolve(basePath, "package.json");
    paths.scoreCalculation = path.resolve(basePath, "data",
                                          "score-calculation.json");
    paths.defaultSettings = path.resolve(basePath, "data",
                                         "default-settings.json");
    paths.defaultSrsSchemes = path.resolve(basePath, "data",
                                           "default-srs-schemes.json");
    paths.resourcesList = path.resolve(basePath, "data", "resources.md");
    paths.achievements = path.resolve(basePath, "data", "achievements.json");
    paths.helpStructure = path.resolve(basePath, "data", "help-structure.json");
    paths.helpSection = (nodes) =>
        path.resolve(basePath, "data", "help", ...nodes) + ".md";
    paths.helpSubdir = (nodes) =>
        path.resolve(basePath, "data", "help", ...nodes);
    paths.componentRegister = path.resolve(basePath, "component-register.json");
    paths.styleClasses = path.resolve(basePath, "data", "style-classes.json");
    paths.img = {
        programIcon: path.resolve(basePath, "img", "icon.png")
    };
    paths.japaneseIndices = path.resolve(basePath, "japanese-indices.sql");

    // JS
    const jsPath = path.resolve(basePath, "js");
    const baseClassPath = path.resolve(jsPath, "base");
    const windowsPath = path.resolve(jsPath, "windows");
    const overlaysPath = path.resolve(jsPath, "overlays");
    const sectionsPath = path.resolve(jsPath, "sections");
    const settingsSubsectionsPath = path.resolve(
        sectionsPath, "settings-subsections");
    const panelsPath = path.resolve(jsPath, "panels");
    const suggestionPanesPath = path.resolve(jsPath, "suggestion-panes");
    const widgetsPath = path.resolve(jsPath, "widgets");
    const librariesPath = path.resolve(jsPath, "lib");
    const extensionsPath = path.resolve(jsPath, "extensions");
    const dataModulesPath = path.resolve(librariesPath, "data-managers");
    const contentModulesPath = path.resolve(dataModulesPath, "content");
    paths.js = {
        "base": (name) => path.resolve(baseClassPath, name + ".js"),
        "window": (name) => path.resolve(windowsPath, name + "-window.js"),
        "overlay": (name) => path.resolve(overlaysPath, name + "-overlay.js"),
        "section": (name) => path.resolve(sectionsPath, name + "-section.js"),
        "settingsSubsection": (name) => path.resolve(
            settingsSubsectionsPath, name + "-settings-subsection"),
        "panel": (name) => path.resolve(panelsPath, name + "-panel.js"),
        "suggestionPane": (name) => path.resolve(
            suggestionPanesPath, name + "-suggestion-pane.js"),
        "widget": (name) => path.resolve(widgetsPath, name + ".js"),
        "lib": (name) => path.resolve(librariesPath, name + ".js"),
        "extension": (name) => path.resolve(extensionsPath, name + ".js"),
        "dataModule": (name) => path.resolve(dataModulesPath, name + ".js"),
        "contentModule": (name) => path.resolve(contentModulesPath,`${name}.js`)
    };

    // HTML
    const htmlPath = path.resolve(basePath, "html");
    paths.html = (name) => path.resolve(htmlPath, name + ".html");

    // Templates
    const templatePath = path.resolve(basePath, "templates");
    paths.template = (name) => path.resolve(templatePath, name + ".hbs");

    // CSS
    paths.css = (name, design) =>
        path.resolve(basePath, "css", design, name + ".css");
    paths.layers = path.resolve(basePath, "css", "default", "layers.css");
    paths.fontAwesome = path.resolve(basePath, "font-awesome",
                                     "css", "font-awesome.min.css");
    paths.colorSchemes = path.resolve(basePath, "sass", "designs");

    // Language data
    paths.languageData = (language) => ({
        directory: path.resolve(langPath, language),
        database: path.resolve(langPath, language, "Vocabulary.sqlite"),
        vocabLists: path.resolve(langPath, language, "lists.json"),
        stats: path.resolve(langPath, language, "stats.json"),
        pinwall: path.resolve(langPath, language, "pinwall.json"),
        settings: path.resolve(langPath, language, "settings.json"),
        history: path.resolve(langPath, language, "history.sqlite")
    });

    // Language data backup
    paths.newBackup = () => {
        const backups = fs.readdirSync(paths.backups);
        let previousId = 0;
        for (const backup of backups) {
            const backupId = parseInt(backup.slice(0, 5));
            if (backupId > previousId) {
                previousId = backupId;
            }
        }
        const id = previousId + 1;
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const backupDir = path.resolve(paths.backups, [
            id.toString().padStart(5, "0"),
            year.toString().padStart(4, "0"),
            month.toString().padStart(2, "0"),
            day.toString().padStart(2, "0")
        ].join("-"));
        return {
            directory: backupDir,
            infoFile: path.resolve(backupDir, "info.json")
        };
    };
    paths.backupInfo = (backupName) => {
        return path.resolve(
            path.resolve(paths.backups, backupName), "info.json");
    };

    // Language content
    const contentRegister = {
        "Japanese": {
            "English": {
                database: "Japanese-English.sqlite3",
                kanjiStrokes: "kanji-strokes.json",
                numbers: "numeric-kanji.json",
                counters: "counter-kanji.json",
                dictCodeToText: "dict-code-to-text.json",
                nameTagToText: "name-tag-to-text.json",
                kokujiList: "kokuji.txt",
                exampleWordIds: "example-words-index.json"
            }
        }
    };

    // Return an object mapping content resource names to absolute paths
    paths.content = (language, secondaryLanguage) => {
        const p = path.resolve(contentPath, language + "-" + secondaryLanguage);
        const resourcePaths = {};
        if (contentRegister.hasOwnProperty(language) &&
                contentRegister[language].hasOwnProperty(secondaryLanguage)) {
            for (const resource in contentRegister[language][secondaryLanguage])
                resourcePaths[resource] = path.resolve(p,
                    contentRegister[language][secondaryLanguage][resource]);
        }
        resourcePaths.directory = p;
        resourcePaths.versions = path.resolve(p, "versions.json");
        return resourcePaths;
    };

    // Download related
    paths.downloadDataPart = (filename) => {
        return path.resolve(downloadsPath, filename + ".part");
    };
    paths.downloadData = (filename) => {
        return path.resolve(downloadsPath, filename); 
    };
    paths.downloadDataUnzipped = (filename) => {
        if (filename.slice(-4) !== ".zip")
            throw new Error(`File '${filename}' is not a zip file!`);
        return path.resolve(downloadsPath, filename.slice(0, -4));
    };

    return paths;
};
