const pino = require('pino');
const NodeCache = require('node-cache');
const { makeCacheableSignalKeyStore } = require('mrxd-baileys');
const { cachedGroupMetadata } = require('./groupStore');

const _userDevicesCache = new NodeCache({ stdTTL: 1800, useClones: false });

const createSocketConfig = (version, state, logger) => {
    return {
        version,
        logger: pino({ level: 'silent' }),
        browser: ['Ubuntu', 'Chrome', '22.04.4'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        cachedGroupMetadata,
        userDevicesCache: _userDevicesCache,
        connectTimeoutMs: 15000,
        defaultQueryTimeoutMs: 20000,
        keepAliveIntervalMs: 20000,
        fireInitQueries: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        retryRequestDelayMs: 50,
        maxMsgRetryCount: 2,
        generateHighQualityLinkPreview: false,
        getMessage: async () => undefined,
        emitOwnEvents: true,
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                message = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        }
    };
};

module.exports = { createSocketConfig };
