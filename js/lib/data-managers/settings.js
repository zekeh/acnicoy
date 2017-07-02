"use strict";

const fs = require("fs");

module.exports = function (paths, modules) {
    const settings = {};
    let data;

    settings.isLoaded = function() {
        return data !== undefined;
    };

    settings.setDefault = function() {
        const defaultSettings = fs.readFileSync(paths.defaultSettings);
        fs.writeFileSync(paths.globalSettings, defaultSettings);
        return require(paths.defaultSettings);
    };

    settings.load = function() {
        if (fs.existsSync(paths.globalSettings)) {
            data = require(paths.globalSettings);
        } else {
            data = settings.setDefault();
        }
        shortcuts.initialize();
        modules.srs.loadSchemes();
        modules.achievements.loadUserData();
    };

    settings.save = function() {
        fs.writeFileSync(paths.globalSettings, JSON.stringify(data, null, 4));
    };

    return new Proxy(settings, {
        get: (target, key) => {
            if (data !== undefined && Reflect.has(data, key)) return data[key];
            else return target[key];
        },
        set: (target, key, value) => {
            if (data !== undefined && Reflect.has(data, key)) data[key] = value;
            else throw new Error("You cannot create new settings!")
        }
    });
};
