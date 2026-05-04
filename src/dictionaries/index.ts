import theophysicsData from "./theophysics.json";
import { theophysicsHooks } from "./theophysics.hooks";
import { DictionaryData, LoadedDictionary } from "./types";

const REGISTRY: Record<string, LoadedDictionary> = {
    theophysics: {
        data: theophysicsData as DictionaryData,
        hooks: theophysicsHooks
    }
};

export function listDictionaries(): Array<{ id: string; name: string; version: string }> {
    return Object.values(REGISTRY).map(({ data }) => ({
        id: data.metadata.id,
        name: data.metadata.name,
        version: data.metadata.version
    }));
}

export function loadDictionary(id: string): LoadedDictionary {
    const dictionary = REGISTRY[id];
    if (!dictionary) {
        throw new Error(`Unknown dictionary: ${id}`);
    }

    return dictionary;
}
