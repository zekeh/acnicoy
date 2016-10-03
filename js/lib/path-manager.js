"use strict";

const path = require("path");
const fs = require("fs");

module.exports = function (basePath) {
    const paths = {};

    const home = process.env[process.platform == "win32" ?
                                 "USERPROFILE" : "HOME"];
    const trainerName = "Acnicoy";
    const dataPathBaseName = trainerName + "Data";
    const dataPathConfigFile = path.resolve(basePath, "data", "data-path.txt");
    paths.standardDataPathPrefix = path.resolve(home, "Documents");
    let dataPath = null;
    let langPath = null;

    // Try to load path for user data, return true if path could be loaded
    paths.getDataPath = function () {
        let prefix;
        try {
            prefix = fs.readFileSync(dataPathConfigFile, { encoding: "utf-8" });
            if (prefix[prefix.length - 1] == "\n")
                prefix = prefix.slice(0, prefix.length - 1);
        } catch (error) {
            return false;
        }
        paths.setDataPath(prefix);
        return true;
    }
    
    // Set a path for folder to store user data in
    paths.setDataPath = function (prefix) { 
        fs.writeFileSync(dataPathConfigFile, prefix);
        paths.data = dataPath = path.resolve(prefix, dataPathBaseName);
        paths.languages = langPath = path.resolve(dataPath, "Languages");
        paths.globalSettings = path.resolve(dataPath, "settings.json");
        // Create folder if it doesn't exists yet
        try {
            fs.readdirSync(dataPath);
        } catch (error) {
            if (error.errno === -2) fs.mkdirSync(dataPath);
        }
    };

    // Global data
    paths.scoreCalculation = path.resolve(basePath, "data",
                                          "scoreCalculation.json");

    // JS paths for components
    const jsPath = path.resolve(basePath, "js");
    paths.js = {
        "component": (name) => path.resolve(jsPath, name + ".js"),
        "window": (name) => path.resolve(jsPath, name + "-window.js"),
        "section": (name) => path.resolve(jsPath, name + "-section.js"),
        "panel": (name) => path.resolve(jsPath, name + "-panel.js"),
        "widget": (name) => path.resolve(jsPath, "widgets", name + ".js")
    };

    // HTML paths for components
    const windowsPath = path.resolve(basePath, "html");
    const sectionsPath = path.resolve(basePath, "html", "sections");
    const panelsPath = path.resolve(basePath, "html", "panels");
    const widgetsPath = path.resolve(basePath, "html", "widgets");
    paths.html = {
        "window": (name) => path.resolve(windowsPath, name + "-window.html"),
        "section": (name) => path.resolve(sectionsPath, name + "-section.html"),
        "panel": (name) => path.resolve(panelsPath, name + "-panel.html"),
        "widget": (name) => path.resolve(widgetsPath, name + ".html")
    }

    // Templates
    const templatePath = path.resolve(basePath, "templates");
    paths.template = (name) => path.resolve(templatePath, name + ".handlebars");

    // Styles
    paths.css = (name) => path.resolve(basePath, "css", name + ".css");
    paths.layers = path.resolve(basePath, "css", "layers.css");
    paths.fontAwesome = path.resolve(basePath, "font-awesome",
                                     "css", "font-awesome.min.css");

    // Library and extension scripts
    const extensionPath = path.resolve(jsPath, "lib", "extensions");
    paths.extension = (name) => path.resolve(extensionPath, name + ".js");
    paths.lib = (name) => path.resolve(jsPath, "lib", name + ".js");

    // Data interface modules
    const dataModulesPath = path.resolve(basePath, "js", "lib","data-managers");
    paths.modules = (name) => path.resolve(dataModulesPath, name + ".js");

    // Language data
    paths.languageData = (language) => ({
        database: path.resolve(langPath, language, "Vocabulary.sqlite"),
        vocabLists: path.resolve(langPath, language, "lists.json"),
        stats: path.resolve(langPath, language, "stats.json"),
        pinwall: path.resolve(langPath, language, "pinwall.json"),
        settings: path.resolve(langPath, language, "settings.json")
    });

    // Language content
    const contentPath = path.resolve(basePath, "data", "language-content");
    const japEngPath = path.resolve(contentPath, "Japanese-English");
    paths.content = {
        "Japanese-English": {
            database: path.resolve(japEngPath, "Japanese-English.sqlite3"),
            kanjiStrokes: path.resolve(japEngPath, "kanji-strokes.json"),
            numbers: path.resolve(japEngPath, "numeric-kanji.json"),
            counters: path.resolve(japEngPath, "counter-kanji.json"),
            dictCodeToText: path.resolve(japEngPath, "dict-code-to-text.json")
        }
    };

    return paths;
};
