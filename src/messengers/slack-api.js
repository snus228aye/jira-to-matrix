/* eslint no-empty-function: ["error", { "allow": ["arrowFunctions"] }] */
const http = require('http');
const Ramda = require('ramda');
const {WebClient} = require('@slack/client');
const htmlToText = require('html-to-text').fromString;
const express = require('express');
const bodyParser = require('body-parser');

const defaultLogger = {
    info: () => { },
    error: () => { },
    warn: () => { },
    debug: () => { },
};

module.exports = class SlackApi {
    /**
     * slack api for bot
     * @param  {Object} options api options
     * @param  {Object} options.config config for slack
     * @param  {Object} options.sdk slack sdk client, if not exists - instance of WebClient from https://github.com/slackapi/node-slack-sdk
     * @param  {function} options.commandsHandler matrix event commands
     * @param  {Object} options.logger logger, winstone type, if no logger is set logger is off
     */
    constructor({config, sdk, commandsHandler, logger = defaultLogger}) {
        this.commandsHandler = commandsHandler;
        this.config = config;
        this.token = config.password;
        this.sdk = sdk || new WebClient(this.token);
        this.logger = logger;
        this.commandServer;
    }

    /**
     * Transform ldap user name to Slack user id
     * @param {String} shortName shortName of user from ldap
     * @returns {String} user email like ii_ivanov@ example.com
     */
    getChatUserId(shortName) {
        return `${shortName}@${this.config.domain}`;
    }

    /**
     * Slack event handler
     * @param {Object} eventBody slack event
     */
    async _eventHandler(eventBody) {
        try {
            const info = await this.getRoomInfo(eventBody.channel_id);

            const options = {
                chatApi: this,
                sender: eventBody.user_name.replace(/[0-9]/g, ''),
                roomName: info.name.toUpperCase(),
                roomId: eventBody.channel_id,
                commandName: eventBody.command.slice(2),
                bodyText: eventBody.text,
            };
            await this.commandsHandler(options);
        } catch (error) {
            this.logger.error('Error while handling slash command from Slack', error, eventBody);
        }
    }

    /**
     * Slack slash command listener
     */
    _slashCommandsListener() {
        const app = express();

        app
            .use(bodyParser.urlencoded({
                strict: false,
            }))
            .post('/commands', async (req, res, next) => {
                await this._eventHandler(req.body);
                next();
            });

        this.commandServer = http.createServer(app);
        this.commandServer.listen(this.config.eventPort, () => {
            this.logger.info(`Slack commands are listening on port ${this.config.eventPort}`);
        });
    }

    /**
     * @private
     * @returns {Promise} connected slackClient
     */
    async _startClient() {
        try {
            await this.sdk.auth.test();
            this.logger.info('Slack client started!');
            this.client = this.sdk;
        } catch (err) {
            throw ['Error in slack connection', err].join('\n');
        }
    }

    /**
     * @returns {Object} connected slackClient with api for Jira
     */
    async connect() {
        if (this.isConnected()) {
            return;
        }
        try {
            await this._startClient();
            await this._slashCommandsListener();
            return this;
        } catch (err) {
            throw ['Error in slack connection', err].join('\n');
        }
    }

    /**
     * @returns {Boolean} connect status
     */
    isConnected() {
        return this.commandServer && this.commandServer.listening;
    }

    /**
     * disconnected slackClient
     */
    disconnect() {
        if (this.commandServer) {
            this.commandServer.close();
            this.logger.info('Disconnected from Slack');
        }
    }

    /**
     * Send message to Slack room
     * @param  {string} channel slack room id
     * @param  {string} infoMessage info message body
     * @param  {string} textBody markdown message body
     */
    async sendHtmlMessage(channel, infoMessage, textBody) {
        try {
            const text = htmlToText(textBody);
            const attachments = [{
                text,
                'mrkdwn_in': ['text'],
            }];
            await this.client.chat.postMessage({token: this.token, channel, attachments});
        } catch (err) {
            throw ['Error in sendHtmlMessage', err].join('\n');
        }
    }

    /**
     * @param  {string} email user mail
     * @returns {string|undefined} slack user id or undefined
     */
    async _getUserIdByEmail(email) {
        try {
            const userInfo = await this.client.users.lookupByEmail({token: this.token, email});

            return Ramda.path(['user', 'id'], userInfo);
        } catch (error) {
            this.logger.error(`Error getting user for slack by ${email}`, error);
        }
    }

    /**
     * Set topic to channel
     * @param  {string} channel channel id
     * @param  {string} topic new topic
     * @returns {Boolean} request result
     */
    async setRoomTopic(channel, topic) {
        try {
            const res = await this.client.conversations.setTopic({token: this.token, channel, topic});

            return res.ok;
        } catch (err) {
            this.logger.error(err);
            throw ['Error while setting channel topic', err].join('\n');
        }
    }

    /**
     * Set purpose to channel
     * @param  {string} channel channel id
     * @param  {string} purpose new topic
     * @returns {Boolean} request result
     */
    async setPurpose(channel, purpose) {
        try {
            const res = await this.client.conversations.setPurpose({token: this.token, channel, purpose});

            return res.ok;
        } catch (err) {
            this.logger.error(err);
            throw ['Error while setting channel purpose', err].join('\n');
        }
    }

    /**
     * Create Slack channel
     * @param  {Object} options create channel options
     * @param  {String} options.name name for channel, less than 21 sign, lowerCase, no space
     * @param  {String} options.topic slack channel topic
     * @param  {Array} options.invite user emails to invite
     * @param  {Array} options.purpose issue summary
     * @returns {string} Slack channel id
     */
    async createRoom({name, topic, invite, purpose}) {
        try {
            const ids = await Promise.all(invite.map(user => this._getUserIdByEmail(user)));
            const options = {
                'token': this.token,
                'is_private': true,
                'name': name.toLowerCase(),
                'user_ids': ids.filter(Boolean),
            };
            const {channel} = await this.client.conversations.create(options);
            const roomId = channel.id;
            await this.setRoomTopic(roomId, topic);
            await this.setPurpose(roomId, purpose);

            return roomId;
        } catch (err) {
            this.logger.error(err);
            throw ['Error while creating room', err].join('\n');
        }
    }

    /**
    * Get slack channel id by name
    * @param  {string} name slack channel name
    * @returns {string|undefined} channel id if exists
    */
    async getRoomId(name) {
        const searchingName = name.toLowerCase();
        try {
            // ? Limit of channels is only 1000 now
            const {channels} = await this.sdk.users.conversations({token: this.token, limit: 1000, types: 'private_channel'});
            const channel = channels.find(item => item.name === searchingName);

            const roomId = Ramda.path(['id'], channel);
            if (!roomId) {
                throw `No channel for ${searchingName}`;
            }

            return roomId;
        } catch (err) {
            throw [`Error getting channel id by name "${searchingName}" from Slack`, err].join('\n');
        }
    }

    /**
     * Check if user is in matrix room
     * @param {String} roomId matrix room id
     * @param {String} name slack user name like ii_ivanov
     * @returns {Promise<Boolean>} return true if user in room
     */
    async isRoomMember(roomId, name) {
        const email = this._getEmail(name);
        const slackId = await this._getUserIdByEmail(email);
        const roomMembers = await this.getRoomMembers({roomId});

        return roomMembers.includes(slackId);
    }

    /**
     * Invite user to slack channel
     * @param  {string} channel slack channel id
     * @param  {string} name slack user name or email
     */
    async invite(channel, name) {
        const email = this._getEmail(name);
        try {
            const userId = await this._getUserIdByEmail(email);
            const response = await this.client.conversations.invite({token: this.token, channel, users: userId});

            return response.ok;
        } catch (err) {
            this.logger.error(err);
            throw [`Error while inviting user ${email} to a channel ${channel}`, err].join('\n');
        }
    }

    /**
     * get channel members
     * @param {String} name channel name
     * @param {String} slack channel id
     * @returns {String[]} channel members like [nfakjgba, fabfaif]
     */
    async getRoomMembers({name, roomId}) {
        try {
            const channel = roomId || await this.getRoomId(name);
            const {members} = await this.client.conversations.members({token: this.token, channel});

            return members;
        } catch (err) {
            throw [`Error while getting slack members from channel ${name}`, err].join('\n');
        }
    }

    /**
     * Empty method to avoid error with create alias in matrix
     *  @returns {Boolean} always true
     */
    createAlias() {
        return true;
    }

    /**
     * Set new name to the channel
     * @param  {string} channel channel id
     * @param  {string} name new topic
     * @returns {Boolean} request result
     */
    async setRoomName(channel, name) {
        try {
            const res = await this.client.conversations.rename({token: this.token, channel, name});

            return res.ok;
        } catch (err) {
            this.logger.error(err);
            throw ['Error while setting channel topic', err].join('\n');
        }
    }

    /**
     * Get Conversation Info by id
     * @param {String} channel conversation Id
     */
    async getRoomInfo(channel) {
        try {
            const roomInfo = await this.client.conversations.info({token: this.token, channel});

            return roomInfo.channel;
        } catch (err) {
            this.logger.error(err);
            throw [`Error while getting info by channel ${channel}`, err].join('\n');
        }
    }

    /**
     * Transform name to email or just return email
     * @param {String} name name or email
     * @returns {String} email
     */
    _getEmail(name) {
        return name.includes('@') ? name : `${name}@${this.config.domain}`;
    }

    /**
     * Get room id by name
     * @param {String} name roomname
     * @returns {Promise<String|false>} returns roomId or false if not exisits
     */
    async getRoomIdByName(name) {
        try {
            const roomId = await this.getRoomId(name);
            return roomId;
        } catch (error) {
            return false;
        }
    }

    /**
     *
     * @param {String} roomId conversation id
     * @param {String} userId user id
     */
    setPower(roomId, userId) {
        this.logger.warn('Set power command is not available now');
    }

    /**
     * compose room name for slack chat
     * @param {String} key Jira issue key
     * @returns {String} room name for jira issue in slack
     */
    composeRoomName(key) {
        return `${key.toLowerCase()}`;
    }
};
