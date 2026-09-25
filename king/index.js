const { evt, mxd, commands } = require('./mxdcmds');
const config = require('../config');

const { DATABASE, syncDatabase } = require('./database/db');
const { loadPersistedLidMappings, persistLidMapping } = require('./database/idMap');
const { UpdateDB, setCommitHash, getCommitHash } = require('./database/updateCheck');
const { SudoDB, getSudoNumbers, setSudo, delSudo } = require('./database/sudo');
const { SettingsDB, initializeSettings, getSetting, setSetting, getAllSettings, resetSetting, resetAllSettings, DEFAULT_SETTINGS } = require('./database/settings');
const { GroupSettingsDB, initializeGroupSettings, getGroupSetting, setGroupSetting, getAllGroupSettings, resetGroupSetting, GROUP_SETTING_DEFAULTS } = require('./database/groupConfig');
const { UserSettingsDB, initializeUserSettings, getUserSetting, setUserSetting, USER_SETTING_DEFAULTS } = require('./database/userSettings');
const { listAvailableLocales, isValidLocale, translate, resolveLanguage, makeTranslator, GLOBAL_FALLBACK } = require('./i18n');
const { createContext, createContext2 } = require('./mxdhelpers');
const { getMediaBuffer, getFileContentType, bufferToStream, uploadToPixhost, uploadToImgBB, uploadToCatbox } = require('./mxdcore3');
const { logger, emojis, MalvinAutoReact, MalvinTechApi, MalvinApiKey, MalvinAntiLink, MalvinAntibad, MalvinAntiGroupMention, MalvinAutoBio, setupMalvinChatBot, MalvinPresence, MalvinAntiDelete, MalvinAnticall, MalvinAntiViewOnce, MalvinAntiEdit } = require('./mxdcore2');
const { handleGameMessage } = require('./gameManager');
const { toAudio, toVideo, toPtt, formatVideo, formatAudio, monospace, runtime, sleep, mxdFancy, MalvinUploader, stickerToImage, formatBytes, mxdBuffer, webp2mp4File, mxdJson, latestWaVersion, mxdRandom, isUrl, mxdStore, isNumber, loadSession, useSQLiteAuthState, verifyJidState, runFFmpeg, getVideoDuration, mxdSticker, copyFolderSync, gitRepoRegex, MAX_MEDIA_SIZE, getFileSize, getMimeCategory, getMimeFromUrl, MIME_EXTENSIONS, getExtensionFromMime, isTextContent } = require('./mxdcore1');

const { 
    groupCache, getGroupMetadata, updateGroupCache, deleteGroupCache, clearGroupCache, 
    setupGroupCacheListeners, cachedGroupMetadata, initializeLidStore, createSocketConfig, getLidMapping,
    safeNewsletterFollow, safeGroupAcceptInvite, setupConnectionHandler,
    standardizeJid, serializeMessage, downloadMediaMessage,
    loadPlugins, findCommand, findBodyCommand, createHelpers, getGroupInfo, buildSuperUsers,
    setupGroupEventsListeners, getProfilePic, getDisplayNumber
} = require('./socket');

module.exports = { 
    evt, mxd, config, emojis, commands, syncDatabase,
    toAudio, toVideo, toPtt, formatVideo, formatAudio,
    gitRepoRegex, MAX_MEDIA_SIZE, getFileSize, getMimeCategory, getMimeFromUrl, MIME_EXTENSIONS, getExtensionFromMime, isTextContent,
    UpdateDB, setCommitHash, getCommitHash, 
    runtime, sleep, mxdFancy, MalvinUploader, stickerToImage, monospace, formatBytes, 
    createContext, createContext2, 
    SudoDB, getSudoNumbers, setSudo, delSudo, 
    SettingsDB, initializeSettings, getSetting, setSetting, getAllSettings, resetSetting, resetAllSettings, DEFAULT_SETTINGS,
    GroupSettingsDB, initializeGroupSettings, getGroupSetting, setGroupSetting, getAllGroupSettings, resetGroupSetting, GROUP_SETTING_DEFAULTS, 
    UserSettingsDB, initializeUserSettings, getUserSetting, setUserSetting, USER_SETTING_DEFAULTS,
    listAvailableLocales, isValidLocale, translate, resolveLanguage, makeTranslator, GLOBAL_FALLBACK,
    MalvinTechApi, MalvinApiKey, 
    getMediaBuffer, getFileContentType, bufferToStream, uploadToPixhost, uploadToImgBB, uploadToCatbox, 
    MalvinAutoReact, setupMalvinChatBot, MalvinAntiLink, MalvinAntibad, MalvinAntiGroupMention, MalvinAntiDelete, MalvinAnticall, MalvinPresence, MalvinAutoBio, MalvinAntiViewOnce, MalvinAntiEdit, handleGameMessage, 
    logger, mxdBuffer, webp2mp4File, mxdJson, latestWaVersion, mxdRandom, isUrl, mxdStore, isNumber, loadSession, useSQLiteAuthState, verifyJidState,
    standardizeJid, serializeMessage, downloadMediaMessage,
    loadPlugins, findCommand, findBodyCommand, createHelpers, getGroupInfo, buildSuperUsers,
    groupCache, getGroupMetadata, updateGroupCache, deleteGroupCache, clearGroupCache, 
    setupGroupCacheListeners, cachedGroupMetadata, initializeLidStore, createSocketConfig, getLidMapping,
    safeNewsletterFollow, safeGroupAcceptInvite, setupConnectionHandler,
    setupGroupEventsListeners, getProfilePic, getDisplayNumber,
    runFFmpeg, getVideoDuration, mxdSticker, copyFolderSync,
    loadPersistedLidMappings, persistLidMapping
};
