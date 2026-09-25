const NodeCache = require("node-cache");

const groupCache = new NodeCache({
    stdTTL: 5 * 60,
    useClones: false,
    checkperiod: 60,
});

const lidToJidStore = new NodeCache({
    stdTTL: 24 * 60 * 60,
    useClones: false,
    checkperiod: 300,
});

const storeLidMapping = (lid, jid) => {
    if (lid && jid && lid.endsWith("@lid") && jid.endsWith("@s.whatsapp.net")) {
        lidToJidStore.set(lid, jid);
    }
};

const getLidMapping = (lid) => {
    return lidToJidStore.get(lid);
};

const updateLidMappingsFromMetadata = (metadata) => {
    if (!metadata?.participants) return;
    for (const p of metadata.participants) {
        const lid = p.lid || p.id;
        const jid = p.pn || p.jid;
        if (lid && jid) {
            storeLidMapping(lid, jid);
        }
    }
};

const isExpectedError = (errorMsg) => {
    const expectedErrors = [
        "forbidden",
        "item-not-found",
        "not-authorized",
        "gone",
    ];
    return expectedErrors.some((e) => errorMsg?.toLowerCase().includes(e));
};

const getGroupMetadata = async (Malvin, jid) => {
    if (!jid || !jid.endsWith("@g.us")) return null;

    try {
        const cached = groupCache.get(jid);
        if (cached) {
            updateLidMappingsFromMetadata(cached);
            return cached;
        }

        const metadata = await Malvin.groupMetadata(jid);
        if (metadata) {
            groupCache.set(jid, metadata);
            updateLidMappingsFromMetadata(metadata);
        }
        return metadata;
    } catch (error) {
        if (!isExpectedError(error.message)) {
            console.error(
                `Failed to get group metadata for ${jid}:`,
                error.message,
            );
        }
        return null;
    }
};

const updateGroupCache = (jid, metadata) => {
    if (jid && metadata) {
        groupCache.set(jid, metadata);
        updateLidMappingsFromMetadata(metadata);
    }
};

const deleteGroupCache = (jid) => {
    groupCache.del(jid);
};

const clearGroupCache = () => {
    groupCache.flushAll();
};

const setupGroupCacheListeners = (Malvin) => {
    Malvin.ev.on("groups.update", async ([event]) => {
        try {
            if (event?.id) {
                const metadata = await Malvin.groupMetadata(event.id);
                updateGroupCache(event.id, metadata);
            }
        } catch (error) {
            deleteGroupCache(event?.id);
            if (!isExpectedError(error.message)) {
                console.error("Group cache update failed:", error.message);
            }
        }
    });

    Malvin.ev.on("group-participants.update", async (event) => {
        try {
            if (event?.id) {
                const cachedMeta = groupCache.get(event.id);
                if (cachedMeta) {
                    updateLidMappingsFromMetadata(cachedMeta);
                }

                const metadata = await Malvin.groupMetadata(event.id);
                updateGroupCache(event.id, metadata);
            }
        } catch (error) {
            deleteGroupCache(event?.id);
            if (!isExpectedError(error.message)) {
                console.error(
                    "Participant cache update failed:",
                    error.message,
                );
            }
        }
    });
};

const cachedGroupMetadata = async (jid) => {
    return groupCache.get(jid);
};

const initializeLidStore = async (Malvin) => {
    try {
        const groups = await Malvin.groupFetchAllParticipating();
        if (groups) {
            for (const groupJid of Object.keys(groups)) {
                const meta = groups[groupJid];
                if (meta?.participants) {
                    updateLidMappingsFromMetadata(meta);
                    groupCache.set(groupJid, meta);
                }
            }
            console.log(
                `✅ LID store initialized => ${lidToJidStore.keys().length} Mappings from ${Object.keys(groups).length} Groups`,
            );
        }
    } catch (error) {
        console.error("Failed to initialize LID store:", error.message);
    }
};

module.exports = {
    groupCache,
    getGroupMetadata,
    updateGroupCache,
    deleteGroupCache,
    clearGroupCache,
    setupGroupCacheListeners,
    cachedGroupMetadata,
    getLidMapping,
    storeLidMapping,
    updateLidMappingsFromMetadata,
    initializeLidStore,
};
